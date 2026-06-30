import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import StatusBadge from '@/components/acceptra/StatusBadge';
import { Download, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryItem {
  id: string;
  uniqueId: string;
  project: string;
  sow: string;
  statusCode: string;
  myAction: string;
  myDate: string;
}

interface Props {
  items?: HistoryItem[];
}

export default function ApprovalsHistory({ items = [] }: Props) {
  const { t } = useTranslation();

  const actionColor: Record<string, string> = {
    [t('approvals.action_approved')]:  'text-success',
    [t('approvals.action_punchlist')]: 'text-warning',
    [t('approvals.action_rejected')]:  'text-danger',
  };

  return (
    <AppShell>
      <Head title={t('approvals.history_page_title')} />

      <PageHeader title={t('approvals.history_heading')} description={t('approvals.history_description')} />

      {/* Filter toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 shadow-xs">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="search"
            placeholder={t('approvals.history_search_placeholder')}
            className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white pl-9 pr-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
          />
        </div>
        <select className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm text-[var(--color-text-secondary)] focus:border-brand focus:outline-none">
          <option>{t('approvals.history_filter_all')}</option>
          <option>{t('approvals.history_filter_approved')}</option>
          <option>{t('approvals.history_filter_punchlist')}</option>
          <option>{t('approvals.history_filter_rejected')}</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-5 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('approvals.history_empty_title')}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{t('approvals.history_empty_body')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                  {[
                    t('approvals.history_col_uid'),
                    t('approvals.history_col_project'),
                    t('approvals.history_col_sow'),
                    t('approvals.history_col_my_action'),
                    t('approvals.history_col_status'),
                    t('approvals.history_col_date'),
                    '',
                  ].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                    <td className="px-5 py-3.5">
                      <Link href={`/documents/${item.id}`} className="font-mono text-xs text-ming hover:underline">{item.uniqueId}</Link>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{item.project}</td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{item.sow}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-xs font-semibold', actionColor[item.myAction] ?? 'text-[var(--color-text-secondary)]')}>
                        {item.myAction}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge code={item.statusCode} size="sm" /></td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[var(--color-text-secondary)]">{item.myDate}</td>
                    <td className="px-5 py-3.5">
                      {['10', '13'].includes(item.statusCode) && (
                        <a href={`/documents/${item.id}/pdf`} className="flex items-center gap-1 text-xs font-medium text-ming hover:underline">
                          <Download className="h-3.5 w-3.5" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/documents/${item.id}`}
                className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 transition-colors duration-[120ms] hover:bg-[var(--color-bg-subtle)] shadow-xs"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-[var(--color-text-secondary)]">{item.uniqueId}</span>
                  <StatusBadge code={item.statusCode} size="sm" />
                </div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.project}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span className={cn(actionColor[item.myAction] ?? '')}>{item.myAction}</span>
                  <span className="font-mono">{item.myDate}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
