/**
 * ContentPreferencesSection Component
 * Form section for setting article generation preferences during onboarding
 *
 * Features:
 * - Article style dropdown (7 options, default: Informative)
 * - Internal links count dropdown (0/1/2/3/5, default: 2)
 * - Brand color hex input with color picker (default: #4F46E5)
 * - Image style visual selector (5 options, default: Cinematic)
 * - Global instructions textarea (optional, max 1000 chars)
 */

'use client';

import { useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Palette, Image, FileText, Link2, Zap } from 'lucide-react';
import type { IContentPreferences } from '@shared/types/project.types';

// =============================================================================
// Constants
// =============================================================================

export const ARTICLE_STYLES = [
  { value: 'informative', label: 'Informative' },
  { value: 'how-to', label: 'How-To' },
  { value: 'listicle', label: 'Listicle' },
  { value: 'opinion', label: 'Opinion' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'review', label: 'Review' },
  { value: 'comparison', label: 'Comparison' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '3x_week', label: '3× per week' },
  { value: 'weekly', label: 'Weekly' },
] as const;

export const INTERNAL_LINKS_OPTIONS = [
  { value: 0, label: '0 links' },
  { value: 1, label: '1 link' },
  { value: 2, label: '2 links' },
  { value: 3, label: '3 links' },
  { value: 5, label: '5 links' },
] as const;

export const IMAGE_STYLES = [
  { value: 'brand-text', label: 'Brand & Text', description: 'Clean branded graphics with text overlays' },
  { value: 'watercolor', label: 'Watercolor', description: 'Artistic watercolor-style illustrations' },
  { value: 'cinematic', label: 'Cinematic', description: 'High-quality cinematic photography style' },
  { value: 'illustration', label: 'Illustration', description: 'Digital illustration artwork' },
  { value: 'sketch', label: 'Sketch', description: 'Hand-drawn sketch style' },
] as const;

const DEFAULT_VALUES: IContentPreferences = {
  frequency: 'daily',
  articleStyle: 'informative',
  internalLinksCount: 2,
  brandColor: '#4F46E5',
  imageStyle: 'cinematic',
  globalInstructions: '',
  autoApprove: false,
};

// =============================================================================
// Validation Schema
// =============================================================================

const contentPreferencesFormSchema = z.object({
  frequency: z.enum(['daily', '3x_week', 'weekly']),
  articleStyle: z.enum(['informative', 'how-to', 'listicle', 'opinion', 'tutorial', 'review', 'comparison']),
  internalLinksCount: z.number().int().min(0).max(5),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  imageStyle: z.enum(['brand-text', 'watercolor', 'cinematic', 'illustration', 'sketch']),
  globalInstructions: z.string().max(1000).optional(),
  autoApprove: z.boolean().optional(),
});

type IFormValues = z.infer<typeof contentPreferencesFormSchema>;

// =============================================================================
// Props
// =============================================================================

