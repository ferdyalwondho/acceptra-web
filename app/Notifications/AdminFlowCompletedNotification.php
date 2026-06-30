<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Notifications\Notification;

class AdminFlowCompletedNotification extends Notification implements ShouldQueue
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
            ->subject("Document Approved (All Levels) — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Document {$this->document->unique_id} has completed the full approval flow.")
            ->line($this->documentInfoTable(extended: true))
            ->action('View Final Document', url("/documents/{$this->document->id}"))
            ->line('The final PDF is now available for download.');
    }
}
