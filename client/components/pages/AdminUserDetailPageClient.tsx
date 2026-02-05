'use client';

import { adminFetch } from '@/client/utils/admin-api-client';
import { IAdminUserDetail } from '@/shared/types/admin.types';
import { useTranslations } from '@src/i18n/utils';
import dayjs from 'dayjs';
import { ArrowLeft, Coins } from 'lucide-react';

import React, { useEffect, useState } from 'react';

interface IAdminUserDetailPageProps {
  userId: string;
}

export default function AdminUserDetailPage({ userId }: IAdminUserDetailPageProps): JSX.Element {
  const t = useTranslations('admin.userDetail');

  const [user, setUser] = useState<IAdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await adminFetch<{ success: boolean; data: IAdminUserDetail }>(
          `/api/admin/users/${userId}`
        );
        if (data.success) {
          setUser(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError(err instanceof Error ? err.message : t('error'));
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, t]);

  const handleRoleChange = async (newRole: string) => {
    setSaving(true);
    try {
      const data = await adminFetch<{ success: boolean; data: unknown }>(
        `/api/admin/users/${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (data.success) {
        setUser(prev =>
          prev
            ? {
                ...prev,
                profile: { ...prev.profile, role: newRole as 'user' | 'admin' },
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      alert(err instanceof Error ? err.message : t('errors.failedToUpdateRole'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error mb-4">{error}</p>
        <a
          href="/dashboard/admin/users"
          className="text-accent hover:text-accent-hover inline-block"
        >
          {t('backToUsers')}
        </a>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('userNotFound')}</p>
        <a
          href="/dashboard/admin/users"
          className="text-accent hover:text-accent-hover mt-4 inline-block"
        >
          {t('backToUsers')}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <a
          href="/dashboard/admin/users"
          className="p-2 rounded-lg hover:bg-surface-light transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <h2 className="text-lg font-medium text-primary">{t('title')}</h2>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-surface rounded-lg border border-border p-6">
          <h3 className="font-medium text-primary mb-4">{t('profile')}</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-muted-foreground">{t('fields.email')}</dt>
              <dd className="text-sm text-primary mt-1">{user.profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t('fields.userId')}</dt>
              <dd className="text-sm font-mono text-primary mt-1">{user.profile.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t('fields.stripeCustomerId')}</dt>
              <dd className="text-sm font-mono text-primary mt-1">
                {user.profile.stripe_customer_id || t('fields.notConnected')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t('fields.role')}</dt>
              <dd className="mt-1">
                <select
                  value={user.profile.role}
                  onChange={e => handleRoleChange(e.target.value)}
                  disabled={saving}
                  className="block w-full rounded-lg border-border text-sm disabled:opacity-50"
                >
                  <option value="user">{t('fields.user')}</option>
                  <option value="admin">{t('fields.admin')}</option>
                </select>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t('fields.joined')}</dt>
              <dd className="text-sm text-primary mt-1">
                {dayjs(user.profile.created_at).format('MMMM D, YYYY')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Credits Card */}
        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-primary">{t('credits')}</h3>
            <button
              onClick={() => setShowCreditModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
            >
              <Coins className="h-4 w-4 mr-1.5" />
              {t('adjustCredits.adjustCredits')}
            </button>
          </div>
          <div className="text-3xl font-bold text-primary mb-4">
            {(user.profile.subscription_credits_balance ?? 0) +
              (user.profile.purchased_credits_balance ?? 0)}
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {t('recentTransactions.title')}
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {user.recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('recentTransactions.noTransactions')}
                </p>
              ) : (
                user.recentTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-primary capitalize">{tx.type}</span>
                      <span className="text-muted-foreground ml-2">
                        {dayjs(tx.created_at).format('MMM D')}
                      </span>
                    </div>
                    <span className={tx.amount > 0 ? 'text-success' : 'text-error'}>
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-surface rounded-lg border border-border p-6 lg:col-span-2">
          <h3 className="font-medium text-primary mb-4">{t('subscription')}</h3>
          {user.subscription ? (
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">{t('subscription.status')}</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.subscription.status === 'active'
                        ? 'bg-success/20 text-success'
                        : 'bg-warning/20 text-warning'
                    }`}
                  >
                    {user.subscription.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">{t('subscription.tier')}</dt>
                <dd className="text-sm font-medium text-primary mt-1">
                  {user.profile.subscription_tier || t('subscription.unknown')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">{t('subscription.periodEnd')}</dt>
                <dd className="text-sm text-primary mt-1">
                  {dayjs(user.subscription.current_period_end).format('MMM D, YYYY')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t('subscription.subscriptionId')}
                </dt>
                <dd className="text-sm font-mono text-primary mt-1 truncate">
                  {user.subscription.id}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('subscription.noActiveSubscription')}
            </p>
          )}
        </div>
      </div>

      {/* Credit Adjustment Modal */}
      {showCreditModal && (
        <CreditAdjustmentModal
          userId={userId}
          currentBalance={
            (user.profile.subscription_credits_balance ?? 0) +
            (user.profile.purchased_credits_balance ?? 0)
          }
          onClose={() => setShowCreditModal(false)}
          onSuccess={() => {
            setShowCreditModal(false);
            // Refresh to get updated balances and transactions
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

interface ICreditAdjustmentModalProps {
  userId: string;
  currentBalance: number;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

function CreditAdjustmentModal({
  userId,
  currentBalance,
  onClose,
  onSuccess,
}: ICreditAdjustmentModalProps) {
  const t = useTranslations('admin.userDetail.adjustCredits');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = await adminFetch<{ success: boolean; data: { newBalance: number } }>(
        '/api/admin/credits/adjust',
        {
          method: 'POST',
          body: JSON.stringify({
            userId,
            amount: parseInt(amount),
            reason,
          }),
        }
      );
      if (data.success) {
        onSuccess(data.data.newBalance);
      } else {
        setError(t('error'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  const previewBalance = amount ? currentBalance + parseInt(amount) : currentBalance;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-primary mb-4">{t('title')}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">{t('amount')}</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-lg border-border"
              placeholder={t('amountPlaceholder')}
              required
            />
            <p className="mt-1 text-sm text-muted-foreground">
              {t('previewBalance', { current: currentBalance, new: previewBalance })}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground">{t('reason')}</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="mt-1 block w-full rounded-lg border-border"
              placeholder={t('reasonPlaceholder')}
              required
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-light rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {submitting ? t('saving') : t('adjustCredits')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
