import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import ApprovalLayout from '@/layouts/ApprovalLayout';
import StatusBadge from '@/components/acceptra/StatusBadge';
import ApprovalTimeline, { type ApprovalStep } from '@/components/acceptra/ApprovalTimeline';
import SignaturePad from '@/components/acceptra/SignaturePad';
import PdfViewer, { type PlacementPosition } from '@/components/acceptra/PdfViewer';
import { cn } from '@/lib/utils';
import type { ExcelAttachment } from '@/types';
import {
  Download, FileText, FileSpreadsheet, CheckCircle2, ClipboardList,
  XCircle, ArrowLeft, Users, AlertTriangle, Clock,
} from 'lucide-react';

type ActionType = 'approve' | 'punchlist' | 'reject';
type FlowStep   = 'pick-action' | 'signature' | 'done';

interface ApprovalDoc {
  id: string;
  uniqueId: string;
  project: string;
  sow: string;
  statusCode: string;
  requiresSignature: boolean;
}

interface PunchlistRevisionPdf {
  url: string;
  filename: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface VerificationEntry {
  approver_name: string;
  status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
}

interface MyStepDone {
  status: 'approved' | 'approved_with_punchlist' | 'rejected' | 'offline_approved';
  action_at: string | null;
  punchlist_notes: string | null;
  reject_reason: string | null;
}

interface Props {
  doc: ApprovalDoc;
  steps: ApprovalStep[];
  excel_attachment: ExcelAttachment | null;
  mode?: 'approve' | 'verify';
  can_act?: boolean;
  my_step_done?: MyStepDone | null;
  punchlist_revision_pdf?: PunchlistRevisionPdf | null;
  my_punchlist?: { notes: string; created_at: string } | null;
  all_verifications?: VerificationEntry[];
  user_signature_id?: string | null;
  user_signature_url?: string | null;
  pdf_url?: string | null;
  previous_pdf_url?: string | null;
  placements?: Record<string, PlacementPosition> | null;
}

export default function ApprovalScreen({
  doc,
  steps,
  excel_attachment,
  mode = 'approve',
  can_act = true,
  my_step_done,
  punchlist_revision_pdf,
  my_punchlist,
  all_verifications = [],
  user_signature_id,
  user_signature_url,
  pdf_url,
  previous_pdf_url,
  placements,
}: Props) {
  const [action,        setAction]        = useState<ActionType | null>(null);
  const [punchlistNote, setPunchlistNote] = useState('');
  const [rejectNote,    setRejectNote]    = useState('');
  const [verifyNote,    setVerifyNote]    = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [flowStep,      setFlowStep]      = useState<FlowStep>('pick-action');
  const [submitting,    setSubmitting]    = useState(false);

  const btnBase = cn(
    'flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold',
    'transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
    'disabled:opacity-50 disabled:pointer-events-none',
  );

  function submitApprove(signatureId?: string | null, signatureData?: string | null) {
    if (submitting) return;
    setSubmitting(true);
    router.post(`/documents/${doc.id}/approve`, {
      action:          action === 'punchlist' ? 'approve_with_punchlist' : 'approve',
      punchlist_notes: punchlistNote,
      signature_id:    signatureId ?? user_signature_id ?? null,
      signature_data:  signatureData ?? null,
    }, {
      onFinish: () => setSubmitting(false),
    });
  }

  function submitReject() {
    if (submitting || ! rejectNote.trim()) return;
    setSubmitting(true);
    router.post(`/documents/${doc.id}/reject`, {
      reject_reason: rejectNote,
    }, {
      onFinish: () => setSubmitting(false),
    });
  }

  function submitVerify(verifyAction: 'verify' | 'reject') {
    if (submitting) return;
    if (verifyAction === 'reject' && ! verifyNote.trim()) return;
    setSubmitting(true);
    router.post(`/documents/${doc.id}/verify`, {
      action: verifyAction,
      notes:  verifyNote,
    }, {
      onFinish: () => setSubmitting(false),
    });
  }

  function handleSignatureSave(dataUrl: string) {
    // If user chose their already-saved signature, pass the ID; otherwise send raw data so backend saves it
    if (user_signature_url && dataUrl === user_signature_url) {
      submitApprove(user_signature_id, null);
    } else {
      submitApprove(null, dataUrl);
    }
  }

  function reset() {
    setAction(null);
    setFlowStep('pick-action');
    setPunchlistNote('');
    setRejectNote('');
  }

  /* ── Verify Mode Panel ── */
  const verifyPanel = (
    <div className="flex h-full flex-col gap-5">
      {/* Doc info */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-snug text-[var(--color-text-primary)]">{doc.project}</h2>
          <StatusBadge code={doc.statusCode} size="sm" />
        </div>
        <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">{doc.uniqueId} · {doc.sow}</p>
      </div>

      {/* Approval timeline compact */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Alur Approval</p>
        <ApprovalTimeline steps={steps} />
      </div>

      {/* My punchlist notes */}
      {my_punchlist && (
        <div className="rounded-lg border border-warning/30 bg-warning-surface/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-warning" />
            <p className="text-xs font-semibold text-warning">Catatan Punchlist Anda</p>
          </div>
          <p className="text-sm text-[var(--color-text-primary)]">{my_punchlist.notes}</p>
        </div>
      )}

      {/* All verifications status */}
      {all_verifications.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Status Verifikasi</p>
          <div className="space-y-2">
            {all_verifications.map((v, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                  <span className="text-[var(--color-text-primary)]">{v.approver_name}</span>
                </div>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  v.status === 'verified'
                    ? 'bg-success-surface text-success'
                    : v.status === 'rejected'
                    ? 'bg-danger-surface text-danger'
                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-tertiary)] ring-1 ring-inset ring-[var(--color-border)]',
                )}>
                  {v.status === 'verified' ? 'Verified' : v.status === 'rejected' ? 'Rejected' : 'Pending'}
                  {v.verified_at ? ` · ${v.verified_at}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verify actions */}
      <div className="flex flex-col gap-3 pt-1">
        <button
          disabled={submitting}
          onClick={() => submitVerify('verify')}
          className={cn(btnBase, 'bg-brand-ink text-white hover:bg-brand-hover')}
        >
          <CheckCircle2 className="h-4 w-4" />
          {submitting ? 'Memproses…' : 'Verify / Accept Revision'}
        </button>

        <button
          disabled={submitting}
          onClick={() => setShowRejectModal(true)}
          className={cn(btnBase, 'border border-danger/30 text-danger hover:bg-danger-surface')}
        >
          <XCircle className="h-4 w-4" /> Reject Revision
        </button>
      </div>

      {/* Reject revision modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgba(17,24,39,.45)]" onClick={() => setShowRejectModal(false)} />
          <div className="relative z-[410] w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-lg">
            <div className="mb-1 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              <h3 className="font-semibold text-[var(--color-text-primary)]">Tolak Revisi</h3>
            </div>
            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
              Dokumen akan dikembalikan ke status 14. Admin perlu mengupload ulang PDF revisi.
            </p>
            <label className="mb-1.5 block text-xs font-medium text-danger">
              Alasan Penolakan <span>*</span>
            </label>
            <textarea
              rows={3}
              value={verifyNote}
              onChange={(e) => setVerifyNote(e.target.value)}
              placeholder="Tuliskan alasan penolakan revisi…"
              className="w-full resize-none rounded-sm border border-danger/40 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="h-9 rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium hover:bg-[var(--color-bg-subtle)]"
              >
                Batal
              </button>
              <button
                disabled={! verifyNote.trim() || submitting}
                onClick={() => { setShowRejectModal(false); submitVerify('reject'); }}
                className="h-9 rounded-md bg-danger px-4 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ── Approve Mode Panel ── */
  const approvePanel = (
    <div className="flex h-full flex-col gap-5">
      {/* Doc info */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-snug text-[var(--color-text-primary)]">{doc.project}</h2>
          <StatusBadge code={doc.statusCode} size="sm" />
        </div>
        <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">{doc.uniqueId} · {doc.sow}</p>
      </div>

      {/* Approval timeline compact */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Alur Approval</p>
        <ApprovalTimeline steps={steps} />
      </div>

      {/* Flow states */}
      {flowStep === 'done' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-surface">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">
              {action === 'approve' ? 'Dokumen Disetujui!' : action === 'punchlist' ? 'Disetujui dengan Punchlist!' : 'Dokumen Ditolak'}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {action === 'approve'
                ? 'Dokumen diteruskan ke level berikutnya.'
                : action === 'punchlist'
                ? 'Punchlist dicatat. Dokumen berlanjut ke level berikutnya.'
                : 'Admin Aviat dinotifikasi untuk melakukan revisi.'}
            </p>
          </div>
          <Link
            href="/approvals"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border-strong)] text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Need Approval
          </Link>
        </div>
      ) : flowStep === 'signature' ? (
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Tanda Tangan</p>
            <button onClick={reset} className="text-xs text-[var(--color-text-secondary)] hover:text-ming">← Batal</button>
          </div>
          <SignaturePad onSave={handleSignatureSave} savedSignature={user_signature_url ?? null} />
        </div>
      ) : (
        /* pick-action */
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Tindakan Anda</p>

          <button
            disabled={submitting}
            onClick={() => {
              setAction('approve');
              if (doc.requiresSignature) {
                setFlowStep('signature');
              } else {
                setSubmitting(true);
                router.post(`/documents/${doc.id}/approve`, {
                  action:       'approve',
                  signature_id: user_signature_id ?? null,
                }, { onFinish: () => setSubmitting(false) });
              }
            }}
            className={cn(btnBase, 'bg-brand-ink text-white hover:bg-brand-hover')}
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting && action === 'approve' ? 'Memproses…' : 'Approve'}
          </button>

          <button
            disabled={submitting}
            onClick={() => setAction(action === 'punchlist' ? null : 'punchlist')}
            className={cn(
              btnBase,
              'border border-warning/40 bg-warning-surface text-warning hover:bg-warning/10',
              action === 'punchlist' && 'ring-2 ring-warning/30',
            )}
          >
            <ClipboardList className="h-4 w-4" /> Approve with Punchlist
          </button>

          <button
            disabled={submitting}
            onClick={() => setAction(action === 'reject' ? null : 'reject')}
            className={cn(
              btnBase,
              'border border-danger/30 text-danger hover:bg-danger-surface',
              action === 'reject' && 'ring-2 ring-danger/30',
            )}
          >
            <XCircle className="h-4 w-4" /> Reject
          </button>

          {action === 'punchlist' && (
            <div className="rounded-lg border border-warning/30 bg-warning-surface/60 p-4">
              <label className="mb-1.5 block text-xs font-medium text-warning">
                Catatan Punchlist <span className="text-danger">*</span>
              </label>
              <textarea
                rows={3}
                value={punchlistNote}
                onChange={(e) => setPunchlistNote(e.target.value)}
                placeholder="Tuliskan temuan / catatan perbaikan…"
                className="w-full resize-none rounded-sm border border-warning/40 bg-white px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
              />
              <button
                disabled={! punchlistNote.trim() || submitting}
                onClick={() => {
                  if (doc.requiresSignature) {
                    setFlowStep('signature');
                  } else {
                    submitApprove();
                  }
                }}
                className="mt-3 h-9 w-full rounded-md bg-brand-ink text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50"
              >
                {doc.requiresSignature ? 'Lanjut → Tanda Tangan' : submitting ? 'Memproses…' : 'Konfirmasi Punchlist'}
              </button>
            </div>
          )}

          {action === 'reject' && (
            <div className="rounded-lg border border-danger/30 bg-danger-surface/60 p-4">
              <label className="mb-1.5 block text-xs font-medium text-danger">
                Alasan Reject <span className="text-danger">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Tuliskan alasan penolakan…"
                className="w-full resize-none rounded-sm border border-danger/40 bg-white px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
              />
              <button
                disabled={! rejectNote.trim() || submitting}
                onClick={submitReject}
                className="mt-3 h-9 w-full rounded-md bg-danger text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {submitting ? 'Memproses…' : 'Konfirmasi Reject'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ── Already Acted Panel (read-only) ── */
  const alreadyActedPanel = my_step_done ? (
    <div className="flex h-full flex-col gap-5">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-snug text-[var(--color-text-primary)]">{doc.project}</h2>
          <StatusBadge code={doc.statusCode} size="sm" />
        </div>
        <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">{doc.uniqueId} · {doc.sow}</p>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Alur Approval</p>
        <ApprovalTimeline steps={steps} />
      </div>

      <div className={cn(
        'rounded-lg border p-4',
        my_step_done.status === 'rejected'
          ? 'border-danger/30 bg-danger-surface/60'
          : 'border-success/30 bg-success-surface/60',
      )}>
        <div className="mb-2 flex items-center gap-2">
          {my_step_done.status === 'rejected'
            ? <XCircle className="h-4 w-4 text-danger" />
            : <CheckCircle2 className="h-4 w-4 text-success" />}
          <p className={cn('text-sm font-semibold', my_step_done.status === 'rejected' ? 'text-danger' : 'text-success')}>
            {my_step_done.status === 'approved' && 'Anda telah menyetujui dokumen ini'}
            {my_step_done.status === 'approved_with_punchlist' && 'Anda menyetujui dengan Punchlist'}
            {my_step_done.status === 'offline_approved' && 'Anda menyetujui secara offline'}
            {my_step_done.status === 'rejected' && 'Anda telah menolak dokumen ini'}
          </p>
        </div>
        {my_step_done.action_at && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <Clock className="h-3.5 w-3.5" />
            {my_step_done.action_at}
          </p>
        )}
        {my_step_done.punchlist_notes && (
          <div className="mt-3 rounded border border-warning/30 bg-warning-surface/40 p-3">
            <p className="mb-1 text-xs font-semibold text-warning">Catatan Punchlist</p>
            <p className="text-sm text-[var(--color-text-primary)]">{my_step_done.punchlist_notes}</p>
          </div>
        )}
        {my_step_done.reject_reason && (
          <div className="mt-3 rounded border border-danger/20 bg-white/60 p-3">
            <p className="mb-1 text-xs font-semibold text-danger">Alasan Penolakan</p>
            <p className="text-sm text-[var(--color-text-primary)]">{my_step_done.reject_reason}</p>
          </div>
        )}
      </div>

      <Link
        href="/approvals"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border-strong)] text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Need Approval
      </Link>
    </div>
  ) : null;

  /* ── PDF Preview ── */
  const revisionPdfMeta = punchlist_revision_pdf ? (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2">
      <FileText className="h-5 w-5 shrink-0 text-brand-ink" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
          {punchlist_revision_pdf.filename}
        </p>
        <p className="text-[11px] text-[var(--color-text-secondary)]">
          Diupload {punchlist_revision_pdf.uploaded_at} oleh {punchlist_revision_pdf.uploaded_by}
        </p>
      </div>
    </div>
  ) : null;

  const isVerifyingWithRevision = mode === 'verify' && !!punchlist_revision_pdf;

  const preview = (
    <div className="flex h-full flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">{doc.uniqueId}</span>
        <StatusBadge code={doc.statusCode} size="sm" className="ml-auto" />
        {!isVerifyingWithRevision && pdf_url && (
          <a
            href={pdf_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-ming hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </a>
        )}
      </div>

      {isVerifyingWithRevision ? (
        // Verify mode: same dual side-by-side layout as the reject-flow's L1 gate below —
        // the pre-revision PDF on the left, the punchlist revision on the right.
        <div className={cn('grid flex-1 gap-4', previous_pdf_url ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1')}>
          {previous_pdf_url && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-md bg-[var(--color-bg-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                <FileText className="h-3.5 w-3.5" /> PDF Utama (Sebelum Revisi)
              </div>
              <PdfViewer url={previous_pdf_url} placements={null} className="flex-1" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-md bg-success-surface/60 px-3 py-1.5 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> PDF Revisi Punchlist
            </div>
            {revisionPdfMeta}
            <PdfViewer url={punchlist_revision_pdf!.url} placements={null} className="flex-1" />
          </div>
        </div>
      ) : (
        // PDF Viewer — dual view saat ada PDF yang direject sebelumnya di level ini
        <div className={cn('grid flex-1 gap-4', previous_pdf_url ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1')}>
          {previous_pdf_url && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-md bg-danger-surface/60 px-3 py-1.5 text-xs font-semibold text-danger">
                <XCircle className="h-3.5 w-3.5" /> PDF Sebelumnya (Ditolak)
              </div>
              <PdfViewer url={previous_pdf_url} placements={null} className="flex-1" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            {previous_pdf_url && (
              <div className="flex items-center gap-2 rounded-md bg-success-surface/60 px-3 py-1.5 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> PDF Revisi Terbaru
              </div>
            )}
            <PdfViewer url={pdf_url ?? null} placements={placements} className="flex-1" />
          </div>
        </div>
      )}

      {/* Excel Attachment panel */}
      {excel_attachment && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
          <FileSpreadsheet className="h-8 w-8 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {excel_attachment.original_filename}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Lampiran Excel ·{' '}
              <span className="rounded-full bg-[var(--color-bg-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)] ring-1 ring-inset ring-[var(--color-border)]">
                view-only
              </span>
            </p>
          </div>
          <a
            href={`/documents/${doc.id}/attachments/${excel_attachment.id}/download`}
            className="flex shrink-0 h-8 items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        </div>
      )}
    </div>
  );

  const activePanel = mode === 'verify'
    ? verifyPanel
    : (! can_act && my_step_done)
      ? alreadyActedPanel
      : approvePanel;

  return (
    <>
      <Head title={`${mode === 'verify' ? 'Verify Punchlist' : 'Approval'} – ${doc.uniqueId}`} />
      <ApprovalLayout
        documentId={doc.id}
        preview={preview}
        panel={activePanel}
        backHref="/approvals"
      />
    </>
  );
}
