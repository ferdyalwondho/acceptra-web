<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use App\Models\User;
use App\Notifications\InvitationNotification;
use App\Services\ClusterApproverResolutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    private const ROLES = [
        ['value' => 'super_admin',           'label' => 'Super Admin'],
        ['value' => 'admin',                 'label' => 'Admin'],
        ['value' => 'viewer',                'label' => 'Viewer'],
        ['value' => 'partner',               'label' => 'Partner / Subcon'],
        ['value' => 'approver_ms_bo',        'label' => 'Approver - MS BO'],
        ['value' => 'approver_ms_bo_team',   'label' => 'Approver - MS BO Team'],
        ['value' => 'approver_ms_rts',       'label' => 'Approver - MS RTS'],
        ['value' => 'approver_xls_rth_team', 'label' => 'Approver - XLS RTH Team'],
        ['value' => 'approver_xls_rth',      'label' => 'Approver - XLS RTH'],
        ['value' => 'approver_sme',          'label' => 'Approver - SME'],
    ];

    // Public so the users:import Artisan command can validate against the same list.
    public const VALID_ROLES = [
        'super_admin', 'admin', 'viewer', 'partner',
        'approver_ms_bo', 'approver_ms_bo_team', 'approver_ms_rts',
        'approver_xls_rth_team', 'approver_xls_rth', 'approver_sme',
    ];

    // FR-USR-01: Daftar user dengan filter & pagination
    public function index(Request $request): Response
    {
        abort_if($request->user()->role !== 'super_admin', 403);

        $query = User::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        if ($role = $request->input('role')) {
            $query->where('role', $role);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // Sorting — whitelist prevents SQL injection; default stays created_at/desc
        // so users who haven't sorted see the same ordering as before.
        $sortableColumns = ['name', 'role'];
        $sort = in_array($request->input('sort'), $sortableColumns) ? $request->input('sort') : 'created_at';
        $dir  = $request->input('dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $dir);

        $query->with(['clusterApprovers.cluster']);

        $users = $query->paginate(10)->through(fn (User $u) => [
            'id'                 => $u->id,
            'name'               => $u->name,
            'email'              => $u->email,
            'role'               => $u->role,
            'partner_id'         => $u->partner_id,
            'status'             => $u->status,
            'invitation_pending' => $u->email_verified_at === null,
            'created_at'         => $u->created_at->toISOString(),
            'clusters'           => $u->clusterApprovers
                ->where('role', $u->role)
                ->pluck('cluster.display_name')
                ->filter()
                ->values(),
        ]);

        return Inertia::render('Users/Index', [
            'users'   => $users,
            'filters' => [
                'search' => $request->input('search'),
                'role'   => $request->input('role'),
                'status' => $request->input('status'),
                'sort'   => $sort,
                'dir'    => $dir,
            ],
            'roles' => self::ROLES,
        ]);
    }

    // FR-USR-01: Form buat user baru
    public function create(Request $request): Response
    {
        abort_if($request->user()->role !== 'super_admin', 403);

        return Inertia::render('Users/Create', [
            'roles'    => self::ROLES,
            'partners' => Partner::where('status', 'active')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    // FR-USR-01: Simpan user baru + kirim undangan
    public function store(Request $request): RedirectResponse
    {
        abort_if($request->user()->role !== 'super_admin', 403);

        // Normalize before validating so the unique:users,email check compares against the
        // same lowercase form the User::email() mutator stores (see FR-AUTH email case fix).
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);

        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:150'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'role'          => ['required', 'in:' . implode(',', self::VALID_ROLES)],
            'partner_id'    => ['required_if:role,partner', 'nullable', 'uuid', 'exists:partners,id'],
            'cluster_ids'   => ['sometimes', 'array'],
            'cluster_ids.*' => ['uuid', 'exists:clusters,id'],
        ], [
            'name.required'      => 'Nama harus diisi.',
            'name.max'           => 'Nama maksimal 150 karakter.',
            'email.required'     => 'Email harus diisi.',
            'email.email'        => 'Format email tidak valid.',
            'email.unique'       => 'Email sudah terdaftar.',
            'role.required'      => 'Role harus dipilih.',
            'role.in'            => 'Role tidak valid.',
            'partner_id.required_if' => 'Partner wajib dipilih untuk user dengan role Partner.',
            'partner_id.exists'  => 'Partner tidak ditemukan.',
        ]);

        $token = Str::random(64);

        $user = User::create([
            'name'                  => $validated['name'],
            'email'                 => $validated['email'],
            'password'              => Str::random(32),
            'role'                  => $validated['role'],
            'partner_id'            => $validated['partner_id'] ?? null,
            'status'                => 'inactive',
            'invitation_token'      => $token,
            'invitation_expires_at' => now()->addHours(72),
        ]);

        ClusterApproverResolutionService::assignClusters($user, $validated['role'], $validated['cluster_ids'] ?? []);

        $user->notify(new InvitationNotification($token));

        return redirect()->route('users.index')
            ->with('status', 'User berhasil dibuat dan undangan telah dikirim.');
    }

    // FR-USR-01: Form edit user
    public function edit(Request $request, string $id): Response
    {
        abort_if($request->user()->role !== 'super_admin', 403);

        $user = User::with('clusterApprovers')->findOrFail($id);

        return Inertia::render('Users/Edit', [
            'user'     => [
                'id'                 => $user->id,
                'name'               => $user->name,
                'email'              => $user->email,
                'role'               => $user->role,
                'partner_id'         => $user->partner_id,
                'status'             => $user->status,
                'invitation_pending' => $user->email_verified_at === null,
                'created_at'         => $user->created_at->toISOString(),
            ],
            'roles'                => self::ROLES,
            'partners'             => Partner::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'assigned_cluster_ids' => $user->clusterApprovers->where('role', $user->role)->pluck('cluster_id')->values(),
        ]);
    }

    // FR-USR-01: Update data user
    public function update(Request $request, string $id): RedirectResponse
    {
        abort_if($request->user()->role !== 'super_admin', 403);

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:150'],
            'role'          => ['required', 'in:' . implode(',', self::VALID_ROLES)],
            'status'        => ['required', 'in:active,inactive'],
            'partner_id'    => ['required_if:role,partner', 'nullable', 'uuid', 'exists:partners,id'],
            'cluster_ids'   => ['sometimes', 'array'],
            'cluster_ids.*' => ['uuid', 'exists:clusters,id'],
        ], [
            'name.required'      => 'Nama harus diisi.',
            'name.max'           => 'Nama maksimal 150 karakter.',
            'role.required'      => 'Role harus dipilih.',
            'role.in'            => 'Role tidak valid.',
            'status.required'    => 'Status harus dipilih.',
            'status.in'          => 'Status tidak valid.',
            'partner_id.required_if' => 'Partner wajib dipilih untuk user dengan role Partner.',
            'partner_id.exists'  => 'Partner tidak ditemukan.',
        ]);

        $user->update([
            'name'       => $validated['name'],
            'role'       => $validated['role'],
            'status'     => $validated['status'],
            'partner_id' => $validated['partner_id'] ?? null,
        ]);

        // Role bisa berubah — hapus assignment cluster lama (terikat role lama), lalu buat ulang.
        $user->clusterApprovers()->delete();
        ClusterApproverResolutionService::assignClusters($user, $validated['role'], $validated['cluster_ids'] ?? []);

        return redirect()->route('users.index')
            ->with('status', 'User berhasil diperbarui.');
    }

    // FR-USR-01 + FR-USR-05: Soft delete user dengan guard approver aktif
    public function destroy(Request $request, string $id): RedirectResponse
    {
        abort_if($request->user()->role !== 'super_admin', 403);

        $user = User::findOrFail($id);

        // Edge case: Super Admin tidak bisa hapus dirinya sendiri
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        // FR-USR-05: Guard approver aktif (aktif setelah approval_steps dimigrasikan)
        if (Schema::hasTable('approval_steps')) {
            $isActiveApprover = DB::table('approval_steps')
                ->where('approver_id', $user->id)
                ->where('status', 'pending')
                ->exists();

            if ($isActiveApprover) {
                return back()->with('error', 'User ini adalah approver aktif pada dokumen berjalan. Lakukan reassign terlebih dahulu.');
            }
        }

        $user->delete();

        return redirect()->route('users.index')
            ->with('status', 'User berhasil dihapus.');
    }

    // FR-USR-04: Filter user by role untuk dropdown PIC approver
    public function filterByRole(Request $request): JsonResponse
    {
        abort_if(! $request->user(), 401);

        $query = User::query()
            ->where('status', 'active')
            ->whereNull('deleted_at');

        if ($role = $request->input('role')) {
            $query->where('role', $role);
        }

        $users = $query->orderBy('name')
            ->get(['id', 'name', 'email']);

        return response()->json(['data' => $users]);
    }
}
