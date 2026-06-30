import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/layouts/AppShell';
import {
  CheckCheck, Inbox, CheckCircle2, XCircle, ClipboardList,
  Users, Clock, Upload, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationRecord, NotificationTypeValue, PageProps } from '@/types';

interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

interface NotificationsPage {
  data: NotificationRecord[];
  links: PaginationLink[];
  meta: {
    total: number;
    unread_count: number;
    current_page: number;
    last_page: number;
  };
}

interface Props extends PageProps {
  notifications: NotificationsPage;
}

const TYPE_META: Record<NotificationTypeValue, { icon: React.ReactNode; color: string; bg: string }> = {
  submission:        { icon: <Upload className="h-4 w-4" />,        color: 'text-info',    bg: 'bg-info-surface' },
  approval_turn:     { icon: <Inbox className="h-4 w-4" />,         color: 'text-info',    bg: 'bg-info-surface' },
  approved:          { icon: <CheckCircle2 className="h-4 w-4" />,  color: 'text-success', bg: 'bg-success-surface' },
  rejected:          { icon: <XCircle className="h-4 w-4" />,       color: 'text-danger',  bg: 'bg-danger-surface' },
  flow_completed:    { icon: <CheckCircle2 className="h-4 w-4" />,  color: 'text-success', bg: 'bg-success-surface' },
  punchlist_revised: { icon: <ClipboardList className="h-4 w-4" />, color: 'text-warning', bg: 'bg-warning-surface' },
  reassigned:        { icon: <Users className="h-4 w-4" />,         color: 'text-ming',    bg: 'bg-info-surface' },
  result_partner:    { icon: <FileText className="h-4 w-4" />,      color: 'text-info',    bg: 'bg-info-surface' },
  reminder:          { icon: <Clock className="h-4 w-4" />,         color: 'text-warning', bg: 'bg-warning-surface' },
};

export default function NotificationsIndex({ notifications }: Props) {
  const { t } = useTranslation();
  const { data, links, meta } = notifications;
  const unread = meta.unread_count;

  function markRead(id: string) {
    router.post(
      `/notifications/${id}/read`,
      {},
      { preserveScroll: true },
    );
  }

  function markAllRead() {
    router.post(
      '/notifications/read-all',
      {},
      { preserveScroll: true },
    );
  }

  return (
    <AppShell>
      <Head title={t('notifications.title')} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {t('notifications.title')}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {unread > 0
              ? t('notifications.subtitle_unread', { count: unread })
              : t('notifications.subtitle_all_read')}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium hover:bg-muted transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            {t('notifications.mark_all_read')}
          </button>
        )}
      </div>

      <div className="max-w-2xl space-y-2">
        {data.map((n) => {
          const meta = TYPE_META[n.type] ?? TYPE_META['submission'];
          return (
            <Link
              key={n.id}
              href={n.action_url ?? '/notifications'}
              onClick={() => markRead(n.id)}
              className={cn(
                'flex items-start gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-xs transition-colors duration-[120ms] hover:bg-[var(--color-bg-subtle)]',
                !n.is_read && 'border-l-[3px] border-l-brand-ink',
              )}
            >
              <span className={cn('mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', meta.bg, meta.color)}>
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    'text-sm font-semibold',
                    !n.is_read ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]',
                  )}>
                    {n.title}
                  </p>
                  <span className="flex-shrink-0 font-mono text-[11px] text-[var(--color-text-tertiary)]">
                    {n.created_at}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">{n.body}</p>
              </div>
              {!n.is_read && (
                <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}

        {data.length === 0 && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
            <h3 className="font-semibold">{t('notifications.empty_title')}</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('notifications.empty_body')}</p>
          </div>
        )}

        {/* Pagination */}
        {notifications.meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-1 pt-4">
            {links.map((link, i) => {
              if (!link.url) {
                return (
                  <span
                    key={i}
                    className="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm text-[var(--color-text-tertiary)]"
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                );
              }
              return (
                <Link
                  key={i}
                  href={link.url}
                  className={cn(
                    'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors',
                    link.active
                      ? 'bg-brand-ink text-white font-semibold'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]',
                  )}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
