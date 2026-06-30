# FR-HELP — Halaman Bantuan (FAQ + User Guide)

| | |
|---|---|
| **Document Version** | v1.0 |
| **FR Group ID** | FR-HELP |
| **FR Group Name** | In-App Help Center (FAQ & User Guide) |
| **Status** | Draft — Siap implementasi |
| **Last Updated** | 2026-07-01 |
| **Author** | System Analyst AI |
| **Depends On** | FR-I18N (i18next id/en), AppShell navigation, role model |

---

## 1. Pendahuluan

### 1.1 Tujuan
Menyediakan pusat bantuan di dalam aplikasi (in-app help center) berisi **FAQ** dan **User Guide**
yang **berbeda isinya per grup role**, agar setiap pengguna (Admin, Partner, Approver) dapat
memahami alur kerjanya masing-masing tanpa pelatihan eksternal atau dokumen terpisah.

### 1.2 Ruang Lingkup
- Satu menu navbar **"Bantuan"** yang muncul di posisi **paling bawah daftar menu** untuk semua
  pengguna terautentikasi.
- Satu halaman `/help` dengan dua bagian: **FAQ** (accordion) dan **Panduan / User Guide**
  (langkah bernomor + screenshot).
- Konten **statis**, ditulis dwibahasa (Indonesia & Inggris) melalui i18next; **tidak ada** CRUD
  atau penyimpanan database.

### 1.3 Di Luar Ruang Lingkup
- Editor konten (CMS) untuk admin — perubahan konten dilakukan via i18n + deploy.
- Pencarian full-text, rating "apakah ini membantu", chatbot, atau tiket support.
- Konten berbeda per sub-role approver (keempat approver disamakan).

### 1.4 Definisi
| Istilah | Arti |
|---|---|
| **FAQ** | Daftar tanya-jawab singkat, ditampilkan sebagai accordion. |
| **User Guide / Panduan** | Petunjuk langkah demi langkah disertai screenshot UI. |
| **Grup role** | Pengelompokan role menjadi 3 kategori konten: `aviat`, `partner`, `approver`. |

---

## 2. Deskripsi Umum

- Fitur diakses lewat item navbar **"Bantuan"** (ikon `HelpCircle`) di [AppShell.tsx](../resources/js/layouts/AppShell.tsx),
  ditempatkan sebagai **item terakhir** pada ketiga nav builder (`aviatNav`, `partnerNav`, `approverNav`).
- Halaman `/help` dibangun dengan pola yang sama seperti halaman lain: `AppShell` + `PageHeader`,
  React + Inertia, teks via `useTranslation()`.
- Konten ditentukan oleh **grup role** pengguna yang dihitung server-side di controller dan
  dikirim sebagai prop `roleGroup`.
- Bahasa konten mengikuti `preferred_language` pengguna (lihat FR-I18N), default `id`.

---

## 3. Pemetaan Role → Grup Konten

