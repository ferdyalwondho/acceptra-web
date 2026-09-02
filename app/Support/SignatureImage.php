<?php

namespace App\Support;

class SignatureImage
{
    /**
     * Re-encodes decoded image bytes as a clean, non-interlaced baseline PNG.
     * FPDF's built-in image decoder can't read interlaced PNGs (or some
     * progressive/exotic JPEG/GIF variants) at all — it throws mid-stamping,
     * which currently aborts the *entire* PDF's stamping (see
     * PdfSignatureService::buildOverlay()). Normalizing every signature to a
     * plain PNG here, once, at save time, means a file we already accepted
     * can never trip that up later.
     *
     * Falls back to the original bytes if GD can't decode them — an approval
     * must never fail outright just because this optional cleanup step
     * couldn't run.
     */
    public static function normalize(string $decodedBytes): string
    {
        try {
            return self::normalizeWithExtension($decodedBytes)['bytes'];
        } catch (\InvalidArgumentException) {
            return $decodedBytes;
        }
    }

    /**
     * Like normalize(), but also returns the file extension the bytes should be
     * stored under, so a caller never saves (say) JPEG bytes to a ".png" path.
     *
     * - GD can decode it        → re-encoded baseline PNG, ext "png".
     * - GD can't decode it, but
     *   it's a recognisable image → original bytes kept, ext matched to the
     *                               real content ("png" / "jpg" / "gif") so the
     *                               PDF stamper can still pick the right type.
     * - Otherwise                → InvalidArgumentException; the caller should
     *                               surface a 422 rather than store garbage.
     *
     * @return array{bytes: string, ext: string}
     */
    public static function normalizeWithExtension(string $decodedBytes): array
    {
        $image = @imagecreatefromstring($decodedBytes);

        if ($image !== false) {
            try {
                imagealphablending($image, false);
                imagesavealpha($image, true);
                imageinterlace($image, 0);

                ob_start();
                imagepng($image);
                $png = ob_get_clean();
            } finally {
                imagedestroy($image);
            }

            if ($png !== false && $png !== '') {
                return ['bytes' => $png, 'ext' => 'png'];
            }
        }

        // GD couldn't decode/re-encode — keep the original bytes, but pin the
        // extension to whatever the content actually is.
        $info = @getimagesizefromstring($decodedBytes);
        $ext  = match ($info['mime'] ?? null) {
            'image/png'  => 'png',
            'image/jpeg' => 'jpg',
            'image/gif'  => 'gif',
            default      => null,
        };

        if ($ext === null) {
            throw new \InvalidArgumentException('Unsupported signature image format.');
        }

        return ['bytes' => $decodedBytes, 'ext' => $ext];
    }
}
