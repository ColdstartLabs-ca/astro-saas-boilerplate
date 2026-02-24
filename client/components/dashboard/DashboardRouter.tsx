'use client';

import React, { Suspense, useState, useEffect, useTransition, useCallback } from 'react';
import {
  dashboardNavigate,
  onDashboardNavigate,
  stripLocalePrefix,
} from '@client/utils/dashboardNavigation';
import { useIsAdmin } from '@client/store/userStore';
import { getRouteByPath, matchDynamicRoute } from '@client/config/dashboardRoutes';
import { useOnboardingStatus } from '@client/hooks/useOnboardingStatus';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * Routes that are accessible even when onboarding is incomplete.
 * These "escape hatch" routes allow users to access settings, billing, support, etc.
 */
const ONBOARDING_ESCAPE_ROUTES = [
  '/dashboard/onboarding',
  '/dashboard/settings',
  '/dashboard/support',
  '/dashboard/billing',
  '/dashboard/admin',
];

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
      <div className="w-16 h-16 bg-surface-light rounded-full flex items-center justify-center mb-4">
        <Home className="w-8 h-8 text-muted" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Page Not Found</h2>
      <p className="text-secondary mb-6 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <button
        onClick={() => dashboardNavigate('/dashboard')}
        className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Overview
      </button>
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
 * Resolve a pathname to the correct page component using centralized route config.
 */
function getRouteElement(pathname: string): JSX.Element {
  // Normalize: strip trailing slash
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // Check for dynamic admin routes first: /dashboard/admin/users/:userId
  const userDetailParams = matchDynamicRoute(path, '/dashboard/admin/users/:userId');
  if (userDetailParams) {
    const adminRoute = getRouteByPath('/dashboard/admin');
    if (adminRoute?.layout) {
      const Layout = adminRoute.layout;
      const AdminUserDetailPage = React.lazy(
        () => import('@client/components/pages/AdminUserDetailPageClient')
      );
      return (
        <AdminGuard>
          <Layout>
            <AdminUserDetailPage userId={userDetailParams.userId} />
          </Layout>
        </AdminGuard>
      );
    }
  }

  // Check for blog admin routes: /dashboard/admin/blog/new and /dashboard/admin/blog/:postId
  if (path === '/dashboard/admin/blog/new') {
    const adminRoute = getRouteByPath('/dashboard/admin');
    if (adminRoute?.layout) {
      const Layout = adminRoute.layout;
      const AdminBlogPostEditPage = React.lazy(
        () => import('@client/components/pages/AdminBlogPostEditPageClient')
      );
      return (
        <AdminGuard>
          <Layout>
            <AdminBlogPostEditPage />
          </Layout>
        </AdminGuard>
      );
    }
  }

  const blogPostParams = matchDynamicRoute(path, '/dashboard/admin/blog/:postId');
  if (blogPostParams) {
    const adminRoute = getRouteByPath('/dashboard/admin');
    if (adminRoute?.layout) {
      const Layout = adminRoute.layout;
      const AdminBlogPostEditPage = React.lazy(
        () => import('@client/components/pages/AdminBlogPostEditPageClient')
      );
      return (
        <AdminGuard>
          <Layout>
            <AdminBlogPostEditPage postId={blogPostParams.postId} />
          </Layout>
        </AdminGuard>
      );
    }
  }

  // Check for dynamic campaign routes: /dashboard/campaigns/:campaignId
  const campaignDetailParams = matchDynamicRoute(path, '/dashboard/campaigns/:campaignId');
  if (campaignDetailParams) {
    const CampaignsPage = React.lazy(() => import('@client/components/pages/CampaignsPageClient'));
    return <CampaignsPage campaignId={campaignDetailParams.campaignId} />;
  }

  // Look up route in centralized config
  const route = getRouteByPath(path);

  if (!route) {
    return <NotFound />;
  }

  // Check enabled flag
  if (route.enabled === false) {
    return <NotFound />;
  }

  // Check admin guard
  if (route.guard === 'admin') {
    const Component = route.component;
    const Layout = route.layout;
    return (
      <AdminGuard>
        {Layout ? (
          <Layout>
            <Component />
          </Layout>
        ) : (
          <Component />
        )}
      </AdminGuard>
    );
  }

  // Regular route
  const Component = route.component;
  const Layout = route.layout;
  return Layout ? (
    <Layout>
      <Component />
    </Layout>
  ) : (
    <Component />
  );
}

export function DashboardRouter(): JSX.Element {
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? stripLocalePrefix(window.location.pathname) : '/dashboard'
  );
  const [isPending, startTransition] = useTransition();
  const {
    isComplete,
    isLoading: isOnboardingLoading,
    error: onboardingError,
  } = useOnboardingStatus();
  const { isDismissed } = useOnboardingStore();

  // Wrap pathname updates in startTransition so React keeps showing
  // the current page while the next lazy component loads,
  // instead of immediately falling back to the Suspense spinner.
  const setPathnameTransition = useCallback(
    (next: string) => startTransition(() => setPathname(next)),
    [startTransition]
  );

  useEffect(() => {
    return onDashboardNavigate(setPathnameTransition);
  }, [setPathnameTransition]);

  // Redirect to onboarding if not complete and not on an escape route
  useEffect(() => {
    // Don't redirect while loading or if there was an error fetching status
    if (isOnboardingLoading) return;
    if (onboardingError) return;
    if (isComplete) return;
    if (isDismissed) return;

    const isEscapeRoute = ONBOARDING_ESCAPE_ROUTES.some(route => pathname.startsWith(route));
    if (isEscapeRoute) return;

    // Redirect to onboarding
    dashboardNavigate('/dashboard/onboarding');
  }, [pathname, isComplete, isOnboardingLoading, onboardingError, isDismissed]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div className={isPending ? 'opacity-80 transition-opacity duration-150' : undefined}>
        {getRouteElement(pathname)}
      </div>
    </Suspense>
  );
}
