<?php

namespace App\Http\Controllers\Clusters;

use App\Http\Controllers\Controller;
use App\Models\Cluster;
use App\Models\ClusterApprover;
use App\Models\Template;
use App\Services\ClusterApproverResolutionService;
use App\Services\ClusterExcelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClusterController extends Controller
{
    private const ADMIN_ROLES = ['admin', 'super_admin'];

    // Source of truth lives on ClusterApproverResolutionService (shared with UserController
    // and the users:import command) — aliased here so existing self::-based usages below
    // don't need to change.
    public const APPROVER_ROLES = ClusterApproverResolutionService::APPROVER_ROLES;
    private const ROLE_LABELS   = ClusterApproverResolutionService::ROLE_LABELS;

    // GET /clusters — matrix cluster x role -> approver aktif saat ini
    public function index(Request $request): Response
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $clusters = Cluster::where('status', 'active')->orderBy('name')->get();

        $activeApprovers = ClusterApprover::activeHolder()
            ->whereIn('cluster_id', $clusters->pluck('id'))
            ->with('user:id,name')
            ->get()
            ->groupBy('cluster_id');

        $matrix = $clusters->map(function (Cluster $cluster) use ($activeApprovers) {
            $rowApprovers = $activeApprovers->get($cluster->id, collect());

            return [
                'id'        => $cluster->id,
                'name'      => $cluster->name,
                'province'  => $cluster->province,
                'approvers' => collect(self::ROLE_LABELS)->mapWithKeys(fn ($label, $role) => [
                    $role => $rowApprovers->firstWhere('role', $role)?->user?->name,
                ]),
            ];
        })->values();

        if ($search = trim((string) $request->input('search'))) {
            $needle = mb_strtolower($search);
            $matrix = $matrix->filter(function (array $row) use ($needle) {
                if (str_contains(mb_strtolower($row['name']), $needle)) return true;
                if (str_contains(mb_strtolower($row['province']), $needle)) return true;

                foreach ($row['approvers'] as $approverName) {
                    if ($approverName && str_contains(mb_strtolower($approverName), $needle)) return true;
                }

                return false;
            })->values();
        }

        // Sorting — whitelist prevents arbitrary field access; done in-memory since $matrix
        // is a plain collection (built from a role-breakdown map, not a query builder).
        $sortableColumns = ['name', 'province'];
        $sort = in_array($request->input('sort'), $sortableColumns) ? $request->input('sort') : 'name';
        $dir  = $request->input('dir') === 'desc' ? 'desc' : 'asc';

        $matrix = $dir === 'desc'
            ? $matrix->sortByDesc($sort)->values()
            : $matrix->sortBy($sort)->values();

        // Paginate the already filtered+sorted in-memory collection (no Eloquent
        // paginate() available at this point — mirrors it manually with LengthAwarePaginator).
        $perPage     = 10;
        $currentPage = LengthAwarePaginator::resolveCurrentPage();
        $paginated   = new LengthAwarePaginator(
            $matrix->forPage($currentPage, $perPage)->values(),
            $matrix->count(),
            $perPage,
            $currentPage,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return Inertia::render('Clusters/Index', [
            'clusters'    => $paginated,
            'role_labels' => self::ROLE_LABELS,
            'filters'     => ['search' => $request->input('search'), 'sort' => $sort, 'dir' => $dir],
        ]);
    }

    // POST /clusters — tambah cluster baru (Nama + Province)
    public function store(Request $request): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:150'],
            'province' => ['required', 'string', 'max:100'],
        ], [
            'name.required'     => 'Nama cluster wajib diisi.',
            'province.required' => 'Province wajib diisi.',
        ]);

        $displayName = Cluster::makeDisplayName($validated['name'], $validated['province']);

        if (Cluster::where('display_name', $displayName)->exists()) {
            return back()->withErrors(['name' => 'Cluster ini dengan Province tersebut sudah ada.'])->withInput();
        }

        Cluster::create([
            'name'         => mb_strtoupper(trim($validated['name'])),
            'province'     => mb_strtoupper(trim($validated['province'])),
            'display_name' => $displayName,
            'status'       => 'active',
        ]);

        return redirect()->route('clusters.index')->with('status', 'Cluster berhasil ditambahkan.');
    }

    // GET /clusters/template — download template Excel (Cluster, Province)
    public function downloadTemplate(Request $request): StreamedResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $filename = 'cluster_import_template.xlsx';

        return response()->streamDownload(
            function () {
                $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx((new ClusterExcelService)->template());
                $writer->save('php://output');
            },
            $filename,
            [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ],
        );
    }

    // POST /clusters/import — bulk import cluster dari Excel
    public function import(Request $request): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, self::ADMIN_ROLES), 403);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
        ], [
            'file.required' => 'File Excel wajib diupload.',
            'file.mimes'    => 'File harus berformat .xlsx atau .xls.',
            'file.max'      => 'Ukuran file maksimal 10MB.',
        ]);

        $result = (new ClusterExcelService)->import($validated['file']);

        return redirect()->route('clusters.index')->with(
            'status',
            "{$result['created']} cluster ditambahkan, {$result['skipped']} dilewati (sudah ada / tidak lengkap)."
        );
    }

    // GET /api/clusters/resolve?cluster=NAME&template_id=ID — preview approver hasil resolve
    public function resolvePreview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cluster'     => ['required', 'string'],
            'template_id' => ['required', 'uuid'],
        ]);

        $template = Template::with('levels')->find($validated['template_id']);
        if (! $template) {
            return response()->json(['data' => []]);
        }

        $levels = $template->levels->where('level_order', '>', 1)->values();
        [$resolved, $missing] = ClusterApproverResolutionService::resolveForLevels($validated['cluster'], $levels);

        $users = \App\Models\User::whereIn('id', array_values($resolved))->get(['id', 'name'])->keyBy('id');

        $data = $levels->map(fn ($level) => [
            'level_order' => $level->level_order,
            'role'        => $level->role,
            'role_label'  => self::ROLE_LABELS[$level->role] ?? $level->role,
            'approver'    => isset($resolved[$level->level_order])
                ? ['id' => $resolved[$level->level_order], 'name' => $users->get($resolved[$level->level_order])?->name]
                : null,
        ])->values();

        return response()->json(['data' => $data, 'complete' => empty($missing)]);
    }

    // GET /api/clusters/available?role=X&user_id=Y — cluster yang slotnya masih kosong untuk role tsb
    public function availableForRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role'    => ['required', 'string', Rule::in(self::APPROVER_ROLES)],
            'user_id' => ['nullable', 'uuid'],
        ]);

        $clusters = ClusterApproverResolutionService::availableClustersForRole(
            $validated['role'],
            $validated['user_id'] ?? null,
        );

        return response()->json(['data' => $clusters]);
    }
}
