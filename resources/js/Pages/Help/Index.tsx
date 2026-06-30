import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, HelpCircle, BookOpen } from 'lucide-react';
import AppShell, { PageHeader } from '@/layouts/AppShell';
import { cn } from '@/lib/utils';
import { FAQ, GUIDE, type RoleGroup, type GuideSection } from '@/data/helpContent';

interface Props {
  roleGroup: RoleGroup;
}

type Tab = 'faq' | 'guide';

function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              aria-expanded={isOpen}
            >
              <span>{t(item.q)}</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-150',
                  isOpen && 'rotate-180',
                )}
              />
            </button>
            {isOpen && (
              <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                {t(item.a)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GuidePanel({ sections }: { sections: GuideSection[] }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  const section = sections[selected] ?? sections[0];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      {/* Desktop: vertical left-nav */}
      <nav className="hidden md:flex md:w-48 md:shrink-0 md:flex-col md:gap-0.5">
        {sections.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              'relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              selected === i
                ? 'bg-[var(--color-secondary-surface)] text-[var(--color-text-primary)] before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-r-full before:bg-brand-ink'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {t(s.title)}
          </button>
        ))}
      </nav>

      {/* Mobile: horizontal pill tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {sections.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              selected === i
                ? 'border-brand-ink bg-brand-ink text-white'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {t(s.title)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-6 py-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-ink text-xs font-bold text-white">
            {selected + 1}
          </span>
          <h3 className="font-semibold text-[var(--color-text-primary)]">{t(section.title)}</h3>
        </div>

        <ol className="divide-y divide-[var(--color-border)]">
          {section.steps.map((step, j) => {
            const img = section.stepImages[j];
            return (
              <li key={j} className="p-6 space-y-3">
                <div className="flex gap-3 text-sm text-[var(--color-text-secondary)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-xs font-medium text-[var(--color-text-primary)]">
                    {j + 1}
                  </span>
                  {t(step)}
                </div>
                {img && (
                  <div className="ml-8 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                    <img
                      src={img}
                      alt={`${t(section.title)} — step ${j + 1}`}
                      className="w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export default function HelpIndex({ roleGroup }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('faq');

  const faqItems   = FAQ[roleGroup]   ?? FAQ.partner;
  const guideSections = GUIDE[roleGroup] ?? GUIDE.partner;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'faq',   label: t('help.tab_faq'),   icon: <HelpCircle className="h-4 w-4" /> },
    { id: 'guide', label: t('help.tab_guide'),  icon: <BookOpen   className="h-4 w-4" /> },
  ];

  return (
    <AppShell>
      <Head title={t('help.page_title')} />

      <PageHeader
        title={t('help.heading')}
        description={t('help.description')}
      />

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              activeTab === tab.id
                ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-3xl pb-12">
        {activeTab === 'faq'   && <FaqAccordion   items={faqItems} />}
        {activeTab === 'guide' && <GuidePanel sections={guideSections} />}
      </div>
    </AppShell>
  );
}
