import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import StatusBadge from '@/components/acceptra/StatusBadge';
import ExportExcelButton from '@/components/acceptra/ExportExcelButton';
import {
  FileText, CheckCircle2, AlertTriangle, Clock, Plus, Activity, FileClock, Users,
  ClipboardList, XCircle, BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  PageProps, AdminMetrics, ApprovalStatusCounts, ActiveDoc, OverdueDoc, ActivityEntry,
  ApprovalStageEntry, WeeklyTrendEntry, TopPartnerEntry,
} from '@/types';

interface Props {
  metrics: AdminMetrics;
  approval_status: ApprovalStatusCounts;
  active_documents: ActiveDoc[];
  overdue_approvals: OverdueDoc[];
  recent_activity: ActivityEntry[];
  approval_stage_breakdown: ApprovalStageEntry[];
  weekly_trend: WeeklyTrendEntry[];
  selected_month: number;
  selected_year: number;
  available_years: number[];
  top_partners: TopPartnerEntry[];
}

const STAGE_COLORS = ['#185FA5', '#55AA39', '#854F0B', '#A32D2D'];

// Kept in sync with the per-approver-step palette in Dashboard/Approver.tsx (`C`)
// so the same status category reads as the same color on both dashboards.
const APPROVAL_STATUS_COLORS = {
  pending:           '#6366f1',
  approved:          '#22c55e',
  punchlist_pending: '#f59e0b',
  rejected_pending:  '#ef4444',
  atp_done:          '#0ea5e9',
} as const;

