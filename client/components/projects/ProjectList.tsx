/**
 * Project List Component
 * Card grid showing all projects with edit/delete actions
 *
 * Features:
 * - Card grid layout
 * - Each card: name, domain, industry, CMS type, status
 * - Edit and Delete buttons
 * - "Add New Project" card
 * - Empty state with CTA
 */

'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Globe, MoreVertical } from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import { useLogger } from '@client/utils/logger';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { cn } from '@client/utils/cn';
import { ProjectOnboarding } from './ProjectOnboarding';

interface IProjectListProps {
  onProjectUpdated?: () => void;
}

const CMS_LABELS: Record<string, string> = {
  wordpress: 'WordPress',
  webflow: 'Webflow',
  shopify: 'Shopify',
  other: 'Other',
};

const STATUS_BADGES = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  inactive: 'bg-secondary/10 text-secondary border-secondary/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function ProjectList({ onProjectUpdated }: IProjectListProps): JSX.Element {
  const t = useMemo(() => getTranslations('dashboard.projects'), []);
  const logger = useLogger('ProjectList');
  const { projects, activeProject, activeProjectId, setActiveProject, deleteProject } = useProjects();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      onProjectUpdated?.();
    } catch (error) {
      logger.error('Failed to delete project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: projectToDelete,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`list.status.${status}`) ?? status;
  };

  const getCmsLabel = (cmsType: string) => {
    return t(`list.cmsTypes.${cmsType}`) ?? CMS_LABELS[cmsType] ?? cmsType;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
            <p className="text-secondary text-sm mt-1">
              {projects.length === 0
                ? t('noProjectsDescription')
                : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
            </p>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('addNew')}
          </button>
        </div>

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-surface-light rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('noProjects')}</h3>
            <p className="text-secondary mb-6">{t('noProjectsDescription')}</p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('createFirst')}
            </button>
          </div>
        ) : (
          /* Project Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div
                key={project.id}
                className={cn(
                  'bg-surface border rounded-xl p-5 transition-all',
                  activeProjectId === project.id
                    ? 'border-accent shadow-lg shadow-accent/10'
                    : 'border-border hover:border-muted hover:bg-surface-light'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-lg">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{project.name}</h3>
                      {project.domain && (
                        <a
                          href={project.domain}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline"
                        >
                          {project.domain}
                        </a>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium border',
                      STATUS_BADGES[project.status]
                    )}
                  >
                    {getStatusLabel(project.status)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  {project.industry && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary">Industry</span>
                      <span className="text-white font-medium">{project.industry}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">Platform</span>
                    <span className="text-white font-medium">{getCmsLabel(project.cms_type)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <button
                    onClick={() => setActiveProject(project.id)}
                    className={cn(
                      'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
                      activeProjectId === project.id
                        ? 'bg-accent/10 text-accent'
                        : 'bg-elevated text-secondary hover:text-white hover:bg-surface-light'
                    )}
                  >
                    {activeProjectId === project.id ? 'Active' : 'Switch'}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(project.id)}
                    className="p-2 text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Onboarding Modal */}
      <ProjectOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-main/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">{t('list.deleteConfirmTitle')}</h3>
            <p className="text-secondary mb-6">{t('list.deleteConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-sm font-medium text-secondary hover:text-white bg-elevated hover:bg-surface-light rounded-lg transition-colors"
              >
                {t('list.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : t('list.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
