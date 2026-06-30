<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class UniqueIdService
{
    /**
     * Generate the next ACC-{YYYY}-{NNNN} unique_id.
     *
     * Must be called within the same DB::transaction that INSERTs the document,
     * using lockForUpdate() to prevent race conditions on concurrent submissions.
     */
    public function generate(int $year): string
    {
        $prefix = "ACC-{$year}-";

        $last = DB::table('documents')
            ->where('unique_id', 'like', "{$prefix}%")
            ->lockForUpdate()
            ->orderByDesc('unique_id')
            ->value('unique_id');

        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
