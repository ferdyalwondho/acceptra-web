# Runbook: Bulk Import User (Approver + Cluster) via Excel

Panduan ini untuk menjalankan import ~100 user approver (beserta assignment cluster-nya) di server staging/production, menggunakan `php artisan users:import`. Ditulis untuk dijalankan langsung oleh Anda di server — bukan panduan development.

> Sesuaikan nama container (`acceptra_app`, dst) kalau di server Anda beda dari yang dipakai di sini. Cek dengan `docker compose ps` kalau ragu.

---

## 0. Sebelum mulai

- Command ini **aman dijalankan ulang** pada file yang sama — baris yang emailnya sudah terdaftar otomatis dilewati (tidak akan bikin user dobel). Jadi kalau di tengah proses ada gangguan, tinggal jalankan ulang command yang sama.
- Command ini **mengirim email undangan** ke tiap user baru (lewat queue) — pastikan sudah yakin data di file sebelum menjalankan tanpa `--dry-run`, karena mengirim ulang ke orang yang salah bukan sesuatu yang gampang dibatalkan.

## 1. Deploy kode

```bash
cd /var/www/acceptra   # sesuaikan path server Anda
git pull origin main   # atau branch yang sesuai
```

Untuk update ini: **tidak ada migration baru** dan **tidak ada perubahan composer.json/npm** — jadi `php artisan migrate`, rebuild image, dan `npm run build` semuanya bisa dilewati. Yang penting `public/exports/user_import_template.xlsx` (file statis biasa) ikut ter-deploy bersama kode — cek dengan:

```bash
ls -la public/exports/user_import_template.xlsx
```

> File ini sengaja ditaruh di `public/exports/`, bukan `public/templates/` — folder `public/templates/` pernah dipakai dan bikin nginx balikin 403 di route `/templates` (halaman Template/SOW), karena `try_files $uri $uri/ ...` nemu folder fisik itu duluan sebelum sempat fallback ke `index.php`. Jangan taruh file statis apapun di `public/` dengan nama folder yang sama dengan segment pertama route Laravel manapun (`templates`, `users`, `documents`, dst).

## 2. Ambil template, kirim ke admin untuk diisi

Karena file-nya ada di `public/`, bisa langsung diakses lewat browser tanpa perlu route/fitur tambahan:

```
https://domain-anda.com/exports/user_import_template.xlsx
```

Download, kirim ke admin untuk diisi. Format kolom (lihat juga sheet "Referensi Role" di dalam file itu sendiri):

| Kolom | Isi |
|---|---|
| Nama | Nama lengkap approver |
| Email | Email approver (harus unik, belum pernah dipakai) |
| Role | Kode mentah, salah satu dari 6 kode approver (lihat sheet "Referensi Role") |
| Cluster | Nama cluster saja (tanpa provinsi), pisahkan dengan `;` kalau lebih dari satu |

## 3. Terima file yang sudah diisi, upload ke server

```bash
# Dari komputer Anda (bukan di server) — sesuaikan path & host server
scp user_import_filled.xlsx user@staging-server:/tmp/users_filled.xlsx
```

## 4. Copy file ke dalam container app

```bash
docker cp /tmp/users_filled.xlsx acceptra_app:/tmp/users_filled.xlsx
```

## 5. Jalankan dry-run dulu — WAJIB sebelum lanjut

```bash
docker exec acceptra_app php artisan users:import /tmp/users_filled.xlsx --dry-run
```

Baca ringkasannya baik-baik:
- Berapa user yang akan dibuat.
- Berapa yang dilewati karena email sudah terdaftar / role tidak valid.
- Cluster mana saja yang tidak ketemu namanya, atau ambigu (nama sama ada di lebih dari 1 provinsi).

**Jangan lanjut ke langkah berikutnya sebelum angka-angka ini masuk akal.** Kalau ada yang aneh (mis. banyak cluster "tidak ditemukan"), cek dulu apakah cluster-cluster itu sudah diimport lewat menu Approver Region — kalau belum, import cluster-nya dulu baru lanjut import user.

## 6. Pastikan queue worker jalan

```bash
docker compose ps
```

Pastikan container `acceptra_queue` statusnya `Up` — ini yang mengirim ~100 email undangan di belakang layar. Kalau mati, restart dulu (`docker compose restart queue` atau sesuai nama service Anda) sebelum lanjut.

## 7. Jalankan beneran (tanpa `--dry-run`)

```bash
docker exec acceptra_app php artisan users:import /tmp/users_filled.xlsx
```

Baca ringkasan akhir yang tercetak — sama formatnya dengan dry-run, tapi kali ini datanya benar-benar tersimpan dan email benar-benar terkirim (lewat queue).

## 8. Verifikasi hasil

- Buka menu **Users** — jumlah user baru sesuai ringkasan, semua berstatus **Invitation Pending**.
- Buka menu **Approver Region** — cek beberapa cluster untuk pastikan PIC-nya sudah ter-assign sesuai file.
- Cek log queue tidak ada error email masif:
  ```bash
  docker exec acceptra_app tail -n 100 storage/logs/laravel.log
  ```

## 9. Kalau ada baris yang gagal/ambigu

Baris yang dilaporkan "cluster tidak ditemukan" atau "cluster ambigu" **tetap membuat user-nya** — cuma assignment cluster untuk baris itu yang di-skip. Perbaiki manual lewat menu **Users** (edit user tsb, assign cluster yang benar) setelah Anda tahu cluster/provinsi mana yang dimaksud. Tidak perlu re-run seluruh file — command ini hanya akan memproses ulang baris yang belum berhasil (baris yang emailnya sudah ada otomatis dilewati).

## 10. Bersihkan file sementara

File berisi data pribadi (nama + email) ~100 orang — hapus setelah selesai:

```bash
docker exec acceptra_app rm /tmp/users_filled.xlsx
rm /tmp/users_filled.xlsx   # di server, di luar container
```