Konsisten dengan helper `workspace(role)` yang sudah ada di
[AppShell.tsx](../resources/js/layouts/AppShell.tsx#L26-L30).

| Grup konten | Role | Catatan |
|---|---|---|
| `aviat` (Admin) | `super_admin`, `admin`, `viewer` | `viewer` read-only; FAQ menyebut keterbatasannya. |
| `partner` | `partner` | Submitter dokumen / subkontraktor. |
| `approver` | `approver_ms_bo`, `approver_ms_rts`, `approver_xls_rth_team`, `approver_xls_rth` | Keempatnya melihat konten identik. |

---

## 4. Functional Requirements

| ID | Requirement | Prioritas |
|---|---|---|
| **FR-HELP-01** | Menu **"Bantuan"** tampil sebagai item **paling bawah** daftar navbar untuk **semua** pengguna terautentikasi (admin, partner, approver). | Must |
| **FR-HELP-02** | Halaman `/help` menyajikan dua bagian: **FAQ** dan **Panduan**, dipisah melalui tab/section di satu halaman. | Must |
| **FR-HELP-03** | Konten FAQ & Panduan yang ditampilkan **ditentukan oleh grup role** pengguna (`aviat` / `partner` / `approver`). Pengguna hanya melihat konten grupnya. | Must |
| **FR-HELP-04** | Keempat sub-role approver melihat **konten approver yang sama**. | Must |
| **FR-HELP-05** | FAQ ditampilkan sebagai **accordion** (klik pertanyaan → buka/tutup jawaban); minimal 5 pertanyaan per grup. | Must |
| **FR-HELP-06** | User Guide berupa **section dengan langkah bernomor** disertai **screenshot** per langkah/section; minimal 3 section per grup. | Must |
| **FR-HELP-07** | Seluruh teks FAQ & Panduan tersedia dalam **Bahasa Indonesia & Inggris**, mengikuti preferensi bahasa pengguna (FR-I18N). | Must |
| **FR-HELP-08** | Konten bersifat **statis** (di i18n); tidak ada CRUD. Perubahan konten dilakukan via update i18n + deploy. | Must |
| **FR-HELP-09** | Otorisasi: halaman hanya untuk pengguna **login**; guest diarahkan ke halaman login. Tidak ada data sensitif lintas role yang terekspos. | Must |
| **FR-HELP-10** | Bila grup role tidak dikenali, sistem menampilkan konten default `partner` (fallback aman, tanpa error). | Should |
| **FR-HELP-11** | Tata letak responsif (desktop & mobile) mengikuti AppShell; screenshot dapat di-scroll/zoom pada layar kecil. | Should |

---

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| **NFR-HELP-01** | **Performa**: konten statis tanpa query DB; halaman render cepat (tidak ada round-trip data tambahan selain prop `roleGroup`). |
| **NFR-HELP-02** | **Aksesibilitas**: accordion FAQ dapat dioperasikan via keyboard; setiap `<img>` screenshot memiliki `alt` deskriptif. |
| **NFR-HELP-03** | **Konsistensi UI**: gaya mengikuti komponen AppShell/PageHeader & Tailwind yang ada. |
| **NFR-HELP-04** | **Maintainability**: struktur konten (urutan, key i18n, path gambar) terpisah dari teks (i18n) — memudahkan penambahan FAQ/section baru. |

---

## 6. Draft Konten Awal

> Daftar di bawah adalah **draft** yang akan dipindahkan ke i18n (`help.*`) saat implementasi.
> Teks final boleh disempurnakan oleh tim produk.

### 6.1 Grup `aviat` (Admin / Super Admin / Viewer)

**FAQ (draft):**
1. Apa perbedaan peran Super Admin, Admin, dan Viewer?
2. Bagaimana cara mengundang & mengelola Partner?
3. Bagaimana cara membuat dan meng-clone Template SOW beserta level approval-nya?
4. Bagaimana cara menambah pengguna baru dan mengirim ulang undangan?
5. Bagaimana cara memantau dokumen yang sedang berjalan dan meng-export laporannya?
6. Mengapa beberapa menu tidak muncul untuk Viewer? (keterbatasan read-only)

**User Guide (draft section):**
1. Mengundang & Mengelola Partner — `/images/help/aviat/partners.png`
2. Membuat Template SOW & Level Approval — `/images/help/aviat/template.png`
3. Mengelola Pengguna (Users) — `/images/help/aviat/users.png`
4. Memantau & Meng-export Dokumen — `/images/help/aviat/documents-export.png`

### 6.2 Grup `partner`

**FAQ (draft):**
1. Bagaimana cara mengajukan (submit) dokumen baru?
2. Format & lampiran apa saja yang dibutuhkan saat submit?
3. Bagaimana cara mengetahui status dokumen saya?
4. Apa yang harus dilakukan jika dokumen ditolak / diminta revisi (punchlist)?
5. Bagaimana cara mengunggah revisi dokumen?

**User Guide (draft section):**
1. Submit Dokumen Baru — `/images/help/partner/submit.png`
2. Melacak Status di "My Documents" — `/images/help/partner/my-documents.png`
3. Menangani Revisi / Punchlist — `/images/help/partner/revision.png`

### 6.3 Grup `approver`

**FAQ (draft):**
1. Bagaimana cara melihat dokumen yang menunggu persetujuan saya?
2. Bagaimana cara approve atau reject sebuah dokumen?
3. Bagaimana cara membubuhkan tanda tangan digital?
4. Apa itu approval berjenjang (multi-level) dan bagaimana urutannya?
5. Di mana saya bisa melihat riwayat (history) approval saya?

**User Guide (draft section):**
1. Meninjau Antrian "Need Approval" — `/images/help/approver/need-approval.png`
2. Approve / Reject dengan Tanda Tangan — `/images/help/approver/approve.png`
3. Melihat Riwayat Approval — `/images/help/approver/history.png`

---

## 7. Rancangan Implementasi

### 7.1 Route — [routes/web.php](../routes/web.php) (grup `auth`)
```php
Route::get('/help', [HelpController::class, 'index'])->name('help.index');
```

### 7.2 Controller — `app/Http/Controllers/HelpController.php`
```php
public function index(Request $request): Response
{
    $role = $request->user()->role;
    $group = match (true) {
        in_array($role, ['super_admin', 'admin', 'viewer']) => 'aviat',
        str_starts_with($role, 'approver_')                 => 'approver',
        default                                             => 'partner',
    };

    return Inertia::render('Help/Index', ['roleGroup' => $group]);
}
```

### 7.3 Halaman — `resources/js/Pages/Help/Index.tsx`
- `AppShell` + `PageHeader`, prop `roleGroup`.
- Tab **FAQ** (accordion) & **Panduan** (`useState` lokal).
- Konten diambil dari `helpContent.ts`, teks via `useTranslation()`.

### 7.4 Modul struktur konten — `resources/js/data/helpContent.ts`
Memisahkan struktur (urutan, key i18n, path gambar) dari teks (i18n):
```ts
type RoleGroup = 'aviat' | 'partner' | 'approver';
interface FaqItem { q: string; a: string; }            // key i18n
interface GuideSection { title: string; steps: string[]; image: string; }

export const FAQ: Record<RoleGroup, FaqItem[]> = { aviat: [...], partner: [...], approver: [...] };
export const GUIDE: Record<RoleGroup, GuideSection[]> = { aviat: [...], partner: [...], approver: [...] };
```

### 7.5 i18n — namespace `help`
Tambah blok `help` (FAQ + guide per grup) dan key `nav.help` di
[en.json](../resources/js/i18n/locales/en.json) **dan** [id.json](../resources/js/i18n/locales/id.json).

### 7.6 Navbar — [AppShell.tsx](../resources/js/layouts/AppShell.tsx)
Tambah item terakhir di `aviatNav`, `partnerNav`, `approverNav`:
```tsx
{ label: t('nav.help'), icon: <HelpCircle className="h-4.5 w-4.5" />, href: '/help' },
```
Import `HelpCircle` dari `lucide-react`.

### 7.7 Aset Screenshot
Simpan di `public/images/help/{aviat,partner,approver}/...`; placeholder dulu, gambar final menyusul.

---

## 8. File yang Dibuat / Diubah

| File | Jenis | Perubahan |
|---|---|---|
| `app/Http/Controllers/HelpController.php` | Baru | Hitung grup role, render `Help/Index`. |
| `resources/js/Pages/Help/Index.tsx` | Baru | Halaman FAQ + Panduan dengan tab. |
| `resources/js/data/helpContent.ts` | Baru | Struktur konten per grup. |
| `public/images/help/**` | Baru | Screenshot/placeholder guide. |
| `routes/web.php` | Ubah | Route `/help` di grup `auth`. |
| `resources/js/layouts/AppShell.tsx` | Ubah | Item navbar "Bantuan" di 3 builder + import ikon. |
| `resources/js/i18n/locales/{en,id}.json` | Ubah | Namespace `help` + `nav.help`. |

---

## 9. Acceptance Criteria & Verifikasi

1. `npm run build` sukses tanpa error TypeScript.
2. Login per role (seeder `database/seeders/UserSeeder.php`):
   - Item **Bantuan** muncul **paling bawah** navbar untuk admin, partner, approver. *(FR-HELP-01)*
   - `/help` menampilkan FAQ & Panduan **sesuai grup** — admin ≠ partner ≠ approver. *(FR-HELP-02, 03)*
   - Keempat sub-role approver melihat konten **identik**. *(FR-HELP-04)*
3. Accordion FAQ bisa buka/tutup; screenshot Panduan ter-render. *(FR-HELP-05, 06)*
4. Toggle bahasa (`POST /profile/language`) → teks FAQ/Panduan berganti id ↔ en. *(FR-HELP-07)*
5. Akses `/help` sebagai guest → redirect ke login. *(FR-HELP-09)*

---

## 10. Catatan

- Konten draft di Bagian 6 wajib ditinjau tim produk sebelum dianggap final.
- Penambahan FAQ/section baru cukup menambah entri di `helpContent.ts` + key i18n, tanpa ubah komponen.
- Jika ke depan dibutuhkan konten editable oleh admin, fitur ini dapat di-upgrade ke model
  database-driven (di luar scope FR-HELP v1.0).
