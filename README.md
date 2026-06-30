# Acceptra — Digital ATP/BAST Document Approval System

Acceptra is a web-based document approval platform for Aviat Networks / PT XLSmart, digitising the ATP (Acceptance Test Procedure) and BAST approval workflow that previously ran on paper and email.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13, PHP 8.4 |
| Frontend | React 19, TypeScript, Inertia.js 3 |
| Styling | Tailwind CSS 3, Radix UI |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Object Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend (SMTP) |
| PDF | FPDF / FPDI, smalot/pdfparser |
| Excel export | PhpSpreadsheet |
| Charts | Recharts |
| i18n | i18next, react-i18next (EN / ID) |

---

## Key Features

- **Multi-level approval flow** — up to L4, with punchlist & revision cycle
- **Document submission** — by partner/subcon or admin (with auto L1 approval)
- **Email + in-app notifications** — 11 notification types covering every approval event
- **Reminder system** — scheduled reminders for pending approvals
- **Partner & user management** — invitation-based onboarding with role-based access
- **Approval templates** — reusable level & PIC structures
- **Digital signature** — embedded in final PDF
- **Document archive & Excel export** — filterable document list export
- **Audit trail** — full history of every action on a document
- **Bilingual UI** — English and Indonesian, user-selectable

---

## Local Development

### Requirements

- PHP 8.4
- Composer 2
- Node.js 20+
- PostgreSQL 16 or Docker

### Quick start

```bash
# 1. Clone and enter the project
git clone <repo-url> acceptra-web
cd acceptra-web

# 2. Copy environment file and fill in the required values
cp .env.example .env
# Edit .env — see .env.example for all available variables and their descriptions

# 3. Run the one-shot setup (installs deps, generates app key, runs migrations, builds assets)
composer setup

# 4. Start all dev processes (Laravel + Vite + Queue worker + log tail)
composer dev
```

Access the app at `http://localhost:8000`.

---

## Production Deployment (Docker on VPS)

The project ships with a full Docker Compose stack:

| Container | Role |
|---|---|
| `acceptra_app` | PHP-FPM 8.4 (Alpine) |
| `acceptra_nginx` | Nginx 1.27 (web server / static files) |
| `acceptra_pgsql` | PostgreSQL 16 (persistent volume) |
| `acceptra_redis` | Redis 7 (cache, sessions, queue) |
| `acceptra_queue` | Queue worker (`queue:work redis`) |
| `acceptra_scheduler` | Task scheduler (`schedule:run` every 60 s) |

### Step-by-step

#### 1. Provision the VPS

Minimum recommended specs: **2 vCPU, 2 GB RAM, 20 GB SSD**.

Install Docker and Docker Compose:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
docker compose version   # should be v2.x
```

#### 2. Clone the repository

```bash
git clone <repo-url> /var/www/acceptra
cd /var/www/acceptra
```

#### 3. Configure environment

Obtain the `.env` file from the team (it is not committed to the repository). Place it in the project root and verify all values are correct for the production environment — especially `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, database credentials, mail credentials, and R2 storage keys.

#### 4. Build images and start containers

```bash
# Build the PHP image (first deploy or after Dockerfile changes)
docker compose build --no-cache

# Start all services in the background
docker compose up -d

# Verify all containers are running
docker compose ps
```

#### 5. First-time application setup

```bash
# Generate app key (skip if .env already has APP_KEY)
docker compose exec app php artisan key:generate

# Run database migrations
docker compose exec app php artisan migrate --force

# (Optional) Seed initial data
docker compose exec app php artisan db:seed --force

# Build frontend assets
docker compose exec app npm ci
docker compose exec app npm run build

# Cache config, routes, and views for performance
docker compose exec app php artisan optimize

# Link public storage
docker compose exec app php artisan storage:link

# Fix storage permissions
docker compose exec app chmod -R 775 storage bootstrap/cache
```

#### 6. HTTPS / SSL (recommended: Caddy)

Install Caddy on the host and use it as a reverse proxy in front of Nginx.

```
# /etc/caddy/Caddyfile
yourdomain.com {
    reverse_proxy localhost:80
}
```

```bash
sudo systemctl enable --now caddy
```

Caddy handles Let's Encrypt certificates automatically with zero configuration.

---

### Updating to a new version

```bash
cd /var/www/acceptra

# Pull latest code
git pull origin main

# Rebuild PHP image if Dockerfile or composer.json changed
docker compose build app

# Restart affected services
docker compose up -d --no-deps app nginx queue scheduler

# Run pending migrations
docker compose exec app php artisan migrate --force

# Rebuild frontend assets
docker compose exec app npm ci
docker compose exec app npm run build

# Clear and re-cache
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan optimize
```

---

### Useful commands

```bash
# View live logs (all services)
docker compose logs -f

# View logs for a specific service
docker compose logs -f queue

# Open a shell inside the app container
docker compose exec app bash

# Run an Artisan command
docker compose exec app php artisan <command>

# Open Tinker (REPL)
docker compose exec app php artisan tinker

# Stop all containers (data is preserved in volumes)
docker compose down

# Stop and remove volumes — DESTROYS all database data
docker compose down -v
```
