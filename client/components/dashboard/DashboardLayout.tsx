'use client';

import { useEffect, useState } from 'react';
import { DashboardSidebar } from '@client/components/dashboard/DashboardSidebar';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { useLowCreditWarning } from '@client/hooks/useLowCreditWarning';
import { useUserStore } from '@client/store/userStore';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import React from 'react';
import { clientEnv, getAppLogoAbbr } from '@shared/config/env';

// Grace period to allow auth state to settle after OAuth redirect
const AUTH_GRACE_PERIOD_MS = 500;
// Minimum interval between credit refreshes (30 seconds)
const MIN_REFRESH_INTERVAL_MS = 30_000;

interface IDashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<IDashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading, user, lastFetched, fetchUserData } = useUserStore();
  const router = useRouter();
  const [authGracePeriodElapsed, setAuthGracePeriodElapsed] = useState(false);

  // Initialize low credit warning for authenticated users
  useLowCreditWarning();

  // Refresh user data (including credits) when entering dashboard
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const shouldRefresh = !lastFetched || Date.now() - lastFetched > MIN_REFRESH_INTERVAL_MS;
    if (shouldRefresh) {
      fetchUserData(user.id);
    }
  }, [isAuthenticated, user?.id, lastFetched, fetchUserData]);

  // Start grace period timer on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthGracePeriodElapsed(true);
    }, AUTH_GRACE_PERIOD_MS);
    return () => clearTimeout(timer);
  }, []);

  // Check for test environment (window.__TEST_ENV__ is set by tests)
  const isTestEnv =
    typeof window !== 'undefined' && (window as unknown as { __TEST_ENV__?: boolean }).__TEST_ENV__;

  // Only redirect after grace period has elapsed (gives onAuthStateChange time to fire)
  // Skip redirect in test environment - let tests handle navigation
  useEffect(() => {
    if (!isTestEnv && authGracePeriodElapsed && !isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router, authGracePeriodElapsed, isTestEnv]);

  // In test environment, skip the loading check and render immediately
  // This allows tests to proceed without waiting for auth state
  if (isTestEnv) {
    return (
      <div className="flex min-h-screen bg-main">
        {/* Mobile Header */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border">
          <div className="flex items-center justify-between gap-3 px-4 h-14">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{getAppLogoAbbr()}</span>
              </div>
              <span className="font-semibold text-white">{clientEnv.APP_NAME}</span>
            </div>

            {/* Credits Display */}
            <div className="flex-1 flex justify-center max-w-[150px]">
              <div className="scale-90 origin-center">
                <CreditsDisplay />
              </div>
            </div>

            {/* Hamburger Menu */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-surface-light transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* Sidebar - Desktop: static, Mobile: drawer */}
        <DashboardSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto pt-14 md:pt-0">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    );
  }

  // Show loading while checking auth
  // Also show loading during grace period if not authenticated (waiting for onAuthStateChange)
  const shouldShowLoading = isLoading || (!isAuthenticated && !authGracePeriodElapsed);
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  // Redirect handled by useEffect, but don't render children while not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-main">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 h-14">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{getAppLogoAbbr()}</span>
            </div>
            <span className="font-semibold text-white">{clientEnv.APP_NAME}</span>
          </div>

          {/* Credits Display */}
          <div className="flex-1 flex justify-center max-w-[150px]">
            <div className="scale-90 origin-center">
              <CreditsDisplay />
            </div>
          </div>

          {/* Hamburger Menu */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-surface-light transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Sidebar - Desktop: static, Mobile: drawer */}
      <DashboardSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
};

export { DashboardLayout };
// eslint-disable-next-line import/no-default-export -- Required for Astro island import
export default DashboardLayout;
