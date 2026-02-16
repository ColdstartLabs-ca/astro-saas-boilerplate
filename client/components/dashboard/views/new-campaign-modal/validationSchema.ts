/**
 * Validation schema for NewCampaignModal form
 */
import { z } from 'zod';

export const campaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be 100 characters or less'),
  keywords: z.string().min(1, 'At least one keyword is required'),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
  imagePreset: z.string().optional(),
  // Schedule fields
  scheduleEnabled: z.boolean().optional(),
  scheduleFrequency: z
    .enum([
      '3x_daily',
      '2x_daily',
      'daily',
      'every_other_day',
      '3x_weekly',
      '2x_weekly',
      'weekly',
      'every_2_weeks',
    ])
    .optional(),
  scheduleBatchSize: z.number().int().min(1).max(50).optional(),
  scheduleHour: z.number().int().min(0).max(23).optional(),
  scheduleTimezone: z.string().optional(),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;
