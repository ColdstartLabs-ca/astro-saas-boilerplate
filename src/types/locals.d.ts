/**
 * Extend Astro's Locals interface
 * This file extends the global Locals type for middleware-set properties
 */

/* eslint-disable @typescript-eslint/naming-convention */

declare global {
   
  interface Locals {
    userId?: string;
    userEmail?: string;
  }
}

// This export is needed to make this a module
export {};
