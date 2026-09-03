<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Turns the filters carried by an export request into a short Indonesian phrase, so an
 * export that matches nothing can say *why* instead of handing back an empty workbook.
 */
class ExportFilterSummary
{
    /**
     * @param  array<string, string>  $labels  request key => human label, in display order
     * @return string  e.g. ` dengan filter saat ini (pencarian: "Choi", role: partner)`,
     *                 or an empty string when no listed filter is active
     */
    public static function describe(Request $request, array $labels): string
    {
        $parts = [];

        foreach ($labels as $key => $label) {
            if (filled($value = $request->input($key))) {
                $parts[] = $label . ': "' . $value . '"';
            }
        }

        return $parts === [] ? '' : ' dengan filter saat ini (' . implode(', ', $parts) . ')';
    }
}
