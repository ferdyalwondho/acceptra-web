<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Signature;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Fpdi;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PdfSignatureService
{
    /**
     * Coordinates in template_snapshot are saved at this PDF.js viewport scale.
     * Must match SAVE_SCALE in PdfViewer.tsx.
     */
    private const SAVE_SCALE = 1.4;

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
            } catch (\Throwable) {
                // Fall through — the key resolution below falls back to the original.
            }
        }

        $key = ($document->final_pdf_path && Storage::exists($document->final_pdf_path))
            ? $document->final_pdf_path
            : $document->original_pdf_path;

        return Storage::response($key, basename($key), ['Content-Type' => 'application/pdf']);
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
     * Download original_pdf_path from the default disk, embed signatures/stamps,
     * and upload the result back to the default disk as documents/final/{id}.pdf.
     * No-op if no placement positions are configured or no signatures exist yet.
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
        // orphan that never gets cleaned up. None of gs/FPDI/Image() below need a
        // file extension (Image()'s type is passed explicitly as $imgType).
        $tempInput = tempnam(sys_get_temp_dir(), 'acc_orig_');
        $tempParsable = null;
        $tempOutput   = null;
        $tempSigFiles = [];

        try {
            file_put_contents($tempInput, Storage::get($document->original_pdf_path));

            $tempParsable = $this->decompressPdf($tempInput);

            $pdf       = new Fpdi('P', 'pt');
            $pageCount = $pdf->setSourceFile($tempParsable);

            for ($p = 1; $p <= $pageCount; $p++) {
                $tplId = $pdf->importPage($p);
                $size  = $pdf->getTemplateSize($tplId);

                $pdf->AddPage('P', [$size['width'], $size['height']]);
                $pdf->useTemplate($tplId, 0, 0, $size['width'], $size['height']);

                foreach ($positions as $key => $pos) {
                    if ((int) ($pos['page'] ?? 1) !== $p) {
                        continue;
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
                        $this->stampDocumentField($pdf, $document, $type, $x, $y, $w, $h);
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

                    } elseif ($type === 'name' && $step->approver) {
                        $fontSize = $this->fitFontSize($pdf, $step->approver->name, $w, $h);
                        $pdf->SetTextColor(0, 0, 0);
                        $pdf->SetXY($x, $y + ($h - $fontSize) / 2);
                        $pdf->Cell($w, $fontSize, $step->approver->name, 0, 0, 'C');
                    }
                }
            }

            $tempOutput = tempnam(sys_get_temp_dir(), 'acc_final_');
            $pdf->Output($tempOutput, 'F');

            $relPath = "documents/final/{$document->id}.pdf";
            Storage::put($relPath, file_get_contents($tempOutput));

            $document->update(['final_pdf_path' => $relPath]);
        } finally {
            @unlink($tempInput);
            if ($tempParsable) {
                @unlink($tempParsable);
            }
            if ($tempOutput) {
                @unlink($tempOutput);
            }
            foreach ($tempSigFiles as $f) {
                @unlink($f);
            }
        }
    }

    private function stampDocumentField(
        Fpdi $pdf,
        Document $document,
        string $type,
        float $x,
        float $y,
        float $w,
        float $h,
    ): void {
        $text = match ($type) {
            'submitted' => $document->date_atp_submission?->format('d M Y'),
            'atpdate'   => $document->date_atp_approved?->format('d M Y'),
            'status'    => AtpStatusLabels::label($document->status_code ?? ''),
            'punchlist' => $document->atp_punchlist,
            default     => null,
        };

        if ($text === null || $text === '') {
            return;
        }

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
        $pdf->Cell($w, $fontSize, $text, 0, 0, 'C');
    }

    /**
     * Height-based font size, shrunk further (down to 6pt) until $text fits within $w.
     * The base size only ever depended on box height — a narrow-but-tall box could
     * still overflow sideways without this.
     */
    private function fitFontSize(Fpdi $pdf, string $text, float $w, float $h): int
    {
        $fontSize = max(6, (int) round($h * 0.55));
        $pdf->SetFont('Helvetica', 'B', $fontSize);

        while ($fontSize > 6 && $pdf->GetStringWidth($text) > $w) {
            $fontSize--;
            $pdf->SetFont('Helvetica', 'B', $fontSize);
        }

        return $fontSize;
    }

    /**
     * Truncates $text with an ellipsis until it fits within $w at the PDF's
     * currently-set font. Caller must SetFont() beforehand.
     */
    private function truncateToWidth(Fpdi $pdf, string $text, float $w): string
    {
        if ($pdf->GetStringWidth($text) <= $w) {
            return $text;
        }

        while (mb_strlen($text) > 1 && $pdf->GetStringWidth($text . '...') > $w) {
            $text = mb_substr($text, 0, -1);
        }

        return rtrim($text) . '...';
    }
}