export default function DashboardAdmin({
  metrics, approval_status, active_documents, overdue_approvals, recent_activity,
  approval_stage_breakdown, weekly_trend, selected_month, selected_year,
  available_years, top_partners,
}: Props) {
  const { auth } = usePage<PageProps>().props;
  const { t, i18n } = useTranslation();
  const isViewer = auth.user?.role === 'viewer';

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleDateString(i18n.language === 'id' ? 'id-ID' : 'en-US', { month: 'long' }),
  }));

  function handleTrendMonthChange(month: number) {
    router.get(window.location.pathname, { month, year: selected_year }, {
      only: ['weekly_trend', 'selected_month', 'selected_year'],
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  }

  function handleTrendYearChange(year: number) {
    router.get(window.location.pathname, { month: selected_month, year }, {
      only: ['weekly_trend', 'selected_month', 'selected_year'],
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  }

  const metricCards = [
    {
      label: t('approver_dashboard.stat_pending'),
      value: approval_status.pending,
      icon: <Clock className="h-5 w-5" />,
      href: '/documents?filter=active',
      highlight: false,
    },
    {
      label: t('approver_dashboard.stat_approved'),
      value: approval_status.approved,
      icon: <CheckCircle2 className="h-5 w-5" />,
      href: '/documents',
      highlight: false,
    },
    {
      label: t('approver_dashboard.stat_punchlist'),
      value: approval_status.punchlist_pending,
      icon: <ClipboardList className="h-5 w-5" />,
      href: '/documents?status=15',
      highlight: false,
    },
    {
      label: t('approver_dashboard.stat_rejected'),
      value: approval_status.rejected_pending,
      icon: <XCircle className="h-5 w-5" />,
      href: '/documents?filter=revision',
      highlight: false,
    },
    {
      label: t('approver_dashboard.stat_atp_done'),
      value: approval_status.atp_done,
      icon: <BadgeCheck className="h-5 w-5" />,
      href: '/documents?status=13',
      highlight: false,
    },
    {
      label: t('admin_dashboard.metric_draft'),
      value: metrics.draft,
      icon: <FileClock className="h-5 w-5" />,
      href: '/documents?status=draft',
      highlight: false,
    },
    {
      label: t('admin_dashboard.metric_overdue'),
      value: metrics.overdue_count,
      icon: <AlertTriangle className="h-5 w-5" />,
      href: '/documents?filter=overdue',
      highlight: true,
    },
  ];

  const statusDonutData = [
    { name: t('approver_dashboard.legend_pending'),   value: approval_status.pending,           color: APPROVAL_STATUS_COLORS.pending },
    { name: t('approver_dashboard.legend_approved'),  value: approval_status.approved,          color: APPROVAL_STATUS_COLORS.approved },
    { name: t('approver_dashboard.legend_punchlist'), value: approval_status.punchlist_pending, color: APPROVAL_STATUS_COLORS.punchlist_pending },
    { name: t('approver_dashboard.legend_rejected'),  value: approval_status.rejected_pending,  color: APPROVAL_STATUS_COLORS.rejected_pending },
    { name: t('approver_dashboard.legend_atp_done'),  value: approval_status.atp_done,          color: APPROVAL_STATUS_COLORS.atp_done },
  ].filter(d => d.value > 0);

  const totalDocs = statusDonutData.reduce((sum, d) => sum + d.value, 0);
  const stageData = approval_stage_breakdown.filter(d => d.count > 0);
  const maxPartnerTotal = Math.max(...top_partners.map(p => p.total), 1);

  const tableColumns = [
    t('admin_dashboard.col_unique_id'),
    t('admin_dashboard.col_project'),
    t('admin_dashboard.col_sow'),
    t('admin_dashboard.col_partner'),
    t('admin_dashboard.col_status'),
    t('admin_dashboard.col_submit'),
  ];

  return (
    <AppShell>
      <Head title={t('admin_dashboard.page_title')} />

      <PageHeader
        title={t('admin_dashboard.heading')}
        description={t('admin_dashboard.description')}
        action={
          !isViewer ? (
            <div className="flex flex-wrap items-center gap-2">
              <ExportExcelButton href="/documents/export" />
              <Link
                href="/documents/create"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-brand-ink text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <Plus className="h-4 w-4" />
                {t('admin_dashboard.btn_new_request')}
              </Link>
            </div>
          ) : undefined
        }
      />

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {metricCards.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className={cn(
              'flex flex-col gap-3 rounded-lg border p-4 transition-colors duration-[120ms]',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              m.highlight
                ? 'border-[var(--color-brand-surface)] bg-[var(--color-brand-surface)] hover:border-brand/40'
                : 'border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs hover:bg-[var(--color-bg-subtle)]',
            )}
          >
            <div className={cn('w-fit rounded-md p-2', m.highlight ? 'bg-white/60 text-brand-ink' : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]')}>
              {m.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{m.value}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{m.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Perlu Perhatian — overdue approvals */}
      {overdue_approvals.length > 0 && (
        <div className="mb-6 rounded-lg border border-[var(--color-brand-surface)] bg-[var(--color-brand-surface)] shadow-xs">
          <div className="flex items-center gap-2 border-b border-brand/20 px-5 py-3.5">
            <AlertTriangle className="h-4 w-4 text-brand-ink" />
            <h2 className="text-sm font-semibold text-brand-ink">
              {t('admin_dashboard.overdue_alert', { count: overdue_approvals.length })}
            </h2>
          </div>
          <div className="divide-y divide-brand/10">
            {overdue_approvals.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="font-mono text-xs font-semibold text-brand-ink hover:underline shrink-0"
                  >
                    {doc.uniqueId}
                  </Link>
                  <span className="truncate text-sm text-[var(--color-text-primary)]">{doc.project}</span>
                  {doc.partner && (
                    <span className="hidden text-xs text-[var(--color-text-secondary)] sm:inline shrink-0">{doc.partner}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge code={doc.statusCode} size="sm" />
                  <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                    {t('admin_dashboard.since')} {doc.waitingSince}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row: Donut + Bar monthly */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Donut — Status Distribution */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('admin_dashboard.chart_status_title')}
            </h2>
          </div>
          <div className="relative px-4 py-4">
            {totalDocs === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">
                {t('admin_dashboard.chart_status_empty')}
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusDonutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        t('admin_dashboard.chart_monthly_tooltip_value', { count: Number(value) || 0 }),
                        name ?? '',
                      ]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-[var(--color-text-primary)]">{totalDocs}</span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    {t('admin_dashboard.chart_status_total')}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {statusDonutData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[11px] text-[var(--color-text-secondary)]">{d.name}</span>
                      <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bar chart — Weekly trend within selected month */}
        <div className="lg:col-span-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('admin_dashboard.chart_monthly_title')}
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={selected_month}
                onChange={(e) => handleTrendMonthChange(Number(e.target.value))}
                className="h-8 rounded-sm border border-[var(--color-border-strong)] bg-white px-2 text-xs focus:border-brand focus:outline-none"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={selected_year}
                onChange={(e) => handleTrendYearChange(Number(e.target.value))}
                className="h-8 rounded-sm border border-[var(--color-border-strong)] bg-white px-2 text-xs focus:border-brand focus:outline-none"
              >
                {available_years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-4 py-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekly_trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: 'var(--color-text-secondary, #6b7280)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--color-text-secondary, #6b7280)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [
                    t('admin_dashboard.chart_monthly_tooltip_value', { count: Number(value) || 0 }),
                    t('admin_dashboard.chart_monthly_tooltip_label'),
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  cursor={{ fill: 'rgba(0,0,0,.04)' }}
                />
                <Bar dataKey="count" fill="#185FA5" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second chart row: Pie stages + Top Partners */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Pie — Approval stage breakdown */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('admin_dashboard.chart_stage_title')}
            </h2>
          </div>
          <div className="px-4 py-4">
            {stageData.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">
                {t('admin_dashboard.chart_stage_empty')}
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={stageData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="stage"
                      stroke="none"
                    >
                      {stageData.map((_, i) => (
                        <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        t('admin_dashboard.chart_stage_tooltip_value', { count: Number(value) || 0 }),
                        name ?? '',
                      ]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {stageData.map((d, i) => (
                    <div key={d.stage} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                      <span className="text-[11px] text-[var(--color-text-secondary)]">{d.stage}</span>
                      <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{d.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Partners */}
        <div className="lg:col-span-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3.5">
            <Users className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('admin_dashboard.top_partners_title')}
            </h2>
          </div>
          {top_partners.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t('admin_dashboard.top_partners_empty')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {top_partners.map((p, i) => (
                <div key={p.name} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-[var(--color-text-tertiary)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{p.name}</p>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-info transition-all"
                        style={{ width: `${Math.round((p.total / maxPartnerTotal) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {p.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content: Active docs + Activity feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active documents table */}
        <div className="lg:col-span-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('admin_dashboard.active_docs_title')}
            </h2>
            <Link href="/documents" className="text-xs text-ming hover:underline">
              {t('admin_dashboard.active_docs_see_all')}
            </Link>
          </div>

          {active_documents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-[var(--color-text-tertiary)]" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {t('admin_dashboard.active_docs_empty_title')}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                {t('admin_dashboard.active_docs_empty_body')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                    {tableColumns.map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {active_documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/documents/${doc.id}`} className="font-mono text-xs text-ming hover:underline">
                          {doc.uniqueId}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 max-w-[180px] truncate text-sm text-[var(--color-text-primary)]">{doc.project}</td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{doc.sow}</td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{doc.partner ?? '—'}</td>
                      <td className="px-5 py-3.5"><StatusBadge code={doc.statusCode} size="sm" /></td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[var(--color-text-secondary)]">{doc.submittedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent activity feed */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3.5">
            <Activity className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('admin_dashboard.activity_title')}
            </h2>
          </div>

          {recent_activity.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t('admin_dashboard.activity_empty')}
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-[var(--color-border)]">
              {recent_activity.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-xs text-[var(--color-text-primary)] leading-snug line-clamp-2">
                    {entry.description}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      {entry.actorName ?? t('admin_dashboard.activity_actor_system')}
                      {entry.documentUniqueId && (
                        <> · <span className="font-mono">{entry.documentUniqueId}</span></>
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--color-text-tertiary)] shrink-0">{entry.createdAt}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </AppShell>
  );
}
