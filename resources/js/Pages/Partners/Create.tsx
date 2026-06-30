import { useForm, Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/layouts/AppShell';
import { ArrowLeft, Mail, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PicRow {
  name: string;
  email: string;
}

interface FormData {
  name: string;
  email: string;
  pics: PicRow[];
}

const inputCls = 'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] transition-colors duration-[120ms] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40';
const errorCls = 'mt-1 text-xs text-danger';

export default function PartnerCreate() {
  const { t } = useTranslation();

  const form = useForm<FormData>({
    name:  '',
    email: '',
    pics:  [{ name: '', email: '' }],
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    form.post('/partners');
  }

  function addPic() {
    form.setData('pics', [...form.data.pics, { name: '', email: '' }]);
  }

  function removePic(index: number) {
    if (form.data.pics.length <= 1) return;
    form.setData('pics', form.data.pics.filter((_, i) => i !== index));
  }

  function updatePic(index: number, field: keyof PicRow, value: string) {
    const updated = form.data.pics.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    form.setData('pics', updated);
  }

  function picError(index: number, field: keyof PicRow): string | undefined {
    return (form.errors as Record<string, string>)[`pics.${index}.${field}`];
  }

  return (
    <AppShell>
      <Head title={t('partner_form.create_page_title')} />

      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href="/partners" className="flex items-center gap-1 transition-colors hover:text-ming">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('partner_form.breadcrumb_partners')}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{t('partner_form.breadcrumb_create')}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{t('partner_form.create_heading')}</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          {t('partner_form.create_subtitle')}
        </p>
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
                placeholder="PT Mitra Telco Indonesia"
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
                placeholder="info@mitra.com"
                value={form.data.email}
                onChange={(e) => form.setData('email', e.target.value)}
                className={cn(inputCls, form.errors.email && 'border-danger focus:border-danger')}
              />
              {form.errors.email
                ? <p className={errorCls}>{form.errors.email}</p>
                : <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t('partner_form.email_hint')}</p>
              }
            </div>
          </div>
        </div>

        {/* Kontak PIC */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-text-primary)]">{t('partner_form.section_add_pic')}</h2>
            <button
              type="button"
              onClick={addPic}
              className="flex items-center gap-1 rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              <Plus className="h-3.5 w-3.5" /> {t('partner_form.btn_add_pic')}
            </button>
          </div>

          <div className="space-y-4">
            {form.data.pics.map((pic, index) => (
              <div key={index} className="relative rounded-md border border-[var(--color-border)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    {t('partner_form.pic_label', { num: index + 1 })}
                  </span>
                  {form.data.pics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePic(index)}
                      className="text-[var(--color-text-tertiary)] transition-colors hover:text-danger"
                      aria-label={t('partner_form.aria_remove_pic')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                      {t('partner_form.field_full_name')} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nama lengkap PIC"
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
            ))}
          </div>
        </div>

        {/* Info undangan */}
        <div className="flex items-start gap-3 rounded-lg bg-info-surface p-4">
          <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
          <div className="text-sm text-info">
            <p className="font-semibold">{t('partner_form.invite_notice_title')}</p>
            <p className="mt-0.5 text-xs opacity-80">
              {t('partner_form.invite_notice_body')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
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
            <Mail className="h-4 w-4" />
            {form.processing ? t('partner_form.btn_saving') : t('partner_form.btn_save_invite')}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
