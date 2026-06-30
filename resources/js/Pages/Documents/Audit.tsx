import { Head, Link } from '@inertiajs/react';
import AppShell from '@/layouts/AppShell';
import StatusBadge from '@/components/acceptra/StatusBadge';
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Inbox, Upload, Users, FileText, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOCK_DOC = { id: '1', linkId: 'ATP-XL-2406-0093', project: 'Microwave Link – Bekasi Sektor 4', statusCode: '04' };

type EventType = 'submit' | 'approve' | 'reject' | 'revise' | 'reassign' | 'generate' | 'draft';

interface AuditEvent {
  id: string;
  type: EventType;
  event: string;
  actor: string;
  role: string;
  time: string;
  note?: string;
}

const MOCK_AUDIT: AuditEvent[] = [
  { id: '5', type: 'approve',  event: 'L2 Approved',      actor: 'Budi Santoso',  role: 'MS RTS',   time: '19 Jun 2026 · 14:32', note: '' },
  { id: '4', type: 'revise',   event: 'PDF Revised',       actor: 'Admin Aviat',   role: 'Admin',    time: '19 Jun 2026 · 12:10', note: 'Re-submitted after L2 review' },
  { id: '3', type: 'reject',   event: 'L2 Rejected',       actor: 'Budi Santoso',  role: 'MS RTS',   time: '19 Jun 2026 · 11:05', note: 'Lampiran foto site tidak sesuai koordinat.' },
  { id: '2', type: 'submit',   event: 'Submitted',          actor: 'Admin Aviat',   role: 'Admin',    time: '19 Jun 2026 · 09:15', note: 'Initial submission' },
  { id: '1', type: 'draft',    event: 'Draft created',      actor: 'Admin Aviat',   role: 'Admin',    time: '18 Jun 2026 · 17:50', note: '' },
];

const EVENT_META: Record<EventType, { icon: React.ReactNode; color: string; bg: string }> = {
  submit:   { icon: <Inbox className="h-3.5 w-3.5" />,       color: 'text-info',        bg: 'bg-info-surface ring-info/30' },
  approve:  { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-success',     bg: 'bg-success-surface ring-success/30' },
  reject:   { icon: <XCircle className="h-3.5 w-3.5" />,     color: 'text-danger',      bg: 'bg-danger-surface ring-danger/30' },
  revise:   { icon: <RotateCcw className="h-3.5 w-3.5" />,   color: 'text-warning',     bg: 'bg-warning-surface ring-warning/30' },
  reassign: { icon: <Users className="h-3.5 w-3.5" />,       color: 'text-ming',        bg: 'bg-info-surface ring-ming/30' },
  generate: { icon: <FileText className="h-3.5 w-3.5" />,    color: 'text-success',     bg: 'bg-success-surface ring-success/30' },
  draft:    { icon: <Lock className="h-3.5 w-3.5" />,        color: 'text-[var(--color-text-tertiary)]', bg: 'bg-muted ring-[var(--color-border)]' },
};

export default function DocumentAudit() {
  const doc = MOCK_DOC;

  return (
    <AppShell>
      <Head title={`Audit Trail – ${doc.linkId}`} />

      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href={`/documents/${doc.id}`} className="flex items-center gap-1 hover:text-ming transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> {doc.linkId}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">Audit Trail</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Audit Trail</h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{doc.project}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[var(--color-text-secondary)]">{doc.linkId}</span>
          <StatusBadge code={doc.statusCode} size="sm" />
        </div>
      </div>

      <div className="max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            {MOCK_AUDIT.length} kejadian tercatat
          </p>
          <p className="text-[11px] text-[var(--color-text-tertiary)] font-mono">append-only · tidak dapat diubah</p>
        </div>

        <ol className="relative space-y-6 pl-8 before:absolute before:left-[11px] before:top-0 before:h-full before:w-0.5 before:bg-[var(--color-border)]">
          {MOCK_AUDIT.map((a, i) => {
            const meta = EVENT_META[a.type];
            return (
              <li key={a.id} className="relative">
                {/* marker */}
                <span className={cn(
                  'absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full ring-2',
                  meta.bg, meta.color,
                )}>
                  {meta.icon}
                </span>

                <div className={cn('rounded-lg border p-4', i === 0 ? 'border-brand/20 bg-brand-surface/30' : 'border-[var(--color-border)] bg-white')}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className={cn('font-semibold text-sm', meta.color)}>{a.event}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {a.actor} · <span className="font-medium">{a.role}</span>
                      </p>
                    </div>
                    <p className="font-mono text-[11px] text-[var(--color-text-tertiary)] flex-shrink-0">{a.time}</p>
                  </div>
                  {a.note && (
                    <p className="mt-2 rounded-md bg-[var(--color-bg-subtle)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                      {a.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-lg bg-[var(--color-bg-subtle)] px-4 py-3 text-center text-xs text-[var(--color-text-tertiary)]">
          ─ Awal riwayat dokumen ─
        </div>
      </div>
    </AppShell>
  );
}
