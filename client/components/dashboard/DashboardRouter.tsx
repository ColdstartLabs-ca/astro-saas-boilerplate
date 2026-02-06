'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { onDashboardNavigate } from '@client/utils/dashboardNavigation';
import { useIsAdmin } from '@client/store/userStore';
import { getRouteByPath, matchDynamicRoute } from '@client/config/dashboardRoutes';

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
    typeof window !== 'undefined' ? window.location.pathname : '/dashboard'
  );

  useEffect(() => {
    return onDashboardNavigate(setPathname);
  }, []);

  return <Suspense fallback={<LoadingSpinner />}>{getRouteElement(pathname)}</Suspense>;
}
