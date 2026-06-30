# Deployment Guide — Acceptra Production

Stack: **Docker Compose · Nginx · PHP 8.4 · PostgreSQL 16 · Redis 7 · Cloudflare (Full Strict)**

---

## Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| VPS Ubuntu 26.04 LTS | Min. 2 vCPU / 4 GB RAM / 40 GB SSD |
| Domain | Dikelola di Cloudflare |
| Cloudflare R2 | Bucket sudah dibuat, API token tersedia |
| Resend | Domain sudah terverifikasi, API key tersedia |
| GitHub access | Personal Access Token (PAT) untuk clone repo private |

---

## A. Setup VPS (sekali saja)

### A1. Login & Update OS
```bash
ssh -i ~/.ssh/acceptra.pem superadmin@<IP-VPS>
sudo apt update && sudo apt upgrade -y
```

### A2. Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### A3. Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

Logout dan login ulang SSH agar grup Docker aktif.

```bash
docker --version
docker compose version
```

---

## B. Setup Cloudflare (sekali saja)

### B1. SSL Mode
Dashboard Cloudflare → domain `acceptra.id` → **SSL/TLS → Overview → Full (strict)**

### B2. Origin Certificate
**SSL/TLS → Origin Server → Create Certificate**
- Validity: 15 tahun
- Hostnames: `acceptra.id`, `*.acceptra.id`
- Simpan dua file output:
  - `acceptra.id.pem` (Certificate)
  - `acceptra.id.key` (Private Key)

### B3. DNS Record
**DNS → Records → Add record**
```
Type : A
Name : acceptra.id
IPv4 : <IP-VPS>
Proxy: ON (orange cloud)
```

---

## C. Deploy Aplikasi

### C1. Clone Repository
```bash
sudo mkdir -p /var/www/acceptra
sudo chown $USER:$USER /var/www/acceptra
git clone https://github.com/ferdyalwondho/acceptra-web.git /var/www/acceptra
cd /var/www/acceptra
git checkout main
```

> Repo private → Git akan minta **username** dan **Personal Access Token** (bukan password).
> Buat PAT di: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained → repo:read

### C2. Pasang SSL Certificate
```bash
mkdir -p /var/www/acceptra/docker/nginx/certs
nano /var/www/acceptra/docker/nginx/certs/acceptra.id.pem   # paste isi Certificate
nano /var/www/acceptra/docker/nginx/certs/acceptra.id.key   # paste isi Private Key
chmod 600 /var/www/acceptra/docker/nginx/certs/acceptra.id.key
```

### C3. Buat File `.env`
```bash
cp /var/www/acceptra/.env.example /var/www/acceptra/.env
nano /var/www/acceptra/.env
```

Isi nilai berikut (sesuaikan dengan credential production):

```env
APP_NAME=Acceptra
APP_ENV=production
APP_KEY=                          # dikosongkan dulu, diisi oleh artisan key:generate
APP_DEBUG=false
APP_TIMEZONE=Asia/Jakarta
APP_URL=https://acceptra.id

APP_LOCALE=id
APP_FALLBACK_LOCALE=en

# Docker production toggles
NGINX_CONF=prod.conf
PHP_INI=prod.ini
DB_HOST_BIND=127.0.0.1
REDIS_HOST_BIND=127.0.0.1

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=pgsql
DB_HOST=pgsql
DB_PORT=5432
DB_DATABASE=acceptra
DB_USERNAME=acceptra
DB_PASSWORD=<password_kuat>

SESSION_DRIVER=redis
SESSION_LIFETIME=120
SESSION_DOMAIN=acceptra.id
SESSION_SECURE_COOKIE=true

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=s3
QUEUE_CONNECTION=redis
CACHE_STORE=redis
CACHE_PREFIX=acceptra_

REDIS_CLIENT=predis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.resend.com
MAIL_PORT=465
MAIL_USERNAME=resend
MAIL_PASSWORD=<resend_api_key>
MAIL_FROM_ADDRESS="noreply@acceptra.id"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=<r2_access_key_id>
AWS_SECRET_ACCESS_KEY=<r2_secret_access_key>
AWS_DEFAULT_REGION=auto
AWS_BUCKET=<nama_bucket_r2>
AWS_USE_PATH_STYLE_ENDPOINT=true
AWS_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com

VITE_APP_NAME="${APP_NAME}"
```

