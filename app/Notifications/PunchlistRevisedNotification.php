<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Notifications\Notification;

class PunchlistRevisedNotification extends Notification implements ShouldQueue
{
    use Queueable, HasDocumentInfoTable;

    public function __construct(
        private readonly Document $document,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        app()->setLocale('en');

        return (new MailMessage)
            ->subject("Punchlist Revision Ready for Verification — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("The admin has uploaded a revised document for {$this->document->unique_id} addressing your punchlist. Please verify whether the revision is acceptable.")
            ->line($this->documentInfoTable(extended: true))
            ->action('Verify Revision', url("/documents/{$this->document->id}/approval"))
            ->line('Please log in to Acceptra to review the revised document and submit your verification.');
    }
}
