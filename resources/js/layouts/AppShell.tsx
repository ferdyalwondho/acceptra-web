import { useState, useRef, useEffect, type PropsWithChildren } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/acceptra/NotificationBell';
import type { PageProps } from '@/types';
import {
  LayoutDashboard, FileText, GitBranch, Users, Inbox,
  History, Handshake, Settings, ChevronLeft, ChevronRight,
  Globe, Menu, UserCircle, PenLine, LogOut, HelpCircle,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  roles?: string[];
  exact?: boolean;
}

/* ─── Role helpers ─── */
const AVIAT_ROLES = ['super_admin', 'admin', 'viewer'];
const APPROVER_ROLES = ['approver_ms_bo', 'approver_ms_rts', 'approver_xls_rth_team', 'approver_xls_rth'];

function workspace(role: string): 'aviat' | 'partner' | 'approver' {
  if (AVIAT_ROLES.includes(role)) return 'aviat';
  if (APPROVER_ROLES.includes(role)) return 'approver';
  return 'partner';
}

/* ─── Nav definitions — labels resolved via t() at call site ─── */
function aviatNav(role: string, l1Badge: number, t: (k: string) => string): NavItem[] {
  return [
    { label: t('nav.dashboard'),     icon: <LayoutDashboard className="h-4.5 w-4.5" />, href: '/dashboard' },
    { label: t('nav.l1_approvals'),  icon: <Inbox className="h-4.5 w-4.5" />,           href: '/approvals',   badge: l1Badge, roles: ['super_admin', 'admin'] },
    { label: t('nav.documents'),     icon: <FileText className="h-4.5 w-4.5" />,        href: '/documents' },
    { label: t('nav.partners'),      icon: <Handshake className="h-4.5 w-4.5" />,       href: '/partners',    roles: ['super_admin', 'admin', 'viewer'] },
    { label: t('nav.templates_sow'), icon: <GitBranch className="h-4.5 w-4.5" />,       href: '/templates',   roles: ['super_admin', 'admin', 'viewer'] },
    { label: t('nav.users'),         icon: <Users className="h-4.5 w-4.5" />,           href: '/users',       roles: ['super_admin'] },
    { label: t('nav.settings'),      icon: <Settings    className="h-4.5 w-4.5" />,       href: '/settings/reminders', roles: ['super_admin'] },
  ].filter((item) => !item.roles || item.roles.includes(role));
}

function partnerNav(t: (k: string) => string): NavItem[] {
  return [
    { label: t('nav.dashboard'),    icon: <LayoutDashboard className="h-4.5 w-4.5" />, href: '/dashboard' },
    { label: t('nav.my_documents'), icon: <FileText        className="h-4.5 w-4.5" />, href: '/documents?scope=mine' },
  ];
}

function approverNav(badge: number, t: (k: string) => string): NavItem[] {
  return [
    { label: t('nav.dashboard'),     icon: <LayoutDashboard className="h-4.5 w-4.5" />, href: '/dashboard' },
    { label: t('nav.need_approval'), icon: <Inbox           className="h-4.5 w-4.5" />, href: '/approvals', badge, exact: true },
    { label: t('nav.history'),       icon: <History         className="h-4.5 w-4.5" />, href: '/approvals/history' },
  ];
}

/* ─── Nav link ─── */
function NavLink({ item, collapsed, allItems }: { item: NavItem; collapsed: boolean; allItems: NavItem[] }) {
  const path   = typeof window !== 'undefined' ? window.location.pathname : '';
  const search = typeof window !== 'undefined' ? window.location.search   : '';

  const [base, qs] = item.href.split('?') as [string, string | undefined];
  const itemQuery  = qs ? `?${qs}` : null;

  let active: boolean;
  if (itemQuery) {
    // Items with a query string require an exact path + query match
    active = path === base && search === itemQuery;
  } else {
    // Check whether another nav item's query-specific href is the current URL.
    // If so, this path-only item should not claim ownership of the base path.
    const queryItemOwns = allItems.some(other => {
      if (!other.href.includes('?')) return false;
      const [otherBase, otherQs] = other.href.split('?');
      return path === otherBase && search === `?${otherQs}`;
    });
    if (queryItemOwns) {
      // Only highlight when drilling into a sub-path (e.g. /documents/123)
      active = !item.exact && base !== '/dashboard' && path.startsWith(`${base}/`);
    } else {
      active = path === base || (!item.exact && base !== '/dashboard' && path.startsWith(`${base}/`));
    }
  }

  return <NavLinkInner item={item} collapsed={collapsed} active={active} />;
}

function NavLinkInner({ item, collapsed, active }: { item: NavItem; collapsed: boolean; active: boolean }) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[120ms]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        active
          ? 'bg-[var(--color-secondary-surface)] text-[var(--color-text-primary)] before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-r-full before:bg-brand-ink'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]',
        collapsed && 'justify-center px-2',
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge != null && item.badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand-ink px-1.5 text-[10px] font-bold text-white">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  );
}

