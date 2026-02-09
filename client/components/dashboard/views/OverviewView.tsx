'use client';

import { useMemo, useState, useEffect } from 'react';
import { Globe, Plus, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import { useUserStore, useSubscription } from '@client/store/userStore';
import { useLogger } from '@client/utils/logger';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { ProjectOnboarding } from '@client/components/projects/ProjectOnboarding';
import { ProjectEditModal } from '@client/components/projects/ProjectEditModal';
import { ProjectList } from '@client/components/projects/ProjectList';
import { getPlanDisplayName } from '@shared/config/stripe';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import { getTranslations } from '@src/i18n/utils';
import { cn } from '@client/utils/cn';
import type { IProject, IUpdateProjectInput } from '@shared/types/project.types';

export function OverviewView(): JSX.Element {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const logger = useLogger('OverviewView');
  const { user } = useUserStore();
  const subscription = useSubscription();
  const { projects, activeProject, isLoading, deleteProject, updateProject } = useProjects();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<IProject | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete);
      logger.info('Project deleted', { projectId: projectToDelete });
      setProjectToDelete(null);
    } catch (error) {
      logger.error('Failed to delete project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: projectToDelete,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = () => {
    if (!activeProject) return;
    setProjectToEdit(activeProject);
  };

  const handleSaveEdit = async (updates: IUpdateProjectInput) => {
    if (!projectToEdit) return;

    setIsEditing(true);
    try {
      await updateProject(projectToEdit.id, updates);
      logger.info('Project updated', { projectId: projectToEdit.id });
      setProjectToEdit(null);
    } catch (error) {
      logger.error('Failed to update project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: projectToEdit.id,
      });
      throw error;
    } finally {
      setIsEditing(false);
    }
  };

  const handleCloseEdit = () => {
    setProjectToEdit(null);
  };

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
      <div className="flex items-start justify-between">
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
        {/* Prominent Add Project Button */}
        <button
          onClick={() => setShowOnboarding(true)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-green-500/20"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">Add Project</span>
        </button>
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
              className="text-xs font-medium text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Project
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
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditClick}
                className="p-2 text-secondary hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                aria-label="Edit project"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteClick(activeProject.id)}
                className="p-2 text-secondary hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                aria-label="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('projects.createFirst')}
          </button>
        </div>
      )}

      {/* Project List - only show if user has multiple projects */}
      {projects.length > 1 && <ProjectList />}

      {/* Onboarding Modal */}
      <ProjectOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-main/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('projects.list.deleteConfirmTitle')}
            </h3>
            <p className="text-secondary mb-6">{t('projects.list.deleteConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-sm font-medium text-secondary hover:text-white bg-elevated hover:bg-surface-light rounded-lg transition-colors"
              >
                {t('projects.list.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : t('projects.list.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {projectToEdit && (
        <ProjectEditModal
          project={projectToEdit}
          onSave={handleSaveEdit}
          onClose={handleCloseEdit}
          isSaving={isEditing}
        />
      )}
    </div>
  );
}
