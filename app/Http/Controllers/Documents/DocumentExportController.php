<?php

namespace App\Http\Controllers\Documents;

use App\Http\Controllers\Controller;
use App\Services\DocumentExcelExport;
use App\Services\DocumentQueryService;
use App\Support\ExportFilterSummary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentExportController extends Controller
{
    // Aviat internal roles see everything; a partner may export too, but
    // DocumentQueryService::build() already scopes their rows to
    // submitted_by = user.id OR partner_id = user.partner_id.
    private const EXPORT_ROLES = ['admin', 'super_admin', 'viewer', 'partner'];

    public function __invoke(Request $request): StreamedResponse|RedirectResponse
    {
        $user = $request->user();

        abort_if(! in_array($user->role, self::EXPORT_ROLES), 403);

        // A partner always downloads their whole document list. They use the export as
        // a full recap, not as "save my current search", and the filters left in the
        // page's state (a stale search box especially) otherwise silently shrink the
        // file to a row or two without any hint that it happened.
        $exportRequest = $user->role === 'partner'
            ? Request::create($request->url(), 'GET')
            : $request;

        $query = (new DocumentQueryService)->build($exportRequest, $user);

        // Without this the browser silently saves a header-only .xlsx and the user has
        // no way to tell "no matching rows" apart from "the export is broken".
        if ((clone $query)->count() === 0) {
            return redirect()->back()->with(
                'error',
                'Tidak ada dokumen yang cocok' . ExportFilterSummary::describe($exportRequest, [
                    'search'      => 'pencarian',
                    'status_code' => 'status',
                    'sow_name'    => 'SOW',
                    'date_from'   => 'tanggal dari',
                    'date_to'     => 'tanggal sampai',
                ]) . '. Bersihkan filter lalu coba lagi.',
            );
        }

        $filename = 'documents_export_' . now()->format('Ymd_His') . '.xlsx';

        return response()->streamDownload(
            fn () => (new DocumentExcelExport)->stream($query),
            $filename,
            [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ],
        );
    }
}
