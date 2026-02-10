'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { DashboardSidebar } from '@client/components/dashboard/DashboardSidebar';
import { DashboardRouter } from '@client/components/dashboard/DashboardRouter';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { useLowCreditWarning } from '@client/hooks/useLowCreditWarning';
import { useUserStore, useSubscription } from '@client/store/userStore';
import { useShallow } from 'zustand/react/shallow';
import { getPlanDisplayName } from '@shared/config/stripe';
import { dashboardNavigate, onDashboardNavigate } from '@client/utils/dashboardNavigation';
import { Menu, Bell, User, Settings, CreditCard, LogOut, Sparkles } from 'lucide-react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clientEnv, getAppLogoAbbr } from '@shared/config/env';
import { getTranslations } from '@src/i18n/utils';
import { LocaleSwitcher } from '@client/components/i18n/LocaleSwitcher';
import { getBreadcrumbLabelKey } from '@client/config/dashboardRoutes';
import { Toast } from '@client/components/common/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Grace period to allow auth state to settle after OAuth redirect
const AUTH_GRACE_PERIOD_MS = 500;
// Minimum interval between credit refreshes (30 seconds)
const MIN_REFRESH_INTERVAL_MS = 30_000;

// Derive breadcrumb label from pathname using centralized route config
function getBreadcrumbLabel(pathname: string, t: ReturnType<typeof getTranslations>): string {
  const labelKey = getBreadcrumbLabelKey(pathname);
  const label = t(labelKey);
  // Fallback to capitalized segment if translation missing
  if (label === labelKey) {
    const segment = pathname.replace('/dashboard', '').replace(/^\//, '') || 'overview';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }
  return label;
}

// Desktop top header bar
function DashboardHeader(): JSX.Element {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const { user, signOut } = useUserStore();
  const subscription = useSubscription();
  const planDisplayName = getPlanDisplayName({
    subscriptionTier: user?.profile?.subscription_tier,
    priceId: subscription?.price_id,
  });
  const [pathname, setPathname] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPathname(window.location.pathname);
    return onDashboardNavigate(setPathname);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuNav = useCallback((href: string) => {
    setUserMenuOpen(false);
    dashboardNavigate(href);
  }, []);

  const handleSignOut = useCallback(async () => {
    setUserMenuOpen(false);
    await signOut();
  }, [signOut]);

  const breadcrumb = getBreadcrumbLabel(pathname, t);

  return (
    <header className="hidden md:flex h-16 border-b border-border bg-surface/50 backdrop-blur-sm items-center justify-between px-6 shrink-0 relative z-10">
      <div className="flex text-sm text-secondary">
        <span className="text-muted mr-2">/</span>
        <span>{breadcrumb}</span>
      </div>

      <div className="flex items-center space-x-4">
        <LocaleSwitcher />
        <button className="text-secondary hover:text-white relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(prev => !prev)}
            className="w-8 h-8 bg-gradient-to-br from-accent/30 to-tertiary/30 rounded-full border border-border flex items-center justify-center text-accent font-semibold text-sm hover:ring-2 hover:ring-accent/30 transition-all"
          >
            {user?.email?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl z-[100] py-1">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
                <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                  {planDisplayName}
                </span>
              </div>

              {/* Credits */}
              <div className="px-4 py-2.5 border-b border-border">
                <CreditsDisplay />
              </div>

              {/* Upgrade CTA for free users */}
              {!user?.profile?.subscription_tier && (
                <div className="px-4 py-2.5 border-b border-border">
                  <button
                    onClick={() => handleMenuNav('/dashboard/billing')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('header.upgradeToPro')}
                  </button>
                </div>
              )}

              <button
                onClick={() => handleMenuNav('/dashboard/settings')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-light hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4 mr-3" />
                {t('sidebar.settings')}
              </button>
              <button
                onClick={() => handleMenuNav('/dashboard/billing')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-light hover:text-white transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-3" />
                {t('sidebar.billing')}
              </button>

              <div className="border-t border-border my-1" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                {t('sidebar.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DashboardLayout(): JSX.Element {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading, userId, lastFetched, fetchUserData } = useUserStore(
    useShallow(state => ({
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      userId: state.user?.id ?? null,
      lastFetched: state.lastFetched,
      fetchUserData: state.fetchUserData,
    }))
  );
  // Skip grace period if already authenticated (Zustand persists as module singleton)
  const [authGracePeriodElapsed, setAuthGracePeriodElapsed] = useState(isAuthenticated);

  useLowCreditWarning();

  // Refresh user data when entering dashboard
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const shouldRefresh = !lastFetched || Date.now() - lastFetched > MIN_REFRESH_INTERVAL_MS;
    if (shouldRefresh) {
      fetchUserData(userId);
    }
  }, [isAuthenticated, userId, lastFetched, fetchUserData]);

  // Start grace period timer on mount
  useEffect(() => {
    const timer = setTimeout(() => setAuthGracePeriodElapsed(true), AUTH_GRACE_PERIOD_MS);
    return () => clearTimeout(timer);
  }, []);

  // Check for test environment
  const isTestEnv =
    typeof window !== 'undefined' && (window as unknown as { __TEST_ENV__?: boolean }).__TEST_ENV__;

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isTestEnv && authGracePeriodElapsed && !isLoading && !isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated, isLoading, authGracePeriodElapsed, isTestEnv]);

  // Show loading while checking auth
  const shouldShowLoading =
    !isTestEnv && (isLoading || (!isAuthenticated && !authGracePeriodElapsed));
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  // Don't render while not authenticated (redirect in progress)
  if (!isTestEnv && !isAuthenticated) {
    return <></>;
  }

  return (
    <div className="flex min-h-screen bg-main">
      {/* Toast Notifications */}
      <Toast vertical="bottom" horizontal="end" />

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{getAppLogoAbbr()}</span>
            </div>
            <span className="font-semibold text-white">{clientEnv.APP_NAME}</span>
          </div>
          <div className="flex-1 flex justify-center max-w-[150px]">
            <div className="scale-90 origin-center">
              <CreditsDisplay />
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-surface-light transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      <DashboardSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-h-0 pt-16 md:pt-0">
        <DashboardHeader />
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <DashboardRouter />
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardLayoutWithProviders(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayout />
    </QueryClientProvider>
  );
}

export { DashboardLayoutWithProviders as DashboardLayout };
// eslint-disable-next-line import/no-default-export -- Required for Astro island import
export default DashboardLayoutWithProviders;
