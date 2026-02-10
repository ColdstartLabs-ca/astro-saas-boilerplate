'use client';

import { useEffect, useState } from 'react';
import { DashboardSidebar } from '@client/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@client/components/dashboard/DashboardHeader';
import { DashboardRouter } from '@client/components/dashboard/DashboardRouter';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { useLowCreditWarning } from '@client/hooks/useLowCreditWarning';
import { useUserStore } from '@client/store/userStore';
import { useShallow } from 'zustand/react/shallow';
import { Menu } from 'lucide-react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clientEnv, getAppLogoAbbr } from '@shared/config/env';
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
