<?php

namespace App\Http\Controllers\Partners;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use App\Models\User;
use App\Notifications\InvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PartnerController extends Controller
{
    private const ADMIN_ROLES = ['admin', 'super_admin'];
    private const VIEW_ROLES  = ['admin', 'super_admin', 'viewer'];

    // FR-PTR-01: Daftar partner dengan filter & pagination
    public function index(Request $request): Response
    {
        abort_if(! in_array($request->user()->role, self::VIEW_ROLES), 403);

        $hasDocuments = Schema::hasTable('documents');

        $query = Partner::withCount(['users as pics_count' => fn ($q) => $q->whereNull('deleted_at')]);

        if ($hasDocuments) {
            // Subquery untuk hitung dokumen tanpa memerlukan Eloquent relationship
            $query->addSelect([
                'documents_count' => DB::table('documents')
                    ->selectRaw('count(*)')
                    ->whereColumn('partner_id', 'partners.id')
                    ->whereNull('deleted_at'),
            ]);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // Sorting — only 'name' (Perusahaan) is sortable for now
        $sort = 'name';
        $dir  = $request->input('dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sort, $dir);

        $partners = $query->paginate(10)->through(fn (Partner $p) => [
            'id'              => $p->id,
            'name'            => $p->name,
            'email'           => $p->email,
            'status'          => $p->status,
            'pics_count'      => $p->pics_count ?? 0,
            'documents_count' => (int) ($p->documents_count ?? 0),
        ]);

        return Inertia::render('Partners/Index', [
            'partners'   => $partners,
            'filters'    => [
                'search' => $request->input('search'),
                'status' => $request->input('status'),
                'sort'   => $sort,
                'dir'    => $dir,
            ],
            'can_manage' => in_array($request->user()->role, self::ADMIN_ROLES),
        ]);
    }

    // FR-PTR-01: Form buat partner baru
    public function create(Request $request): Response
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        return Inertia::render('Partners/Create');
    }

    // FR-PTR-01: Simpan partner baru + buat akun PIC + kirim undangan
    public function store(Request $request): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        // Normalize before validating so the unique:users,email check compares against the
        // same lowercase form the User::email() mutator stores (see FR-AUTH email case fix).
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email'))),
            'pics'  => collect($request->input('pics', []))->map(fn ($pic) => [
                ...$pic,
                'email' => mb_strtolower(trim((string) ($pic['email'] ?? ''))),
            ])->all(),
        ]);

        $validated = $request->validate([
            'name'            => ['required', 'string', 'max:200'],
            'email'           => ['required', 'email'],
            'pics'            => ['required', 'array', 'min:1'],
            'pics.*.name'     => ['required', 'string', 'max:150'],
            'pics.*.email'    => ['required', 'email', 'unique:users,email'],
        ], [
            'name.required'         => 'Partner name is required',
            'name.max'              => 'Partner name may not exceed 200 characters.',
            'email.required'        => 'Valid contact email is required',
            'email.email'           => 'Valid contact email is required',
            'pics.required'         => 'At least one PIC is required.',
            'pics.min'              => 'At least one PIC is required.',
            'pics.*.name.required'  => 'PIC name is required',
            'pics.*.name.max'       => 'PIC name may not exceed 150 characters.',
            'pics.*.email.required' => 'PIC email must be unique',
            'pics.*.email.email'    => 'PIC email format is invalid.',
            'pics.*.email.unique'   => 'PIC email must be unique',
        ]);

        $partner = Partner::create([
            'name'   => $validated['name'],
            'email'  => $validated['email'],
            'status' => 'active',
        ]);

        foreach ($validated['pics'] as $pic) {
            $token = Str::random(64);

            $user = User::create([
                'name'                  => $pic['name'],
                'email'                 => $pic['email'],
                'password'              => Str::random(32),
                'role'                  => 'partner',
                'partner_id'            => $partner->id,
                'status'                => 'inactive',
                'invitation_token'      => $token,
                'invitation_expires_at' => now()->addHours(72),
            ]);

            $user->notify(new InvitationNotification($token));
        }

        return redirect()->route('partners.index')
            ->with('status', 'Partner berhasil dibuat dan undangan telah dikirim.');
    }

    // FR-PTR-01: Form edit partner
    public function edit(Request $request, string $id): Response
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $partner = Partner::findOrFail($id);

        $pics = User::where('partner_id', $partner->id)
            ->whereNull('deleted_at')
            ->orderBy('created_at')
            ->get()
            ->map(fn (User $u) => [
                'id'                 => $u->id,
                'name'               => $u->name,
                'email'              => $u->email,
                'status'             => $u->status,
                'invitation_pending' => $u->email_verified_at === null,
            ]);

        return Inertia::render('Partners/Edit', [
            'partner' => [
                'id'     => $partner->id,
                'name'   => $partner->name,
                'email'  => $partner->email,
                'status' => $partner->status,
                'pics'   => $pics,
            ],
        ]);
    }

    // FR-PTR-01: Update data partner + kelola PIC
    public function update(Request $request, string $id): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $partner = Partner::findOrFail($id);

        // Normalize before validating so the manual duplicate check below (and the
        // User::email() mutator on create) compare against a consistent lowercase form.
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email'))),
            'pics'  => collect($request->input('pics', []))->map(fn ($pic) => [
                ...$pic,
                'email' => mb_strtolower(trim((string) ($pic['email'] ?? ''))),
            ])->all(),
        ]);

        // Validasi struktur dasar (id dibiarkan string — empty string = PIC baru)
        $validated = $request->validate([
            'name'              => ['required', 'string', 'max:200'],
            'email'             => ['required', 'email'],
            'status'            => ['required', 'in:active,inactive'],
            'pics'              => ['array'],
            'pics.*.id'         => ['present', 'string'],
            'pics.*.name'       => ['required_with:pics', 'string', 'max:150'],
            'pics.*.email'      => ['required_with:pics', 'email'],
            'pics.*.status'     => ['required_with:pics', 'in:active,inactive'],
        ], [
            'name.required'              => 'Partner name is required',
            'name.max'                   => 'Partner name may not exceed 200 characters.',
            'email.required'             => 'Valid contact email is required',
            'email.email'                => 'Valid contact email is required',
            'status.required'            => 'Invalid status',
            'status.in'                  => 'Invalid status',
            'pics.*.name.required_with'  => 'PIC name is required',
            'pics.*.email.required_with' => 'PIC email must be unique',
            'pics.*.email.email'         => 'PIC email format is invalid.',
            'pics.*.status.required_with' => 'Invalid status',
            'pics.*.status.in'           => 'Invalid status',
        ]);

        // Cek uniqueness email khusus untuk PIC baru (id kosong)
        $uniqueErrors = [];
        foreach ($validated['pics'] ?? [] as $index => $pic) {
            if (empty($pic['id'])) {
                if (User::where('email', $pic['email'])->exists()) {
                    $uniqueErrors["pics.{$index}.email"] = 'PIC email must be unique';
                }
            }
        }

        if (! empty($uniqueErrors)) {
            return back()->withErrors($uniqueErrors)->withInput();
        }

        $partner->update([
            'name'   => $validated['name'],
            'email'  => $validated['email'],
            'status' => $validated['status'],
        ]);

        foreach ($validated['pics'] ?? [] as $pic) {
            if (! empty($pic['id'])) {
                // Update existing PIC (name & status; email tidak bisa diubah)
                User::where('id', $pic['id'])
                    ->where('partner_id', $partner->id)
                    ->whereNull('deleted_at')
                    ->update([
                        'name'   => $pic['name'],
                        'status' => $pic['status'],
                    ]);
            } else {
                // Buat PIC baru + kirim undangan
                $token = Str::random(64);

                $user = User::create([
                    'name'                  => $pic['name'],
                    'email'                 => $pic['email'],
                    'password'              => Str::random(32),
                    'role'                  => 'partner',
                    'partner_id'            => $partner->id,
                    'status'                => 'inactive',
                    'invitation_token'      => $token,
                    'invitation_expires_at' => now()->addHours(72),
                ]);

                $user->notify(new InvitationNotification($token));
            }
        }

        return redirect()->route('partners.index')
            ->with('status', 'Partner berhasil diperbarui.');
    }

    // FR-PTR-01 + BR-PTR-04: Soft delete partner dengan guard dokumen aktif
    public function destroy(Request $request, string $id): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $partner = Partner::findOrFail($id);

        // BR-PTR-04: Cek dokumen aktif (status bukan 13/16)
        if (Schema::hasTable('documents')) {
            $hasActiveDocuments = DB::table('documents')
                ->where('partner_id', $partner->id)
                ->whereNotIn('status_code', ['13', '16'])
                ->whereNull('deleted_at')
                ->exists();

            if ($hasActiveDocuments) {
                return back()->with('error', 'Partner has active documents in progress. Cannot delete.');
            }
        }

        // Soft delete semua PIC partner
        User::where('partner_id', $partner->id)
            ->whereNull('deleted_at')
            ->each(fn (User $u) => $u->delete());

        $partner->delete();

        return redirect()->route('partners.index')
            ->with('status', 'Partner berhasil dihapus.');
    }
}
