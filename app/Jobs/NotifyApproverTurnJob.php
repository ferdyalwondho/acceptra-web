<?php

namespace App\Jobs;

use App\Models\ApprovalStep;
use App\Models\Document;
use App\Models\InAppNotification;
use App\Notifications\ApproverTurnNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotifyApproverTurnJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly Document     $document,
        private readonly ApprovalStep $step,
    ) {}

    public function handle(): void
    {
        $approver = $this->step->approver;

        if (! $approver) {
            return;
        }

        InAppNotification::create([
            'user_id'     => $approver->id,
            'document_id' => $this->document->id,
            'type'        => 'approval_turn',
            'title'       => "Your approval needed: {$this->document->unique_id}",
            'body'        => "Document {$this->document->unique_id} is awaiting your approval at L{$this->step->level_order}.",
            'action_url'  => "/documents/{$this->document->id}/approval",
        ]);

        $approver->notify(new ApproverTurnNotification($this->document, $this->step));
    }
}
