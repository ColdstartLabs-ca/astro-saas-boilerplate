'use client';

import { ConfirmDialog } from '@client/components/ui/ConfirmDialog';
import { DashboardCard } from '@client/components/dashboard/ui/DashboardCard';
import { ProjectEditModal } from '@client/components/projects/ProjectEditModal';
import { ProjectList } from '@client/components/projects/ProjectList';
import { OnboardingWizard } from '@client/components/onboarding/OnboardingWizard';
import { OnboardingSetupBanner } from '@client/components/onboarding/OnboardingSetupBanner';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { useProjects } from '@client/hooks/useProjects';
import { useSubscription, useUserStore } from '@client/store/userStore';
import { cn } from '@client/utils/cn';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import { getGreeting } from '@client/utils/timeUtils';
import { getProjectStatusStyles } from '@client/utils/statusStyles';
import { useLogger } from '@client/utils/logger';
import { getPlanDisplayName } from '@shared/config/stripe';
import type { IProject, IUpdateProjectInput } from '@shared/types/project.types';
import { getTranslations } from '@src/i18n/utils';
import { motion } from 'framer-motion';
import {
  BarChart2,
  CreditCard,
  Edit2,
  ExternalLink,
  FileText,
  Globe,
  LayoutGrid,
  Plus,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const AUTO_OPENED_ONBOARDING_SESSION_KEY = 'hasAutoOpenedOnboarding';

export function OverviewView(): JSX.Element {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const logger = useLogger('OverviewView');
  const { user } = useUserStore();
  const subscription = useSubscription();
  const { projects, activeProject, isLoading, deleteProject, updateProject } = useProjects();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasAutoOpenedOnboarding, setHasAutoOpenedOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(AUTO_OPENED_ONBOARDING_SESSION_KEY) === 'true';
  });
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<IProject | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const planDisplayName = getPlanDisplayName({
    subscriptionTier: user?.profile?.subscription_tier,
    priceId: subscription?.price_id,
  });

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';

  // Time-based greeting
  const greeting = getGreeting();

  // Auto-show onboarding modal for users with no projects (only once per session).
  useEffect(() => {
    if (!isLoading && projects.length === 0 && !showOnboarding && !hasAutoOpenedOnboarding) {
      setShowOnboarding(true);
      setHasAutoOpenedOnboarding(true);
      sessionStorage.setItem(AUTO_OPENED_ONBOARDING_SESSION_KEY, 'true');
    }
  }, [isLoading, projects.length, showOnboarding, hasAutoOpenedOnboarding]);

  const handleOpenOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Setup Warning Banner — only after wizard has auto-opened at least once */}
      {projects.length === 0 && !showOnboarding && hasAutoOpenedOnboarding && (
        <OnboardingSetupBanner onSetup={handleOpenOnboarding} />
      )}

      {/* Welcome Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {greeting},{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              {displayName}
            </span>
          </h1>
          <p className="text-secondary mt-1 text-sm font-medium">
            {activeProject
              ? t('overview.managing', { project: activeProject.name })
              : t('overview.getStarted')}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenOnboarding}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-accent/20 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </motion.button>
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Plan Status */}
        <DashboardCard
          title="Current Plan"
          icon={Zap}
          action={
            !user?.profile?.subscription_tier && (
              <button
                onClick={() => dashboardNavigate('/dashboard/billing')}
                className="text-[10px] font-bold text-accent hover:text-accent-light uppercase tracking-wide transition-colors bg-accent/10 px-2 py-0.5 rounded"
              >
                {t('overview.upgrade')}
              </button>
            )
          }
        >
          <div className="text-xl font-bold text-white mt-2">{planDisplayName}</div>
          <div className="text-xs text-secondary mt-0.5 font-medium">
            {user?.profile?.subscription_tier ? 'Active & recurring' : 'Free tier account'}
          </div>
        </DashboardCard>

        {/* Credits Status */}
        <DashboardCard title="Available Credits" icon={CreditCard}>
          <div className="mt-2">
            <CreditsDisplay />
          </div>
        </DashboardCard>

        {/* Projects Status */}
        <DashboardCard title="Total Projects" icon={LayoutGrid} onClick={handleOpenOnboarding}>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-xl font-bold text-white">{projects.length}</div>
            <div className="flex items-center text-[10px] uppercase tracking-wide text-accent font-bold bg-accent/10 px-2 py-0.5 rounded transition-colors group-hover:bg-accent group-hover:text-white">
              Add New
            </div>
          </div>
          <div className="text-xs text-secondary mt-0.5 font-medium">
            Active websites being tracked
          </div>
        </DashboardCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area - Active Project & Implementation */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            Active Project
          </h2>

          {activeProject ? (
            <DashboardCard className="border-accent/20 ring-1 ring-accent/5 p-5 md:p-6" gradient>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-surface-light/80 border border-white/10 flex items-center justify-center text-2xl font-bold text-white shadow-inner backdrop-blur-sm">
                    {activeProject.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{activeProject.name}</h2>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {activeProject.domain && (
                        <a
                          href={activeProject.domain}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-light hover:underline transition-colors bg-accent/5 border border-accent/10 px-2 py-0.5 rounded"
                        >
                          <Globe className="w-3 h-3" />
                          {activeProject.domain}
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                        </a>
                      )}
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border',
                          getProjectStatusStyles(activeProject.status)
                        )}
                      >
                        {t(`projects.list.status.${activeProject.status}`)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
                      <div>
                        <div className="text-[10px] text-secondary uppercase tracking-wider font-bold mb-0.5">
                          Platform
                        </div>
                        <div className="text-sm text-white font-medium capitalize flex items-center gap-1.5">
                          {activeProject.cms_type}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-secondary uppercase tracking-wider font-bold mb-0.5">
                          Frequency
                        </div>
                        <div className="text-sm text-white font-medium capitalize">
                          {activeProject.content_preferences?.frequency?.replace('_', ' ') ||
                            'Not set'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2">
                  <button
                    onClick={handleEditClick}
                    className="p-2 text-secondary hover:text-white hover:bg-surface-light rounded-lg transition-all border border-transparent hover:border-white/5"
                    aria-label="Edit project"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(activeProject.id)}
                    className="p-2 text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/10"
                    aria-label="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </DashboardCard>
          ) : (
            <DashboardCard className="border-dashed border-2 bg-transparent hover:border-accent/50 hover:bg-accent/5 group">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-surface-light rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-8 h-8 text-muted group-hover:text-accent transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {t('projects.noProjects')}
                </h3>
                <p className="text-secondary max-w-sm mx-auto mb-6">
                  {t('projects.noProjectsDescription')}
                </p>
                <button
                  onClick={handleOpenOnboarding}
                  className="bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-accent/20"
                >
                  {t('projects.createFirst')}
                </button>
              </div>
            </DashboardCard>
          )}

          {/* Recent Activity / Project List */}
          {projects.length > 1 && (
            <div className="pt-4">
              <ProjectList />
            </div>
          )}
        </motion.div>

        {/* Sidebar - Quick Actions */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <DashboardCard
              className="hover:border-blue-500/30 cursor-pointer group py-3 px-4"
              onClick={() => dashboardNavigate('/dashboard/campaigns')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Start Campaign
                  </h3>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Generate SEO content for your site
                  </p>
                </div>
              </div>
            </DashboardCard>

            {/* Research Keywords - Coming Soon */}
            <DashboardCard className="opacity-50 pointer-events-none py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Research Keywords</h3>
                  <p className="text-[11px] text-secondary mt-0.5">Coming soon</p>
                </div>
              </div>
            </DashboardCard>

            {/* View Analytics - Coming Soon */}
            <DashboardCard className="opacity-50 pointer-events-none py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">View Analytics</h3>
                  <p className="text-[11px] text-secondary mt-0.5">Coming soon</p>
                </div>
              </div>
            </DashboardCard>
          </div>

          <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-xl p-4 border border-indigo-500/10 mt-4 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Pro Tip
            </h3>
            <p className="text-xs text-secondary leading-relaxed font-medium">
              Connecting your Google Search Console can improve keyword recommendations by 40%.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Onboarding Modal */}
      <OnboardingWizard isOpen={showOnboarding} onClose={handleCloseOnboarding} />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={projectToDelete !== null}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('projects.list.deleteConfirmTitle')}
        message={t('projects.list.deleteConfirm')}
        variant="danger"
        labels={{
          confirm: t('projects.list.confirm'),
          cancel: t('projects.list.cancel'),
          confirming: 'Deleting...',
        }}
        isConfirming={isDeleting}
      />

      {/* Edit Project Modal */}
      {projectToEdit && (
        <ProjectEditModal
          project={projectToEdit}
          onSave={handleSaveEdit}
          onClose={handleCloseEdit}
          isSaving={isEditing}
        />
      )}
    </motion.div>
  );
}
