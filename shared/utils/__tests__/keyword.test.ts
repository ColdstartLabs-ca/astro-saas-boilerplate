/**
 * Keyword Normalization Utilities Tests
 *
 * Tests for keyword normalization functions used for duplicate detection.
 */

import { describe, it, expect } from 'vitest';
import { normalizeKeyword, areKeywordsEquivalent } from '../keyword';

describe('normalizeKeyword', () => {
  it('should convert to lowercase', () => {
    expect(normalizeKeyword('SEO Optimization')).toBe('seo optimization');
    expect(normalizeKeyword('COFFEE MACHINES')).toBe('coffee machines');
    expect(normalizeKeyword('MyKeyword')).toBe('mykeyword');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(normalizeKeyword('  seo optimization')).toBe('seo optimization');
    expect(normalizeKeyword('seo optimization  ')).toBe('seo optimization');
    expect(normalizeKeyword('  seo optimization  ')).toBe('seo optimization');
  });

  it('should collapse internal whitespace to single spaces', () => {
    expect(normalizeKeyword('seo    optimization')).toBe('seo optimization');
    expect(normalizeKeyword('seo  optimization')).toBe('seo optimization');
    expect(normalizeKeyword('best   coffee   machines')).toBe('best coffee machines');
    expect(normalizeKeyword('  best   coffee   machines  ')).toBe('best coffee machines');
  });

  it('should handle tabs and newlines', () => {
    expect(normalizeKeyword('seo\toptimization')).toBe('seo optimization');
    expect(normalizeKeyword('seo\noptimization')).toBe('seo optimization');
    expect(normalizeKeyword('seo\r\noptimization')).toBe('seo optimization');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeKeyword('')).toBe('');
    expect(normalizeKeyword('   ')).toBe('');
    expect(normalizeKeyword('    ')).toBe('');
  });

  it('should handle single word keywords', () => {
    expect(normalizeKeyword('SEO')).toBe('seo');
    expect(normalizeKeyword('  SEO  ')).toBe('seo');
    expect(normalizeKeyword('seo')).toBe('seo');
  });

  it('should handle multi-word keywords with special characters', () => {
    // Note: normalizeKeyword only handles whitespace, not special characters
    // Special characters are preserved for keyword matching purposes
    expect(normalizeKeyword('SEO Optimization - Best Guide')).toBe('seo optimization - best guide');
    expect(normalizeKeyword('SEO & Optimization')).toBe('seo & optimization');
  });

  it('should handle unicode characters', () => {
    expect(normalizeKeyword('Café')).toBe('café');
    expect(normalizeKeyword('SEO优化')).toBe('seo优化');
  });

  it('should handle numbers', () => {
    expect(normalizeKeyword('Top 10 SEO Tips')).toBe('top 10 seo tips');
    expect(normalizeKeyword('2024 Guide')).toBe('2024 guide');
  });
});

describe('areKeywordsEquivalent', () => {
  it('should return true for identical keywords', () => {
    expect(areKeywordsEquivalent('SEO Optimization', 'SEO Optimization')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(areKeywordsEquivalent('SEO Optimization', 'seo optimization')).toBe(true);
    expect(areKeywordsEquivalent('SEO OPTIMIZATION', 'SeO oPtImIzAtIoN')).toBe(true);
    expect(areKeywordsEquivalent('Coffee Machines', 'coffee machines')).toBe(true);
  });

  it('should ignore leading/trailing whitespace', () => {
    expect(areKeywordsEquivalent('SEO Optimization', '  SEO Optimization')).toBe(true);
    expect(areKeywordsEquivalent('SEO Optimization', 'SEO Optimization  ')).toBe(true);
    expect(areKeywordsEquivalent('  SEO Optimization  ', 'SEO Optimization')).toBe(true);
  });

  it('should ignore internal whitespace differences', () => {
    expect(areKeywordsEquivalent('SEO Optimization', 'SEO    Optimization')).toBe(true);
    expect(areKeywordsEquivalent('Best Coffee Machines', 'Best   Coffee   Machines')).toBe(true);
  });

  it('should return false for different keywords', () => {
    expect(areKeywordsEquivalent('SEO', 'SEM')).toBe(false);
    expect(areKeywordsEquivalent('Coffee Machines', 'Coffee Makers')).toBe(false);
    expect(areKeywordsEquivalent('SEO Optimization', 'SEM Optimization')).toBe(false);
  });

  it('should handle empty strings', () => {
    expect(areKeywordsEquivalent('', '')).toBe(true);
    expect(areKeywordsEquivalent('SEO', '')).toBe(false);
    expect(areKeywordsEquivalent('', 'SEO')).toBe(false);
    expect(areKeywordsEquivalent('  ', '')).toBe(true);
  });

  it('should be symmetric', () => {
    const result1 = areKeywordsEquivalent('SEO Optimization', 'seo    optimization');
    const result2 = areKeywordsEquivalent('seo    optimization', 'SEO Optimization');
    expect(result1).toBe(result2);
  });

  it('should handle special characters consistently', () => {
    expect(areKeywordsEquivalent('SEO & Optimization', 'SEO & Optimization')).toBe(true);
    expect(areKeywordsEquivalent('SEO - Optimization', 'SEO - Optimization')).toBe(true);
    expect(areKeywordsEquivalent('SEO & Optimization', 'SEO - Optimization')).toBe(false);
  });
});
