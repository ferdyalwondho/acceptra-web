<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\CreatesDocuments;
use Tests\TestCase;

class PunchlistRevisionTest extends TestCase
{
    use CreatesDocuments, RefreshDatabase;

    public function test_partner_may_revise_a_punchlist_document_an_admin_submitted_for_them(): void
    {
        $partner = $this->makePartner('PT Esatel');
        $admin   = User::factory()->create(['role' => 'super_admin']);
        $pic     = User::factory()->create(['role' => 'partner', 'partner_id' => $partner->id]);

        // submitted_by is the Admin, not the PIC — this is what used to hide the button.
        $doc = $this->makeDocument($partner, $admin, ['status_code' => '14']);

        $this->actingAs($pic)
            ->get("/documents/{$doc->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('can_edit_punchlist', true));
    }

    public function test_partner_from_another_organisation_may_not(): void
    {
        $mine   = $this->makePartner('PT Mine');
        $theirs = $this->makePartner('PT Theirs');
        $admin  = User::factory()->create(['role' => 'super_admin']);
        $outsider = User::factory()->create(['role' => 'partner', 'partner_id' => $theirs->id]);

        $doc = $this->makeDocument($mine, $admin, ['status_code' => '14']);

        // They can't even open it, let alone revise it.
        $this->actingAs($outsider)->get("/documents/{$doc->id}")->assertForbidden();
    }

    public function test_the_flag_is_false_outside_the_punchlist_state(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'super_admin']);
        $pic     = User::factory()->create(['role' => 'partner', 'partner_id' => $partner->id]);

        // '17' is the L1 gate after a Subcon upload — no edit page until L1 acts.
        $doc = $this->makeDocument($partner, $admin, ['status_code' => '17']);

        $this->actingAs($pic)
            ->get("/documents/{$doc->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('can_edit_punchlist', false));
    }

    public function test_the_flag_matches_the_upload_endpoints_own_gate(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'super_admin']);
        $pic     = User::factory()->create(['role' => 'partner', 'partner_id' => $partner->id]);

        $doc = $this->makeDocument($partner, $admin, ['status_code' => '14']);

        // Same user, same document: the endpoint accepts them (422 on the missing file,
        // not 403 on authorization), which is exactly what the flag promises.
        $this->actingAs($pic)
            ->post("/documents/{$doc->id}/punchlist-revision", [])
            ->assertSessionHasErrors('pdf_file');
    }
}
