import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import { Plus, Search, Edit, Building2, Trash2, ChevronLeft, ChevronRight, Mail, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PartnerRecord, PaginatedResponse, PageProps } from '@/types';

interface Props {
  partners:   PaginatedResponse<PartnerRecord>;
  filters:    { search: string | null; status: string | null; sort: string; dir: 'asc' | 'desc' };
  can_manage: boolean;
}

export default function PartnersIndex({ partners, filters, can_manage }: Props) {
  const { t } = useTranslation();
  const { flash } = usePage<PageProps>().props;

  const [search, setSearch]             = useState(filters.search ?? '');
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
  const [deleteTarget, setDeleteTarget] = useState<PartnerRecord | null>(null);
  const [flashMsg, setFlashMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  function applyFilters(params: Record<string, string>) {
    router.get('/partners', { sort: filters.sort, dir: filters.dir, ...params }, { preserveState: true, replace: true });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      applyFilters({ search: value, status: statusFilter });
    }, 350);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    applyFilters({ search, status: value });
  }

  function handleSortChange(column: string) {
    const newDir = filters.sort === column && filters.dir === 'asc' ? 'desc' : 'asc';
    applyFilters({ search, status: statusFilter, sort: column, dir: newDir });
  }

  function sortIcon(column: string) {
    if (filters.sort !== column) return <ArrowUpDown className="h-3 w-3 text-[var(--color-text-tertiary)]" />;
    return filters.dir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-brand-ink" />
      : <ArrowDown className="h-3 w-3 text-brand-ink" />;
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    router.delete(`/partners/${deleteTarget.id}`, {
      onFinish: () => setDeleteTarget(null),
    });
  }

  const mobilePagination = (
    <div className="flex items-center justify-between py-2 text-sm text-[var(--color-text-secondary)]">
      <span>{partners.current_page} / {partners.last_page}</span>
      <div className="flex items-center gap-2">
        {partners.prev_page_url ? (
          <Link href={partners.prev_page_url} className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border)] opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        {partners.next_page_url ? (
          <Link href={partners.next_page_url} className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted">
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
      <Head title={t('partners.page_title')} />

      {flashMsg && (
        <div
          className={cn(
            'mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium',
            flashMsg.type === 'success'
              ? 'bg-success-surface text-success'
              : 'bg-danger-surface text-danger',
          )}
        >
          {flashMsg.text}
        </div>
      )}

      <PageHeader
        title={t('partners.heading')}
        description={t('partners.description')}
        action={can_manage ? (
          <Link
            href="/partners/create"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <Plus className="h-4 w-4" /> {t('partners.btn_add')}
          </Link>
        ) : undefined}
      />

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="search"
            placeholder={t('partners.search_placeholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white pl-9 pr-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">{t('partners.filter_all_status')}</option>
          <option value="active">{t('partners.filter_active')}</option>
          <option value="inactive">{t('partners.filter_inactive')}</option>
        </select>
      </div>

      {partners.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16 text-center shadow-xs">
          <Building2 className="mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">{t('partners.empty_title')}</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('partners.empty_body')}</p>
          {can_manage && (
            <Link
              href="/partners/create"
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" /> {t('partners.btn_add')}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-bg-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-5 py-3 text-left">
                      <span className="inline-flex items-center gap-1">
                        {t('partners.col_company')}
                        <button
                          type="button"
                          onClick={() => handleSortChange('name')}
                          className="rounded p-0.5 hover:bg-[var(--color-bg-subtle)]"
                        >
                          {sortIcon('name')}
                        </button>
                      </span>
                    </th>
                    <th className="px-5 py-3 text-left">{t('partners.col_contact_email')}</th>
                    <th className="px-5 py-3 text-left">{t('partners.col_pic_count')}</th>
                    <th className="px-5 py-3 text-left">{t('partners.col_documents')}</th>
                    <th className="px-5 py-3 text-left">{t('partners.col_status')}</th>
                    <th className="px-5 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {partners.data.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                          <span className="font-medium text-[var(--color-text-primary)]">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[var(--color-text-secondary)]">{p.email}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                          <Mail className="h-3.5 w-3.5" /> {p.pics_count} PIC
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">
                        {t('partners.doc_count', { count: p.documents_count })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            p.status === 'active'
                              ? 'bg-success-surface text-success'
                              : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
                          )}
                        >
                          {p.status === 'active' ? t('partners.status_active') : t('partners.status_inactive')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {can_manage && (
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/partners/${p.id}/edit`}
                              className="flex items-center gap-1 text-xs font-medium text-ming hover:underline"
                            >
                              <Edit className="h-3.5 w-3.5" /> {t('partners.btn_edit')}
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] transition-colors hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> {t('partners.btn_delete')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {partners.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-text-secondary)]">
                <span>
                  {t('partners.pagination_summary', { from: partners.from, to: partners.to, total: partners.total })}
                </span>
                <div className="flex items-center gap-1">
                  {partners.prev_page_url ? (
                    <Link
                      href={partners.prev_page_url}
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
                    {partners.current_page} / {partners.last_page}
                  </span>
                  {partners.next_page_url ? (
                    <Link
                      href={partners.next_page_url}
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
            )}
          </div>

          {/* Mobile card list */}
          <div className="grid gap-3 md:hidden">
            {partners.data.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs"
              >
                <Link
                  href={can_manage ? `/partners/${p.id}/edit` : '#'}
                  className="flex items-start gap-3 p-4 hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-subtle)]">
                    <Building2 className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--color-text-primary)] truncate">{p.name}</span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          p.status === 'active'
                            ? 'bg-success-surface text-success'
                            : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
                        )}
                      >
                        {p.status === 'active' ? t('partners.status_active') : t('partners.status_inactive')}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)] truncate">{p.email}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      {p.pics_count} PIC · {t('partners.doc_count', { count: p.documents_count })}
                    </p>
                  </div>
                </Link>
                {can_manage && (
                  <div className="flex items-center gap-4 border-t border-[var(--color-border)] px-4 py-2.5">
                    <Link
                      href={`/partners/${p.id}/edit`}
                      className="flex items-center gap-1.5 text-xs font-medium text-ming hover:underline"
                    >
                      <Edit className="h-3.5 w-3.5" /> {t('partners.btn_edit')}
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t('partners.btn_delete')}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {partners.last_page > 1 && mobilePagination}
          </div>
        </>
      )}

      {/* Dialog konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('partners.delete_title')}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <span className="font-medium text-[var(--color-text-primary)]">{deleteTarget.name}</span>
              {' '}{t('partners.delete_body')}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('partners.btn_cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex h-9 items-center rounded-md bg-danger px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('partners.btn_delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
