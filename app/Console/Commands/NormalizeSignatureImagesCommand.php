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

    protected $description = 'Re-encode any stored signature image (e.g. interlaced PNG) that FPDF cannot stamp, and clear the cached final PDF for documents that used it';

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

                $original   = Storage::get($sig->image_path);
                $normalized = SignatureImage::normalize($original);

                if ($normalized === $original) {
                    continue;
                }

                $fixedSignatures++;
                $this->line(($dryRun ? '[dry-run] ' : '') . "Fixing {$sig->id} ({$sig->image_path}) — {$sig->user_id}");

                $docIds = ApprovalStep::where('signature_id', $sig->id)->pluck('document_id')->all();
                foreach ($docIds as $docId) {
                    $affectedDocumentIds[$docId] = true;
                }

                if (! $dryRun) {
                    Storage::put($sig->image_path, $normalized);
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
