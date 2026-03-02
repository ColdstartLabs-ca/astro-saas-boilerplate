'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FolderOpen } from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import { useGscConnection } from '@client/hooks/useGscConnection';
import { useAnalytics } from '@client/hooks/useAnalytics';
import { AnalyticsView } from '@client/components/dashboard/views/AnalyticsView';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import { getTranslations } from '@src/i18n/utils';

// =============================================================================
// Component
// =============================================================================

export function AnalyticsPageClient(): JSX.Element {
  const t = getTranslations('dashboard');
  const { activeProject, isLoading: isLoadingProjects } = useProjects();
  const [dateRangeDays, setDateRangeDays] = useState<7 | 28 | 90>(28);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const hasAutoTriggered = useRef(false);

  const {
    isConnected: hasGscConnection,
    isLoading: isLoadingGsc,
    connect: connectGsc,
  } = useGscConnection(activeProject?.id);

  const { data, isLoading, isFetched, sync, isSyncing } = useAnalytics(
    activeProject?.id,
    dateRangeDays
  );

  // Auto-trigger sync when:
  // - A project is selected
  // - GSC is connected (and done loading)
  // - Analytics data has been fetched but is empty (no articles)
  // - We haven't already auto-triggered
  useEffect(() => {
    if (hasAutoTriggered.current) return;
    if (!activeProject?.id) return;
    if (isLoadingGsc || !hasGscConnection) return;
    if (isLoading || !isFetched) return;
    const hasData = (data?.articles.length ?? 0) > 0;
    if (hasData) return;

    hasAutoTriggered.current = true;
    setIsAutoSyncing(true);
    sync().finally(() => {
      setIsAutoSyncing(false);
    });
  }, [activeProject?.id, hasGscConnection, isLoadingGsc, isLoading, isFetched, data, sync]);

  const handleConnectGsc = useCallback(() => {
    if (activeProject?.id) {
      connectGsc(activeProject.id);
    }
  }, [activeProject?.id, connectGsc]);

  const handleDateRangeChange = useCallback((days: 7 | 28 | 90) => {
    setDateRangeDays(days);
  }, []);

  const handleSync = useCallback(() => {
    sync();
  }, [sync]);

  // Loading projects
  if (isLoadingProjects) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  // No project selected
  if (!activeProject) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h2 className="text-xl font-bold text-white">{t('analytics.title')}</h2>
          <p className="text-secondary text-sm mt-1">{t('analytics.subtitle')}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <FolderOpen className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">{t('analytics.noProject')}</h3>
          <p className="text-secondary text-sm mb-6">{t('analytics.noProjectDescription')}</p>
          <DashboardButton variant="primary" onClick={() => dashboardNavigate('/dashboard')}>
            {t('analytics.goToOverview')}
          </DashboardButton>
        </div>
      </div>
    );
  }

  return (
    <AnalyticsView
      data={data}
      isLoading={isLoading}
      isSyncing={isSyncing}
      isAutoSyncing={isAutoSyncing}
      onSync={handleSync}
      dateRangeDays={dateRangeDays}
      onDateRangeChange={handleDateRangeChange}
      hasGscConnection={hasGscConnection}
      onConnectGsc={handleConnectGsc}
      isLoadingGsc={isLoadingGsc}
    />
  );
}

export default AnalyticsPageClient;
