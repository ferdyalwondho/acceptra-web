<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Signature;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Fpdi;

class PdfSignatureService
{
    /**
     * Coordinates in template_snapshot are saved at this PDF.js viewport scale.
     * Must match SAVE_SCALE in PdfViewer.tsx.
     */
    private const SAVE_SCALE = 1.4;

    /**
     * Return absolute path to a PDF with signatures embedded.
     * Generates and caches in documents/final/{id}.pdf on first call.
     * Falls back to original PDF on any error.
     */
    public function getPdfPath(Document $document): string
    {
        $disk        = Storage::disk('local');
        $originalRel = $document->original_pdf_path;

        if (! $originalRel || ! $disk->exists($originalRel)) {
            abort(404, 'PDF not found.');
        }

        // Return cached final PDF if it exists
        if ($document->final_pdf_path && $disk->exists($document->final_pdf_path)) {
            return $disk->path($document->final_pdf_path);
        }

        // Try to embed signatures; fall back to original on failure
        try {
            $finalPath = $this->generate($document, $disk->path($originalRel));
            return $finalPath;
        } catch (\Throwable) {
            return $disk->path($originalRel);
        }
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

    private function generate(Document $document, string $originalAbsPath): string
    {
        $document->loadMissing(['approvalSteps.approver', 'approvalSteps.signature']);

        $placement = $document->template_snapshot['placement'] ?? [];
        $positions = $placement['positions'] ?? [];

        // No signature placements configured — return original
        if (empty($positions)) {
            return $originalAbsPath;
        }

        // Check if any step actually has a signature
        $hasAny = $document->approvalSteps->contains(
            fn ($s) => $s->signature_id !== null
        );
        if (! $hasAny) {
            return $originalAbsPath;
        }

        // Decompress the PDF so the free FPDI parser can handle it
        $parsablePath = $this->decompressPdf($originalAbsPath);

        $pdf        = new Fpdi('P', 'pt');
        $pageCount  = $pdf->setSourceFile($parsablePath);

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

                // Key format: "{level_order}_sig" or "{level_order}_name"
                [$levelStr, $type] = explode('_', $key, 2);
                $level = (int) $levelStr;
                $step  = $document->approvalSteps->firstWhere('level_order', $level);

                if (! $step) {
                    continue;
                }

                if ($type === 'sig' && $step->signature_id) {
                    $sig = $step->signature ?? Signature::find($step->signature_id);
                    if (! $sig) {
                        continue;
                    }

                    $imgAbs = Storage::disk('local')->path($sig->image_path);
                    if (! file_exists($imgAbs)) {
                        continue;
                    }

                    $ext  = strtolower(pathinfo($sig->image_path, PATHINFO_EXTENSION));
                    $type = match ($ext) {
                        'jpg', 'jpeg' => 'JPEG',
                        'gif'         => 'GIF',
                        default       => 'PNG',
                    };

                    $pdf->Image($imgAbs, $x, $y, $w, $h, $type);

                } elseif ($type === 'name' && $step->approver) {
                    $fontSize = max(6, (int) round($h * 0.55));
                    $pdf->SetFont('Helvetica', 'B', $fontSize);
                    $pdf->SetTextColor(0, 0, 0);
                    $pdf->SetXY($x, $y + ($h - $fontSize) / 2);
                    $pdf->Cell($w, $fontSize, $step->approver->name, 0, 0, 'C');
                }
            }
        }

        $disk    = Storage::disk('local');
        $relPath = "documents/final/{$document->id}.pdf";
        $absPath = $disk->path($relPath);

        if (! is_dir(dirname($absPath))) {
            mkdir(dirname($absPath), 0755, true);
        }

        $pdf->Output($absPath, 'F');

        $document->update(['final_pdf_path' => $relPath]);

        return $absPath;
    }
}
