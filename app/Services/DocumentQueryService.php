<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DocumentQueryService
{
    private const AVIAT_ROLES = ['admin', 'super_admin', 'viewer'];

    private const SORTABLE = ['created_at', 'date_atp_submission', 'status_code', 'unique_id'];

    /**
     * Build a filtered, scoped, and sorted query for documents.
     * Does NOT apply pagination or eager-loads — callers add those.
     */
    public function build(Request $request, User $user): Builder
    {
        $query = Document::query();

        // 1. Role scoping
        if ($user->role === 'partner') {
            $query->where('submitted_by', $user->id);
        } elseif (str_starts_with($user->role, 'approver_')) {
            $query->whereHas('approvalSteps', fn ($q) => $q->where('approver_id', $user->id));
        }
        // Aviat roles (admin/super_admin/viewer) see all documents

        // 2. Search across unique_id, link_id, project_code
        if ($search = $request->input('search')) {
            $query->where(function (Builder $q) use ($search) {
                $q->where('unique_id',    'ilike', "%{$search}%")
                  ->orWhere('link_id',      'ilike', "%{$search}%")
                  ->orWhere('project_code', 'ilike', "%{$search}%");
            });
        }

        // 3. Filter by partner (Aviat roles only)
        if ($partnerId = $request->input('partner_id')) {
            if (in_array($user->role, self::AVIAT_ROLES)) {
                $query->where('partner_id', $partnerId);
            }
        }

        // 4. Filter by status code
        if ($statusCode = $request->input('status_code')) {
            $query->where('status_code', $statusCode);
        }

        // 5. Filter by SOW name
        if ($sowName = $request->input('sow_name')) {
            $query->where('sow_name', 'ilike', "%{$sowName}%");
        }

        // 6. Date range on date_atp_submission (NULLs naturally excluded)
        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('date_atp_submission', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('date_atp_submission', '<=', $dateTo);
        }

        // 7. Sorting — whitelist prevents SQL injection
        $sort = in_array($request->input('sort'), self::SORTABLE)
            ? $request->input('sort')
            : 'created_at';
        $dir = $request->input('dir') === 'asc' ? 'asc' : 'desc';

        // NULLS LAST so drafts (null date_atp_submission) sink to bottom
        $query->orderByRaw("{$sort} {$dir} NULLS LAST");

        return $query;
    }
}
