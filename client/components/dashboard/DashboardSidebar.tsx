'use client';

import React from 'react';
import {
  LayoutGrid,
  Layers,
  Search,
  CheckCircle2,
  Calendar as CalendarIcon,
  Link2,
  BarChart2,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  Shield,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useUserStore, useIsAdmin, useSubscription } from '@client/store/userStore';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { Logo } from '@client/components/logo/Logo';
import { getPlanDisplayName } from '@shared/config/stripe';
import { useLogger } from '@client/utils/logger';
import { cn } from '@client/utils/cn';
import { getTranslations } from '@src/i18n/utils';
import { useMemo, useState, useEffect } from 'react';
import { LocaleSwitcher } from '@client/components/i18n/LocaleSwitcher';

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
  const { signOut, user, isLoading, error } = useUserStore();
  const isAdmin = useIsAdmin();
  const subscription = useSubscription();
  const logger = useLogger('DashboardSidebar');

  // Get current pathname from window.location
  const [pathname, setPathname] = useState('');
  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  // Check if profile data is still loading (but not if there's an error)
  const isProfileLoading = isLoading || (user && !user.profile && !error);

  // Resolve subscription to plan name - prioritize profile's subscription_tier
  const planDisplayName = getPlanDisplayName({
    subscriptionTier: user?.profile?.subscription_tier,
    priceId: subscription?.price_id,
  });

  // Active site name (placeholder — will be fetched from user data in future)
  const [siteName] = useState('');

  // Primary nav — AutopilotRank-specific views
  const primaryItems: ISidebarItem[] = [
    { label: t('sidebar.overview'), href: '/dashboard', icon: LayoutGrid },
    { label: t('sidebar.campaigns'), href: '/dashboard/campaigns', icon: Layers },
    { label: t('sidebar.keywords'), href: '/dashboard/keywords', icon: Search },
    { label: t('sidebar.optimization'), href: '/dashboard/optimization', icon: CheckCircle2 },
    { label: t('sidebar.calendar'), href: '/dashboard/calendar', icon: CalendarIcon },
    { label: t('sidebar.backlinks'), href: '/dashboard/backlinks', icon: Link2 },
    { label: t('sidebar.analytics'), href: '/dashboard/analytics', icon: BarChart2 },
  ];

  // Secondary nav — account management
  const secondaryItems: ISidebarItem[] = [
    { label: t('sidebar.billing'), href: '/dashboard/billing', icon: CreditCard },
    { label: t('sidebar.settings'), href: '/dashboard/settings', icon: Settings },
  ];

  // Add Admin menu item if user is admin
  if (isAdmin) {
    secondaryItems.push({ label: t('sidebar.admin'), href: '/dashboard/admin', icon: Shield });
  }

  const bottomMenuItems: ISidebarItem[] = [
    { label: t('sidebar.helpSupport'), href: '/help', icon: HelpCircle },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

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

  const handleNavigation = (href: string) => {
    window.location.href = href;
    // Close drawer on mobile after navigation
    if (onClose) {
      onClose();
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
        <div className="p-6 border-b border-border flex items-center justify-between">
          <a href="/" className="flex items-center">
            <Logo variant="compact" />
          </a>
          <LocaleSwitcher />
        </div>

        {/* Active Site Selector */}
        <div className="px-4 pt-4 pb-2">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">
            {t('sidebar.activeSite')}
          </div>
          <button
            className="w-full bg-surface-light hover:bg-elevated transition-colors border border-border rounded-lg p-3 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded bg-accent/20 text-accent flex items-center justify-center font-bold text-sm shrink-0">
                {siteName ? siteName.charAt(0) : '?'}
              </div>
              <div className="truncate text-left">
                <div className="text-sm font-medium text-white truncate">
                  {siteName || t('sidebar.noSiteConnected')}
                </div>
                <div className="text-xs text-muted group-hover:text-secondary">
                  {t('sidebar.manageSites')}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-muted shrink-0" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/30 to-tertiary/30 flex items-center justify-center ring-1 ring-accent/20">
              <span className="text-accent font-semibold text-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                {isAdmin && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">
                    {t('sidebar.admin')}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                {isProfileLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : error ? (
                  t('planUnavailable')
                ) : (
                  planDisplayName
                )}
              </span>
            </div>
          </div>
          {/* Credits Display */}
          <div className="mt-3">
            <CreditsDisplay />
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {primaryItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left',
                  active
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-secondary hover:bg-surface-light hover:text-white'
                )}
              >
                <Icon
                  size={20}
                  className={cn('mr-3', active ? 'text-white' : 'text-secondary')}
                />
                {item.label}
              </button>
            );
          })}

          {/* Separator */}
          <div className="border-t border-border my-2" />

          {/* Secondary Navigation */}
          {secondaryItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-secondary hover:bg-surface-light hover:text-white'
                )}
              >
                <Icon
                  size={20}
                  className={cn('mr-3', active ? 'text-accent' : 'text-secondary')}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          {bottomMenuItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-secondary hover:bg-surface-light hover:text-white'
                )}
              >
                <Icon
                  size={20}
                  className={cn('mr-3', active ? 'text-accent' : 'text-secondary')}
                />
                {item.label}
              </button>
            );
          })}

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-secondary hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
          >
            <LogOut size={20} className="mr-3 text-secondary" />
            {t('sidebar.signOut')}
          </button>
        </div>
      </aside>
    </>
  );
};
