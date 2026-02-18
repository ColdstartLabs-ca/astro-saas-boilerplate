/**
 * Locale Store
 *
 * Zustand store for managing the active locale on the client side.
 * Used by useTranslations hook to get the current locale.
 */

import { create } from 'zustand';
import { DEFAULT_LOCALE, type Locale } from '../../i18n/config';

type LocaleStore = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleStore>(set => ({
  locale: DEFAULT_LOCALE,
  setLocale: locale => set({ locale }),
}));
