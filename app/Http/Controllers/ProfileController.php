<?php

namespace App\Http\Controllers;

use App\Models\InvitationLinkShare;
use App\Models\Signature;
use App\Support\SignatureImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'user' => $request->user()->only('id', 'name', 'email', 'role', 'preferred_language'),
        ]);
    }

    public function updateLanguage(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $request->validate([
            'preferred_language' => 'required|in:id,en',
        ]);

        $request->user()->update([
            'preferred_language' => $request->preferred_language,
        ]);

        // Full browser reload so i18next reinitialises with the new locale (FR-I18N sequence)
        return Inertia::location(url()->previous() ?: route('dashboard'));
    }

    public function dismissGetStarted(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $request->user()->update(['has_seen_get_started' => true]);

        return response()->noContent();
    }

    // GET /profile/signature
    public function signature(Request $request): Response
    {
        $sigs = Signature::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Signature $s) => [
                'id'        => $s->id,
                'dataUrl'   => self::sigToDataUrl($s->image_path),
                'createdAt' => $s->created_at->format('d M Y'),
                'isActive'  => $s->is_active,
            ]);

        return Inertia::render('Profile/Signature', ['signatures' => $sigs]);
    }

    // POST /profile/signature
    public function storeSignature(Request $request): RedirectResponse
    {
        $request->validate(['data_url' => 'required|string']);

        $dataUrl = $request->input('data_url');
        abort_if(! str_starts_with($dataUrl, 'data:image/'), 422, 'Invalid image data.');

        $decoded = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), strict: true);
        abort_if($decoded === false, 422, 'Invalid base64 data.');

        $userId    = $request->user()->id;
        $fileToken = (string) Str::uuid7();
        // Always re-encoded and stored as PNG — normalize() strips encodings
        // (e.g. interlaced PNG) FPDF's stamper can't read.
        $path      = "signatures/{$userId}/{$fileToken}.png";

        Storage::put($path, SignatureImage::normalize($decoded));

        DB::transaction(function () use ($userId, $path) {
            Signature::where('user_id', $userId)->update(['is_active' => false]);
            Signature::create(['user_id' => $userId, 'image_path' => $path, 'is_active' => true]);
        });

        return redirect()->back()->with('success', 'Tanda tangan disimpan.');
    }

    // DELETE /profile/signature/{sig}
    public function destroySignature(Request $request, string $sigId): RedirectResponse
    {
        $sig = Signature::where('id', $sigId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        Storage::delete($sig->image_path);
        $sig->delete();

        return redirect()->back()->with('success', 'Tanda tangan dihapus.');
    }

    // PATCH /profile/signature/{sig}/activate
    public function activateSignature(Request $request, string $sigId): RedirectResponse
    {
        $userId = $request->user()->id;
        Signature::where('id', $sigId)->where('user_id', $userId)->firstOrFail();

        DB::transaction(function () use ($userId, $sigId) {
            Signature::where('user_id', $userId)->update(['is_active' => false]);
            Signature::where('id', $sigId)->update(['is_active' => true]);
        });

        return redirect()->back()->with('success', 'Tanda tangan aktif diperbarui.');
    }

    // GET /profile/invitation-history — riwayat siapa saja yang pernah membagikan link
    // undangan akun ini secara langsung (bypass email), agar user bisa mengaudit sendiri.
    // Tetap terlihat walau akun sudah aktif — tidak difilter berdasarkan status.
    public function invitationHistory(Request $request): JsonResponse
    {
        $shares = InvitationLinkShare::where('user_id', $request->user()->id)
            ->with('sharedBy:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (InvitationLinkShare $s) => [
                'id'             => $s->id,
                'shared_by_name' => $s->sharedBy->name,
                'created_at'     => $s->created_at->toISOString(),
                'note'           => $s->note,
            ]);

        return response()->json(['data' => $shares]);
    }

    // GET /profile/invitation-history/{shareId}/evidence — hanya milik user sendiri.
    public function invitationHistoryEvidence(Request $request, string $shareId)
    {
        $share = InvitationLinkShare::where('user_id', $request->user()->id)->findOrFail($shareId);

        abort_if(! Storage::exists($share->evidence_path), 404, 'Evidence file not found.');

        return Storage::response($share->evidence_path, $share->evidence_original_filename ?? 'evidence');
    }

    public static function sigToDataUrl(string $path): string
    {
        if (! Storage::exists($path)) {
            return '';
        }
        $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'gif'         => 'image/gif',
            'webp'        => 'image/webp',
            default       => 'image/png',
        };

        return "data:{$mime};base64," . base64_encode(Storage::get($path));
    }
}
