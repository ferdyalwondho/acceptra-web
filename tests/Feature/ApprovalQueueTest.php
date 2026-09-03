<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\CreatesDocuments;
use Tests\TestCase;

class ApprovalQueueTest extends TestCase
{
    use CreatesDocuments, RefreshDatabase;

    public function test_the_queue_is_paginated(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'admin']);

        foreach (range(1, 30) as $ignored) {
            $this->makeL1Step($this->makeDocument($partner, $admin));
        }

        $this->actingAs($admin)
            ->get('/approvals')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('approvals.total', 30)
                ->has('approvals.data', 24));

        $this->actingAs($admin)
            ->get('/approvals?page=2')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('approvals.data', 6));
    }

    public function test_the_queue_can_be_searched(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'admin']);

        $this->makeL1Step($this->makeDocument($partner, $admin, ['unique_id' => 'UC_KAL-KS-MTP-1150', 'pt_index' => 'K1']));
        $this->makeL1Step($this->makeDocument($partner, $admin, ['unique_id' => 'UC-OTHER-0001', 'pt_index' => 'K2']));

        $this->actingAs($admin)
            ->get('/approvals?search=UC_KAL')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('approvals.data', 1)
                ->where('approvals.data.0.uniqueId', 'UC_KAL-KS-MTP-1150'));
    }

    public function test_the_urgent_filter_keeps_only_steps_pending_over_a_week(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'admin']);

        $stale = $this->makeDocument($partner, $admin);
        $this->makeL1Step($stale)->forceFill(['updated_at' => now()->subDays(30)])->save();

        $this->makeL1Step($this->makeDocument($partner, $admin));

        $this->actingAs($admin)
            ->get('/approvals?filter=overdue')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('approvals.data', 1)
                ->where('approvals.data.0.uniqueId', $stale->unique_id)
                ->where('urgent_count', 1));
    }

    public function test_the_status_and_partner_options_only_list_what_is_in_the_queue(): void
    {
        $inQueue    = $this->makePartner('PT In Queue');
        $notInQueue = $this->makePartner('PT Not In Queue');
        $admin      = User::factory()->create(['role' => 'admin']);

        $this->makeL1Step($this->makeDocument($inQueue, $admin, ['status_code' => '03']));
        $this->makeDocument($notInQueue, $admin, ['status_code' => '13']); // no active L1 step

        $this->actingAs($admin)
            ->get('/approvals')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('partners', 1)
                ->where('partners.0.name', 'PT In Queue')
                ->has('status_options', 1)
                ->where('status_options.0.value', '03'));
    }

    public function test_sorting_oldest_first_puts_the_longest_waiting_document_on_top(): void
    {
        $partner = $this->makePartner();
        $admin   = User::factory()->create(['role' => 'admin']);

        $newer = $this->makeDocument($partner, $admin, ['date_atp_submission' => now()->subDay()->toDateString()]);
        $older = $this->makeDocument($partner, $admin, ['date_atp_submission' => now()->subDays(60)->toDateString()]);
        $this->makeL1Step($newer);
        $this->makeL1Step($older);

        $this->actingAs($admin)
            ->get('/approvals?sort=oldest')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('approvals.data.0.uniqueId', $older->unique_id));

        $this->actingAs($admin)
            ->get('/approvals')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('approvals.data.0.uniqueId', $newer->unique_id));
    }

    public function test_an_approver_only_sees_their_own_queue_even_with_a_partner_filter(): void
    {
        $partner  = $this->makePartner();
        $admin    = User::factory()->create(['role' => 'admin']);
        $approver = User::factory()->create(['role' => 'approver_ms_rts']);

        $mine = $this->makeDocument($partner, $admin);
        $this->makeL1Step($mine, ['level_order' => 2, 'role' => 'approver_ms_rts', 'approver_id' => $approver->id]);

        $this->makeL1Step($this->makeDocument($partner, $admin)); // unassigned L1 — admin's, not theirs

        $this->actingAs($approver)
            ->get("/approvals?partner_id={$partner->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('approvals.data', 1)
                ->where('approvals.data.0.uniqueId', $mine->unique_id));
    }
}
