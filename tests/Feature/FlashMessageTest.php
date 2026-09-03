<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FlashMessageTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Controllers flash under both keys. Reading only `status` swallowed a dozen
     * confirmations, including the one after a Partner uploads a punchlist revision.
     */
    public function test_the_status_session_key_reaches_the_page(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']))
            ->withSession(['status' => 'Tersimpan.'])
            ->get('/documents')
            ->assertInertia(fn ($page) => $page->where('flash.success', 'Tersimpan.'));
    }

    public function test_the_success_session_key_reaches_the_page(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']))
            ->withSession(['success' => 'Revisi punchlist terkirim.'])
            ->get('/documents')
            ->assertInertia(fn ($page) => $page->where('flash.success', 'Revisi punchlist terkirim.'));
    }
}
