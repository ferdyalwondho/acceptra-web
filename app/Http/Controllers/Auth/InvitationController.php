<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Inertia;
use Inertia\Response;

class InvitationController extends Controller
{
    // FR-AUTH-05: aktivasi akun via invitation token
    public function show(string $token): Response
    {
        $user = User::where('invitation_token', $token)->first();

        $expired = ! $user || $user->invitation_expires_at->isPast();

        return Inertia::render('Auth/Invitation', [
            'token'   => $token,
            'name'    => $user?->name ?? '',
            'email'   => $user?->email ?? '',
            'expired' => $expired,
        ]);
    }

    public function activate(Request $request, string $token): RedirectResponse
    {
        $user = User::where('invitation_token', $token)->first();

        if (! $user || $user->invitation_expires_at->isPast()) {
            return back()->withErrors(['token' => 'Link undangan tidak valid atau sudah kedaluwarsa.']);
        }

        $request->validate([
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ], [
            'password.required'  => 'Password harus diisi.',
            'password.min'       => 'Password minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
        ]);

        $user->forceFill([
            'password'               => $request->password,
            'invitation_token'       => null,
            'invitation_expires_at'  => null,
            'status'                 => 'active',
            'email_verified_at'      => now(),
        ])->save();

        Auth::login($user);
        $request->session()->regenerate();

        return redirect($user->redirectRoute());
    }
}
