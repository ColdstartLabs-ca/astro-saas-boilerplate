/**
 * OnboardingStepProject Component
 * Step 1 of onboarding: Create a new project
 * Required step - cannot be skipped
 */

'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FolderPlus, Globe, Briefcase } from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useProjectStore } from '@client/store/projectStore';
import { useProjects } from '@client/hooks/useProjects';
import { useOnboardingProgress } from '@client/hooks/useOnboardingProgress';
import { OnboardingStep } from '@shared/types/onboarding.types';
import type { ICreateProjectInput } from '@shared/types/project.types';

// =============================================================================
// Validation Schema
// =============================================================================

/**
 * Normalize a domain input into a valid URL.
 * Handles: "example.com", "www.example.com", "http://example.com", "localhost:3000"
 */
function normalizeDomain(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('localhost')) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

const projectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less'),
  domain: z
    .string()
    .optional()
    .transform(val => (val ? normalizeDomain(val) : val))
    .refine(val => !val || val.startsWith('localhost') || z.string().url().safeParse(val).success, {
      message: 'Please enter a valid domain (e.g., example.com)',
    }),
  industry: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// =============================================================================
// Props
// =============================================================================

interface IOnboardingStepProjectProps {
  /** Callback when step is completed successfully */
  onComplete: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const INDUSTRY_OPTIONS = [
  { value: '', label: 'Select an industry (optional)' },
  { value: 'technology', label: 'Technology & Software' },
  { value: 'ecommerce', label: 'E-commerce & Retail' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare & Medical' },
  { value: 'education', label: 'Education & Training' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'travel', label: 'Travel & Hospitality' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'fitness', label: 'Fitness & Wellness' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepProject({ onComplete }: IOnboardingStepProjectProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setProjectId, markStepComplete } = useOnboardingStore();
  const { setActiveProjectId } = useProjectStore();
  const { createProject } = useProjects();
  const { updateProgress, isUpdating } = useOnboardingProgress();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      domain: '',
      industry: '',
    },
  });

  const watchedName = watch('name');

  const onSubmit = useCallback(
    async (data: ProjectFormData) => {
      setIsSubmitting(true);
      try {
        // Create the project
        const project = await createProject({
          name: data.name,
          domain: data.domain || undefined,
          industry: data.industry || undefined,
        } as ICreateProjectInput);

        // Update onboarding store + persist project selection
        setProjectId(project.id);
        setActiveProjectId(project.id);
        markStepComplete(OnboardingStep.PROJECT_CREATION);

        // Persist progress to server
        await updateProgress({
          currentStep: OnboardingStep.GSC_CONNECTION,
          completedSteps: [OnboardingStep.PROJECT_CREATION],
          skippedSteps: [],
        });

        // Notify parent
        onComplete();
      } catch (error) {
        console.error('Failed to create project:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [createProject, setProjectId, setActiveProjectId, markStepComplete, updateProgress, onComplete]
  );

  const isLoading = isSubmitting || isUpdating;

  return (
    <div className="space-y-4">
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Project Name */}
        <div className="space-y-2">
          <label htmlFor="project-name" className="block text-sm font-medium text-white">
            Project Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              {...register('name')}
              id="project-name"
              type="text"
              placeholder="e.g., My Blog, Company Website"
              className={`w-full bg-main border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all ${
                errors.name ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
              }`}
              autoFocus
              disabled={isLoading}
            />
          </div>
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          <p className="text-xs text-muted">{watchedName.length}/100 characters</p>
        </div>

        {/* Domain */}
        <div className="space-y-2">
          <label htmlFor="project-domain" className="block text-sm font-medium text-white">
            Website Domain <span className="text-muted">(optional)</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              {...register('domain')}
              id="project-domain"
              type="text"
              placeholder="example.com"
              className={`w-full bg-main border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all ${
                errors.domain ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
              }`}
              disabled={isLoading}
            />
          </div>
          {errors.domain && <p className="text-red-400 text-xs mt-1">{errors.domain.message}</p>}
          <p className="text-xs text-muted">We&apos;ll add https:// automatically if missing</p>
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <label htmlFor="project-industry" className="block text-sm font-medium text-white">
            Industry <span className="text-muted">(optional)</span>
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <select
              {...register('industry')}
              id="project-industry"
              className={`w-full bg-main border rounded-lg pl-10 pr-10 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer transition-all ${
                errors.industry ? 'border-red-500' : 'border-border'
              }`}
              disabled={isLoading}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem',
              }}
            >
              {INDUSTRY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted">Helps us provide industry-specific recommendations</p>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <DashboardButton
            type="submit"
            className="w-full shadow-lg shadow-accent/20"
            disabled={isLoading || !watchedName.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Project...
              </>
            ) : (
              'Create Project & Continue'
            )}
          </DashboardButton>
        </div>
      </form>

      {/* Help Text */}
      <div className="bg-accent/5 border border-accent/10 rounded-lg p-4">
        <p className="text-xs text-secondary">
          <strong className="text-white">Tip:</strong> You can create multiple projects later to
          manage different websites or clients. This project will be your default workspace.
        </p>
      </div>
    </div>
  );
}
