import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import StatusBadge from '@/components/acceptra/StatusBadge';
import DocumentCard, { type DocumentCardData } from '@/components/acceptra/DocumentCard';
import ExportExcelButton from '@/components/acceptra/ExportExcelButton';
import {
  Plus, Search, FileX, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ATP_STATUS } from '@/lib/status';
import type {
  DocumentListItem, DocumentFilters, PaginatedResponse, PartnerOption, PageProps,
} from '@/types';

interface Props {
  documents: PaginatedResponse<DocumentListItem>;
  filters: DocumentFilters;
  partners: PartnerOption[];
  can_export: boolean;
}

export default function DocumentsIndex({ documents, filters, partners, can_export }: Props) {
  const { auth, flash } = usePage<PageProps>().props;
  const { t } = useTranslation();
  const role = auth.user?.role ?? '';

  const canSubmit = ['partner', 'admin', 'super_admin'].includes(role);
  const canSubmitOngoing = ['admin', 'super_admin'].includes(role);

  const [search, setSearch]     = useState(filters.search ?? '');
  const [statusCode, setStatus] = useState(filters.status_code ?? '');
  const [partnerId, setPartner] = useState(filters.partner_id ?? '');
  const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
  const [dateTo, setDateTo]     = useState(filters.date_to ?? '');
  const [flashMsg, setFlashMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (flash?.success) setFlashMsg({ type: 'success', text: flash.success });
    if (flash?.error)   setFlashMsg({ type: 'error',   text: flash.error });
  }, [flash?.success, flash?.error]);

  useEffect(() => {
    if (!flashMsg) return;
    const timer = setTimeout(() => setFlashMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [flashMsg]);

  function buildParams(overrides: Record<string, string> = {}): Record<string, string> {
    const base: Record<string, string> = {};
    if (search)     base.search      = search;
    if (statusCode) base.status_code = statusCode;
    if (partnerId)  base.partner_id  = partnerId;
    if (dateFrom)   base.date_from   = dateFrom;
    if (dateTo)     base.date_to     = dateTo;
    if (filters.sort !== 'created_at') base.sort = filters.sort;
    if (filters.dir  !== 'desc')       base.dir  = filters.dir;
    return { ...base, ...overrides };
  }

  function applyFilters(params: Record<string, string>) {
    router.get('/documents', params, { preserveState: true, replace: true });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      applyFilters(buildParams({ search: value }));
    }, 350);
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    applyFilters(buildParams({ status_code: value }));
  }

  function handlePartnerChange(value: string) {
    setPartner(value);
    applyFilters(buildParams({ partner_id: value }));
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
    setStatus('');
    setPartner('');
    setDateFrom('');
    setDateTo('');
    router.get('/documents', {}, { preserveState: false, replace: true });
  }

  function buildExportUrl(): string {
    const params = new URLSearchParams();
    if (search)     params.set('search',      search);
    if (statusCode) params.set('status_code', statusCode);
    if (partnerId)  params.set('partner_id',  partnerId);
    if (dateFrom)   params.set('date_from',   dateFrom);
    if (dateTo)     params.set('date_to',     dateTo);
    const qs = params.toString();
    return `/documents/export${qs ? '?' + qs : ''}`;
  }

  function handleSortChange(column: string) {
    const newDir = filters.sort === column && filters.dir === 'desc' ? 'asc' : 'desc';
    applyFilters(buildParams({ sort: column, dir: newDir }));
  }

  function sortIndicator(column: string) {
    if (filters.sort !== column) return null;
    return filters.dir === 'asc' ? ' ↑' : ' ↓';
  }

  const hasActiveFilters = !!(search || statusCode || partnerId || dateFrom || dateTo);

  const tableColumns = [
    { label: t('documents.col_unique_id'),   col: 'unique_id' },
    { label: t('documents.col_project_code'), col: null },
    { label: t('documents.col_sow'),          col: null },
    { label: t('documents.col_partner'),      col: null },
    { label: t('documents.col_status'),       col: 'status_code' },
    { label: t('documents.col_active_step'),  col: null },
    { label: t('documents.col_submitted'),    col: 'date_atp_submission' },
  ];

  return (
    <AppShell>
      <Head title={t('documents.page_title')} />

      {/* Flash */}
      {flashMsg && (
        <div className={cn(
          'mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium',
          flashMsg.type === 'success'
            ? 'bg-success-surface text-success'
            : 'bg-danger-surface text-danger',
        )}>
          {flashMsg.text}
        </div>
      )}

      <PageHeader
        title={t('documents.heading')}
        description={t('documents.description')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {can_export && <ExportExcelButton href={buildExportUrl()} />}
            {canSubmitOngoing && (
              <Link
                href="/documents/submit-ongoing"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-4 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                {t('documents.btn_submit_ongoing')}
              </Link>
            )}
            {canSubmit && (
              <Link
                href="/documents/create"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <Plus className="h-4 w-4" />
                {t('documents.btn_new_request')}
              </Link>
            )}
          </div>
        }
      />

      {/* Filter toolbar */}
      <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="search"
              placeholder={t('documents.search_placeholder')}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white pl-9 pr-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusCode}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">{t('documents.filter_all_status')}</option>
            <option value="draft">{t('documents.filter_draft')}</option>
            {Object.entries(ATP_STATUS).map(([code, info]) => (
              <option key={code} value={code}>{info.label}</option>
            ))}
          </select>

          {/* Partner filter — Aviat roles only */}
          {can_export && partners.length > 0 && (
            <select
              value={partnerId}
              onChange={(e) => handlePartnerChange(e.target.value)}
              className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">{t('documents.filter_all_partners')}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            title={t('documents.date_from_title')}
            className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            title={t('documents.date_to_title')}
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
              {t('documents.btn_clear')}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {documents.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16 text-center shadow-xs">
          <FileX className="mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
          {hasActiveFilters ? (
            <>
              <h3 className="font-semibold text-[var(--color-text-primary)]">{t('documents.empty_filter_title')}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('documents.empty_filter_body')}</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                <X className="h-4 w-4" />
                {t('documents.btn_clear_filters')}
              </button>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-[var(--color-text-primary)]">{t('documents.empty_title')}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('documents.empty_body')}</p>
              {canSubmit && (
                <Link
                  href="/documents/create"
                  className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  <Plus className="h-4 w-4" />
                  {t('documents.btn_new_request')}
                </Link>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                    {tableColumns.map(({ label, col }) => (
                      <th
                        key={label}
                        onClick={col ? () => handleSortChange(col) : undefined}
                        className={cn(
                          'px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]',
                          col && 'cursor-pointer select-none hover:text-[var(--color-text-primary)]',
                        )}
                      >
                        {label}{col ? sortIndicator(col) : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {documents.data.map((doc) => (
                    <tr key={doc.id} className="cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]">
                      <td className="px-5 py-3.5">
                        <Link href={`/documents/${doc.id}`} className="font-mono text-xs text-ming hover:underline">
                          {doc.unique_id}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">
                        {doc.project_code ?? doc.pt_index}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{doc.sow_name}</td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{doc.partner_name ?? '—'}</td>
                      <td className="px-5 py-3.5"><StatusBadge code={doc.status_code} /></td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{doc.active_step ?? '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[var(--color-text-secondary)]">{doc.submitted_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {documents.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-text-secondary)]">
                <span>
                  {t('documents.pagination_summary', {
                    from: documents.from,
                    to: documents.to,
                    total: documents.total,
                  })}
                </span>
                <div className="flex items-center gap-1">
                  {documents.prev_page_url ? (
                    <Link
                      href={documents.prev_page_url}
                      className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border)] opacity-40">
                      <ChevronLeft className="h-4 w-4" />
                    </span>
                  )}
                  <span className="px-3 text-xs">{documents.current_page} / {documents.last_page}</span>
                  {documents.next_page_url ? (
                    <Link
                      href={documents.next_page_url}
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

          {/* Mobile card list */}
          <div className="grid gap-3 md:hidden">
            {documents.data.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={{
                  id:          doc.id,
                  uniqueId:    doc.unique_id,
                  project:     doc.project_code ?? doc.pt_index,
                  sow:         doc.sow_name,
                  partner:     doc.partner_name ?? undefined,
                  statusCode:  doc.status_code,
                  activeStep:  doc.active_step ?? undefined,
                  submittedAt: doc.submitted_at,
                } satisfies DocumentCardData}
                href={`/documents/${doc.id}`}
              />
            ))}

            {/* Mobile pagination */}
            {documents.last_page > 1 && (
              <div className="flex items-center justify-between py-2 text-sm text-[var(--color-text-secondary)]">
                <span>{documents.current_page} / {documents.last_page}</span>
                <div className="flex items-center gap-2">
                  {documents.prev_page_url ? (
                    <Link href={documents.prev_page_url} className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted">
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border)] opacity-40">
                      <ChevronLeft className="h-4 w-4" />
                    </span>
                  )}
                  {documents.next_page_url ? (
                    <Link href={documents.next_page_url} className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted">
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
        </>
      )}
    </AppShell>
  );
}
