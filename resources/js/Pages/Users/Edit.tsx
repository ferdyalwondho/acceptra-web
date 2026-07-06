import { useEffect, useState } from 'react';
import { useForm, Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AppShell from '@/layouts/AppShell';
import ClusterMultiSelect from '@/components/acceptra/ClusterMultiSelect';
import { ArrowLeft, Mail, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRecord, RoleOption, PartnerOption, ClusterOption, PageProps } from '@/types';

interface Props {
  user: UserRecord;
  roles: RoleOption[];
  partners: PartnerOption[];
  assigned_cluster_ids: string[];
}

const inputCls = 'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40 transition-colors';

const errorCls = 'mt-1 text-xs text-danger';

const APPROVER_ROLES = [
  'approver_ms_bo', 'approver_ms_bo_team', 'approver_ms_rts',
  'approver_xls_rth_team', 'approver_xls_rth', 'approver_sme',
];

export default function UserEdit({ user, roles, partners, assigned_cluster_ids }: Props) {
  const { t } = useTranslation();
  const { flash } = usePage<PageProps>().props;

  const form = useForm({
    name:        user.name,
    role:        user.role,
    status:      user.status,
    partner_id:  user.partner_id ?? '',
    cluster_ids: assigned_cluster_ids,
  });

  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [flashMsg, setFlashMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [availableClusters, setAvailableClusters] = useState<ClusterOption[]>([]);
  const [initialRole]                     = useState(user.role);

  const isApproverRole = APPROVER_ROLES.includes(form.data.role);

  useEffect(() => {
    if (!isApproverRole) {
      setAvailableClusters([]);
      return;
    }

    axios
      .get<{ data: ClusterOption[] }>(`/api/clusters/available?role=${form.data.role}&user_id=${user.id}`)
      .then(({ data }) => setAvailableClusters(data.data))
      .catch(() => setAvailableClusters([]));

    // Role berubah dari role asal — cluster lama (terikat role lama) tidak lagi relevan.
    if (form.data.role !== initialRole) {
      form.setData('cluster_ids', []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data.role]);


  useEffect(() => {
    if (flash?.success) setFlashMsg({ type: 'success', text: flash.success });
    if (flash?.error)   setFlashMsg({ type: 'error',   text: flash.error });
  }, [flash?.success, flash?.error]);

  useEffect(() => {
    if (!flashMsg) return;
    const timer = setTimeout(() => setFlashMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [flashMsg]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    form.put(`/users/${user.id}`);
  }

  function handleResend() {
    setResendLoading(true);
    router.post(`/users/${user.id}/resend-invitation`, {}, {
      onFinish: () => setResendLoading(false),
    });
  }

  function handleDelete() {
    router.delete(`/users/${user.id}`, {
      onFinish: () => setDeleteOpen(false),
    });
  }

  const isPartnerRole = form.data.role === 'partner';
  const isActive      = form.data.status === 'active';

  return (
    <AppShell>
      <Head title={`${t('users.edit_title')} – ${user.name}`} />

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

      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href="/users" className="flex items-center gap-1 hover:text-ming transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> User
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">Edit — {user.name}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('users.edit_title')}</h1>
        <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">{user.email}</p>
      </div>

      <form onSubmit={submit} className="max-w-xl space-y-5">
        {/* Form data */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-6 space-y-4">

          {/* Nama */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('users.field_name')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.data.name}
              onChange={(e) => form.setData('name', e.target.value)}
              className={cn(inputCls, form.errors.name && 'border-danger focus:border-danger')}
            />
            {form.errors.name && <p className={errorCls}>{form.errors.name}</p>}
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{t('users.field_email')}</label>
            <input
              type="email"
              value={user.email}
              readOnly
              className={cn(inputCls, 'bg-[var(--color-bg-subtle)] cursor-not-allowed')}
            />
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{t('users.email_readonly_hint')}</p>
          </div>

          {/* Role */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('users.field_role')} <span className="text-danger">*</span>
            </label>
            <select
              value={form.data.role}
              onChange={(e) => form.setData('role', e.target.value)}
              className={cn(inputCls, form.errors.role && 'border-danger focus:border-danger')}
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {form.errors.role && <p className={errorCls}>{form.errors.role}</p>}
          </div>

          {/* Partner (conditional) */}
          {isPartnerRole && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('users.field_partner')} <span className="text-danger">*</span>
              </label>
              <select
                value={form.data.partner_id}
                onChange={(e) => form.setData('partner_id', e.target.value)}
                className={cn(inputCls, form.errors.partner_id && 'border-danger focus:border-danger')}
              >
                <option value="">{t('users.select_partner_placeholder')}</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {form.errors.partner_id && <p className={errorCls}>{form.errors.partner_id}</p>}
            </div>
          )}

          {/* Cluster assignment (conditional — approver roles only) */}
          {isApproverRole && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('users.field_clusters')}
              </label>
              <p className="mb-2 text-xs text-[var(--color-text-secondary)]">{t('users.select_clusters_hint')}</p>
              {availableClusters.length === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('users.no_open_clusters')}</p>
              ) : (
                <ClusterMultiSelect
                  options={availableClusters}
                  selected={form.data.cluster_ids}
                  onChange={(ids) => form.setData('cluster_ids', ids)}
                />
              )}
            </div>
          )}
        </div>

        {/* Status akun */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">{t('users.field_status')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t('users.status_hint')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => form.setData('status', isActive ? 'inactive' : 'active')}
              className={cn(
                'relative h-6 w-11 rounded-pill transition-colors',
                isActive ? 'bg-brand-ink' : 'bg-[var(--color-border-strong)]',
              )}
              role="switch"
              aria-checked={isActive}
            >
              <span
                className={cn(
                  'absolute top-[2px] h-5 w-5 rounded-full bg-white shadow transition-transform',
                  isActive ? 'left-[2px] translate-x-5' : 'left-[2px]',
                )}
              />
            </button>
          </div>
          {form.errors.status && <p className={cn(errorCls, 'mt-2')}>{form.errors.status}</p>}
        </div>

        {/* Kirim Ulang Undangan */}
        {user.invitation_pending && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('users.resend_invitation')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('users.resend_hint')}</p>
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="flex h-9 items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
            >
              <Mail className="h-4 w-4" />
              {resendLoading ? t('users.resend_sending') : t('users.btn_resend_short')}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pb-8">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex h-9 items-center gap-1.5 text-sm font-medium text-danger hover:underline transition-colors"
          >
            <Trash2 className="h-4 w-4" /> {t('users.delete_user')}
          </button>
          <div className="flex gap-3">
            <Link
              href="/users"
              className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {t('users.btn_cancel')}
            </Link>
            <button
              type="submit"
              disabled={form.processing}
              className="h-9 rounded-md px-5 text-sm font-semibold text-white bg-brand-ink transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
            >
              {form.processing ? t('users.btn_saving') : t('users.btn_save')}
            </button>
          </div>
        </div>
      </form>

      {/* Dialog konfirmasi hapus */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('users.delete_confirm_title')}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <span className="font-medium text-[var(--color-text-primary)]">{user.name}</span>
              {' '}{t('users.delete_confirm_body')}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium hover:bg-muted transition-colors"
              >
                {t('users.btn_cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex h-9 items-center rounded-md bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                {t('users.btn_delete_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
