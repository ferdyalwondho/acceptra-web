<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Models\InvitationLinkShare;
use App\Models\User;
use App\Notifications\InvitationNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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

    // Super Admin membagikan link undangan secara langsung (bypass email), setelah
    // menyetujui syarat & mengunggah bukti bahwa user sudah mengizinkan aksi ini.
    // Setiap panggilan meregenerasi token (link lama otomatis invalid) dan dicatat
    // permanen di invitation_link_shares — history-nya tetap terlihat setelah aktif.
    public function copyLink(Request $request, string $id): JsonResponse
    {
        abort_if(
            Auth::user()->role !== 'super_admin',
            403,
            'Hanya Super Admin yang dapat membagikan link undangan secara langsung.'
        );

        $validated = $request->validate([
            'agree'    => ['required', 'accepted'],
            'evidence' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'note'     => ['nullable', 'string', 'max:500'],
        ], [
            'agree.required'    => 'Anda harus menyetujui syarat & ketentuan.',
            'agree.accepted'    => 'Anda harus menyetujui syarat & ketentuan.',
            'evidence.required' => 'Bukti persetujuan wajib diunggah.',
            'evidence.mimes'    => 'Bukti harus berupa gambar (jpg/png) atau PDF.',
            'evidence.max'      => 'Ukuran bukti maksimal 10MB.',
        ]);

        $user  = User::findOrFail($id);
        $token = Str::random(64);

        $evidenceFile = $request->file('evidence');
        $evidencePath = $evidenceFile->store("invitation-evidence/{$user->id}");

        DB::transaction(function () use ($user, $token, $evidencePath, $evidenceFile, $validated) {
            $user->forceFill([
                'invitation_token'      => $token,
                'invitation_expires_at' => now()->addHours(72),
            ])->save();

            InvitationLinkShare::create([
                'user_id'                    => $user->id,
                'shared_by'                  => Auth::id(),
                'token'                      => $token,
                'terms_accepted_at'          => now(),
                'evidence_path'              => $evidencePath,
                'evidence_original_filename' => $evidenceFile->getClientOriginalName(),
                'note'                       => $validated['note'] ?? null,
            ]);
        });

        return response()->json(['url' => route('invitation.show', $token)]);
    }

    // GET /users/{id}/invitation-link-shares/{shareId}/evidence — Super Admin only.
    public function evidence(Request $request, string $id, string $shareId)
    {
        abort_if(Auth::user()->role !== 'super_admin', 403);

        $share = InvitationLinkShare::where('user_id', $id)->findOrFail($shareId);

        abort_if(! Storage::exists($share->evidence_path), 404, 'Evidence file not found.');

        return Storage::response($share->evidence_path, $share->evidence_original_filename ?? 'evidence');
    }
}
