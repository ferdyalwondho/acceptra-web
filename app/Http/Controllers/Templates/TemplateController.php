<?php

namespace App\Http\Controllers\Templates;

use App\Http\Controllers\Controller;
use App\Models\Template;
use App\Models\TemplateLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class TemplateController extends Controller
{
    private const ADMIN_ROLES = ['admin', 'super_admin'];
    private const VIEW_ROLES  = ['admin', 'super_admin', 'viewer'];

    // Roles yang always requires_signature=false (approve-only)
    private const APPROVE_ONLY_ROLES = ['admin', 'approver_ms_bo'];

    // Roles yang bisa dipilih untuk level L2+ (bukan admin/viewer/partner)
    private const AVAILABLE_ROLES = [
        ['code' => 'approver_ms_bo',        'label' => 'Approver MS BO (approve-only)'],
        ['code' => 'approver_ms_rts',       'label' => 'Approver MS RTS'],
        ['code' => 'approver_xls_rth_team', 'label' => 'Approver XLS RTH Team'],
        ['code' => 'approver_xls_rth',      'label' => 'Approver XLS RTH'],
    ];

    // FR-TPL-01: Daftar template dengan filter & pagination
    public function index(Request $request): Response
    {
        abort_if(! in_array($request->user()->role, self::VIEW_ROLES), 403);

        $hasDocuments = Schema::hasTable('documents');

        $query = Template::with('levels')->orderBy('name');

        if ($hasDocuments) {
            $query->addSelect([
                'documents_count' => DB::table('documents')
                    ->selectRaw('count(*)')
                    ->whereColumn('template_id', 'templates.id')
                    ->whereNull('deleted_at'),
            ]);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('sow_code', 'ilike', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $templates = $query->paginate(20)->through(fn (Template $t) => [
            'id'             => $t->id,
            'name'           => $t->name,
            'sow_code'       => $t->sow_code,
            'status'         => $t->status,
            'levels_count'   => $t->levels->count(),
            'levels_summary' => $t->levels->map(fn (TemplateLevel $l) => [
                'level_order'        => $l->level_order,
                'role'               => $l->role,
                'requires_signature' => $l->requires_signature,
            ])->values(),
            'documents_count' => (int) ($t->documents_count ?? 0),
        ]);

        return Inertia::render('Templates/Index', [
            'templates'  => $templates,
            'filters'    => [
                'search' => $request->input('search'),
                'status' => $request->input('status'),
            ],
            'can_manage' => in_array($request->user()->role, self::ADMIN_ROLES),
        ]);
    }

    // FR-TPL-01: Form buat template baru
    public function create(Request $request): Response
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        return Inertia::render('Templates/Create', [
            'available_roles' => self::AVAILABLE_ROLES,
        ]);
    }

    // FR-TPL-01: Simpan template baru
    public function store(Request $request): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $validated = $request->validate([
            'name'                        => ['required', 'string', 'max:200'],
            'sow_code'                    => ['nullable', 'string', 'max:50'],
            'description'                 => ['nullable', 'string'],
            'levels'                      => ['required', 'array', 'min:1', 'max:3'],
            'levels.*.role'               => ['required', 'string', 'in:approver_ms_bo,approver_ms_rts,approver_xls_rth_team,approver_xls_rth'],
            'levels.*.requires_signature' => ['required', 'boolean'],
        ], [
            'name.required'          => 'Template name is required.',
            'name.max'               => 'Template name may not exceed 200 characters.',
            'levels.required'        => 'At least one approval level is required.',
            'levels.min'             => 'At least one approval level is required.',
            'levels.max'             => 'Maximum 3 user-defined levels (L2–L4).',
            'levels.*.role.required' => 'Please select a valid role for each level.',
            'levels.*.role.in'       => 'Please select a valid approver role.',
        ]);

        $template = Template::create([
            'name'        => $validated['name'],
            'sow_code'    => $validated['sow_code'] ?? null,
            'description' => $validated['description'] ?? null,
            'status'      => 'active',
        ]);

        $this->saveLevels($template, $validated['levels']);

        return redirect()->route('templates.index')
            ->with('status', 'Template created successfully.');
    }

    // FR-TPL-01: Form edit template
    public function edit(Request $request, string $id): Response
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $template = Template::with('levels')->findOrFail($id);

        // Kirim hanya level L2+ ke frontend (L1 selalu fixed di UI)
        $userLevels = $template->levels
            ->filter(fn (TemplateLevel $l) => $l->level_order > 1)
            ->map(fn (TemplateLevel $l) => [
                'level_order'        => $l->level_order,
                'role'               => $l->role,
                'requires_signature' => $l->requires_signature,
            ])
            ->values();

        return Inertia::render('Templates/Edit', [
            'template' => [
                'id'          => $template->id,
                'name'        => $template->name,
                'sow_code'    => $template->sow_code,
                'description' => $template->description,
                'status'      => $template->status,
                'levels'      => $userLevels,
            ],
            'available_roles' => self::AVAILABLE_ROLES,
        ]);
    }

    // FR-TPL-01: Update template (hanya berlaku untuk dokumen baru — FR-TPL-06)
    public function update(Request $request, string $id): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $template = Template::findOrFail($id);

        $validated = $request->validate([
            'name'                        => ['required', 'string', 'max:200'],
            'sow_code'                    => ['nullable', 'string', 'max:50'],
            'description'                 => ['nullable', 'string'],
            'status'                      => ['required', 'in:active,inactive'],
            'levels'                      => ['required', 'array', 'min:1', 'max:3'],
            'levels.*.role'               => ['required', 'string', 'in:approver_ms_bo,approver_ms_rts,approver_xls_rth_team,approver_xls_rth'],
            'levels.*.requires_signature' => ['required', 'boolean'],
        ], [
            'name.required'          => 'Template name is required.',
            'name.max'               => 'Template name may not exceed 200 characters.',
            'status.required'        => 'Invalid status.',
            'status.in'              => 'Invalid status.',
            'levels.required'        => 'At least one approval level is required.',
            'levels.min'             => 'At least one approval level is required.',
            'levels.max'             => 'Maximum 3 user-defined levels (L2–L4).',
            'levels.*.role.required' => 'Please select a valid role for each level.',
            'levels.*.role.in'       => 'Please select a valid approver role.',
        ]);

        $template->update([
            'name'        => $validated['name'],
            'sow_code'    => $validated['sow_code'] ?? null,
            'description' => $validated['description'] ?? null,
            'status'      => $validated['status'],
        ]);

        // Hapus level lama, insert level baru (dokumen berjalan pakai snapshot — FR-TPL-06)
        $template->levels()->delete();
        $this->saveLevels($template, $validated['levels']);

        return redirect()->route('templates.index')
            ->with('status', 'Template updated. Running documents are not affected.');
    }

    // FR-TPL-05: Soft delete dengan guard dokumen aktif
    public function destroy(Request $request, string $id): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $template = Template::findOrFail($id);

        if (Schema::hasTable('documents')) {
            $hasActiveDocuments = DB::table('documents')
                ->where('template_id', $template->id)
                ->whereNull('deleted_at')
                ->exists();

            if ($hasActiveDocuments) {
                return back()->with('error', 'Template is used by existing documents. Use Deactivate instead.');
            }
        }

        $template->delete();

        return redirect()->route('templates.index')
            ->with('status', 'Template deleted.');
    }

    // FR-TPL-07: Clone template (SHOULD)
    public function clone(Request $request, string $id): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $source = Template::with('levels')->findOrFail($id);

        $clone = Template::create([
            'name'        => 'Copy of ' . $source->name,
            'sow_code'    => $source->sow_code,
            'description' => $source->description,
            'status'      => 'inactive',
        ]);

        foreach ($source->levels as $level) {
            TemplateLevel::create([
                'template_id'        => $clone->id,
                'level_order'        => $level->level_order,
                'role'               => $level->role,
                'requires_signature' => $level->requires_signature,
            ]);
        }

        return redirect()->route('templates.edit', $clone->id)
            ->with('status', 'Template cloned. Review and activate before using.');
    }

    // FR-SUB API: GET /api/templates/{id}/levels — fetch L2..Ln structure for PIC slots
    public function levels(Request $request, string $id): JsonResponse
    {
        $template = Template::with('levels')
            ->where('status', 'active')
            ->findOrFail($id);

        $levelLabels = [
            'approver_ms_bo'        => 'Approver MS BO',
            'approver_ms_rts'       => 'Approver MS RTS',
            'approver_xls_rth_team' => 'Approver XLS RTH Team',
            'approver_xls_rth'      => 'Approver XLS RTH',
        ];

        $data = $template->levels
            ->filter(fn (TemplateLevel $l) => $l->level_order > 1)
            ->map(fn (TemplateLevel $l) => [
                'level_order'        => $l->level_order,
                'role'               => $l->role,
                'role_label'         => $levelLabels[$l->role] ?? $l->role,
                'requires_signature' => $l->requires_signature,
            ])
            ->values();

        return response()->json(['data' => $data]);
    }

    // Helper: inject L1 otomatis lalu simpan user-defined levels (L2+)
    private function saveLevels(Template $template, array $levels): void
    {
        // BR-TPL-01: L1 selalu admin, requires_signature=false, auto-inject
        TemplateLevel::create([
            'template_id'        => $template->id,
            'level_order'        => 1,
            'role'               => 'admin',
            'requires_signature' => false,
        ]);

        // L2+: re-sequence dari 2, enforce approve-only rule (BR-TPL-02)
        foreach ($levels as $i => $level) {
            $requiresSignature = in_array($level['role'], self::APPROVE_ONLY_ROLES)
                ? false
                : (bool) $level['requires_signature'];

            TemplateLevel::create([
                'template_id'        => $template->id,
                'level_order'        => $i + 2,
                'role'               => $level['role'],
                'requires_signature' => $requiresSignature,
            ]);
        }
    }
}
