# Deploy Update ke Staging (branch `dev`)

Panduan ini untuk **update** staging server yang sudah jalan (bukan setup dari nol — untuk fresh install lihat `docs/DEPLOYMENT.md`). Dipakai tiap kali ada perubahan baru di branch `dev` yang perlu ditarik ke staging.

> Sesuaikan flag `-f docker-compose.prod.yml` di bawah kalau staging Anda **tidak** pakai overlay production (mis. staging tanpa SSL Cloudflare Origin Cert). Kalau staging Anda cuma pakai `docker-compose.yml` polos, hapus bagian `-f docker-compose.prod.yml` dari semua command.

---

## Ringkasan untuk update kali ini (`dev` @ `541a379`, PR #17 → #18)

Perubahan: perbaikan alur draft/submit dokumen, tanda tangan approver yang hilang saat reject→resubmit, punchlist verification yang tidak muncul di list approval/dashboard, dan ukuran font overlay PDF (Status/Punchlist). Detail lengkap ada di PR [#17](https://github.com/ferdyalwondho/acceptra-web/pull/17).

Dicek dari diff `origin/main..origin/dev` — hanya `app/` (PHP) dan `resources/js/` (frontend) yang berubah:

| Langkah | Perlu dijalankan? |
|---|---|
| 3. Rebuild image | **Tidak** — `docker/php/Dockerfile` tidak berubah |
| 4. `composer install` | **Tidak** — `composer.json`/`composer.lock` tidak berubah |
| 5. `npm ci && npm run build` | **Ya** — banyak file `resources/js/**` berubah |
| 6. `php artisan migrate` | **Tidak** — tidak ada file baru di `database/migrations/` |
| 7. Refresh cache | **Ya** — ada route baru (`documents.submit`) di `routes/web.php` |
| 8. Restart `app`, `queue`, `scheduler` | **Ya, ketiganya** — lihat catatan penting di langkah 8 |

Kalau update berikutnya beda isinya, cek ulang tabel ini pakai `git diff origin/main..origin/dev --stat` dan sesuaikan.

---

## 0. Sebelum mulai — backup

Jangan skip ini walau update kali ini tidak membawa migration baru — tetap backup sebagai jaring pengaman standar sebelum pull kode baru ke staging.

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

**Update kali ini tidak ada migration baru** (`git diff origin/main..origin/dev -- database/migrations/` kosong) — langkah ini boleh dilewati. Tetap jalankan perintah di atas kalau ragu; `migrate` aman dipanggil berkali-kali (no-op kalau tidak ada yang pending).

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

## 8. Restart `app`, queue worker, scheduler & nginx

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart app queue scheduler nginx
```

> **Keempatnya wajib**, bukan cuma `queue scheduler`. Alasannya beda-beda:
> - `queue` & `scheduler` menjalankan proses PHP yang long-running (`queue:work`, loop `schedule:run`) — kode aplikasi dimuat sekali saat start dan tidak reload otomatis walau file di disk berubah. Kalau tidak di-restart, job background (notifikasi, dsb.) masih pakai kode versi lama.
> - `app` (PHP-FPM, yang melayani request web) **juga wajib** kalau staging pakai `PHP_INI=prod.ini` — cek `docker/php/prod.ini`, di situ `opcache.validate_timestamps = 0`. Artinya OPcache tidak mengecek apakah file berubah di disk sama sekali; ia terus menyajikan bytecode lama yang sudah di-cache sampai proses PHP-FPM-nya direstart. Ini beda dengan `local.ini` (dipakai kalau `PHP_INI` tidak di-set) yang `validate_timestamps = 1` — auto-reload tiap ada perubahan file, tapi lebih lambat sehingga tidak dipakai di production. **Kalau langkah ini di-skip, seluruh perbaikan kode di update ini tidak akan pernah kepakai user, walau `git pull` sudah sukses dan container `app` tetap `Up`.**
> - **`nginx` juga wajib direstart setiap kali container `app` di-recreate** (`docker compose ... up -d` atau `restart app` — bukan cuma reload config). `docker/nginx/prod.conf` dan `docker/nginx/default.conf` pakai `fastcgi_pass app:9000;` sebagai hostname literal tanpa `resolver` directive — nginx me-resolve nama `app` ke IP container **cuma sekali saat nginx start**, lalu IP itu di-cache selama proses nginx berjalan. Kalau container `app` di-recreate (dapat IP baru di Docker network) tapi nginx tidak ikut direstart, nginx masih coba connect ke IP lama yang sudah tidak ada → **502 Bad Gateway**, walau container `app` sendiri sehat dan `ready to handle connections` di log-nya. Ini gejala paling umum kalau abis deploy tiba-tiba 502: cek `docker compose ps` — kalau `nginx` uptime-nya jauh lebih lama dari `app`, itu tandanya.

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
curl -I https://acceptra.id/login   # sesuaikan domain staging
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
4. Cek overlay teks "Status" dan "Punchlist" (kalau dokumennya ada) muat rapi di dalam kotak placement-nya — tidak tumpah/melebar ke luar kotak. Ini baru diperbaiki di update ini (font sekarang menyesuaikan lebar box, bukan cuma tinggi).
5. Kalau staging pakai `FILESYSTEM_DISK=s3`, cek juga file `documents/final/{id}.pdf` benar-benar muncul di bucket R2 staging (lewat dashboard Cloudflare R2 atau `aws s3 ls` kalau ada CLI terkonfigurasi).

### e. Alur reject → revisi → dual-PDF, dan tanda tangan level sebelumnya tidak hilang
1. Reject dokumen sebagai approver (mis. L3).
2. Sebagai admin/partner, revisi dokumen tsb — pastikan cuma field PDF (dan Excel) yang bisa diubah, field lain terkunci.
3. Buka lagi sebagai approver yang tadi reject — pastikan tampilan approval menunjukkan 2 PDF berdampingan (PDF lama yang ditolak vs PDF revisi terbaru).
4. Setelah resubmit, generate ulang PDF-nya (`/documents/{id}/pdf`) — pastikan tanda tangan level **sebelum** L3 (mis. L1, L2 yang sudah approve duluan) **masih muncul**, bukan hilang. Ini bug yang baru diperbaiki di update ini — sebelumnya tanda tangan level yang sudah approve ikut hilang tiap kali ada resubmit setelah reject.

### f. Draft submit flow & punchlist verification
1. Buat/lihat dokumen berstatus `draft` — pastikan yang muncul cuma 2 tombol: **Edit** dan **Submit Approval** (tombol Reassign harus tersembunyi untuk status draft).
2. Buka Edit, ubah salah satu field metadata saja (jangan ganti PDF), klik **Simpan Draft** — buka lagi Edit-nya, pastikan PIC L2 ke atas yang sudah dipilih sebelumnya **tidak hilang**.
3. Untuk dokumen yang lagi menunggu verifikasi punchlist (status `15`): login sebagai approver yang perlu verifikasi, cek dokumennya **muncul** di halaman `/approvals` dan di tabel "Perlu Tindakan" pada dashboard approver — sebelum update ini keduanya kosong walau approver-nya sebenarnya punya verifikasi pending.
4. Buka halaman verifikasi punchlist-nya — pastikan PDF revisi punchlist tampil langsung (embed) di preview utama dengan label "PDF Revisi Punchlist", dan PDF utama cuma jadi kotak download terpisah berlabel "PDF Utama".

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
