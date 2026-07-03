export type NotificationTypeValue =
  | 'submission'
  | 'approval_turn'
  | 'approved'
  | 'rejected'
  | 'flow_completed'
  | 'punchlist_revised'
  | 'reassigned'
  | 'result_partner'
  | 'reminder';

export interface NotificationRecord {
  id: string;
  type: NotificationTypeValue;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  preferred_language: 'id' | 'en';
  has_seen_get_started: boolean;
}

export interface PageProps {
  auth: { user: AuthUser | null };
  locale: string;
  unreadNotifications?: number;
  recentNotifications?: NotificationRecord[];
  l1PendingCount?: number;
  show_get_started_modal?: boolean;
  flash?: { success?: string; error?: string };
  [key: string]: unknown;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  region: string | null;
  partner_id: string | null;
  status: 'active' | 'inactive';
  invitation_pending: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  prev_page_url: string | null;
  next_page_url: string | null;
  first_page_url: string;
  last_page_url: string;
  path: string;
  links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface RoleOption {
  value: string;
  label: string;
}

export interface PartnerOption {
  id: string;
  name: string;
}

export interface PartnerRecord {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  pics_count: number;
  documents_count: number;
}

export interface PartnerPic {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  invitation_pending: boolean;
}

export interface PartnerDetail {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  pics: PartnerPic[];
}

export interface TemplateLevelRecord {
  level_order: number;
  role: string;
  requires_signature: boolean;
}

export interface TemplateRecord {
  id: string;
  name: string;
  sow_code: string | null;
  status: 'active' | 'inactive';
  levels_count: number;
  levels_summary: TemplateLevelRecord[];
  documents_count: number;
}

export interface TemplateDetail {
  id: string;
  name: string;
  sow_code: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  levels: TemplateLevelRecord[];
}

export interface AvailableRole {
  code: string;
  label: string;
}

// ── Document Submission (FR-SUB) ────────────────────────────────────────────

export interface TemplateOption {
  id: string;
  name: string;
  sow_code: string | null;
  levels_count: number;
}

export interface TemplateLevelOption {
  level_order: number;
  role: string;
  role_label: string;
  requires_signature: boolean;
}

// Per-level data for the "submit existing document" (offline approval) form
export interface OfflineLevel {
  level_order: number;
  is_offline: boolean;
  approver_name: string;      // required if offline
  offline_date: string;       // required if offline, YYYY-MM-DD
  evidence_file: File | null; // optional, offline only
  approver_id: string;        // required if pending
}

export interface PlacementPosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateSnapshot {
  template_id: string;
  template_name: string;
  levels: TemplateLevelRecord[];
  placement: {
    status: 'auto' | 'manual' | 'failed' | 'pending';
    positions: Record<string, PlacementPosition> | null;
  };
}

export interface ApprovalStepRecord {
  id: string;
  level_order: number;
  role: string;
  requires_signature: boolean;
  approver_id: string | null;
  approver_name: string | null;
  status: 'pending' | 'approved' | 'approved_with_punchlist' | 'rejected' | 'offline_approved' | 'skipped';
  is_active: boolean;
  action_at: string | null;
  reject_reason: string | null;
  punchlist_notes: string | null;
}

export interface ExcelAttachment {
  id: string;
  original_filename: string;
  file_size_bytes: number | null;
}

// FR-AUD: Audit trail entry (append-only, passed from DocumentController@show)
export interface AuditLogEntry {
  id: string;
  event: string;
  description: string;
  metadata: Record<string, unknown> | null;
  actor_name: string | null;
  actor_id: string | null;
  created_at: string;
}

// ── Dashboard (FR-DSB) ──────────────────────────────────────────────────────

export interface AdminMetrics {
  draft: number;
  active: number;
  need_revision: number;
  completed: number;
  overdue_count: number;
}

export interface ActiveDoc {
  id: string;
  uniqueId: string;
  project: string;
  sow: string;
  partner: string | null;
  statusCode: string;
  submittedAt: string;
}

export interface OverdueDoc {
  id: string;
  uniqueId: string;
  project: string;
  sow: string;
  partner: string | null;
  statusCode: string;
  waitingSince: string;
}

export interface ActivityEntry {
  id: string;
  event: string;
  description: string;
  actorName: string | null;
  documentUniqueId: string | null;
  createdAt: string;
}

export interface ApprovalStageEntry {
  stage: 'L1' | 'L2' | 'L3' | 'L4';
  count: number;
}

export interface WeeklyTrendEntry {
  week: string;
  count: number;
}

export interface TopPartnerEntry {
  name: string;
  total: number;
}

export interface PartnerDoc {
  id: string;
  uniqueId: string;
  project: string;
  sow: string;
  statusCode: string;
  statusLabelPartner: string;
  submittedAt: string;
}

export interface PartnerSummary {
  total: number;
  draft: number;
  active: number;
  completed: number;
}

export interface NeedApprovalDoc {
  id: string;
  uniqueId: string;
  project: string;
  sow: string;
  statusCode: string;
  levelOrder: number;
  kind: 'approval' | 'punchlist';
  waitingSince: string;
}

export interface ApproverHistoryEntry {
  documentId: string;
  uniqueId: string;
  sowName: string;
  status: string;
  actionAt: string;
}

export interface DocumentRecord {
  id: string;
  unique_id: string;
  pt_index: string;
  vendor_contractor: string;
  project_code: string | null;
  link_id: string | null;
  link_name: string | null;
  cluster_zone: string | null;
  sow_name: string;
  status_code: string;
  date_atp_submission: string | null;
  original_pdf_path: string | null;
  template_snapshot: TemplateSnapshot;
  partner: { id: string; name: string } | null;
  submitter: { id: string; name: string } | null;
  created_at: string;
  approval_steps: ApprovalStepRecord[];
  excel_attachment: ExcelAttachment | null;
  atp_punchlist: string | null;
}

// ── FR-ARC: Archive / Document List ─────────────────────────────────────────

export interface DocumentListItem {
  id: string;
  unique_id: string;
  pt_index: string;
  project_code: string | null;
  link_id: string | null;
  sow_name: string;
  partner_name: string | null;
  status_code: string;
  submitted_at: string;
  has_excel: boolean;
  has_final_pdf: boolean;
  active_step: string | null;
}

export interface DocumentFilters {
  search: string | null;
  partner_id: string | null;
  status_code: string | null;
  sow_name: string | null;
  date_from: string | null;
  date_to: string | null;
  sort: string;
  dir: 'asc' | 'desc';
}
