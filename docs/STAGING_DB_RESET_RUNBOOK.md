# Staging DB Reset Runbook

Tujuan: membersihkan data transaksional di staging sebelum masuk fase production,
sambil mempertahankan `users`, `templates`, `template_levels`, `clusters`, dan
tabel roles/permissions.

## Tabel yang DIHAPUS

- `documents`
- `document_attachments`
- `approval_steps`
- `notifications`
- `audit_logs`
- `reminder_settings`
- `punchlist_verifications`
- `partners`
- `signatures`
- `cluster_approvers`

## Tabel yang DIPERTAHANKAN (jangan disentuh)

- `users`
- `templates`, `template_levels`
- `clusters`
- `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`
- Tabel infra: `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `password_reset_tokens`

> Semua foreign key dari tabel yang dihapus sudah dicek terhadap `database/migrations/`
> — tidak ada FK yang "bocor" ke tabel yang dipertahankan, jadi aman pakai satu
> `TRUNCATE ... CASCADE`.

## Konsekuensi

Karena `partners` dan `signatures` ikut dihapus:
- Semua dokumen baru butuh partner baru di-input ulang.
- Setiap user harus upload ulang tanda tangan (signature) mereka.

## Langkah Eksekusi

> **Penting:** staging jalan di Docker Compose (lihat `docs/DEPLOY_STAGING.md`) —
> `pg_dump`, `psql`, `php artisan` HARUS dijalankan lewat `docker compose exec`
> di dalam container-nya, bukan langsung di shell host. Itu sebabnya
> `pg_dump -h pgsql ...` di host gagal ("could not translate host name") —
> `pgsql` cuma resolvable di dalam network Docker.
>
> Sesuaikan flag `-f docker-compose.prod.yml` di bawah dengan setup staging
> kamu (hapus kalau staging tidak pakai overlay production), sama seperti
> catatan di `docs/DEPLOY_STAGING.md`.

Masuk dulu ke folder project di server:
```bash
cd /var/www/acceptra   # sesuaikan path staging kamu
```

### 1. Backup dulu (WAJIB — operasi ini tidak bisa di-undo)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec pgsql \
  pg_dump -U acceptra acceptra > ~/backup_acceptra_$(date +%Y%m%d_%H%M%S).sql
```

(Password tidak perlu diketik — `docker compose exec` jalan di dalam container
`pgsql`, koneksi lewat unix socket lokal yang sudah trusted, sama seperti pola
di `docs/DEPLOY_STAGING.md`.)

### 2. (Disarankan) Aktifkan maintenance mode

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan down
```

### 3. Jalankan TRUNCATE via artisan tinker

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan tinker
```

Di prompt `>>>`, paste satu baris ini lalu Enter:

```php
DB::statement("TRUNCATE TABLE document_attachments, approval_steps, punchlist_verifications, audit_logs, notifications, documents, reminder_settings, signatures, cluster_approvers, partners RESTART IDENTITY CASCADE");
```

### 4. Verifikasi (masih di dalam tinker)

```php
DB::table('documents')->count();   // harus 0
DB::table('partners')->count();    // harus 0
DB::table('users')->count();       // harus tetap ada
DB::table('templates')->count();   // harus tetap ada
DB::table('clusters')->count();    // harus tetap ada
```

Ketik `exit` untuk keluar dari tinker.

### 5. (Disarankan) Bersihkan queue

Job tertunda yang mereferensikan document/notification lama bisa error saat
diproses. Masih di tinker atau tinker baru:

```php
DB::statement("TRUNCATE TABLE jobs, failed_jobs RESTART IDENTITY");
```

### 6. Hapus file PDF/Excel di object storage (Cloudflare R2)

TRUNCATE di atas hanya menghapus baris DB — file fisik di R2 (bucket
`acceptra-web-dev`, prefix `documents/`) **tidak ikut terhapus** karena TRUNCATE
tidak memicu Eloquent events. Semua upload disimpan di bawah prefix `documents/`
(disk `s3` di `.env`, sudah dikonfigurasi ke R2): `documents/pdf/`,
`documents/excel/`, `documents/final/`, `documents/punchlist-revisions/`,
`documents/reassign-evidence/`, `documents/evidence/`.

Masih bisa pakai tinker yang sama (kredensial R2 otomatis kebaca dari `.env`,
tidak perlu install AWS CLI):

```php
Storage::disk('s3')->deleteDirectory('documents');
```

Verifikasi:

```php
Storage::disk('s3')->allFiles('documents');   // harus kosong: []
```

Fallback manual kalau command gagal: buka Cloudflare dashboard →
R2 Object Storage → bucket `acceptra-web-dev` → masuk ke `documents/` →
centang folder `excel/`, `final/`, `pdf/`, `punchlist-revisions/`, dll →
klik delete.

### 7. Matikan maintenance mode

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan up
```

## Alternatif tanpa CLI

Kalau lebih nyaman visual, pakai **TablePlus** atau **DBeaver**: connect pakai
host/port/db/user/password dari `.env`, lalu jalankan SQL `TRUNCATE` di atas
lewat query editor.
