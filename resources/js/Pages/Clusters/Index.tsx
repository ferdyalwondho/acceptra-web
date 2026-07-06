import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import { Plus, MapPin, Search, Download, Upload, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageProps, PaginatedResponse } from '@/types';

interface ClusterRow {
  id: string;
  name: string;
  province: string;
  approvers: Record<string, string | null>;
}

interface Props {
  clusters: PaginatedResponse<ClusterRow>;
  role_labels: Record<string, string>;
  filters: { search: string | null; sort: string; dir: 'asc' | 'desc' };
}

export default function ClustersIndex({ clusters, role_labels, filters }: Props) {
  const { t } = useTranslation();
  const { flash } = usePage<PageProps>().props;

  const [showAddForm, setShowAddForm]     = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [search, setSearch]               = useState(filters.search ?? '');
  const [flashMsg, setFlashMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const form       = useForm({ name: '', province: '' });
  const importForm = useForm<{ file: File | null }>({ file: null });

  useEffect(() => {
    if (flash?.success) setFlashMsg({ type: 'success', text: flash.success });
  }, [flash?.success]);

  useEffect(() => {
    if (!flashMsg) return;
    const timer = setTimeout(() => setFlashMsg(null), 6000);
    return () => clearTimeout(timer);
  }, [flashMsg]);

  function applyFilters(params: Record<string, string>) {
    router.get('/clusters', { search, sort: filters.sort, dir: filters.dir, ...params }, { preserveState: true, replace: true });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      applyFilters({ search: value });
    }, 350);
  }

  function handleSortChange(column: string) {
    const newDir = filters.sort === column && filters.dir === 'desc' ? 'asc' : 'desc';
    applyFilters({ sort: column, dir: newDir });
  }

  function sortIcon(column: string) {
    if (filters.sort !== column) return <ArrowUpDown className="h-3 w-3 text-[var(--color-text-tertiary)]" />;
    return filters.dir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-brand-ink" />
      : <ArrowDown className="h-3 w-3 text-brand-ink" />;
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    form.post('/clusters', {
      onSuccess: () => { form.reset(); setShowAddForm(false); },
    });
  }

  function submitImport(e: React.FormEvent) {
    e.preventDefault();
    importForm.post('/clusters/import', {
      forceFormData: true,
      onSuccess: () => { importForm.reset(); setShowImportForm(false); },
    });
  }

  const roles = Object.entries(role_labels);

  return (
    <AppShell>
      <Head title={t('clusters.page_title')} />

      {flashMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-success-surface px-4 py-3 text-sm font-medium text-success">
          {flashMsg.text}
        </div>
      )}

      <PageHeader
        title={t('clusters.heading')}
        description={t('clusters.description')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/clusters/template"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              <Download className="h-4 w-4" /> {t('clusters.btn_download_template')}
            </a>
            <button
              onClick={() => setShowImportForm(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-4 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              <Upload className="h-4 w-4" /> {t('clusters.btn_bulk_import')}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <Plus className="h-4 w-4" /> {t('clusters.btn_add_cluster')}
            </button>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="search"
            placeholder={t('clusters.search_placeholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white pl-9 pr-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
          />
        </div>
      </div>

      {clusters.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16 text-center shadow-xs">
          <MapPin className="mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">{t('clusters.empty_title')}</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('clusters.empty_body')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-5 py-3 text-left">
                    <span className="inline-flex items-center gap-1">
                      {t('clusters.col_cluster')}
                      <button type="button" onClick={() => handleSortChange('name')} className="rounded p-0.5 hover:bg-[var(--color-bg-subtle)]">
                        {sortIcon('name')}
                      </button>
                    </span>
                  </th>
                  <th className="px-5 py-3 text-left">
                    <span className="inline-flex items-center gap-1">
                      {t('clusters.col_province')}
                      <button type="button" onClick={() => handleSortChange('province')} className="rounded p-0.5 hover:bg-[var(--color-bg-subtle)]">
                        {sortIcon('province')}
                      </button>
                    </span>
                  </th>
                  {roles.map(([role, label]) => (
                    <th key={role} className="px-5 py-3 text-left">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {clusters.data.map((cluster) => (
                  <tr key={cluster.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{cluster.name}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{cluster.province}</td>
                    {roles.map(([role]) => (
                      <td key={role} className="px-5 py-3.5">
                        {cluster.approvers[role] ? (
                          <span className="inline-flex rounded-pill bg-brand-surface px-2.5 py-0.5 text-xs font-medium text-brand-ink">
                            {cluster.approvers[role]}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-tertiary)]">{t('clusters.cell_not_assigned')}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {clusters.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-text-secondary)]">
              <span>
                {t('clusters.pagination_summary', { from: clusters.from, to: clusters.to, total: clusters.total })}
              </span>
              <div className="flex items-center gap-1">
                {clusters.prev_page_url ? (
                  <Link
                    href={clusters.prev_page_url}
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
                  {clusters.current_page} / {clusters.last_page}
                </span>
                {clusters.next_page_url ? (
                  <Link
                    href={clusters.next_page_url}
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
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddForm(false)} />
          <form onSubmit={submitAdd} className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('clusters.btn_add_cluster')}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                  {t('clusters.field_name')}
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder={t('clusters.placeholder_name')}
                  value={form.data.name}
                  onChange={(e) => form.setData('name', e.target.value.toUpperCase())}
                  className={cn(
                    'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40',
                    form.errors.name && 'border-danger focus:border-danger',
                  )}
                />
                {form.errors.name && <p className="mt-1 text-xs text-danger">{form.errors.name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                  {t('clusters.field_province')}
                </label>
                <input
                  type="text"
                  placeholder={t('clusters.placeholder_province')}
                  value={form.data.province}
                  onChange={(e) => form.setData('province', e.target.value.toUpperCase())}
                  className={cn(
                    'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40',
                    form.errors.province && 'border-danger focus:border-danger',
                  )}
                />
                {form.errors.province && <p className="mt-1 text-xs text-danger">{form.errors.province}</p>}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('clusters.btn_cancel')}
              </button>
              <button
                type="submit"
                disabled={form.processing || !form.data.name.trim() || !form.data.province.trim()}
                className="flex h-9 items-center rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {t('clusters.btn_save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {showImportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowImportForm(false)} />
          <form onSubmit={submitImport} encType="multipart/form-data" className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('clusters.import_modal_title')}</h2>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">{t('clusters.import_modal_body')}</p>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                {t('clusters.field_import_file')}
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => importForm.setData('file', e.target.files?.[0] ?? null)}
                className={cn(
                  'block w-full text-sm text-[var(--color-text-secondary)] file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-[var(--color-bg-subtle)] file:px-3 file:text-sm file:font-medium',
                  importForm.errors.file && 'border-danger',
                )}
              />
              {importForm.errors.file && <p className="mt-1 text-xs text-danger">{importForm.errors.file}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowImportForm(false)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('clusters.btn_cancel')}
              </button>
              <button
                type="submit"
                disabled={importForm.processing || !importForm.data.file}
                className="flex h-9 items-center rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {t('clusters.btn_import_submit')}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
