<?php

namespace App\Http\Controllers\Documents;

use App\Http\Controllers\Controller;
use App\Jobs\NotifyAdminsJob;
use App\Jobs\NotifyApproverTurnJob;
use App\Models\ApprovalStep;
use App\Models\Document;
use App\Models\DocumentAttachment;
use App\Models\Partner;
use App\Models\Template;
use App\Models\TemplateLevel;
use App\Services\AuditService;
use App\Services\DocumentQueryService;
use App\Services\UniqueIdService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    private const SUBMIT_ROLES = ['partner', 'admin', 'super_admin'];
    private const ADMIN_ROLES  = ['admin', 'super_admin'];
    private const AVIAT_ROLES  = ['admin', 'super_admin', 'viewer'];

    private const ROLE_LABELS = [
        'admin'                  => 'Admin Aviat',
        'approver_ms_bo'         => 'Approver MS BO',
        'approver_ms_rts'        => 'Approver MS RTS',
        'approver_xls_rth_team'  => 'Approver XLS RTH Team',
        'approver_xls_rth'       => 'Approver XLS RTH',
    ];

    // GET /documents
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = (new DocumentQueryService)->build($request, $user);

        $documents = $query
            ->withExists(['attachments as has_excel' => fn ($q) => $q->where('type', 'excel')])
            ->with(['partner', 'approvalSteps'])
            ->paginate(20)
            ->through(fn (Document $doc) => [
                'id'            => $doc->id,
                'unique_id'     => $doc->unique_id,
                'pt_index'      => $doc->pt_index,
                'project_code'  => $doc->project_code,
                'link_id'       => $doc->link_id,
                'sow_name'      => $doc->sow_name,
                'partner_name'  => $doc->partner?->name,
                'status_code'   => $doc->status_code,
                'submitted_at'  => $doc->date_atp_submission
                    ? $doc->date_atp_submission->format('d M Y')
                    : $doc->created_at->format('d M Y'),
                'has_excel'     => (bool) $doc->has_excel,
                'has_final_pdf' => (bool) $doc->final_pdf_path,
                'active_step'   => ($step = $doc->approvalSteps->firstWhere('is_active', true))
                    ? 'L' . $step->level_order . ' — ' . (self::ROLE_LABELS[$step->role] ?? $step->role)
                    : null,
            ]);

        return Inertia::render('Documents/Index', [
            'documents'  => $documents,
            'filters'    => [
                'search'      => $request->input('search'),
                'partner_id'  => $request->input('partner_id'),
                'status_code' => $request->input('status_code'),
                'sow_name'    => $request->input('sow_name'),
                'date_from'   => $request->input('date_from'),
                'date_to'     => $request->input('date_to'),
                'sort'        => $request->input('sort', 'created_at'),
                'dir'         => $request->input('dir', 'desc'),
            ],
            'partners'   => in_array($user->role, self::AVIAT_ROLES)
                ? Partner::where('status', 'active')->orderBy('name')->get(['id', 'name'])
                : [],
            'can_export' => in_array($user->role, self::AVIAT_ROLES),
        ]);
    }

    // GET /documents/create
    public function create(Request $request): Response
    {
        $user = $request->user();
        abort_if(! in_array($user->role, self::SUBMIT_ROLES), 403);

        $templates = Template::where('status', 'active')
            ->with('levels')
            ->orderBy('name')
            ->get()
            ->map(fn (Template $t) => [
                'id'           => $t->id,
                'name'         => $t->name,
                'sow_code'     => $t->sow_code,
                'levels_count' => $t->levels->count(),
            ]);

        $props = [
            'templates' => $templates,
            'defaults'  => [
                'vendor_contractor' => 'PT Aviat Solusi Komunikasi Indonesia',
            ],
        ];

        if (in_array($user->role, self::ADMIN_ROLES)) {
            $props['partners'] = Partner::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']);
            $props['is_admin_submit'] = true;
        } else {
            $props['partner'] = $user->partner
                ? ['id' => $user->partner->id, 'name' => $user->partner->name]
                : null;
            $props['is_admin_submit'] = false;
        }

        return Inertia::render('Documents/Create', $props);
    }

    // GET /documents/{id}
    public function show(Request $request, string $id): Response
    {
        $user     = $request->user();
        $document = Document::with(['partner', 'submitter', 'template', 'approvalSteps.approver'])
            ->findOrFail($id);

        // Basic access: partner sees only own docs; others see all (full RBAC in later FR)
        if ($user->role === 'partner') {
            abort_if($document->submitted_by !== $user->id, 403);
        }

        $placement    = $document->template_snapshot['placement'] ?? [];
        $placStatus   = $placement['status'] ?? 'pending';
        $needsManual  = in_array($placStatus, ['failed', 'pending'], true);
        $pdfSignedUrl = null;

        if ($needsManual && $document->original_pdf_path) {
            $pdfSignedUrl = route('documents.pdf', $document->id);
        }

        $excelAttachment = $document->attachments()->where('type', 'excel')->first();

        // FR-AUD-02: Role-based audit trail filtering
        $auditQuery = $document->auditLogs()->with('user')->orderBy('created_at');

        if ($user->role === 'partner') {
            // Partner hanya melihat entri tanpa level context, atau level <= 1
            $auditQuery->where(function ($q) {
                $q->whereNull('metadata')
                  ->orWhereRaw("(metadata->>'level') IS NULL")
                  ->orWhereRaw("(metadata->>'level')::int <= 1");
            });
        }

        $auditLogs = $auditQuery->get()->map(fn ($log) => [
            'id'          => $log->id,
            'event'       => $log->event,
            'description' => $log->description,
            'metadata'    => $log->metadata,
            'actor_name'  => $log->user?->name,
            'actor_id'    => $log->user_id,
            'created_at'  => $log->created_at->toISOString(),
        ]);

        return Inertia::render('Documents/Show', [
            'document' => [
                'id'                  => $document->id,
                'unique_id'           => $document->unique_id,
                'pt_index'            => $document->pt_index,
                'vendor_contractor'   => $document->vendor_contractor,
                'project_code'        => $document->project_code,
                'link_id'             => $document->link_id,
                'link_name'           => $document->link_name,
                'tower_id_ne'         => $document->tower_id_ne,
                'site_name_ne'        => $document->site_name_ne,
                'tower_id_fe'         => $document->tower_id_fe,
                'site_name_fe'        => $document->site_name_fe,
                'sow_name'            => $document->sow_name,
                'status_code'         => $document->status_code,
                'date_atp_submission' => $document->date_atp_submission?->toDateString(),
                'original_pdf_path'   => $document->original_pdf_path,
                'template_snapshot'   => $document->template_snapshot,
                'partner'             => $document->partner ? ['id' => $document->partner->id, 'name' => $document->partner->name] : null,
                'submitter'           => $document->submitter ? ['id' => $document->submitter->id, 'name' => $document->submitter->name] : null,
                'created_at'          => $document->created_at->toISOString(),
                'approval_steps'      => $document->approvalSteps->map(fn (ApprovalStep $s) => [
                    'id'                  => $s->id,
                    'level_order'         => $s->level_order,
                    'role'                => $s->role,
                    'requires_signature'  => $s->requires_signature,
                    'approver_id'         => $s->approver_id,
                    'approver_name'       => $s->approver?->name,
                    'status'              => $s->status,
                    'is_active'           => $s->is_active,
                    'action_at'           => $s->action_at?->toISOString(),
                ]),
                'atp_punchlist' => $document->atp_punchlist,
            ],
            'anchor_failed'    => $needsManual,
            'pdf_url'          => $pdfSignedUrl,
            'excel_attachment' => $excelAttachment ? [
                'id'                => $excelAttachment->id,
                'original_filename' => $excelAttachment->original_filename,
                'file_size_bytes'   => $excelAttachment->file_size_bytes,
            ] : null,
            'audit_logs'  => $auditLogs,
            'initial_tab' => $request->query('tab', 'overview'),
        ]);
    }

    // GET /documents/{id}/edit
    public function edit(Request $request, string $id): Response
    {
        $user     = $request->user();
        $document = Document::with(['partner', 'approvalSteps', 'template.levels', 'attachments'])
            ->findOrFail($id);

        $isAdmin              = in_array($user->role, self::ADMIN_ROLES);
        $isPunchlistRevision  = $document->status_code === '14';

        // Authorization
        if (! $isAdmin) {
            abort_if($document->submitted_by !== $user->id, 403);
        }
        abort_if($isPunchlistRevision && ! $isAdmin, 403);
        abort_if(! $isPunchlistRevision && $document->status_code !== 'draft', 422);

        // Punchlist revision mode: return simplified props
        if ($isPunchlistRevision) {
            $lastRevision = $document->attachments
                ->where('type', 'punchlist_revision')
                ->sortByDesc('created_at')
                ->first();

            return Inertia::render('Documents/Edit', [
                'document' => [
                    'id'          => $document->id,
                    'unique_id'   => $document->unique_id,
                    'status_code' => $document->status_code,
                    'has_pdf'     => false,
                    'partner_id'  => $document->partner_id ?? '',
                    'partner'     => $document->partner
                        ? ['id' => $document->partner->id, 'name' => $document->partner->name]
                        : null,
                    'pics'        => [],
                ],
                'templates'              => [],
                'is_admin_submit'        => true,
                'is_punchlist_revision'  => true,
                'last_revision_filename' => $lastRevision?->original_filename,
                'atp_punchlist'          => $document->atp_punchlist,
            ]);
        }

        $templates = Template::where('status', 'active')
            ->with('levels')
            ->orderBy('name')
            ->get()
            ->map(fn (Template $t) => [
                'id'           => $t->id,
                'name'         => $t->name,
                'sow_code'     => $t->sow_code,
                'levels_count' => $t->levels->count(),
            ]);

        $props = [
            'document' => [
                'id'                => $document->id,
                'unique_id'         => $document->unique_id,
                'status_code'       => $document->status_code,
                'vendor_contractor' => $document->vendor_contractor,
                'pt_index'          => $document->pt_index,
                'project_code'      => $document->project_code ?? '',
                'link_id'           => $document->link_id ?? '',
                'link_name'         => $document->link_name ?? '',
                'tower_id_ne'       => $document->tower_id_ne ?? '',
                'site_name_ne'      => $document->site_name_ne ?? '',
                'tower_id_fe'       => $document->tower_id_fe ?? '',
                'site_name_fe'      => $document->site_name_fe ?? '',
                'template_id'       => $document->template_id ?? '',
                'has_pdf'           => (bool) $document->original_pdf_path,
                'partner_id'        => $document->partner_id ?? '',
                'partner'           => $document->partner
                    ? ['id' => $document->partner->id, 'name' => $document->partner->name]
                    : null,
                'pics' => $document->approvalSteps
                    ->where('level_order', '>', 1)
                    ->mapWithKeys(fn (ApprovalStep $s) => [(string) $s->level_order => $s->approver_id ?? ''])
                    ->toArray(),
            ],
            'templates'             => $templates,
            'is_admin_submit'       => $isAdmin,
            'is_punchlist_revision' => false,
        ];

        if ($isAdmin) {
            $props['partners'] = Partner::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']);
        }

        return Inertia::render('Documents/Edit', $props);
    }

    // POST /documents/{id}/punchlist-revision — Admin upload PDF revisi punchlist
    public function uploadPunchlistRevision(Request $request, string $id): RedirectResponse
    {
        $user     = $request->user();
        $document = Document::findOrFail($id);

        abort_if(! in_array($user->role, self::ADMIN_ROLES), 403);
        abort_if($document->status_code !== '14', 422, 'Document is not in punchlist revision state.');

        $request->validate([
            'pdf_file' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $pdfPath = $request->file('pdf_file')->store('documents/punchlist-revisions', 'local');

        DB::transaction(function () use ($user, $document, $pdfPath, $request) {
            DocumentAttachment::create([
                'document_id'       => $document->id,
                'type'              => 'punchlist_revision',
                'file_path'         => $pdfPath,
                'original_filename' => $request->file('pdf_file')->getClientOriginalName(),
                'file_size_bytes'   => $request->file('pdf_file')->getSize(),
                'uploaded_by'       => $user->id,
            ]);

            $document->update(['status_code' => '15']);

            AuditService::log(
                $document->id,
                'punchlist.revision_uploaded',
                "Punchlist revision PDF uploaded by {$user->name}",
                [],
                $user->id,
            );
        });

        \App\Jobs\NotifyPunchlistRevisedJob::dispatch($document->fresh());

        return redirect()->route('documents.show', $document->id)
            ->with('success', 'Punchlist revision uploaded. Approvers have been notified.');
    }

    // POST /documents
    public function store(Request $request): RedirectResponse
    {
        $user    = $request->user();
        abort_if(! in_array($user->role, self::SUBMIT_ROLES), 403);

        $isDraft  = (bool) $request->boolean('_draft', false);
        $isAdmin  = in_array($user->role, self::ADMIN_ROLES);

        $validated = $this->validateSubmission($request, $isDraft, $isAdmin);

        // Upload files
        $pdfPath   = null;
        $excelPath = null;

        if ($request->hasFile('pdf_file')) {
            $file    = $request->file('pdf_file');
            $pdfPath = $file->store('documents/pdf', 'local');
        }

        if ($request->hasFile('excel_file')) {
            $excelPath = $request->file('excel_file')->store('documents/excel', 'local');
        }

        $document = null;
        $l2Step   = null;

        DB::transaction(function () use ($validated, $user, $isDraft, $isAdmin, $pdfPath, $excelPath, &$document, &$l2Step) {
            $uniqueId = (new UniqueIdService)->generate(now()->year);

            $template  = Template::with('levels')->findOrFail($validated['template_id']);
            $snapshot  = $this->buildSnapshot($template, ['status' => 'pending', 'positions' => null]);

            $partnerId = $isAdmin ? $validated['partner_id'] : $user->partner_id;

            $document = Document::create([
                'unique_id'          => $uniqueId,
                'pt_index'           => $validated['pt_index'],
                'link_id'            => $validated['link_id'] ?? null,
                'link_name'          => $validated['link_name'] ?? null,
                'project_code'       => $validated['project_code'] ?? null,
                'vendor_contractor'  => $validated['vendor_contractor'],
                'partner_id'         => $partnerId,
                'submitted_by'       => $user->id,
                'template_id'        => $template->id,
                'template_snapshot'  => $snapshot,
                'sow_name'           => $template->name,
                'tower_id_ne'        => $validated['tower_id_ne'] ?? null,
                'site_name_ne'       => $validated['site_name_ne'] ?? null,
                'tower_id_fe'        => $validated['tower_id_fe'] ?? null,
                'site_name_fe'       => $validated['site_name_fe'] ?? null,
                'original_pdf_path'  => $pdfPath,
                'status_code'        => 'draft',
            ]);

            // Excel attachment
            if ($excelPath) {
                DocumentAttachment::create([
                    'document_id'       => $document->id,
                    'type'              => 'excel',
                    'file_path'         => $excelPath,
                    'original_filename' => $request->file('excel_file')->getClientOriginalName(),
                    'file_size_bytes'   => $request->file('excel_file')->getSize(),
                    'uploaded_by'       => $user->id,
                ]);
            }

            // Build approval steps from template
            $pics = $validated['pics'] ?? [];
            foreach ($template->levels as $level) {
                ApprovalStep::create([
                    'document_id'        => $document->id,
                    'level_order'        => $level->level_order,
                    'role'               => $level->role,
                    'requires_signature' => $level->requires_signature,
                    'approver_id'        => $level->level_order === 1 ? null : ($pics[$level->level_order] ?? null),
                    'status'             => 'pending',
                    'is_active'          => false,
                ]);
            }

            if (! $isDraft) {
                $document->update([
                    'status_code'         => '01',
                    'date_atp_submission' => now()->toDateString(),
                ]);

                ApprovalStep::where('document_id', $document->id)
                    ->where('level_order', 1)
                    ->update(['is_active' => true]);

                AuditService::log(
                    $document->id,
                    'document.submitted',
                    "Document submitted by {$user->name}",
                    [],
                    $user->id,
                );

                // Admin direct submit: auto-approve L1
                if ($isAdmin) {
                    ApprovalStep::where('document_id', $document->id)
                        ->where('level_order', 1)
                        ->update([
                            'status'    => 'approved',
                            'action_at' => now(),
                            'is_active' => false,
                        ]);

                    $l2Step = ApprovalStep::where('document_id', $document->id)
                        ->where('level_order', 2)
                        ->first();

                    if ($l2Step) {
                        $l2Step->update(['is_active' => true]);
                    }

                    $document->update(['status_code' => '04']);

                    AuditService::log(
                        $document->id,
                        'document.auto_approved_l1',
                        'L1 auto-approved (direct admin submission)',
                        ['level' => 1],
                        null,
                    );
                }
            } else {
                AuditService::log(
                    $document->id,
                    'document.draft_saved',
                    "Draft saved by {$user->name}",
                    [],
                    $user->id,
                );
            }
        });

        // Dispatch notifications
        if (! $isDraft && $document) {
            if ($isAdmin) {
                NotifyAdminsJob::dispatch($document, 'approved');
                if ($l2Step) {
                    NotifyApproverTurnJob::dispatch($document, $l2Step);
                }
            } else {
                NotifyAdminsJob::dispatch($document, 'submission');
            }
        }

        $flash = match (true) {
            $isDraft => 'Draft saved.',
            $isAdmin => 'Document submitted and L1 auto-approved.',
            default  => 'Document submitted successfully.',
        };

        return redirect()->route('documents.show', $document->id)
            ->with('status', $flash);
    }

    // POST /documents/{id}/revise  — submit from draft
    public function revise(Request $request, string $id): RedirectResponse
    {
        $user     = $request->user();
        $document = Document::findOrFail($id);

        // Authorization: partner owns doc, or admin can revise any
        if (! in_array($user->role, self::ADMIN_ROLES)) {
            abort_if($document->submitted_by !== $user->id, 403);
        }

        abort_if($document->status_code !== 'draft', 422, 'Only draft documents can be submitted via revise.');

        $isAdmin   = in_array($user->role, self::ADMIN_ROLES);
        $validated = $this->validateSubmission($request, false, $isAdmin);

        $pdfPath = $document->original_pdf_path;

        if ($request->hasFile('pdf_file')) {
            $pdfPath = $request->file('pdf_file')->store('documents/pdf', 'local');
        }

        if ($request->hasFile('excel_file')) {
            // Replace existing excel attachment if any
            $document->attachments()->where('type', 'excel')->delete();
            $excelPath = $request->file('excel_file')->store('documents/excel', 'local');

            DocumentAttachment::create([
                'document_id'       => $document->id,
                'type'              => 'excel',
                'file_path'         => $excelPath,
                'original_filename' => $request->file('excel_file')->getClientOriginalName(),
                'file_size_bytes'   => $request->file('excel_file')->getSize(),
                'uploaded_by'       => $user->id,
            ]);
        }

        $l2Step = null;

        DB::transaction(function () use ($validated, $user, $isAdmin, $document, $pdfPath, &$l2Step) {
            $template = Template::with('levels')->findOrFail($validated['template_id']);
            $snapshot = $this->buildSnapshot($template, ['status' => 'pending', 'positions' => null]);
            $pics     = $validated['pics'] ?? [];

            $document->update([
                'pt_index'           => $validated['pt_index'],
                'link_id'            => $validated['link_id'] ?? null,
                'link_name'          => $validated['link_name'] ?? null,
                'project_code'       => $validated['project_code'] ?? null,
                'vendor_contractor'  => $validated['vendor_contractor'],
                'template_id'        => $template->id,
                'template_snapshot'  => $snapshot,
                'sow_name'           => $template->name,
                'tower_id_ne'        => $validated['tower_id_ne'] ?? null,
                'site_name_ne'       => $validated['site_name_ne'] ?? null,
                'tower_id_fe'        => $validated['tower_id_fe'] ?? null,
                'site_name_fe'       => $validated['site_name_fe'] ?? null,
                'original_pdf_path'  => $pdfPath,
                'status_code'        => '01',
                'date_atp_submission' => now()->toDateString(),
            ]);

            // Rebuild approval steps
            $document->approvalSteps()->delete();
            foreach ($template->levels as $level) {
                ApprovalStep::create([
                    'document_id'        => $document->id,
                    'level_order'        => $level->level_order,
                    'role'               => $level->role,
                    'requires_signature' => $level->requires_signature,
                    'approver_id'        => $level->level_order === 1 ? null : ($pics[$level->level_order] ?? null),
                    'status'             => 'pending',
                    'is_active'          => $level->level_order === 1,
                ]);
            }

            AuditService::log(
                $document->id,
                'document.submitted',
                "Draft submitted by {$user->name}",
                [],
                $user->id,
            );

            if ($isAdmin) {
                ApprovalStep::where('document_id', $document->id)
                    ->where('level_order', 1)
                    ->update(['status' => 'approved', 'action_at' => now(), 'is_active' => false]);

                $l2Step = ApprovalStep::where('document_id', $document->id)
                    ->where('level_order', 2)
                    ->first();

                if ($l2Step) {
                    $l2Step->update(['is_active' => true]);
                }

                $document->update(['status_code' => '04']);

                AuditService::log(
                    $document->id,
                    'document.auto_approved_l1',
                    'L1 auto-approved (direct admin submission)',
                    ['level' => 1],
                    null,
                );
            }
        });

        if ($isAdmin) {
            NotifyAdminsJob::dispatch($document, 'approved');
            if ($l2Step) {
                NotifyApproverTurnJob::dispatch($document, $l2Step);
            }
        } else {
            NotifyAdminsJob::dispatch($document, 'submission');
        }

        $flash = $isAdmin ? 'Document submitted and L1 auto-approved.' : 'Document submitted successfully.';

        return redirect()->route('documents.show', $document->id)
            ->with('status', $flash);
    }

    // GET /documents/import
    public function importCreate(Request $request): Response
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $templates = Template::where('status', 'active')
            ->with('levels')
            ->orderBy('name')
            ->get()
            ->map(fn (Template $t) => [
                'id'           => $t->id,
                'name'         => $t->name,
                'sow_code'     => $t->sow_code,
                'levels_count' => $t->levels->count(),
            ]);

        $partners = Partner::where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Documents/Import', [
            'templates' => $templates,
            'partners'  => $partners,
            'defaults'  => [
                'vendor_contractor' => 'PT Aviat Solusi Komunikasi Indonesia',
            ],
        ]);
    }

    // POST /documents/import
    public function importStore(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_if(! in_array($user->role, self::ADMIN_ROLES), 403);

        // ── 1. Basic validation ──────────────────────────────────────────────
        $validated = $request->validate([
            'vendor_contractor'      => ['required', 'string', 'max:200'],
            'pt_index'               => ['required', 'string', 'max:100'],
            'project_code'           => ['nullable', 'string', 'max:100'],
            'link_id'                => ['nullable', 'string', 'max:100'],
            'link_name'              => ['nullable', 'string', 'max:200'],
            'tower_id_ne'            => ['nullable', 'string', 'max:100'],
            'site_name_ne'           => ['nullable', 'string', 'max:200'],
            'tower_id_fe'            => ['nullable', 'string', 'max:100'],
            'site_name_fe'           => ['nullable', 'string', 'max:200'],
            'template_id'            => ['required', 'uuid', Rule::exists('templates', 'id')->where('status', 'active')],
            'partner_id'             => ['required', 'uuid', 'exists:partners,id'],
            'pdf_file'               => ['required', 'file', 'mimes:pdf', 'max:20480'],
            'levels'                 => ['required', 'array', 'min:1'],
            'levels.*.level_order'   => ['required', 'integer', 'min:1'],
            'levels.*.is_offline'    => ['required', 'boolean'],
            'levels.*.approver_name' => ['sometimes', 'nullable', 'string', 'max:200'],
            'levels.*.offline_date'  => ['sometimes', 'nullable', 'date', 'before_or_equal:today'],
            'levels.*.evidence_file' => ['sometimes', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'levels.*.approver_id'   => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
        ], [
            'vendor_contractor.required' => 'Vendor/Contractor is required.',
            'pt_index.required'          => 'PT Index is required.',
            'template_id.required'       => 'Please select a SOW template.',
            'template_id.exists'         => 'Please select a valid active SOW template.',
            'partner_id.required'        => 'Please select a partner.',
            'partner_id.exists'          => 'Please select a valid partner.',
            'pdf_file.required'          => 'PDF file is required.',
            'pdf_file.mimes'             => 'File must be a valid PDF.',
            'pdf_file.max'               => 'PDF file size must not exceed 20MB.',
            'levels.required'            => 'At least one approval level is required.',
        ]);

        // ── 2. Business rule cross-field validation ──────────────────────────
        $levels = collect($validated['levels'])->sortBy('level_order')->values();

        // BR-IMP-01: L1 must be offline
        if (! ($levels[0]['is_offline'] ?? false)) {
            throw ValidationException::withMessages([
                'levels' => ['L1 must always be marked as offline in an import.'],
            ]);
        }

        // BR-IMP-01: no gaps — once a level is pending, all subsequent must be pending
        $seenPending = false;
        $crossErrors = [];

        foreach ($levels as $idx => $level) {
            if ($level['is_offline'] && $seenPending) {
                $crossErrors["levels.{$idx}.is_offline"] = 'Offline levels must be sequential from L1 with no gaps.';
            }
            if (! $level['is_offline']) {
                $seenPending = true;
            }

            // Per-level required fields
            if ($level['is_offline']) {
                if (empty($level['approver_name'])) {
                    $crossErrors["levels.{$idx}.approver_name"] = "Approver name is required for offline level {$level['level_order']}.";
                }
                if (empty($level['offline_date'])) {
                    $crossErrors["levels.{$idx}.offline_date"] = "Offline date is required for level {$level['level_order']}.";
                }
            } else {
                if (empty($level['approver_id'])) {
                    $crossErrors["levels.{$idx}.approver_id"] = "Approver is required for pending level {$level['level_order']}.";
                }
            }
        }

        if (! empty($crossErrors)) {
            throw ValidationException::withMessages($crossErrors);
        }

        // ── 3. File uploads (before transaction) ────────────────────────────
        $pdfPath = $request->file('pdf_file')->store('documents/pdf', 'local');

        // Key evidence paths by level_order to survive sorting
        $evidencePaths = [];
        foreach ($request->input('levels', []) as $idx => $levelInput) {
            if ($request->hasFile("levels.{$idx}.evidence_file")) {
                $file = $request->file("levels.{$idx}.evidence_file");
                $evidencePaths[(int) $levelInput['level_order']] = [
                    'path'     => $file->store('documents/evidence', 'local'),
                    'filename' => $file->getClientOriginalName(),
                    'size'     => $file->getSize(),
                ];
            }
        }

        // ── 4. Database transaction ──────────────────────────────────────────
        $document         = null;
        $firstPendingStep = null;

        DB::transaction(function () use (
            $validated, $user, $pdfPath, $evidencePaths, $levels, &$document, &$firstPendingStep
        ) {
            $uniqueId = (new UniqueIdService)->generate(now()->year);
            $template = Template::with('levels')->findOrFail($validated['template_id']);
            $snapshot = $this->buildSnapshot($template, ['status' => 'pending', 'positions' => null]);

            // Derive status_code from last offline level
            $lastOfflineOrder = $levels->filter(fn ($l) => $l['is_offline'])->max('level_order');
            $hasAnyPending    = $levels->contains(fn ($l) => ! $l['is_offline']);
            $statusCode       = $hasAnyPending
                ? str_pad($lastOfflineOrder * 3 + 1, 2, '0', STR_PAD_LEFT)
                : '13';

            $document = Document::create([
                'unique_id'           => $uniqueId,
                'pt_index'            => $validated['pt_index'],
                'link_id'             => $validated['link_id'] ?? null,
                'link_name'           => $validated['link_name'] ?? null,
                'project_code'        => $validated['project_code'] ?? null,
                'vendor_contractor'   => $validated['vendor_contractor'],
                'partner_id'          => $validated['partner_id'],
                'submitted_by'        => $user->id,
                'template_id'         => $template->id,
                'template_snapshot'   => $snapshot,
                'sow_name'            => $template->name,
                'tower_id_ne'         => $validated['tower_id_ne'] ?? null,
                'site_name_ne'        => $validated['site_name_ne'] ?? null,
                'tower_id_fe'         => $validated['tower_id_fe'] ?? null,
                'site_name_fe'        => $validated['site_name_fe'] ?? null,
                'original_pdf_path'   => $pdfPath,
                'status_code'         => $statusCode,
                'date_atp_submission' => now()->toDateString(),
                'is_imported'         => true,
            ]);

            $levelDataByOrder  = $levels->keyBy('level_order');
            $firstPendingFound = false;

            foreach ($template->levels as $tplLevel) {
                $order     = $tplLevel->level_order;
                $payload   = $levelDataByOrder[$order] ?? null;
                $isOffline = $payload ? (bool) $payload['is_offline'] : false;

                if ($isOffline) {
                    ApprovalStep::create([
                        'document_id'           => $document->id,
                        'level_order'           => $order,
                        'role'                  => $tplLevel->role,
                        'requires_signature'    => $tplLevel->requires_signature,
                        'approver_id'           => null,
                        'status'                => 'offline_approved',
                        'is_offline'            => true,
                        'offline_date'          => $payload['offline_date'],
                        'offline_approver_name' => $payload['approver_name'] ?? null,
                        'is_active'             => false,
                    ]);

                    // Evidence attachment (optional)
                    if (isset($evidencePaths[$order])) {
                        DocumentAttachment::create([
                            'document_id'       => $document->id,
                            'type'              => 'offline_evidence',
                            'file_path'         => $evidencePaths[$order]['path'],
                            'original_filename' => $evidencePaths[$order]['filename'],
                            'file_size_bytes'   => $evidencePaths[$order]['size'],
                            'uploaded_by'       => $user->id,
                            'notes'             => "L{$order}: " . ($payload['approver_name'] ?? ''),
                        ]);
                    }

                    AuditService::log(
                        $document->id,
                        'step.offline_imported',
                        "L{$order} imported as offline-approved" .
                            (! empty($payload['approver_name']) ? " by {$payload['approver_name']}" : ''),
                        ['level' => $order, 'pic' => $payload['approver_name'] ?? null, 'date' => $payload['offline_date'] ?? null],
                        $user->id,
                    );
                } else {
                    $isFirst          = ! $firstPendingFound;
                    $firstPendingFound = true;

                    $step = ApprovalStep::create([
                        'document_id'        => $document->id,
                        'level_order'        => $order,
                        'role'               => $tplLevel->role,
                        'requires_signature' => $tplLevel->requires_signature,
                        'approver_id'        => $payload['approver_id'] ?? null,
                        'status'             => 'pending',
                        'is_offline'         => false,
                        'is_active'          => $isFirst,
                    ]);

                    if ($isFirst) {
                        $firstPendingStep = $step;
                    }
                }
            }

            AuditService::log(
                $document->id,
                'document.imported',
                "Document imported by {$user->name}. Status: {$statusCode}." .
                    ($hasAnyPending ? " First pending: L{$firstPendingStep?->level_order}." : ' All levels offline.'),
                ['status_code' => $statusCode, 'is_imported' => true],
                $user->id,
            );
        });

        // ── 5. Dispatch notification outside transaction ──────────────────────
        if ($firstPendingStep) {
            NotifyApproverTurnJob::dispatch($document->fresh(), $firstPendingStep->fresh());
        }

        return redirect()->route('documents.show', $document->id)
            ->with('status', 'Document imported successfully.');
    }

    // POST /documents/{id}/placement
    public function placement(Request $request, string $id): JsonResponse
    {
        $user     = $request->user();
        $document = Document::findOrFail($id);

        if (! in_array($user->role, self::ADMIN_ROLES)) {
            abort_if($document->submitted_by !== $user->id, 403);
        }

        $validated = $request->validate([
            'positions'               => ['required', 'array'],
            'positions.*.page'        => ['required', 'integer', 'min:1'],
            'positions.*.x'           => ['required', 'numeric'],
            'positions.*.y'           => ['required', 'numeric'],
            'positions.*.width'       => ['required', 'numeric', 'min:1'],
            'positions.*.height'      => ['required', 'numeric', 'min:1'],
        ]);

        $snapshot = $document->template_snapshot;
        $snapshot['placement'] = [
            'status'    => 'manual',
            'positions' => $validated['positions'],
        ];

        $document->update(['template_snapshot' => $snapshot]);

        AuditService::log(
            $document->id,
            'pdf.placement_saved',
            'Manual PDF stamp placement saved',
            [],
            $user->id,
        );

        return response()->json(['message' => 'Placement saved.']);
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private function validateSubmission(Request $request, bool $isDraft, bool $isAdmin): array
    {
        $rules = [
            'vendor_contractor' => ['required', 'string', 'max:200'],
            'pt_index'          => ['required', 'string', 'max:100'],
            'project_code'      => ['nullable', 'string', 'max:100'],
            'link_id'           => ['nullable', 'string', 'max:100'],
            'link_name'         => ['nullable', 'string', 'max:200'],
            'tower_id_ne'       => ['nullable', 'string', 'max:100'],
            'site_name_ne'      => ['nullable', 'string', 'max:200'],
            'tower_id_fe'       => ['nullable', 'string', 'max:100'],
            'site_name_fe'      => ['nullable', 'string', 'max:200'],
            'template_id'       => ['required', 'uuid', Rule::exists('templates', 'id')->where('status', 'active')],
            'pdf_file'          => [$isDraft ? 'nullable' : 'required', 'file', 'mimes:pdf', 'max:20480'],
            'excel_file'        => ['nullable', 'file', 'mimes:xlsx,xls', 'max:10240'],
        ];

        if ($isAdmin) {
            $rules['partner_id'] = ['required', 'uuid', 'exists:partners,id'];
        }

        $messages = [
            'pt_index.required'          => 'PT Index is required.',
            'template_id.required'       => 'Please select a SOW template.',
            'template_id.exists'         => 'Please select a valid active SOW template.',
            'pdf_file.required'          => 'PDF file is required.',
            'pdf_file.mimes'             => 'File must be a valid PDF.',
            'pdf_file.max'               => 'PDF file size must not exceed 20MB.',
            'excel_file.mimes'           => 'Excel file must be .xlsx or .xls.',
            'excel_file.max'             => 'Excel file size must not exceed 10MB.',
            'vendor_contractor.required' => 'Vendor/Contractor is required.',
            'partner_id.required'        => 'Please select a partner.',
            'partner_id.exists'          => 'Please select a valid partner.',
        ];

        // PIC validation per level (only for submit, not draft)
        if (! $isDraft) {
            $template = Template::with('levels')
                ->where('status', 'active')
                ->find($request->input('template_id'));

            if ($template) {
                foreach ($template->levels->where('level_order', '>', 1) as $level) {
                    $rules["pics.{$level->level_order}"] = ['required', 'uuid', 'exists:users,id'];
                    $messages["pics.{$level->level_order}.required"] = "Please select an approver for Level {$level->level_order}.";
                    $messages["pics.{$level->level_order}.exists"]   = "Please select a valid approver for Level {$level->level_order}.";
                }
            }
        }

        return $request->validate($rules, $messages);
    }

    private function buildSnapshot(Template $template, array $placement): array
    {
        return [
            'template_id'   => $template->id,
            'template_name' => $template->name,
            'levels'        => $template->levels->map(fn (TemplateLevel $l) => [
                'level_order'        => $l->level_order,
                'role'               => $l->role,
                'requires_signature' => $l->requires_signature,
            ])->values()->all(),
            'placement' => $placement,
        ];
    }

}
