<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetLinkShare;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;

class UserPasswordResetController extends Controller
{
    // Super Admin membagikan link reset password secara langsung (bypass email), setelah
    // menyetujui syarat & mengunggah bukti bahwa user sudah meminta reset password ini.
    // Setiap panggilan meregenerasi token asli via password broker Laravel (link lama
    // otomatis invalid) dan dicatat permanen di password_reset_link_shares.
    public function copyLink(Request $request, string $id): JsonResponse
    {
        abort_if(
            Auth::user()->role !== 'super_admin',
            403,
            'Hanya Super Admin yang dapat membagikan link reset password secara langsung.'
        );

        $validated = $request->validate([
            'agree'    => ['required', 'accepted'],
            'evidence' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'note'     => ['nullable', 'string', 'max:500'],
        ], [
            'agree.required'    => 'Anda harus menyetujui syarat & ketentuan.',
            'agree.accepted'    => 'Anda harus menyetujui syarat & ketentuan.',
            'evidence.required' => 'Bukti permintaan wajib diunggah.',
            'evidence.mimes'    => 'Bukti harus berupa gambar (jpg/png) atau PDF.',
            'evidence.max'      => 'Ukuran bukti maksimal 10MB.',
        ]);

        $user = User::findOrFail($id);

        $evidenceFile = $request->file('evidence');
        $evidencePath = $evidenceFile->store("password-reset-evidence/{$user->id}");

        $token = DB::transaction(function () use ($user, $evidencePath, $evidenceFile, $validated) {
            $token = Password::createToken($user);

            PasswordResetLinkShare::create([
                'user_id'                    => $user->id,
                'shared_by'                  => Auth::id(),
                'terms_accepted_at'          => now(),
                'evidence_path'              => $evidencePath,
                'evidence_original_filename' => $evidenceFile->getClientOriginalName(),
                'note'                       => $validated['note'] ?? null,
            ]);

            return $token;
        });

        return response()->json([
            'url' => route('password.reset', ['token' => $token, 'email' => $user->email]),
        ]);
    }

    // GET /users/{id}/password-reset-link-shares/{shareId}/evidence — Super Admin only.
    public function evidence(Request $request, string $id, string $shareId)
    {
        abort_if(Auth::user()->role !== 'super_admin', 403);

        $share = PasswordResetLinkShare::where('user_id', $id)->findOrFail($shareId);

        abort_if(! Storage::exists($share->evidence_path), 404, 'Evidence file not found.');

        return Storage::response($share->evidence_path, $share->evidence_original_filename ?? 'evidence');
    }
}
