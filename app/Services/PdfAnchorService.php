<?php

namespace App\Services;

use Smalot\PdfParser\Parser;

class PdfAnchorService
{
    // Anchor keywords per role (case-insensitive search)
    private const ANCHOR_KEYWORDS = [
        'admin'                  => ['AVIAT', 'L1', 'APPROVER L1'],
        'approver_ms_bo'         => ['MS BO', 'APPROVER MS BO'],
        'approver_ms_rts'        => ['MS RTS', 'APPROVER MS RTS', 'Approved by MS RTS'],
        'approver_xls_rth_team'  => ['XLS RTH TEAM', 'RTH TEAM', 'Approved by XLS RTH TEAM'],
        'approver_xls_rth'       => ['XLS RTH', 'APPROVER XLS RTH', 'Approved by XLS RTH'],
    ];

    // Minimum chars for text-based PDF (not a scan)
    private const MIN_TEXT_LENGTH = 50;

    /**
     * Analyze page 1 of the given PDF for stamp anchor positions.
     *
     * @param  string  $pdfPath   Absolute filesystem path to the PDF
     * @param  array   $levels    Template levels array: [['level_order'=>2,'role'=>'approver_ms_rts',...], ...]
     * @return array   ['status' => 'auto'|'failed', 'positions' => array|null]
     */
    public function analyze(string $pdfPath, array $levels): array
    {
        try {
            $parser = new Parser();
            $pdf    = $parser->parseFile($pdfPath);
            $pages  = $pdf->getPages();

            if (empty($pages)) {
                return ['status' => 'failed', 'positions' => null];
            }

            $pageText = $pages[0]->getText();

            if (mb_strlen(trim($pageText)) < self::MIN_TEXT_LENGTH) {
                // PDF scan / image-only — cannot detect anchors
                return ['status' => 'failed', 'positions' => null];
            }

            $upperText = mb_strtoupper($pageText);
            $positions = [];
            $allFound  = true;

            foreach ($levels as $level) {
                $levelOrder = (int) ($level['level_order'] ?? 0);
                $role       = $level['role'] ?? '';

                if ($levelOrder <= 1) {
                    continue; // L1 has no stamp; skip
                }

                $keywords = self::ANCHOR_KEYWORDS[$role] ?? [];
                $found    = false;

                foreach ($keywords as $keyword) {
                    if (str_contains($upperText, mb_strtoupper($keyword))) {
                        $found = true;
                        break;
                    }
                }

                if (! $found) {
                    $allFound = false;
                    break;
                }

                // Approximate default positions (layout-based estimation)
                // Positions are in PDF user units (points), origin bottom-left
                // These are sensible defaults for a standard ATP template layout
                $col = ($levelOrder - 2) % 3;
                $positions["signature_l{$levelOrder}"] = [
                    'page'   => 1,
                    'x'      => 80 + ($col * 160),
                    'y'      => 120,
                    'width'  => 120,
                    'height' => 40,
                ];
            }

            if (! $allFound) {
                return ['status' => 'failed', 'positions' => null];
            }

            return ['status' => 'auto', 'positions' => $positions];

        } catch (\Throwable) {
            return ['status' => 'failed', 'positions' => null];
        }
    }
}
