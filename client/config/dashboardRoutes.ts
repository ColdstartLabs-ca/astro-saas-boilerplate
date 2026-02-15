/**
 * Dashboard Routes Configuration
 *
 * Single source of truth for dashboard route metadata.
 * Consumed by: DashboardRouter, DashboardSidebar, DashboardLayout breadcrumb
 *
 * When adding/modifying routes, update this file only.
 */

'use client';

import React, { lazy } from 'react';
import type { ComponentType } from 'react';
import {
  LayoutGrid,
  Layers,
  FileText,
  Search,
  CheckCircle2,
  Calendar as CalendarIcon,
  Link2,
  BarChart2,
  CreditCard,
  Settings,
  HelpCircle,
  Shield,
  Lightbulb,
  Plug,
  Rocket,
} from 'lucide-react';

// Lazy-load page components
const DashboardPage = lazy(() => import('@client/components/pages/DashboardPageClient'));
const CampaignsPage = lazy(() => import('@client/components/pages/CampaignsPageClient'));
const ArticlesPage = lazy(() => import('@client/components/pages/ArticlesPageClient'));
const KeywordsPage = lazy(() => import('@client/components/pages/KeywordsPageClient'));
const OptimizationPage = lazy(() => import('@client/components/pages/OptimizationPageClient'));
const CalendarPage = lazy(() => import('@client/components/pages/CalendarPageClient'));
const BacklinksPage = lazy(() => import('@client/components/pages/BacklinksPageClient'));
const AnalyticsPage = lazy(() => import('@client/components/pages/AnalyticsPageClient'));
const OpportunitiesPage = lazy(() => import('@client/components/pages/OpportunitiesPageClient'));
const SettingsPage = lazy(() => import('@client/components/pages/SettingsPageClient'));
const BillingPage = lazy(() => import('@client/components/pages/BillingPageClient'));
const _HistoryPage = lazy(() => import('@client/components/pages/HistoryPageClient'));
const SupportPage = lazy(() => import('@client/components/pages/SupportPageClient'));
const IntegrationsPage = lazy(() =>
  import('@client/components/pages/IntegrationsPageClient')
);
const OnboardingPage = lazy(() => import('@client/components/pages/OnboardingPageClient'));

// Admin pages
const AdminDashboardLayout = lazy(() =>
  import('@client/components/admin/AdminDashboardLayout').then(m => ({
    default: m.AdminDashboardLayout,
  }))
);
const AdminDashboardPage = lazy(() => import('@client/components/pages/AdminDashboardPageClient'));
const AdminUsersPage = lazy(() => import('@client/components/pages/AdminUsersPageClient'));
const _AdminUserDetailPage = lazy(
  () => import('@client/components/pages/AdminUserDetailPageClient')
);
const AdminBlogPage = lazy(() => import('@client/components/pages/AdminBlogPageClient'));
const _AdminBlogPostEditPage = lazy(
  () => import('@client/components/pages/AdminBlogPostEditPageClient')
);

/**
 * Route guard types
 */
export type RouteGuard = 'admin' | 'auth' | 'public';

/**
 * Route group types for sidebar organization
 */
export type RouteGroup = 'primary' | 'secondary' | 'bottom' | 'admin' | 'hidden';

/**
 * Dashboard route configuration
 */
export interface IDashboardRoute {
  /** URL path (e.g., '/dashboard/campaigns') */
  path: string;
  /** i18n label key (e.g., 'sidebar.campaigns') */
  labelKey: string;
  /** Lucide icon component */
  icon: ComponentType<{ className?: string }>;
  /** Lazy-loaded page component */
  component: ComponentType;
  /** Whether route is disabled/enabled */
  enabled?: boolean;
  /** Optional route guard */
  guard?: RouteGuard;
  /** Sidebar grouping */
  group: RouteGroup;
  /** Optional custom layout wrapper (for admin routes) */
  layout?: ComponentType<{ children: React.ReactNode }>;
  /** Optional child routes (for dynamic routes like /users/:id) */
  children?: IDashboardRoute[];
}

/**
 * Main dashboard routes configuration
 */
