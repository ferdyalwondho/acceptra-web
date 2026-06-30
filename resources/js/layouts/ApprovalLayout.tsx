import type { PropsWithChildren, ReactNode } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe } from 'lucide-react';
import NotificationBell from '@/components/acceptra/NotificationBell';
import type { PageProps } from '@/types';

interface Props extends PropsWithChildren {
  /** Left column: PDF preview area */
  preview: ReactNode;
  /** Right column: Action panel */
  panel: ReactNode;
  documentId: string;
  backHref?: string;
}

export default function ApprovalLayout({ preview, panel, backHref = '/approvals' }: Props) {
  const { locale } = usePage<PageProps>().props;
  const { t } = useTranslation();

  function switchLanguage() {
    router.post('/profile/language', {
      preferred_language: locale === 'id' ? 'en' : 'id',
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Topbar — solid white, shadow-xs */}
      <header className="sticky top-0 z-[100] flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 shadow-xs">
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <img src="/images/logo.png" alt="Aviat Networks" className="h-5 w-auto object-contain" />

        <div className="flex-1" />

        <button
          onClick={switchLanguage}
          className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          aria-label={t('topbar.switch_language')}
        >
          <Globe className="h-4 w-4" />
          <span>{locale === 'id' ? 'ID' : 'EN'}</span>
        </button>
        <NotificationBell />
      </header>

      {/* 2-column body */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Document Preview — ≈58% */}
        <section className="flex-1 overflow-auto border-b border-[var(--color-border)] lg:border-b-0 lg:border-r p-4 lg:p-6">
          {preview}
        </section>

        {/* Action Panel — ≈42%, sticky on large screens */}
        <aside className="w-full lg:w-[42%] lg:max-w-[520px]">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-4 lg:p-6">
            {panel}
          </div>
        </aside>
      </div>
    </div>
  );
}
