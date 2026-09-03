import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AppShell from '@/layouts/AppShell';
import { Plus, Edit, Search, Trash2, Mail, KeyRound, Copy, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ExportExcelButton from '@/components/acceptra/ExportExcelButton';
import type { UserRecord, PaginatedResponse, PageProps } from '@/types';

const errorCls = 'mt-1 text-xs text-danger';

const ROLE_COLOR: Record<string, string> = {
  super_admin:            'bg-brand-surface   text-brand-ink',
  admin:                  'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
  viewer:                 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
  approver_ms_bo:         'bg-info-surface     text-info',
  approver_ms_bo_team:    'bg-info-surface     text-info',
  approver_ms_rts:        'bg-info-surface     text-info',
  approver_xls_rth_team:  'bg-warning-surface  text-warning',
  approver_xls_rth:       'bg-warning-surface  text-warning',
  approver_sme:           'bg-warning-surface  text-warning',
  partner:                'bg-success-surface  text-success',
};

interface Props {
  users: PaginatedResponse<UserRecord>;
  roles: { value: string; label: string }[];
  filters: { search: string | null; role: string | null; status: string | null; sort: string; dir: 'asc' | 'desc' };
}

export default function UsersIndex({ users, roles, filters }: Props) {
  const { t } = useTranslation();
  const { flash } = usePage<PageProps>().props;

  const [search, setSearch]             = useState(filters.search ?? '');
  const [roleFilter, setRoleFilter]     = useState(filters.role ?? '');
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [flashMsg, setFlashMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [resetPwTarget, setResetPwTarget]     = useState<UserRecord | null>(null);
  const [resetPwAgree, setResetPwAgree]       = useState(false);
  const [resetPwEvidence, setResetPwEvidence] = useState<File | null>(null);
  const [resetPwNote, setResetPwNote]         = useState('');
  const [resetPwLoading, setResetPwLoading]   = useState(false);
  const [resetPwError, setResetPwError]       = useState<string | null>(null);
  const [revealedPwUrl, setRevealedPwUrl]     = useState<string | null>(null);
  const [pwUrlCopied, setPwUrlCopied]         = useState(false);

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
    router.get('/users', { sort: filters.sort, dir: filters.dir, ...params }, { preserveState: true, replace: true });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      applyFilters({ search: value, role: roleFilter, status: statusFilter });
    }, 350);
  }

  function handleRoleChange(value: string) {
    setRoleFilter(value);
    applyFilters({ search, role: value, status: statusFilter });
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    applyFilters({ search, role: roleFilter, status: value });
  }

  // The export follows these filters, so the button says so — a leftover search term
  // used to shrink the file to nothing with no hint why.
  const hasActiveFilters = !!(search || roleFilter || statusFilter);

  function buildExportUrl(): string {
    const params = new URLSearchParams();
    if (search)       params.set('search', search);
    if (roleFilter)   params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    const qs = params.toString();
    return `/users/export${qs ? '?' + qs : ''}`;
  }

  function handleSortChange(column: string) {
    const newDir = filters.sort === column && filters.dir === 'desc' ? 'asc' : 'desc';
    applyFilters({ search, role: roleFilter, status: statusFilter, sort: column, dir: newDir });
  }

  function sortIcon(column: string) {
    if (filters.sort !== column) return <ArrowUpDown className="h-3 w-3 text-[var(--color-text-tertiary)]" />;
    return filters.dir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-brand-ink" />
      : <ArrowDown className="h-3 w-3 text-brand-ink" />;
  }

  function handleDelete(user: UserRecord) {
    setDeleteTarget(user);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    router.delete(`/users/${deleteTarget.id}`, {
      onFinish: () => setDeleteTarget(null),
    });
  }

  function resetResetPwForm() {
    setResetPwAgree(false);
    setResetPwEvidence(null);
    setResetPwNote('');
    setResetPwError(null);
  }

  function handleResetPwSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPwTarget || !resetPwAgree || !resetPwEvidence) return;

    const formData = new FormData();
    formData.append('agree', '1');
    formData.append('evidence', resetPwEvidence);
    if (resetPwNote) formData.append('note', resetPwNote);

    setResetPwLoading(true);
    setResetPwError(null);

    axios
      .post<{ url: string }>(`/users/${resetPwTarget.id}/reset-password-link`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(({ data }) => {
        setResetPwTarget(null);
        resetResetPwForm();
        setRevealedPwUrl(data.url);
      })
      .catch((err) => {
        const message = err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : err?.response?.data?.message ?? t('users.reset_pw_submit');
        setResetPwError(String(message));
      })
      .finally(() => setResetPwLoading(false));
  }

  function handleCopyResetPwUrl() {
    if (!revealedPwUrl) return;
    navigator.clipboard.writeText(revealedPwUrl).then(() => {
      setPwUrlCopied(true);
      setTimeout(() => setPwUrlCopied(false), 2000);
    });
  }

  const roleLabel = (roleValue: string) =>
    roles.find((r) => r.value === roleValue)?.label ?? roleValue;

  function userInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  const pagination = (
    <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-text-secondary)]">
      <span>
        {t('users.pagination_summary', { from: users.from, to: users.to, total: users.total })}
      </span>
      <div className="flex items-center gap-1">
        {users.prev_page_url ? (
          <Link
            href={users.prev_page_url}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border)] opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        <span className="px-3 text-xs">
          {users.current_page} / {users.last_page}
        </span>
        {users.next_page_url ? (
          <Link
            href={users.next_page_url}
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
  );

  return (
    <AppShell>
      <Head title={t('users.page_title')} />

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

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('users.title')}</h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {t('users.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <ExportExcelButton
            href={buildExportUrl()}
            label={hasActiveFilters ? t('users.export_pending_filtered') : t('users.export_pending')}
          />
          <Link
            href="/users/create"
            className="flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white bg-brand-ink transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <Plus className="h-4 w-4" /> {t('users.add_user')}
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="search"
            placeholder={t('users.search_placeholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white pl-9 pr-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">{t('users.filter_all_roles')}</option>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">{t('users.filter_all_statuses')}</option>
          <option value="active">{t('users.status_active')}</option>
          <option value="inactive">{t('users.status_inactive')}</option>
        </select>
      </div>

      {users.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16 text-center shadow-xs">
          <p className="text-sm text-[var(--color-text-secondary)]">{t('users.empty')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-bg-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-5 py-3 text-left">
                      <span className="inline-flex items-center gap-1">
                        {t('users.col_name')}
                        <button type="button" onClick={() => handleSortChange('name')} className="rounded p-0.5 hover:bg-[var(--color-bg-subtle)]">
                          {sortIcon('name')}
                        </button>
                      </span>
                    </th>
                    <th className="px-5 py-3 text-left">{t('users.col_email')}</th>
                    <th className="px-5 py-3 text-left">
                      <span className="inline-flex items-center gap-1">
                        {t('users.col_role')}
                        <button type="button" onClick={() => handleSortChange('role')} className="rounded p-0.5 hover:bg-[var(--color-bg-subtle)]">
                          {sortIcon('role')}
                        </button>
                      </span>
                    </th>
                    <th className="px-5 py-3 text-left">{t('users.col_clusters')}</th>
                    <th className="px-5 py-3 text-left">{t('users.col_status')}</th>
                    <th className="px-5 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {users.data.map((u) => (
                    <tr key={u.id} className="h-12 transition-colors hover:bg-[var(--color-bg-subtle)]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-surface text-xs font-bold text-brand-ink">
                            {userInitials(u.name)}
                          </span>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-secondary)]">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={cn('rounded-pill px-2.5 py-0.5 text-xs font-medium', ROLE_COLOR[u.role] ?? 'bg-muted')}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--color-text-secondary)]">
                        {u.clusters && u.clusters.length > 0
                          ? t('users.clusters_assigned_count', { count: u.clusters.length })
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn('rounded-pill w-fit px-2 py-0.5 text-[11px] font-medium', u.status === 'active' ? 'bg-success-surface text-success' : 'bg-muted text-[var(--color-text-secondary)]')}>
                            {u.status === 'active' ? t('users.status_active') : t('users.status_inactive')}
                          </span>
                          {u.invitation_pending && (
                            <span className="text-[11px] text-warning font-medium flex items-center gap-0.5">
                              <Mail className="h-3 w-3" /> {t('users.invite_pending')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/users/${u.id}/edit`}
                            className="flex items-center gap-1 text-xs font-medium text-ming hover:underline"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Link>
                          <button
                            onClick={() => setResetPwTarget(u)}
                            className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-ming transition-colors"
                          >
                            <KeyRound className="h-3.5 w-3.5" /> {t('users.reset_password_btn')}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-danger transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> {t('users.btn_delete_confirm')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.last_page > 1 && pagination}
          </div>

          {/* Mobile card list */}
          <div className="grid gap-3 md:hidden">
            {users.data.map((u) => (
              <div
                key={u.id}
                className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs"
              >
                <Link
                  href={`/users/${u.id}/edit`}
                  className="flex items-center gap-3 p-4 hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-surface text-sm font-bold text-brand-ink">
                    {userInitials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--color-text-primary)] truncate">{u.name}</span>
                      <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-medium', ROLE_COLOR[u.role] ?? 'bg-muted')}>
                        {roleLabel(u.role)}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)] truncate">{u.email}</p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-medium', u.status === 'active' ? 'bg-success-surface text-success' : 'bg-muted text-[var(--color-text-secondary)]')}>
                        {u.status === 'active' ? t('users.status_active') : t('users.status_inactive')}
                      </span>
                      {u.invitation_pending && (
                        <span className="text-[11px] text-warning font-medium flex items-center gap-0.5">
                          <Mail className="h-3 w-3" /> {t('users.invite_pending')}
                        </span>
                      )}
                      {u.clusters && u.clusters.length > 0 && (
                        <span className="text-[11px] text-[var(--color-text-secondary)]">
                          {t('users.clusters_assigned_count', { count: u.clusters.length })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-4 border-t border-[var(--color-border)] px-4 py-2.5">
                  <Link
                    href={`/users/${u.id}/edit`}
                    className="flex items-center gap-1.5 text-xs font-medium text-ming hover:underline"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <button
                    onClick={() => setResetPwTarget(u)}
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-ming transition-colors"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> {t('users.reset_password_btn')}
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-danger transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t('users.btn_delete_confirm')}
                  </button>
                </div>
              </div>
            ))}
            {users.last_page > 1 && (
              <div className="flex items-center justify-between py-2 text-sm text-[var(--color-text-secondary)]">
                <span>{users.current_page} / {users.last_page}</span>
                <div className="flex items-center gap-2">
                  {users.prev_page_url ? (
                    <Link href={users.prev_page_url} className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted">
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border)] opacity-40">
                      <ChevronLeft className="h-4 w-4" />
                    </span>
                  )}
                  {users.next_page_url ? (
                    <Link href={users.next_page_url} className="flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--color-border-strong)] hover:bg-muted">
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

      {/* Dialog konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('users.delete_confirm_title')}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <span className="font-medium text-[var(--color-text-primary)]">{deleteTarget.name}</span>
              {' '}{t('users.delete_confirm_body')}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium hover:bg-muted transition-colors"
              >
                {t('users.btn_cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex h-9 items-center rounded-md bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                {t('users.btn_delete_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Reset Password — persetujuan + upload bukti */}
      {resetPwTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { setResetPwTarget(null); resetResetPwForm(); }}
          />
          <form
            onSubmit={handleResetPwSubmit}
            className="relative z-10 w-full max-w-md rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg"
          >
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {t('users.reset_pw_modal_title', { name: resetPwTarget.name })}
            </h2>

            <label className="mt-4 flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={resetPwAgree}
                onChange={(e) => setResetPwAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0"
              />
              {t('users.reset_pw_terms_text')}
            </label>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('users.reset_pw_evidence_label')} <span className="text-danger">*</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setResetPwEvidence(e.target.files?.[0] ?? null)}
                className="block w-full text-xs"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('users.reset_pw_note_label')}
              </label>
              <textarea
                value={resetPwNote}
                onChange={(e) => setResetPwNote(e.target.value)}
                placeholder={t('users.reset_pw_note_placeholder')}
                rows={2}
                className="w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40 transition-colors"
              />
            </div>

            {resetPwError && <p className={cn(errorCls, 'mt-3')}>{resetPwError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setResetPwTarget(null); resetResetPwForm(); }}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium hover:bg-muted transition-colors"
              >
                {t('users.btn_cancel')}
              </button>
              <button
                type="submit"
                disabled={!resetPwAgree || !resetPwEvidence || resetPwLoading}
                className="flex h-9 items-center rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              >
                {resetPwLoading ? t('users.reset_pw_submitting') : t('users.reset_pw_submit')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Popup link reset password siap dibagikan */}
      {revealedPwUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRevealedPwUrl(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('users.reset_pw_popup_title')}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('users.reset_pw_popup_hint')}</p>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={revealedPwUrl}
                className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] px-3 text-xs"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopyResetPwUrl}
                className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-md bg-brand-ink px-3 text-sm font-medium text-white transition-opacity"
              >
                <Copy className="h-4 w-4" />
                {pwUrlCopied ? t('users.reset_pw_copied') : t('users.reset_pw_copy_button')}
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setRevealedPwUrl(null)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium hover:bg-muted transition-colors"
              >
                {t('users.reset_pw_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
