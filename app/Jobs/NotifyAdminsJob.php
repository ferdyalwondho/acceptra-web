<?php

namespace App\Jobs;

use App\Models\Document;
use App\Models\InAppNotification;
use App\Models\User;
use App\Notifications\AdminApprovedNotification;
use App\Notifications\AdminFlowCompletedNotification;
use App\Notifications\AdminRejectedNotification;
use App\Notifications\DocumentSubmittedNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotifyAdminsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // event: 'submission' | 'approved' | 'rejected' | 'flow_completed'
    public function __construct(
        private readonly Document $document,
        private readonly string   $event,
        private readonly string   $rejectReason = '',
    ) {}

    public function handle(): void
    {
        $admins = User::whereIn('role', ['admin', 'super_admin'])
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->get();

        [$type, $title, $body] = match ($this->event) {
            'submission' => [
                'submission',
                "New document submitted: {$this->document->unique_id}",
                "Document {$this->document->unique_id} ({$this->document->pt_index}) — {$this->document->sow_name}",
            ],
            'approved' => [
                'approved',
                "L1 approved: {$this->document->unique_id}",
                "Document {$this->document->unique_id} ({$this->document->pt_index}) passed L1 and is proceeding.",
            ],
            'rejected' => [
                'rejected',
                "Document rejected: {$this->document->unique_id}",
                "Document {$this->document->unique_id} ({$this->document->pt_index}) was rejected and requires revision.",
            ],
            'flow_completed' => [
                'flow_completed',
                "Approval flow completed: {$this->document->unique_id}",
                "Document {$this->document->unique_id} ({$this->document->pt_index}) has been fully approved.",
            ],
            default => [
                'submission',
                "Document update: {$this->document->unique_id}",
                "Document {$this->document->unique_id} ({$this->document->pt_index}) — {$this->document->sow_name}",
            ],
        };

        foreach ($admins as $admin) {
            InAppNotification::create([
                'user_id'     => $admin->id,
                'document_id' => $this->document->id,
                'type'        => $type,
                'title'       => $title,
                'body'        => $body,
                'action_url'  => "/documents/{$this->document->id}",
            ]);

            $notification = match ($this->event) {
                'submission'     => new DocumentSubmittedNotification($this->document),
                'approved'       => new AdminApprovedNotification($this->document),
                'rejected'       => new AdminRejectedNotification($this->document, $this->rejectReason),
                'flow_completed' => new AdminFlowCompletedNotification($this->document),
                default          => new DocumentSubmittedNotification($this->document),
            };

            $admin->notify($notification);
        }
    }
}
