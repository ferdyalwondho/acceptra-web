<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DocumentQueryService
{
    private const AVIAT_ROLES = ['admin', 'super_admin', 'viewer'];

    private const SORTABLE = [
        'created_at', 'date_atp_submission', 'status_code', 'unique_id',
        'project_code', 'sow_name', 'partner_name',
    ];

    /**
     * Build a filtered, scoped, and sorted query for documents.
     * Does NOT apply pagination or eager-loads — callers add those.
     */
    public function build(Request $request, User $user): Builder
    {
        $query = $this->scopeToUser(Document::query(), $user);

        $this->applyFilters($query, $request, in_array($user->role, self::AVIAT_ROLES));

        return $this->applySort($query, $request);
    }

    /**
     * Restrict a document query to what this user is allowed to see.
     */
    public function scopeToUser(Builder $query, User $user): Builder
    {
        if ($user->role === 'partner') {
            // Documents they personally submitted, or any document assigned to their
            // partner org (covers docs an Admin submitted/imported on their behalf).
            // Mirrors Document::accessibleByPartner() — including its null guard, since
            // `partner_id = NULL` is never true and would silently shrink the scope to
            // "only what I submitted myself".
            $query->where(function (Builder $q) use ($user) {
                $q->where('submitted_by', $user->id);

                if ($user->partner_id !== null) {
                    $q->orWhere('partner_id', $user->partner_id);
                }
            });
        } elseif (str_starts_with($user->role, 'approver_')) {
            $query->whereHas('approvalSteps', fn ($q) => $q->where('approver_id', $user->id));
        }
        // Aviat roles (admin/super_admin/viewer) see all documents

        return $query;
    }

    /**
     * Apply the shared list filters. Split out of build() so the approval queue — which
     * has its own role scoping — can offer the same search/filter controls.
     *
     * @param  bool  $allowPartnerFilter  whether ?partner_id may narrow the result; on the
     *                                    documents list only Aviat roles may, but on the
     *                                    approval queue everyone already sees just their own.
     */
    public function applyFilters(Builder $query, Request $request, bool $allowPartnerFilter): Builder
    {
        // 1. Search across unique_id, link_id, project_code
        if ($search = $request->input('search')) {
            // `_` and `%` are LIKE wildcards; unique_ids look like "UC_KAL-KS-MTP-1150",
            // so an unescaped `_` would also match "UC-KAL…" and a bare `%` everything.
            $escaped = addcslashes($search, '%_\\');

            $query->where(function (Builder $q) use ($escaped) {
                $q->where('unique_id',    'ilike', "%{$escaped}%")
                  ->orWhere('link_id',      'ilike', "%{$escaped}%")
                  ->orWhere('project_code', 'ilike', "%{$escaped}%");
            });
        }

        // 2. Filter by partner
        if (($partnerId = $request->input('partner_id')) && $allowPartnerFilter) {
            $query->where('partner_id', $partnerId);
        }

        // 3. Filter by status code
        if ($statusCode = $request->input('status_code')) {
            $query->where('status_code', $statusCode);
        }

        // 4. Filter by SOW name
        if ($sowName = $request->input('sow_name')) {
            $query->where('sow_name', 'ilike', '%' . addcslashes($sowName, '%_\\') . '%');
        }

        // 5. Date range on date_atp_submission (NULLs naturally excluded)
        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('date_atp_submission', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('date_atp_submission', '<=', $dateTo);
        }

        // 6. Overdue deep-link filter (from dashboard "Perlu Perhatian" panel / stat card,
        // and the "Mendesak" chip on the approval queue) — same predicate as
        // DashboardController's overdue query.
        if ($request->input('filter') === 'overdue') {
            $query->whereHas('approvalSteps', fn (Builder $q) =>
                $q->where('is_active', true)
                  ->where('status', 'pending')
                  ->where('updated_at', '<', now()->subDays(7))
            );
        }

        return $query;
    }

    /**
     * Apply ?sort / ?dir — whitelisted, so neither can reach the SQL verbatim.
     */
    public function applySort(Builder $query, Request $request): Builder
    {
        $sort = in_array($request->input('sort'), self::SORTABLE)
            ? $request->input('sort')
            : 'created_at';
        $dir = $request->input('dir') === 'asc' ? 'asc' : 'desc';

        if ($sort === 'partner_name') {
            // Partner's name lives on a related table, not on documents — join instead
            // of orderByRaw. Select documents.* to avoid ambiguous/duplicate id columns.
            $query->leftJoin('partners', 'documents.partner_id', '=', 'partners.id')
                ->select('documents.*')
                ->orderBy('partners.name', $dir);
        } else {
            // NULLS LAST so drafts (e.g. null date_atp_submission/project_code) sink to bottom
            $query->orderByRaw("{$sort} {$dir} NULLS LAST");
        }

        return $query;
    }
}
