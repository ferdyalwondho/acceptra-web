<?php

namespace App\Services;

use App\Models\Cluster;
use App\Models\ClusterApprover;
use App\Models\User;
use Illuminate\Support\Collection;

class ClusterApproverResolutionService
{
    // Single source of truth for which roles participate in cluster assignment —
    // referenced by ClusterController, UserController (via this service), and the
    // users:import command. L1/admin/partner/viewer are never cluster-based.
    public const APPROVER_ROLES = [
        'approver_ms_bo',
        'approver_ms_bo_team',
        'approver_ms_rts',
        'approver_xls_rth_team',
        'approver_xls_rth',
        'approver_sme',
    ];

    public const ROLE_LABELS = [
        'approver_ms_bo'        => 'MS BO',
        'approver_ms_bo_team'   => 'MS BO Team',
        'approver_ms_rts'       => 'MS RTS',
        'approver_xls_rth_team' => 'RTH Team',
        'approver_xls_rth'      => 'RTH',
        'approver_sme'          => 'SME',
    ];

    /**
     * The active user currently holding the (cluster, role) slot, if any.
     * $clusterDisplayName is the "NAME (PROVINCE)" identifier (Cluster::makeDisplayName()).
     */
    public static function findActiveApprover(string $clusterDisplayName, string $role): ?User
    {
        $cluster = Cluster::where('display_name', $clusterDisplayName)->first();
        if (! $cluster) {
            return null;
        }

        return ClusterApprover::activeHolder()
            ->where('cluster_id', $cluster->id)
            ->where('role', $role)
            ->with('user')
            ->first()
            ?->user;
    }

    /**
     * Resolve approver_id per level_order for every level > 1 in $levels.
     *
     * Returns ['resolved' => [level_order => user_id], 'missing' => [level_order => role]].
     */
    public static function resolveForLevels(string $clusterDisplayName, Collection $levels): array
    {
        $resolved = [];
        $missing  = [];

        foreach ($levels as $level) {
            $approver = self::findActiveApprover($clusterDisplayName, $level->role);

            if ($approver) {
                $resolved[$level->level_order] = $approver->id;
            } else {
                $missing[$level->level_order] = $level->role;
            }
        }

        return [$resolved, $missing];
    }

    /**
     * Clusters where the (cluster, role) slot is currently open — i.e. no active user
     * holds it — plus, when $excludeUserId is given, clusters already held by that user
     * (so their own existing picks remain visible/selected on the Edit form).
     */
    public static function availableClustersForRole(string $role, ?string $excludeUserId = null): Collection
    {
        $takenClusterIds = ClusterApprover::activeHolder()
            ->where('role', $role)
            ->when($excludeUserId, fn ($q) => $q->where('user_id', '!=', $excludeUserId))
            ->pluck('cluster_id');

        return Cluster::where('status', 'active')
            ->whereNotIn('id', $takenClusterIds)
            ->orderBy('name')
            ->get(['id', 'name', 'province', 'display_name']);
    }

    /**
     * Assign the given user as PIC for each selected cluster, only for approver roles.
     * Re-verifies each slot is still open at write time (race-condition guard) — silently
     * skips clusters that got taken in the meantime rather than failing the whole request.
     *
     * Returns ['assigned' => [cluster_id...], 'skipped_taken' => [cluster_id...]] so callers
     * (e.g. bulk-import commands) can report exactly what happened per row.
     */
    public static function assignClusters(User $user, string $role, array $clusterIds): array
    {
        if (empty($clusterIds) || ! in_array($role, self::APPROVER_ROLES)) {
            return ['assigned' => [], 'skipped_taken' => []];
        }

        $openClusterIds = self::availableClustersForRole($role)->pluck('id')->all();
        $assigned       = array_values(array_intersect($clusterIds, $openClusterIds));
        $skippedTaken   = array_values(array_diff($clusterIds, $openClusterIds));

        foreach ($assigned as $clusterId) {
            ClusterApprover::create([
                'cluster_id' => $clusterId,
                'role'       => $role,
                'user_id'    => $user->id,
            ]);
        }

        return ['assigned' => $assigned, 'skipped_taken' => $skippedTaken];
    }
}
