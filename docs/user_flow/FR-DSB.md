# System Logic: FR-DSB — Dashboard

| | |
|---|---|
| **Document Version** | v1.0 |
| **FR Group ID** | FR-DSB |
| **FR Group Name** | Dashboard |
| **Status** | Draft |
| **Last Updated** | 2026-06-23 |
| **Author** | System Analyst AI |
| **Source** | SRS §3.15 · IA §6.4–6.6 · Data Model §3.6–3.8 |

---

## 1. Overview

Dashboard bersifat **role-adaptive** — satu route `/dashboard` menampilkan tiga varian berbeda sesuai role: Admin (metrics seluruh dokumen), Partner (dokumen miliknya s/d L1), dan Approver (daftar need approval + riwayat). Viewer mendapat tampilan read-only versi Admin.

**Cakupan FR:**
| FR ID | Deskripsi | Prioritas |
|---|---|---|
| FR-DSB-01 | Dashboard Admin: jumlah per status, dokumen aktif, aktivitas terbaru, pending lama | MUST |
| FR-DSB-02 | Dashboard Approver: list "Need Approval" + riwayat | MUST |
| FR-DSB-03 | Dashboard Partner: dokumen miliknya + status s/d L1 | MUST |
| FR-DSB-04 | Viewer: read-only (versi Admin tanpa aksi) | MUST |

---

## 2. Actors

| Actor | Dashboard Varian |
|---|---|
| Super Admin / Admin | Dashboard Admin (FR-DSB-01) |
| Viewer | Dashboard Admin read-only (FR-DSB-04) |
| Partner | Dashboard Partner (FR-DSB-03) |
| Approver (*) | Dashboard Approver (FR-DSB-02) |

---

## 3. Sequence Diagrams

### Scenario 1: Dashboard Admin — Load Metrics & Aktivitas

```mermaid
sequenceDiagram
    actor Admin
    participant Frontend as Frontend (Inertia/React)
    participant Server as Server (Laravel)
    participant Database

    Admin->>Frontend: Navigate ke /dashboard
    Frontend->>Server: GET /dashboard
    Server->>Server: Detect role: admin/super_admin/viewer → render admin dashboard

    Server->>Database: Query 1: COUNT documents per status_code
    Server->>Database: Query 2: SELECT documents WHERE status_code NOT IN ('13','16') ORDER BY created_at DESC LIMIT 10 (dokumen aktif)
    Server->>Database: Query 3: SELECT audit_logs ORDER BY created_at DESC LIMIT 10 (aktivitas terbaru)
    Server->>Database: Query 4: SELECT documents JOIN approval_steps WHERE is_active=true AND action_at < NOW()-7days (pending lama)

    Server-->>Frontend: Render Dashboard/Admin {
        metrics: { draft:5, status_01:3, status_04:8, ... },
        active_documents: [...],
        recent_activity: [...],
        overdue_approvals: [...]
    }

    Frontend-->>Admin: Tampilkan dashboard:
    Note over Frontend: - MetricCard per status<br/>- Kartu "Perlu Perhatian" (pending > 7 hari)<br/>- DataTable dokumen aktif<br/>- Feed aktivitas terbaru<br/>- Tombol Export to Excel
```

---

### Scenario 2: Dashboard Partner — Dokumen Miliknya s/d L1

```mermaid
sequenceDiagram
    actor Partner
    participant Frontend as Frontend (Inertia/React)
    participant Server as Server (Laravel)
    participant Database

    Partner->>Frontend: Navigate ke /dashboard
    Frontend->>Server: GET /dashboard
    Server->>Server: Detect role: partner → render partner dashboard

    Server->>Database: SELECT documents WHERE partner_id=current_partner_id ORDER BY created_at DESC
    Server->>Database: COUNT per status (hanya status yang relevan s/d L1: draft, 01, 02, 03, 04, 13, 16)

    Server-->>Frontend: Render Dashboard/Partner {
        summary: { total:10, pending_l1:2, approved:6, rejected:1, draft:1 },
        documents: [{ unique_id, status_code, status_label, created_at, ... }]
    }

    Frontend-->>Partner: Tampilkan:
    Note over Frontend: - Kartu ringkasan status<br/>- List DocumentCard (dokumen milik partner)<br/>- Status hanya s/d L1 (status 04 = "Sedang diproses customer")<br/>- Tombol utama "Submit Document"
```

---

### Scenario 3: Dashboard Approver — Need Approval List

```mermaid
sequenceDiagram
    actor Approver
    participant Frontend as Frontend (Inertia/React)
    participant Server as Server (Laravel)
    participant Database

    Approver->>Frontend: Navigate ke /dashboard (atau langsung /approvals)
    Frontend->>Server: GET /dashboard
    Server->>Server: Detect role: approver_* → render approver dashboard

    Server->>Database: SELECT documents JOIN approval_steps
        WHERE approval_steps.approver_id=current_user_id
        AND approval_steps.is_active=true
        AND approval_steps.status='pending'
        ORDER BY approval_steps.created_at ASC

    Server->>Database: SELECT COUNT history (sudah diproses)

    Server-->>Frontend: Render Dashboard/Approver {
        need_approval_count: 3,
        need_approval: [{ document, step, waiting_since }],
        recent_history: [...]
    }

    Frontend-->>Approver: Tampilkan:
    Note over Frontend: - Kartu "Need Approval (3)"<br/>- List DocumentCard menunggu aksi<br/>- Ringkasan riwayat terakhir
```

