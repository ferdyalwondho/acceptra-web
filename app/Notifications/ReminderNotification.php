<?php

namespace App\Notifications;

use App\Models\ApprovalStep;
use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Notifications\Notification;

class ReminderNotification extends Notification implements ShouldQueue
{
    use Queueable, HasDocumentInfoTable;

    public function __construct(
        private readonly Document     $document,
        private readonly ApprovalStep $step,
        private readonly int          $daysPending,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        app()->setLocale('en');

        $levelLabel  = "L{$this->step->level_order}";
        $dayWord     = $this->daysPending === 1 ? 'day' : 'days';

        return (new MailMessage)
            ->subject("Reminder: Document Awaiting Your Approval — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("This is a reminder that the following document is still awaiting your approval at level {$levelLabel}.")
            ->line($this->documentInfoTable(
                extraRows: [['label' => 'Pending Since', 'value' => "{$this->daysPending} {$dayWord} ago"]],
                extended:  true,
            ))
            ->action('Review & Approve', url("/documents/{$this->document->id}/approval"))
            ->line('Please log in to Acceptra and take action on this document.');
    }
}
