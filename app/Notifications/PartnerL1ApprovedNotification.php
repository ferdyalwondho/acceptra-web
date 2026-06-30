<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Notifications\Notification;

class PartnerL1ApprovedNotification extends Notification implements ShouldQueue
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
            ->subject("Document Update — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your document {$this->document->unique_id} has passed the initial review (L1) and is now proceeding to the next approval stage.")
            ->line($this->documentInfoTable(extended: true))
            ->action('View Document', url("/documents/{$this->document->id}"))
            ->line('You will receive another notification once the final approval decision is made.');
    }
}
