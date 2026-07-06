import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import DocumentCard, { type DocumentCardData } from '@/components/acceptra/DocumentCard';
import { Inbox, History } from 'lucide-react';

interface Props {
  approvals?: DocumentCardData[];
}

export default function ApprovalsIndex({ approvals = [] }: Props) {
  const { t } = useTranslation();

  return (
    <AppShell>
      <Head title={t('approvals.index_page_title')} />

      <PageHeader
        title={t('approvals.index_heading')}
        description={t('approvals.index_description')}
        action={
          <Link
            href="/approvals/history"
            className="flex items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          >
            <History className="h-4 w-4" /> {t('approvals.btn_history')}
          </Link>
        }
      />

      {approvals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16 text-center shadow-xs">
          <Inbox className="mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">{t('approvals.empty_title')}</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('approvals.empty_body')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approvals.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              href={doc.needsRouting ? `/documents/${doc.id}` : `/documents/${doc.id}/approval`}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
