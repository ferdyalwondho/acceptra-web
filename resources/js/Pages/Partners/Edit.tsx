import { useEffect, useState } from 'react';
import { useForm, Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/layouts/AppShell';
import { ArrowLeft, Mail, Plus, Trash2, RefreshCw, UserX, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PartnerDetail, PartnerPic, PageProps } from '@/types';

interface PicRow {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

interface FormData {
  name: string;
  email: string;
  status: 'active' | 'inactive';
  pics: PicRow[];
}

interface Props {
  partner: PartnerDetail;
}

const inputCls = 'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40';
const readonlyCls = 'h-9 w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 text-sm text-[var(--color-text-secondary)] cursor-not-allowed';
const errorCls = 'mt-1 text-xs text-danger';

export default function PartnerEdit({ partner }: Props) {
  const { t } = useTranslation();
  const { flash } = usePage<PageProps>().props;
  const [flashMsg, setFlashMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resendingId, setResendingId]       = useState<string | null>(null);

  useEffect(() => {
    if (flash?.success) setFlashMsg({ type: 'success', text: flash.success });
    if (flash?.error)   setFlashMsg({ type: 'error',   text: flash.error });
  }, [flash?.success, flash?.error]);

  useEffect(() => {
    if (!flashMsg) return;
    const timer = setTimeout(() => setFlashMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [flashMsg]);

  const form = useForm<FormData>({
    name:   partner.name,
    email:  partner.email,
    status: partner.status,
    pics: partner.pics.map((p) => ({
      id:     p.id,
      name:   p.name,
      email:  p.email,
      status: p.status,
    })),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    form.put(`/partners/${partner.id}`);
  }

  function updatePic(index: number, field: keyof PicRow, value: string) {
    const updated = form.data.pics.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    form.setData('pics', updated);
  }

  function togglePicStatus(index: number) {
    const current = form.data.pics[index].status;
    updatePic(index, 'status', current === 'active' ? 'inactive' : 'active');
  }

  function addNewPic() {
    form.setData('pics', [
      ...form.data.pics,
      { id: '', name: '', email: '', status: 'inactive' },
    ]);
  }

  function removeNewPic(index: number) {
    form.setData('pics', form.data.pics.filter((_, i) => i !== index));
  }

  function picError(index: number, field: keyof PicRow): string | undefined {
    return (form.errors as Record<string, string>)[`pics.${index}.${field}`];
  }

  function resendInvitation(picId: string) {
    setResendingId(picId);
    router.post(`/partners/${partner.id}/resend-invitation/${picId}`, {}, {
      onFinish: () => setResendingId(null),
    });
  }

  function deletePartner() {
    router.delete(`/partners/${partner.id}`, {
      onFinish: () => setDeleteDialogOpen(false),
    });
  }

  const originalPic = (picId: string): PartnerPic | undefined =>
    partner.pics.find((p) => p.id === picId);

  const existingPics = form.data.pics.filter((p) => p.id !== '');
  const newPics      = form.data.pics.filter((p) => p.id === '');
  const newPicOffset = existingPics.length;

  return (
    <AppShell>
      <Head title={`${t('partner_form.edit_heading')} — ${partner.name}`} />

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
        <Link href="/partners" className="flex items-center gap-1 transition-colors hover:text-ming">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('partner_form.breadcrumb_partners')}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{t('partner_form.breadcrumb_edit')}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{t('partner_form.edit_heading')}</h1>
        <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">{partner.name}</p>
      </div>

      <form onSubmit={submit} className="max-w-xl space-y-5">

        {/* Informasi Perusahaan */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-xs">
          <h2 className="mb-4 font-semibold text-[var(--color-text-primary)]">{t('partner_form.section_company')}</h2>
          <div className="space-y-4">

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('partner_form.field_company_name')} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                className={cn(inputCls, form.errors.name && 'border-danger focus:border-danger')}
              />
              {form.errors.name && <p className={errorCls}>{form.errors.name}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('partner_form.field_contact_email')} <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={form.data.email}
                onChange={(e) => form.setData('email', e.target.value)}
                className={cn(inputCls, form.errors.email && 'border-danger focus:border-danger')}
              />
              {form.errors.email && <p className={errorCls}>{form.errors.email}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('partner_form.field_partner_status')}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => form.setData('status', form.data.status === 'active' ? 'inactive' : 'active')}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    form.data.status === 'active'
                      ? 'border border-danger/30 text-danger hover:bg-danger-surface'
                      : 'border border-brand/30 text-brand-ink hover:bg-brand-surface',
                  )}
                >
                  {form.data.status === 'active'
                    ? <><UserX className="h-4 w-4" /> {t('partner_form.btn_deactivate')}</>
                    : <><UserCheck className="h-4 w-4" /> {t('partner_form.btn_activate')}</>
                  }
                </button>
                <div className="flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', form.data.status === 'active' ? 'bg-success' : 'bg-[var(--color-text-tertiary)]')} />
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {form.data.status === 'active' ? t('partner_form.status_active') : t('partner_form.status_inactive')}
                  </span>
                </div>
              </div>
              {form.errors.status && <p className={errorCls}>{form.errors.status}</p>}
            </div>
          </div>
        </div>

        {/* PIC Terdaftar */}
        {existingPics.length > 0 && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-xs">
            <h2 className="mb-4 font-semibold text-[var(--color-text-primary)]">{t('partner_form.section_registered_pic')}</h2>
            <div className="space-y-3">
              {form.data.pics.map((pic, index) => {
                if (pic.id === '') return null;
                const original  = originalPic(pic.id);
                const isPending = original?.invitation_pending ?? false;

                return (
                  <div key={pic.id} className="rounded-md border border-[var(--color-border)] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                        {t('partner_form.pic_label', { num: index + 1 })}
                      </span>
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => resendInvitation(pic.id)}
                            disabled={resendingId === pic.id}
                            className="flex items-center gap-1 rounded-md border border-warning/30 px-2.5 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning-surface disabled:opacity-60"
                          >
                            <RefreshCw className={cn('h-3 w-3', resendingId === pic.id && 'animate-spin')} />
                            {t('partner_form.btn_resend')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => togglePicStatus(index)}
                          className={cn(
                            'flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                            pic.status === 'active'
                              ? 'border-danger/30 text-danger hover:bg-danger-surface'
                              : 'border-brand/30 text-brand-ink hover:bg-brand-surface',
                          )}
                        >
                          {pic.status === 'active' ? t('partner_form.btn_deactivate_pic') : t('partner_form.btn_activate_pic')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                          {t('partner_form.field_full_name')}
                        </label>
                        <input
                          type="text"
                          value={pic.name}
                          onChange={(e) => updatePic(index, 'name', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                          {t('partner_form.field_login_email')}
                        </label>
                        <input
                          type="email"
                          value={pic.email}
                          readOnly
                          className={readonlyCls}
                        />
                        <p className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">{t('partner_form.email_readonly_hint')}</p>
                      </div>
                    </div>

                    {isPending && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-warning">
                        <Mail className="h-3 w-3" /> {t('partner_form.invitation_pending')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tambah PIC Baru */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-text-primary)]">{t('partner_form.section_add_pic')}</h2>
            <button
              type="button"
              onClick={addNewPic}
              className="flex items-center gap-1 rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              <Plus className="h-3.5 w-3.5" /> {t('partner_form.btn_add_pic')}
            </button>
          </div>

          {newPics.length === 0 ? (
            <p className="text-xs text-[var(--color-text-tertiary)]">
              {t('partner_form.no_new_pic_hint')}
            </p>
          ) : (
            <div className="space-y-4">
              {form.data.pics.map((pic, index) => {
                if (pic.id !== '') return null;
                const newIndex = index - newPicOffset;

                return (
                  <div key={index} className="relative rounded-md border border-dashed border-[var(--color-border-strong)] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                        {t('partner_form.new_pic_label', { num: newIndex + 1 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeNewPic(index)}
                        className="text-[var(--color-text-tertiary)] transition-colors hover:text-danger"
                        aria-label={t('partner_form.aria_remove_new_pic')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                          {t('partner_form.field_full_name')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Nama PIC"
                          value={pic.name}
                          onChange={(e) => updatePic(index, 'name', e.target.value)}
                          className={cn(inputCls, picError(index, 'name') && 'border-danger focus:border-danger')}
                        />
                        {picError(index, 'name') && <p className={errorCls}>{picError(index, 'name')}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                          {t('partner_form.field_login_email')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="pic@mitra.com"
                          value={pic.email}
                          onChange={(e) => updatePic(index, 'email', e.target.value)}
                          className={cn(inputCls, picError(index, 'email') && 'border-danger focus:border-danger')}
                        />
                        {picError(index, 'email') && <p className={errorCls}>{picError(index, 'email')}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-start gap-3 rounded-lg bg-info-surface p-3">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
                <p className="text-xs text-info">
                  {t('partner_form.new_pic_invitation_hint')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pb-8">
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-danger/30 px-4 text-sm font-medium text-danger transition-colors hover:bg-danger-surface"
          >
            <Trash2 className="h-4 w-4" /> {t('partner_form.btn_delete_partner')}
          </button>

          <div className="flex items-center gap-3">
            <Link
              href="/partners"
              className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              {t('partner_form.btn_cancel')}
            </Link>
            <button
              type="submit"
              disabled={form.processing}
              className="flex h-9 items-center gap-2 rounded-md bg-brand-ink px-5 text-sm font-semibold text-white transition-all hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
            >
              {form.processing ? t('partner_form.btn_saving') : t('partner_form.btn_save')}
            </button>
          </div>
        </div>
      </form>

      {/* Dialog konfirmasi hapus partner */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteDialogOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t('partner_form.delete_title')}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <span className="font-medium text-[var(--color-text-primary)]">{partner.name}</span>
              {' '}{t('partner_form.delete_body')}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('partner_form.btn_cancel')}
              </button>
              <button
                onClick={deletePartner}
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
