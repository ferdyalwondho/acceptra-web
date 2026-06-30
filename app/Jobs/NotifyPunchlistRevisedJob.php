<?php

namespace App\Jobs;

use App\Models\Document;
use App\Models\InAppNotification;
use App\Notifications\PunchlistRevisedNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotifyPunchlistRevisedJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly Document $document,
    ) {}

    public function handle(): void
    {
        // Notify semua approver yang membuat punchlist (status = approved_with_punchlist)
        $punchlistSteps = $this->document->approvalSteps()
            ->where('status', 'approved_with_punchlist')
            ->with('approver')
            ->get();

        $notified = [];

        foreach ($punchlistSteps as $step) {
            $approver = $step->approver;

            if (! $approver || in_array($approver->id, $notified)) {
                continue;
            }

            if ($approver->status !== 'active') {
                continue;
            }

            InAppNotification::create([
                'user_id'     => $approver->id,
                'document_id' => $this->document->id,
                'type'        => 'punchlist_revised',
                'title'       => "Punchlist revision ready: {$this->document->unique_id}",
                'body'        => "Admin has uploaded a revised document for {$this->document->unique_id}. Please verify the revision.",
                'action_url'  => "/documents/{$this->document->id}/approval",
            ]);

            $approver->notify(new PunchlistRevisedNotification($this->document));
            $notified[] = $approver->id;
        }
    }
}
