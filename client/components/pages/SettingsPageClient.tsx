'use client';

import { useState, useMemo } from 'react';
import { Lock, User, Mail, FileText, UserCircle } from 'lucide-react';
import { useUserStore } from '@client/store/userStore';
import { useModalStore } from '@client/store/modalStore';
import { useEmailPreferences } from '@client/hooks/useEmailPreferences';
import { InternalTabs } from '@client/components/dashboard/ui/InternalTabs';
import { ArticleSettingsTab } from '@client/components/settings/ArticleSettingsTab';
import { getTranslations } from '@src/i18n/utils';

export default function SettingsPage(): JSX.Element {
  const { user } = useUserStore();
  const { openAuthModal } = useModalStore();
  const { preferences, isLoading, isUpdating, toggle } = useEmailPreferences();
  const t = useMemo(() => getTranslations('dashboard'), []);
  const [activeTab, setActiveTab] = useState<string>('articles');

  // Check if user is authenticated through email/password (not OAuth)
  const isPasswordUser = user?.provider === 'email';

  const tabs = [
    { id: 'articles', label: t('settings.articles'), icon: <FileText className="w-4 h-4" /> },
    { id: 'account', label: t('settings.profile'), icon: <UserCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Tab Navigation */}
      <InternalTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'articles' && <ArticleSettingsTab />}

      {activeTab === 'account' && (
        <div className="space-y-6">

          {/* Profile Settings */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <User size={20} className="text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-white">{t('settings.profile')}</h2>
                <p className="text-sm text-muted-foreground">{t('settings.profileSubtitle')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">{t('settings.email')}</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-surface-light border border-border rounded-lg text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">{t('settings.displayName')}</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  placeholder={t('settings.notSet')}
                  disabled
                  className="w-full px-4 py-2 bg-surface-light border border-border rounded-lg text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          {isPasswordUser && (
            <div className="bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-surface-light flex items-center justify-center">
                  <Lock size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{t('settings.security')}</h2>
                  <p className="text-sm text-muted-foreground">{t('settings.securitySubtitle')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{t('settings.changePassword')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.passwordDescription')}</p>
                </div>
                <button
                  onClick={() => openAuthModal('changePassword')}
                  className="px-4 py-2 border border-border text-white rounded-lg text-sm font-medium hover:bg-surface/10 transition-colors"
                >
                  {t('settings.changePassword')}
                </button>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-surface-light flex items-center justify-center">
                <Mail size={20} className="text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-white">{t('settings.notifications')}</h2>
                <p className="text-sm text-muted-foreground">{t('settings.notificationsSubtitle')}</p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
            ) : (
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex-1">
                    <p className="font-medium text-white">{t('settings.productUpdates')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.productUpdatesDescription')}</p>
                  </div>
                  <button
                    onClick={() => !isUpdating && toggle('product_updates')}
                    disabled={isUpdating}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences?.product_updates ? 'bg-accent' : 'bg-surface-light'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences?.product_updates ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex-1">
                    <p className="font-medium text-white">{t('settings.marketingEmails')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.marketingEmailsDescription')}</p>
                  </div>
                  <button
                    onClick={() => !isUpdating && toggle('marketing_emails')}
                    disabled={isUpdating}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences?.marketing_emails ? 'bg-accent' : 'bg-surface-light'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences?.marketing_emails ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex-1">
                    <p className="font-medium text-white">{t('settings.lowCreditAlerts')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.lowCreditAlertsDescription')}
                    </p>
                  </div>
                  <button
                    onClick={() => !isUpdating && toggle('low_credit_alerts')}
                    disabled={isUpdating}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences?.low_credit_alerts ? 'bg-accent' : 'bg-surface-light'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences?.low_credit_alerts ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
