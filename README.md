# Acceptra — Digital ATP/BAST Document Approval System

Sistem persetujuan dokumen digital (ATP/BAST) untuk Aviat Networks / PT XLSmart. Aplikasi ini dirancang untuk memfasilitasi proses pengajuan, verifikasi, dan persetujuan dokumen ATP/BAST secara digital, aman, dan terintegrasi.

---

## 🚀 Fitur Utama & Keunggulan

- **Alur Persetujuan Multi-Level**: Mendukung hingga L4 approver, lengkap dengan siklus punchlist dan revisi yang terstruktur.
- **Ekspor Excel Premium**: Ekspor arsip dokumen dengan filter fleksibel menggunakan PhpSpreadsheet.
- **Mesin PDF & Tanda Tangan Digital**: Penerbitan dokumen final berbasis PDF yang disematkan tanda tangan digital approver secara presisi.
- **Smart Notification System**: 11 tipe notifikasi yang mencakup setiap event persetujuan, dikirim via email dan in-app secara real-time.
- **Sistem Pengingat Terjadwal**: Reminder otomatis untuk persetujuan yang tertunda, dapat dikonfigurasi per pengguna.
- **Partner & User Management**: Onboarding berbasis undangan dengan kontrol akses berbasis peran (RBAC).
- **Template Approval**: Struktur level dan PIC yang dapat digunakan ulang untuk mempercepat pembuatan alur persetujuan.
- **Dashboard Real-Time Berbasis Role**:
  - **Admin**: Prioritas tampilan dokumen pending dan statistik alur persetujuan.
  - **Approver**: Antrian dokumen yang menunggu persetujuan di giliran masing-masing.
  - **Partner**: Status pengajuan dokumen yang dikirimkan.
- **Audit Trail Lengkap**: Riwayat penuh setiap tindakan pada sebuah dokumen untuk keperluan akuntabilitas.
- **Antarmuka Bilingual (EN/ID)**: Bahasa Inggris dan Indonesia, dapat dipilih per pengguna.

---

## 🛠️ Tumpukan Teknologi

| Layer | Teknologi |
|---|---|
| Framework | Laravel 13, PHP 8.4 |
| Frontend | React 19, TypeScript, Inertia.js 3 |
| Styling | Tailwind CSS 3, Radix UI |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Object Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend (SMTP) |
| PDF | FPDF / FPDI, smalot/pdfparser |
| Excel Export | PhpSpreadsheet |
| Charts | Recharts |
| i18n | i18next, react-i18next (EN / ID) |

---

## 📦 Panduan Instalasi

### 1. Prasyarat

Pastikan Anda telah menginstal:

- PHP 8.4
- Composer 2
- Node.js 20+
- PostgreSQL 16 atau Docker

### 2. Kloning & Instalasi

```bash
git clone https://github.com/ferdyalwondho/acceptra-web.git
cd acceptra-web
```

### 3. Konfigurasi Lokal

Salin file environment dan lengkapi nilainya sesuai dengan konfigurasi lokal Anda — lihat `.env.example` untuk daftar lengkap variabel yang tersedia:

```bash
cp .env.example .env
```

### 4. Setup & Jalankan

```bash
# Install dependensi dan setup awal (key generate, migrate, build assets)
composer setup

# Jalankan semua proses dev (Laravel + Vite + Queue worker)
composer dev
```

Akses aplikasi di `http://localhost:8000`.

---

## 🐳 Deployment & CI/CD

Aplikasi ini mendukung deployment menggunakan Docker Compose ke lingkungan produksi di VPS.

### Kontainer Docker

| Kontainer | Peran |
|---|---|
| `acceptra_app` | PHP-FPM 8.4 (Alpine) |
| `acceptra_nginx` | Nginx 1.27 (web server / static files) |
| `acceptra_pgsql` | PostgreSQL 16 (persistent volume) |
| `acceptra_redis` | Redis 7 (cache, sessions, queue) |
| `acceptra_queue` | Queue worker (`queue:work redis`) |
| `acceptra_scheduler` | Task scheduler (`schedule:run` setiap 60 detik) |

### Build & Run

```bash
# Build image
docker compose build --no-cache

# Jalankan semua service
docker compose up -d

# Verifikasi semua kontainer berjalan
docker compose ps
```

### Setup Pertama Kali

```bash
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --force
docker compose exec app php artisan db:seed --force
docker compose exec app npm ci && npm run build
docker compose exec app php artisan optimize
docker compose exec app php artisan storage:link
```

### Update ke Versi Baru

```bash
git pull origin main
docker compose build app
docker compose up -d --no-deps app nginx queue scheduler
docker compose exec app php artisan migrate --force
docker compose exec app npm run build
docker compose exec app php artisan optimize:clear && php artisan optimize
```

### HTTPS / SSL (Caddy)

```
# /etc/caddy/Caddyfile
yourdomain.com {
    reverse_proxy localhost:80
}
```

```bash
sudo systemctl enable --now caddy
```

Caddy menangani sertifikat Let's Encrypt secara otomatis.

---

## ⚠️ Catatan Operasional & Arsitektur

- **Alur Persetujuan Cascading**: Setiap perubahan status pada langkah persetujuan secara otomatis memperbarui status dokumen di level atasnya.
- **Notifikasi Event-Driven**: Notifikasi dikirim melalui queue job untuk memastikan performa aplikasi tidak terganggu.
- **Penyimpanan Media**: Lampiran dokumen dan tanda tangan digital disimpan di Cloudflare R2. Pastikan kredensial S3 dikonfigurasi dengan benar di lingkungan produksi.
- **Audit Trail**: Seluruh tindakan (submit, approve, reject, revisi) dicatat secara otomatis di tabel `audit_logs` tanpa memerlukan intervensi manual dari controller.
- **Queue Worker**: Pastikan queue worker selalu berjalan di produksi. Gunakan kontainer `acceptra_queue` yang sudah disediakan atau supervisor sebagai alternatif.

---

© 2026 Aviat Networks / PT XLSmart. Developed with Focus on Efficiency & UX Excellence.
