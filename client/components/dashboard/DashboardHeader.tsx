'use client';

import { useClickOutside } from '@client/hooks/useClickOutside';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { useUserStore, useSubscription } from '@client/store/userStore';
import { getPlanDisplayName } from '@shared/config/stripe';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import { getTranslations } from '@src/i18n/utils';
import { LocaleSwitcher } from '@client/components/i18n/LocaleSwitcher';
import { useMemo, useState, useRef, useCallback } from 'react';
import { Bell, User, Settings, CreditCard, LogOut, Sparkles } from 'lucide-react';

export function DashboardHeader(): JSX.Element {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const { user, signOut } = useUserStore();
  const subscription = useSubscription();
  const planDisplayName = getPlanDisplayName({
    subscriptionTier: user?.profile?.subscription_tier,
    priceId: subscription?.price_id,
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click using the existing hook
  useClickOutside(menuRef, () => setUserMenuOpen(false));

  const handleMenuNav = useCallback((href: string) => {
    setUserMenuOpen(false);
    dashboardNavigate(href);
  }, []);

  const handleSignOut = useCallback(async () => {
    setUserMenuOpen(false);
    await signOut();
  }, [signOut]);

  return (
    <header className="hidden md:flex h-16 border-b border-border bg-surface/50 backdrop-blur-sm items-center justify-between px-6 shrink-0 relative z-10">
      <div />
      <div className="flex items-center space-x-4">
        <LocaleSwitcher />
        <button className="text-secondary hover:text-white relative transition-colors" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(prev => !prev)}
            className="w-8 h-8 bg-gradient-to-br from-accent/30 to-tertiary/30 rounded-full border border-border flex items-center justify-center text-accent font-semibold text-sm hover:ring-2 hover:ring-accent/30 transition-all"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            {user?.email?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl z-[100] py-1">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
                <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                  {planDisplayName}
                </span>
              </div>

              {/* Credits */}
              <div className="px-4 py-2.5 border-b border-border">
                <CreditsDisplay />
              </div>

              {/* Upgrade CTA for free users */}
              {!user?.profile?.subscription_tier && (
                <div className="px-4 py-2.5 border-b border-border">
                  <button
                    onClick={() => handleMenuNav('/dashboard/billing')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('header.upgradeToPro')}
                  </button>
                </div>
              )}

              <button
                onClick={() => handleMenuNav('/dashboard/settings')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-light hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4 mr-3" />
                {t('sidebar.settings')}
              </button>
              <button
                onClick={() => handleMenuNav('/dashboard/billing')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-surface-light hover:text-white transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-3" />
                {t('sidebar.billing')}
              </button>

              <div className="border-t border-border my-1" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-2.5 text-sm text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                {t('sidebar.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
