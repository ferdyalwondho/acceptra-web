# Acceptra — Design System

> **Source of Truth** untuk pengembangan UI Acceptra (Document Approval System).
> Gaya: **Minimalist · Corporate**. Brand: **Aviat Networks**.

| | |
|---|---|
| **Produk** | Acceptra — Document Approval System |
| **Domain** | acceptra.id |
| **Versi DS** | 2.0 |
| **Tanggal** | Juni 2026 |
| **Penyusun** | PT Anugerah Mahameru Nusantara (AMN) |
| **Stack target** | Laravel 11 · Inertia.js · React · **shadcn/ui** · Tailwind CSS · PostgreSQL |
| **Referensi** | **SRS Acceptra v2.0**; PRD Acceptra v2.0 |

### Revision History
| Versi | Perubahan |
|---|---|
| 1.0 | DS awal (gaya Minimalism × Glassmorphism, 13 status). |
| **2.0** | **Glassmorphism dihapus → gaya Minimalist Corporate.** Selaras SRS v2.0: **16-status lifecycle**, role **Partner** & **L1 Admin Aviat (approve-only)**, **OTP dihapus**, lampiran **Excel** + **Export Excel**, flag **requires_signature** per level, **Unique ID** `ACC-{tahun}-{urut}`, reminder weekday. |

---

## Daftar Isi

