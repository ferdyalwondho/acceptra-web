<?php

namespace App\Jobs;

use App\Models\Document;
use App\Models\InAppNotification;
use App\Notifications\PartnerL1ApprovedNotification;
use App\Notifications\PartnerRejectedForRevisionNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotifyPartnerJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // event: 'l1_approved' | 'rejected_for_revision'
    public function __construct(
        private readonly Document $document,
        private readonly string   $event,
    ) {}

    public function handle(): void
    {
        $partnerUsers = $this->document->partner
            ?->users()
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->get();

        if (! $partnerUsers || $partnerUsers->isEmpty()) {
            return;
        }

        [$title, $body] = match ($this->event) {
            'l1_approved' => [
                "Document passed initial review: {$this->document->unique_id}",
                "Document {$this->document->unique_id} ({$this->document->pt_index}) has passed L1 and is proceeding to the next stage.",
            ],
            'rejected_for_revision' => [
                "Document requires revision: {$this->document->unique_id}",
                "Document {$this->document->unique_id} ({$this->document->pt_index}) was rejected. Please upload a revised document.",
            ],
            default => [
                "Document update: {$this->document->unique_id}",
                "Document {$this->document->unique_id} ({$this->document->pt_index}) has been updated.",
            ],
        };

        foreach ($partnerUsers as $user) {
            InAppNotification::create([
                'user_id'     => $user->id,
                'document_id' => $this->document->id,
                'type'        => 'result_partner',
                'title'       => $title,
                'body'        => $body,
                'action_url'  => "/documents/{$this->document->id}",
            ]);

            match ($this->event) {
                'l1_approved'           => $user->notify(new PartnerL1ApprovedNotification($this->document)),
                'rejected_for_revision' => $user->notify(new PartnerRejectedForRevisionNotification($this->document)),
                default                 => null,
            };
        }
    }
}
