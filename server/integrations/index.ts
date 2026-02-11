/**
 * Integration Adapters Module
 *
 * Exports all integration adapters and related utilities.
 */

export * from './adapter.interface';
export * from './wordpress.adapter';
export * from './webhook.adapter';

import type { ICMSAdapter } from './adapter.interface';
import type { IntegrationType } from '@shared/types/integration.types';
import { wordpressAdapter } from './wordpress.adapter';
import { webhookAdapter } from './webhook.adapter';

/**
 * Map of integration type to adapter instance
 */
const ADAPTERS: Record<IntegrationType, ICMSAdapter> = {
  wordpress: wordpressAdapter,
  webhook: webhookAdapter,
};

/**
 * Get adapter instance for integration type
 *
 * @param type - Integration type (wordpress or webhook)
 * @returns Adapter instance
 * @throws Error if adapter type is not supported
 */
export function getAdapter(type: IntegrationType): ICMSAdapter {
  const adapter = ADAPTERS[type];
  if (!adapter) {
    throw new Error(`Unsupported integration type: ${type}`);
  }
  return adapter;
}
