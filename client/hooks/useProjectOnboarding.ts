/**
 * useProjectOnboarding Hook
 * Combines React Hook Form with Stepper for project onboarding
 *
 * Features:
 * - Form state management with RHF
 * - Multi-step navigation
 * - Per-step validation
 * - Project creation integration
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useState } from 'react';
import { useStepper } from './useStepper';
import {
  projectOnboardingSchema,
  transformProjectOnboardingInput,
  type IProjectOnboardingInput,
} from '@shared/validation/project.schema';
import { useProjects } from './useProjects';
import { useLogger } from '@client/utils/logger';

// =============================================================================
// Types
// =============================================================================

export interface IUseProjectOnboardingReturn {
  // Form state
  form: ReturnType<typeof useForm<IProjectOnboardingInput>>;

  // Stepper state
  stepper: ReturnType<typeof useStepper>;

  // Actions
  nextStep: () => Promise<boolean>;
  prevStep: () => void;
  submit: () => Promise<void>;

  // State
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useProjectOnboarding(): IUseProjectOnboardingReturn {
  const logger = useLogger('useProjectOnboarding');
  const { createProject } = useProjects();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stepper configuration
  const stepper = useStepper({
    steps: [
      { id: 'basic', label: 'Basic Info' },
      { id: 'platform', label: 'Platform' },
      { id: 'preferences', label: 'Preferences' },
    ],
    initialStep: 0,
  });

  // Initialize React Hook Form
  const form = useForm<IProjectOnboardingInput>({
    resolver: zodResolver(projectOnboardingSchema),
    defaultValues: {
      name: '',
      domain: '',
      industry: undefined,
      cmsType: 'wordpress',
      tone: 'professional',
      frequency: 'weekly',
      targetWordCount: '1000',
    },
    mode: 'onTouched',
  });

  // Validate current step and move to next
  const nextStep = useCallback(async (): Promise<boolean> => {
    const { currentStep } = stepper;

    // Define fields for each step
    const stepFields: Record<number, (keyof IProjectOnboardingInput)[]> = {
      0: ['name', 'domain', 'industry'],
      1: ['cmsType'],
      2: ['tone', 'frequency', 'targetWordCount'],
    };

    const fieldsToValidate = stepFields[currentStep] || [];

    // Validate only the current step's fields
    const isValid = await form.trigger(fieldsToValidate);

    if (!isValid) {
      return false;
    }

    stepper.nextStep();
    return true;
  }, [stepper, form]);

  // Go to previous step
  const prevStep = useCallback(() => {
    stepper.prevStep();
  }, [stepper]);

  // Submit the form and create project
  const submit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Final validation of entire form
      const isValid = await form.trigger();
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }

      const values = form.getValues();

      // Transform to API format
      const projectData = transformProjectOnboardingInput(values);

      await createProject(projectData);
      logger.info('Project created successfully', { projectName: projectData.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      logger.error('Failed to create project', { error: message });
      throw err; // Re-throw so caller can handle
    } finally {
      setIsSubmitting(false);
    }
  }, [form, createProject, logger]);

  return {
    form,
    stepper,
    nextStep,
    prevStep,
    submit,
    isSubmitting,
    error,
    clearError: () => setError(null),
  };
}
