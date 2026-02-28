/**
 * OnboardingStepProject Component
 * Step 1 of onboarding: Create a new project with website intelligence
 * Required step - cannot be skipped
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  FolderPlus,
  Globe,
  Briefcase,
  FileText,
  Rss,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useProjectStore } from '@client/store/projectStore';
import { useProjects } from '@client/hooks/useProjects';
import type { ICreateProjectInput } from '@shared/types/project.types';
import {
  enhancedProjectSchema,
  LANGUAGE_OPTIONS,
  COUNTRY_OPTIONS,
  type IEnhancedProjectFormData,
} from '@shared/validation/onboarding.schema';
import { INDUSTRIES } from '@shared/validation/project.schema';
import { apiFetch } from '@client/utils/api-client';

// =============================================================================
// Props
// =============================================================================

interface IOnboardingStepProjectProps {
  onComplete: () => void;
}

// =============================================================================
// Types
// =============================================================================

interface ICrawlResponse {
  success: boolean;
  data: {
    metadata: {
      title: string | null;
      description: string | null;
    };
  };
}

interface IValidateSitemapResponse {
  success: boolean;
  data: {
    valid: boolean;
    reason?: 'not_found' | 'timeout' | 'error';
    details?: string;
  };
}

interface IUrlValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
}

const EMPTY_VALIDATION: IUrlValidationState = { isValidating: false, isValid: null, error: null };

// =============================================================================
// Helpers
// =============================================================================

/** Normalize a domain input into a valid URL. */
function normalizeDomain(val: string): string {
  const trimmed = val.trim().replace(/\/+$/, ''); // strip trailing slashes
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/** Does a value look like it could be a real domain? (contains at least one dot) */
function looksLikeDomain(val: string): boolean {
  const trimmed = val.trim();
  return trimmed.length >= 4 && trimmed.includes('.');
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepProject({ onComplete }: IOnboardingStepProjectProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeSuccess, setAnalyzeSuccess] = useState(false);
  const [sitemapValidation, setSitemapValidation] = useState<IUrlValidationState>(EMPTY_VALIDATION);
  const [blogValidation, setBlogValidation] = useState<IUrlValidationState>(EMPTY_VALIDATION);

  // Track the last domain used for auto-suggestions so we can update on domain change
  // without clobbering manually-edited values.
  const lastSuggestedDomainRef = useRef<string>('');
  // Separate ref: tracks the domain that was last analyzed (for success/error banners).
  // Must NOT be conflated with lastSuggestedDomainRef which updates on every blur.
  const lastAnalyzedDomainRef = useRef<string>('');
  // Abort controllers to cancel stale in-flight validation requests
  const sitemapAbortRef = useRef<AbortController | null>(null);
  const blogAbortRef = useRef<AbortController | null>(null);
  // BUG H20: abort controller for the crawl/analyze request
  const crawlAbortRef = useRef<AbortController | null>(null);
  // Debounce timer for auto-analyze
  const analyzeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BUG H20: abort all in-flight requests on unmount
  useEffect(() => {
    return () => {
      sitemapAbortRef.current?.abort();
      blogAbortRef.current?.abort();
      crawlAbortRef.current?.abort();
      if (analyzeDebounceRef.current) clearTimeout(analyzeDebounceRef.current);
    };
  }, []);

  const { setProjectId: setOnboardingProjectId } = useOnboardingStore();
  const { setActiveProjectId } = useProjectStore();
  const { createProject } = useProjects();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<IEnhancedProjectFormData>({
    resolver: zodResolver(enhancedProjectSchema),
    defaultValues: {
      name: '',
      domain: '',
      industry: '',
      description: '',
      language: 'en',
      country: 'US',
      sitemap_url: '',
      blog_url: '',
    },
  });

  const watchedName = watch('name');
  const watchedDomain = watch('domain');

  // ---------------------------------------------------------------------------
  // URL suggestion helpers
  // ---------------------------------------------------------------------------

  /**
   * Build the expected auto-suggestion URLs for a given domain.
   * Returns empty strings when the domain is empty.
   */
  function suggestionsFor(domain: string): { sitemap: string; blog: string } {
    const n = normalizeDomain(domain);
    return n ? { sitemap: `${n}/sitemap.xml`, blog: `${n}/blog` } : { sitemap: '', blog: '' };
  }

  /**
   * Suggest or update the sitemap / blog URL fields based on the current domain.
   * Updates a field only when:
   *  - it is empty, OR
   *  - it still matches the previous auto-suggestion (i.e. the user hasn't edited it)
   */
  const suggestUrlsFromDomain = useCallback(
    (domain: string) => {
      const prev = suggestionsFor(lastSuggestedDomainRef.current);
      const next = suggestionsFor(domain);
      if (!next.sitemap) return; // empty domain → nothing to suggest

      const currentSitemap = getValues('sitemap_url') ?? '';
      const currentBlog = getValues('blog_url') ?? '';

      if (!currentSitemap || currentSitemap === prev.sitemap) {
        setValue('sitemap_url', next.sitemap);
        setSitemapValidation(EMPTY_VALIDATION); // clear stale validation for old URL
        sitemapAbortRef.current?.abort();
      }
      if (!currentBlog || currentBlog === prev.blog) {
        setValue('blog_url', next.blog);
        setBlogValidation(EMPTY_VALIDATION); // clear stale validation for old URL
        blogAbortRef.current?.abort();
      }

      lastSuggestedDomainRef.current = normalizeDomain(domain);
    },
    [getValues, setValue]
  );

  // ---------------------------------------------------------------------------
  // URL validation
  // ---------------------------------------------------------------------------

  const validateUrlField = useCallback(
    async (
      url: string,
      setter: React.Dispatch<React.SetStateAction<IUrlValidationState>>,
      label: string,
      abortRef: React.MutableRefObject<AbortController | null>
    ) => {
      // Abort any in-flight validation for this field to prevent stale responses
      abortRef.current?.abort();

      if (!url) {
        setter(EMPTY_VALIDATION);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setter({ isValidating: true, isValid: null, error: null });
      try {
        const response = await apiFetch<IValidateSitemapResponse>(
          `/api/validate-sitemap?url=${encodeURIComponent(url)}`,
          { method: 'GET', signal: controller.signal }
        );
        if (controller.signal.aborted) return; // superseded by a newer request
        setter({
          isValidating: false,
          isValid: response.data.valid,
          error: response.data.valid ? null : `${label} not accessible`,
        });
      } catch (error) {
        if (controller.signal.aborted) return; // superseded by a newer request
        console.error(`[OnboardingStepProject] ${label} validation failed`, { error });
        setter({
          isValidating: false,
          isValid: false,
          error: error instanceof Error ? error.message : 'Validation failed',
        });
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  /**
   * Domain blur: suggest sitemap/blog URLs.
   * Must also call RHF's own onBlur so form validation still works.
   */
  const { onBlur: rhfDomainOnBlur, ...domainRegisterRest } = register('domain');

  const handleDomainBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      rhfDomainOnBlur(e); // preserve RHF validation
      const domain = getValues('domain');
      if (!domain) return;
      suggestUrlsFromDomain(domain);
    },
    [rhfDomainOnBlur, getValues, suggestUrlsFromDomain]
  );

  /** Sitemap: clear stale validation on typing, validate on blur. */
  const {
    onBlur: rhfSitemapOnBlur,
    onChange: rhfSitemapOnChange,
    ...sitemapRegisterRest
  } = register('sitemap_url');

  const handleSitemapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      rhfSitemapOnChange(e);
      setSitemapValidation(EMPTY_VALIDATION);
      sitemapAbortRef.current?.abort();
    },
    [rhfSitemapOnChange]
  );

  const handleSitemapBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      rhfSitemapOnBlur(e);
      validateUrlField(
        getValues('sitemap_url') ?? '',
        setSitemapValidation,
        'Sitemap URL',
        sitemapAbortRef
      );
    },
    [rhfSitemapOnBlur, getValues, validateUrlField]
  );

  /** Blog: clear stale validation on typing, validate on blur. */
  const {
    onBlur: rhfBlogOnBlur,
    onChange: rhfBlogOnChange,
    ...blogRegisterRest
  } = register('blog_url');

  const handleBlogChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      rhfBlogOnChange(e);
      setBlogValidation(EMPTY_VALIDATION);
      blogAbortRef.current?.abort();
    },
    [rhfBlogOnChange]
  );

  const handleBlogBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      rhfBlogOnBlur(e);
      validateUrlField(getValues('blog_url') ?? '', setBlogValidation, 'Blog URL', blogAbortRef);
    },
    [rhfBlogOnBlur, getValues, validateUrlField]
  );

  /**
   * Handle "Analyze Website" button click.
   * Crawls the website, auto-fills fields, suggests URLs, and validates them.
   */
  const handleAnalyzeWebsite = useCallback(async () => {
    const domain = getValues('domain');
    if (!domain) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeSuccess(false);
    // Reset stale validation while re-analyzing
    setSitemapValidation(EMPTY_VALIDATION);
    setBlogValidation(EMPTY_VALIDATION);

    const normalizedDomain = normalizeDomain(domain);
    lastAnalyzedDomainRef.current = normalizedDomain;
    console.info('[OnboardingStepProject] Analyzing website', { url: normalizedDomain });

    // BUG H20: abort any prior crawl request, then create a fresh controller
    crawlAbortRef.current?.abort();
    const crawlController = new AbortController();
    crawlAbortRef.current = crawlController;

    try {
      const response = await apiFetch<ICrawlResponse>('/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ url: normalizedDomain }),
        signal: crawlController.signal,
      });
      if (crawlController.signal.aborted) return;

      const { title, description } = response.data.metadata;
      console.info('[OnboardingStepProject] Crawl result', {
        title,
        hasDescription: !!description,
      });

      if (title && !getValues('name')) {
        setValue('name', title);
      }
      if (description) {
        setValue('description', description);
      }

      // Always update suggestions from the (possibly corrected) domain
      suggestUrlsFromDomain(domain);

      // Validate the (now-current) sitemap/blog URLs
      const currentSitemap = getValues('sitemap_url') ?? '';
      const currentBlog = getValues('blog_url') ?? '';
      validateUrlField(currentSitemap, setSitemapValidation, 'Sitemap URL', sitemapAbortRef);
      validateUrlField(currentBlog, setBlogValidation, 'Blog URL', blogAbortRef);

      setAnalyzeSuccess(true);
    } catch (error) {
      console.error('[OnboardingStepProject] Failed to analyze website', { error });
      setAnalyzeError(
        error instanceof Error ? error.message : 'Failed to analyze website. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [getValues, setValue, suggestUrlsFromDomain, validateUrlField]);

  // ---------------------------------------------------------------------------
  // Auto-analyze when domain looks valid (debounced)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (analyzeDebounceRef.current) clearTimeout(analyzeDebounceRef.current);

    const domain = watchedDomain ?? '';
    if (!looksLikeDomain(domain)) return;

    // Skip if we already analyzed this exact domain
    if (normalizeDomain(domain) === lastAnalyzedDomainRef.current) return;

    analyzeDebounceRef.current = setTimeout(() => {
      if (isSubmitting) return; // BUG L12: don't fire during form submission
      void handleAnalyzeWebsite();
    }, 700);

    return () => {
      if (analyzeDebounceRef.current) clearTimeout(analyzeDebounceRef.current);
    };
  }, [watchedDomain, handleAnalyzeWebsite, isSubmitting]);

  // ---------------------------------------------------------------------------
  // Form submit
  // ---------------------------------------------------------------------------

  const onSubmit = useCallback(
    async (data: IEnhancedProjectFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const project = await createProject({
          name: data.name,
          domain: data.domain ? normalizeDomain(data.domain) : undefined,
          industry: data.industry || undefined,
          language: data.language,
          country: data.country,
          description: data.description || undefined,
          sitemap_url: data.sitemap_url || undefined,
          blog_url: data.blog_url || undefined,
        } as ICreateProjectInput);

        setOnboardingProjectId(project.id);
        setActiveProjectId(project.id);
        onComplete();
      } catch (error) {
        console.error('Failed to create project:', error);
        setSubmitError(
          error instanceof Error ? error.message : 'Failed to create project. Please try again.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [createProject, setOnboardingProjectId, setActiveProjectId, onComplete]
  );

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const isLoading = isSubmitting;
  const showAnalyzeButton = looksLikeDomain(watchedDomain ?? '');

  // Clear stale analyze banners when domain is changed after a previous analyze.
  // Uses lastAnalyzedDomainRef (NOT lastSuggestedDomainRef) so that a plain blur
  // on a new domain doesn't resurface a stale success/error banner.
  const domainMatchesLastAnalyze =
    lastAnalyzedDomainRef.current !== '' &&
    normalizeDomain(watchedDomain ?? '') === lastAnalyzedDomainRef.current;
  const showAnalyzeSuccess = analyzeSuccess && domainMatchesLastAnalyze;
  const showAnalyzeError = !!analyzeError && domainMatchesLastAnalyze;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Your Project */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">
            Your Project
          </h3>

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
                aria-label="project name"
                className={`w-full bg-main border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all ${
                  errors.name ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
                }`}
                autoFocus
                disabled={isLoading}
              />
            </div>
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            <p className="text-xs text-muted">{(watchedName ?? '').length}/100 characters</p>
          </div>

          {/* Domain + Analyze Button */}
          <div className="space-y-2">
            <label htmlFor="project-domain" className="block text-sm font-medium text-white">
              Website URL <span className="text-muted">(optional)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  {...domainRegisterRest}
                  onBlur={handleDomainBlur}
                  id="project-domain"
                  type="text"
                  placeholder="example.com"
                  className={`w-full bg-main border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all ${
                    errors.domain ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
                  }`}
                  disabled={isLoading || isAnalyzing}
                />
              </div>
              {showAnalyzeButton && (
                <button
                  type="button"
                  onClick={handleAnalyzeWebsite}
                  disabled={isLoading || isAnalyzing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border border-accent/30 rounded-lg text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">Analyze</span>
                </button>
              )}
            </div>
            {errors.domain && <p className="text-red-400 text-xs mt-1">{errors.domain.message}</p>}
            <p className="text-xs text-muted">We&apos;ll add https:// automatically if missing</p>

            {/* Analyze Status */}
            {showAnalyzeSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-emerald-400">
                  Website analyzed! Description auto-filled below.
                </p>
              </div>
            )}
            {showAnalyzeError && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-amber-400">
                  {analyzeError} You can fill in the details manually.
                </p>
              </div>
            )}
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
                <option value="">Select an industry (optional)</option>
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>
                    {industry.charAt(0).toUpperCase() + industry.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted">Helps us provide industry-specific recommendations</p>
          </div>
        </div>

        {/* Section 2: About Your Website */}
        <div className="space-y-4 pt-4 border-t border-border/30">
          <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">
            About Your Website
          </h3>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="project-description" className="block text-sm font-medium text-white">
              Description <span className="text-muted">(auto-filled or manual)</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-5 h-5 text-muted" />
              <textarea
                {...register('description')}
                id="project-description"
                rows={3}
                placeholder="A brief description of your website..."
                className={`w-full bg-main border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all resize-none ${
                  errors.description ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.description && (
              <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Language + Country Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Language */}
            <div className="space-y-2">
              <label htmlFor="project-language" className="block text-sm font-medium text-white">
                Language
              </label>
              <select
                {...register('language')}
                id="project-language"
                className={`w-full bg-main border rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer transition-all ${
                  errors.language ? 'border-red-500' : 'border-border'
                }`}
                disabled={isLoading}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1rem',
                }}
              >
                {LANGUAGE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <label htmlFor="project-country" className="block text-sm font-medium text-white">
                Country
              </label>
              <select
                {...register('country')}
                id="project-country"
                className={`w-full bg-main border rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer transition-all ${
                  errors.country ? 'border-red-500' : 'border-border'
                }`}
                disabled={isLoading}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1rem',
                }}
              >
                {COUNTRY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sitemap URL */}
          <div className="space-y-2">
            <label htmlFor="project-sitemap" className="block text-sm font-medium text-white">
              Sitemap URL <span className="text-muted">(optional)</span>
            </label>
            <div className="relative">
              <Rss className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                {...sitemapRegisterRest}
                onChange={handleSitemapChange}
                onBlur={handleSitemapBlur}
                id="project-sitemap"
                type="text"
                placeholder="https://example.com/sitemap.xml"
                className={`w-full bg-main border rounded-lg pl-10 pr-10 py-2.5 text-white placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all ${
                  errors.sitemap_url
                    ? 'border-red-500 ring-1 ring-red-500/20'
                    : sitemapValidation.isValid === true
                      ? 'border-emerald-500'
                      : sitemapValidation.isValid === false
                        ? 'border-amber-500'
                        : 'border-border'
                }`}
                disabled={isLoading}
              />
              {sitemapValidation.isValidating && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted animate-spin" />
              )}
              {sitemapValidation.isValid === true && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
              )}
              {sitemapValidation.isValid === false && (
                <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
              )}
            </div>
            {errors.sitemap_url && (
              <p className="text-red-400 text-xs mt-1">{errors.sitemap_url.message}</p>
            )}
            {sitemapValidation.error && !errors.sitemap_url && (
              <p className="text-amber-400 text-xs mt-1">{sitemapValidation.error}</p>
            )}
            <p className="text-xs text-muted">Auto-suggested from your domain above</p>
          </div>

          {/* Blog URL */}
          <div className="space-y-2">
            <label htmlFor="project-blog" className="block text-sm font-medium text-white">
              Blog URL <span className="text-muted">(optional)</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                {...blogRegisterRest}
                onChange={handleBlogChange}
                onBlur={handleBlogBlur}
                id="project-blog"
                type="text"
                placeholder="https://example.com/blog"
                className={`w-full bg-main border rounded-lg pl-10 pr-10 py-2.5 text-white placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all ${
                  errors.blog_url
                    ? 'border-red-500 ring-1 ring-red-500/20'
                    : blogValidation.isValid === true
                      ? 'border-emerald-500'
                      : blogValidation.isValid === false
                        ? 'border-amber-500'
                        : 'border-border'
                }`}
                disabled={isLoading}
              />
              {blogValidation.isValidating && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted animate-spin" />
              )}
              {blogValidation.isValid === true && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
              )}
              {blogValidation.isValid === false && (
                <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
              )}
            </div>
            {errors.blog_url && (
              <p className="text-red-400 text-xs mt-1">{errors.blog_url.message}</p>
            )}
            {blogValidation.error && !errors.blog_url && (
              <p className="text-amber-400 text-xs mt-1">{blogValidation.error}</p>
            )}
            <p className="text-xs text-muted">Auto-suggested from your domain above</p>
          </div>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <DashboardButton
            type="submit"
            className="w-full shadow-lg shadow-accent/20"
            disabled={isLoading || !(watchedName ?? '').trim()}
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
