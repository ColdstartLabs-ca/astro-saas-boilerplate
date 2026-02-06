/**
 * QuickGenerate Component
 *
 * Form for generating SEO articles from keywords.
 *
 * States:
 * - Idle: Form visible, ready to submit
 * - Generating: Form disabled, show progress
 * - Success: Show ArticlePreview
 * - Failed: Show error with retry
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProjects } from '@client/hooks/useProjects';
import { useArticleGeneration } from '@client/hooks/useArticleGeneration';
import { Button } from '@client/components/ui/Button';
import { InputField } from '@client/components/form/InputField';
import { AI_MODELS } from '@shared/config/ai-models.config';
import type { IGenerateArticleInput, IArticle } from '@shared/types/article.types';
import { ArticlePreview } from './ArticlePreview';

// =============================================================================
// Schema
// =============================================================================

const generateSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(200, 'Keyword is too long'),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
});

type GenerateFormData = z.infer<typeof generateSchema>;

// =============================================================================
// Component
// =============================================================================

interface IQuickGenerateProps {
  onGenerateComplete?: (article: IArticle) => void;
}

export function QuickGenerate({ onGenerateComplete }: IQuickGenerateProps): JSX.Element {
  const { activeProject, isLoading: projectsLoading } = useProjects();
  const [articleId, setArticleId] = useState<string | null>(null);
  const { article, isGenerating, error, generate, reset } = useArticleGeneration(
    articleId,
    setArticleId
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset: resetForm,
  } = useForm<GenerateFormData>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      keyword: '',
      model: 'openrouter/auto',
      tone: activeProject?.content_preferences?.tone ?? 'professional',
      targetWordCount: activeProject?.content_preferences?.targetWordCount ?? 1500,
    },
  });

  // Update tone default when active project changes
  useEffect(() => {
    if (activeProject?.content_preferences?.tone) {
      resetForm({
        keyword: watch('keyword'),
        model: watch('model'),
        tone: activeProject.content_preferences.tone,
        targetWordCount: watch('targetWordCount'),
      });
    }
  }, [activeProject?.content_preferences?.tone, resetForm, watch]);

  // Handle generation complete
  useEffect(() => {
    if (article && article.status === 'draft' && onGenerateComplete) {
      onGenerateComplete(article);
    }
  }, [article, onGenerateComplete]);

  const onSubmit = useCallback(
    async (data: GenerateFormData) => {
      if (!activeProject) return;

      const input: IGenerateArticleInput = {
        keyword: data.keyword,
        projectId: activeProject.id,
        model: data.model === 'openrouter/auto' ? undefined : data.model,
        tone: data.tone,
        targetWordCount: data.targetWordCount ?? 1500,
      };

      try {
        await generate(input);
      } catch (err) {
        console.error('Failed to generate article:', err);
      }
    },
    [activeProject, generate]
  );

  const handleReset = useCallback(() => {
    reset();
    resetForm();
    setArticleId(null);
  }, [reset, resetForm]);

  // Loading state for projects
  if (projectsLoading) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-border rounded w-1/3" />
          <div className="h-10 bg-border rounded" />
          <div className="h-10 bg-border rounded" />
        </div>
      </div>
    );
  }

  // No project state
  if (!activeProject) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border text-center">
        <p className="text-text-secondary mb-4">Create a project first to generate articles</p>
        <Button
          variant="primary"
          onClick={() => {
            /* Navigate to project creation */
          }}
        >
          Create Project
        </Button>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
            <svg
              className="animate-spin h-8 w-8 text-accent"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Generating your article...
          </h3>
          <p className="text-text-secondary text-sm">This usually takes 30-60 seconds</p>
        </div>
      </div>
    );
  }

  // Success state - show article preview
  if (article && article.status === 'draft') {
    return <ArticlePreview article={article} onGenerateAnother={handleReset} />;
  }

  // Failed state
  if (article?.status === 'failed' || error) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-error/10 mb-4">
            <svg
              className="h-6 w-6 text-error"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">Generation Failed</h3>
          <p className="text-text-secondary text-sm mb-4">
            {article?.generation_error || error || 'Something went wrong'}
          </p>
          <p className="text-text-secondary text-xs mb-6">Your credit has been refunded</p>
          <Button variant="primary" onClick={handleReset}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Idle state - show form
  return (
    <div className="bg-surface rounded-xl p-6 border border-border">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Generate Article</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Keyword Input */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Keyword or Topic
          </label>
          <InputField
            type="text"
            placeholder="e.g., best project management tools 2026"
            {...register('keyword')}
            error={errors.keyword?.message}
          />
        </div>

        {/* AI Model Selector */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">AI Model</label>
          <select
            {...register('model')}
            className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          >
            {Object.entries(AI_MODELS).map(([id, { name, provider }]) => (
              <option key={id} value={id}>
                {name} ({provider})
              </option>
            ))}
          </select>
        </div>

        {/* Tone Selector */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Tone</label>
          <select
            {...register('tone')}
            className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="witty">Witty</option>
            <option value="academic">Academic</option>
          </select>
        </div>

        {/* Word Count Selector */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Target Word Count
          </label>
          <select
            {...register('targetWordCount', { valueAsNumber: true })}
            className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          >
            <option value={800}>~800 words</option>
            <option value={1200}>~1200 words</option>
            <option value={1500}>~1500 words</option>
            <option value={2000}>~2000 words</option>
            <option value={2500}>~2500 words</option>
            <option value={3000}>~3000 words</option>
          </select>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          isLoading={isGenerating}
          disabled={!isValid}
          className="w-full"
        >
          Generate Article (1 credit)
        </Button>
      </form>
    </div>
  );
}
