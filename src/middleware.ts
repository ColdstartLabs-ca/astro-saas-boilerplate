import { defineMiddleware } from 'astro:middleware';
import type { AstroCookies } from 'astro';
import { PUBLIC_API_ROUTES } from '@shared/config/security';
import { serverEnv } from '@shared/config/env';
import {
  applySecurityHeaders,
  applyCorsHeaders,
  handleOptionsRequest,
  applyPublicRateLimit,
  applyUserRateLimit,
  verifyApiAuth,
  addUserContextLocals,
} from '@lib/middleware';
import { updateSession, requireAdmin } from '@shared/utils/supabase/middleware';
import { DEFAULT_LOCALE, isValidLocale, LOCALE_COOKIE, type Locale } from '@/i18n/config';

// Stub for deleted country-locale-map
function getLocaleFromCountry(country: string): Locale | null {
  const countryMap: Record<string, Locale> = {
    US: 'en',
    GB: 'en',
    CA: 'en',
    AU: 'en',
    NZ: 'en',
    IE: 'en',
    ZA: 'en',
    IN: 'en',
  };
  return countryMap[country.toUpperCase()] || null;
}

/**
 * Tracking and analytics query parameters that should be stripped from canonical URLs
 */
const TRACKING_QUERY_PARAMS = [
  'ref',
  'source',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'msclkid',
];

/**
 * Check if pathname is a dashboard route (with or without locale prefix)
 */
function isDashboardPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);

  // /dashboard or /dashboard/*
  if (segments[0] === 'dashboard') {
    return true;
  }

  // /{locale}/dashboard or /{locale}/dashboard/*
  if (segments.length >= 2 && isValidLocale(segments[0]) && segments[1] === 'dashboard') {
    return true;
  }

  return false;
}

/**
 * Check if pathname is an admin dashboard route (with or without locale prefix)
 */
function isAdminDashboardPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);

  // /dashboard/admin or /dashboard/admin/*
  if (segments[0] === 'dashboard' && segments[1] === 'admin') {
    return true;
  }

  // /{locale}/dashboard/admin or /{locale}/dashboard/admin/*
  if (segments.length >= 3 && isValidLocale(segments[0]) && segments[1] === 'dashboard' && segments[2] === 'admin') {
    return true;
  }

  return false;
}

/**
 * Extract locale from pathname if present
 */
function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isValidLocale(segments[0])) {
    return segments[0] as Locale;
  }
  return null;
}

/**
 * Strip tracking query parameters from URL for canonical URL generation
 */
function stripTrackingParams(url: URL): URL {
  const cleanUrl = new URL(url.toString());

  // Remove all tracking query parameters
  for (const param of TRACKING_QUERY_PARAMS) {
    cleanUrl.searchParams.delete(param);
  }

  return cleanUrl;
}

/**
 * Handle WWW to non-WWW redirect for SEO consistency
 */
function handleWWWRedirect(url: URL): Response | null {
  const hostname = url.hostname;

  // If hostname starts with www., redirect to non-www version
  if (hostname.startsWith('www.')) {
    const cleanUrl = new URL(url.toString());
    cleanUrl.hostname = hostname.slice(4); // Remove 'www.' prefix
    const response = new Response(null, {
      status: 301,
      headers: { Location: cleanUrl.toString() },
    });
    applySecurityHeaders(response);
    return response;
  }

  return null;
}

/**
 * Handle query parameter cleanup for SEO
 */
function handleTrackingParams(url: URL): Response | null {
  const hasTrackingParams = TRACKING_QUERY_PARAMS.some(param => url.searchParams.has(param));

  if (!hasTrackingParams) {
    return null;
  }

  // Create a clean URL without tracking parameters
  const cleanUrl = stripTrackingParams(url);

  // Always redirect to clean URL for SEO
  const response = new Response(null, {
    status: 301,
    headers: { Location: cleanUrl.toString() },
  });

  // Apply security headers
  applySecurityHeaders(response);

  return response;
}

/**
 * Legacy URL redirects for SEO
 */
function handleLegacyRedirects(url: URL): Response | null {
  const pathname = url.pathname;
  const trailingSlashRemoved =
    pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  // Extract locale prefix if present
  const segments = trailingSlashRemoved.split('/').filter(Boolean);
  let localePrefix = '';
  let pathWithoutLocale = trailingSlashRemoved;

  if (segments.length > 0 && isValidLocale(segments[0])) {
    localePrefix = `/${segments[0]}`;
    pathWithoutLocale = '/' + segments.slice(1).join('/');
  }

  // Define redirects without locale prefix
  const redirectMap: Record<string, string> = {
    '/tools/bulk-image-resizer': '/tools/resize/bulk-image-resizer/',
    '/tools/bulk-image-compressor': '/tools/compress/bulk-image-compressor/',
  };

  const newRedirectPath = redirectMap[pathWithoutLocale];

  if (newRedirectPath) {
    const response = new Response(null, {
      status: 301,
      headers: { Location: `${localePrefix}${newRedirectPath}` },
    });
    return response;
  }

  return null;
}

