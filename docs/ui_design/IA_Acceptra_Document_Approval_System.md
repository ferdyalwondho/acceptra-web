# Information Architecture (IA)
# Acceptra — Document Approval System

| | |
|---|---|
| **Produk** | Acceptra |
| **Domain** | acceptra.id |
| **Versi Dokumen** | 2.0 |
| **Tanggal** | Juni 2026 |
| **Penyusun** | PT Anugerah Mahameru Nusantara (AMN) |
| **Customer Pertama** | PT XLSmart (via Aviat Networks Indonesia) |
| **Status** | Draft — for development |
| **Tech Stack** | Laravel 11 · Inertia.js · React · shadcn/ui · Tailwind CSS · PostgreSQL |
| **Dokumen Terkait** | PRD Acceptra v2.0; SRS Acceptra v2.0; Design System Acceptra v2.0 |

---

## Revision History

| Versi | Tanggal | Perubahan | Author |
|---|---|---|---|
| 1.0 | Jun 2026 | Initial IA diturunkan dari SRS v1.0 & Design System v1.0 | AMN |
| 2.0 | Jun 2026 | Diselaraskan ke SRS v2.0 & DS v2.0: role **Partner** & **Admin = approver L1 (approve-only)**, approver **MS BO**, **OTP dihapus**, **16-status lifecycle**, **lampiran Excel** + **Export Excel**, **`requires_signature`** per level, **Unique ID** & **PT Index**, gaya **Minimalist Corporate** (glass dihapus), komponen identitas **ApprovalTimeline** (eks Signal Ladder), detail dokumen ber-**tab** | AMN |

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Model Pengguna & Akses](#2-model-pengguna--akses)
3. [Sitemap Global](#3-sitemap-global)
4. [Struktur Route & Konvensi URL](#4-struktur-route--konvensi-url)
5. [Navigasi Global](#5-navigasi-global)
6. [Page Inventory (Detail)](#6-page-inventory-detail)
7. [Navigasi Berbasis Status](#7-navigasi-berbasis-status)
8. [Alur Navigasi Kunci (User Journeys)](#8-alur-navigasi-kunci-user-journeys)
9. [Lampiran](#9-lampiran)

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen

Information Architecture (IA) ini mendefinisikan **struktur, navigasi, dan organisasi halaman** Acceptra: peta seluruh halaman (sitemap), konvensi route/URL, model navigasi per-role, inventaris halaman lengkap dengan layout & komponennya, serta alur perpindahan antar-halaman.

IA adalah jembatan antara **apa** yang dibangun (SRS — kebutuhan fungsional FR) dan **bagaimana tampilannya** (Design System — token, komponen, layout pattern). Dokumen ini menjadi acuan tim front-end dalam menata `resources/js/Pages/` (Inertia) dan tim back-end dalam menata `routes/web.php`.

### 1.2 Hubungan dengan Dokumen Lain

| Dokumen | Menyumbang ke IA |
|---|---|
| **PRD v2.0** | Daftar modul fitur (§7) → area & halaman. Status lifecycle (§6, 16 status) → navigasi berbasis status. |
| **SRS v2.0** | FR per modul → aksi & validasi tiap halaman. Matriks RBAC (§10.1) → akses per-role. Matriks notifikasi (§10.2) → entry point ke halaman. |
| **Design System v2.0** | App Shell (§13.14) → navigasi global. Layout pattern (§14) → kerangka tiap halaman. Roles & UI Personas (§11) → tampilan adaptif per role. Component library (§13) → komponen kunci. Status system (§12) → badge & timeline. |

### 1.3 Perubahan Kunci dari IA v1.0

1. **Role baru: Partner/Subcon** — originator yang men-submit dokumen; visibilitas hanya **s/d L1**.
2. **Admin Aviat = approver L1 (approve-only)** — bukan sekadar submitter. Muncul "L1 Approvals" di workspace Aviat.
3. **Approver bertambah: MS BO** (approve-only). Approver kini: MS BO · MS RTS · XLS RTH Team · XLS RTH.
4. **OTP dihapus** — tidak ada langkah/komponen OTP di mana pun.
5. **16 status** (dulu 13) — ada blok L1 (01–03) sebelum L2.
6. **Lampiran Excel** (view-only) per dokumen + **Export to Excel** daftar dokumen.
7. **`requires_signature` per level** — level approve-only (L1, MS BO) menyembunyikan Signature Pad.
8. **Gaya Minimalist Corporate** — glassmorphism dihapus; permukaan solid + shadow halus.
9. **`ApprovalTimeline`** menggantikan Signal Ladder sebagai komponen identitas.
10. **Detail dokumen ber-tab**: Overview · Approval Timeline · Attachments · Audit Trail.

### 1.4 Prinsip IA

1. **Role-based, bukan feature-based.** Satu aplikasi, tiga "wajah" (Aviat · Partner · Approver). Tiap role melihat sidebar & halaman berbeda (SRS RBAC, DS §11).
2. **Status-driven.** Aksi pada halaman dokumen ditentukan oleh **status ATP (01–16)**, **giliran approval**, dan **`requires_signature`** level — bukan sekadar role. Detail & approval adalah route adaptif-status.
3. **Deep-link first.** Approver & Admin (L1) mayoritas masuk lewat **link di email** (tanpa OTP). Tiap dokumen punya URL stabil & tak dapat dienumerasi (UUID v7) yang langsung membuka konteks benar setelah login.
4. **Visibilitas berjenjang.** Partner hanya melihat progres **s/d L1**; level di atasnya tampil generik ("Dalam proses approval customer") tanpa detail PIC (DS §11).
5. **Mobile setara desktop.** Sidebar → drawer, tabel → list card, action panel → sticky bottom bar (DS §14). Target sentuh ≥ 44px.

---

## 2. Model Pengguna & Akses

### 2.1 Daftar Role (8 role; satu user = satu role)

| Role | Kode internal | Tipe | Peran di alur | Area utama |
|---|---|---|---|---|
| Super Admin | `super_admin` | Aviat | — (kelola sistem) | Semua + User, Partner, Template, Settings |
| Admin | `admin` | Aviat | **Approver L1 (approve-only)** | Dashboard, L1 Approvals, Documents, Partners, Templates |
| Viewer | `viewer` | Aviat | — (pantau) | Dashboard, Documents (read-only), Export |
| Partner / Subcon | `partner` | Eksternal | **Originator** (submit & revisi) | Dashboard (s/d L1), Submit, My Documents |
| Approver - MS BO | `approver_ms_bo` | Customer | Approver (**approve-only**) | Need Approval + dokumen terkait |
| Approver - MS RTS | `approver_ms_rts` | Customer | Approver (**TTD**) | Need Approval + dokumen terkait |
| Approver - XLS RTH Team | `approver_xls_rth_team` | Customer | Approver (**TTD**) | Need Approval + dokumen terkait |
| Approver - XLS RTH | `approver_xls_rth` | Customer | Approver (**TTD**) | Need Approval + dokumen terkait |

> 📌 **L1 = Admin Aviat (approve-only).** Submit oleh Partner → mulai status 01 (On Review L1). Submit langsung oleh Admin → **auto-approve L1** → mulai status 04 (On Review L2). Urutan level di atas L1 (L2..Ln) ditentukan **per-SOW** beserta flag `requires_signature` tiap level.

### 2.2 Matriks Role × Area (ringkas; detail SRS §10.1)

| Area | Super Admin | Admin | Viewer | Partner | Approver |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ (RO) | ✅ (s/d L1) | ✅ |
| L1 Approvals (approve L1) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Submit dokumen | ✅ | ✅ (direct, auto-approve L1) | ❌ | ✅ | ❌ |
| Import dokumen berjalan | ✅ | ✅ | ❌ | ❌ | ❌ |
| Documents — list & detail | ✅ | ✅ | ✅ (RO) | ⚠️ (miliknya, s/d L1) | ⚠️ (terkait) |
| Approve/Reject/Punchlist (L2+) | ❌ | ❌ | ❌ | ❌ | ✅ (giliran) |
| Verify punchlist | ❌ | ❌ | ❌ | ❌ | ✅ (pembuat) |
| Revisi dokumen (pasca-reject) | ✅ | ✅ | ❌ | ✅ (miliknya) | ❌ |
| Reassign approver | ✅ | ✅ | ❌ | ❌ | ❌ |
| Partner management | ✅ | ✅ | ❌ | ❌ | ❌ |
| Template / SOW | ✅ | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings (reminder dll) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Arsip & Pencarian | ✅ | ✅ | ✅ | ⚠️ (miliknya) | ⚠️ (terkait) |
| Export Excel | ✅ | ✅ | ✅ | ❌ | ❌ |
| Audit Trail (per dokumen) | ✅ | ✅ | ✅ | ⚠️ (s/d L1) | ✅ (terkait) |
| Notifikasi · Profil · Saved Signature | ✅ | ✅ | ✅ | ✅ | ✅ |

Legenda: ✅ penuh · ⚠️ terbatas · ❌ tidak ada (route diblok server-side via Policy) · RO read-only.

### 2.3 Tiga "Wajah" Aplikasi

Di atas App Shell yang sama (DS §13.14), Acceptra punya tiga workspace berbeda menu:

- **Workspace Aviat** (`super_admin` / `admin` / `viewer`) — Dashboard, L1 Approvals (admin/super), Documents, Partners (admin/super), Templates (admin/super), Users (super), Settings (super).
- **Workspace Partner** (`partner`) — Dashboard (dokumen sendiri, progres s/d L1), Submit Document, My Documents.
- **Workspace Approver** (`approver_*`) — Need Approval, History.

Topbar, sistem notifikasi, profil, Saved Signature, dan i18n **dibagikan** semua workspace.

---

## 3. Sitemap Global

```
Acceptra (acceptra.id)
│
├── 🌐 PUBLIC (tanpa autentikasi)
│   ├── /login                          Login (email + password, tanpa OTP)
│   ├── /forgot-password                Lupa password
│   ├── /reset-password/{token}         Set password baru
│   └── /invitation/{token}             Aktivasi akun Partner / Approver
│
└── 🔒 AUTHENTICATED (App Shell)
    │
    ├── WORKSPACE AVIAT (super_admin / admin / viewer)
    │   ├── /dashboard                  Dashboard Admin
    │   ├── /approvals                  L1 Approvals  (admin/super — approve-only)
    │   │
    │   ├── /documents                  Daftar Dokumen (list/arsip) + Export Excel
    │   │   ├── /documents/create       Submit / Buat dokumen
    │   │   ├── /documents/import        Import Dokumen Berjalan (offline)   (admin/super)
    │   │   ├── /documents/export        Unduh Excel (aksi)                  (aviat)
    │   │   └── /documents/{id}          Detail Dokumen (tabs)
    │   │       └── ?tab=overview|timeline|attachments|audit
    │   │           ├── …/edit           Edit metadata / revisi PDF          (admin/super)
    │   │           ├── …/reassign       Reassign Approver (modal)            (admin/super)
    │   │           └── …/approval       Layar Approval (L1 oleh admin)
    │   │
    │   ├── /partners                    Partner Management                  (admin/super)
    │   │   ├── /partners/create
    │   │   └── /partners/{id}/edit
    │   │
    │   ├── /templates                   Template / SOW                      (admin/super)
    │   │   ├── /templates/create
    │   │   └── /templates/{id}/edit
    │   │
    │   ├── /users                       User Management                     (super)
    │   │   ├── /users/create
    │   │   └── /users/{id}/edit
    │   │
    │   └── /settings/reminders          Konfigurasi Reminder per level      (super)
    │
    ├── WORKSPACE PARTNER (partner)
    │   ├── /dashboard                   Dashboard Partner (dokumen sendiri, s/d L1)
    │   ├── /documents/create            Submit Document
    │   └── /documents                   My Documents (scope=mine) → /documents/{id} (s/d L1)
    │
    ├── WORKSPACE APPROVER (approver_*)
    │   ├── /approvals                   Need Approval (giliran aktif)
    │   ├── /approvals/history           History (dokumen yang pernah diproses)
    │   └── /documents/{id}/approval     Layar Approval (2 kolom) ← deep link email
    │
    └── SHARED (semua role terautentikasi)
        ├── /notifications               Halaman notifikasi penuh
        ├── /profile                     Profil + preferensi bahasa
        └── /profile/signature           Kelola Saved Signature
```

> 📌 **`/approvals` bersifat universal** = "dokumen menunggu aksi approval SAYA". Admin melihat item **L1**; approver customer melihat item **L2–L4**. Keduanya membuka layar `/documents/{id}/approval` yang sama; Signature Pad hanya tampil bila level `requires_signature` = true.
> 📌 **`/documents/{id}`** (detail Aviat/Partner, ber-tab) berbeda dari **`/documents/{id}/approval`** (layar aksi). Server mengarahkan tiap role ke route yang tepat.

---

## 4. Struktur Route & Konvensi URL

### 4.1 Konvensi

- **Resource RESTful** Laravel: `index`, `create`, `store`, `show`, `edit`, `update`, `destroy`.
- **Identifier** = UUID v7 (tak dapat dienumerasi; SRS C-7). **Unique ID** (`ACC-{tahun}-{urut}`) adalah kode bisnis tampilan, **bukan** segmen URL.
- **Nested resource** untuk aksi kontekstual: `/documents/{document}/approval`, `/documents/{document}/reassign`.
- **Tab via query** pada detail: `/documents/{id}?tab=audit` (deep-linkable).
- **Inertia page** dipetakan 1:1 ke `resources/js/Pages/`; folder `PascalCase` + `Index/Show/Create/Edit`.

### 4.2 Tabel Route ↔ Inertia Page ↔ Controller

| Route | Method | Inertia Page (`resources/js/Pages/`) | Controller@action | Akses |
|---|---|---|---|---|
| `/login` | GET/POST | `Auth/Login` | `Auth\LoginController` | public |
| `/forgot-password` | GET/POST | `Auth/ForgotPassword` | `Auth\PasswordResetController@request` | public |
| `/reset-password/{token}` | GET/POST | `Auth/ResetPassword` | `Auth\PasswordResetController@reset` | public |
| `/invitation/{token}` | GET/POST | `Auth/Invitation` | `Auth\InvitationController` | public |
| `/dashboard` | GET | `Dashboard/Admin` · `Dashboard/Partner` · `Dashboard/Approver` | `DashboardController@index` | role-based |
| `/approvals` | GET | `Approvals/Index` | `ApprovalController@index` | admin+ (L1) · approver |
| `/approvals/history` | GET | `Approvals/History` | `ApprovalController@history` | approver |
| `/documents` | GET | `Documents/Index` | `DocumentController@index` | aviat · partner(mine) · approver(terkait) |
| `/documents/create` | GET/POST | `Documents/Create` | `DocumentController@create/store` | partner · admin+ |
| `/documents/import` | GET/POST | `Documents/Import` | `DocumentController@import` | admin+ |
| `/documents/export` | GET | (unduh xlsx) | `DocumentExportController@excel` | aviat |
| `/documents/{id}` | GET | `Documents/Show` (tabs) | `DocumentController@show` | terkait |
| `/documents/{id}/edit` | GET/PUT | `Documents/Edit` | `DocumentController@edit/update` | admin+ · partner(miliknya, revisi) |
| `/documents/{id}/revise` | POST | (di `Edit`) | `DocumentController@revise` | admin+ · partner |
| `/documents/{id}/reassign` | POST | (modal di `Show`) | `ReassignController@store` | admin+ |
| `/documents/{id}/approval` | GET | `Approvals/Screen` | `ApprovalController@show` | approver giliran · admin (L1) |
| `/documents/{id}/approve` | POST | (aksi di `Screen`) | `ApprovalController@approve` | approver/admin giliran |
| `/documents/{id}/reject` | POST | (aksi di `Screen`) | `ApprovalController@reject` | approver/admin giliran |
| `/documents/{id}/verify` | POST | (aksi di `Screen`) | `PunchlistController@verify` | pembuat punchlist |
| `/partners` | GET | `Partners/Index` | `PartnerController@index` | admin+ |
| `/partners/create` | GET/POST | `Partners/Create` | `PartnerController@create/store` | admin+ |
| `/partners/{id}/edit` | GET/PUT | `Partners/Edit` | `PartnerController@edit/update` | admin+ |
| `/templates` | GET | `Templates/Index` | `TemplateController@index` | admin+ |
| `/templates/create` | GET/POST | `Templates/Create` | `TemplateController@create/store` | admin+ |
| `/templates/{id}/edit` | GET/PUT | `Templates/Edit` | `TemplateController@edit/update` | admin+ |
| `/users` | GET | `Users/Index` | `UserController@index` | super_admin |
| `/users/create` | GET/POST | `Users/Create` | `UserController@create/store` | super_admin |
| `/users/{id}/edit` | GET/PUT | `Users/Edit` | `UserController@edit/update` | super_admin |
| `/settings/reminders` | GET/PUT | `Settings/Reminders` | `ReminderSettingController` | super_admin |
| `/notifications` | GET | `Notifications/Index` | `NotificationController@index` | all |
| `/profile` | GET/PUT | `Profile/Edit` | `ProfileController` | all |
| `/profile/signature` | GET/POST | `Profile/Signature` | `SignatureController` | all |

> 📌 **Tanpa OTP.** Tidak ada route/halaman/step OTP. Aksi approval = (TTD bila perlu) → Approve/Reject langsung.

---

## 5. Navigasi Global

Mengacu Design System §13.14 (App Shell — corporate) dan §14 (Layout Patterns).

### 5.1 App Shell (Minimalist Corporate — tanpa glass)

```
┌─────────────────────────────────────────────────────────────┐
│  TOPBAR (solid putih, shadow-sm, sticky)                     │
│  [breadcrumb/judul]      [search]  [🌐 ID/EN] [🔔] [avatar▾] │
├───────────┬─────────────────────────────────────────────────┤
│ SIDEBAR   │                                                  │
│ 256px     │   CONTENT AREA                                   │
│ putih     │   (layout pattern per halaman — §6)              │
│ border ▕  │                                                  │
│ kanan     │                                                  │
│ hairline  │                                                  │
│ menu/role │                                                  │
│ [collapse │                                                  │
│   64px]   │                                                  │
└───────────┴─────────────────────────────────────────────────┘
```

### 5.2 Sidebar — Menu per Workspace

**Workspace Aviat:**

| # | Item | Ikon | Route | Terlihat oleh |
|---|---|---|---|---|
| 1 | Dashboard | `layout-dashboard` | `/dashboard` | semua aviat |
| 2 | L1 Approvals | `inbox` | `/approvals` | super_admin, admin |
| 3 | Documents | `file-text` | `/documents` | semua aviat |
| 4 | Partners | `handshake` | `/partners` | super_admin, admin |
| 5 | Templates / SOW | `git-branch` | `/templates` | super_admin, admin |
| 6 | Users | `users` | `/users` | super_admin |
| 7 | Settings | `settings` | `/settings/reminders` | super_admin |
| 8 | Archive | `archive` | `/documents?filter=archived` | semua aviat |

> Viewer melihat #1, #3, #8 (read-only); tombol create/aksi disembunyikan, bukan disabled. Badge pada **L1 Approvals** = jumlah dokumen menunggu L1.

**Workspace Partner:**

| # | Item | Ikon | Route | Catatan |
|---|---|---|---|---|
| 1 | Dashboard | `layout-dashboard` | `/dashboard` | progres dokumen miliknya s/d L1 |
| 2 | Submit Document | `upload` | `/documents/create` | originator |
| 3 | My Documents | `file-text` | `/documents?scope=mine` | detail s/d L1 |

**Workspace Approver:**

| # | Item | Ikon | Route | Badge |
|---|---|---|---|---|
| 1 | Need Approval | `inbox` | `/approvals` | jumlah giliran aktif (brand) |
| 2 | History | `history` | `/approvals/history` | — |

**Perilaku sidebar (DS §13.14):** item aktif = bg `--color-secondary-surface` + bar kiri `--color-brand-ink` 3px. Collapse ke `64px` (ikon + tooltip). Mobile: drawer (hamburger). Permukaan solid (tanpa glass).

### 5.3 Topbar (shared)

| Elemen | Fungsi | Komponen DS |
|---|---|---|
| Breadcrumb / judul | Konteks lokasi (§13.12) | Breadcrumb |
| Search | Cari Unique ID / Link ID / Project Code / SOW / Partner | input |
| Language switcher (ID/EN) | Ganti bahasa UI, simpan ke profil (FR-I18N) | toggle |
| Notification bell | Badge unread + dropdown 10 terbaru → `/notifications` | `NotificationBell` (§13.10) |
| Avatar menu | **Role ditampilkan** · Profil · Saved Signature · Logout | dropdown |

### 5.4 Navigasi Mobile

- Topbar sticky; hamburger → sidebar drawer.
- Tabel → **Document Card** list (DS §13.11), bukan scroll horizontal.
- Approval screen: preview di atas, action panel sticky bottom bar (DS §14.1).
- Target sentuh ≥ 44px (DS §15).

---

## 6. Page Inventory (Detail)

Format: **Tujuan · Akses · Layout (DS §14) · Komponen Kunci (DS §13) · Aksi Utama · Entry Point · Exit/Next.**

---

### 6.1 `Auth/Login` — `/login`

- **Tujuan:** Otentikasi email + password, **tanpa OTP** (FR-AUTH-01).
- **Akses:** Public.
- **Layout:** Centered card (solid putih), branding Aviat.
- **Komponen:** Input email/password, tombol "Sign In", link "Forgot password?", language switcher.
- **Aksi:** Login → redirect by role: admin/super → `/dashboard`; partner → `/dashboard`; approver → `/approvals` (FR-AUTH-02).
- **Entry point:** URL langsung; redirect dari deep link saat belum login (FR-AUTH-03).
- **Exit/Next:** Tujuan role, atau **kembali ke deep-link** (intended URL).
- **Edge:** Rate limiting/lockout (FR-AUTH-07); error generik.

### 6.2 `Auth/ForgotPassword` & `Auth/ResetPassword`

- **Tujuan:** Reset password via email (FR-AUTH-04).
- **Akses:** Public.
- **Komponen:** Input email / password baru + konfirmasi.
- **Aksi:** Kirim link / set password. Token kedaluwarsa → kirim ulang (FR-AUTH-06).
- **Exit:** `/login`.

### 6.3 `Auth/Invitation` — `/invitation/{token}`

- **Tujuan:** Aktivasi akun **Partner / Approver** & set password sendiri (FR-AUTH-05).
- **Akses:** Public (token valid).
- **Komponen:** Sapaan nama, email read-only, password + konfirmasi, "Activate Account".
- **Aksi:** Set password → akun aktif → auto-login (partner → dashboard; approver → `/approvals`).
- **Edge:** Token kedaluwarsa → minta re-invite; email sudah aktif → arahkan login.

---

### 6.4 `Dashboard/Admin` — `/dashboard`

- **Tujuan:** Ringkasan status seluruh dokumen real-time (FR-DSB-01).
- **Akses:** Super Admin, Admin, Viewer (read-only).
- **Layout:** Dashboard (DS §14.2) — grid `MetricCard` + tabel aktivitas + grafik tren opsional.
- **Komponen kunci:** `MetricCard` jumlah per status; **kartu "Perlu Perhatian"** (pending lama, satu aksen brand); `DataTable` "Dokumen Aktif" + `StatusBadge`; feed "Aktivitas Terbaru"; tombol **Export to Excel**.
- **Aksi:** Klik metrik → `/documents?status=NN`; klik baris → `/documents/{id}`; Export Excel → unduh.
- **Entry point:** Pasca-login admin; sidebar #1.

### 6.5 `Dashboard/Partner` — `/dashboard` (varian Partner)

- **Tujuan:** Pantau dokumen milik partner + progres **s/d L1** (FR-DSB-03).
- **Akses:** Partner.
- **Layout:** Dashboard ringkas (kartu + list card).
- **Komponen:** Kartu ringkasan status dokumen sendiri; list `DocumentCard`; tombol utama **Submit Document**.
- **Catatan visibilitas:** Status/timeline hanya tampak **s/d L1**; level di atasnya generik ("Dalam proses approval customer").
- **Aksi:** Submit (`/documents/create`); buka detail miliknya (`/documents/{id}`).

### 6.6 `Dashboard/Approver` — `/dashboard` (varian Approver)

- **Tujuan:** Ringkasan giliran approver (FR-DSB-02).
- **Akses:** Approver L2–L4 (dan tampilan giliran L1 untuk admin diakomodasi via `/approvals`).
- **Komponen:** Kartu "Need Approval (n)", list `DocumentCard`, ringkasan riwayat.
- **Catatan:** Boleh diarahkan langsung ke `/approvals` bila approver tak perlu dashboard terpisah (keputusan implementasi).

---

### 6.7 `Approvals/Index` — `/approvals` (Need Approval / L1 Approvals)

- **Tujuan:** Dokumen yang **menunggu aksi approval pengguna ini** (universal: Admin = L1; Approver = L2–L4).
- **Akses:** Super Admin & Admin (item L1) · Approver (item levelnya).
- **Layout:** List card / tabel ringkas.
- **Komponen:** `DocumentCard` + `StatusBadge` + indikator "Giliran Anda"; empty state.
- **Aksi:** Buka → `/documents/{id}/approval`.
- **Entry point:** Pasca-login approver; sidebar (Need Approval / L1 Approvals); badge unread; notifikasi.
- **Exit/Next:** Approval Screen.

### 6.8 `Approvals/History` — `/approvals/history`

- **Tujuan:** Dokumen yang pernah pengguna ini proses (approved/rejected/punchlist).
- **Akses:** Approver L2–L4 (dan admin untuk L1, opsional).
- **Komponen:** `DocumentCard` + `StatusBadge` + tanggal aksi; download PDF final (dokumen selesai).
- **Exit/Next:** Detail / download.

### 6.9 `Approvals/Screen` — `/documents/{id}/approval` ⭐

- **Tujuan:** Layar inti aksi approval: review → (TTD bila perlu) → Approve/Reject (PRD §7.8–7.10). **Tanpa OTP.**
- **Akses:** Approver yang **sesuai step aktif**; **Admin untuk step L1**; pembuat punchlist saat fase verifikasi (status 15).
- **Layout:** **Approval Screen 2 kolom** (DS §14.1) — Document Preview (≈58%) + Action Panel sticky (≈42%). Mobile: preview atas, aksi sticky bottom.
- **Komponen kunci:**
  - **Document Preview:** PDF viewer halaman 1 (area TTD ditandai) + **Lampiran Excel view-only** (link/preview, tak bisa di-TTD).
  - **Action Panel:** Unique ID + `StatusBadge`, **`ApprovalTimeline`** (state-driven 16 status + `requires_signature`), tombol `[Approve]` · `[Approve with Punchlist]` · `[Reject]`.
  - **`SignaturePad`** (draw/upload + **Saved Signature**) — **hanya tampil bila level `requires_signature` = true**. Disembunyikan untuk L1 & MS BO (approve-only).
  - Punchlist: textarea catatan bebas (Approve with Punchlist); atau **Verify / Accept Revision** (status 15).
- **Aksi & efek (tanpa OTP):**
  - **Approve** → (TTD bila perlu) → status maju ke level berikutnya, atau **13/14** bila approver terakhir → toast + Timeline maju.
  - **Approve with Punchlist** → tetap lanjut; fase punchlist (14→16) aktif setelah approver terakhir.
  - **Reject** → catatan wajib → status "Need Rectification" → notifikasi semua Admin (dan Partner untuk revisi).
  - **Verify** (status 15) → tutup punchlist per-approver; semua verify → **16 Closed**.
- **Entry point:** **Deep link email** (utama) → bila belum login lewat `/login` → kembali ke sini; atau dari `/approvals`.
- **Exit/Next:** Toast sukses → `/approvals`.

---

### 6.10 `Documents/Index` — `/documents`

- **Tujuan:** Daftar & arsip dokumen + pencarian/filter + **Export Excel** (FR-ARC).
- **Akses:** Aviat (semua); Partner (`scope=mine`, s/d L1); Approver (terkait).
- **Layout:** Document List (DS §14.3) — toolbar filter + **Export to Excel** + tabel (desktop) / list card (mobile) + pagination.
- **Komponen kunci:** Toolbar filter (search Unique ID / Link ID / Project Code / SOW / **Partner** / tanggal / status); `DataTable` kolom Unique ID (mono) · Project · SOW · **Partner** · Status badge · Active step · Submitted · aksi; `DocumentCard` (mobile); empty state.
- **Aksi:** Submit/Buat (`/documents/create`), Import (`/documents/import`, admin+), buka detail, filter/sort/paginate, **Export Excel** (`/documents/export`).
- **Entry point:** Sidebar Documents / Archive / My Documents.

### 6.11 `Documents/Create` — `/documents/create` (Submit / Buat Dokumen)

- **Tujuan:** Submission: metadata + 1 PDF + lampiran Excel opsional + pilih SOW + pilih PIC approver L2..Ln (PRD §7.5).
- **Akses:** **Partner** (originator) · Admin · Super Admin (direct, auto-approve L1).
- **Layout:** Form ber-section (solid surface), `AppShell`.
- **Komponen kunci:**
  - **Metadata:** Vendor/Contractor (default "PT Aviat Solusi Komunikasi Indonesia"), Project Code, **PT Index**, Link ID/Name, Tower & Site Near/Far End. **Unique ID** di-generate otomatis (`ACC-{tahun}-{urut}`, app-only).
  - **SOW & Alur:** pilih Template/SOW → render slot approver **L2..Ln** sesuai struktur level (L1 tidak dipilih).
  - **Pilih PIC:** per slot, dropdown user **ter-filter sesuai role level** (FR-USR-04).
  - **Upload PDF** (wajib) + **Excel** (opsional, view-only) — dual-zone (DS §13.3).
  - **Anchor/Placement:** auto text-anchor; gagal → preview halaman 1 + manual placement (FR-PDF-03/04).
- **Aksi:**
  - **Save as Draft** → tetap di list.
  - **Submit (Partner)** → status **01. Submit & On Review L1** → notifikasi **semua Admin Aviat**.
  - **Submit (Admin direct)** → **auto-approve L1** → status **04. L1 Approve — On Review L2**.
- **Validasi:** field wajib, tiap slot PIC terisi, PDF ter-upload, tipe/ukuran file valid.
- **Exit/Next:** `/documents` (draft) atau `/documents/{id}` (submit).

### 6.12 `Documents/Import` — `/documents/import`

- **Tujuan:** Impor dokumen dengan sebagian approval offline (PRD §7.5.3).
- **Akses:** Admin, Super Admin.
- **Layout:** Form mirip Create + penanda level **Approved (offline)** vs **Pending**.
- **Komponen:** Upload PDF (TTD offline sudah ada), preview halaman 1, isi PIC/tanggal/attachment bukti per level offline, manual placement slot pending.
- **Aturan:** Level offline berurutan dari awal; sistem set status ke titik sesuai; notif hanya approver pending berikutnya; audit mencatat step offline sebagai pre-existing; stamping hanya isi kotak kosong.
- **Exit/Next:** `/documents/{id}`.

### 6.13 `Documents/Show` — `/documents/{id}` (ber-tab)

- **Tujuan:** Pusat kendali satu dokumen; aksi adaptif status & role (PRD §7.x, §7.16).
- **Akses:** Aviat (aksi sesuai role) · Partner (miliknya, **s/d L1**) · Approver (terkait) · Viewer (RO).
- **Layout:** Detail dengan **Tabs** (DS §13.12): **Overview · Approval Timeline · Attachments · Audit Trail**.
- **Komponen kunci:**
  - Header: Unique ID + Link ID (mono), Project, SOW, **Partner**, `StatusBadge`.
  - **Overview:** metadata lengkap, PDF preview halaman 1, panel aksi adaptif status.
  - **Approval Timeline:** `ApprovalTimeline` L1→L2→…→Ln (done/active/pending/rejected; ikon TTD vs approve-only). **Partner: hanya s/d L1**, sisanya generik.
  - **Attachments:** PDF asli, PDF final, **lampiran Excel** (view-only), bukti import/reassign.
  - **Audit Trail:** list append-only (aktor, timestamp, catatan) — Partner s/d L1.
  - Panel aksi: Revisi PDF, Reassign (modal), Download final, Edit metadata (draft), Export (opsional).
- **Aksi (tergantung status & role):** Revisi (reject/punchlist), Reassign (admin+), Download, Edit.
- **Entry point:** List/dashboard, notifikasi.
- **Exit/Next:** Edit, Approval (L1), atau kembali ke list.

### 6.14 `Documents/Edit` — `/documents/{id}/edit`

- **Tujuan:** Edit metadata (draft) atau **upload PDF revisi** (pasca-reject / punchlist).
- **Akses:** Admin, Super Admin · **Partner** (revisi dokumen miliknya saat reject).
- **Layout:** Form (subset Create).
- **Komponen:** Field editable, dropzone PDF revisi, (Excel re-upload opsional), preview.
- **Aturan:** Edit tak mengubah **snapshot** struktur dokumen berjalan. **Reject tidak mereset sequence** — revisi dikirim **kembali ke level yang reject**; approval sebelumnya tetap sah.
- **Exit/Next:** `/documents/{id}`.

---

### 6.15 `Partners/Index` — `/partners`

- **Tujuan:** Kelola data partner/subcon (FR-PTR).
- **Akses:** Admin, Super Admin.
- **Layout:** Document List (tabel + toolbar).
- **Komponen:** Tabel partner: nama · email · jumlah user PIC · jumlah dokumen · status · aksi; empty state.
- **Aksi:** Buat (`/partners/create`), Edit (`/partners/{id}/edit`); dokumen dapat difilter **per partner** (FR-PTR-02).
- **Exit/Next:** Create/Edit.

### 6.16 `Partners/Create` & `Partners/Edit`

- **Tujuan:** CRUD partner (nama + email) + akun login partner; (SHOULD) >1 user PIC per partner.
- **Akses:** Admin, Super Admin.
- **Komponen:** Field nama partner, email; daftar user PIC partner + "Send Invitation".
- **Exit/Next:** `/partners`.

---

### 6.17 `Templates/Index` — `/templates`

- **Tujuan:** Kelola template SOW (struktur level + role + `requires_signature`) (FR-TPL).
- **Akses:** Admin, Super Admin.
- **Layout:** Document List.
- **Komponen:** Tabel: nama SOW · jumlah level · daftar role per level · status aktif · aksi; empty state.
- **Aksi:** Buat, Edit, Clone (🟡), soft-delete (template terpakai tak boleh hard-delete).

### 6.18 `Templates/Create` & `Templates/Edit`

- **Tujuan:** Definisi SOW: nama, deskripsi, **daftar level berurutan**; tiap level `{role, requires_signature}` (FR-TPL-02).
- **Akses:** Admin, Super Admin.
- **Layout:** Form + builder level (reorderable).
- **Komponen:** Input nama/deskripsi; builder baris level (role + toggle `requires_signature`); dukung jumlah level bervariasi (mis. 3 atau 4) per SOW.
- **Aturan:** L1 selalu `requires_signature=false`; level approve-only lain (mis. MS BO) juga false. Template menyimpan **struktur saja** (PIC dipilih saat submission). Dokumen menyimpan **snapshot** saat dibuat; edit tak mengubah dokumen berjalan.
- **Exit/Next:** `/templates`.

---

### 6.19 `Users/Index` · `Users/Create` · `Users/Edit` — `/users*`

- **Tujuan:** Kelola user & role (FR-USR).
- **Akses:** **Super Admin saja.**
- **Layout:** Document List + Form.
- **Komponen:** Tabel user (nama · email · role · region opsional · status · aksi; filter role/status); form (role single-select dari 8 role, "Create & Send Invitation").
- **Aturan:** Soft delete; user yang menjadi approver aktif tak boleh dihapus → arahkan reassign (FR-USR-05).
- **Exit/Next:** `/users`.

### 6.20 `Settings/Reminders` — `/settings/reminders`

- **Tujuan:** Konfigurasi interval reminder **per tingkat approval** (default weekday harian) (FR-RMD-02).
- **Akses:** Super Admin.
- **Layout:** Form setting.
- **Komponen:** Daftar level + input interval; info default Senin–Jumat.
- **Exit/Next:** —

---

### 6.21 `Notifications/Index` — `/notifications`

- **Tujuan:** Halaman notifikasi penuh (FR-NTF-01).
- **Akses:** Semua role.
- **Komponen:** List kronologis + pagination; item (ikon kategori, teks, waktu relatif mono, dot unread); "Mark all as read".
- **Aksi:** Klik item → halaman terkait + mark as read.
- **Entry point:** Bell topbar → "Lihat semua".

### 6.22 `Profile/Edit` — `/profile`

- **Tujuan:** Profil & **preferensi bahasa ID/EN** (FR-I18N-01).
- **Akses:** Semua role.
- **Komponen:** Field profil, language switcher (tersimpan), ganti password.

### 6.23 `Profile/Signature` — `/profile/signature`

- **Tujuan:** Kelola **Saved Signature** (FR-SIG).
- **Akses:** Semua role (utama untuk approver ber-TTD).
- **Komponen:** `SignaturePad` (draw/upload), preview TTD aktif, ganti (lama non-aktif demi audit, FR-SIG-04).
- **Catatan:** Dipakai di Approval Screen pada level `requires_signature`.

---

## 7. Navigasi Berbasis Status

Status ATP (01–16) menentukan **aktor, aksi, dan rute** di `Documents/Show` (Aviat/Partner) dan `Approvals/Screen` (approver/admin-L1). Panel aksi bersifat adaptif.

### 7.1 Aksi per Status (16 status)

| Kode | Status | Aktor aktif | Aksi tersedia | Halaman aksi |
|---|---|---|---|---|
| draft | Draft | Partner / Admin | Edit, Submit, Hapus | `Documents/Edit` |
| 01 | Submit & On Review L1 | **Admin (L1)** | Approve / Reject *(approve-only, tanpa TTD)* | `Approvals/Screen` |
| 02 | L1 Rejected — Need Rectification | Partner / Admin | Revisi → kirim ulang ke L1 | `Documents/Edit` → revise |
| 03 | Done Rectification — On Review L1 | Admin (L1) | Approve / Reject | `Approvals/Screen` |
| 04 | L1 Approve — On Review L2 | Approver L2 | Approve / w-Punchlist / Reject | `Approvals/Screen` |
| 05 | L2 Rejected — Need Rectification | Partner / Admin | Revisi → kirim ulang ke L2 | `Documents/Edit` → revise |
| 06 | Done Rectification — On Review L2 | Approver L2 | Approve / w-Punchlist / Reject | `Approvals/Screen` |
| 07 | L2 Approve — On Review L3 | Approver L3 | Approve / w-Punchlist / Reject | `Approvals/Screen` |
| 08 | L3 Rejected — Need Rectification | Partner / Admin | Revisi → kirim ulang ke L3 | `Documents/Edit` → revise |
| 09 | Done Rectification — On Review L3 | Approver L3 | Approve / w-Punchlist / Reject | `Approvals/Screen` |
| 10 | L3 Approve — On Review L4 | Approver L4 | Approve / w-Punchlist / Reject | `Approvals/Screen` |
| 11 | L4 Rejected — Need Rectification | Partner / Admin | Revisi → kirim ulang ke L4 | `Documents/Edit` → revise |
| 12 | Done Rectification — On Review L4 | Approver L4 | Approve / w-Punchlist / Reject | `Approvals/Screen` |
| 13 | ATP Done — All Approve | — | Download PDF final, arsip | `Documents/Show` |
| 14 | ATP Done w/ Punchlist — Need Rectification | Admin | Upload PDF revisi punchlist | `Documents/Edit` → revise |
| 15 | Punchlist Revised — Waiting Verification | Approver pembuat punchlist | Verify / Accept Revision (atau tolak → 14) | `Approvals/Screen` (mode verify) |
| 16 | Closed — Punchlist Verified | — | Download PDF final, arsip | `Documents/Show` |

> 📌 **Jumlah level mengikuti SOW.** SOW 3-level: level terakhir = L3 → setelah L3 approve langsung **13** (status 10–12 tidak dipakai). Label "…On Review L{next}" hanya muncul bila ada level berikutnya. IA halaman tidak berubah — hanya jumlah node `ApprovalTimeline`.
> 📌 **L1 & MS BO approve-only** → di `Approvals/Screen`, Signature Pad disembunyikan; aksi cukup Approve / Reject.

### 7.2 Aturan Navigasi yang Mempengaruhi IA

- **Originator = Partner.** Submit oleh Partner mulai 01; submit direct Admin auto-approve L1 mulai 04.
- **Reject tidak mereset sequence** → revisi (oleh Partner/Admin) dikirim kembali hanya ke level yang reject; approval sebelumnya tetap sah.
- **Approve with Punchlist tidak menghentikan alur** → lanjut ke approver berikutnya; fase verifikasi punchlist (14→16) aktif setelah approver terakhir.
- **Reassign** mencabut akses approver lama ke `/documents/{id}/approval`, memberi akses approver baru pada step sama (sequence tak mundur), **tanpa OTP**.
- **Visibilitas Partner** = s/d L1; level di atasnya generik tanpa detail PIC.
- **Status di-derive** dari `ApprovalStep` + keberadaan punchlist — UI membaca, tidak menyetel manual.

---

## 8. Alur Navigasi Kunci (User Journeys)

### 8.1 Partner — Submit Dokumen

```
/dashboard (Partner) ──[Submit Document]──▶ /documents/create
                                              │ isi metadata (+ PT Index)
                                              │ pilih SOW → slot approver L2..Ln
                                              │ pilih PIC (ter-filter role)
                                              │ upload PDF (+ Excel opsional)
                                              │ auto-anchor / manual placement
                                              ▼
                                  [Submit] ─▶ status 01 · notif SEMUA Admin Aviat
                                              ▼
                                  /documents/{id} (lihat progres s/d L1)
```

### 8.2 Admin — Approve L1 (approve-only)

```
🔔/📧 "Dokumen baru menunggu L1"  ──▶  /approvals (L1 Approvals)
                                          │ buka dokumen
                                          ▼
                                  /documents/{id}/approval
                                          │ review PDF (+ Excel view-only)
                                          │ TANPA Signature Pad (approve-only)
                                          │ [Approve]  (atau [Reject] + catatan)
                                          ▼
                                  status 04 (On Review L2) · notif approver L2
```

### 8.3 Approver Customer — Approve via Deep Link (tanpa OTP)

```
📧 Email approval (ringkasan + link, TANPA OTP)
        │ klik link
        ▼
  belum login? ──▶ /login ──(intended URL)──▶ /documents/{id}/approval
        │ sudah login
        ▼
  /documents/{id}/approval
        │ review PDF (kiri) · Action Panel (kanan)
        │ requires_signature? ─ya─▶ SignaturePad (atau Saved Signature)
        │ [Approve]
        ▼
  toast sukses · ApprovalTimeline maju
        │ bukan terakhir ──▶ status maju · notif approver berikutnya
        │ terakhir, tanpa punchlist ──▶ 13 (ATP Done)
        │ terakhir, ada punchlist ──▶ 14
        ▼
  kembali ke /approvals
```

### 8.4 Siklus Punchlist (14 → 16)

```
status 14 (ATP Done w/ Punchlist)
   │ Admin: /documents/{id}/edit ▶ upload PDF revisi
   ▼
status 15 (Punchlist Revised — Waiting Verification)
   │ email ke SEMUA approver pembuat punchlist
   │ tiap approver: /documents/{id}/approval (mode verify) ▶ [Verify]
   │   └─ tidak puas? ▶ tolak ▶ kembali ke status 14
   ▼ (semua pembuat punchlist verify)
status 16 (Closed — Punchlist Verified) ▶ arsip, download final
```

### 8.5 Reassign Approver (Admin)

```
/documents/{id}  ──[Reassign]──▶ modal Reassign
                                   │ pilih approver baru (ter-filter role)
                                   │ notes (alasan) + attachment
                                   ▼
                                submit
                                   │ approver lama: akses dicabut
                                   │ approver baru: notif in-app + email (TANPA OTP) bila giliran aktif
                                   │ tercatat di Audit Trail
                                   ▼
                                /documents/{id} (ApprovalTimeline update)
```

### 8.6 Entry Point Notifikasi → Halaman Tujuan (SRS §10.2)

| Notifikasi (event) | Penerima | Klik → halaman |
|---|---|---|
| Dokumen disubmit (sent receipt) | **Semua Admin Aviat** | `/documents/{id}` (lalu `/approval` untuk L1) |
| Giliran approval tiba | Approver giliran aktif | `/documents/{id}/approval` |
| Approve / w-Punchlist | **Semua Admin Aviat** | `/documents/{id}` |
| Reject | **Semua Admin Aviat** | `/documents/{id}` (lalu Edit/revise) |
| Alur selesai (13/14) | Semua Admin + approver terkait | `/documents/{id}` |
| Admin revisi punchlist | Approver pembuat punchlist | `/documents/{id}/approval` (verify) |
| Reassign | Approver baru (tanpa OTP) | `/documents/{id}/approval` |
| Hasil s/d L1 & dokumen reject (revisi) | **Partner** pemilik | `/documents/{id}` (lalu revisi) |
| Pending > interval (weekday) | Approver terkait + semua Admin | `/documents/{id}/approval` |

> 📌 Notifikasi ke **Partner saat reject dari L2+** disampaikan **manual oleh Admin via WA** (di luar sistem); aplikasi menampilkan status reject + tombol revisi di UI Partner (SRS §10.2 catatan).

---

## 9. Lampiran

### 9.1 Matriks Role × Halaman (ringkas)

| Halaman | Super Admin | Admin | Viewer | Partner | Approver |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ (RO) | ✅ (s/d L1) | ✅ |
| Approvals/Index (L1 / Need Approval) | ✅ (L1) | ✅ (L1) | ❌ | ❌ | ✅ |
| Approvals/History | ⚠️ | ⚠️ | ❌ | ❌ | ✅ |
| Approvals/Screen | ✅ (L1) | ✅ (L1) | ❌ | ❌ | ✅ (giliran) |
| Documents/Index | ✅ | ✅ | ✅ (RO) | ⚠️ (mine) | ⚠️ (terkait) |
| Documents/Create (Submit) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Documents/Import | ✅ | ✅ | ❌ | ❌ | ❌ |
| Documents/Show (tabs) | ✅ | ✅ | ✅ (RO) | ⚠️ (s/d L1) | ⚠️ (terkait) |
| Documents/Edit (revise) | ✅ | ✅ | ❌ | ⚠️ (miliknya) | ❌ |
| Documents/Export (Excel) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Partners/* | ✅ | ✅ | ❌ | ❌ | ❌ |
| Templates/* | ✅ | ✅ | ❌ | ❌ | ❌ |
| Users/* | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings/Reminders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Notifications · Profile · Signature | ✅ | ✅ | ✅ | ✅ | ✅ |

RO = read-only · ⚠️ = terbatas.

### 9.2 Peta Inertia Pages → Layout

| Inertia Page | Layout |
|---|---|
| `Auth/*` | Standalone (tanpa App Shell) |
| `Dashboard/*`, `Approvals/Index`·`History`, `Documents/*` (kecuali approval), `Partners/*`, `Templates/*`, `Users/*`, `Settings/*`, `Notifications`, `Profile/*` | `AppShell.tsx` |
| `Approvals/Screen` | `ApprovalLayout.tsx` (2 kolom, DS §14.1) |

### 9.3 Komponen Domain per Halaman (DS §13)

| Komponen | Dipakai di |
|---|---|
| `StatusBadge` | Index, Show, Approval Screen, History, Dashboard |
| `DocumentCard` | Index (mobile), Dashboard, Approvals, History |
| `ApprovalTimeline` ⭐ | Show (tab Timeline), Approval Screen |
| `SignaturePad` | Approval Screen (level requires_signature), Profile/Signature |
| `MetricCard` | Dashboard |
| `DataTable` | Index, Partners, Templates, Users |
| `NotificationBell` | Topbar (semua halaman ber-App Shell) |
| Dual-zone File Upload (PDF + Excel) | Documents/Create, Import, Edit |
| Tabs · Breadcrumb | Documents/Show, Topbar |

> ⚠️ **Dihapus dari v1.0:** `SignalLadder` (→ `ApprovalTimeline`) dan `OtpInput` (OTP dihapus).

### 9.4 Catatan Kedalaman & Konsistensi

- **Maks 3 level** root → halaman aksi (mis. `Documents → {id} → approval`).
- **Satu route, banyak status:** `Documents/Show` & `Approvals/Screen` adaptif-status (bukan halaman per status) — menjaga jumlah halaman ramping.
- **`requires_signature`** mengubah isi Approval Screen (Signature Pad on/off), bukan rutenya.
- **Visibilitas Partner** dibatasi di level data/komponen (s/d L1), bukan via route terpisah.
- **Out of scope v1** (tanpa halaman): pembuatan ATP in-app, upload master via Excel (ditunda), OTP, document_type HW/SW, WhatsApp otomatis, modul project/task/BOQ, multi-tenant (SRS §1.2).

---

*— End of IA v2.0 —*
