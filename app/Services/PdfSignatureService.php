<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Signature;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Fpdi;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PdfSignatureService
{
    /**
     * Coordinates in template_snapshot are saved at this PDF.js viewport scale.
     * Must match SAVE_SCALE in the PlacementPanel component (resources/js/Pages/Documents/Show.tsx).
     */
    private const SAVE_SCALE = 1.4;

    /**
     * Extra margin (points) added around a placement box's own bounds before filling it
     * white. An admin's dragged box in the editor is a human-eyeballed approximation, not
     * a pixel-exact measurement of whatever's underneath it on the original page (e.g. a
     * template's own pre-printed name) — a small safety margin keeps a slightly-too-small
     * or slightly-offset box from leaving a sliver of old content visible at its edge.
     * Kept small deliberately — boxes are often placed right up against a table cell's own
     * border lines, and too much padding paints over those borders instead of just the
     * stray content next to them.
     */
    private const FILL_PADDING = 1.5;

    /**
     * Stream a PDF with signatures embedded.
     * Generates and caches to documents/final/{id}.pdf (on the default disk) on first call.
     * Falls back to the original PDF on any error.
     */
    public function streamPdf(Document $document): StreamedResponse
    {
        if (! $document->original_pdf_path || ! Storage::exists($document->original_pdf_path)) {
            abort(404, 'PDF not found.');
        }

        if (! $document->final_pdf_path || ! Storage::exists($document->final_pdf_path)) {
            try {
                $this->generateAndUpload($document);
            } catch (\Throwable $e) {
                // Fall through — the key resolution below falls back to the original —
                // but log it, otherwise a stamping failure looks identical to "nothing to
                // stamp yet" from the outside and silently keeps serving the original PDF
                // on every request. Logging itself must never be able to turn a recoverable
                // generation failure into a hard 500 (e.g. a misconfigured/unwritable log
                // file throwing from within Monolog) — swallow that too.
                try {
                    Log::error('PdfSignatureService: final PDF generation failed', [
                        'document_id' => $document->id,
                        'exception'   => $e->getMessage(),
                    ]);
                } catch (\Throwable) {
                    // Nothing more we can do here — the PDF still falls back to the
                    // original below either way.
                }
            }
        }

        $key = ($document->final_pdf_path && Storage::exists($document->final_pdf_path))
            ? $document->final_pdf_path
            : $document->original_pdf_path;

        return Storage::response($key, self::buildDownloadFilename($document), ['Content-Type' => 'application/pdf']);
    }

    /**
     * Serve original_pdf_path through the exact same source-resolution generateAndUpload()
     * uses before stamping (resolveFpdiSource) — the placement editor's preview must match
     * that byte-for-byte, or an admin can drag a box to a position that looks correct in
     * preview but lands in the wrong place (or a Ghostscript-normalized copy the final
     * stamp never actually uses) once the final PDF is generated.
     */
    public function streamNormalizedOriginal(Document $document): \Illuminate\Http\Response
    {
        if (! $document->original_pdf_path || ! Storage::exists($document->original_pdf_path)) {
            abort(404, 'PDF not found.');
        }

        $tempInput    = tempnam(sys_get_temp_dir(), 'acc_orig_');
        $tempParsable = null;

        try {
            file_put_contents($tempInput, Storage::get($document->original_pdf_path));
            $tempParsable = $this->resolveFpdiSource($tempInput);
            $bytes        = file_get_contents($tempParsable);
        } finally {
            @unlink($tempInput);
            if ($tempParsable) {
                @unlink($tempParsable);
            }
        }

        return response($bytes, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="original.pdf"',
        ]);
    }

    /**
     * AVIAT_ATP_[SOW_NAME]_[LINK_ID]_[PROJECT_CODE]_[PT_INDEX].pdf — sanitized so every
     * segment is filesystem-safe; missing nullable fields fall back to "NA".
     */
    public static function buildDownloadFilename(Document $document, string $suffix = ''): string
    {
        $segment = function (?string $value): string {
            $value = trim((string) $value);
            if ($value === '') {
                return 'NA';
            }

            $value = preg_replace('/\s+/', '_', $value);

            return preg_replace('/[^A-Za-z0-9_-]/', '', $value) ?: 'NA';
        };

        $parts = [
            $segment($document->sow_name),
            $segment($document->link_id),
            $segment($document->project_code),
            $segment($document->pt_index),
        ];

        return 'AVIAT_ATP_' . implode('_', $parts) . $suffix . '.pdf';
    }

    /**
     * Ghostscript normalizes compressed/linearized PDFs to a format
     * that the free FPDI parser can handle (PDF 1.4 compatible output).
     */
    private function decompressPdf(string $inputPath): string
    {
        $outputPath = sys_get_temp_dir() . '/acceptra_' . md5($inputPath) . '_plain.pdf';

        $cmd = sprintf(
            'gs -dNOCACHE -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 '
            . '-dNOPAUSE -dBATCH -dQUIET '
            . '-sOutputFile=%s %s 2>/dev/null',
            escapeshellarg($outputPath),
            escapeshellarg($inputPath)
        );

        exec($cmd, $out, $exit);

        if ($exit !== 0 || ! file_exists($outputPath)) {
            throw new \RuntimeException('Ghostscript decompression failed.');
        }

        return $outputPath;
    }

    /**
     * Resolves to whichever local temp file FPDI can actually read page geometry from —
     * a Ghostscript-normalized copy of the original, or the raw file itself only if
     * Ghostscript can't process it at all. This is only ever used to read a page's
     * dimensions (readPageOneSize()) or preview it in the browser (streamNormalizedOriginal()) —
     * generateAndUpload() no longer has FPDI import/re-export the original's own page
     * content (that used to be able to silently drop embedded resources, e.g. a scanned
     * offline-approval signature's image encoding, with no exception thrown; see
     * buildOverlay()/mergeOverlay() for how stamping avoids that now). Coordinate accuracy
     * is NOT a reason to prefer the raw file either — that was traced to the placement
     * editor's canvas being CSS-rescaled, independent of which source this resolves to.
     *
     * Walks every page (import + template size + place), not just setSourceFile() — some
     * PDFs parse their xref table fine but fail later on a specific page's content stream,
     * and testing setSourceFile() alone would wrongly call those "parsable".
     */
    private function resolveFpdiSource(string $rawInputPath): string
    {
        try {
            $normalized = $this->decompressPdf($rawInputPath);

            $pdf       = new Fpdi('P', 'pt');
            $pageCount = $pdf->setSourceFile($normalized);

            for ($p = 1; $p <= $pageCount; $p++) {
                $tplId = $pdf->importPage($p);
                $size  = $pdf->getTemplateSize($tplId);
                $pdf->AddPage('P', [$size['width'], $size['height']]);
                $pdf->useTemplate($tplId, 0, 0, $size['width'], $size['height']);
            }

            return $normalized;
        } catch (\Throwable) {
            return $rawInputPath;
        }
    }

    /**
     * Download original_pdf_path from the default disk, embed signatures/stamps,
     * and upload the result back to the default disk as documents/final/{id}.pdf.
     * No-op if no placement positions are configured or no signatures exist yet.
     *
     * Stamps are built as a *separate* overlay PDF (buildOverlay(), plain FPDF — no
     * import involved) and merged onto the untouched original via qpdf (mergeOverlay()),
     * rather than having FPDI import the original page as a template and draw on top of
     * it. FPDI's free parser can silently drop embedded resources (e.g. a scanned
     * offline-approval signature's particular image encoding) when re-exporting an
     * imported page — with no exception, so the previous approach could quietly lose
     * that content on any given document. qpdf never re-parses/re-encodes the original's
     * own page content, so it can't lose anything from it — it only adds the overlay on top.
     */
    private function generateAndUpload(Document $document): void
    {
        $document->loadMissing(['approvalSteps.approver', 'approvalSteps.signature']);

        $placement = $document->template_snapshot['placement'] ?? [];
        $positions = $placement['positions'] ?? [];

        if (empty($positions)) {
            return;
        }

        $hasAny = $document->approvalSteps->contains(
            fn ($s) => $s->signature_id !== null
        );
        if (! $hasAny) {
            return;
        }

        // tempnam() already creates the file — don't append an extension onto a
        // separate path string, or the original tempnam()-created file becomes an
        // orphan that never gets cleaned up.
        $tempInput     = tempnam(sys_get_temp_dir(), 'acc_orig_');
        $tempParsable  = null;
        $tempFlattened = null;
        $tempOverlay   = null;
        $tempOutput    = null;

        try {
            file_put_contents($tempInput, Storage::get($document->original_pdf_path));

            // Only used to read page 1's dimensions for sizing the overlay — never to
            // re-export its content, so resolveFpdiSource()'s Ghostscript-vs-raw choice
            // has no bearing on image fidelity here (that risk was only in the old
            // import+useTemplate approach, which this no longer does).
            $tempParsable         = $this->resolveFpdiSource($tempInput);
            [$pageWidth, $pageHeight] = $this->readPageOneSize($tempParsable);

            $tempOverlay = $this->buildOverlay($document, $positions, $pageWidth, $pageHeight);

            // Some source PDFs (e.g. this app's own "Submit Ongoing" scanned uploads, or
            // templates authored with a form tool) carry their pre-printed reference text
            // as PDF annotations (FreeText/Widget) rather than plain page content.
            // Annotations render in their own layer, on top of the page's content streams
            // — our overlay's white-fill masking, which only affects content streams,
            // can't cover them no matter how precisely the placement box is positioned.
            // Flattening merges annotations into regular content first so they're subject
            // to the same masking as everything else.
            $tempFlattened = $this->flattenAnnotations($tempInput);

            // Merge onto the flattened original, not the Ghostscript-normalized copy —
            // qpdf reads/writes standard and non-standard PDFs natively, and skipping an
            // unnecessary Ghostscript pass here avoids re-encoding the original at all.
            $tempOutput = $this->mergeOverlay($tempFlattened, $tempOverlay);

            $relPath = "documents/final/{$document->id}.pdf";
            Storage::put($relPath, file_get_contents($tempOutput));

            $document->update(['final_pdf_path' => $relPath]);
        } finally {
            @unlink($tempInput);
            if ($tempParsable) {
                @unlink($tempParsable);
            }
            if ($tempFlattened) {
                @unlink($tempFlattened);
            }
            if ($tempOverlay) {
                @unlink($tempOverlay);
            }
            if ($tempOutput) {
                @unlink($tempOutput);
            }
        }
    }

    /**
     * Reads page 1's width/height (in points) from an already-FPDI-parsable source.
     * A lightweight structural read (MediaBox only) — not the "import all resources"
     * step that's unreliable for images, so it's safe even on documents buildOverlay()
     * will later need qpdf (not FPDI) to actually merge onto.
     */
    private function readPageOneSize(string $sourcePath): array
    {
        $pdf   = new Fpdi('P', 'pt');
        $pdf->setSourceFile($sourcePath);
        $tplId = $pdf->importPage(1);
        $size  = $pdf->getTemplateSize($tplId);

        return [(float) $size['width'], (float) $size['height']];
    }

    /**
     * Builds a standalone overlay PDF (page 1 only, sized to match the original) holding
     * just the stamp content — no original page content is imported into it at all, so
     * there's nothing for FPDI to lose. Returns the local temp path; caller unlinks it.
     */
    private function buildOverlay(Document $document, array $positions, float $pageWidth, float $pageHeight): string
    {
        $tempSigFiles = [];

        try {
            $pdf = new Fpdi('P', 'pt', [$pageWidth, $pageHeight]);
            $pdf->AddPage('P', [$pageWidth, $pageHeight]);
            $pdf->SetFillColor(255, 255, 255);

            // Resolve every box down to "will this actually draw anything, and with what
            // data" up front — a box with nothing to draw (e.g. an empty punchlist field)
            // must never get masked either, or it'd blank out whatever's already printed
            // there on the original page for no reason.
            $planned = [];
            foreach ($positions as $key => $pos) {
                if ((int) ($pos['page'] ?? 1) !== 1) {
                    continue; // only page 1 is ever placed onto today
                }

                // Convert from viewer-px-at-SAVE_SCALE to PDF points (same top-left origin)
                $x = $pos['x']      / self::SAVE_SCALE;
                $y = $pos['y']      / self::SAVE_SCALE;
                $w = $pos['width']  / self::SAVE_SCALE;
                $h = $pos['height'] / self::SAVE_SCALE;

                // Key format: "{level_order}_sig" / "{level_order}_name", or
                // "doc_{type}" for document-level fields (not tied to a level).
                [$levelStr, $type] = explode('_', $key, 2);

                if ($levelStr === 'doc') {
                    $text = $this->resolveDocumentFieldText($document, $type);
                    if ($text === null || $text === '') {
                        continue;
                    }
                    $planned[] = ['kind' => 'doc', 'x' => $x, 'y' => $y, 'w' => $w, 'h' => $h, 'type' => $type, 'text' => $text];
                    continue;
                }

                $level = (int) $levelStr;
                $step  = $document->approvalSteps->firstWhere('level_order', $level);

                if (! $step) {
                    continue;
                }

                if ($type === 'sig' && $step->signature_id) {
                    $sig = $step->signature ?? Signature::find($step->signature_id);
                    if (! $sig || ! Storage::exists($sig->image_path)) {
                        continue;
                    }

                    $planned[] = ['kind' => 'sig', 'x' => $x, 'y' => $y, 'w' => $w, 'h' => $h, 'sig' => $sig];

                } elseif ($type === 'name' && $step->approver) {
                    $planned[] = ['kind' => 'name', 'x' => $x, 'y' => $y, 'w' => $w, 'h' => $h, 'step' => $step];
                }
            }

            // Pass 1: mask every planned box first, all of them, before drawing any
            // content. Whatever's underneath (a template's own pre-printed reference
            // text, or a neighboring box's content) is fully white before a single
            // signature or character gets drawn — no ordering dependency between boxes,
            // so one box's fill can never partially erase another's already-drawn content.
            foreach ($planned as $box) {
                $this->fillBoxWithPadding($pdf, $box['x'], $box['y'], $box['w'], $box['h']);
            }

            // Pass 2: draw every planned box's actual content onto the now fully-masked page.
            foreach ($planned as $box) {
                ['x' => $x, 'y' => $y, 'w' => $w, 'h' => $h] = $box;

                if ($box['kind'] === 'doc') {
                    $this->drawDocumentField($pdf, $box['type'], $box['text'], $x, $y, $w, $h);
                    continue;
                }

                if ($box['kind'] === 'sig') {
                    $sig     = $box['sig'];
                    $ext     = strtolower(pathinfo($sig->image_path, PATHINFO_EXTENSION));
                    $sigTemp = tempnam(sys_get_temp_dir(), 'acc_sig_');
                    file_put_contents($sigTemp, Storage::get($sig->image_path));
                    $tempSigFiles[] = $sigTemp;

                    $imgType = match ($ext) {
                        'jpg', 'jpeg' => 'JPEG',
                        'gif'         => 'GIF',
                        default       => 'PNG',
                    };

                    $pdf->Image($sigTemp, $x, $y, $w, $h, $imgType);

                    continue;
                }

                // 'name'
                $step     = $box['step'];
                $nameRowH = $h / 2;
                $dateRowH = $h - $nameRowH;
                $dateText = $step->action_at?->format('d M Y') ?? $step->offline_date?->format('d M Y');
                // FPDF's core fonts only render single-byte cp1252 — raw UTF-8 (e.g.
                // accented characters in a name) renders as mojibake without this.
                $name = $this->toPdfEncoding($step->approver->name);

                $pdf->SetTextColor(0, 0, 0);

                $nameFontSize = $this->fitFontSize($pdf, $name, $w, $nameRowH, 'B');
                $pdf->SetXY($x, $y + ($nameRowH - $nameFontSize) / 2);
                $pdf->Cell($w, $nameFontSize, $name, 0, 0, 'L', false);

                if ($dateText) {
                    $dateFontSize = $this->fitFontSize($pdf, $dateText, $w, $dateRowH, '');
                    $pdf->SetXY($x, $y + $nameRowH + ($dateRowH - $dateFontSize) / 2);
                    $pdf->Cell($w, $dateFontSize, $dateText, 0, 0, 'L', false);
                }
            }

            $tempOverlay = tempnam(sys_get_temp_dir(), 'acc_overlay_');
            $pdf->Output($tempOverlay, 'F');

            return $tempOverlay;
        } finally {
            foreach ($tempSigFiles as $f) {
                @unlink($f);
            }
        }
    }

    /**
     * Pushes any page annotations (FreeText, Widget/form fields, etc.) into regular page
     * content via qpdf. Non-fatal on failure — returns the input path unchanged, so a
     * document that trips up this step still gets stamped, just without this protection.
     */
    private function flattenAnnotations(string $inputPath): string
    {
        $outputPath = tempnam(sys_get_temp_dir(), 'acc_flat_');

        $cmd = sprintf(
            'qpdf --flatten-annotations=all %s %s 2>&1',
            escapeshellarg($inputPath),
            escapeshellarg($outputPath)
        );

        exec($cmd, $out, $exit);

        if (! in_array($exit, [0, 3], true) || ! file_exists($outputPath) || filesize($outputPath) === 0) {
            @unlink($outputPath);

            return $inputPath;
        }

        return $outputPath;
    }

    /**
     * Stacks $overlayPath's page 1 on top of $basePath's page 1 via qpdf, leaving every
     * other page — and every byte of page 1 that isn't covered by the overlay — untouched.
     * Unlike FPDI's importPage()/useTemplate(), qpdf never re-parses the base file's page
     * content or embedded images, so it can't silently drop any of it.
     */
    private function mergeOverlay(string $basePath, string $overlayPath): string
    {
        $outputPath = tempnam(sys_get_temp_dir(), 'acc_final_');

        $cmd = sprintf(
            'qpdf %s --overlay %s --to=1 -- %s 2>&1',
            escapeshellarg($basePath),
            escapeshellarg($overlayPath),
            escapeshellarg($outputPath)
        );

        exec($cmd, $out, $exit);

        // qpdf's exit codes: 0 = clean success, 3 = succeeded but emitted warnings about
        // the input (e.g. a minor structural quirk it worked around) — the output file is
        // still complete and valid. Only treat other non-zero codes (e.g. 2 = an actual
        // processing error) as failure.
        if (! in_array($exit, [0, 3], true) || ! file_exists($outputPath) || filesize($outputPath) === 0) {
            throw new \RuntimeException(sprintf(
                'qpdf overlay merge failed (exit %d): %s',
                $exit,
                implode(' | ', $out)
            ));
        }

        return $outputPath;
    }

    /**
     * Pure text lookup, no PDF side effects — used by buildOverlay()'s planning pass to
     * decide whether a doc-level box has anything to draw (and therefore mask) at all,
     * and again by drawDocumentField() to get the same text to actually draw.
     */
    private function resolveDocumentFieldText(Document $document, string $type): ?string
    {
        return match ($type) {
            'submitted' => $document->date_atp_submission?->format('d M Y'),
            'atpdate'   => $document->date_atp_approved?->format('d M Y'),
            'status'    => AtpStatusLabels::label($document->status_code ?? ''),
            'punchlist' => $document->atp_punchlist,
            default     => null,
        };
    }

    private function drawDocumentField(
        Fpdi $pdf,
        string $type,
        string $text,
        float $x,
        float $y,
        float $w,
        float $h,
    ): void {
        // FPDF's core fonts only render single-byte cp1252 — every status label but
        // two contains a Unicode en-dash ("–"), which mojibakes without this.
        $text = $this->toPdfEncoding($text);

        $fontSize = max(6, (int) round($h * 0.55));
        $pdf->SetFont('Helvetica', 'B', $fontSize);

        if ($type === 'punchlist') {
            // Single line, no wrap — Cell() doesn't support it. Truncate to whatever
            // actually fits the box at this font size, measured directly, instead of
            // a fixed character count that can still overflow a narrow box.
            $text = $this->truncateToWidth($pdf, $text, $w);
        } else {
            // Fixed-meaning fields (status/dates) must not be cut off — shrink the
            // font instead until the full text fits the box width.
            $fontSize = $this->fitFontSize($pdf, $text, $w, $h);
        }

        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetXY($x, $y + ($h - $fontSize) / 2);
        $pdf->Cell($w, $fontSize, $text, 0, 0, 'C', false);
    }

    private function fillBoxWithPadding(Fpdi $pdf, float $x, float $y, float $w, float $h): void
    {
        $pad = self::FILL_PADDING;
        $pdf->Rect($x - $pad, $y - $pad, $w + 2 * $pad, $h + 2 * $pad, 'F');
    }

    /**
     * Height-based font size, shrunk further (down to 6pt) until $text fits within $w.
     * The base size only ever depended on box height — a narrow-but-tall box could
     * still overflow sideways without this.
     */
    private function fitFontSize(Fpdi $pdf, string $text, float $w, float $h, string $style = 'B'): int
    {
        $fontSize = max(6, (int) round($h * 0.55));
        $pdf->SetFont('Helvetica', $style, $fontSize);

        while ($fontSize > 6 && $pdf->GetStringWidth($text) > $w) {
            $fontSize--;
            $pdf->SetFont('Helvetica', $style, $fontSize);
        }

        return $fontSize;
    }

    /**
     * Truncates $text with an ellipsis until it fits within $w at the PDF's
     * currently-set font. Caller must SetFont() beforehand. $text is expected to
     * already be single-byte cp1252 (via toPdfEncoding()), so plain strlen/substr —
     * not the mb_* equivalents — is what correctly counts/slices one character at
     * a time here.
     */
    private function truncateToWidth(Fpdi $pdf, string $text, float $w): string
    {
        if ($pdf->GetStringWidth($text) <= $w) {
            return $text;
        }

        while (strlen($text) > 1 && $pdf->GetStringWidth($text . '...') > $w) {
            $text = substr($text, 0, -1);
        }

        return rtrim($text) . '...';
    }

    /**
     * FPDF's core fonts (Helvetica/Times/Courier) only support single-byte
     * Windows-1252 encoding — text stamped raw as UTF-8 (e.g. the en-dash "–" in
     * most AtpStatusLabels entries, or accented characters in a name) renders as
     * mojibake. Convert before it reaches GetStringWidth()/Cell()/Write().
     */
    private function toPdfEncoding(string $text): string
    {
        $converted = @iconv('UTF-8', 'CP1252//TRANSLIT', $text);

        return $converted !== false ? $converted : $text;
    }
}
