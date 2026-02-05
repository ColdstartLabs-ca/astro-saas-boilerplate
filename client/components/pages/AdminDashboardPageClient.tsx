'use client';

import { adminFetch } from '@/client/utils/admin-api-client';
import { IAdminStats } from '@/shared/types/admin.types';
import { Coins, CreditCard, TrendingUp, Users } from 'lucide-react';

import React, { useEffect, useState } from 'react';

export default function AdminDashboard(): JSX.Element {
  const t = useTranslations('admin.dashboard');
  const [stats, setStats] = useState<IAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminFetch<{ success: boolean; data: IAdminStats }>('/api/admin/stats');
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
        setError(err instanceof Error ? err.message : t('errorLoadingStats'));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">{t('loadingStats')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-error">
          <p className="font-medium">{t('errorLoadingStats')}</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t('stats.totalUsers')}
          value={stats?.totalUsers || 0}
          icon={Users}
          iconBg="bg-accent/20"
          iconColor="text-accent"
        />
        <StatsCard
          title={t('stats.activeSubscriptions')}
          value={stats?.activeSubscriptions || 0}
          icon={CreditCard}
          iconBg="bg-success/20"
          iconColor="text-success"
        />
        <StatsCard
          title={t('stats.creditsIssued')}
          value={stats?.totalCreditsIssued || 0}
          icon={Coins}
          iconBg="bg-warning/20"
          iconColor="text-warning"
        />
        <StatsCard
          title={t('stats.creditsUsed')}
          value={stats?.totalCreditsUsed || 0}
          icon={TrendingUp}
          iconBg="bg-secondary/20"
          iconColor="text-secondary"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActionsCard />
        <RecentActivityCard />
      </div>
    </div>
  );
}

interface IStatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function StatsCard({ title, value, icon: Icon, iconBg, iconColor }: IStatsCardProps) {
  return (
    <div className="bg-surface rounded-lg border border-border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-primary mt-2">{value.toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function QuickActionsCard() {
  const t = useTranslations('admin.dashboard');
  return (
    <div className="bg-surface rounded-lg border border-border p-6">
      <h2 className="text-lg font-medium text-primary mb-4">{t('quickActions')}</h2>
      <div className="space-y-2">
        <a
          href="/dashboard/admin/users"
          className="block p-3 rounded-lg hover:bg-surface transition-colors"
        >
          <div className="font-medium text-primary">{t('manageUsers')}</div>
          <div className="text-sm text-muted-foreground">{t('manageUsersDescription')}</div>
        </a>
        <div className="block p-3 rounded-lg bg-surface opacity-50 cursor-not-allowed">
          <div className="font-medium text-primary">{t('manageSubscriptions')}</div>
          <div className="text-sm text-muted-foreground">{t('manageSubscriptionsDescription')}</div>
        </div>
        <div className="block p-3 rounded-lg bg-surface opacity-50 cursor-not-allowed">
          <div className="font-medium text-primary">{t('creditOperations')}</div>
          <div className="text-sm text-muted-foreground">{t('creditOperationsDescription')}</div>
        </div>
      </div>
    </div>
  );
}

function RecentActivityCard() {
  const t = useTranslations('admin.dashboard');
  return (
    <div className="bg-surface rounded-lg border border-border p-6">
      <h2 className="text-lg font-medium text-primary mb-4">{t('recentActivity')}</h2>
      <p className="text-sm text-muted-foreground">{t('activityFeedComingSoon')}</p>
    </div>
  );
}
