'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  Shield,
  X,
  Loader2,
} from 'lucide-react';
import { useUserStore, useIsAdmin, useSubscription } from '@client/store/userStore';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { Logo } from '@client/components/logo/Logo';
import { getPlanDisplayName } from '@shared/config/stripe';
import { useLogger } from '@client/utils/logger';
import { cn } from '@client/utils/cn';
import { getTranslations } from '@src/i18n/utils';
import { LocaleSwitcher } from '@client/components/i18n/LocaleSwitcher';
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

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);

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
        <div className="p-4 border-b border-border flex items-center justify-between">
          <a href="/" className="flex items-center">
            <Logo variant="compact" />
          </a>
          <LocaleSwitcher />
        </div>

        {/* Project & User Section - Combined */}
        <div className="p-4 border-b border-border space-y-4">
          {/* Active Project Selector */}
          <ProjectSelector onOpenOnboarding={() => setShowOnboarding(true)} />

          {/* Credits Display */}
          <CreditsDisplay />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Secondary Navigation - Account Management */}
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

          {/* User Info & Sign Out */}
          <div className="border-t border-border my-2 pt-3">
            {/* User Info - Compact */}
            <div className="flex items-center gap-2 px-1 mb-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/30 to-tertiary/30 flex items-center justify-center shrink-0">
                <span className="text-accent font-semibold text-xs">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted truncate">{planDisplayName}</p>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
            >
              <LogOut size={16} className="mr-2" />
              {t('sidebar.signOut')}
            </button>
          </div>
        </div>
      </aside>

      {/* Onboarding Modal */}
      <ProjectOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </>
  );
};
