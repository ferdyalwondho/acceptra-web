import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AppShell from '@/layouts/AppShell';
import StatusBadge from '@/components/acceptra/StatusBadge';
import ApprovalTimeline, { type ApprovalStep as TimelineStep } from '@/components/acceptra/ApprovalTimeline';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { DocumentRecord, ExcelAttachment, PlacementPosition, TemplateLevelRecord, PageProps, AuditLogEntry } from '@/types';
import {
  ArrowLeft, Download, Users, RotateCcw, FileText, FileSpreadsheet,
  AlertTriangle, CheckCircle2, X, Trash2,
  Info, MapPin, Move, Paperclip,
  Inbox, XCircle, Lock,
} from 'lucide-react';

interface Props {
  document: DocumentRecord;
  anchor_failed: boolean;
  pdf_url: string | null;
  excel_attachment: ExcelAttachment | null;
  audit_logs: AuditLogEntry[];
  initial_tab: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin:                  'Admin Aviat',
  approver_ms_bo:         'Approver MS BO',
  approver_ms_rts:        'Approver MS RTS',
  approver_xls_rth_team:  'Approver XLS RTH Team',
  approver_xls_rth:       'Approver XLS RTH',
};

function stepState(s: DocumentRecord['approval_steps'][number]): TimelineStep['state'] {
  if (['approved', 'approved_with_punchlist', 'offline_approved', 'skipped'].includes(s.status)) return 'done';
  if (s.status === 'rejected') return 'rejected';
  if (s.is_active) return 'active';
  return 'pending';
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inputCls = 'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40';

/* ── Manual Placement Panel ─────────────────────────────────────────────── */

type Pos = { x: number; y: number; width: number; height: number };

const OVERLAY_TYPE_META: Record<string, { short: string }> = {
  sig:       { short: 'TTD' },
  name:      { short: 'Nama' },
  submitted: { short: 'Tgl Submit' },
  status:    { short: 'Status' },
  punchlist: { short: 'Punchlist' },
  atpdate:   { short: 'Tgl ATP' },
};

const PLACEMENT_MARGIN_BOTTOM = 30;
const PLACEMENT_LEVEL_BLOCK_H = 140;
const PLACEMENT_NAME_GAP      = 80;
const PLACEMENT_DOC_ROW_H     = 28;
const PLACEMENT_DOC_GAP       = 36;
const PLACEMENT_DOC_COL_X     = 220;

function buildDefaultPositions(
  placementLevels: TemplateLevelRecord[],
  pageHeight: number,
): Record<string, Pos> {
  const init: Record<string, Pos> = {};

  // Kolom 1: sig/name per level approval, anchor ke bawah halaman
  const levelStackH = placementLevels.length * PLACEMENT_LEVEL_BLOCK_H;
  const col1Top = Math.max(10, pageHeight - PLACEMENT_MARGIN_BOTTOM - levelStackH);
  placementLevels.forEach((l, i) => {
    const baseY = col1Top + i * PLACEMENT_LEVEL_BLOCK_H;
    init[`${l.level_order}_sig`]  = { x: 20, y: baseY,                        width: 160, height: 70 };
    init[`${l.level_order}_name`] = { x: 20, y: baseY + PLACEMENT_NAME_GAP,   width: 160, height: 28 };
  });

  // Kolom 2: overlay milik dokumen (bukan per-level), anchor ke bawah halaman
  const docKeys: Array<[string, number]> = [
    ['doc_submitted', 160],
    ['doc_status',    260],
    ['doc_punchlist', 220],
    ['doc_atpdate',   160],
  ];
  const docStackH = docKeys.length * PLACEMENT_DOC_GAP;
  const col2Top = Math.max(10, pageHeight - PLACEMENT_MARGIN_BOTTOM - docStackH);
  docKeys.forEach(([key, w], i) => {
    init[key] = { x: PLACEMENT_DOC_COL_X, y: col2Top + i * PLACEMENT_DOC_GAP, width: w, height: PLACEMENT_DOC_ROW_H };
  });

  return init;
}

interface PlacementPanelProps {
  pdfUrl: string;
  levels: TemplateLevelRecord[];
  documentId: string;
  onSaved: () => void;
}

function PlacementPanel({ pdfUrl, levels, documentId, onSaved }: PlacementPanelProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [ready,     setReady]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [canvasH,   setCanvasH]   = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Only L2+ get placement boxes; L1 is auto-approved
  const placementLevels = levels.filter(l => l.level_order > 1);

  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const defaultsSeeded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const workerText = await fetch(workerUrl).then(r => r.text());
        pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
          new Blob([workerText], { type: 'application/javascript' }),
        );

        const pdf  = await pdfjs.getDocument({ url: pdfUrl }).promise;
        const page = await pdf.getPage(1);
        const vp   = page.getViewport({ scale: 1.4 });

        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width  = vp.width;
        canvas.height = vp.height;
        setCanvasH(vp.height);

        if (!defaultsSeeded.current) {
          defaultsSeeded.current = true;
          setPositions(buildDefaultPositions(placementLevels, vp.height));
        }

        await page.render({ canvas, viewport: vp }).promise;
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  const startDrag = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    const wrapRect = wrapRef.current?.getBoundingClientRect();
    if (!wrapRect) return;
    const offsetX = e.clientX - wrapRect.left - positions[key].x;
    const offsetY = e.clientY - wrapRect.top  - positions[key].y;

    const onMove = (ev: MouseEvent) => {
      setPositions(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          x: Math.max(0, ev.clientX - wrapRect.left - offsetX),
          y: Math.max(0, ev.clientY - wrapRect.top  - offsetY),
        },
      }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const initW  = positions[key].width;
    const initH  = positions[key].height;

    const onMove = (ev: MouseEvent) => {
      setPositions(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          width:  Math.max(60, initW + ev.clientX - startX),
          height: Math.max(20, initH + ev.clientY - startY),
        },
      }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleSave = async () => {
    setSaving(true);
    const finalPositions: Record<string, PlacementPosition> = {};
    Object.entries(positions).forEach(([lo, pos]) => {
      finalPositions[lo] = { page: 1, ...pos };
    });
    try {
      await axios.post(`/documents/${documentId}/placement`, { positions: finalPositions });
      setSaved(true);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-warning/40 bg-[var(--color-bg-surface)] shadow-xs">
      <div className="flex items-center gap-2 border-b border-warning/30 bg-warning-surface/40 px-5 py-3">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <span className="text-sm font-semibold text-warning">{t('documents.show.placement_title')}</span>
        <span className="ml-auto flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-5 rounded-sm border-2 border-dashed border-brand-ink bg-brand-surface/60" /> {t('documents.show.placement_legend_ttd')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-5 rounded-sm border-2 border-dashed border-ming/70 bg-[var(--color-bg-subtle)]" /> {t('documents.show.placement_legend_nama')}
          </span>
          <span className="flex items-center gap-1"><Move className="h-3.5 w-3.5" /> {t('documents.show.placement_drag_hint')}</span>
        </span>
      </div>

      <div className="p-4">
        {loadError && (
          <div className="mb-3 rounded-lg border border-danger/30 bg-danger-surface px-4 py-3 font-mono text-xs text-danger">
            <strong>PDF load error:</strong> {loadError}
          </div>
        )}
        {!ready && !loadError && (
          <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-tertiary)]">
            {t('documents.show.placement_loading')}
          </div>
        )}
        <div
          ref={wrapRef}
          className="relative inline-block border border-[var(--color-border)]"
          style={{ height: canvasH || undefined }}
        >
          <canvas ref={canvasRef} className={cn('block max-w-full', !ready && 'invisible')} />

          {ready && Object.entries(positions).map(([key, pos]) => {
            const [lo, type] = key.split('_');
            const isDocLevel = lo === 'doc';
            const lvl   = isDocLevel ? undefined : levels.find(l => String(l.level_order) === lo);
            const isSig = type === 'sig';
            const meta  = OVERLAY_TYPE_META[type] ?? { short: type };
            const minDim  = Math.min(pos.width, pos.height);
            const fontSize    = Math.max(7, minDim * 0.2);
            const subFontSize = Math.max(6, minDim * 0.14);
            return (
              <div
                key={key}
                onMouseDown={(e) => startDrag(key, e)}
                style={{ left: pos.x, top: pos.y, width: pos.width, height: pos.height }}
                className={cn(
                  'absolute cursor-grab select-none rounded-sm border-2 border-dashed flex flex-col items-center justify-center overflow-hidden active:cursor-grabbing',
                  isSig
                    ? 'border-brand-ink bg-brand-surface/60'
                    : 'border-ming/70 bg-[var(--color-bg-subtle)]',
                )}
              >
                <span
                  style={{ fontSize, lineHeight: 1 }}
                  className={cn('font-bold text-center px-1 truncate max-w-full', isSig ? 'text-brand-ink' : 'text-ming')}
                >
                  {meta.short}{isDocLevel ? '' : ` L${lo}`}
                </span>
                {!isDocLevel && (
                  <span
                    style={{ fontSize: subFontSize, lineHeight: 1 }}
                    className="text-center text-[var(--color-text-tertiary)] mt-0.5 px-1 truncate max-w-full"
                  >
                    {ROLE_LABELS[lvl?.role ?? ''] ?? lvl?.role}
                  </span>
                )}
                {/* Resize handle */}
                <div
                  onMouseDown={(e) => startResize(key, e)}
                  className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-se-resize"
                  style={{
                    background: isSig
                      ? 'linear-gradient(135deg, transparent 50%, var(--color-brand-ink, #1a3a5c) 50%)'
                      : 'linear-gradient(135deg, transparent 50%, var(--color-ming, #0e7490) 50%)',
                    borderRadius: '0 0 2px 0',
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> {t('documents.show.placement_saved')}
            </span>
          )}
          <button
            disabled={saving || saved}
            onClick={handleSave}
            className="h-9 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? t('documents.show.placement_saving_btn') : t('documents.show.placement_save_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reassign Modal ─────────────────────────────────────────────────────── */

function ReassignModal({
  documentId, steps, onClose,
}: {
  documentId: string;
  steps: DocumentRecord['approval_steps'];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [levelOrder,    setLevelOrder]    = useState('');
  const [newApproverId, setNewApproverId] = useState('');
  const [reason,        setReason]        = useState('');
  const [evidenceFile,  setEvidenceFile]  = useState<File | null>(null);
  const [approvers,     setApprovers]     = useState<Array<{ id: string; name: string }>>([]);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  const reassignableSteps = steps.filter((s) => s.level_order > 1 && s.status === 'pending');
  const selectedStep      = reassignableSteps.find((s) => String(s.level_order) === levelOrder);

  useEffect(() => {
    setNewApproverId('');
    setApprovers([]);
    if (!selectedStep) return;

    setLoadingApprovers(true);
    axios
      .get<{ data: Array<{ id: string; name: string }> }>(`/api/users?role=${selectedStep.role}`)
      .then(({ data }) => setApprovers(data.data))
      .catch(() => setApprovers([]))
      .finally(() => setLoadingApprovers(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelOrder]);

  function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setErrors({});
    router.post(`/documents/${documentId}/reassign`, {
      level_order: levelOrder,
      new_approver_id: newApproverId,
      reason,
      evidence_file: evidenceFile,
    }, {
      forceFormData: true,
      onSuccess: onClose,
      onError: (e) => setErrors(e as Record<string, string>),
      onFinish: () => setSubmitting(false),
    });
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(17,24,39,.45)]" onClick={onClose} />
      <div className="relative z-[410] w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold text-[var(--color-text-primary)]">{t('documents.show.reassign_title')}</h2>
          <button onClick={onClose} className="rounded-md p-1 transition-colors hover:bg-[var(--color-bg-subtle)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('documents.show.reassign_level')} <span className="text-danger">*</span>
            </label>
            <select value={levelOrder} onChange={(e) => setLevelOrder(e.target.value)} className={inputCls}>
              <option value="">{t('documents.show.reassign_level_placeholder')}</option>
              {reassignableSteps.map((s) => (
                <option key={s.level_order} value={s.level_order}>
                  L{s.level_order} — {s.approver_name ?? ROLE_LABELS[s.role] ?? s.role}
                </option>
              ))}
            </select>
            {errors.level_order && <p className="mt-1 text-xs text-danger">{errors.level_order}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('documents.show.reassign_approver_baru')} <span className="text-danger">*</span>
            </label>
            <select
              value={newApproverId}
              onChange={(e) => setNewApproverId(e.target.value)}
              className={inputCls}
              disabled={!selectedStep || loadingApprovers}
            >
              <option value="">{t('documents.show.reassign_approver_placeholder')}</option>
              {approvers.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {errors.new_approver_id && <p className="mt-1 text-xs text-danger">{errors.new_approver_id}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('documents.show.reassign_alasan')} <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full resize-none rounded-sm border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
            />
            {errors.reason && <p className="mt-1 text-xs text-danger">{errors.reason}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('documents.show.reassign_bukti')}
            </label>
            {evidenceFile ? (
              <div className="flex h-9 items-center gap-2 rounded-sm border border-[var(--color-border-strong)] bg-white px-3">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-secondary)]" />
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-primary)]">{evidenceFile.name}</span>
                <button type="button" onClick={() => setEvidenceFile(null)} className="shrink-0 text-[var(--color-text-secondary)] hover:text-danger">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-dashed border-[var(--color-border-strong)] px-3 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-brand hover:text-brand-ink">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span>{t('documents.show.reassign_bukti_upload')}</span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="sr-only"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            {errors.evidence_file && <p className="mt-1 text-xs text-danger">{errors.evidence_file}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="h-9 rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium hover:bg-[var(--color-bg-subtle)]">{t('documents.show.reassign_btn_batal')}</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !levelOrder || !newApproverId || !reason}
            className="h-9 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {submitting ? t('documents.show.submitting') : t('documents.show.reassign_btn_simpan')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Submit Approval Confirm Modal ──────────────────────────────────────── */

function SubmitApprovalModal({ submitting, onCancel, onConfirm }: { submitting: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(17,24,39,.45)]" onClick={onCancel} />
      <div className="relative z-[410] w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-[var(--color-text-primary)]">{t('documents.show.submit_confirm_title')}</h2>
          <button onClick={onCancel} className="rounded-md p-1 transition-colors hover:bg-[var(--color-bg-subtle)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('documents.show.submit_confirm_body')}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="h-9 rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium hover:bg-[var(--color-bg-subtle)]">
            {t('documents.show.btn_batal')}
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="h-9 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {submitting ? t('documents.show.submitting') : t('documents.show.submit_confirm_btn_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Audit Trail Tab ─────────────────────────────────────────────────────── */

type AuditEventType = 'submit' | 'approve' | 'reject' | 'revise' | 'reassign' | 'generate' | 'draft';

const AUDIT_EVENT_META: Record<AuditEventType, { icon: React.ReactNode; color: string; bg: string }> = {
  submit:   { icon: <Inbox className="h-3.5 w-3.5" />,        color: 'text-info',    bg: 'bg-info-surface ring-info/30' },
  approve:  { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-success', bg: 'bg-success-surface ring-success/30' },
  reject:   { icon: <XCircle className="h-3.5 w-3.5" />,      color: 'text-danger',  bg: 'bg-danger-surface ring-danger/30' },
  revise:   { icon: <RotateCcw className="h-3.5 w-3.5" />,    color: 'text-warning', bg: 'bg-warning-surface ring-warning/30' },
  reassign: { icon: <Users className="h-3.5 w-3.5" />,        color: 'text-ming',    bg: 'bg-info-surface ring-ming/30' },
  generate: { icon: <FileText className="h-3.5 w-3.5" />,     color: 'text-success', bg: 'bg-success-surface ring-success/30' },
  draft:    { icon: <Lock className="h-3.5 w-3.5" />,         color: 'text-[var(--color-text-tertiary)]', bg: 'bg-muted ring-[var(--color-border)]' },
};


function getAuditEventType(event: string): AuditEventType {
  if (['document.submitted', 'document.revised'].includes(event)) return 'submit';
  if (['step.approved', 'step.approved_with_punchlist', 'punchlist.verified',
       'document.auto_approved_l1', 'step.offline_imported'].includes(event)) return 'approve';
  if (['step.rejected', 'punchlist.revision_rejected'].includes(event)) return 'reject';
  if (['punchlist.revision_uploaded'].includes(event)) return 'revise';
  if (['step.reassigned'].includes(event)) return 'reassign';
  if (['pdf.stamped', 'pdf.placement_saved', 'signature.saved', 'signature.replaced'].includes(event)) return 'generate';
  return 'draft';
}

function getAuditEventLabel(log: AuditLogEntry, t: (k: string, opts?: object) => string): string {
  const key   = log.event.replace(/\./g, '_');
  const label = t(`documents.show.audit_events.${key}`, { defaultValue: log.event });
  const level = log.metadata?.level;
  if (level && ['step.approved', 'step.approved_with_punchlist', 'step.rejected', 'step.reassigned'].includes(log.event)) {
    return `L${level} — ${label}`;
  }
  return label;
}

function AuditTrailTab({ logs, documentId }: { logs: AuditLogEntry[]; documentId: string }) {
  const { t } = useTranslation();
  const reversed = [...logs].reverse();

  if (logs.length === 0) {
    return (
      <div className="max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 text-center shadow-xs">
        <p className="text-sm text-[var(--color-text-secondary)]">{t('documents.show.audit_empty')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-xs">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {t('documents.show.audit_count', { count: logs.length })}
        </p>
        <p className="font-mono text-[11px] text-[var(--color-text-tertiary)]">
          {t('documents.show.audit_append_only')}
        </p>
      </div>

      <ol className="relative space-y-6 pl-8 before:absolute before:left-[11px] before:top-0 before:h-full before:w-0.5 before:bg-[var(--color-border)]">
        {reversed.map((log, i) => {
          const type = getAuditEventType(log.event);
          const meta = AUDIT_EVENT_META[type];
          const time = new Date(log.created_at).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });
          return (
            <li key={log.id} className="relative">
              <span className={cn(
                'absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full ring-2',
                meta.bg, meta.color,
              )}>
                {meta.icon}
              </span>
              <div className={cn(
                'rounded-lg border p-4',
                i === 0
                  ? 'border-brand/20 bg-brand-surface/30'
                  : 'border-[var(--color-border)] bg-white',
              )}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className={cn('text-sm font-semibold', meta.color)}>{getAuditEventLabel(log, t)}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {log.actor_name ?? t('documents.show.audit_actor_system')}
                    </p>
                  </div>
                  <p className="flex-shrink-0 font-mono text-[11px] text-[var(--color-text-tertiary)]">{time}</p>
                </div>
                {log.description && (
                  <p className="mt-2 rounded-md bg-[var(--color-bg-subtle)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                    {log.description}
                  </p>
                )}
                {typeof log.metadata?.attachment_id === 'string' && (
                  <a
                    href={`/documents/${documentId}/attachments/${log.metadata.attachment_id}/download`}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ming hover:underline"
                  >
                    <Paperclip className="h-3.5 w-3.5" /> {t('documents.show.audit_attachment_download')}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 rounded-lg bg-[var(--color-bg-subtle)] px-4 py-3 text-center text-xs text-[var(--color-text-tertiary)]">
        {t('documents.show.audit_start')}
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */

export default function DocumentShow({ document: doc, anchor_failed, pdf_url, excel_attachment, audit_logs, initial_tab }: Props) {
  const { auth, flash } = usePage<PageProps>().props;
  const { t } = useTranslation();
  const isPartner = auth.user?.role === 'partner';
  const isAdmin   = ['admin', 'super_admin'].includes(auth.user?.role ?? '');

  const [activeTab,          setActiveTab]          = useState(initial_tab ?? 'overview');
  const [showReassign,       setShowReassign]       = useState(false);
  const [placementSaved,     setPlacementSaved]     = useState(false);
  const [deletingAtt,        setDeletingAtt]        = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);
  const [attachmentDeleted,  setAttachmentDeleted]  = useState(false);
  const [showSubmitConfirm,  setShowSubmitConfirm]  = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.replaceState({}, '', url.toString());
  };

  const handleDeleteAttachment = () => {
    if (!excel_attachment || deletingAtt) return;
    setDeletingAtt(true);
    router.delete(`/documents/${doc.id}/attachments/${excel_attachment.id}`, {
      onSuccess: () => { setAttachmentDeleted(true); setShowDeleteConfirm(false); },
      onFinish:  () => setDeletingAtt(false),
    });
  };

  const handleSubmitApproval = () => {
    if (submittingApproval) return;
    setSubmittingApproval(true);
    router.post(`/documents/${doc.id}/submit`, {}, {
      onSuccess: () => setShowSubmitConfirm(false),
      onFinish:  () => setSubmittingApproval(false),
    });
  };

  const statusCode   = doc.status_code;
  const isDone       = ['13', '16'].includes(statusCode);
  const isDraft      = statusCode === 'draft';
  const canEdit      = ['02', '05', '08', '11', '14', 'draft'].includes(statusCode);
  const canReassign  = isAdmin && !['draft', '13', '14', '15', '16'].includes(statusCode);
  const showPlacement = anchor_failed && !placementSaved && !!pdf_url;

  const hasPdf          = !!doc.original_pdf_path;
  const picsComplete    = doc.approval_steps.filter((s) => s.level_order > 1).every((s) => !!s.approver_id);
  const canSubmitApproval = isDraft && hasPdf && picsComplete;
  const rejectedStep    = doc.approval_steps.find((s) => s.status === 'rejected') ?? null;
  const punchlistSteps  = doc.approval_steps.filter((s) => s.status === 'approved_with_punchlist' && !!s.punchlist_notes);

  const projectTitle = doc.link_name ?? doc.pt_index;

  const timelineSteps: TimelineStep[] = doc.approval_steps.map((s) => ({
    id:                s.id,
    level:             s.level_order,
    role:              ROLE_LABELS[s.role] ?? s.role,
    pic:               s.approver_name ?? undefined,
    date:              formatDate(s.action_at),
    state:             stepState(s),
    requiresSignature: s.requires_signature,
  }));

  const snapshot   = doc.template_snapshot;
  const snapLevels = snapshot?.levels ?? [];

  const infoFields = [
    { label: 'PT Index',          value: doc.pt_index },
    { label: 'Vendor/Kontraktor', value: doc.vendor_contractor },
    { label: 'SOW',               value: doc.sow_name },
    { label: 'Project Code',      value: doc.project_code ?? '—' },
    { label: 'Link ID',           value: doc.link_id ?? '—' },
    { label: 'Link Name',         value: doc.link_name ?? '—' },
    { label: 'Cluster Zone',      value: doc.cluster_zone ?? '—' },
    { label: t('documents.show.field_submit_date'),  value: formatDate(doc.date_atp_submission) ?? '—' },
    { label: 'Partner',                               value: doc.partner?.name ?? '—' },
    { label: t('documents.show.field_submitted_by'), value: doc.submitter?.name ?? '—' },
  ];

  return (
    <AppShell>
      <Head title={`${doc.unique_id} – Detail`} />

      {/* Flash message */}
      {flash?.success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-surface px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {flash.success}
        </div>
      )}
      {flash?.error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-surface px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {flash.error}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href="/documents" className="flex items-center gap-1 transition-colors hover:text-ming">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('documents.show.breadcrumb_back')}
        </Link>
        <span>/</span>
        <span className="font-mono text-[var(--color-text-primary)]">{doc.unique_id}</span>
      </div>

      {/* Header card — always visible above tabs */}
      <div className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
                    {doc.sow_name}
                  </span>
                  <StatusBadge code={statusCode} />
                </div>
                <h1 className="text-xl font-semibold leading-snug text-[var(--color-text-primary)]">{projectTitle}</h1>
                <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
                  {doc.unique_id}{doc.project_code ? ` · ${doc.project_code}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {isDone && (
                  <a
                    href={`/documents/${doc.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <Download className="h-4 w-4" /> {t('documents.show.btn_download_pdf')}
                  </a>
                )}
                {canReassign && (
                  <button
                    onClick={() => setShowReassign(true)}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <Users className="h-4 w-4" /> {t('documents.show.btn_reassign')}
                  </button>
                )}
                {canEdit && (
                  <Link
                    href={`/documents/${doc.id}/edit`}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <RotateCcw className="h-4 w-4" /> {isDraft ? t('documents.show.btn_edit') : t('documents.show.btn_revisi_pdf')}
                  </Link>
                )}
                {isDraft && (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    disabled={!canSubmitApproval}
                    title={!canSubmitApproval ? t('documents.show.submit_disabled_hint') : undefined}
                    className="flex h-9 items-center gap-1.5 rounded-md bg-brand-ink px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t('documents.show.btn_submit_approval')}
                  </button>
                )}
              </div>
            </div>
          </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">{t('documents.show.tab_overview')}</TabsTrigger>
          <TabsTrigger value="approval-timeline">{t('documents.show.tab_approval_timeline')}</TabsTrigger>
          <TabsTrigger value="attachments">{t('documents.show.tab_attachments')}</TabsTrigger>
          <TabsTrigger value="audit-trail">{t('documents.show.tab_audit_trail')}</TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ── */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Left column */}
            <div className="min-w-0 space-y-5">

              {/* Manual placement UI */}
              {showPlacement && (
                <PlacementPanel
                  pdfUrl={pdf_url!}
                  levels={snapLevels}
                  documentId={doc.id}
                  onSaved={() => {
                    setPlacementSaved(true);
                    router.reload({ only: ['document', 'anchor_failed'] });
                  }}
                />
              )}

              {/* PDF preview */}
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                    <FileText className="h-4 w-4 text-[var(--color-text-secondary)]" />
                    {t('documents.show.preview_pdf_heading')}
                  </div>
                  {doc.original_pdf_path && (
                    <a href={`/documents/${doc.id}/pdf`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-ming hover:underline">
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  )}
                </div>
                <div className="flex min-h-[220px] flex-col items-center justify-center bg-[var(--color-bg-subtle)] py-8">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xs">
                    <FileText className="h-7 w-7 text-danger" />
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">{doc.unique_id}.pdf</p>

                  {snapshot?.placement?.status === 'auto' && snapshot.placement.positions && (
                    <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                      {Object.entries(snapshot.placement.positions).map(([lo]) => (
                        <span key={lo} className="flex items-center gap-1">
                          <span className="h-3 w-3 rounded-sm border-2 border-brand-ink/50 bg-brand-surface" />
                          TTD L{lo}
                        </span>
                      ))}
                    </div>
                  )}

                  {snapshot?.placement?.status === 'manual' && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                      <MapPin className="h-3.5 w-3.5" /> {t('documents.show.posisi_ttd_manual')}
                    </p>
                  )}

                  {anchor_failed && !showPlacement && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                      <MapPin className="h-3.5 w-3.5" /> {t('documents.show.placement_saving')}
                    </p>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
                <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
                  <Info className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('documents.show.info_dokumen_heading')}</span>
                </div>
                <div className="p-5">
                  <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {infoFields.map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</p>
                        <p className="mt-0.5 text-sm text-[var(--color-text-primary)]">{value}</p>
                      </div>
                    ))}
                  </div>

                  {punchlistSteps.length > 0 && (
                    <div className="mt-5 rounded-lg border border-warning/30 bg-warning-surface p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <span className="text-sm font-semibold text-warning">{t('documents.show.punchlist_heading')}</span>
                      </div>
                      {isPartner ? (
                        <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
                          {punchlistSteps.map((s) => s.punchlist_notes).join('\n\n')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {punchlistSteps.map((s) => (
                            <p key={s.id} className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
                              <span className="font-semibold">
                                L{s.level_order} — {s.approver_name ?? ROLE_LABELS[s.role] ?? s.role}:
                              </span>{' '}
                              {s.punchlist_notes}
                            </p>
                          ))}
                        </div>
                      )}
                      {statusCode === '14' && isAdmin && (
                        <Link
                          href={`/documents/${doc.id}/edit`}
                          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-ink px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> {t('documents.show.btn_upload_revisi')}
                        </Link>
                      )}
                      {statusCode === '15' && (
                        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                          {t('documents.show.punchlist_waiting')}
                        </p>
                      )}
                      {statusCode === '16' && (
                        <div className="mt-2 flex items-center gap-1.5 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-medium">{t('documents.show.punchlist_verified')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-xs">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('documents.show.alur_approval_heading')}</p>
                <ApprovalTimeline steps={timelineSteps} partnerView={isPartner} />
              </div>

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-xs">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('documents.show.ringkasan_heading')}</p>
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-[var(--color-text-secondary)]">{t('documents.show.field_status')}</span>
                    <div className="mt-1.5"><StatusBadge code={statusCode} /></div>
                  </div>
                  {doc.date_atp_submission && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">{t('documents.show.field_submitted')}</span>
                      <span className="font-mono text-xs">{formatDate(doc.date_atp_submission)}</span>
                    </div>
                  )}
                  {doc.partner && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">{t('documents.show.field_partner')}</span>
                      <span className="text-xs text-[var(--color-text-primary)]">{doc.partner.name}</span>
                    </div>
                  )}
                  {rejectedStep && (
                    <div className="rounded-md border border-danger/30 bg-danger-surface p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-danger">
                        <XCircle className="h-3.5 w-3.5" /> {t('documents.show.reject_reason_heading', { level: rejectedStep.level_order })}
                      </p>
                      <p className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">
                        {rejectedStep.reject_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Approval Timeline ── */}
        <TabsContent value="approval-timeline">
          <div className="max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-xs">
            <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{t('documents.show.alur_approval_heading')}</p>
            <ApprovalTimeline steps={timelineSteps} partnerView={isPartner} />
          </div>
        </TabsContent>

        {/* ── Tab: Attachments ── */}
        <TabsContent value="attachments">
          {excel_attachment && !attachmentDeleted ? (
            <div className="max-w-2xl overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
                <Paperclip className="h-4 w-4 text-[var(--color-text-secondary)]" />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('documents.show.attachment_heading')}</span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
                  <FileSpreadsheet className="h-9 w-9 shrink-0 text-success" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {excel_attachment.original_filename}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      {formatFileSize(excel_attachment.file_size_bytes)}
                      {excel_attachment.file_size_bytes ? ' · ' : ''}
                      <span className="rounded-full bg-[var(--color-bg-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)] ring-1 ring-inset ring-[var(--color-border)]">
                        view-only
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={`/documents/${doc.id}/attachments/${excel_attachment.id}/download`}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
                    >
                      <Download className="h-3.5 w-3.5" /> {t('documents.show.btn_download')}
                    </a>
                    {isAdmin && doc.status_code === 'draft' && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/30 text-danger transition-colors hover:bg-danger-surface"
                        title={t('documents.show.aria_hapus_lampiran')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {showDeleteConfirm && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-surface px-4 py-3">
                    <p className="text-xs text-danger">{t('documents.show.confirm_hapus_lampiran')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="h-7 rounded-md border border-[var(--color-border-strong)] px-3 text-xs font-medium hover:bg-[var(--color-bg-subtle)]"
                      >
                        {t('documents.show.btn_batal')}
                      </button>
                      <button
                        disabled={deletingAtt}
                        onClick={handleDeleteAttachment}
                        className="h-7 rounded-md bg-danger px-3 text-xs font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
                      >
                        {deletingAtt ? t('documents.show.deleting') : t('documents.show.btn_hapus')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 text-center shadow-xs">
              <Paperclip className="mx-auto mb-3 h-8 w-8 text-[var(--color-text-tertiary)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">{t('documents.show.no_attachment')}</p>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Audit Trail ── */}
        <TabsContent value="audit-trail">
          <AuditTrailTab logs={audit_logs} documentId={doc.id} />
        </TabsContent>
      </Tabs>

      {showReassign && (
        <ReassignModal
          documentId={doc.id}
          steps={doc.approval_steps}
          onClose={() => setShowReassign(false)}
        />
      )}
      {showSubmitConfirm && (
        <SubmitApprovalModal
          submitting={submittingApproval}
          onCancel={() => setShowSubmitConfirm(false)}
          onConfirm={handleSubmitApproval}
        />
      )}
    </AppShell>
  );
}
