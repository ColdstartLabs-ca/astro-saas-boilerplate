/**
 * Campaign Detail Index Barrel Export Tests
 * Tests for the barrel export file that exports all campaign detail components
 */

import { describe, it, expect } from 'vitest';

// Test that all named exports are available from the barrel export
describe('campaign-detail index barrel export', () => {
  it('should export CampaignDetailHeader', async () => {
    const module = await import('@client/components/dashboard/views/campaign-detail');
    expect(module).toHaveProperty('CampaignDetailHeader');
  });

  it('should export CampaignStatsGrid', async () => {
    const module = await import('@client/components/dashboard/views/campaign-detail');
    expect(module).toHaveProperty('CampaignStatsGrid');
  });

  it('should export CampaignProgress', async () => {
    const module = await import('@client/components/dashboard/views/campaign-detail');
    expect(module).toHaveProperty('CampaignProgress');
  });

  it('should export CampaignMetadata', async () => {
    const module = await import('@client/components/dashboard/views/campaign-detail');
    expect(module).toHaveProperty('CampaignMetadata');
  });

  it('should export CampaignCreditUsage', async () => {
    const module = await import('@client/components/dashboard/views/campaign-detail');
    expect(module).toHaveProperty('CampaignCreditUsage');
  });

  it('should export ArticleQueueTable', async () => {
    const module = await import('@client/components/dashboard/views/campaign-detail');
    expect(module).toHaveProperty('ArticleQueueTable');
  });

  it('should export all components simultaneously', async () => {
    const module = await import('@client/components/dashboard/views/campaign-detail');
    const exports = Object.keys(module);

    expect(exports).toContain('CampaignDetailHeader');
    expect(exports).toContain('CampaignStatsGrid');
    expect(exports).toContain('CampaignProgress');
    expect(exports).toContain('CampaignMetadata');
    expect(exports).toContain('CampaignCreditUsage');
    expect(exports).toContain('ArticleQueueTable');
  });

  it('should not have default export', async () => {
    const module = await import('@client/components/dashboard/views/campaign-detail');
    // Barrel exports typically don't have default exports
    // Check that default is undefined or the module itself (CommonJS interop)
    const defaultExport = module.default;
    expect(
      defaultExport === undefined ||
        (typeof defaultExport === 'object' && Object.keys(defaultExport).length === 0) ||
        defaultExport === module
    ).toBe(true);
  });
});
