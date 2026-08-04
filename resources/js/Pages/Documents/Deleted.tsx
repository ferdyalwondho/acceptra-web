import { useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import {
  Search, Trash2, ChevronLeft, ChevronRight, X, ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import type { DeletedDocumentLogItem, DeletedDocumentFilters, PaginatedResponse } from '@/types';

interface Props {
  logs: PaginatedResponse<DeletedDocumentLogItem>;
  filters: DeletedDocumentFilters;
}

export default function DeletedDocumentsIndex({ logs, filters }: Props) {
  const { t } = useTranslation();

  const [search, setSearch]     = useState(filters.search ?? '');
  const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
  const [dateTo, setDateTo]     = useState(filters.date_to ?? '');

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function buildParams(overrides: Record<string, string> = {}): Record<string, string> {
    const base: Record<string, string> = {};
    if (search)   base.search    = search;
    if (dateFrom) base.date_from = dateFrom;
    if (dateTo)   base.date_to   = dateTo;
    if (filters.sort !== 'deleted_at') base.sort = filters.sort;
    if (filters.dir  !== 'desc')       base.dir  = filters.dir;
    return { ...base, ...overrides };
  }

  function applyFilters(params: Record<string, string>) {
    router.get('/documents/deleted', params, { preserveState: true, replace: true });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      applyFilters(buildParams({ search: value }));
    }, 350);
  }

  function handleDateFromChange(value: string) {
    setDateFrom(value);
    applyFilters(buildParams({ date_from: value }));
  }

  function handleDateToChange(value: string) {
    setDateTo(value);
    applyFilters(buildParams({ date_to: value }));
  }

  function clearFilters() {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    router.get('/documents/deleted', {}, { preserveState: false, replace: true });
  }

  function handleSortChange(column: string) {
    const newDir = filters.sort === column && filters.dir === 'desc' ? 'asc' : 'desc';
    applyFilters(buildParams({ sort: column, dir: newDir }));
  }

  function sortIcon(column: string) {
    if (filters.sort !== column) return <ArrowUpDown className="h-3 w-3 text-[var(--color-text-tertiary)]" />;
    return filters.dir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-brand-ink" />
      : <ArrowDown className="h-3 w-3 text-brand-ink" />;
  }

  const hasActiveFilters = !!(search || dateFrom || dateTo);

  const tableColumns = [
    { label: t('documents.deleted.col_unique_id'),    col: 'unique_id' },
    { label: t('documents.deleted.col_project_code'), col: 'project_code' },
    { label: t('documents.deleted.col_sow'),          col: 'sow_name' },
    { label: t('documents.deleted.col_reason'),       col: null },
    { label: t('documents.deleted.col_deleted_by'),   col: null },
    { label: t('documents.deleted.col_deleted_at'),   col: 'deleted_at' },
  ];

  return (
    <AppShell>
      <Head title={t('documents.deleted.page_title')} />

      <PageHeader
        title={t('documents.deleted.heading')}
        description={t('documents.deleted.description')}
      />

      {/* Filter toolbar */}
      <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="search"
              placeholder={t('documents.deleted.search_placeholder')}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white pl-9 pr-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
            />
          </div>

          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            title={t('documents.deleted.date_from_title')}
            className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            title={t('documents.deleted.date_to_title')}
            className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none"
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex h-9 items-center gap-1.5 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              <X className="h-3.5 w-3.5" />
              {t('documents.deleted.btn_clear')}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {logs.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16 text-center shadow-xs">
          <Trash2 className="mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
          {hasActiveFilters ? (
            <>
              <h3 className="font-semibold text-[var(--color-text-primary)]">{t('documents.deleted.empty_filter_title')}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('documents.deleted.empty_filter_body')}</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                <X className="h-4 w-4" />
                {t('documents.deleted.btn_clear')}
              </button>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-[var(--color-text-primary)]">{t('documents.deleted.empty_title')}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('documents.deleted.empty_body')}</p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                  {tableColumns.map(({ label, col }) => (
                    <th
                      key={label}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
                    >
                      {col ? (
                        <span className="inline-flex items-center gap-1">
                          {label}
                          <button
                            type="button"
                            onClick={() => handleSortChange(col)}
                            className="rounded p-0.5 hover:bg-[var(--color-bg-subtle)]"
                          >
                            {sortIcon(col)}
                          </button>
                        </span>
                      ) : label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {logs.data.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                    <td className="px-5 py-3.5 font-mono text-xs text-[var(--color-text-primary)]">{log.unique_id}</td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{log.project_code ?? '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{log.sow_name ?? '—'}</td>
                    <td className="max-w-xs px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">
                      <span className="line-clamp-2 whitespace-pre-wrap">{log.reason}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{log.deleted_by_name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[var(--color-text-secondary)]">{log.deleted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logs.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-text-secondary)]">
              <span>
                {t('documents.deleted.pagination_summary', {
                  from: logs.from,
                  to: logs.to,
                  total: logs.total,
                })}
              </span>
              <div className="flex items-center gap-1">
                {logs.prev_page_url ? (
                  <Link
                    href={logs.prev_page_url}
                    className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border)] opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                )}
                <span className="px-3 text-xs">{logs.current_page} / {logs.last_page}</span>
                {logs.next_page_url ? (
                  <Link
                    href={logs.next_page_url}
                    className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted transition-colors"
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
          )}
        </div>
      )}
    </AppShell>
  );
}
