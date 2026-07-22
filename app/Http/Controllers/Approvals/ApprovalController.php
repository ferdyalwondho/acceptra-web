<?php

namespace App\Http\Controllers\Approvals;

use App\Http\Controllers\Controller;
use App\Http\Controllers\ProfileController;
use App\Jobs\NotifyAdminsJob;
use App\Jobs\NotifyApproverTurnJob;
use App\Jobs\NotifyPartnerJob;
use App\Models\ApprovalStep;
use App\Models\Document;
use App\Models\InAppNotification;
use App\Models\PunchlistVerification;
use App\Models\Signature;
use App\Services\AuditService;
use App\Services\ClusterApproverResolutionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    private const ADMIN_ROLES    = ['admin', 'super_admin'];
    private const APPROVER_ROLES = ['approver_ms_bo', 'approver_ms_bo_team', 'approver_ms_rts', 'approver_xls_rth_team', 'approver_xls_rth', 'approver_sme'];

    private const ROLE_LABELS = [
        'admin'                  => 'Admin Aviat',
        'approver_ms_bo'         => 'Approver MS BO',
        'approver_ms_bo_team'    => 'Approver MS BO Team',
        'approver_ms_rts'        => 'Approver MS RTS',
        'approver_xls_rth_team'  => 'Approver XLS RTH Team',
        'approver_xls_rth'       => 'Approver XLS RTH',
        'approver_sme'           => 'Approver SME',
    ];

    // GET /approvals
    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_if(
            ! in_array($user->role, [...self::ADMIN_ROLES, ...self::APPROVER_ROLES]),
            403,
        );

        if (in_array($user->role, self::ADMIN_ROLES)) {
            $docs = Document::with(['partner', 'approvalSteps.approver'])
                ->where(function ($q) {
                    $q->whereHas('approvalSteps', fn ($sq) =>
                            $sq->where('level_order', 1)
                               ->where('is_active', true)
                               ->whereNull('approver_id')
                        )
                        ->orWhere('routing_pending', true);
                })
                ->orderByDesc('date_atp_submission')
                ->get();
        } else {
            // An approver's queue includes both their active approval step AND any
            // pending punchlist verification — the latter has no active ApprovalStep
            // (the approval chain already finished), so it needs its own clause here
            // or it silently never appears in the list. A PunchlistVerification row
            // stays 'pending' through the whole '14' (awaiting upload) AND '15'
            // (awaiting verification) window, so it must also be scoped to '15' —
            // otherwise a not-yet-actionable '14' document wrongly shows up here too.
            $docs = Document::with(['partner', 'approvalSteps.approver'])
                ->where(function ($q) use ($user) {
                    $q->whereHas('approvalSteps', fn ($sq) =>
                            $sq->where('approver_id', $user->id)
                               ->where('is_active', true)
                        )
                        ->orWhere(function ($oq) use ($user) {
                            $oq->where('status_code', '15')
                                ->whereHas('punchlistVerifications', fn ($pq) =>
                                    $pq->where('approver_id', $user->id)
                                       ->where('status', 'pending')
                                );
                        });
                })
                ->orderByDesc('date_atp_submission')
                ->get();
        }

        $approvals = $docs->map(fn (Document $doc) => $this->mapDocCard($doc))->values()->all();

        return Inertia::render('Approvals/Index', ['approvals' => $approvals]);
    }

    // GET /approvals/history
    public function history(Request $request): Response
    {
        $user = $request->user();

        abort_if(! in_array($user->role, self::APPROVER_ROLES), 403);

        $actionLabels = [
            'approved'                => 'Approved',
            'approved_with_punchlist' => 'Approved w/ Punchlist',
            'rejected'                => 'Rejected',
            'offline_approved'        => 'Approved',
            'skipped'                 => 'Skipped',
        ];

        $items = Document::with(['approvalSteps', 'punchlistVerifications'])
            ->whereHas('approvalSteps', fn ($q) =>
                $q->where('approver_id', $user->id)
                  ->whereIn('status', ['approved', 'approved_with_punchlist', 'rejected', 'offline_approved', 'skipped'])
            )
            ->orderByDesc('date_atp_submission')
            ->limit(100)
            ->get()
            ->map(function (Document $doc) use ($user, $actionLabels) {
                $myStep         = $doc->approvalSteps->firstWhere('approver_id', $user->id);
                $myVerification = $doc->punchlistVerifications->firstWhere('approver_id', $user->id);

                // A punchlist verification action supersedes the frozen ApprovalStep
                // status ('approved_with_punchlist' never changes once set) — reflect
                // what the approver actually did most recently instead of stale history.
                $myAction = match ($myVerification?->status) {
                    'verified' => 'Punchlist Revision Verified',
                    'rejected' => 'Punchlist Revision Rejected',
                    default    => $actionLabels[$myStep?->status] ?? $myStep?->status ?? '—',
                };
                $myDateRaw = match ($myVerification?->status) {
                    'verified' => $myVerification->verified_at,
                    'rejected' => $myVerification->updated_at,
                    default    => $myStep?->action_at,
                };

                return [
                    'id'         => $doc->id,
                    'uniqueId'   => $doc->unique_id,
                    'project'    => $doc->link_name ?? $doc->pt_index,
                    'sow'        => $doc->sow_name,
                    'statusCode' => $doc->status_code,
                    'myAction'   => $myAction,
                    'myDate'     => $myDateRaw?->format('d M Y') ?? '—',
                    'myDateSort' => $myDateRaw?->toISOString(),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Approvals/History', ['items' => $items]);
    }

    // GET /documents/{id}/approval
    public function show(Request $request, string $id): Response
    {
        $user     = $request->user();
        $document = Document::with([
            'partner',
            'approvalSteps.approver',
            'attachments',
            'punchlistVerifications.approver',
        ])->findOrFail($id);

        $this->authorizeApprovalAccess($user, $document);

        abort_if($document->routing_pending, 422, 'This document is awaiting routing completion. Please complete routing from the document page.');

        $activeStep      = $document->approvalSteps->firstWhere('is_active', true);
        $excelAttachment = $document->attachments->firstWhere('type', 'excel');

        // Show the previously-rejected PDF side by side only to the approver whose
        // level actually rejected it — not any other level in the chain. Also shown
        // to Admin reviewing a punchlist revision's L1 gate (status '17'), which
        // deliberately never sets previous_pdf_rejected_level.
        $showPreviousPdf = $document->previous_pdf_path
            && $activeStep
            && (
                (int) $document->previous_pdf_rejected_level === (int) $activeStep->level_order
                || ($document->status_code === '17' && $activeStep->level_order === 1)
            );

        $canAct     = false;
        $myStepDone = null;

        if (in_array($user->role, self::ADMIN_ROLES)) {
            $canAct = $activeStep !== null && $activeStep->level_order === 1;
        } else {
            $myStep = $document->approvalSteps->firstWhere('approver_id', $user->id);
            if ($myStep) {
                $canAct = (bool) $myStep->is_active;
                if (! $canAct && in_array($myStep->status, ['approved', 'approved_with_punchlist', 'rejected', 'offline_approved'])) {
                    $myStepDone = [
                        'status'          => $myStep->status,
                        'action_at'       => $myStep->action_at?->format('d M Y, H:i'),
                        'punchlist_notes' => $myStep->punchlist_notes,
                        'reject_reason'   => $myStep->reject_reason,
                    ];
                }
            }
        }

        $steps = $document->approvalSteps->map(fn (ApprovalStep $s) => [
            'id'                => $s->id,
            'level'             => $s->level_order,
            'role'              => self::ROLE_LABELS[$s->role] ?? $s->role,
            'pic'               => $s->approver?->name,
            'date'              => $s->action_at?->format('d M Y'),
            'state'             => $this->stepState($s),
            'requiresSignature' => $s->requires_signature,
            'reason'            => $s->reject_reason,
        ])->values()->all();

        $doc = [
            'id'                => $document->id,
            'uniqueId'          => $document->unique_id,
            'project'           => $document->link_name ?? $document->pt_index,
            'sow'               => $document->sow_name,
            'statusCode'        => $document->status_code,
            'requiresSignature' => (bool) ($activeStep?->requires_signature ?? false),
        ];

        $placement = $document->template_snapshot['placement'] ?? null;

        $activeSig = Signature::where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        $props = [
            'doc'                  => $doc,
            'steps'                => $steps,
            'can_act'              => $canAct,
            'my_step_done'         => $myStepDone,
            'user_signature_id'    => $activeSig?->id,
            'user_signature_url'   => $activeSig ? ProfileController::sigToDataUrl($activeSig->image_path) : null,
            'excel_attachment' => $excelAttachment ? [
                'id'                => $excelAttachment->id,
                'original_filename' => $excelAttachment->original_filename,
                'file_size_bytes'   => $excelAttachment->file_size_bytes,
            ] : null,
            'pdf_url'          => $document->original_pdf_path
                ? route('documents.pdf', $document->id)
                : null,
            'previous_pdf_url' => $showPreviousPdf
                ? route('documents.pdf.previous', $document->id)
                : null,
            'placements'       => ($placement && ! empty($placement['positions']))
                ? $placement['positions']
                : null,
        ];

        // Verify mode: status 15 + user has punchlist_verification for this doc
        if ($document->status_code === '15') {
            $myVerification = $document->punchlistVerifications
                ->firstWhere('approver_id', $user->id);

            if ($myVerification) {
                $myStep = $document->approvalSteps
                    ->firstWhere('id', $myVerification->approval_step_id);

                $revisionPdf = $document->attachments
                    ->where('type', 'punchlist_revision')
                    ->sortByDesc('created_at')
                    ->first();

                $props['mode'] = 'verify';
                // Verify mode always shows the pre-revision PDF side by side with the
                // revision, if one exists — unlike $showPreviousPdf above (which is scoped
                // to the reject-flow's L1 gate and requires an active step that doesn't
                // exist here, since the approval chain already finished before verification).
                $props['previous_pdf_url'] = $document->previous_pdf_path
                    ? route('documents.pdf.previous', $document->id)
                    : null;
                $props['my_punchlist'] = $myStep ? [
                    'notes'      => $myStep->punchlist_notes,
                    'created_at' => $myStep->action_at?->toISOString(),
                ] : null;
                $props['punchlist_revision_pdf'] = $revisionPdf ? [
                    'url'         => route('attachments.download', [
                        'id'     => $document->id,
                        'att_id' => $revisionPdf->id,
                    ]),
                    'filename'    => $revisionPdf->original_filename,
                    'uploaded_at' => $revisionPdf->created_at->format('d M Y'),
                    'uploaded_by' => $revisionPdf->uploader?->name ?? 'Admin',
                ] : null;
                $props['all_verifications'] = $document->punchlistVerifications
                    ->map(fn (PunchlistVerification $v) => [
                        'approver_name' => $v->approver?->name ?? '—',
                        'status'        => $v->status,
                        'verified_at'   => $v->verified_at?->format('d M Y'),
                    ])->values()->all();
            }
        }

        return Inertia::render('Approvals/Screen', $props);
    }

    // POST /documents/{id}/approve
    public function approve(Request $request, string $id): RedirectResponse
    {
        $user     = $request->user();
        $document = Document::with('approvalSteps.approver')->findOrFail($id);

        $activeStep = $document->approvalSteps->firstWhere('is_active', true);
        abort_if(! $activeStep, 422, 'No active approval step.');

        $this->authorizeStepAction($user, $activeStep);

        $request->validate([
            'action'          => ['required', 'in:approve,approve_with_punchlist'],
            'punchlist_notes' => ['required_if:action,approve_with_punchlist', 'nullable', 'string'],
            'signature_id'    => ['nullable', 'uuid'],
            'signature_data'  => ['nullable', 'string'],
        ]);

        $action = $request->input('action');

        $nextStep               = null;
        $routingPendingTriggered = false;

        DB::transaction(function () use ($user, $document, $activeStep, $action, $request, &$nextStep, &$routingPendingTriggered) {
            // Resolve signature: use existing ID, or save new base64 data
            $signatureId = $request->input('signature_id');
            if (! $signatureId && $request->filled('signature_data')) {
                $dataUrl = $request->input('signature_data');
                if (str_starts_with($dataUrl, 'data:image/')) {
                    preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $m);
                    $ext     = in_array($m[1] ?? '', ['png', 'jpeg', 'jpg', 'gif', 'webp']) ? ($m[1] === 'jpeg' ? 'jpg' : $m[1]) : 'png';
                    $decoded = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), strict: true);
                    if ($decoded !== false) {
                        $fileToken = (string) Str::uuid7();
                        $path      = "signatures/{$user->id}/{$fileToken}.{$ext}";
                        Storage::put($path, $decoded);
                        Signature::where('user_id', $user->id)->update(['is_active' => false]);
                        $sig         = Signature::create(['user_id' => $user->id, 'image_path' => $path, 'is_active' => true]);
                        $signatureId = $sig->id;
                    }
                }
            }

            $activeStep->update([
                'status'          => $action === 'approve' ? 'approved' : 'approved_with_punchlist',
                'punchlist_notes' => $action === 'approve_with_punchlist' ? $request->input('punchlist_notes') : null,
                'action_at'       => now(),
                'is_active'       => false,
                'signature_id'    => $signatureId,
                'approver_id'     => $activeStep->approver_id ?? $user->id,
            ]);

            // Every approve changes the signature and/or status_code (both get stamped
            // onto the final PDF) — invalidate the cache so /documents/{id}/pdf regenerates.
            $document->update(['final_pdf_path' => null]);

            // Find next pending step
            $nextStep = $document->approvalSteps()
                ->where('level_order', '>', $activeStep->level_order)
                ->where('status', 'pending')
                ->orderBy('level_order')
                ->first();

            if ($document->status_code === '17' && $activeStep->level_order === 1) {
                // L1 gate for a Subcon-uploaded punchlist revision — a sanity check only,
                // not a resume of the frozen L2-L4 chain. Once approved, the document
                // moves straight to placement for the new PDF (reusing the same
                // routing_pending/RoutingPanel machinery as the reject-flow's L1 gate).
                $document->update(['status_code' => '14', 'routing_pending' => true]);
                $routingPendingTriggered = true;
            } elseif ($nextStep) {
                // The whole chain restarts from L1 after any rejection (BR: reject never
                // resumes mid-chain), so every level reached during that restart is a
                // "Done Rectification" re-review, not a first-time look — regardless of
                // which specific level originally rejected it.
                $isRectificationCycle = $document->previous_pdf_rejected_level !== null;
                $advanceCode = $isRectificationCycle
                    ? str_pad($nextStep->level_order * 3, 2, '0', STR_PAD_LEFT)
                    : str_pad(($nextStep->level_order - 1) * 3 + 1, 2, '0', STR_PAD_LEFT);

                // Signature placement is a per-PDF (not per-level) concern — redo it the first
                // time any step tries to go active after the PDF changed, regardless of which
                // level that is; once Admin completes routing this stays clear for the rest of
                // the chain in the same cycle.
                $needsPlacementRedo = ($document->template_snapshot['placement']['status'] ?? 'pending') !== 'manual';

                if ($nextStep->approver_id === null) {
                    // Partner-submitted document reaching the next level for the first time —
                    // no PIC was assigned at creation. Resolve L2-L4 approvers from the document's
                    // cluster right now, inside this same transaction, so this action either fully
                    // succeeds (L1 approved + PICs assigned) or fails atomically — if the mapping
                    // is incomplete, throwing here rolls back the L1 status change above too, so
                    // the step stays exactly as it was ('pending'/is_active=true) and re-actionable.
                    $levels = $document->approvalSteps->where('level_order', '>', 1);
                    [$resolved, $missing] = ClusterApproverResolutionService::resolveForLevels(
                        $document->cluster_zone,
                        $levels->map(fn (ApprovalStep $s) => (object) ['level_order' => $s->level_order, 'role' => $s->role]),
                    );

                    if (! empty($missing)) {
                        $missingLabels = collect($missing)
                            ->map(fn ($role, $lvl) => "L{$lvl} (" . (self::ROLE_LABELS[$role] ?? $role) . ')')
                            ->implode(', ');

                        throw ValidationException::withMessages([
                            'cluster_zone' => ["Cluster '{$document->cluster_zone}' belum punya PIC untuk: {$missingLabels}. Lengkapi dulu lewat menu Users, lalu approve L1 lagi."],
                        ]);
                    }

                    foreach ($levels as $step) {
                        $step->update(['approver_id' => $resolved[$step->level_order]]);
                    }

                    // is_active stays false until the Admin finishes signature placement via
                    // "complete routing" — routing_pending now purely means "placement pending",
                    // since PICs are already resolved and assigned above.
                    $document->update(['status_code' => $advanceCode, 'routing_pending' => true]);
                    $routingPendingTriggered = true;
                } elseif ($needsPlacementRedo) {
                    // PICs already assigned — only signature placement needs redoing before
                    // this (previously rejected, now revised) level goes live.
                    $document->update(['status_code' => $advanceCode, 'routing_pending' => true]);
                    $routingPendingTriggered = true;
                } else {
                    $nextStep->update(['is_active' => true]);
                    $document->update(['status_code' => $advanceCode]);
                }
            } else {
                // Last approver — check for any punchlist across all steps
                $punchlistSteps = $document->approvalSteps()
                    ->where('status', 'approved_with_punchlist')
                    ->get();

                if ($punchlistSteps->isNotEmpty()) {
                    $aggregated = $punchlistSteps
                        ->pluck('punchlist_notes')
                        ->filter()
                        ->implode("\n\n");

                    $document->update([
                        'status_code'       => '14',
                        'date_atp_approved' => today(),
                        'atp_punchlist'     => $aggregated,
                    ]);

                    foreach ($punchlistSteps as $step) {
                        PunchlistVerification::create([
                            'document_id'      => $document->id,
                            'approval_step_id' => $step->id,
                            'approver_id'      => $step->approver_id,
                            'status'           => 'pending',
                        ]);
                    }
                } else {
                    $document->update([
                        'status_code'       => '13',
                        'date_atp_approved' => today(),
                    ]);
                }
            }

            $eventName = $action === 'approve_with_punchlist'
                ? 'step.approved_with_punchlist'
                : 'step.approved';

            $description = $action === 'approve_with_punchlist'
                ? "Step L{$activeStep->level_order} approved with punchlist by {$user->name}: {$request->input('punchlist_notes')}"
                : "Step L{$activeStep->level_order} approved by {$user->name}";

            AuditService::log(
                $document->id,
                $eventName,
                $description,
                ['level' => $activeStep->level_order],
                $user->id,
            );
        });

        // Mark related in-app notifications as read
        InAppNotification::where('user_id', $user->id)
            ->where('document_id', $id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        // Dispatch notifications outside transaction
        if ($routingPendingTriggered) {
            NotifyAdminsJob::dispatch($document->fresh(), 'routing_needed');
        } elseif ($nextStep) {
            NotifyApproverTurnJob::dispatch($document->fresh(), $nextStep);
        } else {
            NotifyAdminsJob::dispatch($document->fresh(), 'flow_completed');
        }

        $flash = match (true) {
            $routingPendingTriggered && $document->fresh()->status_code === '14' => 'Punchlist revision approved. Signature placement is needed before verification can proceed.',
            $routingPendingTriggered => 'L1 approved. This document needs approver routing (L2–L4) assigned before it can proceed.',
            $nextStep !== null => 'Approval recorded. Next approver has been notified.',
            $document->fresh()->status_code === '14' => 'ATP Done with Punchlist. Admin can now upload the revised document.',
            default => 'All approvals complete. Document is now ATP Done.',
        };

        if ($routingPendingTriggered) {
            return redirect()->route('documents.show', $document->id)->with('success', $flash);
        }

        return redirect()->route('approvals.index')->with('success', $flash);
    }

    // POST /documents/{id}/reject
    public function reject(Request $request, string $id): RedirectResponse
    {
        $user     = $request->user();
        $document = Document::with('approvalSteps')->findOrFail($id);

        $activeStep = $document->approvalSteps->firstWhere('is_active', true);
        abort_if(! $activeStep, 422, 'No active approval step.');

        $this->authorizeStepAction($user, $activeStep);

        $request->validate([
            'reject_reason' => ['required', 'string'],
        ]);

        $isL1Gate          = false;
        $isPunchlistL1Gate = false;

        DB::transaction(function () use ($user, $document, $activeStep, $request, &$isL1Gate, &$isPunchlistL1Gate) {
            $activeStep->update([
                'status'        => 'rejected',
                'reject_reason' => $request->input('reject_reason'),
                'action_at'     => now(),
                'is_active'     => false,
                'approver_id'   => $activeStep->approver_id ?? $user->id,
            ]);

            // Rejecting the L1 gate of a Subcon-uploaded punchlist revision is a distinct
            // case from the reject-flow's own L1 gate below — it must never fall through to
            // that branch (which reads previous_pdf_rejected_level, reserved for reject-flow
            // semantics only) and simply reverts to '14' so the Subcon can re-upload.
            $isPunchlistL1Gate = $activeStep->level_order === 1 && $document->status_code === '17';

            if ($isPunchlistL1Gate) {
                $document->update(['status_code' => '14', 'final_pdf_path' => null]);

                AuditService::log(
                    $document->id,
                    'step.rejected',
                    "Punchlist revision rejected at L1 review by {$user->name}: {$request->input('reject_reason')}. Subcon must re-upload.",
                    ['level' => $activeStep->level_order],
                    $user->id,
                );

                return;
            }

            // Rejecting L1's re-review gate (a Partner's revision of a document rejected at
            // a higher level) reverts to THAT level's rejection code, not L1's own '02' — so
            // the memory of "L{n} actually needs to review this" isn't lost. L1 rejecting its
            // own genuine first-time review (previous_pdf_rejected_level null or ===1) behaves
            // exactly as before.
            $isL1Gate    = $activeStep->level_order === 1 && ($document->previous_pdf_rejected_level ?? 1) > 1;
            $rejectLevel = $isL1Gate ? $document->previous_pdf_rejected_level : $activeStep->level_order;
            $rejectCode  = str_pad($rejectLevel * 3 - 1, 2, '0', STR_PAD_LEFT);

            $document->update(['status_code' => $rejectCode, 'final_pdf_path' => null]);

            AuditService::log(
                $document->id,
                'step.rejected',
                $isL1Gate
                    ? "Revision rejected at L1 review by {$user->name}: {$request->input('reject_reason')}. Reverting to L{$rejectLevel} rejected — Partner must resubmit."
                    : "Step L{$activeStep->level_order} rejected by {$user->name}: {$request->input('reject_reason')}",
                ['level' => $activeStep->level_order],
                $user->id,
            );
        });

        // Mark related in-app notifications as read
        InAppNotification::where('user_id', $user->id)
            ->where('document_id', $id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        if ($isPunchlistL1Gate || $isL1Gate) {
            NotifyPartnerJob::dispatch($document->fresh(), 'rejected_for_revision');
        } else {
            NotifyAdminsJob::dispatch($document->fresh(), 'rejected');
        }

        if ($isPunchlistL1Gate) {
            return redirect()->route('approvals.index')
                ->with('success', 'Punchlist revision rejected. The Subcon has been notified to re-upload.');
        }

        return redirect()->route('approvals.index')
            ->with('success', $isL1Gate
                ? 'Revision rejected. The Partner has been notified to resubmit.'
                : 'Revision rejected. Admin Aviat has been notified.');
    }

    private function authorizeApprovalAccess(object $user, Document $document): void
    {
        if (in_array($user->role, self::ADMIN_ROLES)) {
            return;
        }

        if (in_array($user->role, self::APPROVER_ROLES)) {
            $isInvolved = $document->approvalSteps
                ->contains(fn ($step) => $step->approver_id === $user->id);

            // Also allow if user has a punchlist_verification (for verify mode)
            $hasPunchlistRecord = $document->punchlistVerifications
                ->contains(fn ($v) => $v->approver_id === $user->id);

            abort_if(! $isInvolved && ! $hasPunchlistRecord, 403);
            return;
        }

        abort(403);
    }

    private function authorizeStepAction(object $user, ApprovalStep $step): void
    {
        // Admin/Super Admin can act on L1 steps (approver_id = null)
        if (in_array($user->role, self::ADMIN_ROLES) && $step->level_order === 1) {
            return;
        }

        // Approver can only act on their own assigned step
        abort_if($step->approver_id !== $user->id, 403, 'Not your approval step.');
    }

    private function mapDocCard(Document $doc): array
    {
        return [
            'id'          => $doc->id,
            'uniqueId'    => $doc->unique_id,
            'project'     => $doc->link_name ?? $doc->pt_index,
            'sow'         => $doc->sow_name,
            'partner'     => $doc->partner?->name,
            'statusCode'  => $doc->status_code,
            'needsRouting' => (bool) $doc->routing_pending,
            'activeStep'  => ($step = $doc->approvalSteps->firstWhere('is_active', true))
                ? 'L' . $step->level_order . ' — ' . (self::ROLE_LABELS[$step->role] ?? $step->role)
                : ($doc->routing_pending
                    ? 'Awaiting Routing (L2–L4)'
                    : ($doc->status_code === '15' ? 'Punchlist Verification' : null)),
            'submittedAt' => $doc->date_atp_submission
                ? $doc->date_atp_submission->format('d M Y')
                : $doc->created_at->format('d M Y'),
            'approvers'   => $doc->approvalSteps
                ->whereNotNull('approver_id')
                ->map(fn (ApprovalStep $s) => $s->approver)
                ->filter()
                ->map(fn ($u) => ['name' => $u->name, 'initials' => $u->initials])
                ->values()
                ->all(),
        ];
    }

    private function stepState(ApprovalStep $s): string
    {
        if (in_array($s->status, ['approved', 'approved_with_punchlist', 'offline_approved', 'skipped'])) {
            return 'done';
        }
        if ($s->status === 'rejected') {
            return 'rejected';
        }
        if ($s->is_active) {
            return 'active';
        }
        return 'pending';
    }
}
