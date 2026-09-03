import { useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import DocumentCard, { type DocumentCardData } from '@/components/acceptra/DocumentCard';
import { Inbox, History, Search, X, AlarmClock, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaginatedResponse } from '@/types';

interface Props {
  approvals: PaginatedResponse<DocumentCardData>;
  filters: {
    search: string | null;
    status_code: string | null;
    partner_id: string | null;
    filter: string | null;
    sort: 'newest' | 'oldest';
  };
  partners: { id: string; name: string }[];
  status_options: { value: string; label: string }[];
  urgent_count: number;
}

export default function ApprovalsIndex({ approvals, filters, partners, status_options, urgent_count }: Props) {
  const { t } = useTranslation();

  const [search, setSearch]         = useState(filters.search ?? '');
  const [statusCode, setStatus]     = useState(filters.status_code ?? '');
  const [partnerId, setPartner]     = useState(filters.partner_id ?? '');

  const urgentOnly = filters.filter === 'overdue';
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  function buildParams(overrides: Record<string, string> = {}): Record<string, string> {
    const base: Record<string, string> = {};
    if (search)     base.search      = search;
    if (statusCode) base.status_code = statusCode;
    if (partnerId)  base.partner_id  = partnerId;
    if (urgentOnly) base.filter      = 'overdue';
    if (filters.sort === 'oldest') base.sort = 'oldest';

    // A filter change always lands on page 1 — page numbers from the previous, wider
    // result set point at nothing once the list shrinks.
    return Object.fromEntries(
      Object.entries({ ...base, ...overrides }).filter(([, v]) => v !== ''),
    );
  }

  function applyFilters(params: Record<string, string>) {
    router.get('/approvals', params, { preserveState: true, replace: true });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => applyFilters(buildParams({ search: value })), 350);
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    applyFilters(buildParams({ status_code: value }));
  }

  function handlePartnerChange(value: string) {
    setPartner(value);
    applyFilters(buildParams({ partner_id: value }));
  }

  function toggleUrgent() {
    applyFilters(buildParams({ filter: urgentOnly ? '' : 'overdue' }));
  }

  function handleSortChange(value: string) {
    applyFilters(buildParams({ sort: value === 'oldest' ? 'oldest' : '' }));
  }

  function clearFilters() {
    setSearch('');
    setStatus('');
    setPartner('');
    router.get('/approvals', {}, { preserveState: false, replace: true });
  }

  const hasActiveFilters = !!(search || statusCode || partnerId || urgentOnly);

  const selectCls =
    'h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none';

  const pagination = (
    <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
      <span>
        {t('approvals.pagination_summary', {
          from: approvals.from, to: approvals.to, total: approvals.total,
        })}
      </span>
      <div className="flex items-center gap-1">
        {approvals.prev_page_url ? (
          <Link
            href={approvals.prev_page_url}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border)] opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        <span className="px-3 text-xs">
          {approvals.current_page} / {approvals.last_page}
        </span>
        {approvals.next_page_url ? (
          <Link
            href={approvals.next_page_url}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] transition-colors hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border)] opacity-40">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );

  return (
    <AppShell>
      <Head title={t('approvals.index_page_title')} />

      <PageHeader
        title={t('approvals.index_heading')}
        description={t('approvals.index_description')}
        action={
          <Link
            href="/approvals/history"
            className="flex items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            <History className="h-4 w-4" /> {t('approvals.btn_history')}
          </Link>
        }
      />

      {/* Filter toolbar */}
      <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="search"
              placeholder={t('approvals.search_placeholder')}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white pl-9 pr-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
            />
          </div>

          {status_options.length > 1 && (
            <select value={statusCode} onChange={(e) => handleStatusChange(e.target.value)} className={selectCls}>
              <option value="">{t('approvals.filter_all_status')}</option>
              {status_options.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}

          {partners.length > 1 && (
            <select value={partnerId} onChange={(e) => handlePartnerChange(e.target.value)} className={selectCls}>
              <option value="">{t('approvals.filter_all_partners')}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <select value={filters.sort} onChange={(e) => handleSortChange(e.target.value)} className={selectCls}>
            <option value="newest">{t('approvals.sort_newest')}</option>
            <option value="oldest">{t('approvals.sort_oldest')}</option>
          </select>

          {/* Pending for more than a week — the backlog that actually needs chasing */}
          <button
            type="button"
            onClick={toggleUrgent}
            aria-pressed={urgentOnly}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-sm border px-3 text-sm font-medium transition-colors',
              urgentOnly
                ? 'border-warning bg-warning-surface text-warning'
                : 'border-[var(--color-border-strong)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]',
            )}
          >
            <AlarmClock className="h-3.5 w-3.5" />
            {t('approvals.filter_urgent', { n: urgent_count })}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex h-9 items-center gap-1.5 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              <X className="h-3.5 w-3.5" />
              {t('approvals.btn_clear')}
            </button>
          )}
        </div>
      </div>

      {approvals.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16 text-center shadow-xs">
          <Inbox className="mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
          {hasActiveFilters ? (
            <>
              <h3 className="font-semibold text-[var(--color-text-primary)]">{t('approvals.empty_filter_title')}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('approvals.empty_filter_body')}</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 flex h-9 items-center gap-1.5 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                <X className="h-3.5 w-3.5" /> {t('approvals.btn_clear')}
              </button>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-[var(--color-text-primary)]">{t('approvals.empty_title')}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('approvals.empty_body')}</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {approvals.data.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                href={doc.needsRouting ? `/documents/${doc.id}` : `/documents/${doc.id}/approval`}
              />
            ))}
          </div>
          {approvals.last_page > 1 && pagination}
        </>
      )}
    </AppShell>
  );
}