export interface IContentPreferencesSectionProps {
  /** Current preferences value */
  value: IContentPreferences;
  /** Callback when preferences change */
  onChange: (prefs: IContentPreferences) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ContentPreferencesSection({
  value,
  onChange,
}: IContentPreferencesSectionProps): JSX.Element {
  const {
    control,
    watch,
    formState: { errors },
  } = useForm<IFormValues>({
    resolver: zodResolver(contentPreferencesFormSchema),
    defaultValues: {
      frequency: value.frequency ?? DEFAULT_VALUES.frequency!,
      articleStyle: value.articleStyle ?? DEFAULT_VALUES.articleStyle!,
      internalLinksCount: value.internalLinksCount ?? DEFAULT_VALUES.internalLinksCount!,
      brandColor: value.brandColor ?? DEFAULT_VALUES.brandColor!,
      imageStyle: value.imageStyle ?? DEFAULT_VALUES.imageStyle!,
      globalInstructions: value.globalInstructions ?? '',
      autoApprove: value.autoApprove ?? false,
    },
    mode: 'onChange',
  });

  // Stable mapper — doesn't re-create on every render
  const handleChange = useCallback(
    (updatedValues: Partial<IFormValues>) => {
      onChange({
        frequency: updatedValues.frequency ?? DEFAULT_VALUES.frequency!,
        articleStyle: updatedValues.articleStyle ?? DEFAULT_VALUES.articleStyle!,
        internalLinksCount: updatedValues.internalLinksCount ?? DEFAULT_VALUES.internalLinksCount!,
        brandColor: updatedValues.brandColor ?? DEFAULT_VALUES.brandColor!,
        imageStyle: updatedValues.imageStyle ?? DEFAULT_VALUES.imageStyle!,
        globalInstructions: updatedValues.globalInstructions || undefined,
        autoApprove: updatedValues.autoApprove ?? false,
      });
    },
    [onChange]
  );

  // Subscribe to form changes — fires only on actual value changes, not on every render.
  // Using watch() as a useEffect dependency causes an infinite loop because watch()
  // returns a new object reference on every render.
  useEffect(() => {
    const { unsubscribe } = watch((value) => handleChange(value));
    return () => unsubscribe();
  }, [watch, handleChange]);

  // Keep a snapshot for char count display and inline onChange spreads
  const formValues = watch();

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
          Content Preferences
        </h3>
        <p className="text-xs text-muted mt-1">
          Set defaults for your generated content. You can customize these later.
        </p>
      </div>

      {/* Publishing Frequency */}
      <div className="space-y-1.5">
        <label
          htmlFor="frequency"
          className="flex items-center gap-2 text-sm font-medium text-white"
        >
          <Calendar className="w-4 h-4 text-muted" />
          Publishing Frequency
        </label>
        <Controller
          name="frequency"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              id="frequency"
              className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-accent outline-none transition-all cursor-pointer"
              onChange={(e) => {
                field.onChange(e);
                handleChange({ ...formValues, frequency: e.target.value as IFormValues['frequency'] });
              }}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      {/* Row 1: Article Style + Internal Links */}
      <div className="grid grid-cols-2 gap-4">
        {/* Article Style */}
        <div className="space-y-1.5">
          <label
            htmlFor="article-style"
            className="flex items-center gap-2 text-sm font-medium text-white"
          >
            <FileText className="w-4 h-4 text-muted" />
            Article Style
          </label>
          <Controller
            name="articleStyle"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="article-style"
                className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-accent outline-none transition-all cursor-pointer"
                onChange={(e) => {
                  field.onChange(e);
                  handleChange({ ...formValues, articleStyle: e.target.value as IFormValues['articleStyle'] });
                }}
              >
                {ARTICLE_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        {/* Internal Links */}
        <div className="space-y-1.5">
          <label
            htmlFor="internal-links"
            className="flex items-center gap-2 text-sm font-medium text-white"
          >
            <Link2 className="w-4 h-4 text-muted" />
            Internal Links
          </label>
          <Controller
            name="internalLinksCount"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="internal-links"
                value={field.value}
                className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-accent outline-none transition-all cursor-pointer"
                onChange={(e) => {
                  field.onChange(Number(e.target.value));
                  handleChange({ ...formValues, internalLinksCount: Number(e.target.value) });
                }}
              >
                {INTERNAL_LINKS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
      </div>

      {/* Row 2: Brand Color + Image Style */}
      <div className="grid grid-cols-2 gap-4">
        {/* Brand Color */}
        <div className="space-y-1.5">
          <label
            htmlFor="brand-color"
            className="flex items-center gap-2 text-sm font-medium text-white"
          >
            <Palette className="w-4 h-4 text-muted" />
            Brand Color
          </label>
          <Controller
            name="brandColor"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                {/* Color Picker Swatch */}
                <input
                  type="color"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    handleChange({ ...formValues, brandColor: e.target.value });
                  }}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                {/* Hex Input */}
                <input
                  {...field}
                  id="brand-color"
                  type="text"
                  placeholder="#4F46E5"
                  className="flex-1 bg-main border border-border rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:ring-1 focus:ring-accent outline-none transition-all uppercase"
                  onChange={(e) => {
                    const val = e.target.value;
                    // Auto-prepend # if missing
                    const normalized = val.startsWith('#') ? val : `#${val}`;
                    field.onChange(normalized);
                    handleChange({ ...formValues, brandColor: normalized });
                  }}
                />
              </div>
            )}
          />
          {/* BUG L8: use semantic error token */}
          {errors.brandColor && (
            <p className="text-xs text-error">{errors.brandColor.message}</p>
          )}
        </div>

        {/* Image Style */}
        <div className="space-y-1.5">
          <label
            htmlFor="image-style"
            className="flex items-center gap-2 text-sm font-medium text-white"
          >
            <Image className="w-4 h-4 text-muted" />
            Image Style
          </label>
          <Controller
            name="imageStyle"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="image-style"
                className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-accent outline-none transition-all cursor-pointer"
                onChange={(e) => {
                  field.onChange(e);
                  handleChange({ ...formValues, imageStyle: e.target.value as IFormValues['imageStyle'] });
                }}
              >
                {IMAGE_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
      </div>

      {/* Global Instructions */}
      <div className="space-y-1.5">
        <label
          htmlFor="global-instructions"
          className="flex items-center gap-2 text-sm font-medium text-white"
        >
          Global Instructions
          <span className="text-xs text-muted font-normal">(optional)</span>
        </label>
        <Controller
          name="globalInstructions"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              id="global-instructions"
              placeholder="Additional instructions for the AI writer (e.g., 'Use British English', 'Avoid jargon', 'Include statistics when available')"
              rows={3}
              maxLength={1000}
              className="w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all resize-none"
              onChange={(e) => {
                field.onChange(e);
                handleChange({ ...formValues, globalInstructions: e.target.value });
              }}
            />
          )}
        />
        <div className="flex justify-between items-center">
          {/* BUG L8: use semantic error token */}
          {errors.globalInstructions && (
            <p className="text-xs text-error">{errors.globalInstructions.message}</p>
          )}
          <p className="text-xs text-muted ml-auto">
            {formValues.globalInstructions?.length ?? 0}/1000
          </p>
        </div>
      </div>

      {/* Article Approval */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            Article Approval
          </h4>
        </div>
        <Controller
          name="autoApprove"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      handleChange({ ...formValues, autoApprove: e.target.checked });
                    }}
                    className="sr-only peer"
                    id="auto-approve"
                    data-testid="auto-approve-toggle"
                  />
                  <div className="w-11 h-6 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </div>
                <div>
                  <span className="text-sm font-medium text-white">Auto-approve &amp; publish</span>
                  <p className="text-xs text-muted mt-0.5">
                    Articles are automatically approved and published to your connected integrations without manual review. Disable this to review each article before publishing.
                  </p>
                </div>
              </label>
              {(field.value ?? false) && (
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <Zap className="w-4 h-4 text-warning flex-shrink-0" />
                  <p className="text-xs text-warning">
                    Articles will go live on your website immediately after generation.
                  </p>
                </div>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}

// Export defaults for testing
export { DEFAULT_VALUES as CONTENT_PREFERENCES_DEFAULTS };
