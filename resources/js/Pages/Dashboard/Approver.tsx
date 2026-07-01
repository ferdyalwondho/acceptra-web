import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import StatusBadge from '@/components/acceptra/StatusBadge';
import {
  CheckCircle2, XCircle, ClipboardList, Clock, History,
  ArrowRight, BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NeedApprovalDoc, ApproverHistoryEntry } from '@/types';

interface Stats {
  pending:           number;
  approved:          number;
  punchlist_pending: number;
  rejected_pending:  number;
  atp_done:          number;
}

interface Props {
  need_approval:       NeedApprovalDoc[];
  need_approval_count: number;
  recent_history:      ApproverHistoryEntry[];
  stats:               Stats;
}

/* ── Color palette (hex — reliable in both SVG and CSS) ──────────────────── */
const C = {
  pending:  '#6366f1',
  approved: '#22c55e',
  punchlist:'#f59e0b',
  rejected: '#ef4444',
  atpDone:  '#0ea5e9',
};

/* ── SVG Donut Chart ─────────────────────────────────────────────────────── */
interface Segment { value: number; color: string; label: string }

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const gap = 2;
  const s = startDeg + gap / 2;
  const e = endDeg   - gap / 2;
  if (e - s <= 0) return '';
  const o1 = polarToCartesian(cx, cy, outerR, s);
  const o2 = polarToCartesian(cx, cy, outerR, e);
  const i1 = polarToCartesian(cx, cy, innerR, e);
  const i2 = polarToCartesian(cx, cy, innerR, s);
  const large = e - s > 180 ? 1 : 0;
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y} Z`;
}

function DonutChart({ segments, noDataLabel }: { segments: Segment[]; noDataLabel?: string }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  const cx = 90, cy = 90, outerR = 78, innerR = 52;

  if (total === 0) {
    return (
      <svg viewBox="0 0 180 180" className="h-full w-full">
        <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none"
          stroke="#e5e7eb" strokeWidth={outerR - innerR} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#9ca3af" fontSize={11}>{noDataLabel ?? '—'}</text>
      </svg>
    );
  }

  let currentAngle = 0;
  const arcs = segments
    .filter(s => s.value > 0)
    .map(s => {
      const sweep = (s.value / total) * 360;
      const start = currentAngle;
      currentAngle += sweep;
      return { ...s, start, end: currentAngle };
    });

  return (
    <svg viewBox="0 0 180 180" className="h-full w-full">
      {arcs.map((arc, i) => {
        const d = arcPath(cx, cy, outerR, innerR, arc.start, arc.end);
        return d ? <path key={i} d={d} fill={arc.color} /> : null;
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={22} fontWeight={700} fill="#111827">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="#6b7280">
        Total
      </text>
    </svg>
  );
}

/* ── Stat Card ───────────────────────────────────────────────────────────── */
function StatCard({
  label, value, icon, hex,
}: {
  label: string; value: number; icon: React.ReactNode; hex: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-xs">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${hex}18` }}>
        <span style={{ color: hex }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">{value}</p>
        <p className="truncate text-xs text-[var(--color-text-secondary)]">{label}</p>
      </div>
    </div>
  );
}

