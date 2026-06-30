<?php

namespace App\Jobs;

use App\Models\ApprovalStep;
use App\Models\Document;
use App\Models\InAppNotification;
use App\Models\User;
use App\Notifications\ReminderNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly Document     $document,
        private readonly ApprovalStep $step,
        private readonly int          $daysPending,
    ) {}

    public function handle(): void
    {
        $notifiedUserIds = [];

        // Penerima primer:
        // - L1 (approver_id = NULL): semua admin/super_admin
        // - L2+: approver spesifik pada step
        if ($this->step->level_order === 1 || $this->step->approver_id === null) {
            $primaryRecipients = User::whereIn('role', ['admin', 'super_admin'])
                ->where('status', 'active')
                ->whereNull('deleted_at')
                ->get();
        } else {
            $approver = $this->step->approver;
            $primaryRecipients = $approver ? collect([$approver]) : collect();
        }

        foreach ($primaryRecipients as $user) {
            $this->sendReminder($user);
            $notifiedUserIds[] = $user->id;
        }

        // CC ke semua admin sebagai awareness — skip yang sudah dinotif di atas
        $admins = User::whereIn('role', ['admin', 'super_admin'])
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->whereNotIn('id', $notifiedUserIds)
            ->get();

        foreach ($admins as $admin) {
            $this->sendReminder($admin);
        }
    }

    private function sendReminder(User $user): void
    {
        InAppNotification::create([
            'user_id'     => $user->id,
            'document_id' => $this->document->id,
            'type'        => 'reminder',
            'title'       => "Reminder: Document Awaiting Approval — {$this->document->unique_id}",
            'body'        => "Document {$this->document->unique_id} ({$this->document->pt_index}) is still pending approval at L{$this->step->level_order}.",
            'action_url'  => "/documents/{$this->document->id}/approval",
        ]);

        $user->notify(new ReminderNotification($this->document, $this->step, $this->daysPending));
    }
}
