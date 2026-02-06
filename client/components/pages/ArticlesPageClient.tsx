/**
 * Articles Page Client Component
 *
 * Dedicated page for article generation and management.
 * Shows article list with campaign info and Create Campaign CTA.
 */

'use client';

import { useMemo, useState } from 'react';
import { Plus, FolderOpen, ArrowRight } from 'lucide-react';
import { QuickGenerateModal } from '@client/components/articles/QuickGenerateModal';
import { ArticleList } from '@client/components/articles/ArticleList';
import { useProjects } from '@client/hooks/useProjects';
import { useCampaigns } from '@client/hooks/useCampaigns';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { getTranslations } from '@src/i18n/utils';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';

export default function ArticlesPageClient(): JSX.Element {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const { activeProject, isLoading } = useProjects();
  const { campaigns, isLoading: campaignsLoading } = useCampaigns(activeProject?.id ?? null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  // No project state
  if (!activeProject) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-xl font-bold text-white">{t('articles.title', { defaultValue: 'Articles' })}</h1>
          <p className="text-secondary text-sm mt-1">
            {t('articles.noProject', { defaultValue: 'Create a project to start generating articles' })}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <FolderOpen className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Project Selected</h3>
          <p className="text-text-secondary mb-6">Create or select a project to manage articles</p>
          <DashboardButton variant="primary" onClick={() => dashboardNavigate('/dashboard')}>
            Go to Overview
          </DashboardButton>
        </div>
      </div>
    );
  }

  // No campaigns state - show Create Campaign CTA
  if (!campaignsLoading && campaigns.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{t('articles.title', { defaultValue: 'Articles' })}</h1>
            <p className="text-secondary text-sm mt-1">
              {t('articles.description', { defaultValue: 'Generate and manage articles for {project}', project: activeProject.name })}
            </p>
          </div>
        </div>

        {/* Create Campaign CTA */}
        <div className="bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/30 rounded-xl p-8 text-center">
          <FolderOpen className="w-16 h-16 text-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Create a Campaign First</h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Articles must belong to a campaign. Create a campaign to organize and generate your content.
          </p>
          <DashboardButton
            variant="primary"
            onClick={() => dashboardNavigate('/dashboard/campaigns')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
            <ArrowRight className="w-4 h-4 ml-2" />
          </DashboardButton>
        </div>
      </div>
    );
  }

  // Normal state - show articles
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('articles.title', { defaultValue: 'Articles' })}</h1>
          <p className="text-secondary text-sm mt-1">
            {t('articles.description', { defaultValue: 'Generate and manage articles for {project}', project: activeProject.name })}
          </p>
        </div>
        <DashboardButton variant="primary" onClick={() => setIsGenerateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate Article
        </DashboardButton>
      </div>

      {/* Article List */}
      <ArticleList />

      {/* Quick Generate Modal */}
      <QuickGenerateModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerateComplete={(article) => {
          console.log('Article generated:', article);
          // Article list will auto-refetch via React Query
        }}
      />
    </div>
  );
}
