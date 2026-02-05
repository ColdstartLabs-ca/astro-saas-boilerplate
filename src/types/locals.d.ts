/**
 * Extend Astro's Locals interface
 * This file extends the global Locals type for middleware-set properties
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Locals {
    userId?: string;
    userEmail?: string;
  }
}

// This export is needed to make this a module
export {};
