<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Notifications\Notification;

class AdminRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable, HasDocumentInfoTable;

    public function __construct(
        private readonly Document $document,
        private readonly string   $rejectReason = '',
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        app()->setLocale('en');

        return (new MailMessage)
            ->subject("Document Rejected — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Document {$this->document->unique_id} has been rejected and requires revision.")
            ->line($this->documentInfoTable(
                extraRows: $this->rejectReason ? [['label' => 'Reason', 'value' => $this->rejectReason]] : [],
                extended:  true,
            ))
            ->action('View Document', url("/documents/{$this->document->id}"))
            ->line('Please coordinate with the originator for document revision.');
    }
}
