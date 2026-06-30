# SRS Detail — Master Index
# Acceptra — Document Approval System

| | |
|---|---|
| **Document Version** | v1.0 |
| **Status** | Draft |
| **Last Updated** | 2026-06-23 |
| **Author** | System Analyst AI |
| **Source Documents** | SRS Acceptra v2.0 · IA Acceptra v2.0 · Data Model Acceptra v1.0 |

---

## Tentang Dokumen Ini

Folder `docs/user_flow/` berisi **SRS Detail** per Functional Requirement Group — breakdown dari SRS Acceptra v2.0 menjadi dokumen teknis siap implementasi. Setiap file mencakup: sequence diagram, API contract (Inertia route + form action), data flow, security rules, business rules, validations, edge cases, dan traceability.

**Template:** Mengikuti struktur `sys_uc_001.md` yang telah diadaptasi untuk tech stack Laravel 11 + Inertia.js + React + PostgreSQL.

---

## Daftar File

| # | File | FR Group | Kompleksitas | Jumlah Scenario |
|---|---|---|---|---|
| 1 | [FR-AUTH.md](FR-AUTH.md) | Authentication & Account | Sedang | 5 |
| 2 | [FR-USR.md](FR-USR.md) | User Management | Rendah | 5 |
| 3 | [FR-PTR.md](FR-PTR.md) | Partner Management | Rendah | 4 |
| 4 | [FR-TPL.md](FR-TPL.md) | Template / SOW Management | Sedang | 5 |
| 5 | [FR-SUB.md](FR-SUB.md) | Document Submission | Tinggi | 5 |
| 6 | [FR-IMP.md](FR-IMP.md) | Import Dokumen Berjalan | Sedang | 3 |
| 7 | [FR-ATT.md](FR-ATT.md) | Lampiran Excel | Rendah | 3 |
| 8 | [FR-APR.md](FR-APR.md) | Approval Flow | **Sangat Tinggi** | 7 |
| 9 | [FR-SIG.md](FR-SIG.md) | Digital Signature & Saved Signature | Sedang | 4 |
| 10 | [FR-PDF.md](FR-PDF.md) | PDF Stamping | Tinggi | 3 |
| 11 | [FR-PCL.md](FR-PCL.md) | Punchlist Management | Tinggi | 4 |
| 12 | [FR-RSG.md](FR-RSG.md) | Reassign Approver | Sedang | 3 |
| 13 | [FR-NTF.md](FR-NTF.md) | Notifications | Sedang | 5 |
| 14 | [FR-RMD.md](FR-RMD.md) | Email Reminder | Rendah | 3 |
| 15 | [FR-DSB.md](FR-DSB.md) | Dashboard | Rendah | 3 |
| 16 | [FR-ARC.md](FR-ARC.md) | Archive, Search & Export | Rendah | 3 |
| 17 | [FR-AUD.md](FR-AUD.md) | Audit Trail | Rendah | 2 |
| 18 | [FR-I18N.md](FR-I18N.md) | Internationalization | Rendah | 3 |
| 19 | [FR-BRD.md](FR-BRD.md) | Branding | Rendah | 2 |

---

## Traceability ke SRS v2.0

