<?php

namespace App\Http\Controllers\Documents;

use App\Http\Controllers\Controller;
use App\Services\DocumentExcelExport;
use App\Services\DocumentQueryService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentExportController extends Controller
{
    private const AVIAT_ROLES = ['admin', 'super_admin', 'viewer'];

    public function __invoke(Request $request): StreamedResponse
    {
        abort_if(! in_array($request->user()->role, self::AVIAT_ROLES), 403);

        $query    = (new DocumentQueryService)->build($request, $request->user());
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
