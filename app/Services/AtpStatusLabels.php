<?php

namespace App\Services;

class AtpStatusLabels
{
    private static array $labels = [
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
        '17'    => 'Punchlist Revision – On Review L1',
        'draft' => 'Draft',
    ];

    public static function label(string $code): ?string
    {
        return self::$labels[$code] ?? null;
    }
}
