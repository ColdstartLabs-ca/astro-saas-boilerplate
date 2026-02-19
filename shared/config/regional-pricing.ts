/**
 * Regional Currency Configuration
 *
 * Maps country codes (from CF-IPCountry header) to local currency display settings.
 * Currency is independent of locale (e.g., India uses INR but sees English UI).
 *
 * Exchange rates are static and updated quarterly manually.
 * This is DISPLAY ONLY - all charges are in USD via Stripe.
 */

export type RegionalCurrency = {
  /** ISO 4217 currency code (e.g., 'BRL', 'INR', 'GBP') */
  code: string;
  /** Currency symbol for display (e.g., 'R$', '₹', '£') */
  symbol: string;
  /** Approximate exchange rate vs USD (static, updated quarterly) */
  approximateRate: number;
  /** Display note in local language explaining approximate pricing */
  displayNote: string;
};

/**
 * Country to currency mapping based on CF-IPCountry header values.
 * Only includes countries where we want to show local currency pricing.
 */
export const COUNTRY_CURRENCY_MAP: Record<string, RegionalCurrency> = {
  // Brazil - Portuguese
  BR: {
    code: 'BRL',
    symbol: 'R$',
    approximateRate: 5.75,
    displayNote: 'Preco aproximado em BRL. Cobranca em USD.',
  },
  // India - English
  IN: {
    code: 'INR',
    symbol: '₹',
    approximateRate: 84,
    displayNote: 'Approximate price in INR. Charged in USD.',
  },
  // United Kingdom - English
  GB: {
    code: 'GBP',
    symbol: '£',
    approximateRate: 0.79,
    displayNote: 'Approximate price in GBP. Charged in USD.',
  },
  // Germany - German
  DE: {
    code: 'EUR',
    symbol: '€',
    approximateRate: 0.92,
    displayNote: 'Ungefahrer Preis in EUR. Abbuchung in USD.',
  },
  // France - French
  FR: {
    code: 'EUR',
    symbol: '€',
    approximateRate: 0.92,
    displayNote: 'Prix approximatif en EUR. Facturation en USD.',
  },
  // Australia - English
  AU: {
    code: 'AUD',
    symbol: 'A$',
    approximateRate: 1.55,
    displayNote: 'Approximate price in AUD. Charged in USD.',
  },
  // Philippines - English
  PH: {
    code: 'PHP',
    symbol: '₱',
    approximateRate: 57,
    displayNote: 'Approximate price in PHP. Charged in USD.',
  },
  // Pakistan - English
  PK: {
    code: 'PKR',
    symbol: '₨',
    approximateRate: 278,
    displayNote: 'Approximate price in PKR. Charged in USD.',
  },
  // Indonesia - English
  ID: {
    code: 'IDR',
    symbol: 'Rp',
    approximateRate: 16000,
    displayNote: 'Approximate price in IDR. Charged in USD.',
  },
};
