# Deploy Update ke Staging (branch `dev`)

Panduan ini untuk **update** staging server yang sudah jalan (bukan setup dari nol — untuk fresh install lihat `docs/DEPLOYMENT.md`). Dipakai tiap kali ada perubahan baru di branch `dev` yang perlu ditarik ke staging.

> Sesuaikan flag `-f docker-compose.prod.yml` di bawah kalau staging Anda **tidak** pakai overlay production (mis. staging tanpa SSL Cloudflare Origin Cert). Kalau staging Anda cuma pakai `docker-compose.yml` polos, hapus bagian `-f docker-compose.prod.yml` dari semua command.

---

## 0. Sebelum mulai — backup

Jangan skip ini. Migration di update terakhir mengubah skema tabel `users` dan `documents`.

```bash
cd /var/www/acceptra   # sesuaikan path staging Anda

# Backup database
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec pgsql \
  pg_dump -U acceptra acceptra > ~/backup_acceptra_$(date +%Y%m%d_%H%M%S).sql

# Backup .env (jaga-jaga kalau ada override lokal yang beda dari .env.example)
cp .env ~/env_backup_$(date +%Y%m%d_%H%M%S)
```

---

## 1. Cek status sebelum pull

```bash
git status
git branch --show-current
```

- Pastikan **tidak ada perubahan lokal yang belum di-commit** di server (kalau ada, itu biasanya tidak sengaja — jangan pull sebelum dikonfirmasi apakah perubahan itu perlu disimpan).
- Pastikan branch aktif adalah `dev`. Kalau belum:
  ```bash
  git checkout dev
  ```

## 2. Pull perubahan terbaru

```bash
git fetch origin
git pull origin dev
```

Perhatikan output `git pull` — catat file apa saja yang berubah, khususnya:
- Ada file baru di `database/migrations/` → berarti **wajib migrate** (langkah 6).
- `docker/php/Dockerfile` berubah → **wajib rebuild image** (langkah 3).
- `composer.json`/`composer.lock` berubah → wajib `composer install` (langkah 4).
- `package.json`/`package-lock.json` berubah → wajib `npm ci && npm run build` (langkah 5).

## 3. Rebuild image kalau ada perubahan Dockerfile

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build app queue scheduler
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d app queue scheduler
```

> **Kenapa ini penting:** kalau Dockerfile berubah (mis. nambah package sistem) tapi container tidak di-rebuild, container lama tetap jalan dengan image lama — perubahan Dockerfile-nya tidak akan pernah kepakai sampai di-rebuild eksplisit. Ini pernah kejadian di local: `ghostscript` sudah didaftarkan di Dockerfile tapi container yang jalan belum ter-rebuild, sehingga fitur generate PDF gagal total sampai di-rebuild manual. Jangan asumsikan `git pull` saja cukup untuk perubahan Dockerfile.

## 4. Update dependency PHP (kalau composer.json berubah)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app composer install --no-dev --optimize-autoloader
```

## 5. Update dependency frontend & build ulang aset (kalau package.json / kode `resources/js` berubah)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app npm ci --legacy-peer-deps
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app npm run build
```

## 6. Jalankan migration

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan migrate --force
```

Migration yang perlu jalan di update ini (contoh dari perubahan terakhir — cek `git log` untuk daftar migration terbaru sebenarnya):
- `add_previous_pdf_to_documents_table` — kolom untuk fitur banding PDF lama-vs-revisi di layar approval.
- `add_has_seen_get_started_to_users_table` — kolom untuk modal "Get Started".

Cek semua migration sudah jalan:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan migrate:status
```
Semua baris harus berstatus `Ran`, tidak ada yang `Pending`.

## 7. Refresh cache Laravel

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan config:clear
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan config:cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan route:cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan view:cache
```

> Kalau ada perubahan di `.env` (env var baru), jalankan `config:clear` dulu baru `config:cache` — kalau cuma `config:cache` saja tanpa clear, nilai lama yang sudah ke-cache bisa masih kepakai.

