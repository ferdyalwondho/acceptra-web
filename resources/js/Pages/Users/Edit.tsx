import { useEffect, useState } from 'react';
import { useForm, Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AppShell from '@/layouts/AppShell';
import ClusterMultiSelect from '@/components/acceptra/ClusterMultiSelect';
import { ArrowLeft, Copy, Link2, Mail, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRecord, RoleOption, PartnerOption, ClusterOption, InvitationLinkShareRecord, PageProps } from '@/types';

interface Props {
  user: UserRecord;
  roles: RoleOption[];
  partners: PartnerOption[];
  assigned_cluster_ids: string[];
  invitation_link_shares: InvitationLinkShareRecord[];
}

const inputCls = 'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40 transition-colors';

const errorCls = 'mt-1 text-xs text-danger';

const APPROVER_ROLES = [
  'approver_ms_bo', 'approver_ms_bo_team', 'approver_ms_rts',
  'approver_xls_rth_team', 'approver_xls_rth', 'approver_sme',
];

export default function UserEdit({ user, roles, partners, assigned_cluster_ids, invitation_link_shares }: Props) {
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

  const [copyLinkOpen, setCopyLinkOpen]       = useState(false);
  const [copyLinkAgree, setCopyLinkAgree]     = useState(false);
  const [copyLinkEvidence, setCopyLinkEvidence] = useState<File | null>(null);
  const [copyLinkNote, setCopyLinkNote]       = useState('');
  const [copyLinkLoading, setCopyLinkLoading] = useState(false);
  const [copyLinkError, setCopyLinkError]     = useState<string | null>(null);
  const [revealedUrl, setRevealedUrl]         = useState<string | null>(null);
  const [urlCopied, setUrlCopied]             = useState(false);

  const isApproverRole = APPROVER_ROLES.includes(form.data.role);

  useEffect(() => {
    // Role bukan lagi partner — partner_id lama tidak relevan dan jangan ikut terkirim.
    if (form.data.role !== 'partner') {
      form.setData('partner_id', '');
    }

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

  function resetCopyLinkForm() {
    setCopyLinkAgree(false);
    setCopyLinkEvidence(null);
    setCopyLinkNote('');
    setCopyLinkError(null);
  }

  function handleCopyLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!copyLinkAgree || !copyLinkEvidence) return;

    const formData = new FormData();
    formData.append('agree', '1');
    formData.append('evidence', copyLinkEvidence);
    if (copyLinkNote) formData.append('note', copyLinkNote);

    setCopyLinkLoading(true);
    setCopyLinkError(null);

    axios
      .post<{ url: string }>(`/users/${user.id}/copy-invitation-link`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(({ data }) => {
        setCopyLinkOpen(false);
        resetCopyLinkForm();
        setRevealedUrl(data.url);
        router.reload({ only: ['invitation_link_shares'] });
      })
      .catch((err) => {
        const message = err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : err?.response?.data?.message ?? t('users.copy_link_submit');
        setCopyLinkError(String(message));
      })
      .finally(() => setCopyLinkLoading(false));
  }

  function handleCopyRevealedUrl() {
    if (!revealedUrl) return;
    navigator.clipboard.writeText(revealedUrl).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  }

  const isPartnerRole = form.data.role === 'partner';
  const isActive      = form.data.status === 'active';

  // Field-field yang sudah punya penampil error sendiri di form (dan sedang terlihat).
  // Error lain di luar daftar ini (mis. partner_id/cluster_ids yang errornya nyangkut
  // padahal field-nya sedang disembunyikan karena role berubah) tetap harus terlihat,
  // jadi ditampung di banner generik di bawah — biar submit yang gagal validasi tidak
  // pernah terasa "diam saja" ke superadmin.
  const visibleErrorKeys = ['name', 'role', 'status', ...(isPartnerRole ? ['partner_id'] : [])];
  const hiddenErrors = Object.entries(form.errors).filter(([key]) => !visibleErrorKeys.includes(key));

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

      {hiddenErrors.length > 0 && (
        <div className="mb-4 rounded-lg bg-danger-surface px-4 py-3 text-sm font-medium text-danger">
          {hiddenErrors.map(([key, message]) => <p key={key}>{message}</p>)}
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

        {/* Kirim Ulang Undangan + Copy Link Undangan */}
        {user.invitation_pending && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('users.resend_invitation')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('users.resend_hint')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="flex h-9 items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {resendLoading ? t('users.resend_sending') : t('users.btn_resend_short')}
              </button>
              <button
                type="button"
                onClick={() => setCopyLinkOpen(true)}
                className="flex h-9 items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium hover:bg-muted transition-colors"
                title={t('users.copy_link_hint')}
              >
                <Link2 className="h-4 w-4" />
                {t('users.copy_link_invitation')}
              </button>
            </div>
          </div>
        )}

        {/* History Akses Link Undangan — tetap terlihat walau user sudah aktif */}
        {invitation_link_shares.length > 0 && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-4">
            <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">{t('users.history_title')}</p>
            <ul className="space-y-2">
              {invitation_link_shares.map((share) => (
                <li
                  key={share.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-xs"
                >
                  <div>
                    <p className="text-[var(--color-text-primary)]">
                      {t('users.history_shared_by')} <span className="font-medium">{share.shared_by_name}</span>
                    </p>
                    <p className="text-[var(--color-text-secondary)]">{new Date(share.created_at).toLocaleString()}</p>
                    {share.note && <p className="mt-0.5 text-[var(--color-text-secondary)]">{share.note}</p>}
                  </div>
                  <a
                    href={`/users/${user.id}/invitation-link-shares/${share.id}/evidence`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ming hover:underline"
                  >
                    {t('users.history_view_evidence')}
                  </a>
                </li>
              ))}
            </ul>
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

      {/* Dialog Copy Link Undangan — persetujuan + upload bukti */}
      {copyLinkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { setCopyLinkOpen(false); resetCopyLinkForm(); }}
          />
          <form
            onSubmit={handleCopyLinkSubmit}
            className="relative z-10 w-full max-w-md rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg"
          >
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('users.copy_link_modal_title')}</h2>

            <label className="mt-4 flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={copyLinkAgree}
                onChange={(e) => setCopyLinkAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0"
              />
              {t('users.copy_link_terms_text')}
            </label>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('users.copy_link_evidence_label')} <span className="text-danger">*</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setCopyLinkEvidence(e.target.files?.[0] ?? null)}
                className="block w-full text-xs"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('users.copy_link_note_label')}
              </label>
              <textarea
                value={copyLinkNote}
                onChange={(e) => setCopyLinkNote(e.target.value)}
                placeholder={t('users.copy_link_note_placeholder')}
                rows={2}
                className="w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40 transition-colors"
              />
            </div>

            {copyLinkError && <p className={cn(errorCls, 'mt-3')}>{copyLinkError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setCopyLinkOpen(false); resetCopyLinkForm(); }}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium hover:bg-muted transition-colors"
              >
                {t('users.btn_cancel')}
              </button>
              <button
                type="submit"
                disabled={!copyLinkAgree || !copyLinkEvidence || copyLinkLoading}
                className="flex h-9 items-center rounded-md bg-brand-ink px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              >
                {copyLinkLoading ? t('users.copy_link_submitting') : t('users.copy_link_submit')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Popup link undangan siap dibagikan */}
      {revealedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRevealedUrl(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('users.copy_link_popup_title')}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('users.copy_link_popup_hint')}</p>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={revealedUrl}
                className="h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] px-3 text-xs"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopyRevealedUrl}
                className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-md bg-brand-ink px-3 text-sm font-medium text-white transition-opacity"
              >
                <Copy className="h-4 w-4" />
                {urlCopied ? t('users.copy_link_copied') : t('users.copy_link_copy_button')}
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setRevealedUrl(null)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium hover:bg-muted transition-colors"
              >
                {t('users.copy_link_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
