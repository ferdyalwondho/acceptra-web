import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import { Upload, FileText, CheckCircle2, Clock, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PartnerSummary, PartnerDoc, WeeklyTrendEntry } from '@/types';

interface Props {
  summary: PartnerSummary;
  documents: PartnerDoc[];
  weekly_trend: WeeklyTrendEntry[];
  selected_month: number;
  selected_year: number;
  available_years: number[];
}

const STATUS_COLORS = {
  draft:     '#94a3b8',
  active:    '#185FA5',
  completed: '#3B6D11',
} as const;

export default function DashboardPartner({
  summary, documents, weekly_trend, selected_month, selected_year, available_years,
}: Props) {
  const { t, i18n } = useTranslation();

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

  const summaryCards = [
    { label: t('partner_dashboard.card_total'),     value: summary.total,     icon: <Layers className="h-4 w-4" />,       href: '/documents?scope=mine' },
    { label: t('partner_dashboard.card_draft'),     value: summary.draft,     icon: <Clock className="h-4 w-4" />,        href: '/documents?scope=mine&status=draft' },
    { label: t('partner_dashboard.card_active'),    value: summary.active,    icon: <FileText className="h-4 w-4" />,     href: '/documents?scope=mine&filter=active' },
    { label: t('partner_dashboard.card_completed'), value: summary.completed, icon: <CheckCircle2 className="h-4 w-4" />, href: '/documents?scope=mine&status=done' },
  ];

  const statusDonutData = [
    { name: t('partner_dashboard.card_draft'),     value: summary.draft,     color: STATUS_COLORS.draft },
    { name: t('partner_dashboard.card_active'),    value: summary.active,    color: STATUS_COLORS.active },
    { name: t('partner_dashboard.card_completed'), value: summary.completed, color: STATUS_COLORS.completed },
  ].filter(d => d.value > 0);

  const totalDocs = statusDonutData.reduce((sum, d) => sum + d.value, 0);

  return (
    <AppShell>
      <Head title={t('partner_dashboard.page_title')} />

      <PageHeader
        title="Dashboard"
        description={t('partner_dashboard.description')}
        action={
          <Link
            href="/documents/create"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-brand-ink text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <Upload className="h-4 w-4" />
            {t('partner_dashboard.btn_submit')}
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={cn(
              'flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-xs',
              'transition-colors duration-[120ms] hover:bg-[var(--color-bg-subtle)]',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
            )}
          >
            <div className="w-fit rounded-md bg-[var(--color-bg-subtle)] p-2 text-[var(--color-text-secondary)]">
              {c.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{c.value}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Donut — Status Distribution */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('partner_dashboard.chart_status_title')}
            </h2>
          </div>
          <div className="relative px-4 py-4">
            {totalDocs === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">
                {t('partner_dashboard.chart_no_data')}
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
                        t('partner_dashboard.chart_tooltip_value', { count: Number(value) || 0 }),
                        name ?? '',
                      ]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-[var(--color-text-primary)]">{totalDocs}</span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Total</span>
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

        {/* Bar chart — Weekly submission trend within selected month */}
        <div className="lg:col-span-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('partner_dashboard.chart_monthly_title')}
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
                    t('partner_dashboard.chart_tooltip_value', { count: Number(value) || 0 }),
                    t('partner_dashboard.chart_tooltip_label'),
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

      {/* Document list */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t('partner_dashboard.my_documents')}
          </h2>
          <Link href="/documents?scope=mine" className="text-xs text-ming hover:underline">
            {t('partner_dashboard.see_all')}
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-[var(--color-text-tertiary)]" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('partner_dashboard.empty_title')}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              {t('partner_dashboard.empty_body')}
            </p>
            <Link
              href="/documents/create"
              className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-brand-ink text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <Upload className="h-4 w-4" />
              {t('partner_dashboard.btn_submit')}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[var(--color-bg-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-ming shrink-0">{doc.uniqueId}</span>
                    <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">{doc.project}</span>
                  </div>
                  <span className="inline-flex items-center rounded-sm bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                    {doc.sow}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    doc.statusCode === 'draft'
                      ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                      : doc.statusCode === '02'
                        ? 'bg-danger-surface text-danger'
                        : ['13', '16'].includes(doc.statusCode)
                          ? 'bg-success-surface text-success'
                          : 'bg-info-surface text-info',
                  )}>
                    {doc.statusLabelPartner}
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-[var(--color-text-secondary)]">{doc.submittedAt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
