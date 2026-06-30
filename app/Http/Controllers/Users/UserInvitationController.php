<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\InvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class UserInvitationController extends Controller
{
    // FR-AUTH-06: Admin/Super Admin kirim ulang undangan yang kedaluwarsa
    public function resend(Request $request, string $id): RedirectResponse
    {
        abort_if(
            ! in_array(Auth::user()->role, ['super_admin', 'admin']),
            403,
            'Hanya Admin atau Super Admin yang dapat mengirim ulang undangan.'
        );

        $user = User::findOrFail($id);

        $token = Str::random(64);

        $user->forceFill([
            'invitation_token'      => $token,
            'invitation_expires_at' => now()->addHours(72),
        ])->save();

        $user->notify(new InvitationNotification($token));

        return redirect()->route('users.edit', $user->id)
            ->with('status', 'Undangan berhasil dikirim ulang.');
    }
}
