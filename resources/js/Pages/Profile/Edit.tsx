import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/layouts/AppShell';
import { cn } from '@/lib/utils';
import { Globe, KeyRound, User } from 'lucide-react';
import type { PageProps } from '@/types';

const inputCls = 'h-9 w-full rounded-sm border border-[var(--color-border-strong)] bg-white px-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-ring/40 transition-colors';

export default function ProfileEdit() {
  const { auth } = usePage<PageProps>().props;
  const user = auth.user;

  const { t } = useTranslation();

  const [lang, setLang] = useState<'id' | 'en'>(user?.preferred_language ?? 'id');
  const [changePass, setChangePass] = useState(false);

  function handleLangChange(l: 'id' | 'en') {
    setLang(l);
    router.post('/profile/language', { preferred_language: l });
    // Server responds with Inertia::location() → full browser reload with new locale
  }

  return (
    <AppShell>
      <Head title={t('profile.title')} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('profile.title')}</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{t('profile.subtitle')}</p>
      </div>

      <div className="max-w-xl space-y-5">
        {/* Avatar */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs flex items-center gap-4 p-6">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand-surface text-xl font-bold text-brand-ink">
            {user?.initials ?? '??'}
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">{user?.name}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{user?.email}</p>
            <span className="mt-1 inline-block rounded-pill bg-info-surface px-2.5 py-0.5 text-xs font-medium text-info">{user?.role}</span>
          </div>
        </div>

        {/* Profile info */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h2 className="font-semibold text-[var(--color-text-primary)]">{t('profile.profile_info')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t('profile.full_name')} <span className="text-danger">*</span>
              </label>
              <input type="text" defaultValue={user?.name} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">{t('profile.email')}</label>
              <input type="email" defaultValue={user?.email} readOnly className={cn(inputCls, 'bg-[var(--color-bg-subtle)] cursor-not-allowed')} />
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-6">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <h2 className="font-semibold text-[var(--color-text-primary)]">{t('profile.language_ui')}</h2>
          </div>
          <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-1 w-fit">
            {(['id', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleLangChange(l)}
                className={cn(
                  'rounded-md px-6 py-2 text-sm font-medium transition-colors',
                  lang === l ? 'bg-white text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {l === 'id' ? t('profile.language_id') : t('profile.language_en')}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{t('profile.language_hint')}</p>
        </div>

        {/* Change password */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <h2 className="font-semibold text-[var(--color-text-primary)]">{t('profile.change_password')}</h2>
            </div>
            <button
              type="button"
              onClick={() => setChangePass((v) => !v)}
              className="text-xs font-medium text-ming hover:underline"
            >
              {changePass ? t('profile.cancel') : t('profile.change')}
            </button>
          </div>
          {changePass && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {t('profile.current_password')} <span className="text-danger">*</span>
                </label>
                <input type="password" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {t('profile.new_password')} <span className="text-danger">*</span>
                </label>
                <input type="password" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {t('profile.confirm_new_password')} <span className="text-danger">*</span>
                </label>
                <input type="password" className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* Saved Signature shortcut — hidden for partner, admin & super_admin */}
        {user?.role !== 'partner' && user?.role !== 'admin' && user?.role !== 'super_admin' && (
          <Link href="/profile/signature" className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-xs transition-colors duration-[120ms] hover:bg-[var(--color-bg-subtle)]">
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">{t('profile.saved_signature_title')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('profile.saved_signature_hint')}</p>
            </div>
            <span className="text-xs font-medium text-ming">{t('profile.manage')}</span>
          </Link>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <button type="button" className="h-9 rounded-md bg-brand-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
            {t('profile.save_changes')}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
