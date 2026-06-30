<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification implements ShouldQueue
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

        $resetUrl = route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        return (new MailMessage)
            ->subject('Reset Acceptra Password')
            ->greeting("Hello, {$notifiable->name}!")
            ->line('We received a request to reset the password for your Acceptra account.')
            ->action('Reset Password', $resetUrl)
            ->line('This link is valid for **60 minutes**.')
            ->line('If you did not request a password reset, no action is needed — your account is safe.')
            ->salutation('Regards, The Acceptra Team');
    }
}