## 8. Restart queue worker & scheduler

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart queue scheduler
```

> **Wajib**, bukan opsional. `queue:work` itu proses PHP yang jalan terus-menerus (long-running) — dia memuat kode aplikasi sekali saat start dan tidak otomatis reload walau file berubah di disk. Kalau tidak di-restart, job yang diproses di background (notifikasi, dsb.) masih pakai kode versi lama.

## 9. Cek semua container sehat

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```
Semua service harus `Up` (dan `healthy` untuk yang punya healthcheck: `pgsql`, `redis`).

---

## 10. Verifikasi — pastikan semua benar-benar berjalan baik

Jangan anggap deploy selesai cuma karena container `Up`. Cek satu-satu:

### a. Aplikasi bisa diakses & login normal
```bash
curl -I https://staging.acceptra.id/login   # sesuaikan domain staging
```
Harus `200` atau `302`. Buka di browser, pastikan halaman login tampil, login dengan akun test berhasil.

### b. Tidak ada error di log
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app tail -100 storage/logs/laravel.log
```
Cek juga log container langsung kalau ada 500:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs app --tail 100
```

### c. Timezone benar (WIB, bukan UTC)
Buka tab **Audit Trail** atau bagian **Notifikasi** di aplikasi — jam yang tampil harus sesuai waktu Jakarta saat ini, bukan mundur 7 jam. Ini pernah jadi bug tersembunyi karena `AuditLog`/`InAppNotification`/`DocumentAttachment` mengandalkan default `CURRENT_TIMESTAMP` Postgres yang berjalan di UTC.

### d. Generate PDF & tanda tangan jalan (butuh Ghostscript + akses storage)
1. Buka dokumen yang approval-nya sudah ada tanda tangan tersimpan.
2. Buka/download PDF-nya (`/documents/{id}/pdf`).
3. Pastikan PDF terbuka normal dan tanda tangan ter-embed dengan benar (bukan error 500, bukan PDF kosong).
4. Kalau staging pakai `FILESYSTEM_DISK=s3`, cek juga file `documents/final/{id}.pdf` benar-benar muncul di bucket R2 staging (lewat dashboard Cloudflare R2 atau `aws s3 ls` kalau ada CLI terkonfigurasi).

### e. Alur reject → revisi → dual-PDF di approval
1. Reject dokumen sebagai approver (L2/L3/L4).
2. Sebagai admin/partner, revisi dokumen tsb — pastikan cuma field PDF (dan Excel) yang bisa diubah, field lain terkunci.
3. Buka lagi sebagai approver yang tadi reject — pastikan tampilan approval menunjukkan 2 PDF berdampingan (PDF lama yang ditolak vs PDF revisi terbaru).

### f. Modal "Get Started" setelah login
Logout, login lagi dengan user yang belum pernah lihat modal ini (`has_seen_get_started = false`) — pastikan modal muncul, link ke User Guide/FAQ jalan, dan ceklis "jangan tampilkan lagi" berfungsi (dicentang → tidak muncul lagi di login berikutnya).

### g. Queue & scheduler benar-benar jalan
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs queue --tail 50
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs scheduler --tail 50
```
Tidak ada error crash-loop di kedua log ini.

---

## 11. Kalau ada yang gagal — rollback

```bash
# Kembalikan kode ke commit sebelumnya
git log --oneline -5        # cari hash commit sebelum pull tadi
git checkout <hash_commit_lama>

# Rebuild & restart kalau tadi sempat rebuild image
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Kalau migration tadi bermasalah dan datanya perlu dikembalikan
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T pgsql \
  psql -U acceptra acceptra < ~/backup_acceptra_<timestamp>.sql
```

Setelah rollback, kembali ke branch `dev` lagi (`git checkout dev`) begitu masalahnya sudah diperbaiki di kode, baru ulangi dari langkah 2.

---

## Referensi terkait

- `docs/DEPLOYMENT.md` — setup awal server dari nol (VPS, Cloudflare, first deploy).
- `docs/FR-PDF-S3.md` — detail teknis kenapa `PdfSignatureService` butuh Ghostscript & kompatibilitas S3/R2.
