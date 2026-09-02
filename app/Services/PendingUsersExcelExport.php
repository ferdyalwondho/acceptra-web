<?php

namespace App\Services;

use App\Http\Controllers\Users\UserController;
use Illuminate\Database\Eloquent\Builder;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class PendingUsersExcelExport
{
    private const HEADINGS = [
        'Name', 'Email', 'Role', 'Partner',
        'Invited At', 'Invitation Expires At', 'Status',
    ];

    /**
     * Stream an .xlsx of not-yet-activated users to PHP output using a chunked
     * Eloquent query. The caller is responsible for setting response headers.
     */
    public function stream(Builder $query): void
    {
        $roleLabels = collect(UserController::ROLES)->pluck('label', 'value');

        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Pending Users');

        $sheet->fromArray(self::HEADINGS, null, 'A1');

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
        ];
        $sheet->getStyle('A1:G1')->applyFromArray($headerStyle);

        foreach (range('A', 'G') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $rowIndex = 2;
        $query->chunk(500, function ($users) use ($sheet, &$rowIndex, $roleLabels) {
            foreach ($users as $user) {
                $row = [
                    $user->name,
                    $user->email,
                    $roleLabels[$user->role] ?? $user->role,
                    $user->partner?->name,
                    $user->created_at?->format('d M Y H:i'),
                    $user->invitation_expires_at?->format('d M Y H:i'),
                    $user->status,
                ];

                $sheet->fromArray($row, null, "A{$rowIndex}");
                $rowIndex++;
            }
        });

        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
    }
}