export const DASHBOARD_ROUTES: readonly IDashboardRoute[] = [
  // Primary navigation
  {
    path: '/dashboard',
    labelKey: 'sidebar.overview',
    icon: LayoutGrid,
    component: DashboardPage,
    enabled: true,
    group: 'primary',
  },
  {
    path: '/dashboard/campaigns',
    labelKey: 'sidebar.campaigns',
    icon: Layers,
    component: CampaignsPage,
    enabled: true,
    group: 'primary',
    children: [
      {
        path: '/dashboard/campaigns/:campaignId',
        labelKey: 'sidebar.campaigns',
        icon: Layers,
        component: CampaignsPage,
        enabled: true,
        group: 'primary',
      },
    ],
  },
  {
    path: '/dashboard/integrations',
    labelKey: 'sidebar.integrations',
    icon: Plug,
    component: IntegrationsPage,
    enabled: true,
    group: 'primary',
  },
  {
    path: '/dashboard/opportunities',
    labelKey: 'sidebar.opportunities',
    icon: Lightbulb,
    component: OpportunitiesPage,
    enabled: true,
    group: 'primary',
  },
  {
    path: '/dashboard/articles',
    labelKey: 'sidebar.articles',
    icon: FileText,
    component: ArticlesPage,
    enabled: true,
    group: 'primary',
  },
  {
    path: '/dashboard/keywords',
    labelKey: 'sidebar.keywords',
    icon: Search,
    component: KeywordsPage,
    enabled: false, // Disabled until implemented
    group: 'primary',
  },
  {
    path: '/dashboard/optimization',
    labelKey: 'sidebar.optimization',
    icon: CheckCircle2,
    component: OptimizationPage,
    enabled: false, // Disabled until implemented
    group: 'primary',
  },
  {
    path: '/dashboard/calendar',
    labelKey: 'sidebar.calendar',
    icon: CalendarIcon,
    component: CalendarPage,
    enabled: false, // Disabled until implemented
    group: 'primary',
  },
  {
    path: '/dashboard/backlinks',
    labelKey: 'sidebar.backlinks',
    icon: Link2,
    component: BacklinksPage,
    enabled: false, // Disabled until implemented
    group: 'primary',
  },
  {
    path: '/dashboard/analytics',
    labelKey: 'sidebar.analytics',
    icon: BarChart2,
    component: AnalyticsPage,
    enabled: false, // Disabled until implemented
    group: 'primary',
  },

  // Secondary navigation (account management)
  {
    path: '/dashboard/billing',
    labelKey: 'sidebar.billing',
    icon: CreditCard,
    component: BillingPage,
    enabled: true,
    group: 'secondary',
  },
  {
    path: '/dashboard/settings',
    labelKey: 'sidebar.settings',
    icon: Settings,
    component: SettingsPage,
    enabled: true,
    group: 'secondary',
  },

  // Bottom navigation
  {
    path: '/dashboard/support',
    labelKey: 'sidebar.helpSupport',
    icon: HelpCircle,
    component: SupportPage,
    enabled: true,
    group: 'bottom',
  },

  // Hidden routes (not shown in sidebar)
  {
    path: '/dashboard/onboarding',
    labelKey: 'sidebar.onboarding',
    icon: Rocket,
    component: OnboardingPage,
    enabled: true,
    group: 'hidden',
  },

  // Admin routes
  {
    path: '/dashboard/admin',
    labelKey: 'sidebar.admin',
    icon: Shield,
    component: AdminDashboardPage,
    enabled: true,
    guard: 'admin',
    group: 'admin',
    layout: AdminDashboardLayout,
    children: [
      {
        path: '/dashboard/admin/users',
        labelKey: 'sidebar.admin.users',
        icon: Shield,
        component: AdminUsersPage,
        enabled: true,
        guard: 'admin',
        group: 'admin',
        layout: AdminDashboardLayout,
      },
      {
        path: '/dashboard/admin/blog',
        labelKey: 'sidebar.admin.blog',
        icon: FileText,
        component: AdminBlogPage,
        enabled: true,
        guard: 'admin',
        group: 'admin',
        layout: AdminDashboardLayout,
      },
    ],
  },
] as const;

/**
 * Get route by path
 */
export function getRouteByPath(pathname: string): IDashboardRoute | undefined {
  const normalizedPath =
    pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

  // First try exact match
  for (const route of DASHBOARD_ROUTES) {
    if (route.path === normalizedPath) return route;
  }

  // Then check children
  for (const route of DASHBOARD_ROUTES) {
    if (route.children) {
      for (const child of route.children) {
        if (child.path === normalizedPath) return child;
      }
    }
  }

  return undefined;
}

/**
 * Get routes by group (for sidebar rendering)
 */
export function getRoutesByGroup(group: RouteGroup): readonly IDashboardRoute[] {
  return DASHBOARD_ROUTES.filter(route => route.group === group);
}

/**
 * Get breadcrumb label key for a pathname
 * Maps path segments to i18n keys
 */
export function getBreadcrumbLabelKey(pathname: string): string {
  const normalizedPath = pathname.replace('/dashboard', '').replace(/^\//, '') || 'overview';
  return `header.breadcrumb.${normalizedPath}`;
}

/**
 * Check if a path matches a route (for active state)
 */
export function isPathActive(pathname: string, routePath: string): boolean {
  const normalizedPathname =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  if (routePath === '/dashboard') {
    return normalizedPathname === '/dashboard';
  }
  return normalizedPathname.startsWith(routePath);
}

/**
 * Match dynamic routes (e.g., /dashboard/admin/users/:userId)
 * Returns match object or null
 */
export function matchDynamicRoute(
  pathname: string,
  pattern: string
): Record<string, string> | null {
  // Convert pattern to regex: /dashboard/admin/users/:userId -> /dashboard/admin/users/([^/]+)
  const regexPattern = pattern.replace(/:([^/]+)/g, '([^/]+)');
  const regex = new RegExp(`^${regexPattern}$`);
  const match = pathname.match(regex);

  if (!match) return null;

  // Extract param names from pattern
  const paramNames = (pattern.match(/:([^/]+)/g) || []).map(name => name.slice(1));

  // Build params object
  const params: Record<string, string> = {};
  paramNames.forEach((name, i) => {
    params[name] = match[i + 1];
  });

  return params;
}
