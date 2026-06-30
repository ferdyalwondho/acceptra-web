<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // FR-I18N-03: emails are always sent in English regardless of user preferred_language
        \Illuminate\Support\Facades\App::setLocale('en');

        $activationUrl = route('invitation.show', $this->token);

        return (new MailMessage)
            ->subject('Acceptra Account Invitation')
            ->greeting("Hello, {$notifiable->name}!")
            ->line('You have been invited to join Acceptra — the digital ATP/BAST document approval system.')
            ->line('Click the button below to activate your account and set your password.')
            ->action('Activate Account', $activationUrl)
            ->line('This activation link is valid for **72 hours**.')
            ->line('If you did not expect this invitation, you can safely ignore this email.')
            ->salutation('Regards, The Acceptra Team');
    }
}
