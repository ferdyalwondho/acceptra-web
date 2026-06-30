import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/layouts/AppShell';
import SignaturePad from '@/components/acceptra/SignaturePad';
import { ArrowLeft, Trash2, CheckCircle2, Clock } from 'lucide-react';

interface SavedSig {
  id: string;
  dataUrl: string;
  createdAt: string;
  isActive: boolean;
}

interface Props {
  signatures?: SavedSig[];
}

export default function ProfileSignature({ signatures = [] }: Props) {
  const { t } = useTranslation();
  const [showPad, setShowPad] = useState(false);
  const [saving,  setSaving]  = useState(false);

  function handleSave(dataUrl: string) {
    setSaving(true);
    router.post('/profile/signature', { data_url: dataUrl }, {
      onFinish: () => { setSaving(false); setShowPad(false); },
    });
  }

  function handleActivate(id: string) {
    router.patch(`/profile/signature/${id}/activate`);
  }

  function handleDelete(id: string) {
    router.delete(`/profile/signature/${id}`);
  }

  return (
    <AppShell>
      <Head title={t('signature.page_title')} />

      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href="/profile" className="flex items-center gap-1 hover:text-ming transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('signature.breadcrumb_profile')}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{t('signature.breadcrumb_current')}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('signature.heading')}</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{t('signature.description')}</p>
      </div>

      <div className="max-w-xl space-y-5">
        {/* Saved signatures list */}
        {signatures.length > 0 && (
          <div className="space-y-3">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  sig.isActive
                    ? 'border-brand/30 bg-brand-surface/30'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {sig.isActive && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-brand-ink">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t('signature.badge_active')}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                      <Clock className="h-3 w-3" /> {sig.createdAt}
                    </span>
                  </div>
                  <div className="flex h-16 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white px-4">
                    {sig.dataUrl
                      ? <img src={sig.dataUrl} alt={t('signature.heading')} className="max-h-12 object-contain" />
                      : <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
                    }
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {!sig.isActive && (
                    <button
                      type="button"
                      onClick={() => handleActivate(sig.id)}
                      className="rounded-md border border-brand/30 bg-brand-surface px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-brand/10 transition-colors"
                    >
                      {t('signature.btn_set_active')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(sig.id)}
                    className="flex items-center justify-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-surface transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t('signature.btn_delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new */}
        {!showPad ? (
          <button
            type="button"
            onClick={() => setShowPad(true)}
            className="w-full rounded-lg border-2 border-dashed border-[var(--color-border-strong)] py-8 text-center transition-colors hover:border-brand hover:bg-brand-surface/20"
          >
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('signature.add_title')}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t('signature.add_subtitle')}</p>
          </button>
        ) : (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-[var(--color-text-primary)]">{t('signature.new_pad_heading')}</h2>
              <button
                onClick={() => setShowPad(false)}
                className="text-xs text-[var(--color-text-secondary)] hover:text-ming transition-colors"
              >
                {t('signature.new_pad_cancel')}
              </button>
            </div>
            <SignaturePad onSave={handleSave} />
            {saving && (
              <p className="mt-2 text-center text-xs text-[var(--color-text-secondary)]">Menyimpan…</p>
            )}
          </div>
        )}

        <div className="rounded-lg bg-[var(--color-bg-subtle)] p-4 text-xs text-[var(--color-text-secondary)]">
          {t('signature.note')}
        </div>
      </div>
    </AppShell>
  );
}
