'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Settings,
  CreditCard,
  FolderOpen,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import { useUserStore, useSubscription } from '@client/store/userStore';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { ProjectOnboarding } from '@client/components/projects/ProjectOnboarding';
import { ProjectList } from '@client/components/projects/ProjectList';
import { QuickGenerate } from '@client/components/articles/QuickGenerate';
import { getPlanDisplayName } from '@shared/config/stripe';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import { getTranslations } from '@src/i18n/utils';
import { cn } from '@client/utils/cn';

export function OverviewView(): JSX.Element {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const { user } = useUserStore();
  const subscription = useSubscription();
  const { projects, activeProject, isLoading } = useProjects();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const planDisplayName = getPlanDisplayName({
    subscriptionTier: user?.profile?.subscription_tier,
    priceId: subscription?.price_id,
  });

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';

  // Auto-show onboarding modal for first-time users
  useEffect(() => {
    if (!isLoading && projects.length === 0 && !showOnboarding) {
      setShowOnboarding(true);
    }
  }, [isLoading, projects.length, showOnboarding]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Header */}
      <div>
        <h1 className="text-xl font-bold text-white">
          {t('overview.welcomeBack', { name: displayName })}
        </h1>
        <p className="text-secondary text-sm mt-1">
          {activeProject
            ? t('overview.managing', { project: activeProject.name })
            : t('overview.getStarted')}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Plan */}
        <div className="bg-surface border border-border p-4 rounded-xl">
          <div className="text-secondary text-xs font-medium uppercase tracking-wider mb-1">
            {t('overview.currentPlan')}
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white">{planDisplayName}</div>
            {!user?.profile?.subscription_tier && (
              <button
                onClick={() => dashboardNavigate('/dashboard/billing')}
                className="text-xs font-medium text-accent hover:text-accent-light transition-colors"
              >
                {t('overview.upgrade')}
              </button>
            )}
          </div>
        </div>

        {/* Credits */}
        <div className="bg-surface border border-border p-4 rounded-xl">
          <div className="text-secondary text-xs font-medium uppercase tracking-wider mb-1">
            {t('overview.credits')}
          </div>
          <div className="mt-0.5">
            <CreditsDisplay />
          </div>
        </div>

        {/* Projects Count */}
        <div className="bg-surface border border-border p-4 rounded-xl">
          <div className="text-secondary text-xs font-medium uppercase tracking-wider mb-1">
            {t('overview.projects')}
          </div>
          <div className="flex items-end justify-between">
            <div className="text-xl font-bold text-white">{projects.length}</div>
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-xs font-medium text-accent hover:text-accent-light transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {t('overview.add')}
            </button>
          </div>
        </div>
      </div>

      {/* Active Project Card */}
      {activeProject ? (
        <div className="bg-surface border border-accent/30 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-xl">
                {activeProject.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">{activeProject.name}</h2>
                <div className="flex items-center gap-3 mt-0.5">
                  {activeProject.domain && (
                    <a
                      href={activeProject.domain}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent hover:underline flex items-center gap-1"
                    >
                      {activeProject.domain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      activeProject.status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-secondary/10 text-secondary'
                    )}
                  >
                    {t(`projects.list.status.${activeProject.status}`)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
            {activeProject.industry && (
              <div>
                <div className="text-xs text-muted uppercase tracking-wider mb-1">
                  {t('overview.industry')}
                </div>
                <div className="text-sm font-medium text-white">{activeProject.industry}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted uppercase tracking-wider mb-1">
                {t('overview.platform')}
              </div>
              <div className="text-sm font-medium text-white capitalize">
                {activeProject.cms_type}
              </div>
            </div>
            {activeProject.content_preferences?.frequency && (
              <div>
                <div className="text-xs text-muted uppercase tracking-wider mb-1">
                  {t('overview.frequency')}
                </div>
                <div className="text-sm font-medium text-white capitalize">
                  {activeProject.content_preferences.frequency.replace('_', ' ')}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State - No Project */
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-surface-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">{t('projects.noProjects')}</h3>
          <p className="text-secondary mb-6 max-w-md mx-auto">
            {t('projects.noProjectsDescription')}
          </p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('projects.createFirst')}
          </button>
        </div>
      )}

      {/* Quick Generate - Only visible when user has a project */}
      {activeProject && (
        <QuickGenerate
          onGenerateComplete={article => {
            console.log('Article generated:', article);
            // Optionally navigate to article detail page or show toast
          }}
        />
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-white font-semibold mb-3">{t('overview.quickActions')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setShowOnboarding(true)}
            className="bg-surface border border-border hover:border-muted rounded-xl p-4 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t('overview.newProject')}</div>
                  <div className="text-xs text-muted">{t('overview.addProject')}</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
            </div>
          </button>

          <button
            onClick={() => dashboardNavigate('/dashboard/billing')}
            className="bg-surface border border-border hover:border-muted rounded-xl p-4 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t('overview.billing')}</div>
                  <div className="text-xs text-muted">{t('overview.manageSubscription')}</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
            </div>
          </button>

          <button
            onClick={() => dashboardNavigate('/dashboard/settings')}
            className="bg-surface border border-border hover:border-muted rounded-xl p-4 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t('overview.settings')}</div>
                  <div className="text-xs text-muted">{t('overview.accountPreferences')}</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
            </div>
          </button>
        </div>
      </div>

      {/* Project List (if user has projects) */}
      {projects.length > 0 && <ProjectList />}

      {/* Onboarding Modal */}
      <ProjectOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
