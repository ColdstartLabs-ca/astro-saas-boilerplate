/**
 * Dependency Injection Container
 *
 * Uses a small manual registry for service registration.
 * We use manual registration instead of decorators to avoid Next.js build issues.
 *
 * Services are registered as singletons by default.
 * Registration is lazy to avoid issues with test mocks.
 */

import { SubscriptionCreditsService } from '../services/SubscriptionCredits';
import { EmailService } from '../services/email.service';

// Import service interfaces for type documentation and IDE support
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ISubscriptionCredits } from '../interfaces/ISubscriptionCredits';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { IEmailService } from '../interfaces/IEmailService';

// Track whether services are registered
let servicesRegistered = false;

const services = new Map<string, unknown>();

export const container = {
  registerInstance<T>(token: string, instance: T): void {
    services.set(token, instance);
  },

  resolve<T>(token: string): T {
    registerServices();

    if (!services.has(token)) {
      throw new Error(`Service not registered: ${token}`);
    }

    return services.get(token) as T;
  },
};

/**
 * Register services in the DI container
 * This is done lazily to avoid running before test mocks are set up
 */
function registerServices() {
  if (servicesRegistered) {
    return;
  }

  // Register services as singletons
  // Manual registration instead of decorators for Next.js compatibility
  // We use container.registerInstance to register singleton instances
  container.registerInstance('ISubscriptionCredits', new SubscriptionCreditsService());
  container.registerInstance('IEmailService', new EmailService());

  servicesRegistered = true;
}

/**
 * Get a service from the DI container
 *
 * @example
 * ```ts
 * const creditsService = getService<ISubscriptionCredits>('ISubscriptionCredits');
 * ```
 */
export function getService<T>(token: string): T {
  return container.resolve<T>(token);
}
