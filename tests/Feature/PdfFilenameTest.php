<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\CreatesDocuments;
use Tests\TestCase;

/**
 * Chrome's built-in PDF viewer names a saved file after the URL's last path segment when the
 * response is `inline`, ignoring the Content-Disposition filename — so every PDF a user opens
 * in a tab used to save as "pdf". These tests pin the filename into the URL itself.
 */
class PdfFilenameTest extends TestCase
{
    use CreatesDocuments, RefreshDatabase;

    private function makeAdmin(): User
    {
        return User::factory()->create(['role' => 'super_admin']);
    }

    /** A document whose PDF actually exists on a faked disk. */
    private function makePdfDocument(array $attributes = []): \App\Models\Document
    {
        Storage::fake();

        $partner  = $this->makePartner();
        $document = $this->makeDocument($partner, $this->makeAdmin(), array_merge([
            'link_id'           => 'LINK/001',
            'project_code'      => 'PRJ01',
            'original_pdf_path' => 'documents/original/test.pdf',
        ], $attributes));

        Storage::put('documents/original/test.pdf', '%PDF-1.4 test');

        return $document;
    }

    public function test_the_bare_url_redirects_to_one_ending_in_the_real_filename(): void
    {
        $doc = $this->makePdfDocument();

        $response = $this->actingAs($this->makeAdmin())->get("/documents/{$doc->id}/pdf");

        $response->assertRedirect();
        $this->assertStringEndsWith(
            "/documents/{$doc->id}/pdf/AVIAT_ATP_ATP_LINK_001_PRJ01_{$doc->pt_index}.pdf",
            $response->headers->get('Location')
        );
    }

    public function test_a_slash_in_link_id_becomes_an_underscore_in_the_url(): void
    {
        $doc = $this->makePdfDocument(['link_id' => 'A/B/C']);

        $location = $this->actingAs($this->makeAdmin())
            ->get("/documents/{$doc->id}/pdf")
            ->headers->get('Location');

        $this->assertStringContainsString('_A_B_C_', $location);
    }

    public function test_the_filename_url_streams_the_pdf_inline_under_the_same_name(): void
    {
        $doc      = $this->makePdfDocument();
        $filename = "AVIAT_ATP_ATP_LINK_001_PRJ01_{$doc->pt_index}.pdf";

        $response = $this->actingAs($this->makeAdmin())->get("/documents/{$doc->id}/pdf/{$filename}");

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('inline', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString($filename, $response->headers->get('Content-Disposition'));
    }

    public function test_a_partner_from_another_organisation_is_rejected_on_both_urls(): void
    {
        $doc      = $this->makePdfDocument();
        $outsider = User::factory()->create([
            'role'       => 'partner',
            'partner_id' => $this->makePartner('PT Theirs')->id,
        ]);

        // The redirect must not leak the filename (it embeds sow_name/link_id/project_code).
        $this->actingAs($outsider)->get("/documents/{$doc->id}/pdf")->assertForbidden();
        $this->actingAs($outsider)
            ->get("/documents/{$doc->id}/pdf/AVIAT_ATP_ATP_LINK_001_PRJ01_{$doc->pt_index}.pdf")
            ->assertForbidden();
    }

    public function test_the_wildcard_only_matches_pdf_names_and_never_swallows_original(): void
    {
        $doc = $this->makePdfDocument();

        $this->actingAs($this->makeAdmin())->get("/documents/{$doc->id}/pdf/notapdf")->assertNotFound();

        // /pdf/original is admin-only and must still reach its own route — a partner hitting it
        // gets 403 from that route rather than a 200 from the wildcard.
        $partnerPic = User::factory()->create([
            'role'       => 'partner',
            'partner_id' => $doc->partner_id,
        ]);
        $this->actingAs($partnerPic)->get("/documents/{$doc->id}/pdf/original")->assertForbidden();
    }

    public function test_the_previous_pdf_keeps_its_own_suffixed_name(): void
    {
        $doc = $this->makePdfDocument(['previous_pdf_path' => 'documents/previous/test.pdf']);
        Storage::put('documents/previous/test.pdf', '%PDF-1.4 previous');

        $filename = "AVIAT_ATP_ATP_LINK_001_PRJ01_{$doc->pt_index}_PREVIOUS.pdf";

        $response = $this->actingAs($this->makeAdmin())->get("/documents/{$doc->id}/pdf/previous");
        $response->assertRedirect();
        $this->assertStringEndsWith(
            "/documents/{$doc->id}/pdf/previous/{$filename}",
            $response->headers->get('Location')
        );

        $this->actingAs($this->makeAdmin())
            ->get("/documents/{$doc->id}/pdf/previous/{$filename}")
            ->assertOk();
    }
}
