<?php

namespace App\Notifications;

use App\Models\ApprovalStep;
use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Notifications\Notification;

class ApproverTurnNotification extends Notification implements ShouldQueue
{
    use Queueable, HasDocumentInfoTable;

    public function __construct(
        private readonly Document     $document,
        private readonly ApprovalStep $step,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        app()->setLocale('en');

        $levelLabel = "L{$this->step->level_order}";

        return (new MailMessage)
            ->subject("Document Awaiting Your Approval — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("A document is now awaiting your approval at level {$levelLabel}.")
            ->line($this->documentInfoTable(extended: true))
            ->action('Review & Approve', url("/documents/{$this->document->id}/approval"))
            ->line('Please log in to Acceptra to review and take action on this document.');
    }
}
