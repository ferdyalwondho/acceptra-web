<?php

namespace App\Http\Controllers;

use App\Models\ApprovalStep;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\PunchlistVerification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    // Status codes that indicate L1 stage (visible to partner as-is)
    private const L1_STATUS_CODES = ['01', '02', '03'];

    // Status codes that indicate completion
    private const DONE_STATUS_CODES = ['13', '16'];

    // Human-readable labels for L1 statuses (shown to partner)
    private const L1_LABELS = [
        '01' => 'Submit & On Review L1',
        '02' => 'L1 Rejected – Need Rectification',
        '03' => 'Done Rectification – On Review L1',
    ];

    public function index(Request $request): Response
    {
        $user = $request->user();

        return match (true) {
            in_array($user->role, ['admin', 'super_admin', 'viewer']) => $this->adminDashboard($user, $request),
            $user->role === 'partner'                                  => $this->partnerDashboard($user, $request),
            str_starts_with($user->role, 'approver_')                 => $this->approverDashboard($user),
            default                                                    => $this->adminDashboard($user, $request),
        };
    }

    // ── Admin / Super Admin / Viewer ─────────────────────────────────────────

    private function adminDashboard(User $user, Request $request): Response
    {
        // 1. Grouped metrics
        $metrics = [
            'draft'         => Document::where('status_code', 'draft')->count(),
            'active'        => Document::whereNotIn('status_code', ['draft', '13', '16'])->count(),
            'need_revision' => Document::whereIn('status_code', ['02', '05', '08', '11', '14'])->count(),
            'completed'     => Document::whereIn('status_code', ['13', '16'])->count(),
        ];

        // 2. Overdue approvals: pending step activated > 7 days ago
        $overdueDocuments = Document::with(['partner'])
            ->whereHas('approvalSteps', fn ($q) =>
                $q->where('is_active', true)
                  ->where('status', 'pending')
                  ->where('updated_at', '<', now()->subDays(7))
            )
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $metrics['overdue_count'] = $overdueDocuments->count();

        $overdueApprovals = $overdueDocuments->map(fn (Document $doc) => [
            'id'           => $doc->id,
            'uniqueId'     => $doc->unique_id,
            'project'      => $doc->link_name ?? $doc->pt_index,
            'sow'          => $doc->sow_name,
            'partner'      => $doc->partner?->name,
            'statusCode'   => $doc->status_code,
            'waitingSince' => $doc->updated_at->format('d M Y'),
        ]);

        // 3. Active documents (not done, not draft), last 10
        $activeDocuments = Document::with(['partner', 'approvalSteps'])
            ->whereNotIn('status_code', ['draft', '13', '16'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn (Document $doc) => [
                'id'          => $doc->id,
                'uniqueId'    => $doc->unique_id,
                'project'     => $doc->link_name ?? $doc->pt_index,
                'sow'         => $doc->sow_name,
                'partner'     => $doc->partner?->name,
                'statusCode'  => $doc->status_code,
                'submittedAt' => $doc->date_atp_submission
                    ? $doc->date_atp_submission->format('d M Y')
                    : $doc->created_at->format('d M Y'),
            ]);

        // 4. Recent activity from audit_logs
        $recentActivity = AuditLog::with(['user', 'document'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id'                => $log->id,
                'event'             => $log->event,
                'description'       => $log->description,
                'actorName'         => $log->user?->name,
                'documentUniqueId'  => $log->document?->unique_id,
                'createdAt'         => $log->created_at->format('d M Y H:i'),
            ]);

        // 5. Approval stage breakdown — active docs per L-level
        $approvalStageBreakdown = [
            ['stage' => 'L1', 'count' => Document::whereIn('status_code', ['01', '02', '03'])->count()],
            ['stage' => 'L2', 'count' => Document::whereIn('status_code', ['04', '05', '06'])->count()],
            ['stage' => 'L3', 'count' => Document::whereIn('status_code', ['07', '08', '09'])->count()],
            ['stage' => 'L4', 'count' => Document::whereIn('status_code', ['10', '11', '12', '14', '15'])->count()],
        ];

        // 6. Weekly document creation trend for the selected month
        [$trendMonth, $trendYear] = $this->resolveMonthYear($request, Document::min('created_at'));

        $weeklyTrend = $this->weeklyTrend(
            Carbon::create($trendYear, $trendMonth, 1),
            fn (Carbon $start, Carbon $end) => Document::whereBetween('created_at', [$start, $end])->count(),
        );

        $availableYears = $this->availableYears(Document::min('created_at'));

        // 7. Top 5 partners by total document count
        $topPartners = \App\Models\Partner::withCount('documents')
            ->orderByDesc('documents_count')
            ->limit(5)
            ->get()
            ->map(fn (\App\Models\Partner $partner) => [
                'name'  => $partner->name,
                'total' => $partner->documents_count,
            ])
            ->values()
            ->all();

        return Inertia::render('Dashboard/Admin', [
            'metrics'                  => $metrics,
            'active_documents'         => $activeDocuments,
            'overdue_approvals'        => $overdueApprovals,
            'recent_activity'          => $recentActivity,
            'approval_stage_breakdown' => $approvalStageBreakdown,
            'weekly_trend'             => $weeklyTrend,
            'selected_month'           => $trendMonth,
            'selected_year'            => $trendYear,
            'available_years'          => $availableYears,
            'top_partners'             => $topPartners,
        ]);
    }

    // ── Partner ──────────────────────────────────────────────────────────────

    private function partnerDashboard(User $user, Request $request): Response
    {
        abort_if(! $user->partner_id, 403);

        $docs = Document::where('partner_id', $user->partner_id)
            ->orderByDesc('created_at')
            ->get();

        $summary = [
            'total'     => $docs->count(),
            'draft'     => $docs->where('status_code', 'draft')->count(),
            'active'    => $docs->filter(
                fn (Document $d) => ! in_array($d->status_code, ['draft', '13', '16'])
            )->count(),
            'completed' => $docs->whereIn('status_code', self::DONE_STATUS_CODES)->count(),
        ];

        $documents = $docs->take(10)->map(fn (Document $doc) => [
            'id'                 => $doc->id,
            'uniqueId'           => $doc->unique_id,
            'project'            => $doc->link_name ?? $doc->pt_index,
            'sow'                => $doc->sow_name,
            'statusCode'         => $doc->status_code,
            'statusLabelPartner' => $this->maskStatusForPartner($doc->status_code),
            'submittedAt'        => $doc->date_atp_submission
                ? $doc->date_atp_submission->format('d M Y')
                : $doc->created_at->format('d M Y'),
        ]);

        $eligibleDocs = $docs->whereNotIn('status_code', ['draft']);

        [$trendMonth, $trendYear] = $this->resolveMonthYear($request, $docs->min('created_at'));

        $weeklyTrend = $this->weeklyTrend(
            Carbon::create($trendYear, $trendMonth, 1),
            fn (Carbon $start, Carbon $end) => $eligibleDocs
                ->filter(fn (Document $d) => $d->created_at->between($start, $end))
                ->count(),
        );

        $availableYears = $this->availableYears($docs->min('created_at'));

        return Inertia::render('Dashboard/Partner', [
            'summary'          => $summary,
            'documents'        => $documents,
            'weekly_trend'     => $weeklyTrend,
            'selected_month'   => $trendMonth,
            'selected_year'    => $trendYear,
            'available_years'  => $availableYears,
        ]);
    }

    // ── Approver ─────────────────────────────────────────────────────────────

    private function approverDashboard(User $user): Response
    {
        // Documents with an active pending approval step for this user.
        $pendingApprovals = Document::with([
                'approvalSteps' => fn ($q) =>
                    $q->where('approver_id', $user->id)
                      ->where('is_active', true)
                      ->where('status', 'pending'),
            ])
            ->whereHas('approvalSteps', fn ($q) =>
                $q->where('approver_id', $user->id)
                  ->where('is_active', true)
                  ->where('status', 'pending')
            )
            ->get()
            ->map(function (Document $doc) {
                $step = $doc->approvalSteps->first();
                return [
                    'id'           => $doc->id,
                    'uniqueId'     => $doc->unique_id,
                    'project'      => $doc->link_name ?? $doc->pt_index,
                    'sow'          => $doc->sow_name,
                    'statusCode'   => $doc->status_code,
                    'levelOrder'   => $step?->level_order,
                    'kind'         => 'approval',
                    'waitingSince' => $step?->updated_at,
                ];
            });

        // Documents awaiting this user's punchlist verification — these have no active
        // ApprovalStep (the approval chain already finished), so they need their own
        // query or they silently never show up here (same gap fixed earlier for /approvals).
        // A PunchlistVerification row stays 'pending' through both '14' (awaiting
        // upload) and '15' (awaiting verification) — only '15' is actually actionable.
        $pendingPunchlistVerifications = Document::with([
                'punchlistVerifications' => fn ($q) =>
                    $q->where('approver_id', $user->id)
                      ->where('status', 'pending'),
                'punchlistVerifications.approvalStep',
            ])
            ->where('status_code', '15')
            ->whereHas('punchlistVerifications', fn ($q) =>
                $q->where('approver_id', $user->id)
                  ->where('status', 'pending')
            )
            ->get()
            ->map(function (Document $doc) {
                $verification = $doc->punchlistVerifications->first();
                return [
                    'id'           => $doc->id,
                    'uniqueId'     => $doc->unique_id,
                    'project'      => $doc->link_name ?? $doc->pt_index,
                    'sow'          => $doc->sow_name,
                    'statusCode'   => $doc->status_code,
                    'levelOrder'   => $verification?->approvalStep?->level_order,
                    'kind'         => 'punchlist',
                    'waitingSince' => $verification?->updated_at,
                ];
            });

        // Top 5 across both — oldest first (longest waiting)
        $needApproval = $pendingApprovals->concat($pendingPunchlistVerifications)
            ->sortBy('waitingSince')
            ->take(5)
            ->values()
            ->map(fn (array $item) => [
                ...$item,
                'waitingSince' => $item['waitingSince']?->format('d M Y'),
            ]);

        // Stats
        $pendingCount = ApprovalStep::where('approver_id', $user->id)
            ->where('is_active', true)
            ->where('status', 'pending')
            ->count();

        $approvedCount = ApprovalStep::where('approver_id', $user->id)
            ->whereIn('status', ['approved', 'offline_approved', 'skipped'])
            ->count();

        // Punchlist awaiting my verification — scoped to status '15' only, same as
        // $pendingPunchlistVerifications above, so this count matches what's actually
        // actionable (a '14' document hasn't had its revision uploaded yet).
        $punchlistPendingCount = PunchlistVerification::where('approver_id', $user->id)
            ->where('status', 'pending')
            ->whereHas('document', fn ($q) => $q->where('status_code', '15'))
            ->count();

        // Rejected and document not yet revised by admin
        $rejectedPendingCount = Document::whereHas('approvalSteps', fn ($q) =>
                $q->where('approver_id', $user->id)->where('status', 'rejected')
            )
            ->whereIn('status_code', ['02', '05', '08', '11'])
            ->count();

        // ATP Done — documents I was involved in that reached final completion
        $atpDoneCount = Document::whereHas('approvalSteps', fn ($q) =>
                $q->where('approver_id', $user->id)
                  ->whereIn('status', ['approved', 'approved_with_punchlist', 'offline_approved'])
            )
            ->whereIn('status_code', ['13', '16'])
            ->count();

        $stats = [
            'pending'          => $pendingCount,
            'approved'         => $approvedCount,
            'punchlist_pending' => $punchlistPendingCount,
            'rejected_pending'  => $rejectedPendingCount,
            'atp_done'         => $atpDoneCount,
        ];

        // 5 most recent steps this approver acted on
        $recentHistory = ApprovalStep::with('document')
            ->where('approver_id', $user->id)
            ->whereIn('status', ['approved', 'approved_with_punchlist', 'rejected', 'offline_approved'])
            ->orderByDesc('action_at')
            ->limit(5)
            ->get()
            ->map(fn (ApprovalStep $step) => [
                'documentId' => $step->document_id,
                'uniqueId'   => $step->document?->unique_id,
                'sowName'    => $step->document?->sow_name,
                'status'     => $step->status,
                'actionAt'   => $step->action_at?->format('d M Y'),
            ]);

        return Inertia::render('Dashboard/Approver', [
            'need_approval'       => $needApproval,
            'need_approval_count' => $pendingApprovals->count() + $pendingPunchlistVerifications->count(),
            'recent_history'      => $recentHistory,
            'stats'               => $stats,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Resolve the month/year to show the trend chart for, from request params,
     * falling back to the current month/year when missing or out of range.
     *
     * @return array{0: int, 1: int} [month, year]
     */
    private function resolveMonthYear(Request $request, string|\DateTimeInterface|null $earliestCreatedAt): array
    {
        $now = now();
        $earliestYear = $earliestCreatedAt ? Carbon::parse($earliestCreatedAt)->year : $now->year;

        $month = (int) $request->input('month', $now->month);
        $year = (int) $request->input('year', $now->year);

        if ($month < 1 || $month > 12) {
            $month = $now->month;
        }

        if ($year < $earliestYear || $year > $now->year) {
            $year = $now->year;
        }

        return [$month, $year];
    }

    /**
     * Years that have at least one document, most recent first, for the year slicer.
     *
     * @return int[]
     */
    private function availableYears(string|\DateTimeInterface|null $earliestCreatedAt): array
    {
        $earliestYear = $earliestCreatedAt ? Carbon::parse($earliestCreatedAt)->year : now()->year;

        return range(now()->year, $earliestYear);
    }

    /**
     * Split the given month into Monday–Sunday weeks, clipped to the month's
     * own start/end days (the first and last week may be shorter than 7 days).
     *
     * @return array<int, array{week: string, count: int}>
     */
    private function weeklyTrend(Carbon $monthStart, callable $counter): array
    {
        $monthStart = $monthStart->copy()->startOfMonth();
        $monthEnd = $monthStart->copy()->endOfMonth();

        $weeks = [];
        $cursor = $monthStart->copy();

        while ($cursor->lte($monthEnd)) {
            $weekEnd = $cursor->copy()->endOfWeek();
            if ($weekEnd->gt($monthEnd)) {
                $weekEnd = $monthEnd->copy();
            }

            $label = $cursor->day === $weekEnd->day
                ? $cursor->format('j M')
                : $cursor->format('j').'-'.$weekEnd->format('j M');

            $weeks[] = [
                'week' => $label,
                'count' => $counter($cursor->copy()->startOfDay(), $weekEnd->copy()->endOfDay()),
            ];

            $cursor = $weekEnd->copy()->addDay()->startOfDay();
        }

        return $weeks;
    }

    private function maskStatusForPartner(string $statusCode): string
    {
        if ($statusCode === 'draft') {
            return 'Draft';
        }

        if (in_array($statusCode, self::L1_STATUS_CODES)) {
            return self::L1_LABELS[$statusCode] ?? $statusCode;
        }

        if (in_array($statusCode, self::DONE_STATUS_CODES)) {
            return 'Selesai';
        }

        return 'Dalam proses approval customer';
    }
}
