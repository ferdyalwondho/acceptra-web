<?php

namespace App\Http\Controllers\Partners;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use App\Models\User;
use App\Notifications\InvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PartnerInvitationController extends Controller
{
    // FR-AUTH-06: Kirim ulang undangan ke PIC partner
    public function resend(Request $request, string $partnerId, string $userId): RedirectResponse
    {
        abort_if(! in_array($request->user()->role, ['admin', 'super_admin']), 403);

        $partner = Partner::findOrFail($partnerId);

        $user = User::where('id', $userId)
            ->where('partner_id', $partner->id)
            ->whereNull('deleted_at')
            ->firstOrFail();

        if ($user->email_verified_at !== null) {
            return back()->with('error', 'Akun sudah aktif. Tidak perlu kirim ulang undangan.');
        }

        $token = Str::random(64);

        $user->update([
            'invitation_token'      => $token,
            'invitation_expires_at' => now()->addHours(72),
        ]);

        $user->notify(new InvitationNotification($token));

        return redirect()->route('partners.edit', $partnerId)
            ->with('status', 'Undangan berhasil dikirim ulang.');
    }
}