| SRS FR Group | File Detail | Status Implementasi |
|---|---|---|
| §3.1 FR-AUTH | [FR-AUTH.md](FR-AUTH.md) | Draft |
| §3.2 FR-USR | [FR-USR.md](FR-USR.md) | Draft |
| §3.3 FR-PTR | [FR-PTR.md](FR-PTR.md) | Draft |
| §3.4 FR-TPL | [FR-TPL.md](FR-TPL.md) | Draft |
| §3.5 FR-SUB | [FR-SUB.md](FR-SUB.md) | Draft |
| §3.6 FR-IMP | [FR-IMP.md](FR-IMP.md) | Draft |
| §3.7 FR-ATT | [FR-ATT.md](FR-ATT.md) | Draft |
| §3.8 FR-APR | [FR-APR.md](FR-APR.md) | Draft |
| §3.9 FR-SIG | [FR-SIG.md](FR-SIG.md) | Draft |
| §3.10 FR-PDF | [FR-PDF.md](FR-PDF.md) | Draft |
| §3.11 FR-PCL | [FR-PCL.md](FR-PCL.md) | Draft |
| §3.12 FR-RSG | [FR-RSG.md](FR-RSG.md) | Draft |
| §3.13 FR-NTF | [FR-NTF.md](FR-NTF.md) | Draft |
| §3.14 FR-RMD | [FR-RMD.md](FR-RMD.md) | Draft |
| §3.15 FR-DSB | [FR-DSB.md](FR-DSB.md) | Draft |
| §3.16 FR-ARC | [FR-ARC.md](FR-ARC.md) | Draft |
| §3.17 FR-AUD | [FR-AUD.md](FR-AUD.md) | Draft |
| §3.18 FR-I18N | [FR-I18N.md](FR-I18N.md) | Draft |
| §3.19 FR-BRD | [FR-BRD.md](FR-BRD.md) | Draft |

---

## Ringkasan Arsitektur Sistem

### Tech Stack
| Layer | Teknologi |
|---|---|
| Backend | Laravel 11 (PHP) |
| Frontend | Inertia.js + React + shadcn/ui + Tailwind CSS |
| Database | PostgreSQL (UUID v7, JSONB) |
| Cache / Queue | Redis |
| Storage | S3-compatible (Cloudflare R2 / lokal) |
| Email | Resend (transaksional) |
| Auth | Laravel session (email + password, tanpa OTP) |

### Pola Utama yang Harus Diperhatikan Developer

| Pola | Detail |
|---|---|
| **UUID v7** | Semua PK/FK menggunakan UUID v7 (via `Str::uuid7()`) — tidak boleh integer ID |
| **Inertia Routes** | Setiap GET = Inertia render; setiap aksi = POST/PUT/DELETE + Inertia redirect |
| **Template Snapshot** | Saat dokumen submit: salin `template_levels` ke `documents.template_snapshot` (JSONB). Approval steps dibuat dari snapshot, **bukan FK ke template_levels** |
| **Strictly Sequential** | Approval: hanya step dengan `is_active=true` yang dapat aksi; advance step by step |
| **16 Status Lifecycle** | Status `documents.status_code` adalah `draft` + `01`–`16`. Lihat [FR-APR.md](FR-APR.md) §8 untuk tabel transisi lengkap |
| **Tanpa OTP** | Tidak ada OTP di seluruh sistem — tidak di approval, tidak di invitation |
| **L1 = Admin any** | `approval_steps.approver_id = NULL` untuk L1 — semua admin dapat approve |
| **Append-only audit** | `audit_logs` tidak pernah di-UPDATE/DELETE |
| **File via Signed URL** | Semua file (PDF, Excel, signature) tidak pernah publik — wajib signed URL |
| **Email selalu EN** | Mailable paksa locale `en`; UI ikut `preferred_language` user |

---

## Alur Kunci (Quick Reference)

### Partner Submit → Closed
```
/documents/create → status 01 (notif Admin)
→ Admin approve L1 → status 04 (notif L2 Approver)
→ L2 approve → status 07 (atau 13 jika 3-level)
→ ... (sequential per level)
→ Last Approver approve → status 13 (tanpa punchlist) atau 14 (dengan punchlist)
→ [Jika 14] Admin upload revisi → status 15
→ Semua punchlist-maker verify → status 16 (Closed)
```

### Reject → Revisi → Lanjut
```
L3 reject → status 08 (notif Admin)
→ Partner revisi + resubmit → status 09 (sequence tidak reset, hanya ke L3)
→ L3 approve → status 10 atau 13
```

---

*— End of Master Index v1.0 —*