/**
 * Detect and validate locale from request
 */
function detectLocale(request: Request, cookies: AstroCookies): Locale {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);

  // 1. Check URL path for locale prefix (explicit user navigation)
  if (segments.length > 0 && isValidLocale(segments[0])) {
    return segments[0] as Locale;
  }

  // 2. Check cookie (manual language selector override)
  const cookieLocale = cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  // 3. Check CF-IPCountry header (Cloudflare geolocation)
  const country =
    request.headers.get('CF-IPCountry') ||
    request.headers.get('cf-ipcountry') ||
    (serverEnv.ENV === 'test' ? request.headers.get('x-test-country') : null);
  if (country) {
    const geoLocale = getLocaleFromCountry(country);
    if (geoLocale && isValidLocale(geoLocale)) {
      return geoLocale;
    }
  }

  // 4. Check Accept-Language header (browser preference)
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferredLocales = acceptLanguage
      .split(',')
      .map(lang => {
        const [locale, qValue] = lang.trim().split(';q=');
        const quality = qValue ? parseFloat(qValue) : 1;
        return { locale: locale.split('-')[0], quality };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { locale } of preferredLocales) {
      if (isValidLocale(locale)) {
        return locale as Locale;
      }
    }
  }

  // 5. Fallback to default
  return DEFAULT_LOCALE;
}

/**
 * Check if a route matches any public API route pattern
 */
function isPublicApiRoute(pathname: string): boolean {
  const normalizedName =
    pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  return PUBLIC_API_ROUTES.some(route => {
    if (route.endsWith('/*')) {
      return pathname.startsWith(route.slice(0, -2));
    }
    return pathname === route || normalizedName === route;
  });
}