/* ── History badge ───────────────────────────────────────────────────────── */
const HISTORY_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  approved:                { label: 'Approved',     icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'text-success'  },
  approved_with_punchlist: { label: 'w/ Punchlist', icon: <ClipboardList className="h-3.5 w-3.5" />, cls: 'text-warning' },
  rejected:                { label: 'Rejected',      icon: <XCircle className="h-3.5 w-3.5" />,       cls: 'text-danger'  },
  offline_approved:        { label: 'Approved',     icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'text-success'  },
};

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function DashboardApprover({ need_approval, need_approval_count, recent_history, stats }: Props) {
  const { t } = useTranslation();

  const donutSegments: Segment[] = [
    { value: stats.pending,          color: C.pending,  label: t('approver_dashboard.legend_pending')  },
    { value: stats.approved,         color: C.approved, label: t('approver_dashboard.legend_approved') },
    { value: stats.punchlist_pending,color: C.punchlist,label: t('approver_dashboard.legend_punchlist')},
    { value: stats.rejected_pending, color: C.rejected, label: t('approver_dashboard.legend_rejected') },
  ];

  const historyMeta: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    approved:                { label: t('approver_dashboard.action_approved'), icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'text-success'  },
    approved_with_punchlist: { label: t('approver_dashboard.action_punchlist'),icon: <ClipboardList className="h-3.5 w-3.5" />, cls: 'text-warning' },
    rejected:                { label: t('approver_dashboard.action_rejected'), icon: <XCircle className="h-3.5 w-3.5" />,       cls: 'text-danger'  },
    offline_approved:        { label: t('approver_dashboard.action_approved'), icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'text-success'  },
  };

  return (
    <AppShell>
      <Head title={t('approver_dashboard.page_title')} />

      <PageHeader
        title={t('approver_dashboard.heading')}
        description={t('approver_dashboard.description')}
        action={
          <Link
            href="/approvals/history"
            className="flex items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            <History className="h-4 w-4" /> {t('approver_dashboard.btn_history')}
          </Link>
        }
      />

      {/* ── 5 Stat Cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label={t('approver_dashboard.stat_pending')}   value={stats.pending}           icon={<Clock className="h-5 w-5" />}         hex={C.pending}  />
        <StatCard label={t('approver_dashboard.stat_approved')}  value={stats.approved}          icon={<CheckCircle2 className="h-5 w-5" />}  hex={C.approved} />
        <StatCard label={t('approver_dashboard.stat_punchlist')} value={stats.punchlist_pending} icon={<ClipboardList className="h-5 w-5" />} hex={C.punchlist}/>
        <StatCard label={t('approver_dashboard.stat_rejected')}  value={stats.rejected_pending}  icon={<XCircle className="h-5 w-5" />}       hex={C.rejected} />
        <StatCard label={t('approver_dashboard.stat_atp_done')}  value={stats.atp_done}          icon={<BadgeCheck className="h-5 w-5" />}    hex={C.atpDone}  />
      </div>

      {/* ── Chart + Need Approval ── */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[220px_1fr]">

        {/* Donut chart */}
        <div className="flex flex-col items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-xs">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            {t('approver_dashboard.chart_title')}
          </p>
          <div className="h-[160px] w-[160px]">
            <DonutChart segments={donutSegments} noDataLabel={t('approver_dashboard.chart_no_data')} />
          </div>
          <div className="mt-4 w-full space-y-2">
            {donutSegments.map((seg) => (
              <div key={seg.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-[var(--color-text-secondary)]">{seg.label}</span>
                </div>
                <span className="font-semibold tabular-nums" style={{ color: seg.color }}>{seg.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Need approval list */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs overflow-hidden">
          <div className="flex items-center border-b border-[var(--color-border)] px-5 py-3.5">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('approver_dashboard.need_action_title')}
              {need_approval_count > 0 && (
                <span className="ml-2 rounded-full bg-brand-ink px-2 py-0.5 text-[11px] font-bold text-white">
                  {need_approval_count}
                </span>
              )}
            </p>
            <Link href="/approvals" className="ml-auto flex items-center gap-1 text-xs font-medium text-ming hover:underline">
              {t('approver_dashboard.need_action_see_all')} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {need_approval.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <CheckCircle2 className="mb-3 h-10 w-10 text-success opacity-60" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('approver_dashboard.need_action_empty_title')}</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t('approver_dashboard.need_action_empty_body')}</p>
            </div>
          ) : (
            <ol className="divide-y divide-[var(--color-border)]">
              {need_approval.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/documents/${doc.id}/approval`}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3.5',
                      'transition-colors hover:bg-[var(--color-bg-subtle)]',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="font-mono text-xs text-[var(--color-text-secondary)]">{doc.uniqueId}</span>
                        <StatusBadge code={doc.statusCode} size="sm" />
                      </div>
                      <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{doc.project}</p>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
                        <span className="font-semibold text-brand-ink">
                          {doc.kind === 'punchlist'
                            ? t('approver_dashboard.step_punchlist_verify', { level: doc.levelOrder })
                            : t('approver_dashboard.step_your_turn', { level: doc.levelOrder })}
                        </span>
                        {doc.waitingSince && <> · {t('approver_dashboard.since')} {doc.waitingSince}</>}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ── Recent History ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3.5">
          <History className="h-4 w-4 text-[var(--color-text-secondary)]" />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t('approver_dashboard.history_title')}</p>
          <Link href="/approvals/history" className="ml-auto flex items-center gap-1 text-xs font-medium text-ming hover:underline">
            {t('approver_dashboard.history_see_all')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recent_history.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">{t('approver_dashboard.history_empty')}</p>
          </div>
        ) : (
          <ol className="divide-y divide-[var(--color-border)]">
            {recent_history.map((entry) => {
              const meta = historyMeta[entry.status] ?? { label: entry.status, icon: null, cls: 'text-[var(--color-text-secondary)]' };
              return (
                <li key={`${entry.documentId}-${entry.actionAt}`} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-ming">{entry.uniqueId}</span>
                    <p className="truncate text-sm text-[var(--color-text-primary)]">{entry.sowName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('flex items-center gap-1 text-xs font-semibold', meta.cls)}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">{entry.actionAt}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
