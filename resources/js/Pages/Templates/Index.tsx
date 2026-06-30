import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import { Plus, Search, Edit, GitBranch, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TemplateRecord, PaginatedResponse, PageProps } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  admin:                 'Admin Aviat',
  approver_ms_bo:        'MS BO',
  approver_ms_rts:       'MS RTS',
  approver_xls_rth_team: 'XLS RTH Team',
  approver_xls_rth:      'XLS RTH',
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

interface Props {
  templates:  PaginatedResponse<TemplateRecord>;
  filters:    { search: string | null; status: string | null };
  can_manage: boolean;
}

export default function TemplatesIndex({ templates, filters, can_manage }: Props) {
  const { t } = useTranslation();
  const { flash } = usePage<PageProps>().props;

  const [search, setSearch]             = useState(filters.search ?? '');
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
  const [deleteTarget, setDeleteTarget] = useState<TemplateRecord | null>(null);
  const [cloneTarget, setCloneTarget]   = useState<TemplateRecord | null>(null);
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
    router.get('/templates', params, { preserveState: true, replace: true });
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

  function confirmDelete() {
    if (!deleteTarget) return;
    router.delete(`/templates/${deleteTarget.id}`, {
      onFinish: () => setDeleteTarget(null),
    });
  }

  function confirmClone() {
    if (!cloneTarget) return;
    router.post(`/templates/${cloneTarget.id}/clone`, {}, {
      onFinish: () => setCloneTarget(null),
    });
  }

  const mobilePagination = (
    <div className="flex items-center justify-between py-2 text-sm text-[var(--color-text-secondary)]">
      <span>{templates.current_page} / {templates.last_page}</span>
      <div className="flex items-center gap-2">
        {templates.prev_page_url ? (
          <Link href={templates.prev_page_url} className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border)] opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        {templates.next_page_url ? (
          <Link href={templates.next_page_url} className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted">
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
      <Head title={t('templates.page_title')} />

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
        title={t('templates.heading')}
        description={t('templates.description')}
        action={can_manage ? (
          <Link
            href="/templates/create"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <Plus className="h-4 w-4" /> {t('templates.btn_create')}
          </Link>
        ) : undefined}
      />

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="search"
            placeholder={t('templates.search_placeholder')}
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
          <option value="">{t('templates.filter_all_status')}</option>
          <option value="active">{t('templates.filter_active')}</option>
          <option value="inactive">{t('templates.filter_inactive')}</option>
        </select>
      </div>

      {templates.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16 text-center shadow-xs">
          <GitBranch className="mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">{t('templates.empty_title')}</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {t('templates.empty_body')}
          </p>
          {can_manage && (
            <Link
              href="/templates/create"
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" /> {t('templates.btn_create')}
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
                    <th className="px-5 py-3 text-left">{t('templates.col_sow_name')}</th>
                    <th className="px-5 py-3 text-left">{t('templates.col_code')}</th>
                    <th className="px-5 py-3 text-left">{t('templates.col_level_structure')}</th>
                    <th className="px-5 py-3 text-left">{t('templates.col_documents')}</th>
                    <th className="px-5 py-3 text-left">{t('templates.col_status')}</th>
                    <th className="px-5 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {templates.data.map((tmpl) => (
                    <tr key={tmpl.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                          <span className="font-medium text-[var(--color-text-primary)]">{tmpl.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[var(--color-text-secondary)]">
                        {tmpl.sow_code ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {tmpl.levels_summary.map((l) => (
                            <span
                              key={l.level_order}
                              className={cn(
                                'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                l.requires_signature
                                  ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)]'
                                  : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
                              )}
                              title={l.requires_signature ? t('templates.signature_required') : t('templates.approve_only')}
                            >
                              L{l.level_order} {roleLabel(l.role)}
                              {l.requires_signature && <span className="text-brand-ink">✍</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">
                        {t('templates.doc_count', { count: tmpl.documents_count })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            tmpl.status === 'active'
                              ? 'bg-success-surface text-success'
                              : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
                          )}
                        >
                          {tmpl.status === 'active' ? t('templates.status_active') : t('templates.status_inactive')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {can_manage && (
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/templates/${tmpl.id}/edit`}
                              className="flex items-center gap-1 text-xs font-medium text-ming hover:underline"
                            >
                              <Edit className="h-3.5 w-3.5" /> {t('templates.btn_edit')}
                            </Link>
                            <button
                              onClick={() => setCloneTarget(tmpl)}
                              className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]"
                            >
                              <Copy className="h-3.5 w-3.5" /> {t('templates.btn_clone')}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(tmpl)}
                              className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] transition-colors hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> {t('templates.btn_delete')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {templates.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-text-secondary)]">
                <span>
                  {t('templates.pagination_summary', { from: templates.from, to: templates.to, total: templates.total })}
                </span>
                <div className="flex items-center gap-1">
                  {templates.prev_page_url ? (
                    <Link
                      href={templates.prev_page_url}
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
                    {templates.current_page} / {templates.last_page}
                  </span>
                  {templates.next_page_url ? (
                    <Link
                      href={templates.next_page_url}
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
            {templates.data.map((tmpl) => (
              <div
                key={tmpl.id}
                className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs"
              >
                <Link
                  href={can_manage ? `/templates/${tmpl.id}/edit` : '#'}
                  className="flex items-start gap-3 p-4 hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-subtle)]">
                    <GitBranch className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--color-text-primary)] truncate">{tmpl.name}</span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          tmpl.status === 'active'
                            ? 'bg-success-surface text-success'
                            : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
                        )}
                      >
                        {tmpl.status === 'active' ? t('templates.status_active') : t('templates.status_inactive')}
                      </span>
                    </div>
                    {tmpl.sow_code && (
                      <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">{tmpl.sow_code}</p>
                    )}
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      {t('templates.doc_count', { count: tmpl.documents_count })}
                    </p>
                    {tmpl.levels_summary.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tmpl.levels_summary.map((l) => (
                          <span
                            key={l.level_order}
                            className={cn(
                              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
                              l.requires_signature
                                ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)]'
                                : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
                            )}
                          >
                            L{l.level_order} {roleLabel(l.role)}
                            {l.requires_signature && <span className="text-brand-ink">✍</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
                {can_manage && (
                  <div className="flex items-center gap-4 border-t border-[var(--color-border)] px-4 py-2.5">
                    <Link
                      href={`/templates/${tmpl.id}/edit`}
                      className="flex items-center gap-1.5 text-xs font-medium text-ming hover:underline"
                    >
                      <Edit className="h-3.5 w-3.5" /> {t('templates.btn_edit')}
                    </Link>
                    <button
                      onClick={() => setCloneTarget(tmpl)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" /> {t('templates.btn_clone')}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(tmpl)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t('templates.btn_delete')}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {templates.last_page > 1 && mobilePagination}
          </div>
        </>
      )}

      {/* Dialog konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('templates.delete_title')}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {t('templates.delete_body')}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('templates.btn_cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex h-9 items-center rounded-md bg-danger px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('templates.btn_delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog konfirmasi clone */}
      {cloneTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCloneTarget(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('templates.clone_title')}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <span className="font-medium text-[var(--color-text-primary)]">{cloneTarget.name}</span>
              {' — '}{t('templates.clone_body')}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setCloneTarget(null)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('templates.btn_cancel')}
              </button>
              <button
                onClick={confirmClone}
                className="flex h-9 items-center rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('templates.btn_confirm_clone')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
