/**
 * Extend Astro's App.Locals interface
 * This file extends the global App.Locals type for middleware-set properties
 */

/* eslint-disable @typescript-eslint/naming-convention */

type RegionalCurrency = {
  code: string;
  symbol: string;
  approximateRate: number;
  displayNote: string;
};

declare global {
  namespace App {
    interface Locals {
      userId?: string;
      userEmail?: string;
      /** Regional currency for price display (detected from CF-IPCountry) */
      currency: RegionalCurrency | null;
    }
  }
}

// This export is needed to make this a module
export {};