// Astro middleware implementation
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url } = context;
  const pathname = url.pathname;

  // Handle WWW to non-WWW redirect for SEO (must be first)
  const wwwRedirect = handleWWWRedirect(url);
  if (wwwRedirect) {
    return wwwRedirect;
  }

  // Handle legacy redirects for SEO
  const legacyRedirect = handleLegacyRedirects(url);
  if (legacyRedirect) {
    return legacyRedirect;
  }

  // Handle tracking parameter cleanup for SEO
  const trackingParamsCleanup = handleTrackingParams(url);
  if (trackingParamsCleanup) {
    return trackingParamsCleanup;
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    // Handle OPTIONS preflight requests
    const optionsResponse = handleOptionsRequest(request);
    if (optionsResponse) {
      applySecurityHeaders(optionsResponse);
      return optionsResponse;
    }

    // Check if route is public
    const isPublic = isPublicApiRoute(pathname);

    // Handle public routes
    if (isPublic) {
      // Apply security headers
      const response = await next();
      applySecurityHeaders(response);
      applyCorsHeaders(response, request.headers.get('origin') || undefined);

      // Optionally add user context if authenticated
      if (request.headers.get('Authorization')) {
        const authResult = await verifyApiAuth(request);
        if (!('error' in authResult)) {
          context.locals = {
            ...context.locals,
            ...addUserContextLocals(authResult.user),
          };
        }
      }

      // Apply public rate limiting
      const rateLimitResponse = await applyPublicRateLimit(request, response);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      return response;
    }

    // Verify JWT for protected API routes
    const authResult = await verifyApiAuth(request);
    if ('error' in authResult) {
      applySecurityHeaders(authResult.error);
      return authResult.error;
    }

    // Add user context to locals
    context.locals = {
      ...context.locals,
      ...addUserContextLocals(authResult.user),
    };

    // Apply security headers and rate limiting, then proceed
    const response = await next();
    applySecurityHeaders(response);
    applyCorsHeaders(response, request.headers.get('origin') || undefined);

    const rateLimitResponse = await applyUserRateLimit(authResult.user.id, response);
    return rateLimitResponse || response;
  }

  // Handle page routes
  // Skip static files, sitemap, robots.txt
  if (
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/sitemap-')
  ) {
    return next();
  }

  // Skip pSEO paths without locale prefix
  const hasLocalePrefix = pathname.split('/')[1] && isValidLocale(pathname.split('/')[1]);
  const isPSEOPath =
    pathname.startsWith('/tools/') ||
    pathname.startsWith('/formats/') ||
    pathname.startsWith('/scale/') ||
    pathname.startsWith('/guides/') ||
    pathname.startsWith('/free/') ||
    pathname.startsWith('/alternatives/') ||
    pathname.startsWith('/compare/') ||
    pathname.startsWith('/platforms/') ||
    pathname.startsWith('/use-cases/') ||
    pathname.startsWith('/device-use/') ||
    pathname.startsWith('/format-scale/') ||
    pathname.startsWith('/platform-format/') ||
    pathname.startsWith('/photo-restoration') ||
    pathname.startsWith('/camera-raw') ||
    pathname.startsWith('/industry-insights') ||
    pathname.startsWith('/device-optimization') ||
    pathname.startsWith('/bulk-tools') ||
    pathname.startsWith('/content');

  if (isPSEOPath && !hasLocalePrefix) {
    return next();
  }

  // Handle locale routing
  const detectedLocale = detectLocale(request, cookies);

  // For root path, check auth and redirect to dashboard if authenticated
  const isRootPath = pathname === '/';
  if (isRootPath) {
    const isTestEnv = serverEnv.ENV === 'test';
    const hasTestHeader =
      context.request.headers.get('x-test-env') === 'true' ||
      context.request.headers.get('x-playwright-test') === 'true';

    if (!isTestEnv && !hasTestHeader) {
      const { user } = await updateSession(cookies);
      if (user) {
        const loginRequired = url.searchParams.get('login');
        if (!loginRequired) {
          const dashboardUrl = new URL('/dashboard', url);
          dashboardUrl.searchParams.delete('login');
          dashboardUrl.searchParams.delete('next');
          return new Response(null, {
            status: 302,
            headers: { Location: dashboardUrl.toString() },
          });
        }
      }
    }
  }

  // If path has no locale prefix, handle locale routing
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0 || !isValidLocale(segments[0])) {
    // For default locale (en), just continue (no prefix needed)
    if (detectedLocale === DEFAULT_LOCALE) {
      // Update locale cookie if needed
      if (cookies.get(LOCALE_COOKIE)?.value !== detectedLocale) {
        cookies.set(LOCALE_COOKIE, detectedLocale, {
          maxAge: 60 * 60 * 24 * 365,
          sameSite: 'lax',
          path: '/',
        });
      }

      // Check auth for dashboard routes (default locale, no prefix)
      if (isDashboardPath(pathname)) {
        const isTestEnv = serverEnv.ENV === 'test';
        const hasTestHeader =
          context.request.headers.get('x-test-env') === 'true' ||
          context.request.headers.get('x-playwright-test') === 'true';

        const { user } = await updateSession(cookies);

        if (!user && !isTestEnv && !hasTestHeader) {
          const newUrl = new URL(url.toString());
          newUrl.pathname = '/';
          newUrl.searchParams.set('login', '1');
          newUrl.searchParams.set('next', pathname);

          return new Response(null, {
            status: 302,
            headers: { Location: newUrl.toString() },
          });
        }

        if (user) {
          context.locals = {
            ...context.locals,
            ...addUserContextLocals({ id: user.id, email: user.email }),
          };

          // Check admin role for admin routes
          if (isAdminDashboardPath(pathname)) {
            const adminCheck = await requireAdmin(cookies);
            if (!adminCheck.isAdmin) {
              return new Response(null, {
                status: 302,
                headers: { Location: '/?forbidden=1' },
              });
            }
          }
        }
      }

      const response = await next();
      applySecurityHeaders(response);
      return response;
    }

    // For non-default locales, redirect to show locale in URL
    const newUrl = new URL(url.toString());
    newUrl.pathname = `/${detectedLocale}${pathname}`;
    const response = new Response(null, {
      status: 302,
      headers: { Location: newUrl.toString() },
    });

    // Apply security headers
    applySecurityHeaders(response);

    // Set locale cookie
    cookies.set(LOCALE_COOKIE, detectedLocale, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      path: '/',
    });

    return response;
  }

  // Path has locale prefix, ensure cookie is set
  const pathLocale = segments[0] as Locale;
  if (isValidLocale(pathLocale)) {
    // Update locale cookie if needed
    if (cookies.get(LOCALE_COOKIE)?.value !== pathLocale) {
      cookies.set(LOCALE_COOKIE, pathLocale, {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        path: '/',
      });
    }

    // Check auth for dashboard routes
    if (isDashboardPath(pathname)) {
      const isTestEnv = serverEnv.ENV === 'test';
      const hasTestHeader =
        context.request.headers.get('x-test-env') === 'true' ||
        context.request.headers.get('x-playwright-test') === 'true';

      const { user } = await updateSession(cookies);

      // Unauthenticated user on protected dashboard routes
      if (!user && !isTestEnv && !hasTestHeader) {
        const pathLocale = getLocaleFromPath(pathname);

        const newUrl = new URL(url.toString());
        newUrl.pathname = pathLocale ? `/${pathLocale}` : '/';
        newUrl.searchParams.set('login', '1');
        newUrl.searchParams.set('next', pathname);

        return new Response(null, {
          status: 302,
          headers: { Location: newUrl.toString() },
        });
      }

      // Add user to locals
      if (user) {
        context.locals = {
          ...context.locals,
          ...addUserContextLocals({ id: user.id, email: user.email }),
        };

        // Check admin role for admin routes
        if (isAdminDashboardPath(pathname)) {
          const adminCheck = await requireAdmin(cookies);
          if (!adminCheck.isAdmin) {
            const pathLocale = getLocaleFromPath(pathname);
            return new Response(null, {
              status: 302,
              headers: { Location: pathLocale ? `/${pathLocale}/?forbidden=1` : '/?forbidden=1' },
            });
          }
        }
      }
    }

    const response = await next();
    applySecurityHeaders(response);
    return response;
  }

  // Default: continue with security headers
  const response = await next();
  applySecurityHeaders(response);
  return response;
});
