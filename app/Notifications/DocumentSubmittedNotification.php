<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Notifications\Notification;

class DocumentSubmittedNotification extends Notification implements ShouldQueue
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
        // Always send in English for consistency (FR-I18N-03)
        app()->setLocale('en');

        return (new MailMessage)
            ->subject("New Document Submitted — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("A new ATP document has been submitted and is awaiting L1 review.")
            ->line($this->documentInfoTable(extended: true))
            ->action('Review Document', url("/documents/{$this->document->id}"))
            ->line('Please log in to Acceptra to review and approve the document.');
    }
}
