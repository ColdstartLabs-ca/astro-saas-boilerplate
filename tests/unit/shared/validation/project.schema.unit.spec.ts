/**
 * Project Validation Schema Unit Tests
 *
 * Tests for project validation schemas including:
 * - Constants (CMS_PLATFORMS, INDUSTRIES, FREQUENCIES)
 * - contentPreferencesSchema validation
 * - projectOnboardingSchema validation
 * - transformProjectOnboardingInput function
 */

import { describe, it, expect } from 'vitest';
import {
  CMS_PLATFORMS,
  INDUSTRIES,
  FREQUENCIES,
  type CMSPlatform,
  type Industry,
  type Frequency,
  contentPreferencesSchema,
  projectOnboardingSchema,
  transformProjectOnboardingInput,
  type IContentPreferences,
  type IProjectOnboardingInput,
  type ICreateProjectFromOnboarding,
} from '@shared/validation/project.schema';

describe('shared/validation/project.schema', () => {
  describe('Constants', () => {
    describe('CMS_PLATFORMS', () => {
      it('should have all expected CMS platforms', () => {
        expect(CMS_PLATFORMS).toContain('wordpress');
        expect(CMS_PLATFORMS).toContain('webflow');
        expect(CMS_PLATFORMS).toContain('shopify');
        expect(CMS_PLATFORMS).toContain('other');
      });

      it('should have 4 CMS platforms', () => {
        expect(CMS_PLATFORMS).toHaveLength(4);
      });

      it('should be readonly array', () => {
        // TypeScript readonly assertion - we just verify it's an array
        expect(Array.isArray(CMS_PLATFORMS)).toBe(true);
        // Attempting to mutate should result in a TypeScript error (compile-time check)
        expect(CMS_PLATFORMS).toEqual(['wordpress', 'webflow', 'shopify', 'other']);
      });

      it('should export CMSPlatform type', () => {
        const platform: CMSPlatform = 'wordpress';
        expect(platform).toBe('wordpress');
      });
    });

    describe('INDUSTRIES', () => {
      it('should have all expected industries', () => {
        expect(INDUSTRIES).toContain('tech');
        expect(INDUSTRIES).toContain('health');
        expect(INDUSTRIES).toContain('finance');
        expect(INDUSTRIES).toContain('ecommerce');
        expect(INDUSTRIES).toContain('education');
        expect(INDUSTRIES).toContain('lifestyle');
        expect(INDUSTRIES).toContain('realestate');
        expect(INDUSTRIES).toContain('legal');
        expect(INDUSTRIES).toContain('marketing');
        expect(INDUSTRIES).toContain('other');
      });

      it('should have 10 industries', () => {
        expect(INDUSTRIES).toHaveLength(10);
      });

      it('should be readonly array', () => {
        // TypeScript readonly assertion - we just verify it's an array
        expect(Array.isArray(INDUSTRIES)).toBe(true);
        expect(INDUSTRIES).toEqual([
          'tech',
          'health',
          'finance',
          'ecommerce',
          'education',
          'lifestyle',
          'realestate',
          'legal',
          'marketing',
          'other',
        ]);
      });

      it('should export Industry type', () => {
        const industry: Industry = 'tech';
        expect(industry).toBe('tech');
      });
    });

    describe('FREQUENCIES', () => {
      it('should have all expected frequencies', () => {
        expect(FREQUENCIES).toContain('daily');
        expect(FREQUENCIES).toContain('3x_week');
        expect(FREQUENCIES).toContain('weekly');
      });

      it('should have 3 frequencies', () => {
        expect(FREQUENCIES).toHaveLength(3);
      });

      it('should be readonly array', () => {
        // TypeScript readonly assertion - we just verify it's an array
        expect(Array.isArray(FREQUENCIES)).toBe(true);
        expect(FREQUENCIES).toEqual(['daily', '3x_week', 'weekly']);
      });

      it('should export Frequency type', () => {
        const frequency: Frequency = 'daily';
        expect(frequency).toBe('daily');
      });
    });
  });

  describe('contentPreferencesSchema', () => {
    it('should validate valid content preferences', () => {
      const validInput = {
        frequency: 'daily',
      };
      const result = contentPreferencesSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should validate all frequency options', () => {
      const frequencies: Frequency[] = ['daily', '3x_week', 'weekly'];
      frequencies.forEach(frequency => {
        const result = contentPreferencesSchema.safeParse({ frequency });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid frequency', () => {
      const result = contentPreferencesSchema.safeParse({
        frequency: 'invalid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please select a frequency');
      }
    });

    it('should reject missing frequency', () => {
      const result = contentPreferencesSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty frequency', () => {
      const result = contentPreferencesSchema.safeParse({
        frequency: '',
      });
      expect(result.success).toBe(false);
    });

    it('should export IContentPreferences type', () => {
      const preferences: IContentPreferences = {
        frequency: 'weekly',
      };
      expect(preferences.frequency).toBe('weekly');
    });
  });

  describe('projectOnboardingSchema', () => {
    describe('valid inputs', () => {
      it('should validate complete valid project onboarding data', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'My SEO Project',
          domain: 'https://example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validInput);
        }
      });

      it('should validate with optional domain omitted', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'My SEO Project',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should validate all CMS platforms', () => {
        const platforms: CMSPlatform[] = ['wordpress', 'webflow', 'shopify', 'other'];
        platforms.forEach(cmsType => {
          const validInput: IProjectOnboardingInput = {
            name: 'Test Project',
            industry: 'tech',
            cmsType,
            frequency: 'weekly',
          };
          const result = projectOnboardingSchema.safeParse(validInput);
          expect(result.success).toBe(true);
        });
      });

      it('should validate all industries', () => {
        const industries: Industry[] = [
          'tech',
          'health',
          'finance',
          'ecommerce',
          'education',
          'lifestyle',
          'realestate',
          'legal',
          'marketing',
          'other',
        ];
        industries.forEach(industry => {
          const validInput: IProjectOnboardingInput = {
            name: 'Test Project',
            industry,
            cmsType: 'wordpress',
            frequency: 'weekly',
          };
          const result = projectOnboardingSchema.safeParse(validInput);
          expect(result.success).toBe(true);
        });
      });

      it('should validate all frequencies', () => {
        const frequencies: Frequency[] = ['daily', '3x_week', 'weekly'];
        frequencies.forEach(frequency => {
          const validInput: IProjectOnboardingInput = {
            name: 'Test Project',
            industry: 'tech',
            cmsType: 'wordpress',
            frequency,
          };
          const result = projectOnboardingSchema.safeParse(validInput);
          expect(result.success).toBe(true);
        });
      });

      it('should validate domain with https protocol', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'https://example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should validate domain with http protocol', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'http://example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should validate domain without protocol (plain domain)', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should validate domain with subdomain', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'blog.example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should validate domain with full URL', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'https://blog.example.com/path',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should accept project name at minimum length (2 characters)', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'AB',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should accept project name at maximum length (100 characters)', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'A'.repeat(100),
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should accept domain at maximum length (255 characters)', () => {
        const validInput: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'https://' + 'a'.repeat(240) + '.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = projectOnboardingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should export IProjectOnboardingInput type', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        expect(input.name).toBe('Test');
      });
    });

    describe('invalid inputs', () => {
      it('should reject missing name', () => {
        const result = projectOnboardingSchema.safeParse({
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
        // When field is completely missing, Zod returns "Required"
        if (!result.success) {
          expect(result.error.errors.some(e => e.message === 'Required')).toBe(true);
        }
      });

      it('should reject empty name', () => {
        const result = projectOnboardingSchema.safeParse({
          name: '',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Project name is required');
        }
      });

      it('should reject name shorter than 2 characters', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'A',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Project name must be at least 2 characters');
        }
      });

      it('should reject name longer than 100 characters', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'A'.repeat(101),
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            'Project name must be 100 characters or less'
          );
        }
      });

      it('should reject domain longer than 255 characters', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'Test Project',
          domain: 'https://' + 'a'.repeat(250) + '.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Domain URL is too long');
        }
      });

      it('should reject invalid domain format', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'Test Project',
          domain: 'not a domain',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            'Please enter a valid domain (e.g., example.com)'
          );
        }
      });

      it('should reject domain starting with spaces', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'Test Project',
          domain: ' example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing industry', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'Test Project',
          cmsType: 'wordpress',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Please select an industry');
        }
      });

      it('should reject invalid industry', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'Test Project',
          industry: 'invalid',
          cmsType: 'wordpress',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing cmsType', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'Test Project',
          industry: 'tech',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Please select a platform');
        }
      });

      it('should reject invalid cmsType', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'Test Project',
          industry: 'tech',
          cmsType: 'invalid',
          frequency: 'daily',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing frequency', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'Test Project',
          industry: 'tech',
          cmsType: 'wordpress',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Please select a frequency');
        }
      });

      it('should reject invalid frequency', () => {
        const result = projectOnboardingSchema.safeParse({
          name: 'Test Project',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'invalid',
        });
        expect(result.success).toBe(false);
      });

      it('should reject empty object', () => {
        const result = projectOnboardingSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should reject null values', () => {
        const result = projectOnboardingSchema.safeParse({
          name: null,
          industry: null,
          cmsType: null,
          frequency: null,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('transformProjectOnboardingInput', () => {
    describe('domain transformation', () => {
      it('should prepend https:// to domain without protocol', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.domain).toBe('https://example.com');
      });

      it('should keep https:// protocol if already present', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'https://example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.domain).toBe('https://example.com');
      });

      it('should keep http:// protocol if already present', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'http://example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.domain).toBe('http://example.com');
      });

      it('should handle HTTPS protocol (case insensitive)', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'HTTPS://example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.domain).toBe('HTTPS://example.com');
      });

      it('should handle HTTP protocol (case insensitive)', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'HTTP://example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.domain).toBe('HTTP://example.com');
      });

      it('should return undefined for missing domain', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.domain).toBeUndefined();
      });

      it('should return undefined for empty string domain', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: '',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.domain).toBeUndefined();
      });
    });

    describe('field mapping', () => {
      it('should map cmsType to cms_type', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          domain: 'example.com',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.cms_type).toBe('wordpress');
        expect(result).not.toHaveProperty('cmsType');
      });

      it('should wrap content preferences in content_preferences object', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'weekly',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.content_preferences).toEqual({
          frequency: 'weekly',
        });
      });

      it('should keep name as-is', () => {
        const input: IProjectOnboardingInput = {
          name: 'My SEO Project',
          industry: 'tech',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.name).toBe('My SEO Project');
      });

      it('should keep industry as-is', () => {
        const input: IProjectOnboardingInput = {
          name: 'Test Project',
          industry: 'finance',
          cmsType: 'webflow',
          frequency: '3x_week',
        };
        const result = transformProjectOnboardingInput(input);
        expect(result.industry).toBe('finance');
      });
    });

    describe('complete transformation', () => {
      it('should transform complete input with all fields', () => {
        const input: IProjectOnboardingInput = {
          name: 'SEO Blog Project',
          domain: 'blog.example.com',
          industry: 'marketing',
          cmsType: 'wordpress',
          frequency: 'daily',
        };
        const expected: ICreateProjectFromOnboarding = {
          name: 'SEO Blog Project',
          domain: 'https://blog.example.com',
          industry: 'marketing',
          cms_type: 'wordpress',
          content_preferences: {
            frequency: 'daily',
          },
        };
        const result = transformProjectOnboardingInput(input);
        expect(result).toEqual(expected);
      });

      it('should transform minimal input without domain', () => {
        const input: IProjectOnboardingInput = {
          name: 'Minimal Project',
          industry: 'other',
          cmsType: 'shopify',
          frequency: 'weekly',
        };
        const expected: ICreateProjectFromOnboarding = {
          name: 'Minimal Project',
          domain: undefined,
          industry: 'other',
          cms_type: 'shopify',
          content_preferences: {
            frequency: 'weekly',
          },
        };
        const result = transformProjectOnboardingInput(input);
        expect(result).toEqual(expected);
      });

      it('should export ICreateProjectFromOnboarding type', () => {
        const output: ICreateProjectFromOnboarding = {
          name: 'Test',
          domain: 'https://example.com',
          industry: 'tech',
          cms_type: 'wordpress',
          content_preferences: {
            frequency: 'daily',
          },
        };
        expect(output.name).toBe('Test');
        expect(output.content_preferences.frequency).toBe('daily');
      });
    });
  });
});
