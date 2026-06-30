<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Notifications\Notification;

class PartnerRejectedForRevisionNotification extends Notification implements ShouldQueue
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
            ->subject("Document Requires Revision — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your document {$this->document->unique_id} has been rejected and requires revision before it can proceed.")
            ->line($this->documentInfoTable(extended: true))
            ->action('View & Revise Document', url("/documents/{$this->document->id}"))
            ->line('Please upload a revised document to continue the approval process.');
    }
}
