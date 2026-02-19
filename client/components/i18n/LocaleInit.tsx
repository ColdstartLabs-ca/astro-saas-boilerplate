/**
 * LocaleInit Component
 *
 * This component is rendered by Astro layouts to initialize the client-side
 * locale store with the current locale. It reads the locale from props
 * (set by the server) and syncs it to the Zustand store.
 *
 * Also reads the locale cookie as a fallback for client-side navigation.
 */

'use client';

import { useEffect } from 'react';
import { useLocaleStore } from '@client/store/localeStore';
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '../../../i18n/config';

interface ILocaleInitProps {
  locale: Locale;
}

export function LocaleInit({ locale }: ILocaleInitProps): null {
  const setLocale = useLocaleStore(s => s.setLocale);

  useEffect(() => {
    // First try to use the prop from server
    if (locale) {
      setLocale(locale);
      return;
    }

    // Fallback: read from cookie for client-side navigation
    const localeMatch = document.cookie.match(new RegExp(`${LOCALE_COOKIE}=([^;]+)`));
    const cookieLocale = localeMatch ? localeMatch[1] : DEFAULT_LOCALE;
    setLocale(cookieLocale as Locale);
  }, [locale, setLocale]);

  return null;
}
