/**
 * Campaign Validation Schemas
 * Single source of truth for campaign-related Zod schemas.
 * Used by both API routes and server services.
 */

import { z } from 'zod';
import { isValidImagePreset } from '@shared/config/image-models.config';
import { isValidTimezone } from '@shared/config/scheduling.config';

// =============================================================================
// Constants
// =============================================================================

export const TONES = ['professional', 'casual', 'witty', 'academic'] as const;
export type Tone = (typeof TONES)[number];

export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'scheduled'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const SCHEDULE_FREQUENCIES = [
  '3x_daily',
  '2x_daily',
  'daily',
  'every_other_day',
  '3x_weekly',
  '2x_weekly',
  'weekly',
  'every_2_weeks',
] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for campaign creation
 */
export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be 100 characters or less')
    .trim(),
  projectId: z.string().uuid('Invalid project ID'),
  keywords: z
    .array(z.string().min(1).max(200))
    .min(1, 'At least one keyword is required')
    .max(500, 'Maximum 500 keywords allowed')
    .optional()
    .transform(v => v ?? []),
  model: z.string().optional(),
  tone: z.enum(TONES).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
  imagePreset: z
    .string()
    .optional()
    .refine(val => !val || isValidImagePreset(val), { message: 'Invalid image preset' }),
  // Scheduling fields
  scheduleFrequency: z.enum(SCHEDULE_FREQUENCIES).optional(),
  scheduleBatchSize: z.number().int().min(1).max(50).optional(),
  scheduleTimezone: z
    .string()
    .min(1, 'Timezone is required')
    .max(100)
    .refine(isValidTimezone, { message: 'Invalid IANA timezone (e.g., America/New_York)' })
    .optional(),
  scheduleHour: z.number().int().min(0).max(23).optional(),
});

/**
 * Schema for campaign update (all fields optional)
 */
export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  // Status is allowed for simple pause/resume transitions on non-scheduled campaigns
  // For scheduled campaigns, use dedicated endpoints: startSchedule, pauseSchedule, resumeSchedule
  status: z.enum(['active', 'paused']).optional(),
  model: z.string().optional(),
  tone: z.enum(TONES).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
  imagePreset: z
    .string()
    .optional()
    .refine(val => !val || isValidImagePreset(val), { message: 'Invalid image preset' }),
  // Scheduling fields
  scheduleFrequency: z.enum(SCHEDULE_FREQUENCIES).nullable().optional(),
  scheduleBatchSize: z.number().int().min(1).max(50).optional(),
  scheduleTimezone: z
    .string()
    .min(1, 'Timezone is required')
    .max(100)
    .refine(isValidTimezone, { message: 'Invalid IANA timezone (e.g., America/New_York)' })
    .optional(),
  scheduleHour: z.number().int().min(0).max(23).optional(),
});

/**
 * Schema for adding keywords to a campaign
 */
export const addKeywordsSchema = z.object({
  keywords: z
    .array(z.string().min(1).max(200))
    .min(1, 'At least one keyword is required')
    .max(500, 'Maximum 500 keywords allowed'),
});

/**
 * Extended version with campaignId (used in service layer)
 */
export const addKeywordsWithCampaignSchema = addKeywordsSchema.extend({
  campaignId: z.string().uuid('Invalid campaign ID'),
});

// =============================================================================
// Types
// =============================================================================

export type ICreateCampaignSchemaInput = z.infer<typeof createCampaignSchema>;
export type IUpdateCampaignSchemaInput = z.infer<typeof updateCampaignSchema>;
export type IAddKeywordsSchemaInput = z.infer<typeof addKeywordsSchema>;
