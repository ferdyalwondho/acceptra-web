<?php

namespace App\Notifications;

use App\Models\Document;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartnerRevisionRejectedByAdminNotification extends Notification implements ShouldQueue
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
            ->subject("Revision rejected — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your revised PDF for document {$this->document->unique_id} was reviewed by an Admin and rejected. Please check the rejection reason on the document page and upload another revision.")
            ->line($this->documentInfoTable(extended: true))
            ->action('View & Revise Document', url("/documents/{$this->document->id}"))
            ->line('Please upload a corrected revision to continue the approval process.');
    }
}
