<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class DocumentExcelExport
{
    private const HEADINGS = [
        'Unique ID', 'Project Code', 'Link ID', 'SOW', 'Partner',
        'Submitted At', 'Status Overall',
        'L1 Status', 'L1 Approver', 'L1 Date',
        'L2 Status', 'L2 Approver', 'L2 Date', 'L2 Notes',
        'L3 Status', 'L3 Approver', 'L3 Date', 'L3 Notes',
        'L4 Status', 'L4 Approver', 'L4 Date', 'L4 Notes',
    ];

    /**
     * Stream an .xlsx to PHP output using chunked Eloquent query.
     * The caller is responsible for setting response headers.
     */
    public function stream(Builder $query): void
    {
        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Documents');

        // Write header row
        $sheet->fromArray(self::HEADINGS, null, 'A1');

        // Style header row
        $headerStyle = [
            'font'    => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
        ];
        $sheet->getStyle('A1:V1')->applyFromArray($headerStyle);

        // Auto-width for all columns
        foreach (range('A', 'V') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Write data rows using Eloquent chunk to avoid loading all into memory
        $rowIndex = 2;
        $query
            ->with(['partner', 'approvalSteps.approver'])
            ->chunk(500, function ($documents) use ($sheet, &$rowIndex) {
                foreach ($documents as $doc) {
                    $steps = $doc->approvalSteps->keyBy('level_order');

                    $row = [
                        $doc->unique_id,
                        $doc->project_code,
                        $doc->link_id,
                        $doc->sow_name,
                        $doc->partner?->name,
                        $doc->date_atp_submission?->format('d M Y') ?? $doc->created_at->format('d M Y'),
                        $doc->status_code,
                    ];

                    // L1 — no Notes column
                    $l1 = $steps->get(1);
                    $row[] = $l1?->status;
                    $row[] = $l1?->approver?->name ?? $l1?->offline_approver_name;
                    $row[] = $l1?->action_at?->format('d M Y') ?? $l1?->offline_date?->format('d M Y');

                    // L2–L4 — includes Notes column
                    foreach ([2, 3, 4] as $level) {
                        $step   = $steps->get($level);
                        $row[] = $step?->status;
                        $row[] = $step?->approver?->name ?? $step?->offline_approver_name;
                        $row[] = $step?->action_at?->format('d M Y') ?? $step?->offline_date?->format('d M Y');
                        $row[] = $step?->punchlist_notes;
                    }

                    $sheet->fromArray($row, null, "A{$rowIndex}");
                    $rowIndex++;
                }
            });

        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
    }
}