---

## 4. API Contract

### 4.1 Inertia Routes

| Method | Route | Inertia Page | Akses |
|---|---|---|---|
| GET | `/dashboard` | `Dashboard/Admin` (role: admin, super_admin, viewer) | Admin, Super Admin, Viewer |
| GET | `/dashboard` | `Dashboard/Partner` (role: partner) | Partner |
| GET | `/dashboard` | `Dashboard/Approver` (role: approver_*) | Approver |

**Props `Dashboard/Admin`:**
```json
{
  "metrics": {
    "draft": 2,
    "status_01": 5,
    "status_02": 1,
    "status_04": 8,
    "status_07": 3,
    "status_13": 45,
    "status_14": 2,
    "status_16": 30
  },
  "active_documents": [
    {
      "id": "uuid",
      "unique_id": "ACC-2026-0012",
      "sow_name": "SOW Install",
      "partner_name": "PT Maju Bersama",
      "status_code": "04",
      "status_label": "L1 Approve - On Review L2",
      "submitted_at": "2026-06-20"
    }
  ],
  "overdue_approvals": [...],
  "recent_activity": [...]
}
```

**Props `Dashboard/Partner`:**
```json
{
  "summary": { "total": 10, "draft": 1, "active": 5, "completed": 4 },
  "documents": [
    {
      "id": "uuid",
      "unique_id": "ACC-2026-0010",
      "status_code": "04",
      "status_label_partner": "On Process (Customer Review)",
      "submitted_at": "2026-06-15"
    }
  ]
}
```

**Props `Dashboard/Approver`:**
```json
{
  "need_approval": [
    {
      "id": "uuid",
      "unique_id": "ACC-2026-0008",
      "sow_name": "SOW Install",
      "level_order": 3,
      "waiting_since": "2026-06-18"
    }
  ],
  "need_approval_count": 2,
  "recent_history": [...]
}
```

---

## 5. Data Flow

| Step | Input | Process | Output |
|---|---|---|---|
| 1 | Authenticated user | Detect role → select dashboard variant | Inertia page component |
| 2 | admin/viewer role | COUNT documents per status + active list | Metrics + table |
| 3 | partner role | Filter documents WHERE partner_id = current | Partner document list |
| 4 | approver role | Filter approval_steps WHERE approver_id=current AND is_active=true | Need approval list |
| 5 | All variants | Recent audit_logs / activity | Activity feed |

---

## 6. Security Rules

| Rule | Deskripsi |
|---|---|
| Role-based render | Server menentukan Inertia page component berdasarkan role — tidak bisa dimanipulasi client |
| Partner scope | Partner hanya melihat `documents.partner_id = current_partner.id` |
| Viewer read-only | Viewer tidak mendapatkan tombol/aksi; hanya data |

---

## 7. Business Rules

| Rule ID | Deskripsi |
|---|---|
| BR-DSB-01 | Dashboard Admin menampilkan: MetricCard per status, dokumen aktif, pending lama (>7 hari), aktivitas terbaru (SRS FR-DSB-01) |
| BR-DSB-02 | Partner hanya melihat status s/d L1; status `04` dan seterusnya tampil sebagai "Dalam proses approval customer" (SRS FR-DSB-03, IA §2.3) |
| BR-DSB-03 | Approver dashboard opsional redirect langsung ke `/approvals` (SRS FR-DSB-02 catatan IA) |
| BR-DSB-04 | Viewer mendapat tampilan sama dengan Admin tetapi tanpa tombol aksi (SRS FR-DSB-04) |

---

## 8. Edge Cases

| Skenario | Penanganan |
|---|---|
| Approver tidak punya dokumen pending | Empty state: "No documents awaiting your approval" |
| Partner belum pernah submit | Empty state: "You haven't submitted any documents yet" + CTA Submit |
| Dashboard lambat karena banyak dokumen | Queries dibatasi (LIMIT), gunakan index, bisa di-cache |

---

## 9. Traceability

| Scenario | SRS FR | IA Page | Data Model | Controller |
|---|---|---|---|---|
| Dashboard Admin | FR-DSB-01 | `Dashboard/Admin` §6.4 | `documents`, `approval_steps`, `audit_logs` | `DashboardController@index` |
| Dashboard Partner | FR-DSB-03 | `Dashboard/Partner` §6.5 | `documents.partner_id` | `DashboardController@index` |
| Dashboard Approver | FR-DSB-02 | `Dashboard/Approver` §6.6 | `approval_steps.approver_id` | `DashboardController@index` |
| Viewer read-only | FR-DSB-04 | `Dashboard/Admin` §6.4 | — | Policy (no actions) |
