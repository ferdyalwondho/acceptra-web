<?php

namespace App\Notifications;

use App\Models\Document;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdminRoutingNeededNotification extends Notification implements ShouldQueue
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
            ->subject("Signature placement needed — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Document {$this->document->unique_id} has been approved at L1. L2–L4 approvers have already been auto-assigned based on the document's cluster — the only remaining step is signature placement (and, optionally, an Excel attachment) before the next approver can be notified.")
            ->line($this->documentInfoTable())
            ->action('Complete Placement', url("/documents/{$this->document->id}"))
            ->line('Please complete the signature placement as soon as possible so the next approver can be notified.');
    }
}
