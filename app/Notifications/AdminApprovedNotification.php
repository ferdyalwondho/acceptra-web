<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Notifications\Notification;

class AdminApprovedNotification extends Notification implements ShouldQueue
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
            ->subject("L1 Approved — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Document {$this->document->unique_id} has been approved at L1 (auto-approved via direct admin submission) and is now moving to the next approval level.")
            ->line($this->documentInfoTable())
            ->action('View Document', url("/documents/{$this->document->id}"))
            ->line('No action is required from you at this time.');
    }
}
