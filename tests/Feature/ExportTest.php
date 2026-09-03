<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\CreatesDocuments;
use Tests\TestCase;

class ExportTest extends TestCase
{
    use CreatesDocuments, RefreshDatabase;

    public function test_partner_export_ignores_the_pages_active_filters(): void
    {
        $partner = $this->makePartner('PT Esatel');
        $admin   = User::factory()->create(['role' => 'super_admin']);
        $pic     = User::factory()->create(['role' => 'partner', 'partner_id' => $partner->id]);

        // Submitted by an Admin on the partner's behalf — the common case for imports.
        foreach (range(1, 3) as $ignored) {
            $this->makeDocument($partner, $admin);
        }

        $response = $this->actingAs($pic)->get('/documents/export?search=tidak-akan-cocok&status_code=13');

        $response->assertOk();
        $this->assertSame(3, $this->xlsxRowCount($response->streamedContent()));
    }

    public function test_partner_export_is_still_scoped_to_their_own_organisation(): void
    {
        $mine   = $this->makePartner('PT Mine');
        $theirs = $this->makePartner('PT Theirs');
        $admin  = User::factory()->create(['role' => 'super_admin']);
        $pic    = User::factory()->create(['role' => 'partner', 'partner_id' => $mine->id]);

        $this->makeDocument($mine, $admin);
        $this->makeDocument($theirs, $admin);

        $response = $this->actingAs($pic)->get('/documents/export');

        $response->assertOk();
        $this->assertSame(1, $this->xlsxRowCount($response->streamedContent()));
    }

    public function test_partner_without_an_organisation_only_sees_what_they_submitted(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'super_admin']);
        $orphan  = User::factory()->create(['role' => 'partner', 'partner_id' => null]);

        $this->makeDocument($partner, $orphan);
        $this->makeDocument($partner, $admin);

        $response = $this->actingAs($orphan)->get('/documents/export');

        $response->assertOk();
        $this->assertSame(1, $this->xlsxRowCount($response->streamedContent()));
    }

    public function test_admin_export_still_follows_the_pages_filters(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'admin']);

        $this->makeDocument($partner, $admin, ['status_code' => '01']);
        $this->makeDocument($partner, $admin, ['status_code' => '13']);

        $response = $this->actingAs($admin)->get('/documents/export?status_code=13');

        $response->assertOk();
        $this->assertSame(1, $this->xlsxRowCount($response->streamedContent()));
    }

    public function test_document_export_that_matches_nothing_redirects_with_an_explanation(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'admin']);
        $this->makeDocument($partner, $admin);

        $response = $this->actingAs($admin)
            ->from('/documents')
            ->get('/documents/export?search=tidak-akan-cocok');

        $response->assertRedirect('/documents');
        $response->assertSessionHas('error', fn (string $m) => str_contains($m, 'tidak-akan-cocok'));
    }

    public function test_pending_user_export_that_matches_nothing_redirects_instead_of_streaming_an_empty_file(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        User::factory()->unverified()->create(['name' => 'Budi Santoso']);

        $response = $this->actingAs($superAdmin)
            ->from('/users')
            ->get('/users/export?search=Choi');

        $response->assertRedirect('/users');
        $response->assertSessionHas('error', fn (string $m) => str_contains($m, 'Choi'));
    }

    public function test_pending_user_export_streams_the_unverified_users(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        User::factory()->unverified()->count(2)->create();
        User::factory()->create(); // already activated — must not appear

        $response = $this->actingAs($superAdmin)->get('/users/export');

        $response->assertOk();
        $this->assertSame(2, $this->xlsxRowCount($response->streamedContent()));
    }

    public function test_search_underscore_is_not_treated_as_a_wildcard(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'admin']);

        $this->makeDocument($partner, $admin, ['unique_id' => 'UC_KAL-1', 'pt_index' => 'A1']);
        $this->makeDocument($partner, $admin, ['unique_id' => 'UCXKAL-2', 'pt_index' => 'A2']);

        $response = $this->actingAs($admin)->get('/documents/export?search=UC_KAL');

        $response->assertOk();
        $this->assertSame(1, $this->xlsxRowCount($response->streamedContent()));
    }
}
