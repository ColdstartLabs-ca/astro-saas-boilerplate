/**
 * Currency Conversion Utilities
 *
 * Provides functions for converting USD prices to local currencies for display.
 * All conversions are approximate and for display purposes only.
 * Actual charges are always in USD via Stripe.
 */

import { COUNTRY_CURRENCY_MAP, type RegionalCurrency } from '@shared/config/regional-pricing';

/**
 * Converts USD cents to local currency and formats for display.
 *
 * @param usdCents - Price in USD cents (e.g., 4900 for $49.00)
 * @param currency - Regional currency configuration
 * @returns Formatted currency string (e.g., "R$ 282")
 *
 * @example
 * const currency = COUNTRY_CURRENCY_MAP['BR'];
 * convertAndFormat(4900, currency); // "R$ 282"
 */
export function convertAndFormat(usdCents: number, currency: RegionalCurrency): string {
  const localAmount = (usdCents / 100) * currency.approximateRate;
  return new Intl.NumberFormat('default', {
    style: 'currency',
    currency: currency.code,
    maximumFractionDigits: 0,
  }).format(localAmount);
}

/**
 * Gets the regional currency configuration for a country code.
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'BR', 'IN')
 * @returns RegionalCurrency if supported, null otherwise
 *
 * @example
 * getCurrencyForCountry('BR'); // Returns BRL config
 * getCurrencyForCountry('US'); // Returns null (no conversion needed)
 */
export function getCurrencyForCountry(countryCode: string): RegionalCurrency | null {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || null;
}

/**
 * Formats a complete price display string with USD and local currency.
 *
 * @param usdCents - Price in USD cents
 * @param currency - Regional currency configuration
 * @param period - Optional billing period (e.g., '/mo', '/yr')
 * @returns Formatted string like "$49/mo ≈ R$ 282/mês"
 *
 * @example
 * formatPriceWithLocal(4900, COUNTRY_CURRENCY_MAP['BR'], '/mo');
 * // "$49/mo ≈ R$ 282/mês (approx. — charged in USD)"
 */
export function formatPriceWithLocal(
  usdCents: number,
  currency: RegionalCurrency,
  period: string = ''
): string {
  const usdFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(usdCents / 100);

  const localFormatted = convertAndFormat(usdCents, currency);

  return `${usdFormatted}${period} ≈ ${localFormatted}${period}`;
}
