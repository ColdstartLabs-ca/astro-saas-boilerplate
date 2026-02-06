'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Globe, Plus, Calendar, Settings } from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import { ProjectOnboarding } from '@client/components/projects/ProjectOnboarding';
import { ProjectList } from '@client/components/projects/ProjectList';
import { cn } from '@client/utils/cn';

const CMS_LABELS: Record<string, string> = {
  wordpress: 'WordPress',
  webflow: 'Webflow',
  shopify: 'Shopify',
  other: 'Other',
};

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { projectCount, isLoading, activeProject, projects } = useProjects();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auto-trigger onboarding if no projects exist
  useEffect(() => {
    if (!isLoading && projectCount === 0) {
      setShowOnboarding(true);
    }
  }, [projectCount, isLoading]);

  return (
    <>
      <ProjectOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>
          {projectCount > 0 && (
            <button
              onClick={() => setShowOnboarding(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Project
            </button>
          )}
        </div>

        {/* Content - show project list or active project details */}
        {isLoading ? (
          <div className="p-8 border border-border rounded-lg bg-surface-light">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
          </div>
        ) : projectCount === 0 ? (
          <div className="p-12 border border-border rounded-lg bg-surface-light text-center">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-secondary mb-6">Create your first project to get started</p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        ) : activeProject ? (
          <div className="space-y-6">
            {/* Active Project Card */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-xl">
                    {activeProject.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{activeProject.name}</h2>
                    {activeProject.domain && (
                      <a
                        href={activeProject.domain}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        {activeProject.domain}
                      </a>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    activeProject.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-secondary/10 text-secondary'
                  )}
                >
                  {activeProject.status.charAt(0).toUpperCase() + activeProject.status.slice(1)}
                </span>
              </div>

              {/* Project Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-light rounded-lg p-4">
                  <p className="text-xs text-secondary uppercase tracking-wider mb-1">Platform</p>
                  <p className="text-white font-medium">{CMS_LABELS[activeProject.cms_type] ?? activeProject.cms_type}</p>
                </div>
                <div className="bg-surface-light rounded-lg p-4">
                  <p className="text-xs text-secondary uppercase tracking-wider mb-1">Industry</p>
                  <p className="text-white font-medium">{activeProject.industry || 'Not set'}</p>
                </div>
                <div className="bg-surface-light rounded-lg p-4">
                  <p className="text-xs text-secondary uppercase tracking-wider mb-1">Created</p>
                  <p className="text-white font-medium">
                    {new Date(activeProject.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Content Preferences (if set) */}
              {activeProject.content_preferences && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-secondary uppercase tracking-wider mb-3">Content Preferences</p>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-sm text-secondary">Tone: </span>
                      <span className="text-sm text-white capitalize">{activeProject.content_preferences.tone}</span>
                    </div>
                    <div>
                      <span className="text-sm text-secondary">Frequency: </span>
                      <span className="text-sm text-white capitalize">{activeProject.content_preferences.frequency}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Coming Soon Section */}
            <div className="bg-gradient-to-r from-accent/10 to-tertiary/10 border border-accent/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold text-white">More features coming soon</h3>
              </div>
              <p className="text-secondary text-sm">
                We're building powerful tools to help you manage and grow your projects. Stay tuned for
                updates!
              </p>
            </div>

            {/* All Projects Link */}
            {projects.length > 1 && (
              <div className="text-center">
                <button className="text-accent hover:text-accent-light text-sm font-medium">
                  View all {projects.length} projects →
                </button>
              </div>
            )}
          </div>
        ) : (
          <ProjectList />
        )}
      </div>
    </>
  );
}
