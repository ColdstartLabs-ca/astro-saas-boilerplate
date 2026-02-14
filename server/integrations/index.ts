/**
 * Integration Adapters Module
 *
 * Exports all integration adapters and related utilities.
 */

export * from './adapter.interface';
export * from './wordpress.adapter';
export * from './webhook.adapter';
export * from './wix.adapter';
export * from './shopify.adapter';
export * from './ghost.adapter';
export * from './webflow.adapter';
export * from './notion.adapter';
export * from './notion-blocks';
export * from './slack.adapter';

import type { ICMSAdapter } from './adapter.interface';
import type { IntegrationType } from '@shared/types/integration.types';
import { wordpressAdapter } from './wordpress.adapter';
import { webhookAdapter } from './webhook.adapter';
import { wixAdapter } from './wix.adapter';
import { shopifyAdapter } from './shopify.adapter';
import { ghostAdapter } from './ghost.adapter';
import { webflowAdapter } from './webflow.adapter';
import { notionAdapter } from './notion.adapter';
import { slackAdapter } from './slack.adapter';

/**
 * Map of integration type to adapter instance
 */
const ADAPTERS: Partial<Record<IntegrationType, ICMSAdapter>> = {
  wordpress: wordpressAdapter,
  webhook: webhookAdapter,
  wix: wixAdapter,
  shopify: shopifyAdapter,
  ghost: ghostAdapter,
  webflow: webflowAdapter,
  notion: notionAdapter,
  slack: slackAdapter,
};

/**
 * Get adapter instance for integration type
 *
 * @param type - Integration type (wordpress, webhook, wix, etc.)
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
