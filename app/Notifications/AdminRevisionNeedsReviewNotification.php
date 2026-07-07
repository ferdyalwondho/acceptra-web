<?php

namespace App\Notifications;

use App\Models\Document;
use App\Notifications\Concerns\HasDocumentInfoTable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdminRevisionNeedsReviewNotification extends Notification implements ShouldQueue
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

        $level = $this->document->previous_pdf_rejected_level;

        return (new MailMessage)
            ->subject("Revision needs review — {$this->document->unique_id}")
            ->greeting("Hello {$notifiable->name},")
            ->line("The Partner has uploaded a revised PDF for document {$this->document->unique_id} after it was rejected at L{$level}. Please review the revision and approve or reject it before signature placement can be redone.")
            ->line($this->documentInfoTable())
            ->action('Review Revision', url("/documents/{$this->document->id}"))
            ->line('Approval at L' . $level . ' will only resume once you approve the revision and complete signature placement.');
    }
}
