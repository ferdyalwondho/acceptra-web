import { useForm, Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/layouts/AppShell';
import { ArrowLeft, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoleOption, PartnerOption } from '@/types';

interface Props {
  roles: RoleOption[];
  partners: PartnerOption[];
}

const inputCls = 'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40 transition-colors';

const errorCls = 'mt-1 text-xs text-danger';

export default function UserCreate({ roles, partners }: Props) {
  const { t } = useTranslation();

  const form = useForm({
    name:       '',
    email:      '',
    role:       '',
    region:     '',
    partner_id: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    form.post('/users');
  }

  const isPartnerRole = form.data.role === 'partner';

  return (
    <AppShell>
      <Head title={t('users.create_title')} />

      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href="/users" className="flex items-center gap-1 hover:text-ming transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> User
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{t('users.create_title')}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('users.create_title')}</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          {t('users.create_subtitle')}
        </p>
      </div>

      <form onSubmit={submit} className="max-w-xl space-y-5">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-6 space-y-4">

          {/* Nama */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('users.field_name')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="cth. Budi Santoso"
              value={form.data.name}
              onChange={(e) => form.setData('name', e.target.value)}
              className={cn(inputCls, form.errors.name && 'border-danger focus:border-danger')}
            />
            {form.errors.name && <p className={errorCls}>{form.errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('users.field_email')} <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              placeholder="budi.s@perusahaan.com"
              value={form.data.email}
              onChange={(e) => form.setData('email', e.target.value)}
              className={cn(inputCls, form.errors.email && 'border-danger focus:border-danger')}
            />
            {form.errors.email
              ? <p className={errorCls}>{form.errors.email}</p>
              : <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t('users.email_hint')}</p>
            }
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
              <option value="">{t('users.select_role_placeholder')}</option>
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

          {/* Region */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('users.field_region')} <span className="text-xs font-normal text-[var(--color-text-tertiary)]">{t('users.optional')}</span>
            </label>
            <input
              type="text"
              placeholder="cth. Jawa Barat"
              value={form.data.region}
              onChange={(e) => form.setData('region', e.target.value)}
              className={cn(inputCls, form.errors.region && 'border-danger focus:border-danger')}
            />
            {form.errors.region && <p className={errorCls}>{form.errors.region}</p>}
          </div>
        </div>

        {/* Invitation notice */}
        <div className="flex items-start gap-3 rounded-lg bg-info-surface p-4">
          <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
          <div className="text-sm text-info">
            <p className="font-semibold">{t('users.invite_notice_title')}</p>
            <p className="mt-0.5 text-xs opacity-80">
              {t('users.invite_notice_body')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link
            href="/users"
            className="flex h-9 items-center rounded-md border border-[var(--color-border-strong)] px-5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {t('users.btn_cancel')}
          </Link>
          <button
            type="submit"
            disabled={form.processing}
            className="flex h-9 items-center gap-2 rounded-md px-5 text-sm font-semibold text-white bg-brand-ink transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            {form.processing ? t('users.btn_saving') : t('users.btn_create')}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
