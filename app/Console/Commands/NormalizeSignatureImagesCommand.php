<?php

namespace App\Console\Commands;

use App\Models\ApprovalStep;
use App\Models\Document;
use App\Models\Signature;
use App\Support\SignatureImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class NormalizeSignatureImagesCommand extends Command
{
    protected $signature = 'signatures:normalize {--dry-run : Report affected signatures without writing anything}';

    protected $description = 'Re-encode any stored signature image (e.g. interlaced PNG, or JPEG bytes saved under a .png name) that FPDF cannot stamp, fix its file extension to match the real content, and clear the cached final PDF for documents that used it';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $fixedSignatures = 0;
        $affectedDocumentIds = [];

        Signature::query()->orderBy('created_at')->chunkById(100, function ($signatures) use ($dryRun, &$fixedSignatures, &$affectedDocumentIds) {
            foreach ($signatures as $sig) {
                if (! Storage::exists($sig->image_path)) {
                    $this->warn("Skip {$sig->id}: file missing ({$sig->image_path}).");
                    continue;
                }

                $original = Storage::get($sig->image_path);

                try {
                    ['bytes' => $normalized, 'ext' => $ext] = SignatureImage::normalizeWithExtension($original);
                } catch (\InvalidArgumentException) {
                    $this->warn("Skip {$sig->id}: unrecognised image format ({$sig->image_path}).");
                    continue;
                }

                // Target path: same directory + token, extension pinned to the real content.
                $currentExt = strtolower(pathinfo($sig->image_path, PATHINFO_EXTENSION));
                $targetPath = $currentExt === $ext
                    ? $sig->image_path
                    : preg_replace('/\.[^.\/]+$/', ".{$ext}", $sig->image_path);

                $bytesChanged = $normalized !== $original;
                $pathChanged  = $targetPath !== $sig->image_path;

                if (! $bytesChanged && ! $pathChanged) {
                    continue;
                }

                $fixedSignatures++;
                $this->line(($dryRun ? '[dry-run] ' : '') . "Fixing {$sig->id} ({$sig->image_path}" . ($pathChanged ? " → {$targetPath}" : '') . ") — {$sig->user_id}");

                $docIds = ApprovalStep::where('signature_id', $sig->id)->pluck('document_id')->all();
                foreach ($docIds as $docId) {
                    $affectedDocumentIds[$docId] = true;
                }

                if (! $dryRun) {
                    Storage::put($targetPath, $normalized);
                    if ($pathChanged) {
                        Storage::delete($sig->image_path);
                        $sig->update(['image_path' => $targetPath]);
                    }
                }
            }
        });

        $affectedDocumentIds = array_keys($affectedDocumentIds);

        if (! $dryRun && ! empty($affectedDocumentIds)) {
            Document::whereIn('id', $affectedDocumentIds)->update(['final_pdf_path' => null]);
        }

        $this->info(sprintf(
            '%s%d signature(s) needed re-encoding, affecting %d document(s)%s.',
            $dryRun ? '[dry-run] ' : '',
            $fixedSignatures,
            count($affectedDocumentIds),
            $dryRun ? ' — rerun without --dry-run to apply' : ' — their cached PDF will regenerate on next view',
        ));

        return self::SUCCESS;
    }
}
