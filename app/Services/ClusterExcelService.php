<?php

namespace App\Services;

use App\Models\Cluster;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class ClusterExcelService
{
    private const HEADINGS = ['Cluster', 'Province'];

    /**
     * Build a blank import template: header row + one example row.
     */
    public function template(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Clusters');

        $sheet->fromArray(self::HEADINGS, null, 'A1');
        $sheet->getStyle('A1:B1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
        ]);
        $sheet->fromArray(['CLUSTER-BKS-01', 'JAWA BARAT'], null, 'A2');

        foreach (['A', 'B'] as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $spreadsheet;
    }

    /**
     * Parse an uploaded Cluster/Province workbook and bulk-create new Cluster rows.
     * Rows missing either value, duplicated within the file, or already present in the
     * database (matched by the same "NAME (PROVINCE)" display_name) are skipped, not errored.
     *
     * @return array{created:int, skipped:int}
     */
    public function import(UploadedFile $file): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet       = $spreadsheet->getActiveSheet();

        $existing = Cluster::pluck('display_name')->flip(); // display_name => index, for O(1) lookup
        $seenInFile = [];
        $rows       = [];

        foreach ($sheet->getRowIterator(2) as $row) {
            $cells = $row->getCellIterator('A', 'B');
            $cells->setIterateOnlyExistingCells(false);

            $name     = trim((string) $cells->current()->getValue());
            $cells->next();
            $province = trim((string) $cells->current()->getValue());

            if ($name === '' || $province === '') {
                continue; // skip blank / incomplete rows
            }

            $displayName = Cluster::makeDisplayName($name, $province);

            if (isset($existing[$displayName]) || isset($seenInFile[$displayName])) {
                continue; // skip: already in DB, or duplicated within this file
            }

            $seenInFile[$displayName] = true;
            $rows[] = [
                'id'           => (string) Str::uuid7(),
                'name'         => mb_strtoupper($name),
                'province'     => mb_strtoupper($province),
                'display_name' => $displayName,
                'status'       => 'active',
                'created_at'   => now(),
                'updated_at'   => now(),
            ];
        }

        $totalRowsSeen = $sheet->getHighestDataRow() - 1; // minus header row
        $created       = count($rows);

        if ($created > 0) {
            Cluster::insert($rows);
        }

        return [
            'created' => $created,
            'skipped' => max($totalRowsSeen - $created, 0),
        ];
    }
}
