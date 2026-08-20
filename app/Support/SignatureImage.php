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
        $image = @imagecreatefromstring($decodedBytes);
        if ($image === false) {
            return $decodedBytes;
        }

        try {
            imagealphablending($image, false);
            imagesavealpha($image, true);
            imageinterlace($image, 0);

            ob_start();
            imagepng($image);
            $png = ob_get_clean();

            return $png !== false && $png !== '' ? $png : $decodedBytes;
        } finally {
            imagedestroy($image);
        }
    }
}