/* ─── App Shell ─── */
export default function AppShell({ children }: PropsWithChildren) {
  const { auth, unreadNotifications = 0, recentNotifications = [], l1PendingCount = 0, locale } = usePage<PageProps>().props;
  const user = auth?.user ?? { name: 'User', email: '', role: 'admin', initials: 'U', preferred_language: 'id' as const };
  const ws = workspace(user.role);

  const { t } = useTranslation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Polling 30s untuk refresh badge + dropdown items (FR-NTF §9)
  useEffect(() => {
    const id = setInterval(() => {
      router.reload({
        only: ['unreadNotifications', 'recentNotifications'],
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const navItems: NavItem[] =
    ws === 'aviat'   ? aviatNav(user.role, l1PendingCount, t) :
    ws === 'partner' ? partnerNav(t) :
    approverNav(0, t);

  function switchLanguage() {
    router.post('/profile/language', {
      preferred_language: locale === 'id' ? 'en' : 'id',
    });
    // Server responds with Inertia::location() which forces a full browser reload,
    // reinitialising i18next with the new locale (FR-I18N sequence diagram)
  }

  /* ─── Sidebar content ─── */
  const sidebarContent = (
    <div className="flex h-full flex-col bg-[var(--color-bg-surface)]">
      {/* Logo */}
      <div className={cn('flex items-center px-4 py-4 border-b border-[var(--color-border)]', collapsed && 'justify-center px-2')}>
        {collapsed ? (
          <img src="/images/logo-mark.png" alt="Aviat Networks" className="h-6 w-auto object-contain" />
        ) : (
          <img src="/images/logo.png" alt="Aviat Networks" className="h-[52px] w-auto object-contain" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} allItems={navItems} />
        ))}
      </nav>

      {/* Help — pinned above collapse toggle */}
      <div className="border-t border-[var(--color-border)] px-2 py-2">
        <NavLink
          item={{ label: t('nav.help'), icon: <HelpCircle className="h-4.5 w-4.5" />, href: '/help' }}
          collapsed={collapsed}
          allItems={[]}
        />
      </div>

      {/* Collapse toggle (desktop) */}
      <div className="hidden border-t border-[var(--color-border)] p-2 md:block">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-center rounded-md p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  /* ─── Role label ─── */
  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin', admin: 'Admin', viewer: 'Viewer', partner: 'Partner',
    approver_ms_bo: 'Approver · MS BO', approver_ms_rts: 'Approver · MS RTS',
    approver_xls_rth_team: 'Approver · RTH Team', approver_xls_rth: 'Approver · RTH',
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-canvas)]">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col flex-none border-r border-[var(--color-border)]',
          'sticky top-0 h-screen',
          'transition-[width] duration-[260ms]',
          collapsed ? 'w-[64px]' : 'w-64',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[350] bg-[rgba(17,24,39,.45)] md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-[400] w-64 border-r border-[var(--color-border)] md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-[100] flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 shadow-xs">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t('topbar.open_menu')}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Right */}
          <div className="flex items-center gap-1">
            {/* Language switcher */}
            <button
              onClick={switchLanguage}
              className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              aria-label={t('topbar.switch_language')}
            >
              <Globe className="h-4 w-4" />
              <span>{locale === 'id' ? 'ID' : 'EN'}</span>
            </button>

            <NotificationBell unreadCount={unreadNotifications} items={recentNotifications} />

            {/* Avatar */}
            <div ref={avatarRef} className="relative ml-1">
              <button
                onClick={() => setAvatarOpen((v) => !v)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-surface)] text-xs font-semibold text-brand-ink',
                  'ring-2 ring-transparent transition-all hover:ring-brand/40 focus-visible:outline-none focus-visible:ring-brand/40',
                  avatarOpen && 'ring-brand/40',
                )}
                aria-label="Account menu"
                aria-expanded={avatarOpen}
                title={user.name}
              >
                {user.initials}
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-10 z-[200] w-56 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-md">
                  <div className="border-b border-[var(--color-border)] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{user.name}</p>
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">{user.email}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{roleLabel[user.role] ?? user.role}</p>
                  </div>
                  <nav className="py-1">
                    <Link href="/profile" onClick={() => setAvatarOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors">
                      <UserCircle className="h-4 w-4 text-[var(--color-text-secondary)]" />
                      {t('avatar.my_profile')}
                    </Link>
                    {user.role !== 'partner' && user.role !== 'admin' && user.role !== 'super_admin' && (
                      <Link href="/profile/signature" onClick={() => setAvatarOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors">
                        <PenLine className="h-4 w-4 text-[var(--color-text-secondary)]" />
                        {t('avatar.saved_signature')}
                      </Link>
                    )}
                    <div className="my-1 border-t border-[var(--color-border)]" />
                    <Link href="/logout" method="post" as="button" onClick={() => setAvatarOpen(false)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger-surface transition-colors">
                      <LogOut className="h-4 w-4" />
                      {t('avatar.logout')}
                    </Link>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/* Re-export convenience components */
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
