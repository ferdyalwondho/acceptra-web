# Software Requirements Specification (SRS)
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
| **Dokumen Terkait** | PRD Acceptra v2.0; SRS Functional Detail (menyusul) |

---

## Revision History

| Versi | Tanggal | Perubahan | Author |
|---|---|---|---|
| 1.0 | Jun 2026 | Initial SRS dari PRD v1.0 | AMN |
| 2.0 | Jun 2026 | Penyesuaian hasil meeting prototype: Partner sebagai originator; L1 Aviat approver (approve-only); struktur level per-SOW + flag requires_signature; role MS BO & Partner; lampiran Excel; OTP dihapus; notifikasi ke semua admin; reminder weekday; export Excel; Unique ID & PT Index; 16-status lifecycle | AMN |

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Deskripsi Umum](#2-deskripsi-umum)
3. [Kebutuhan Fungsional](#3-kebutuhan-fungsional)
4. [Kebutuhan Non-Fungsional](#4-kebutuhan-non-fungsional)
5. [Antarmuka Eksternal](#5-antarmuka-eksternal)
6. [Model Data Konseptual](#6-model-data-konseptual)
7. [Document Status Lifecycle](#7-document-status-lifecycle)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [Batasan, Asumsi & Risiko](#9-batasan-asumsi--risiko)
10. [Lampiran](#10-lampiran)

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen

Dokumen ini mendefinisikan kebutuhan perangkat lunak (functional & non-functional) untuk **Acceptra**, web application untuk pengesahan dokumen ATP/BAST secara digital. Ditujukan untuk tim pengembang, QA, dan stakeholder teknis. Detail implementasi per-fitur (skema tabel, field & validasi, state machine, edge case) diuraikan pada **SRS Functional Detail**.

### 1.2 Lingkup Produk

Acceptra menggantikan pengesahan ATP manual dengan alur digital: **Partner submit PDF (+ lampiran Excel)** → approval berjenjang (L1 Aviat approve-only, dilanjutkan approver customer sesuai SOW) → tanda tangan digital pada level yang memerlukan → PDF final ter-stamp → arsip + audit trail transparan + export Excel.

**In scope (v1):** manajemen user/role/partner/template, submission (partner & admin direct), import dokumen berjalan, approval flow per SOW, tanda tangan + saved signature, stamping PDF, punchlist, reassign, notifikasi email+in-app ke semua admin, reminder weekday, dashboard, arsip & pencarian, export Excel, audit trail, UI bilingual, branding Aviat.

**Out of scope (v1):** pembuatan dokumen di aplikasi, upload master via Excel (ditunda), OTP (dihapus), field document_type HW/SW, WhatsApp otomatis, mobile native, integrasi PMIS/ERP, PKI/PSrE, multi-tenant, modul project/task/BOQ.

### 1.3 Definisi, Akronim, Singkatan

| Istilah | Penjelasan |
|---|---|
| ATP / BAST | Dokumen pengesahan hasil pekerjaan. |
| SOW | Scope of Work (mis. Install, Upgrade, Reroute); menentukan struktur approval. |
| Partner/Subcon | Vendor pelaksana; pihak yang submit. |
| Template | Struktur alur approval per SOW (level + role + flag tanda tangan). |
| requires_signature | Flag per level: membubuhkan TTD di PDF (true) atau approve-only (false). |
| Punchlist | Catatan approver; approve bersyarat. |
| Reassign | Penggantian approver di tengah alur. |
| Saved Signature | Tanda tangan tersimpan untuk dipakai ulang. |
| Stamping / Anchor | Penempelan TTD+data ke PDF; penanda teks acuan posisi. |
| Unique ID | Kode bisnis `ACC-{tahun}-{urut}`, app-only. |
| RBAC | Role-Based Access Control. |
| L1–L4 | Level approval; L1 = Admin Aviat (approve-only). |
| FR / NFR | Functional / Non-Functional Requirement. |

### 1.4 Referensi

- PRD Acceptra v2.0
- Contoh dokumen ATP PT XLSmart (Acceptance Test Document — Microwave System)
- IEEE Std 830-1998 (acuan struktur SRS)

---

## 2. Deskripsi Umum

### 2.1 Perspektif Produk

Aplikasi web **single-tenant** (untuk Aviat) yang berdiri sendiri. Pengguna internal (Aviat), partner (eksternal), dan approver (customer) mengakses **satu aplikasi yang sama** via browser, dengan tampilan/menu berbeda sesuai role. Berkomunikasi dengan layanan eksternal: email transaksional & object storage.

### 2.2 Fungsi Produk (Ringkas)

1. Mengelola user, role, partner, dan template SOW.
2. Submission dokumen oleh Partner (atau Admin direct dengan auto-approve L1).
3. Mengimpor dokumen yang sudah ditandatangani sebagian (offline).
4. Menjalankan approval berjenjang per SOW; L1 approve-only; level lain sesuai requires_signature.
5. Menghasilkan PDF final ter-stamp; menyertakan lampiran Excel view-only.
6. Melacak punchlist sampai closed.
7. Reassign approver.
8. Notifikasi email + in-app ke semua admin; reminder weekday.
9. Dashboard, arsip, pencarian, export Excel, dan audit trail transparan.

### 2.3 Karakteristik Pengguna

| Pengguna | Tipe | Karakteristik | Frekuensi |
|---|---|---|---|
| Super Admin | Aviat | Mengelola sistem, user, template, partner. | Rendah |
| Admin | Aviat | Approver L1 (approve-only), kelola dokumen, submit direct, reassign. | Tinggi |
| Viewer | Aviat | Memantau read-only. | Sedang |
| Partner | Eksternal | Originator; submit & revisi; visibilitas s/d L1. | Sedang-Tinggi |
| Approver (MS BO / MS RTS / RTH Team / RTH) | Customer | Menyetujui; sebagian dengan TTD, sebagian approve-only; tersebar se-Indonesia. | Sedang |

### 2.4 Batasan Umum (Constraints)

- **C-1** Dokumen utama **satu PDF** hasil export digital (bukan dibuat di aplikasi); dapat disertai **satu lampiran Excel** (view-only, tanpa TTD).
- **C-2** Tabel & area tanda tangan **selalu di halaman 1** PDF.
- **C-3** Seluruh pengguna **wajib login**; tidak ada approval anonim.
- **C-4** Tech stack: **Laravel 11 + Inertia + React + shadcn/ui + Tailwind + PostgreSQL**; akses data via **Eloquent ORM** (Query Builder/raw hanya untuk query berat).
- **C-5** Email aplikasi **selalu Bahasa Inggris**; UI bilingual ID/EN.
- **C-6** Tanda tangan v1 berupa **signature image** + audit trail (bukan PKI/PSrE).
- **C-7** Seluruh PK/FK menggunakan **UUID v7**.
- **C-8** **Struktur approval ditentukan per SOW** (level + role + requires_signature). Tidak ada field document_type (HW/SW). L1 (Admin Aviat) selalu approve-only.
- **C-9** **Tidak ada OTP** pada proses approval.

### 2.5 Asumsi & Ketergantungan

- **A-1** Mayoritas PDF anchor-able; PDF scan ditangani via manual placement.
- **A-2** Setiap user (admin, partner, approver) punya email valid.
- **A-3** Tersedia layanan email transaksional & object storage (S3-compatible).
- **A-4** Akun Partner & Approver dibuat oleh Admin Aviat; set password via undangan.
- **A-5** Keputusan data residency ditetapkan sebelum produksi (§8).
- **A-6** Master data (SOW + struktur level, daftar approver, partner) disediakan Aviat sebelum go-live.
- **A-7** Notifikasi ke Partner saat reject dilakukan **manual** oleh Admin via WA (di luar sistem); sistem hanya menampilkan status & tombol revisi ke Partner.

---

## 3. Kebutuhan Fungsional

> Setiap FR **MUST** kecuali ditandai (SHOULD)/(NICE). Detail di SRS Functional Detail.

### 3.1 Authentication & Account (FR-AUTH)

- **FR-AUTH-01** Login email + password (tanpa OTP).
- **FR-AUTH-02** Pengarahan pasca-login sesuai role.
- **FR-AUTH-03** Deep link: link approval/notifikasi → dokumen tujuan setelah login.
- **FR-AUTH-04** Logout & reset password via email.
- **FR-AUTH-05** Akun Partner & Approver dibuat Admin → email undangan set password.
- **FR-AUTH-06** Link undangan/reset kedaluwarsa & dapat dikirim ulang.
- **FR-AUTH-07** (SHOULD) Rate limiting/lockout login.

### 3.2 User Management (FR-USR)

- **FR-USR-01** Super Admin CRUD user (soft delete).
- **FR-USR-02** Role didukung: Super Admin, Admin, Viewer, Partner, Approver-MS BO, Approver-MS RTS, Approver-XLS RTH Team, Approver-XLS RTH. **Satu user = satu role.**
- **FR-USR-03** Atribut user: nama, email, role, status, region (opsional).
- **FR-USR-04** Pada pemilihan PIC approver, daftar user ter-filter sesuai role level.
- **FR-USR-05** User yang menjadi approver aktif tidak dapat dihapus permanen (arahkan reassign).
- **FR-USR-06** Hak akses ditegakkan via RBAC (Lampiran 10.1).

### 3.3 Partner / Subcon Management (FR-PTR)

- **FR-PTR-01** Admin dapat CRUD data partner (nama + email) beserta akun login partner.
- **FR-PTR-02** Setiap dokumen terhubung ke satu partner; daftar dokumen dapat difilter per partner.
- **FR-PTR-03** (SHOULD) Satu partner dapat memiliki lebih dari satu user PIC.

### 3.4 Template / SOW Management (FR-TPL)

- **FR-TPL-01** Admin CRUD template SOW (soft delete).
- **FR-TPL-02** Template menyimpan struktur level berurutan; tiap level `{role, requires_signature}`, tanpa PIC.
- **FR-TPL-03** Mendukung jumlah level bervariasi (mis. 3 atau 4) sesuai SOW.
- **FR-TPL-04** L1 (Admin Aviat) selalu requires_signature=false; level approve-only lain (mis. MS BO) juga false.
- **FR-TPL-05** Template yang dipakai dokumen tidak dapat dihapus permanen.
- **FR-TPL-06** Dokumen menyimpan **snapshot** struktur template saat dibuat.
- **FR-TPL-07** (SHOULD) Clone template.

### 3.5 Document Submission (FR-SUB)

- **FR-SUB-01** Partner dapat submit: metadata + 1 PDF + lampiran Excel opsional + pilih Template/SOW + pilih PIC approver L2..Ln (ter-filter role).
- **FR-SUB-02** L1 tidak dipilih; Admin Aviat mana pun dapat meng-approve L1.
- **FR-SUB-03** Admin Aviat dapat submit langsung dengan **auto-approve L1** (status awal "L1 Approve - On Review L2").
- **FR-SUB-04** Sistem meng-generate **Unique ID** `ACC-{tahun}-{urut}` (reset tahunan) dan mengisi field otomatis (Date of ATP Submission, Date of ATP Approved, ATP Punchlist, Acceptance Status).
- **FR-SUB-05** Validasi kelengkapan field, PIC, dan file; tolak file non-sesuai atau melebihi batas ukuran.
- **FR-SUB-06** Submit oleh Partner → status **01. Submit & On Review L1** → notifikasi ke **semua Admin Aviat**.
- **FR-SUB-07** Simpan draft sebelum submit.
- **FR-SUB-08** Field Vendor/Contractor default "PT Aviat Solusi Komunikasi Indonesia".
- **FR-SUB-09** Field **PT Index** wajib (tampil di form & di PDF); **Unique ID** tampil di aplikasi (tidak di PDF); site info NE/FE (Tower ID & Site Name) tersedia lengkap.

### 3.6 Import Dokumen Berjalan (FR-IMP)

- **FR-IMP-01** Opsi menandai dokumen sudah punya approval offline.
- **FR-IMP-02** Tiap level dapat ditandai **Approved (offline)** atau **Pending**.
- **FR-IMP-03** Level offline: isi PIC, tanggal, attachment bukti.
- **FR-IMP-04** Level offline berurutan dari awal; sistem set status sesuai & notifikasi hanya approver pending berikutnya.
- **FR-IMP-05** Audit trail mencatat step offline sebagai pre-existing.
- **FR-IMP-06** Stamping approver pending hanya mengisi kotak kosong.

### 3.7 Lampiran Excel (FR-ATT)

- **FR-ATT-01** Satu dokumen dapat memiliki satu lampiran Excel (opsional), tersedia untuk semua SOW.
- **FR-ATT-02** Lampiran view-only: dapat dilihat/diunduh approver, tanpa TTD/stamping.
- **FR-ATT-03** Halaman approval menampilkan PDF dan akses ke lampiran Excel.

### 3.8 Approval Flow (FR-APR)

- **FR-APR-01** Hanya approver giliran aktif yang dapat mengambil aksi.
- **FR-APR-02** Aksi: Approve, Approve with Punchlist, Reject.
- **FR-APR-03** Level approve-only (L1 Admin Aviat, MS BO): Approve/Reject **tanpa** tanda tangan.
- **FR-APR-04** Level requires_signature=true: wajib tanda tangan sebelum Approve / Approve with Punchlist.
- **FR-APR-05** **Tidak ada konfirmasi OTP.**
- **FR-APR-06** Approve with Punchlist: wajib catatan; dokumen tetap lanjut.
- **FR-APR-07** Reject: wajib alasan; status → "Need Rectification"; notifikasi reject ke **semua Admin Aviat**.
- **FR-APR-08** **Partner** yang merevisi dokumen reject (dari level mana pun) & resubmit ke level yang reject; sequence tidak reset.
- **FR-APR-09** Approver terakhir (sesuai SOW) menyetujui → set Date of ATP Approved; tanpa punchlist → status **13**, dengan punchlist → status **14**; generate PDF final.
- **FR-APR-10** Timeline approval (PIC, role, status, tanggal, giliran aktif) dapat dilihat Aviat & customer.
- **FR-APR-11** Alur strictly sequential.

### 3.9 Digital Signature & Saved Signature (FR-SIG)

- **FR-SIG-01** Tanda tangan via draw (canvas) atau upload gambar (level requires_signature).
- **FR-SIG-02** Opsi simpan tanda tangan saat pertama kali.
- **FR-SIG-03** Pakai tanda tangan tersimpan tanpa menggambar ulang.
- **FR-SIG-04** Ganti tanda tangan tersimpan (yang lama non-aktif demi audit).
- **FR-SIG-05** PIC Name di PDF diambil otomatis dari nama profil.
- **FR-SIG-06** Tanda tangan disimpan sebagai image.

### 3.10 PDF Stamping (FR-PDF)

- **FR-PDF-01** Generate PDF final baru; pertahankan PDF asli.
- **FR-PDF-02** Stamp halaman 1: gambar TTD + PIC Name **hanya untuk level requires_signature**, dipetakan ke kolom sesuai via anchor header per role; plus Date of ATP Submission, Date of ATP Approved, PT Index, ATP Punchlist, Acceptance Status. (Unique ID tidak di-stamp.)
- **FR-PDF-03** Auto text-anchor; bila tidak terdeteksi → preview halaman 1 + manual placement.
- **FR-PDF-04** Manual placement = jalur universal semua kasus PDF.
- **FR-PDF-05** Level approve-only tidak menempel TTD namun tercatat di audit trail.
- **FR-PDF-06** PDF final dapat di-download Admin, Viewer, Partner (miliknya), dan approver terkait.

### 3.11 Punchlist Management (FR-PCL)

- **FR-PCL-01** Approver terakhir approve dengan punchlist → status **14**.
- **FR-PCL-02** Admin upload PDF revisi → status **15** → notifikasi semua approver pembuat punchlist.
- **FR-PCL-03** Tiap pembuat punchlist Verify/Accept Revision.
- **FR-PCL-04** Penutupan per-approver; status **16. Closed** saat semua pembuat punchlist verify.
- **FR-PCL-05** Isi punchlist = satu kolom catatan bebas.
- **FR-PCL-06** (SHOULD) Approver dapat menolak revisi (kembali ke status 14).

### 3.12 Reassign Approver (FR-RSG)

- **FR-RSG-01** Hanya Admin/Super Admin.
- **FR-RSG-02** Berlaku untuk step aktif & step yang belum tiba gilirannya.
- **FR-RSG-03** Approver yang sudah menyetujui (final) tidak dapat di-reassign.
- **FR-RSG-04** Form: approver baru (ter-filter role), notes/alasan, attachment.
- **FR-RSG-05** Approver lama kehilangan akses.
- **FR-RSG-06** Bila step aktif, approver baru menerima notifikasi (tanpa OTP); sequence tidak mundur.
- **FR-RSG-07** Tercatat di audit trail (dari, ke, oleh, waktu, alasan, attachment).

### 3.13 Notifications (FR-NTF)

- **FR-NTF-01** In-app: badge unread, dropdown 10 terbaru, mark-as-read, halaman penuh.
- **FR-NTF-02** Email (Bahasa Inggris) memuat ringkasan + deep link (tanpa OTP).
- **FR-NTF-03** Event **sent receipt, reminder, approval, rejected** dikirim ke **semua Admin Aviat**.
- **FR-NTF-04** Approver giliran aktif menerima notifikasi saat dokumen tiba di levelnya.
- **FR-NTF-05** Partner menerima notifikasi hasil sampai L1 dan saat dokumennya reject (untuk revisi).
- **FR-NTF-06** Notifikasi sesuai matriks trigger (Lampiran 10.2).
- **FR-NTF-07** (NICE) WhatsApp otomatis — pengembangan berikutnya.

### 3.14 Email Reminder (FR-RMD)

- **FR-RMD-01** Reminder default dikirim **setiap hari kerja (Senin–Jumat)** untuk approval pending sampai aksi dilakukan.
- **FR-RMD-02** Interval dapat dikonfigurasi per tingkat approval (default weekday harian).
- **FR-RMD-03** Scheduled job memeriksa step pending pada hari kerja.

### 3.15 Dashboard (FR-DSB)

- **FR-DSB-01** Dashboard Admin: jumlah per status, dokumen aktif, aktivitas terbaru, pending lama.
- **FR-DSB-02** Dashboard Approver: list "Need Approval" + riwayat.
- **FR-DSB-03** Dashboard Partner: dokumen miliknya + status s/d L1.
- **FR-DSB-04** Viewer: read-only.

### 3.16 Archive, Search & Export (FR-ARC)

- **FR-ARC-01** Dokumen final disimpan permanen.
- **FR-ARC-02** Pencarian/filter: Unique ID, Link ID, Project Code, SOW, Partner, tanggal, status.
- **FR-ARC-03** Pagination & sorting; download PDF final & lampiran sesuai hak akses.
- **FR-ARC-04** **Export Excel** daftar dokumen semua status dengan kolom: Unique ID, metadata, Partner, tanggal submit, status keseluruhan, dan per level L1–L4 (tanggal approve/reject, status, notes).

### 3.17 Audit Trail (FR-AUD)

- **FR-AUD-01** Mencatat seluruh kejadian per dokumen + aktor, timestamp, catatan.
- **FR-AUD-02** Dapat dilihat di aplikasi oleh Aviat & customer (dokumen relevan); Partner terbatas s/d L1.
- **FR-AUD-03** Append-only.

### 3.18 Internationalization (FR-I18N)

- **FR-I18N-01** UI ID + EN, switcher per user.
- **FR-I18N-02** Teks UI dieksternalisasi.
- **FR-I18N-03** Email selalu Bahasa Inggris.
- **FR-I18N-04** Isi PDF tidak diterjemahkan.

### 3.19 Branding (FR-BRD)

- **FR-BRD-01** Logo & identitas Aviat tampil di UI (header, login, email).
- **FR-BRD-02** Isi PDF ATP tetap memakai format baku XLSmart.

---

## 4. Kebutuhan Non-Fungsional

### 4.1 Performa (NFR-PERF)

- **NFR-PERF-01** Halaman utama ter-render < 2 detik (kondisi normal).
- **NFR-PERF-02** Generate PDF final < 10 detik; via queue (asinkron).
- **NFR-PERF-03** Pengiriman email via queue (non-blocking).
- **NFR-PERF-04** Nyaman menangani ~200 dokumen/bulan, ~10 admin, ~100 approver, konkurensi rendah-menengah.

### 4.2 Skalabilitas (NFR-SCALE)

- **NFR-SCALE-01** Peningkatan kapasitas via vertical scaling tanpa perubahan kode.
- **NFR-SCALE-02** File di object storage terpisah agar tidak membebani disk aplikasi.

### 4.3 Keamanan (NFR-SEC)

- **NFR-SEC-01** Seluruh komunikasi via HTTPS/TLS.
- **NFR-SEC-02** Password ter-hash (bcrypt/argon2).
- **NFR-SEC-03** RBAC ditegakkan di server pada setiap endpoint.
- **NFR-SEC-04** Proteksi CSRF, validasi input, pencegahan SQL injection (via ORM).
- **NFR-SEC-05** Rate limiting login & endpoint sensitif.
- **NFR-SEC-06** File (PDF, lampiran, signature) hanya dapat diakses pihak berwenang (signed/temporary URL atau proxy ber-otorisasi), tidak publik.
- **NFR-SEC-07** Kredensial layanan & kunci storage disimpan sebagai env var.
- **NFR-SEC-08** UUID v7 sebagai ID non-enumerable pada URL/link.
> Catatan: OTP tidak dipakai pada approval (keputusan bisnis untuk kenyamanan approver).

### 4.4 Keandalan & Ketersediaan (NFR-REL)

- **NFR-REL-01** Backup database harian.
- **NFR-REL-02** File di object storage durable & termasuk strategi backup.
- **NFR-REL-03** Target ketersediaan ≥ 99% (best-effort single VPS).
- **NFR-REL-04** Proses asinkron (PDF/email) dapat di-retry.

### 4.5 Storage (NFR-STOR)

- **NFR-STOR-01** Menyimpan PDF asli, PDF final, lampiran Excel, signature image.
- **NFR-STOR-02** Pertumbuhan ~2–3 GB/bulan; dapat berkembang tanpa downtime signifikan.
- **NFR-STOR-03** Storage S3-compatible (netral provider).

### 4.6 Usability (NFR-USE)

- **NFR-USE-01** Antarmuka approver sederhana (review → [tanda tangan] → submit), tanpa OTP.
- **NFR-USE-02** Responsive desktop & mobile; approver dapat menyetujui dari HP.
- **NFR-USE-03** Pesan error informatif & actionable.

### 4.7 Kompatibilitas (NFR-COMP)

- **NFR-COMP-01** Browser modern (Chrome, Edge, Safari, Firefox) versi terbaru & satu sebelumnya.

### 4.8 Maintainability (NFR-MAINT)

- **NFR-MAINT-01** Konvensi Laravel + struktur modular per domain.
- **NFR-MAINT-02** Konfigurasi terpisah dari kode (12-factor).
- **NFR-MAINT-03** Teks UI dieksternalisasi.
- **NFR-MAINT-04** Struktur approval berbasis data (template + flag), bukan hardcode, sehingga perubahan SOW tidak memerlukan perubahan kode.

### 4.9 Auditability (NFR-AUDIT)

- **NFR-AUDIT-01** 100% aksi pengubah state tercatat & transparan.
- **NFR-AUDIT-02** Timestamp akurat (timezone konsisten).

---

## 5. Antarmuka Eksternal

### 5.1 Antarmuka Pengguna (UI)

- Web responsive (Inertia + React + shadcn/ui + Tailwind), adaptif per role.
- Branding Aviat. Halaman approval pola 2-kolom (Document Preview + Action Panel), termasuk akses lampiran Excel.

### 5.2 Antarmuka Perangkat Keras

- Tanpa perangkat keras khusus; tanda tangan via mouse/touch/stylus; kamera/file untuk upload gambar.

### 5.3 Antarmuka Perangkat Lunak (Software Interfaces)

- **SI-1 Email Transaksional** (mis. Resend) — REST API (undangan, notifikasi, reminder). SPF/DKIM/DMARC.
- **SI-2 Object Storage S3-Compatible** (mis. Cloudflare R2 / lokal) — PDF, lampiran Excel, signature image.
- **SI-3 PostgreSQL** — data relasional & JSONB.
- **SI-4 Redis** — cache, session, queue.

### 5.4 Antarmuka Komunikasi

- HTTPS untuk seluruh trafik aplikasi & akses storage (S3 API); SMTP/HTTPS API untuk email keluar.

---

## 6. Model Data Konseptual

> Tingkat konseptual (entitas + relasi). Skema tabel lengkap di SRS Functional Detail.

### 6.1 Entitas Utama

| Entitas | Deskripsi |
|---|---|
| **User** | Pengguna (Aviat, Partner, Customer) dengan satu role & region opsional. |
| **Role / Permission** | RBAC (spatie/laravel-permission). |
| **Partner** | Subcon pelaksana (nama + email); memiliki user partner. |
| **Signature** | Tanda tangan tersimpan approver (saved signature). |
| **Template** | Definisi SOW. |
| **TemplateLevel** | Level pada template (urutan + role + requires_signature). |
| **Document** | Request ATP: Unique ID, metadata (termasuk PT Index, site NE/FE), file PDF asli & final, status, snapshot struktur, tanggal otomatis, gabungan punchlist, relasi ke Partner. |
| **DocumentAttachment** | Lampiran (mis. Excel view-only; juga bukti import offline / reassign). |
| **ApprovalStep** | Step approval per dokumen (level, role, requires_signature, approver/PIC, status, tanggal aksi, signature opsional, catatan/punchlist, alasan reject, flag offline). |
| **PunchlistVerification** | Status verifikasi revisi punchlist per approver. |
| **ReassignmentLog** | Catatan reassign (dari, ke, oleh, alasan, attachment). |
| **Notification** | Notifikasi in-app per user. |
| **ReminderSetting** | Konfigurasi interval reminder per level (default weekday). |
| **AuditLog / Activity** | Jejak audit append-only per dokumen. |

### 6.2 Relasi Inti (Ringkas)

- **User** memiliki banyak **Signature** (riwayat; satu aktif via `is_active`); memiliki **satu Role**; opsional terkait **satu Partner** (untuk user partner).
- **Partner** memiliki banyak **User** dan banyak **Document**.
- **Template** memiliki banyak **TemplateLevel**.
- **Document** disubmit oleh **User (Partner/Admin)**, mengacu **Partner** & **Template** (menyimpan snapshot), memiliki banyak **ApprovalStep**, banyak **DocumentAttachment**, banyak **PunchlistVerification**, dan banyak **AuditLog**.
- **ApprovalStep** mengacu **User (approver/PIC)**, opsional **Signature**, dapat memiliki **Attachment** (offline) & **ReassignmentLog**.
- **Notification** terkait **User** + **Document**.

### 6.3 Catatan Desain Data

- Seluruh PK/FK menggunakan **UUID v7** (tipe `uuid` PostgreSQL; trait `HasUuids`/`Str::uuid7()`).
- **Unique ID** (`ACC-{tahun}-{urut}`) adalah kode bisnis terpisah dari UUID v7; di-generate berurutan per tahun.
- Snapshot struktur approval (level + role + requires_signature) disimpan pada **Document** (mis. JSONB) agar perubahan **Template** tidak memengaruhi dokumen berjalan.
- Status di-derive dari kondisi **ApprovalStep** + keberadaan punchlist (§7).
- **AuditLog** append-only.

---

## 7. Document Status Lifecycle

| Kode | Status |
|---|---|
| 01 | Submit & On Review L1 |
| 02 | L1 Rejected - Need Rectification |
| 03 | Done Rectification - On Review L1 |
| 04 | L1 Approve - On Review L2 |
| 05 | L2 Rejected - Need Rectification |
| 06 | Done Rectification - On Review L2 |
| 07 | L2 Approve - On Review L3 |
| 08 | L3 Rejected - Need Rectification |
| 09 | Done Rectification - On Review L3 |
| 10 | L3 Approve - On Review L4 |
| 11 | L4 Rejected - Need Rectification |
| 12 | Done Rectification - On Review L4 |
| 13 | ATP Done - All Approver Approve |
| 14 | ATP Done with Punchlist - Need Rectification |
| 15 | Punchlist Revised - Waiting Approver Verification |
| 16 | Closed - Punchlist Verified |

**Aturan transisi (ringkas):**
- L1 (Admin Aviat) adalah step approval (approve-only). Submit oleh Partner → status 01. Submit langsung oleh Admin → auto-approve L1 → status 04.
- Jumlah level mengikuti SOW. SOW 3-level: level terakhir = L3; setelah L3 approve → langsung status 13 (status 10–12 tidak dipakai). Label "...On Review L{next}" hanya bila ada level berikutnya.
- Reject (level mana pun) → "Need Rectification"; **Partner** merevisi → kembali ke level yang reject (sequence tidak reset).
- Approve with Punchlist tidak menghentikan alur; fase punchlist (14→16) aktif setelah approver terakhir approve.
- Tanpa punchlist, status final = 13.

> State machine lengkap + guard condition + variasi per jumlah level ada di SRS Functional Detail.

---

## 8. Deployment & Infrastructure

> Baseline: **Skenario Hemat**.

### 8.1 Topologi

```
                 +---------------------------------------------+
   Internet -->  | Cloudflare (DNS, TLS, CDN, WAF dasar)       |
                 +----------------------+----------------------+
                                        | HTTPS
                 +----------------------v----------------------+
                 | VPS (Docker Compose)                        |
                 |  - Nginx (reverse proxy)                    |
                 |  - Laravel app (PHP-FPM) + Inertia/React    |
                 |  - Queue worker   - Scheduler (cron)        |
                 |  - PostgreSQL     - Redis                   |
                 +------+---------------------------+----------+
                        | S3 API                    | Email API
                 +------v---------+        +--------v-----------+
                 | Object Storage |        | Email Transaksional|
                 | (Cloudflare R2)|        | (Resend)           |
                 +----------------+        +--------------------+
```

### 8.2 Komponen & Layanan

| Komponen | Pilihan (Skenario Hemat) | Catatan |
|---|---|---|
| VPS | Lokal Indonesia (Biznet Gio NEO Lite / DomaiNesia), **4 vCPU / 8 GB / ≥60 GB NVMe** | Region Jakarta/West Java. |
| Containerization | **Docker Compose** | Satu host; alternatif Laravel Forge/Ploi. |
| Database | PostgreSQL (container) | JSONB untuk snapshot/metadata. |
| Cache/Queue | Redis (container) | Backend queue & session. |
| Object Storage | **Cloudflare R2** | S3-compatible, free 10 GB, egress nol. *Lihat residency.* |
| Email | **Resend** (free tier) | ~1–2rb email/bulan masuk free tier. |
| DNS/TLS/CDN | **Cloudflare** (gratis) | + Let's Encrypt pada origin. |
| Monitoring | (opsional) Sentry + UptimeRobot free | Error & uptime. |

### 8.3 Strategi Backup

- **B-1** Dump DB harian ke object storage (mis. `spatie/laravel-backup`), retensi bergulir.
- **B-2** File durable di object storage; snapshot VPS berkala.
- **B-3** Uji restore berkala.

### 8.4 Lingkungan

- Production (VPS utama); Staging opsional untuk UAT.
- Deploy via pipeline sederhana (build asset → migrate → restart worker).

### 8.5 Catatan Data Residency

> **Keputusan terbuka (A-5):** bila Aviat/XLSmart mensyaratkan data **di Indonesia**, ganti object storage R2 → object storage lokal (Biznet Gio / IDCloudHost) yang juga S3-compatible. **Tidak mengubah kode** (cukup endpoint). Konfirmasi sebelum produksi.

---

## 9. Batasan, Asumsi & Risiko

### 9.1 Batasan & Asumsi

Mengacu §2.4 (C-1…C-9) dan §2.5 (A-1…A-7).

### 9.2 Risiko Utama

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Stamping text-anchor meleset / variasi SOW | Tinggi | Prototipe awal; manual placement universal; mapping kolom per role. |
| R2 | Anchor tak ditemukan (PDF scan) | Sedang | Manual placement + preview. |
| R3 | Partner salah pilih approver | Sedang | Daftar ter-filter role; admin reassign. |
| R4 | Konkurensi reassign | Rendah-Sedang | Lock step aktif; invalidasi akses approver lama. |
| R5 | Pertumbuhan storage | Rendah | Object storage + retensi/backup. |
| R6 | Deliverability email | Sedang | Layanan transaksional + SPF/DKIM/DMARC. |
| R7 | Notifikasi reject ke Partner manual (via WA) | Rendah | Status & tombol revisi jelas di UI Partner; admin info via WA. |

---

## 10. Lampiran

### 10.1 Matriks Hak Akses (RBAC)

| Aksi | Super Admin | Admin | Viewer | Partner | Approver |
|---|:---:|:---:|:---:|:---:|:---:|
| Kelola user & role | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kelola template/SOW | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kelola partner | ✅ | ✅ | ❌ | ❌ | ❌ |
| Submit dokumen | ✅ | ✅ (auto-approve L1) | ❌ | ✅ | ❌ |
| Pilih approver L2–L4 | ✅ | ✅ | ❌ | ✅ | ❌ |
| Approve L1 (approve-only) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject/Punchlist (L2+) | ❌ | ❌ | ❌ | ❌ | ✅ (giliran sendiri) |
| Revisi dokumen (setelah reject) | ✅ | ✅ | ❌ | ✅ (miliknya) | ❌ |
| Verify revisi punchlist | ❌ | ❌ | ❌ | ❌ | ✅ (pembuat punchlist) |
| Reassign approver | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lihat list & dashboard | ✅ | ✅ | ✅ (read-only) | ✅ (miliknya s/d L1) | ❌ (terbatas) |
| Export Excel | ✅ | ✅ | ✅ | ❌ | ❌ |
| Lihat audit trail | ✅ | ✅ | ✅ | ✅ (miliknya s/d L1) | ✅ (dokumen terkait) |
| Download PDF final | ✅ | ✅ | ✅ | ✅ (miliknya) | ✅ (dokumen terkait) |

### 10.2 Matriks Trigger Notifikasi

| Event | Penerima | Email | In-App |
|---|---|:---:|:---:|
| Dokumen disubmit (sent receipt) | Semua Admin Aviat | ✅ | ✅ |
| Giliran approval tiba | Approver giliran aktif | ✅ | ✅ |
| Approve / Approve with Punchlist | Semua Admin Aviat | ✅ | ✅ |
| Reject | Semua Admin Aviat | ✅ | ✅ |
| Alur selesai (13/14) | Semua Admin + approver terkait | ✅ | ✅ |
| Admin revisi punchlist | Approver pembuat punchlist | ✅ | ✅ |
| Reassign | Approver baru (tanpa OTP) | ✅ | ✅ |
| Hasil s/d L1 & dokumen reject (untuk revisi) | Partner pemilik | ✅ | ✅ |
| Pending > interval (weekday) | Approver terkait + semua Admin | ✅ | — |

> Catatan: notifikasi ke Partner saat reject dari L2+ disampaikan **manual oleh Admin via WA**; sistem menampilkan status reject + tombol revisi di UI Partner.

### 10.3 Traceability (Ringkas)

Setiap FR diturunkan dari modul PRD v2.0 (§7) dan akan dipetakan ke test case pada fase QA.

---

*— End of SRS —*
