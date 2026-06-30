<?php

namespace App\Notifications\Concerns;

use Illuminate\Support\HtmlString;

trait HasDocumentInfoTable
{
    private static array $statusLabels = [
        '01'    => 'Submit & On Review L1',
        '02'    => 'L1 Rejected – Need Rectification',
        '03'    => 'Done Rectification – On Review L1',
        '04'    => 'L1 Approve – On Review L2',
        '05'    => 'L2 Rejected – Need Rectification',
        '06'    => 'Done Rectification – On Review L2',
        '07'    => 'L2 Approve – On Review L3',
        '08'    => 'L3 Rejected – Need Rectification',
        '09'    => 'Done Rectification – On Review L3',
        '10'    => 'L3 Approve – On Review L4',
        '11'    => 'L4 Rejected – Need Rectification',
        '12'    => 'Done Rectification – On Review L4',
        '13'    => 'ATP Done – All Approver Approve',
        '14'    => 'ATP Done with Punchlist – Need Rectification',
        '15'    => 'Punchlist Revised – Waiting Verification',
        '16'    => 'Closed – Punchlist Verified',
        'draft' => 'Draft',
    ];

    /**
     * Generate an inline-CSS HTML table for document metadata.
     *
     * @param  array<int, array{label: string, value: string}>  $extraRows
     * @param  bool  $extended  When true, adds Link ID, Link Name, and Status rows.
     */
    protected function documentInfoTable(array $extraRows = [], bool $extended = false): HtmlString
    {
        $baseRows = [
            ['label' => 'Document ID', 'value' => $this->document->unique_id],
            ['label' => 'PT Index',    'value' => $this->document->pt_index],
            ['label' => 'SOW',         'value' => $this->document->sow_name],
        ];

        if ($extended) {
            $baseRows[] = ['label' => 'Link ID',   'value' => $this->document->link_id   ?? '—'];
            $baseRows[] = ['label' => 'Link Name', 'value' => $this->document->link_name ?? '—'];
            $statusCode  = $this->document->status_code ?? '';
            $baseRows[] = [
                'label' => 'Status',
                'value' => self::$statusLabels[$statusCode] ?? $statusCode,
            ];
        }

        $rows     = array_merge($baseRows, $extraRows);
        $rowCount = count($rows);
        $rowsHtml = '';

        foreach ($rows as $i => $row) {
            $isLast       = ($i === $rowCount - 1);
            $borderBottom = $isLast ? '' : 'border-bottom:1px solid #D1D5DB;';
            $label        = htmlspecialchars($row['label'],       ENT_QUOTES, 'UTF-8');
            $value        = htmlspecialchars($row['value'] ?? '', ENT_QUOTES, 'UTF-8');

            $rowsHtml .= <<<HTML
            <tr>
              <td style="padding:8px 16px;font-size:13px;font-weight:600;color:#374151;width:140px;background:#F9FAFB;border-right:1px solid #D1D5DB;{$borderBottom}">
                {$label}
              </td>
              <td style="padding:8px 16px;font-size:13px;color:#111827;background:#FFFFFF;{$borderBottom}">
                {$value}
              </td>
            </tr>
            HTML;
        }

        $html = <<<HTML
        <table cellpadding="0" cellspacing="0" role="presentation"
               style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #D1D5DB;">
          <thead>
            <tr>
              <td colspan="2"
                  style="padding:8px 16px;font-size:11px;font-weight:700;color:#325F7D;
                         letter-spacing:0.06em;text-transform:uppercase;
                         background:#EEF3F7;border-bottom:1px solid #D1D5DB;">
                Document Information
              </td>
            </tr>
          </thead>
          <tbody>
            {$rowsHtml}
          </tbody>
        </table>
        HTML;

        return new HtmlString($html);
    }
}
