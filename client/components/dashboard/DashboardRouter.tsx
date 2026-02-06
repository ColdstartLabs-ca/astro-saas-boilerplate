'use client';

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { onDashboardNavigate } from '@client/utils/dashboardNavigation';
import { useIsAdmin } from '@client/store/userStore';

// Lazy-load all dashboard page components
const DashboardPage = lazy(() => import('@client/components/pages/DashboardPageClient'));
const CampaignsPage = lazy(() => import('@client/components/pages/CampaignsPageClient'));
const KeywordsPage = lazy(() => import('@client/components/pages/KeywordsPageClient'));
const OptimizationPage = lazy(() => import('@client/components/pages/OptimizationPageClient'));
const CalendarPage = lazy(() => import('@client/components/pages/CalendarPageClient'));
const BacklinksPage = lazy(() => import('@client/components/pages/BacklinksPageClient'));
const AnalyticsPage = lazy(() => import('@client/components/pages/AnalyticsPageClient'));
const SettingsPage = lazy(() => import('@client/components/pages/SettingsPageClient'));
const BillingPage = lazy(() => import('@client/components/pages/BillingPageClient'));
const HistoryPage = lazy(() => import('@client/components/pages/HistoryPageClient'));
const SupportPage = lazy(() => import('@client/components/pages/SupportPageClient'));

// Admin pages
const AdminDashboardLayout = lazy(() =>
  import('@client/components/admin/AdminDashboardLayout').then(m => ({
    default: m.AdminDashboardLayout,
  }))
);
const AdminDashboardPage = lazy(() => import('@client/components/pages/AdminDashboardPageClient'));
const AdminUsersPage = lazy(() => import('@client/components/pages/AdminUsersPageClient'));
const AdminUserDetailPage = lazy(
  () => import('@client/components/pages/AdminUserDetailPageClient')
);

function LoadingSpinner(): JSX.Element {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
    </div>
  );
}

function NotFound(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-secondary">
      <p className="text-lg">Page not found</p>
    </div>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }): JSX.Element {
  const isAdmin = useIsAdmin();
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-secondary">
        <p className="text-lg">Access denied</p>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * Resolve a pathname to the correct page component.
 */
function getRouteElement(pathname: string): JSX.Element {
  // Normalize: strip trailing slash
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // Admin routes
  if (path.startsWith('/dashboard/admin')) {
    const adminPath = path.replace('/dashboard/admin', '') || '/';

    // /dashboard/admin/users/:userId
    const userDetailMatch = adminPath.match(/^\/users\/([^/]+)$/);
    if (userDetailMatch) {
      return (
        <AdminGuard>
          <AdminDashboardLayout>
            <AdminUserDetailPage userId={userDetailMatch[1]} />
          </AdminDashboardLayout>
        </AdminGuard>
      );
    }

    // /dashboard/admin/users
    if (adminPath === '/users') {
      return (
        <AdminGuard>
          <AdminDashboardLayout>
            <AdminUsersPage />
          </AdminDashboardLayout>
        </AdminGuard>
      );
    }

    // /dashboard/admin
    return (
      <AdminGuard>
        <AdminDashboardLayout>
          <AdminDashboardPage />
        </AdminDashboardLayout>
      </AdminGuard>
    );
  }

  // Main dashboard routes
  switch (path) {
    case '/dashboard':
      return <DashboardPage />;
    case '/dashboard/campaigns':
      return <CampaignsPage />;
    case '/dashboard/keywords':
      return <KeywordsPage />;
    case '/dashboard/optimization':
      return <OptimizationPage />;
    case '/dashboard/calendar':
      return <CalendarPage />;
    case '/dashboard/backlinks':
      return <BacklinksPage />;
    case '/dashboard/analytics':
      return <AnalyticsPage />;
    case '/dashboard/settings':
      return <SettingsPage />;
    case '/dashboard/billing':
      return <BillingPage />;
    case '/dashboard/history':
      return <HistoryPage />;
    case '/dashboard/support':
      return <SupportPage />;
    default:
      return <NotFound />;
  }
}

export function DashboardRouter(): JSX.Element {
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/dashboard'
  );

  useEffect(() => {
    return onDashboardNavigate(setPathname);
  }, []);

  return <Suspense fallback={<LoadingSpinner />}>{getRouteElement(pathname)}</Suspense>;
}
