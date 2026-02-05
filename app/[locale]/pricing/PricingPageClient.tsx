'use client';

import type { ISubscription, IUserProfile } from '@/shared/types/stripe.types';
import {
  CreditPackSelector,
  PlanChangeModal,
  PricingCard,
  PricingCardSkeleton,
} from '@client/components/stripe';
import { StripeService } from '@client/services/stripeService';
import { clientEnv } from '@shared/config/env';
import {
  STRIPE_PRICES,
  SUBSCRIPTION_PLANS,
  getPlanForPriceId,
  isStripePricesConfigured,
} from '@shared/config/stripe';
import { ArrowRight, Calendar, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

export default function PricingPageClient() {
  const t = useTranslations('pricing');
  const pricesConfigured = isStripePricesConfigured();
  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [subscription, setSubscription] = useState<ISubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelingSchedule, setCancelingSchedule] = useState(false);
  const [buttonLoadingStates, setButtonLoadingStates] = useState<Record<string, boolean>>({});
  const handlePlanSelect = (priceId: string) => {
    // Block if trying to select the current plan or already scheduled plan
    if (subscription?.price_id === priceId || subscription?.scheduled_price_id === priceId) {
      return;
    }
    setSelectedPlanId(priceId);
    setIsModalOpen(true);
  };

  const handleSubscribeClick = (priceId: string, selectHandler: () => void) => {
    // For authenticated users with existing subscriptions - show plan change modal
    setButtonLoadingStates(prev => ({ ...prev, [priceId]: true }));
    // Add a small delay to show loading state, then reset after calling handler
    setTimeout(() => {
      selectHandler();
      // Reset loading state in case the modal doesn't immediately navigate
      setTimeout(() => {
        setButtonLoadingStates(prev => ({ ...prev, [priceId]: false }));
      }, 500);
    }, 100);
  };

  const handleCancelScheduledChange = async () => {
    try {
      setCancelingSchedule(true);
      await StripeService.cancelScheduledChange();
      // Refresh data
      const [profileData, subData] = await Promise.all([
        StripeService.getUserProfile(),
        StripeService.getActiveSubscription(),
      ]);
      setProfile(profileData);
      setSubscription(subData);
    } catch (error) {
      console.error('Failed to cancel scheduled change:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel scheduled change');
    } finally {
      setCancelingSchedule(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPlanId(null);
  };

  const handleModalComplete = () => {
    handleModalClose();
    // Refresh page to show updated subscription status
    window.location.reload();
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Add timeout to prevent hanging forever on auth checks
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Auth timeout after 2s')), 2000);
        });

        const dataPromise = Promise.all([
          StripeService.getUserProfile(),
          StripeService.getActiveSubscription(),
        ]);

        const [profileData, subData] = await Promise.race([dataPromise, timeoutPromise]);

        // Debug logging
        console.log('[PricingPage] Data loaded:', {
          subscription_tier: profileData?.subscription_tier,
          subscription_status: profileData?.subscription_status,
          subscription_price_id: subData?.price_id,
        });

        setProfile(profileData);
        setSubscription(subData);
      } catch (error) {
        // User not authenticated or timeout - that's fine
        console.log('[PricingPage] User not authenticated or timeout:', error);
        // Ensure profile and subscription are null for unauthenticated users
        setProfile(null);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  // Compute the current subscription price for upgrade/downgrade display
  const currentSubscriptionPrice = useMemo(() => {
    if (!subscription?.price_id) return null;

    const prices = STRIPE_PRICES as Record<string, string>;
    const plans = SUBSCRIPTION_PLANS as Record<string, { price?: number }>;

    // Check each tier
    for (const tier of ['STARTER_MONTHLY', 'GROWTH_MONTHLY', 'AGENCY_MONTHLY']) {
      if (prices[tier] && subscription.price_id === prices[tier]) {
        return plans[tier]?.price;
      }
    }
    return null;
  }, [subscription?.price_id]);

  return (
    <main className="flex-1 bg-main">
      <div className="container mx-auto py-16 px-6">
        {/* Current credits banner for logged-in users */}
        {!loading && profile && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-accent font-medium">{t('currentBalance.title')}</p>
                <p className="text-2xl font-bold text-accent-hover">
                  {(profile.subscription_credits_balance ?? 0) +
                    (profile.purchased_credits_balance ?? 0)}{' '}
                  {t('currentBalance.credits')}
                </p>
              </div>
              {subscription && (
                <div className="text-right">
                  <p className="text-sm text-accent">{t('currentBalance.activeSubscription')}</p>
                  <p className="font-medium text-accent-hover">
                    {getPlanForPriceId(subscription.price_id)?.name || profile.subscription_tier}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scheduled Downgrade Banner */}
        {!loading && subscription?.scheduled_price_id && subscription?.scheduled_change_date && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-8 max-w-3xl mx-auto">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-text-primary">{t('scheduledChange.title')}</h3>
                  <button
                    onClick={handleCancelScheduledChange}
                    disabled={cancelingSchedule}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-warning hover:text-warning/80 hover:bg-warning/20 rounded transition-colors disabled:opacity-50"
                  >
                    {cancelingSchedule ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    {t('scheduledChange.cancel')}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                  <span className="font-medium">
                    {getPlanForPriceId(subscription.price_id)?.name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-text-muted" />
                  <span className="font-medium text-warning">
                    {getPlanForPriceId(subscription.scheduled_price_id)?.name}
                  </span>
                  <span className="text-text-muted">
                    {t('scheduledChange.on')}{' '}
                    {new Date(subscription.scheduled_change_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Warning (dev only) */}
        {!pricesConfigured && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-warning flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-warning">{t('configurationWarning')}</span>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl md:text-5xl font-bold text-text-primary mb-4"
            data-testid="pricing-page-title"
          >
            {t('page.title')}
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">{t('page.subtitle')}</p>
        </div>

        {/* Subscription Plans Section */}
        <div className="mb-16" data-testid="subscription-plans-section">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-8">
            {t('subscription.title')}
          </h2>
          <p className="text-center text-text-secondary mb-8">{t('subscription.subtitle')}</p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto" data-testid="pricing-grid">
            {loading ? (
              <>
                <PricingCardSkeleton />
                <PricingCardSkeleton recommended={true} />
                <PricingCardSkeleton />
              </>
            ) : (
              <>
                {(['STARTER_MONTHLY', 'GROWTH_MONTHLY', 'AGENCY_MONTHLY'] as const).map(tier => {
                  const prices = STRIPE_PRICES as Record<string, string>;
                  const plans = SUBSCRIPTION_PLANS as Record<
                    string,
                    {
                      name: string;
                      description: string;
                      price: number;
                      interval: 'month' | 'year';
                      features: readonly string[];
                      recommended?: boolean;
                    }
                  >;
                  const priceId = prices[tier];
                  const plan = plans[tier];
                  const tierKey = tier.replace('_MONTHLY', '').toLowerCase();

                  if (!priceId || !plan) return null;

                  return (
                    <PricingCard
                      key={tier}
                      name={plan.name}
                      description={plan.description}
                      price={plan.price}
                      interval={plan.interval}
                      features={plan.features}
                      priceId={priceId}
                      recommended={plan.recommended}
                      disabled={
                        profile?.subscription_tier === tierKey ||
                        subscription?.scheduled_price_id === priceId
                      }
                      scheduled={subscription?.scheduled_price_id === priceId}
                      onCancelScheduled={
                        subscription?.scheduled_price_id === priceId
                          ? handleCancelScheduledChange
                          : undefined
                      }
                      cancelingScheduled={cancelingSchedule}
                      onSelect={
                        subscription
                          ? () => handleSubscribeClick(priceId, () => handlePlanSelect(priceId))
                          : undefined
                      }
                      currentSubscriptionPrice={currentSubscriptionPrice}
                      loading={buttonLoadingStates[priceId] || false}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Credit Packs Section */}
        <div className="mt-16 border-t border-border pt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-text-primary mb-4">{t('creditPacks.title')}</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              {t('creditPacks.subtitle')}
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <CreditPackSelector
              onPurchaseStart={() => {}}
              onPurchaseComplete={() => window.location.reload()}
              onError={error => console.error(error)}
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-text-muted mb-2">
              <strong>{t('creditPacks.valueComparison')}</strong>{' '}
              {t('creditPacks.valueComparisonText')}
            </p>
            <a
              href="#subscriptions"
              className="text-sm text-accent hover:text-accent-hover underline"
            >
              {t('creditPacks.comparePlans')}
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-8">
            {t('faq.title')}
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-surface p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {t('faq.creditsUsedFor.question')}
              </h3>
              <p className="text-text-secondary">{t('faq.creditsUsedFor.answer')}</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {t('faq.creditsExpire.question')}
              </h3>
              <p className="text-text-secondary">{t('faq.creditsExpire.answer')}</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {t('faq.batchProcessing.question')}
              </h3>
              <p className="text-text-secondary">{t('faq.batchProcessing.answer')}</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {t('faq.cancelSubscription.question')}
              </h3>
              <p className="text-text-secondary">{t('faq.cancelSubscription.answer')}</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {t('faq.paymentMethods.question')}
              </h3>
              <p className="text-text-secondary">{t('faq.paymentMethods.answer')}</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {t('faq.freePlan.question')}
              </h3>
              <p className="text-text-secondary">{t('faq.freePlan.answer')}</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-br from-accent/10 to-secondary/10 rounded-2xl p-8 max-w-2xl mx-auto border border-accent/20">
            <h3 className="text-2xl font-bold text-text-primary mb-4">{t('customPlan.title')}</h3>
            <p className="text-text-secondary mb-6">{t('customPlan.description')}</p>
            <div className="flex justify-center">
              <a
                href={`mailto:${clientEnv.SALES_EMAIL}`}
                className="inline-flex items-center px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
              >
                {t('customPlan.contactSales')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Change Modal */}
      {selectedPlanId && (
        <PlanChangeModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          targetPriceId={selectedPlanId}
          currentPriceId={subscription?.price_id}
          onComplete={handleModalComplete}
        />
      )}
    </main>
  );
}
