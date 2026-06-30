<?php

namespace App\Http\Controllers;

use App\Models\Signature;
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

        preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $m);
        $ext     = in_array($m[1] ?? '', ['png', 'jpeg', 'jpg', 'gif', 'webp']) ? ($m[1] === 'jpeg' ? 'jpg' : $m[1]) : 'png';
        $decoded = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), strict: true);
        abort_if($decoded === false, 422, 'Invalid base64 data.');

        $userId    = $request->user()->id;
        $fileToken = (string) Str::uuid7();
        $path      = "signatures/{$userId}/{$fileToken}.{$ext}";

        Storage::disk('local')->put($path, $decoded);

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

        Storage::disk('local')->delete($sig->image_path);
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

    public static function sigToDataUrl(string $path): string
    {
        $disk = Storage::disk('local');
        if (! $disk->exists($path)) {
            return '';
        }
        $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'gif'         => 'image/gif',
            'webp'        => 'image/webp',
            default       => 'image/png',
        };

        return "data:{$mime};base64," . base64_encode($disk->get($path));
    }
}
