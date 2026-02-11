/**
 * GSC Validation Schema Tests
 * Tests for Zod schemas used in GSC API routes
 */

import { describe, it, expect } from 'vitest';
import { connectGscSchema, updateGscConnectionSchema, gscCallbackSchema } from '../gsc.schema';

describe('GSC Validation Schemas', () => {
  describe('connectGscSchema', () => {
    it('should accept a valid UUID projectId', () => {
      const result = connectGscSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject a non-UUID projectId', () => {
      const result = connectGscSchema.safeParse({
        projectId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing projectId', () => {
      const result = connectGscSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty projectId', () => {
      const result = connectGscSchema.safeParse({
        projectId: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateGscConnectionSchema', () => {
    it('should accept a valid URL', () => {
      const result = updateGscConnectionSchema.safeParse({
        siteUrl: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should accept a URL with path', () => {
      const result = updateGscConnectionSchema.safeParse({
        siteUrl: 'https://example.com/path/to/site',
      });
      expect(result.success).toBe(true);
    });

    it('should reject an invalid URL', () => {
      const result = updateGscConnectionSchema.safeParse({
        siteUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing siteUrl', () => {
      const result = updateGscConnectionSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty siteUrl', () => {
      const result = updateGscConnectionSchema.safeParse({
        siteUrl: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('gscCallbackSchema', () => {
    it('should accept valid code and state', () => {
      const result = gscCallbackSchema.safeParse({
        code: '4/0AY0e-g7abc123',
        state: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing code', () => {
      const result = gscCallbackSchema.safeParse({
        state: 'some-state',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing state', () => {
      const result = gscCallbackSchema.safeParse({
        code: 'some-code',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty code', () => {
      const result = gscCallbackSchema.safeParse({
        code: '',
        state: 'some-state',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty state', () => {
      const result = gscCallbackSchema.safeParse({
        code: 'some-code',
        state: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject null values', () => {
      const result = gscCallbackSchema.safeParse({
        code: null,
        state: null,
      });
      expect(result.success).toBe(false);
    });
  });
});