1. [Prinsip Desain](#1-prinsip-desain)
2. [Brand Foundation](#2-brand-foundation)
3. [Color Tokens](#3-color-tokens)
4. [Typography](#4-typography)
5. [Spacing, Radius & Grid](#5-spacing-radius--grid)
6. [Elevation & Surface](#6-elevation--surface)
7. [Motion](#7-motion)
8. [Z-Index & Breakpoints](#8-z-index--breakpoints)
9. [CSS Variables (copy-paste)](#9-css-variables-copy-paste)
10. [Tailwind & shadcn Mapping](#10-tailwind--shadcn-mapping)
11. [Roles & UI Personas](#11-roles--ui-personas)
12. [Status System (16 ATP statuses)](#12-status-system-16-atp-statuses)
13. [Component Library](#13-component-library)
14. [Layout Patterns](#14-layout-patterns)
15. [Accessibility](#15-accessibility)
16. [i18n / Bilingual](#16-i18n--bilingual)
17. [Struktur File di Repo](#17-struktur-file-di-repo)

---

## 1. Prinsip Desain

Acceptra dipakai empat tipe pengguna: **Admin Aviat** (sering, kelola & approve L1), **Partner/Subcon** (originator — submit & revisi), **Approver customer** (menyetujui, sebagian dengan TTD, sering dari HP), dan **Viewer** (read-only). Gaya visual harus terasa **tenang, terpercaya, dan profesional** — seperti aplikasi enterprise yang dipakai harian, bukan etalase.

> **Bersih, terstruktur, dapat dipercaya. Setiap elemen punya alasan; tidak ada dekorasi.**

1. **Minimalis = disiplin, bukan kosong.** Kekuatan tampilan dari **spacing, hierarki tipografi, dan garis hairline** — bukan efek. Permukaan solid (putih di atas abu lembut), bayangan halus, sudut membulat ringan. **Tanpa glassmorphism, blur, atau gradient mencolok.**
2. **Netral mendominasi, brand seperlunya.** Mayoritas layar abu-netral. Hijau Aviat hanya untuk **aksi primer & indikator sukses**; biru Ming untuk **struktur, link, dan info**. Idealnya satu titik warna brand dominan per layar.
3. **Struktur mengkodekan makna.** Penomoran level (L1–L4) dan kode status (01–16) adalah **urutan nyata** alur approval → numerik & monospace dibenarkan (fungsional, bukan hias). Unique ID `ACC-{tahun}-{urut}` selalu monospace.
4. **Aksi sesederhana mungkin.** Approval kini **tanpa OTP**: review → (tanda tangan bila level memerlukan) → submit. Maksimal satu keputusan utama per layar. Tombol menyebut aksinya (`Approve`, bukan `Submit`).
5. **Mobile setara desktop.** Approver bisa menyetujui dari HP; komponen responsif, target sentuh ≥ 44px.
6. **Elemen identitas: _Approval Timeline_.** Stepper vertikal L1→L4 yang jelas menampilkan giliran, status, dan PIC tiap level. Dirender minimal (marker solid, garis penghubung) — inilah komponen khas Acceptra, tanpa efek berlebih.

---

## 2. Brand Foundation

Warna brand resmi Aviat Networks: **Apple Green `#55AA39`**, **Ming Blue `#325F7D`**, **White**. Acceptra menambah **Deep Green `#3B6D11`** sebagai warna aksi/teks hijau yang aksesibel.

Pembagian peran (penting untuk nuansa korporat):

| Warna | Hex | Peran |
|---|---|---|
| **Deep Green** | `#3B6D11` | **Aksi primer** (fill tombol) & teks/ikon sukses. Kontras aman dengan teks putih. |
| **Aviat Green** | `#55AA39` | Aksen ringan, ring fokus, indikator aktif. **Bukan** background teks kecil. |
| **Ming Blue** | `#325F7D` | **Struktur korporat**: link, header tabel, info, aksi sekunder, item nav aktif. |
| **White** | `#FFFFFF` | Surface kartu. |
| **Slate netral** | `#111827…#F9FAFB` | Mendominasi seluruh UI. |

Logo & identitas Aviat tampil di header, login, dan email (SRS FR-BRD-01); isi PDF ATP tetap format baku XLSmart (FR-BRD-02). Tidak ada gradient brand pada UI v2.0 — solid color only.

---

## 3. Color Tokens

Pola token `--color-{kategori}-{peran}`. Hex final adalah satu-satunya sumber kebenaran.

### 3.1 Surface (background)

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-bg-canvas` | `#F9FAFB` | Background halaman / app shell. |
| `--color-bg-surface` | `#FFFFFF` | Kartu, panel, modal, baris tabel. |
| `--color-bg-subtle` | `#F3F4F6` | Input, header tabel, hover row, zona netral. |
| `--color-bg-inverse` | `#111827` | Footer / area gelap. |

### 3.2 Text

| Token | Hex | Kontras di putih | Penggunaan |
|---|---|---|---|
| `--color-text-primary` | `#111827` | 16.1 ✅ | Judul & body utama. |
| `--color-text-secondary` | `#4B5563` | 8.6 ✅ | Label, metadata, deskripsi. |
| `--color-text-tertiary` | `#9CA3AF` | 2.5 ⚠️ | Placeholder, disabled — **non-esensial saja**. |
| `--color-text-inverse` | `#FFFFFF` | — | Teks di atas fill brand/gelap. |
| `--color-text-link` | `#325F7D` | 5.6 ✅ | Tautan. |

### 3.3 Brand

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-brand` | `#55AA39` | Aksen, ring fokus, indikator aktif. |
| `--color-brand-ink` | `#3B6D11` | Fill aksi primer + teks hijau (aksesibel). |
| `--color-brand-hover` | `#345F0F` | Hover tombol primer. |
| `--color-brand-surface` | `#EAF3DE` | Background lembut hijau (badge sukses, highlight aktif). |
| `--color-secondary` | `#325F7D` | Ming Blue — aksi sekunder/struktur. |
| `--color-secondary-surface` | `#E6F1FB` | Background lembut biru (nav aktif, info). |

### 3.4 Semantic (pasangan surface + text)

| Makna | Surface | Text/Icon | Token |
|---|---|---|---|
| **Info / In Review** | `#E6F1FB` | `#185FA5` | `--color-info-surface` / `--color-info-text` |
| **Success / Done** | `#EAF3DE` | `#3B6D11` | `--color-success-surface` / `--color-success-text` |
| **Warning / Punchlist** | `#FAEEDA` | `#854F0B` | `--color-warning-surface` / `--color-warning-text` |
| **Danger / Rejected** | `#FCEBEB` | `#A32D2D` | `--color-danger-surface` / `--color-danger-text` |

### 3.5 Border & Ring

| Token | Nilai | Penggunaan |
|---|---|---|
| `--color-border` | `#E5E7EB` | Hairline default (kartu, divider). |
| `--color-border-strong` | `#D1D5DB` | Border input, pemisah kuat. |
| `--color-ring` | `rgba(85,170,57,.40)` | Focus ring (3px) semua interaktif. |

---

## 4. Typography

Korporat-minimal: **satu keluarga sans yang netral & sangat terbaca**, plus mono untuk data. Tidak ada display face eksentrik.

| Peran | Typeface | Dipakai untuk |
|---|---|---|
| **UI / Body / Heading** | **Inter** | Seluruh teks — judul (berat tinggi, tracking ketat) sampai body. Netral, profesional, prima di ukuran kecil. |
| **Mono** | **JetBrains Mono** | Unique ID `ACC-…`, Link ID, Project Code, kode status (01–16), timestamp audit. |

> Alternatif setara bila ingin nuansa enterprise lebih kuat: **IBM Plex Sans**. Pilih salah satu, jangan campur.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```
Self-host di produksi (performa + opsi data residency).

### Type scale (1.200 — Minor Third, base 16px). Skala konservatif khas dashboard korporat.

| Token | rem | px | Weight | Tracking | Penggunaan |
|---|---|---|---|---|---|
| `text-display` | 2.488 | 39.8 | 700 | -0.02em | Angka besar dashboard |
| `text-h1` | 2.074 | 33.2 | 700 | -0.02em | Judul halaman |
| `text-h2` | 1.728 | 27.6 | 600 | -0.01em | Section |
| `text-h3` | 1.44 | 23.0 | 600 | -0.01em | Judul kartu |
| `text-h4` | 1.2 | 19.2 | 600 | 0 | Judul komponen |
| `text-lg` | 1.125 | 18.0 | 500 | 0 | Lead |
| `text-base` | 1.0 | 16.0 | 400 | 0 | Body |
| `text-sm` | 0.875 | 14.0 | 400 | 0 | UI default, tabel |
| `text-xs` | 0.75 | 12.0 | 500 | 0.01em | Label, badge, caption |
| `text-mono` | 0.8125 | 13.0 | 500 | 0 | ID & kode |

**Line-height:** judul `1.2`, body `1.6`, UI padat `1.45`. Teks utama UI default `text-sm` (14px) — padat & efisien untuk aplikasi operasional.

---

## 5. Spacing, Radius & Grid

### Spacing (base 4px)
`0, 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64` — selaras 1:1 dengan Tailwind. Gutter konten desktop `24px`, mobile `16px`. Padding kartu `20–24px`. Padding sel tabel `12px 16px`.

### Radius — lebih kalem/crisp dari v1 (korporat cenderung tidak terlalu bulat)

| Token | Nilai | Penggunaan |
|---|---|---|
| `--radius-sm` | `6px` | Input, badge, tombol kecil. |
| `--radius-md` | `8px` | Tombol, dropdown, kartu kecil. |
| `--radius-lg` | `12px` | Kartu, panel. |
| `--radius-xl` | `16px` | Modal. |
| `--radius-pill` | `999px` | Status chip, avatar, toggle. |

### Grid
- Desktop: max-width konten `1280px`, gutter `24px`.
- App shell: sidebar `256px` (collapse `64px`) + konten fluid.
- Layar approval: **2 kolom** — Document Preview (kiri ~58%) + Action Panel (kanan ~42%, sticky). Mobile menumpuk; aksi utama jadi sticky bottom bar.

---

## 6. Elevation & Surface

Pengganti sistem glass. Hierarki dari **border + bayangan halus**, bukan blur. Bayangan netral, low-opacity, ala dashboard enterprise.

| Tier | Token | Resep | Penggunaan |
|---|---|---|---|
| **0 — Flat** | `--shadow-none` | `border:1px solid var(--color-border)` | Baris tabel, input, divider. |
| **1 — Card** | `--shadow-xs` | `0 1px 2px rgba(16,24,40,.05)` + border | Kartu dashboard, dokumen, action panel. |
| **2 — Raised** | `--shadow-sm` | `0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)` | Dropdown, popover, sticky topbar. |
| **3 — Overlay** | `--shadow-lg` | `0 12px 16px -4px rgba(16,24,40,.08), 0 4px 6px -2px rgba(16,24,40,.03)` | Modal, drawer. |

Aturan: latar app selalu `--color-bg-canvas` (abu lembut) agar kartu putih "terangkat" tanpa bayangan berat. Hindari menumpuk bayangan; satu tier per elemen. Tidak ada `backdrop-filter` di mana pun.

```css
.card{
  background:var(--color-bg-surface);
  border:1px solid var(--color-border);
  border-radius:var(--radius-lg);
  box-shadow:var(--shadow-xs);
}
```

---

## 7. Motion

Halus, cepat, fungsional. Hormati `prefers-reduced-motion`. Korporat = transisi tak mencolok (fade/translate kecil), tanpa pulse/glow.

| Token | Nilai | Penggunaan |
|---|---|---|
| `--ease-standard` | `cubic-bezier(.4,0,.2,1)` | Transisi state umum. |
| `--ease-out` | `cubic-bezier(0,0,.2,1)` | Masuk / reveal. |
| `--dur-fast` | `120ms` | Hover, fokus, tap. |
| `--dur-base` | `180ms` | Dropdown, toggle, badge. |
| `--dur-slow` | `260ms` | Modal, drawer. |

```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{ animation-duration:.001ms!important; transition-duration:.001ms!important; }
}
```
Hover kartu/baris: ganti background atau border, **bukan** translate besar. Modal: fade + scale `.98→1`.

---

## 8. Z-Index & Breakpoints

| Layer | z-index |
|---|---|
| base | `0` |
| sticky header / sidebar | `100` |
| dropdown / popover | `200` |
| toast | `300` |
| modal overlay | `400` |
| modal | `410` |

| Breakpoint | px | Tailwind |
|---|---|---|
| sm | 640 | `sm:` |
| md | 768 | `md:` |
| lg | 1024 | `lg:` |
| xl | 1280 | `xl:` |
| 2xl | 1536 | `2xl:` |

Uji approver-mobile di `375–414px`.

---

## 9. CSS Variables (copy-paste)

Letakkan di `resources/css/app.css`. Light = `:root`, dark = `.dark` (opsional v1).

```css
:root{
  /* Surface */
  --color-bg-canvas:#F9FAFB; --color-bg-surface:#FFFFFF;
  --color-bg-subtle:#F3F4F6; --color-bg-inverse:#111827;
  /* Text */
  --color-text-primary:#111827; --color-text-secondary:#4B5563;
  --color-text-tertiary:#9CA3AF; --color-text-inverse:#FFFFFF; --color-text-link:#325F7D;
  /* Brand */
  --color-brand:#55AA39; --color-brand-ink:#3B6D11; --color-brand-hover:#345F0F;
  --color-brand-surface:#EAF3DE;
  --color-secondary:#325F7D; --color-secondary-surface:#E6F1FB;
  /* Semantic */
  --color-info-surface:#E6F1FB;    --color-info-text:#185FA5;
  --color-success-surface:#EAF3DE; --color-success-text:#3B6D11;
  --color-warning-surface:#FAEEDA; --color-warning-text:#854F0B;
  --color-danger-surface:#FCEBEB;  --color-danger-text:#A32D2D;
  /* Border & Ring */
  --color-border:#E5E7EB; --color-border-strong:#D1D5DB;
  --color-ring:rgba(85,170,57,.40);
  /* Radius */
  --radius-sm:6px; --radius-md:8px; --radius-lg:12px; --radius-xl:16px; --radius-pill:999px;
  /* Elevation */
  --shadow-xs:0 1px 2px rgba(16,24,40,.05);
  --shadow-sm:0 1px 3px rgba(16,24,40,.08),0 1px 2px rgba(16,24,40,.04);
  --shadow-md:0 4px 8px -2px rgba(16,24,40,.10),0 2px 4px -2px rgba(16,24,40,.06);
  --shadow-lg:0 12px 16px -4px rgba(16,24,40,.08),0 4px 6px -2px rgba(16,24,40,.03);
  /* Motion */
  --ease-standard:cubic-bezier(.4,0,.2,1); --ease-out:cubic-bezier(0,0,.2,1);
  --dur-fast:120ms; --dur-base:180ms; --dur-slow:260ms;
  /* Type */
  --font-sans:"Inter",system-ui,sans-serif;
  --font-mono:"JetBrains Mono",ui-monospace,monospace;
}

.dark{
  --color-bg-canvas:#0E1726; --color-bg-surface:#141C2A;
  --color-bg-subtle:#1B2536; --color-bg-inverse:#FFFFFF;
  --color-text-primary:#F3F4F6; --color-text-secondary:#AEB8C7;
  --color-text-tertiary:#5C6B7E; --color-text-inverse:#0E1726; --color-text-link:#7FB4E6;
  --color-brand:#7ED321; --color-brand-ink:#A8E063; --color-brand-hover:#8FE13A;
  --color-brand-surface:#1F3314;
  --color-secondary:#7FB4E6; --color-secondary-surface:#10243A;
  --color-info-surface:#10243A;    --color-info-text:#7FB4E6;
  --color-success-surface:#1F3314; --color-success-text:#A8E063;
  --color-warning-surface:#2E2410; --color-warning-text:#E6B25C;
  --color-danger-surface:#2E1414;  --color-danger-text:#E68A8A;
  --color-border:#27324A; --color-border-strong:#33415C;
  --color-ring:rgba(126,211,33,.40);
  --shadow-xs:0 1px 2px rgba(0,0,0,.3);
  --shadow-sm:0 1px 3px rgba(0,0,0,.4); --shadow-md:0 4px 8px -2px rgba(0,0,0,.5);
  --shadow-lg:0 12px 16px -4px rgba(0,0,0,.55);
}

body{
  font-family:var(--font-sans);
  font-size:14px; line-height:1.45;
  color:var(--color-text-primary);
  background:var(--color-bg-canvas);
}
```

---

## 10. Tailwind & shadcn Mapping

### 10.1 `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode:["class"],
  content:["./resources/**/*.{js,jsx,ts,tsx,blade.php}"],
  theme:{
    extend:{
      colors:{
        border:"hsl(var(--border))", input:"hsl(var(--input))", ring:"hsl(var(--ring))",
        background:"hsl(var(--background))", foreground:"hsl(var(--foreground))",
        primary:{DEFAULT:"hsl(var(--primary))", foreground:"hsl(var(--primary-foreground))"},
        secondary:{DEFAULT:"hsl(var(--secondary))", foreground:"hsl(var(--secondary-foreground))"},
        muted:{DEFAULT:"hsl(var(--muted))", foreground:"hsl(var(--muted-foreground))"},
        accent:{DEFAULT:"hsl(var(--accent))", foreground:"hsl(var(--accent-foreground))"},
        destructive:{DEFAULT:"hsl(var(--destructive))", foreground:"hsl(var(--destructive-foreground))"},
        card:{DEFAULT:"hsl(var(--card))", foreground:"hsl(var(--card-foreground))"},
        popover:{DEFAULT:"hsl(var(--popover))", foreground:"hsl(var(--popover-foreground))"},
        // brand & semantic langsung (badge/status)
        brand:{DEFAULT:"#55AA39", ink:"#3B6D11", surface:"#EAF3DE"},
        ming:{DEFAULT:"#325F7D", surface:"#E6F1FB"},
        info:{surface:"#E6F1FB", DEFAULT:"#185FA5"},
        success:{surface:"#EAF3DE", DEFAULT:"#3B6D11"},
        warning:{surface:"#FAEEDA", DEFAULT:"#854F0B"},
        danger:{surface:"#FCEBEB", DEFAULT:"#A32D2D"},
      },
      fontFamily:{
        sans:["Inter","system-ui","sans-serif"],
        mono:["JetBrains Mono","ui-monospace","monospace"],
      },
      borderRadius:{ sm:"6px", md:"8px", lg:"12px", xl:"16px" },
      boxShadow:{
        xs:"0 1px 2px rgba(16,24,40,.05)",
        sm:"0 1px 3px rgba(16,24,40,.08),0 1px 2px rgba(16,24,40,.04)",
        md:"0 4px 8px -2px rgba(16,24,40,.10),0 2px 4px -2px rgba(16,24,40,.06)",
        lg:"0 12px 16px -4px rgba(16,24,40,.08),0 4px 6px -2px rgba(16,24,40,.03)",
      },
      transitionTimingFunction:{ standard:"cubic-bezier(.4,0,.2,1)" },
    },
  },
  plugins:[require("tailwindcss-animate")],
}
```

### 10.2 shadcn CSS vars (HSL) — themed Aviat (corporate)

**Primary = Deep Green** (kontras aman teks putih); Aviat Green murni → `--ring`. Ming Blue → `--secondary`.

```css
:root{
  --background:210 20% 99%;   --foreground:222 47% 11%;
  --card:0 0% 100%;           --card-foreground:222 47% 11%;
  --popover:0 0% 100%;        --popover-foreground:222 47% 11%;
  --primary:93 73% 25%;       --primary-foreground:0 0% 100%;     /* #3B6D11 */
  --secondary:204 43% 34%;    --secondary-foreground:0 0% 100%;   /* #325F7D */
  --muted:220 14% 96%;        --muted-foreground:215 14% 34%;     /* #4B5563 */
  --accent:204 60% 94%;       --accent-foreground:204 43% 28%;    /* ming surface */
  --destructive:0 57% 41%;    --destructive-foreground:0 0% 100%;
  --border:220 13% 91%;       --input:220 13% 85%;
  --ring:105 50% 45%;                                             /* #55AA39 */
  --radius:0.5rem;
}
.dark{
  --background:222 39% 11%;   --foreground:220 14% 96%;
  --card:222 31% 14%;         --card-foreground:220 14% 96%;
  --popover:222 31% 14%;      --popover-foreground:220 14% 96%;
  --primary:88 64% 49%;       --primary-foreground:222 47% 11%;
  --secondary:208 64% 70%;    --secondary-foreground:222 47% 11%;
  --muted:222 25% 18%;        --muted-foreground:217 14% 73%;
  --accent:208 50% 22%;       --accent-foreground:208 64% 80%;
  --destructive:0 50% 50%;    --destructive-foreground:0 0% 100%;
  --border:222 20% 22%;       --input:222 20% 28%;
  --ring:88 64% 49%;
}
```

---

## 11. Roles & UI Personas

SRS v2.0: **satu user = satu role**. UI adaptif per role (role-based, bukan feature-based).

| Role | Tipe | Tugas inti | Yang dilihat |
|---|---|---|---|
| **Super Admin** | Aviat | Kelola sistem, user, template/SOW, partner. | Semua menu admin + Settings. |
| **Admin** | Aviat | **Approver L1 (approve-only)**, kelola dokumen, submit direct (auto-approve L1), reassign, export Excel. | Dashboard admin, Documents, Approvals (L1), Partners, Templates. |
| **Viewer** | Aviat | Memantau read-only, export Excel. | List & dashboard (read-only). |
| **Partner / Subcon** | Eksternal | **Originator**: submit dokumen + lampiran Excel, pilih approver L2+, revisi saat reject. | Hanya dokumen miliknya; status & audit **s/d L1**; tombol revisi. |
| **Approver** (MS BO · MS RTS · RTH Team · RTH) | Customer | Approve / Reject / Approve with Punchlist pada giliran; sebagian **dengan TTD**, sebagian **approve-only** (per `requires_signature`). | List "Need Approval" + riwayat; halaman approval. |

**Implikasi UI kunci:**
- **L1 approve-only & approve-only lain (mis. MS BO):** sembunyikan Signature Pad; aksi cukup Approve / Reject.
- **Partner:** Approval Timeline hanya menampilkan progres **s/d L1**; level di atasnya ditampilkan generik ("Dalam proses approval customer") tanpa detail PIC.
- **Badge role** pakai warna netral (bukan semantik status) agar tidak rancu dengan StatusBadge.

---

## 12. Status System (16 ATP statuses)

Sumber: **SRS v2.0 §7**. Setiap kode → satu kategori semantik + ikon. Tampilkan sebagai **Status Badge** (pill). Kode `NN` selalu monospace.

| Kode | Status | Kategori | Token | Ikon (lucide) |
|---|---|---|---|---|
| `01` | Submit & On Review L1 | Info | info | `inbox` |
| `02` | L1 Rejected – Need Rectification | Danger | danger | `x-circle` |
| `03` | Done Rectification – On Review L1 | Info | info | `rotate-cw` |
| `04` | L1 Approve – On Review L2 | Info | info | `arrow-up-circle` |
| `05` | L2 Rejected – Need Rectification | Danger | danger | `x-circle` |
| `06` | Done Rectification – On Review L2 | Info | info | `rotate-cw` |
| `07` | L2 Approve – On Review L3 | Info | info | `arrow-up-circle` |
| `08` | L3 Rejected – Need Rectification | Danger | danger | `x-circle` |
| `09` | Done Rectification – On Review L3 | Info | info | `rotate-cw` |
| `10` | L3 Approve – On Review L4 | Info | info | `arrow-up-circle` |
| `11` | L4 Rejected – Need Rectification | Danger | danger | `x-circle` |
| `12` | Done Rectification – On Review L4 | Info | info | `rotate-cw` |
| `13` | ATP Done – All Approver Approve | Success | success | `check-circle-2` |
| `14` | ATP Done with Punchlist – Need Rectification | Warning | warning | `clipboard-list` |
| `15` | Punchlist Revised – Waiting Verification | Warning | warning | `clock` |
| `16` | Closed – Punchlist Verified | Success | success | `lock` |

> **Catatan SOW (SRS §7):** jumlah level mengikuti SOW. Pada SOW 3-level, L3 = level terakhir → setelah L3 approve langsung **13** (status 10–12 tidak dipakai). Label "...On Review L{next}" hanya muncul bila ada level berikutnya. Submit direct oleh Admin → mulai dari **04**.

**Definisi mapping — `resources/js/lib/status.ts`:**

```ts
export type StatusCategory = "info" | "success" | "warning" | "danger";

export const ATP_STATUS: Record<string,{label:string;category:StatusCategory;icon:string}> = {
  "01":{label:"Submit & On Review L1",category:"info",icon:"Inbox"},
  "02":{label:"L1 Rejected – Need Rectification",category:"danger",icon:"XCircle"},
  "03":{label:"Done Rectification – On Review L1",category:"info",icon:"RotateCw"},
  "04":{label:"L1 Approve – On Review L2",category:"info",icon:"ArrowUpCircle"},
  "05":{label:"L2 Rejected – Need Rectification",category:"danger",icon:"XCircle"},
  "06":{label:"Done Rectification – On Review L2",category:"info",icon:"RotateCw"},
  "07":{label:"L2 Approve – On Review L3",category:"info",icon:"ArrowUpCircle"},
  "08":{label:"L3 Rejected – Need Rectification",category:"danger",icon:"XCircle"},
  "09":{label:"Done Rectification – On Review L3",category:"info",icon:"RotateCw"},
  "10":{label:"L3 Approve – On Review L4",category:"info",icon:"ArrowUpCircle"},
  "11":{label:"L4 Rejected – Need Rectification",category:"danger",icon:"XCircle"},
  "12":{label:"Done Rectification – On Review L4",category:"info",icon:"RotateCw"},
  "13":{label:"ATP Done – All Approver Approve",category:"success",icon:"CheckCircle2"},
  "14":{label:"ATP Done with Punchlist – Need Rectification",category:"warning",icon:"ClipboardList"},
  "15":{label:"Punchlist Revised – Waiting Verification",category:"warning",icon:"Clock"},
  "16":{label:"Closed – Punchlist Verified",category:"success",icon:"Lock"},
};

export const CATEGORY_CLASS: Record<StatusCategory,string> = {
  info:    "bg-info-surface text-info",
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  danger:  "bg-danger-surface text-danger",
};
```

---

## 13. Component Library

Konvensi: **anatomy → variants → states → spec → kode** (React + Tailwind gaya shadcn). Semua interaktif wajib `focus-visible` ring & label aksesibel. Gaya solid/flat — tanpa blur.

### 13.1 Button

**Variants:** `primary` (Deep Green solid) · `secondary` (Ming Blue outline) · `ghost` · `danger` · `link`.
**Sizes:** `sm 32px` · `md 36px` (default) · `lg 44px`.
**States:** default · hover (warna lebih gelap) · active · focus (`ring` 3px) · disabled (opacity .5) · loading (spinner + label).

```tsx
const base = "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap " +
  "transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-[3px] " +
  "focus-visible:ring-ring/40 disabled:opacity-50 disabled:pointer-events-none";
const sizes = { sm:"h-8 px-3 text-sm", md:"h-9 px-4 text-sm", lg:"h-11 px-6 text-base" };
const variants = {
  primary:"bg-brand-ink text-white hover:bg-[var(--color-brand-hover)]",
  secondary:"border border-ming/40 text-ming bg-white hover:bg-ming-surface",
  ghost:"text-foreground hover:bg-[var(--color-bg-subtle)]",
  danger:"bg-danger text-white hover:opacity-90",
  link:"text-ming underline-offset-4 hover:underline px-0 h-auto",
};
// <button className={cn(base,sizes[size],variants[variant])}>Approve</button>
```
**Copy:** sebut aksinya — `Approve`, `Approve with Punchlist`, `Reject`, `Submit Document`, `Export to Excel`, `Send Invitation`. Hindari `OK`/`Submit` generik.

### 13.2 Input / Textarea / Select

- Tinggi `36px`, radius `sm`, border `--color-border-strong`, bg putih, teks `14px`.
- Focus: border `--color-brand` + ring. Error: border danger + helper danger + ikon.
- `<label>` 12–13px weight 500 `--color-text-secondary` di atas. Helper/error 12px di bawah.
- Disabled: bg `--color-bg-subtle`, teks tertiary.

```tsx
<label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
  Project Code <span className="text-danger">*</span>
</label>
<input className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3
  text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors
  focus:border-brand focus:ring-[3px] focus:ring-ring/40 focus:outline-none
  aria-[invalid=true]:border-danger" />
```

### 13.3 File Upload — PDF (utama) + Excel (lampiran)

Dua zona terpisah (SRS C-1: 1 PDF wajib + 1 Excel opsional).
- **PDF dropzone:** kotak border **dashed** `--color-border-strong`, ikon `file-text`, ajakan + batasan ("PDF, maks 25 MB"). Drag-over: border brand + bg `--color-brand-surface`.
- **Excel lampiran (opsional):** zona kedua lebih kecil; ikon `file-spreadsheet`, label "Lampiran Excel (opsional, view-only)".
- Setelah upload → **kartu file**: ikon tipe (PDF merah / XLSX hijau), nama, ukuran, tombol hapus.
- Tolak tipe/ukuran tidak sesuai → pesan danger inline.

### 13.4 Checkbox / Radio / Toggle

- Checkbox `16px`, radius `4px`, checked = `--color-brand-ink` + centang putih.
- Radio `16px`, selected titik brand-ink.
- Toggle pill `36×20px`, on = `--color-brand-ink`. (Mis. flag `requires_signature` saat kelola template.)
- Semua: area sentuh ≥ 44px, `focus-visible` ring.

### 13.5 Status Badge

Pill dari §12. Anatomy: `[ikon] [NN mono] [label]`.

```tsx
function StatusBadge({code}:{code:keyof typeof ATP_STATUS}){
  const s = ATP_STATUS[code];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
      CATEGORY_CLASS[s.category])}>
      <span className="font-mono text-[11px] opacity-70">{code}</span>
      {s.label}
    </span>
  );
}
```
Di tabel padat: tampilkan dot warna + `NN` mono, label via tooltip.

### 13.6 Document Card

Kartu solid (tier 1) untuk list/dashboard.

```
┌──────────────────────────────────────────────┐
│ ACC-2026-0093 (mono)             [StatusBadge] │
│ Microwave Link — Bekasi Sektor 4               │
│ [SOW: Install]  Partner: PT Mitra Telco        │
│ ──────────────────────────────────────────────│
│ [avatar stack]      Active: L2 · MS RTS        │
│                     Submitted 12 Jun '26       │
└──────────────────────────────────────────────┘
```
- Header: Unique ID mono kiri, StatusBadge kanan.
- Judul project (Inter 600, 16px); baris chip SOW + Partner.
- Footer: avatar approver + step aktif + tanggal submit.
- Hover: `bg-[var(--color-bg-subtle)]` atau border menguat (bukan translate). Seluruh kartu clickable.

### 13.7 Approval Timeline ⭐ (komponen identitas)

Stepper vertikal L1→L4 — inti Acceptra, dirender minimal & korporat (marker solid, garis penghubung lurus, tanpa glow/pulse).

```
┌─ L1 · Admin Aviat ─────────── approve-only ─┐
│ ✓  Disetujui — Andi (Aviat) · 12 Jun        │ done
├──────────────────────────────────────────────┤
│ ●  L2 · MS RTS              ◀ Giliran aktif  │ active
│    Menunggu approval                          │
├──────────────────────────────────────────────┤
│ ○  L3 · RTH Team                  ✎ TTD       │ pending (requires_signature)
└──────────────────────────────────────────────┘
```
**State node:**

| State | Marker | Warna |
|---|---|---|
| done | `check` solid | fill `--color-brand-ink`, garis bawahnya solid brand |
| active | dot solid + ring tipis | `--color-brand` (border `2px`), badge "Giliran aktif" |
| pending | lingkaran outline | `--color-border-strong`, garis abu |
| rejected | `x` solid | `--color-danger-text`, garis merah + alasan (expand) |

- Tiap node: **Level + role**, nama PIC (bila ada), tanggal aksi. Tampilkan ikon `pen-line` kecil bila `requires_signature=true`; tag "approve-only" untuk L1/MS BO.
- Garis penghubung 2px solid (done = brand-ink, lainnya = border).
- **Partner view:** node di atas L1 di-collapse jadi satu baris "Dalam proses approval customer" tanpa detail.

```tsx
<ol className="relative">
  {steps.map((s,i)=>(
    <li key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
      {i < steps.length-1 && (
        <span aria-hidden className={cn("absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5",
          s.state==="done" ? "bg-brand-ink" : s.state==="rejected" ? "bg-danger" : "bg-[var(--color-border-strong)]")}/>
      )}
      <span className={cn("relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full",
        s.state==="done"    && "bg-brand-ink text-white",
        s.state==="active"  && "border-2 border-brand bg-white text-brand",
        s.state==="pending" && "border border-[var(--color-border-strong)] bg-white text-transparent",
        s.state==="rejected"&& "bg-danger text-white")}>
        <Icon name={s.icon} className="h-3.5 w-3.5"/>
      </span>
      <div className="pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">L{s.level} · {s.role}</span>
          {s.requiresSignature
            ? <Icon name="PenLine" className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]"/>
            : <span className="text-[11px] text-[var(--color-text-tertiary)]">approve-only</span>}
          {s.state==="active" && <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[11px] font-medium text-brand-ink">Giliran aktif</span>}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">{s.pic ?? "—"}{s.date && ` · ${s.date}`}</p>
        {s.state==="rejected" && <p className="mt-1 text-xs text-danger">{s.reason}</p>}
      </div>
    </li>
  ))}
</ol>
```

### 13.8 Signature Pad

Untuk level dengan `requires_signature=true` (SRS FR-SIG). **Tanpa OTP** — setelah TTD langsung submit.
- Canvas putih, border `--color-border-strong`, tinggi `160px`, brush hitam 2.5px.
- Toolbar: `Clear` · toggle **Draw / Upload** · checkbox `Simpan tanda tangan ini`.
- Mode saved signature: tampilkan TTD tersimpan + `Pakai` / `Ganti`.
- Output PNG transparan; tombol konfirmasi disabled sampai ada goresan. Pointer events (mouse/touch/stylus).
- Untuk level approve-only: komponen ini **tidak ditampilkan**.

### 13.9 Notification — Toast & In-App

Approval flow tanpa OTP; notifikasi ke **semua Admin Aviat** (FR-NTF-03).
- **Toast** (tier 2, pojok kanan atas, auto-dismiss 5s): garis aksen kiri 3px + ikon kategori, judul + deskripsi, tombol opsional (`Lihat`).
- **In-app dropdown:** bell + badge unread, panel solid (tier 2), 10 terbaru, `mark all as read`, link "Lihat semua". Item: ikon kategori, teks, waktu relatif (mono), dot unread brand.

### 13.10 Modal / Dialog

- Overlay `rgba(17,24,39,.45)` (tanpa blur), z-400. Panel **solid** putih `--shadow-lg`, radius `xl`, max-width `480/640px`, padding `24px`, z-410.
- Header (judul h4 + close), body, footer (ghost cancel + primary kanan).
- Masuk: fade + scale `.98→1` (`--dur-slow`). Esc & klik overlay menutup (aksi destruktif minta konfirmasi). Focus trap; fokus balik ke trigger.

### 13.11 Table + Export Excel

- Header `--color-bg-subtle`, teks `xs` uppercase tracking, weight 600.
- Row `48px`, divider hairline, hover `--color-bg-subtle`.
- Kolom umum: Unique ID (mono) · Project · SOW · Partner · Status (badge) · Active step · Submitted · aksi.
- Toolbar atas: search + filter (Unique ID, Link ID, Project Code, SOW, Partner, tanggal, status) + **tombol `Export to Excel`** (sekunder, ikon `download`) — FR-ARC-04.
- Sort indikator panah; sticky header; pagination bawah.
- **Mobile:** tabel → list **Document Card**, bukan scroll horizontal.

### 13.12 Tabs & Breadcrumb

- **Tabs:** underline style; aktif = teks primary + garis bawah `--color-brand-ink` 2px; inaktif = secondary. Dipakai di detail dokumen (Overview · Approval Timeline · Attachments · Audit Trail).
- **Breadcrumb:** secondary, pemisah `/` atau chevron, item terakhir primary non-link.

### 13.13 Empty State

Kartu putih tengah: ikon outline netral, judul, satu kalimat arahan, satu tombol primer.
Contoh Partner: **"Belum ada dokumen."** / "Submit ATP pertamamu untuk memulai alur approval." / `[Submit Document]`. Voice mengarahkan, bukan minta maaf.

### 13.14 Navigation (App Shell) — corporate

- **Sidebar** kiri `256px`, bg putih, border kanan hairline: logo Aviat + Acceptra, menu **per role** (ikon + label). Item aktif: bg `--color-secondary-surface` + bar kiri `--color-brand-ink` 3px + teks primary. Collapse `64px` (ikon + tooltip).
- **Topbar** sticky, bg putih `--shadow-sm`: judul halaman/breadcrumb, search, language switcher (ID/EN), bell, avatar + menu (role ditampilkan).
- Mobile: sidebar → drawer (hamburger); topbar tetap.
- Tanpa efek glass — bidang solid, pemisah dengan border & shadow halus.

---

## 14. Layout Patterns

### 14.1 Approval Screen (2 kolom) — pola inti (SRS §5.1)

```
┌──────────────── Topbar (solid, sticky) ─────────────────┐
├──────────────────────────┬──────────────────────────────┤
│  DOCUMENT PREVIEW (≈58%)  │  ACTION PANEL (≈42%, sticky)  │
│  ┌────────────────────┐  │  ┌── card ──────────────────┐ │
│  │ PDF viewer (hal.1) │  │  │ Unique ID + StatusBadge  │ │
│  │  area TTD ditandai │  │  │ Approval Timeline        │ │
│  ├────────────────────┤  │  │ ── Aksi ──               │ │
│  │ Lampiran Excel ▸   │  │  │ [Signature Pad bila TTD] │ │
│  │ (view-only)        │  │  │ [Approve]                │ │
│  └────────────────────┘  │  │ [Approve with Punchlist] │ │
│                          │  │ [Reject]                 │ │
│                          │  └──────────────────────────┘ │
└──────────────────────────┴──────────────────────────────┘
```
- Alur: review → (TTD bila `requires_signature`) → **Approve** (tanpa OTP) → toast → Timeline maju.
- Lampiran Excel tampil view-only (link/preview), tidak bisa di-TTD.
- Mobile: preview di atas, action panel di bawah; tombol aksi utama jadi sticky bottom bar.

### 14.2 Dashboard per role
- **Admin/Super Admin:** kartu metrik (jumlah per status, dokumen aktif, pending lama), aktivitas terbaru, tombol `Export to Excel`. Satu aksen brand: kartu "Perlu perhatian / pending lama".
- **Approver:** list "Need Approval" (giliran aktif) + riwayat.
- **Partner:** dokumen miliknya + status & progres **s/d L1**; tombol `Submit Document`.
- **Viewer:** dashboard read-only.

### 14.3 Document List
Toolbar filter + **Export to Excel** + tabel (desktop) / list card (mobile) + pagination. Filter per Partner & SOW penting (FR-PTR-02).

---

## 15. Accessibility

- **Kontras:** teks normal ≥ 4.5:1, UI/teks besar ≥ 3:1. Aviat Green `#55AA39` **tidak** untuk teks kecil di putih — pakai `--color-brand-ink` `#3B6D11`. Tombol primer = Deep Green + teks putih (lolos AA).
- **Fokus:** semua interaktif punya `focus-visible` ring 3px brand — jangan dihapus.
- **Target sentuh:** ≥ 44×44px (penting untuk approver mobile).
- **Keyboard:** modal focus-trap, dropdown navigable, Esc menutup.
- **Form:** `<label>` selalu terkait; error via teks + ikon (bukan warna saja).
- **Status:** jangan andalkan warna saja — selalu sertakan kode `NN` + label/ikon.
- **Motion:** hormati `prefers-reduced-motion`.
- **PDF/Excel:** sediakan teks alternatif & link unduh; lampiran Excel diberi label view-only.

---

## 16. i18n / Bilingual

- UI **ID/EN** dengan switcher per-user (FR-I18N). Semua label dieksternalisasi (`resources/js/locales/{id,en}.json`) — **jangan hard-code**.
- Sediakan ruang untuk teks ID yang ~30% lebih panjang: hindari lebar tombol/label tetap; pakai `min-width` + wrap.
- **Email selalu Bahasa Inggris**; isi PDF tidak diterjemahkan.
- Format tanggal (WIB) & angka via util terpusat; Unique ID & kode status tidak diterjemahkan.

---

## 17. Struktur File di Repo

```
resources/
├── css/
│   └── app.css                 # CSS vars (§9), .card util, base
├── js/
│   ├── lib/
│   │   ├── utils.ts            # cn() (clsx + tailwind-merge)
│   │   └── status.ts           # ATP_STATUS + CATEGORY_CLASS (§12)
│   ├── components/
│   │   ├── ui/                 # shadcn primitives (button, input, dialog, tabs, ...)
│   │   └── acceptra/           # komponen domain
│   │       ├── StatusBadge.tsx
│   │       ├── DocumentCard.tsx
│   │       ├── ApprovalTimeline.tsx     # ⭐ komponen identitas
│   │       ├── SignaturePad.tsx
│   │       ├── FileUpload.tsx           # PDF + Excel
│   │       ├── ExportExcelButton.tsx
│   │       └── NotificationBell.tsx
│   └── layouts/
│       ├── AppShell.tsx        # sidebar + topbar (§13.14)
│       └── ApprovalLayout.tsx  # 2 kolom (§14.1)
tailwind.config.js              # §10.1
```

**Prinsip implementasi**
1. Token dulu (§9–§10), baru komponen. Jangan hard-code hex di JSX — pakai var/kelas Tailwind.
2. Bangun primitives shadcn → override tema Aviat → susun komponen domain `acceptra/`.
3. `ApprovalTimeline` & `StatusBadge` adalah komponen identitas — review paling ketat (state-driven dari 16 status + `requires_signature`).
4. Sembunyikan Signature Pad pada level approve-only (L1, MS BO). Hormati visibilitas Partner (s/d L1).
5. Setiap komponen lulus checklist §15 sebelum dianggap selesai.

---

*— End of Design System v2.0 (Minimalist · Corporate) —*
