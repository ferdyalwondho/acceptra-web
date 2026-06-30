<?php

namespace App\Jobs;

use App\Models\ApprovalStep;
use App\Models\Document;
use App\Models\InAppNotification;
use App\Notifications\ReassignedNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotifyReassignedJob implements ShouldQueue
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
            'type'        => 'reassigned',
            'title'       => "You have been assigned as approver: {$this->document->unique_id}",
            'body'        => "You are now the L{$this->step->level_order} approver for document {$this->document->unique_id} ({$this->document->pt_index}).",
            'action_url'  => "/documents/{$this->document->id}/approval",
        ]);

        $approver->notify(new ReassignedNotification($this->document, $this->step));
    }
}
