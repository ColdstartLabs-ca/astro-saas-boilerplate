'use client';

import { BrandLink } from '@client/components/logo/BrandLink';
import { ProjectOnboarding } from '@client/components/projects/ProjectOnboarding';
import { ProjectSelector } from '@client/components/projects/ProjectSelector';
import {
  getRoutesByGroup,
  isPathActive,
  type IDashboardRoute,
} from '@client/config/dashboardRoutes';
import { usePendingActions } from '@client/hooks/usePendingActions';
import { useIsAdmin, useUserStore } from '@client/store/userStore';
import { cn } from '@client/utils/cn';
import {
  dashboardNavigate,
  onDashboardNavigate,
  stripLocalePrefix,
} from '@client/utils/dashboardNavigation';
import { useLogger } from '@client/utils/logger';
import { getTranslations, type TFunction } from '@src/i18n/utils';
import { LogOut, X, Badge } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface IDashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Render a single sidebar menu item
 */
function SidebarItem({
  route,
  pathname,
  onNavigate,
  t,
  showBadge,
}: {
  route: IDashboardRoute;
  pathname: string;
  onNavigate: (href: string) => void;
  t: TFunction;
  showBadge?: boolean;
}): JSX.Element {
  const Icon = route.icon;
  const isActive = isPathActive(pathname, route.path);
  const isEnabled = route.enabled !== false;
  const label = t(route.labelKey);

  if (!isEnabled) {
    return (
      <span className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted cursor-not-allowed opacity-50">
        <span className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-muted" />
          <span>{label}</span>
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted bg-surface-light px-1.5 py-0.5 rounded">
          Soon
        </span>
      </span>
    );
  }

  return (
    <a
      href={route.path}
      onClick={e => {
        e.preventDefault();
        onNavigate(route.path);
      }}
      className={cn(
        'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left',
        isActive
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-900'
          : 'text-secondary hover:bg-surface-light hover:text-white'
      )}
    >
      <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-secondary')} />
      <span className="flex-1">{label}</span>
      {showBadge && <Badge className="w-5 h-5 flex-shrink-0 animate-pulse" />}
    </a>
  );
}

export const DashboardSidebar: React.FC<IDashboardSidebarProps> = ({ isOpen, onClose }) => {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const { signOut, user } = useUserStore();
  const isAdmin = useIsAdmin();
  const logger = useLogger('DashboardSidebar');
  const { hasCampaigns, skippedIntegrations, isOnboardingComplete } = usePendingActions();

  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? stripLocalePrefix(window.location.pathname) : '/dashboard'
  );
  useEffect(() => {
    return onDashboardNavigate(setPathname);
  }, []);

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Determine which routes should show badges
  const getShowBadge = (path: string) => {
    if (!isOnboardingComplete) return false;
    if (path === '/dashboard/campaigns') return !hasCampaigns;
    if (path === '/dashboard/integrations') return skippedIntegrations;
    return false;
  };

  // Get routes from centralized config
  const primaryItems = useMemo(() => getRoutesByGroup('primary'), []);
  const secondaryItems = useMemo(() => getRoutesByGroup('secondary'), []);
  const bottomItems = useMemo(() => getRoutesByGroup('bottom'), []);
  const adminItems = useMemo(() => (isAdmin ? getRoutesByGroup('admin') : []), [isAdmin]);

  const handleNavigation = useCallback(
    (href: string) => {
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
        <div className="p-6 border-b border-border">
          <BrandLink variant="full" />
        </div>

        {/* Active Project Selector */}
        <ProjectSelector onOpenOnboarding={() => setShowOnboarding(true)} />

        {/* Primary Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {primaryItems.map(item => (
            <SidebarItem
              key={item.path}
              route={item}
              pathname={pathname}
              onNavigate={handleNavigation}
              t={t}
              showBadge={getShowBadge(item.path)}
            />
          ))}

          {/* Separator */}
          <div className="border-t border-border my-2" />

          {/* Secondary Navigation */}
          {[...secondaryItems, ...adminItems].map(item => (
            <SidebarItem
              key={item.path}
              route={item}
              pathname={pathname}
              onNavigate={handleNavigation}
              t={t}
            />
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          {bottomItems.map(item => (
            <SidebarItem
              key={item.path}
              route={item}
              pathname={pathname}
              onNavigate={handleNavigation}
              t={t}
            />
          ))}

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5 text-secondary" />
            <span>{t('sidebar.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Onboarding Modal */}
      <ProjectOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </>
  );
};