### C4. Jalankan Container
```bash
cd /var/www/acceptra
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

> Build pertama memakan waktu ~5–10 menit (compile PHP extensions).

Pantau progress:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs app -f
```

### C5. Install Dependencies & Build Aset
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app composer install --no-dev --optimize-autoloader

docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app npm ci --legacy-peer-deps

docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app npm run build
```

> `--legacy-peer-deps` diperlukan karena vite@8 belum didukung penuh oleh laravel-vite-plugin.

### C6. Setup Laravel
```bash
# Generate APP_KEY (jalankan SATU KALI saja)
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan key:generate

# Verifikasi key tersimpan benar (harus muncul SATU baris base64:...)
grep APP_KEY /var/www/acceptra/.env

# Migrate database
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan migrate --force

# Symlink storage
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan storage:link

# Optimize untuk production
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan config:cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan route:cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan view:cache
```

### C7. Seed Data Awal (opsional, hanya untuk fresh install)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan db:seed
```

---

## D. Verifikasi

```bash
# Semua container harus "Up"
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Test langsung bypass Cloudflare (harus 302 → /login)
curl -H "Host: acceptra.id" https://localhost/login -k -I
```

Buka `https://acceptra.id` di browser → harus muncul halaman login.

---

## E. Update / Redeploy

Setiap ada perubahan code dari `main`:

```bash
cd /var/www/acceptra

# Pull perubahan terbaru
git pull origin main

# Rebuild container jika ada perubahan Dockerfile
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Update dependencies jika ada perubahan composer.json / package.json
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app composer install --no-dev --optimize-autoloader
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app npm ci --legacy-peer-deps && npm run build

# Jalankan migrasi baru (jika ada)
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan migrate --force

# Refresh cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan optimize
```

---

## F. Troubleshooting

### 500 Internal Server Error
```bash
# Lihat error terbaru
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app tail -50 storage/logs/laravel.log

# Test app langsung bypass Cloudflare
curl -H "Host: acceptra.id" https://localhost -k -I
```

### APP_KEY kosong / dobel setelah key:generate
Cek isi `.env`:
```bash
grep APP_KEY /var/www/acceptra/.env
```
Jika ada dua nilai, perbaiki manual:
```bash
sed -i 's|APP_KEY=.*|APP_KEY=base64:<nilai_key>|' /var/www/acceptra/.env
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app php artisan config:cache
```

> **Catatan penting:** Setelah mengubah `.env`, container **harus di-restart** (`down` + `up`) agar nilai baru terbaca — `config:cache` saja tidak cukup karena Docker meng-inject env saat container start.

### Cloudflare masih tampilkan error lama
Purge cache: Cloudflare Dashboard → **Caching → Purge Everything**

### Build npm gagal (ERESOLVE)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app npm ci --legacy-peer-deps
```

### Container tidak mau start
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs <nama_service>
# Contoh: logs pgsql, logs nginx, logs app
```

---

## G. Catatan Keamanan

- File `.env` dan `docker/nginx/certs/` **tidak boleh** masuk ke git (sudah di-gitignore).
- PostgreSQL & Redis di-bind ke `127.0.0.1` (tidak terekspos ke internet), meskipun Docker mem-bypass UFW.
- `APP_DEBUG=false` wajib di production — jangan pernah diubah ke `true` di server production.
- Rotasi `APP_KEY` akan membuat semua session aktif invalid — lakukan hanya saat benar-benar diperlukan.
- Cloudflare Origin Certificate berlaku 15 tahun — tidak perlu diperbarui dalam waktu dekat.
