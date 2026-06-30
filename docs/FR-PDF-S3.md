# Technical Debt: FR-PDF-S3 — PdfSignatureService S3 Compatibility

| | |
|---|---|
| **Document Version** | v1.0 |
| **FR Group ID** | FR-PDF-S3 |
| **FR Group Name** | PDF Generation S3 Compatibility |
| **Status** | Backlog — Required before production deploy with S3 |
| **Last Updated** | 2026-06-30 |
| **Author** | System Analyst AI |
| **Depends On** | FR-ARC (storage), Cloudflare R2 production config |

---

## 1. Background

Saat dilakukan cleanup storage hardcode (2026-06-30), semua operasi file diubah dari `Storage::disk('local')` ke default disk (`FILESYSTEM_DISK` dari env). Namun **`PdfSignatureService`** dikecualikan karena memiliki ketergantungan pada absolute filesystem path.

Service ini menggunakan:
- **Ghostscript** — tool CLI untuk normalisasi PDF, membutuhkan path file sungguhan di disk
- **FPDI** — library PHP untuk embed tanda tangan ke PDF, baca file via `fopen()` / path absolut

Keduanya tidak bisa menerima path S3 atau stream dari cloud storage.

---

## 2. Kondisi Saat Ini

```php
// PdfSignatureService.php — sengaja tetap 'local', JANGAN diubah sebelum refactor ini selesai
$disk        = Storage::disk('local');
$originalRel = $document->original_pdf_path;

// Path ini dibutuhkan Ghostscript dan FPDI
$absPath = $disk->path($originalRel);  // → /var/www/storage/app/private/documents/pdf/xxx.pdf
```

**File yang terdampak:**
- [app/Services/PdfSignatureService.php](../app/Services/PdfSignatureService.php)

**Method yang perlu diubah:**
- `getPdfPath()` — baca PDF asli, return absolute path
- `generate()` — tulis PDF final, upload ke storage

---

## 3. Target Arsitektur (Setelah Refactor)

```
S3/R2 (original PDF) → Download ke /tmp → Ghostscript → FPDI → Upload ke S3/R2
```

Alur per request:
1. Download `original_pdf_path` dari default disk ke file temp lokal
2. Jalankan Ghostscript pada file temp
3. FPDI baca hasil Ghostscript, embed tanda tangan
4. Upload PDF final ke default disk (`documents/final/{id}.pdf`)
5. Hapus semua file temp
6. Update `documents.final_pdf_path`

---

## 4. Rencana Implementasi

### 4.1 Method `getPdfPath()` — Refactor

**Sekarang:**
```php
public function getPdfPath(Document $document): string
{
    $disk        = Storage::disk('local');
    $originalRel = $document->original_pdf_path;

    if (! $originalRel || ! $disk->exists($originalRel)) {
        abort(404, 'PDF not found.');
    }

    if ($document->final_pdf_path && $disk->exists($document->final_pdf_path)) {
        return $disk->path($document->final_pdf_path);
    }

    try {
        $finalPath = $this->generate($document, $disk->path($originalRel));
        return $finalPath;
    } catch (\Throwable) {
        return $disk->path($originalRel);
    }
}
```

**Target (setelah refactor):** Method ini tidak lagi return absolute path. Controller perlu diubah juga untuk stream dari storage, bukan serve dari path.

```php
public function streamPdf(Document $document): \Symfony\Component\HttpFoundation\StreamedResponse
{
    if (! $document->original_pdf_path || ! Storage::exists($document->original_pdf_path)) {
        abort(404, 'PDF not found.');
    }

    // Coba generate/gunakan cached final PDF
    $finalKey = "documents/final/{$document->id}.pdf";
    if (! $document->final_pdf_path || ! Storage::exists($finalKey)) {
        $this->generateAndUpload($document);
    }

    $key = $document->final_pdf_path ?? $document->original_pdf_path;
    return Storage::response($key, basename($key), ['Content-Type' => 'application/pdf']);
}
```

### 4.2 Method `generate()` — Rename ke `generateAndUpload()`

```php
private function generateAndUpload(Document $document): void
{
    // 1. Download original PDF dari storage ke temp
    $tempInput = tempnam(sys_get_temp_dir(), 'acc_orig_') . '.pdf';
    file_put_contents($tempInput, Storage::get($document->original_pdf_path));

    // 2. Ghostscript normalisasi
    $tempParsable = $this->decompressPdf($tempInput);

    // 3. FPDI embed tanda tangan (proses tetap sama, hasilnya ke temp output)
    $tempOutput = tempnam(sys_get_temp_dir(), 'acc_final_') . '.pdf';
    $this->embedSignatures($document, $tempParsable, $tempOutput);

    // 4. Upload hasil ke default disk
    $relPath = "documents/final/{$document->id}.pdf";
    Storage::put($relPath, file_get_contents($tempOutput));
    $document->update(['final_pdf_path' => $relPath]);

    // 5. Cleanup temp files
    @unlink($tempInput);
    @unlink($tempParsable);
    @unlink($tempOutput);
}
```

### 4.3 Controller `documents.pdf` Route

Controller yang serve PDF saat ini memanggil `$service->getPdfPath()` dan memakai `response()->file()`. Perlu diubah ke `$service->streamPdf()` yang return `StreamedResponse`.

Cek controller di: [app/Http/Controllers/Documents/DocumentController.php](../app/Http/Controllers/Documents/DocumentController.php) (cari route `documents.pdf`).

---

## 5. File yang Perlu Diubah

| File | Perubahan |
|---|---|
| `app/Services/PdfSignatureService.php` | Refactor `getPdfPath()` + `generate()` ke pattern download-process-upload |
| Controller yang handle route `documents.pdf` | Ganti `response()->file($path)` ke `StreamedResponse` |

---

## 6. Verifikasi

1. Upload dokumen PDF → cek tersimpan di Cloudflare R2 bucket
2. Buka halaman detail dokumen → PDF preview tampil normal
3. Approver approve dengan tanda tangan → cek PDF final ter-generate dan masuk R2 di path `documents/final/{id}.pdf`
4. Download PDF final → pastikan tanda tangan ter-embed
5. Jalankan di local dengan `FILESYSTEM_DISK=local` → pastikan tidak ada regresi

---

## 7. Catatan Penting

- **Jangan deploy ke production dengan `FILESYSTEM_DISK=s3` sebelum refactor ini selesai.** PDF generation akan gagal.
- Fitur lain (upload dokumen, tanda tangan profil, download attachment) sudah kompatibel S3 sejak 2026-06-30.
- `decompressPdf()` bergantung pada Ghostscript (`gs`) terinstall di server — pastikan tersedia di production environment.
- Pertimbangkan caching: jika `final_pdf_path` sudah ada di S3, skip regenerasi.
