<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class ForgotPasswordController extends Controller
{
    public function showLinkRequestForm(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    // FR-AUTH-04: response selalu sama untuk privacy (tidak bocorkan email terdaftar/tidak)
    public function sendResetLinkEmail(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'Email harus diisi.',
            'email.email'    => 'Format email tidak valid.',
        ]);

        Password::sendResetLink($request->only('email'));

        return back()->with('status', 'Jika email Anda terdaftar, link reset password telah dikirimkan.');
    }
}
