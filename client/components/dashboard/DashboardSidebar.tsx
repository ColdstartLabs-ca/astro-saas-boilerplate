'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  Layers,
  Search,
  CheckCircle2,
  Calendar as CalendarIcon,
  Link2,
  BarChart2,
  Settings,
  LogOut,
  Shield,
  X,
} from 'lucide-react';
import { dashboardNavigate, onDashboardNavigate } from '@client/utils/dashboardNavigation';
import { useUserStore, useIsAdmin } from '@client/store/userStore';
import { useLogger } from '@client/utils/logger';
import { cn } from '@client/utils/cn';
import { getTranslations } from '@src/i18n/utils';
import { ProjectSelector } from '@client/components/projects/ProjectSelector';
import { ProjectOnboarding } from '@client/components/projects/ProjectOnboarding';

interface ISidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface IDashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const DashboardSidebar: React.FC<IDashboardSidebarProps> = ({ isOpen, onClose }) => {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const { signOut, user } = useUserStore();
  const isAdmin = useIsAdmin();
  const logger = useLogger('DashboardSidebar');

  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/dashboard'
  );
  useEffect(() => {
    return onDashboardNavigate(setPathname);
  }, []);

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);

  const primaryItems: ISidebarItem[] = [
    { label: t('sidebar.overview'), href: '/dashboard', icon: LayoutGrid },
    { label: t('sidebar.campaigns'), href: '/dashboard/campaigns', icon: Layers },
    { label: t('sidebar.keywords'), href: '/dashboard/keywords', icon: Search },
    { label: t('sidebar.optimization'), href: '/dashboard/optimization', icon: CheckCircle2 },
    { label: t('sidebar.calendar'), href: '/dashboard/calendar', icon: CalendarIcon },
    { label: t('sidebar.backlinks'), href: '/dashboard/backlinks', icon: Link2 },
    { label: t('sidebar.analytics'), href: '/dashboard/analytics', icon: BarChart2 },
  ];

  const accountItems: ISidebarItem[] = [
    { label: t('sidebar.settings'), href: '/dashboard/settings', icon: Settings },
  ];

  if (isAdmin) {
    accountItems.push({ label: t('sidebar.admin'), href: '/dashboard/admin', icon: Shield });
  }

  const normalizedPathname =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return normalizedPathname === '/dashboard';
    }
    return normalizedPathname.startsWith(href);
  };

  const handleNavigation = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      onClose?.();
      // Non-dashboard links get a full page load
      if (!href.startsWith('/dashboard')) {
        window.location.href = href;
        return;
      }
      dashboardNavigate(href);
    },
    [onClose]
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect is handled by auth state change listener in userStore.ts
    } catch (error) {
      logger.error('Error signing out', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userEmail: user?.email,
      });
    }
  };

  return (
    <>
      {/* Backdrop - Mobile only */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base styles
          'flex flex-col w-64 min-h-screen bg-surface border-r border-border',
          // Desktop: static positioning
          'hidden md:flex',
          // Mobile: drawer positioning
          isOpen && 'fixed inset-y-0 left-0 z-50 flex md:relative',
          // Animation
          'transition-transform duration-200 ease-in-out',
          !isOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Close button - Mobile only */}
        {isOpen && onClose && (
          <button
            className="md:hidden absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-surface-light transition-colors"
            onClick={onClose}
            aria-label={t('sidebar.closeMenu')}
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Logo/Brand */}
        <div className="px-4 py-5 border-b border-border">
          <a href="/" className="inline-flex items-center" onClick={e => handleNavigation(e, '/')}>
            <img
              src="/logo/horizontal-logo-compact.png"
              alt="AutopilotRank"
              className="h-8 w-auto"
            />
          </a>
        </div>

        {/* Active Project */}
        <div className="border-b border-border pb-2">
          <ProjectSelector onOpenOnboarding={() => setShowOnboarding(true)} />
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {primaryItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={e => handleNavigation(e, item.href)}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left',
                  active
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-secondary hover:bg-surface-light hover:text-white'
                )}
              >
                <Icon size={20} className={cn('mr-3', active ? 'text-white' : 'text-secondary')} />
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Account Navigation */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          {accountItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={e => handleNavigation(e, item.href)}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-secondary hover:bg-surface-light hover:text-white'
                )}
              >
                <Icon size={20} className={cn('mr-3', active ? 'text-accent' : 'text-secondary')} />
                {item.label}
              </a>
            );
          })}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-secondary hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
          >
            <LogOut size={20} className="mr-3" />
            {t('sidebar.signOut')}
          </button>
        </div>
      </aside>

      {/* Onboarding Modal */}
      <ProjectOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </>
  );
};
