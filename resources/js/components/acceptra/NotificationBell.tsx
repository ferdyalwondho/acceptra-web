import { useState, useRef, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationRecord } from '@/types';

interface Props {
  unreadCount?: number;
  items?: NotificationRecord[];
}

export default function NotificationBell({ unreadCount = 0, items = [] }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleMarkAllRead(e: React.MouseEvent) {
    e.preventDefault();
    router.post(
      '/notifications/read-all',
      {},
      {
        preserveState: true,
        preserveScroll: true,
        only: ['unreadNotifications', 'recentNotifications'],
      },
    );
  }

  function handleItemClick(id: string) {
    setOpen(false);
    router.post(`/notifications/${id}/read`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('notifications.bell_label')}
        aria-expanded={open}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg',
          'text-[var(--color-text-secondary)] transition-colors duration-[120ms]',
          'hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
          open && 'bg-[var(--color-bg-subtle)]',
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-brand-ink px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-[200] w-80 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t('notifications.bell_header')}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-brand-ink hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t('notifications.mark_all_read')}
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-text-tertiary)]">
                {t('notifications.no_items')}
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-sm text-left transition-colors',
                    'hover:bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] last:border-b-0',
                    !item.is_read && 'bg-[var(--color-bg-subtle)]',
                  )}
                >
                  {!item.is_read && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-ink" />
                  )}
                  <div className={cn('flex-1 min-w-0', item.is_read && 'ml-[18px]')}>
                    <p className="font-medium text-[var(--color-text-primary)] line-clamp-1">{item.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mt-0.5">{item.body}</p>
                    <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] mt-1">{item.created_at}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border)] px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-ming hover:underline"
            >
              {t('notifications.see_all')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
