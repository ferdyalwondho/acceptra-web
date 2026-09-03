<?php

namespace Tests\Feature\Concerns;

use App\Models\ApprovalStep;
use App\Models\Document;
use App\Models\Partner;
use App\Models\Template;
use App\Models\User;

/**
 * Minimal row builders for the document graph. The app ships a factory for User only,
 * and these tests need just enough of a Document to exercise scoping and filters.
 */
trait CreatesDocuments
{
    private ?Template $sharedTemplate = null;

    private int $documentSequence = 0;

    protected function makePartner(string $name = 'PT Test'): Partner
    {
        return Partner::create([
            'name'   => $name,
            'email'  => str()->slug($name) . '-' . uniqid() . '@example.test',
            'status' => 'active',
        ]);
    }

    protected function makeTemplate(): Template
    {
        return $this->sharedTemplate ??= Template::create([
            'name'     => 'ATP Template',
            'sow_code' => 'ATP',
            'status'   => 'active',
        ]);
    }

    protected function makeDocument(Partner $partner, User $submitter, array $attributes = []): Document
    {
        $n = ++$this->documentSequence;

        return Document::create(array_merge([
            'unique_id'           => 'UC_TEST-' . str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'pt_index'            => 'PT' . str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'partner_id'          => $partner->id,
            'submitted_by'        => $submitter->id,
            'template_id'         => $this->makeTemplate()->id,
            'template_snapshot'   => ['levels' => []],
            'sow_name'            => 'ATP',
            'status_code'         => '01',
            'date_atp_submission' => now()->subDays($n)->toDateString(),
        ], $attributes));
    }

    /** An L1 step with no approver assigned — what puts a document in the Admin queue. */
    protected function makeL1Step(Document $document, array $attributes = []): ApprovalStep
    {
        return ApprovalStep::create(array_merge([
            'document_id'        => $document->id,
            'level_order'        => 1,
            'role'               => 'admin',
            'requires_signature' => false,
            'approver_id'        => null,
            'status'             => 'pending',
            'is_active'          => true,
        ], $attributes));
    }

    /** Number of data rows (header excluded) in a streamed .xlsx response. */
    protected function xlsxRowCount(string $body): int
    {
        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($path, $body);

        $zip = new \ZipArchive();
        $this->assertTrue($zip->open($path) === true, 'Response body is not a valid .xlsx archive.');
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        unlink($path);

        return max(0, substr_count($sheet, '<row ') - 1);
    }
}
