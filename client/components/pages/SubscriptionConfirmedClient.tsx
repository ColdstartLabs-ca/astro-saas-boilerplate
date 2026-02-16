'use client';

import React, { Suspense, useEffect } from 'react';
import { CheckCircle, Calendar, CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import { getPlanByPriceId } from '@shared/config/subscription.utils';
import { resolvePlanOrPack } from '@shared/config/stripe';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

// Translation helper
const t = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'subscription.confirmed.upgradeComplete': 'Upgrade Complete',
    'subscription.confirmed.downgradeScheduled': 'Downgrade Scheduled',
    'subscription.confirmed.upgradeSuccess': 'Your subscription has been upgraded successfully.',
    'subscription.confirmed.downgradeSuccess': 'Your subscription downgrade has been scheduled.',
    'subscription.confirmed.previousPlan': 'Previous Plan',
    'subscription.confirmed.currentPlan': 'Current Plan',
    'subscription.confirmed.newPlan': 'New Plan',
    'subscription.confirmed.scheduledPlan': 'Scheduled Plan',
    'subscription.confirmed.creditsPerMonth': '{credits} credits/month',
    'subscription.confirmed.keepUsingUntil': 'Keep using {planName} until',
    'subscription.confirmed.endOfBillingPeriod': 'the end of your billing period',
    'subscription.confirmed.noChargesToday': 'No charges today',
    'subscription.confirmed.nextBillWillBe': 'Next bill will be {amount} for {planName}',
    'subscription.confirmed.whatHappensNext': 'What happens next?',
    'subscription.confirmed.continueUsingFeatures':
      'Continue using {planName} features until the end of your billing period.',
    'subscription.confirmed.creditsWillReset': 'Your monthly credits will reset to {credits}.',
    'subscription.confirmed.cancelChangeAnytime':
      'You can cancel this change anytime before it takes effect.',
    'subscription.confirmed.newPlanActive': 'Your new plan is now active!',
    'subscription.confirmed.accessToCredits': 'You now have access to {credits} credits per month.',
    'subscription.confirmed.proratedCharge': 'Prorated Charge',
    'subscription.confirmed.chargedForRemainder':
      'You were charged {amount} for the remainder of this billing cycle.',
    'subscription.confirmed.creditForUnusedTime':
      'You received a credit of {amount} for unused time.',
    'subscription.confirmed.whatsIncluded': "What's included",
    'subscription.confirmed.creditsPerMonthIncluded': '{credits} credits per month included',
    'subscription.confirmed.creditsRefreshStart':
      'Credits refresh at the start of each billing cycle.',
    'subscription.confirmed.unusedCreditsDontRollover': 'Unused credits do not rollover.',
    'subscription.confirmed.goToDashboard': 'Go to Dashboard',
    'subscription.confirmed.viewPlans': 'View Plans',
    'subscription.confirmed.questions': 'Questions?',
    'subscription.confirmed.contactSupport': 'Contact Support',
    'common.loading': 'Loading...',
  };

  let result = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      result = result.replace(`{${param}}`, String(value));
    });
  }
  return result;
};

function SubscriptionConfirmedContent() {
  // Parse URL search params for client-side routing (avoid SSR issues)
  const [urlParams, setUrlParams] = React.useState<{
    type: string | null;
    newPriceId: string | null;
    oldPriceId: string | null;
    effectiveDate: string | null;
    prorationAmount: string | null;
  }>({
    type: null,
    newPriceId: null,
    oldPriceId: null,
    effectiveDate: null,
    prorationAmount: null,
  });

  // Parse URL params on client side only
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setUrlParams({
        type: searchParams.get('type'),
        newPriceId: searchParams.get('new_price_id'),
        oldPriceId: searchParams.get('old_price_id'),
        effectiveDate: searchParams.get('effective_date'),
        prorationAmount: searchParams.get('proration_amount'),
      });
    }
  }, []);

  const { type, newPriceId, oldPriceId, effectiveDate, prorationAmount } = urlParams;

  // Use unified resolver first for consistent plan lookup
  const resolvedNewPlan = newPriceId ? resolvePlanOrPack(newPriceId) : null;
  const resolvedOldPlan = oldPriceId ? resolvePlanOrPack(oldPriceId) : null;

  // Fallback to legacy format for display compatibility
  const newPlan = newPriceId ? getPlanByPriceId(newPriceId) : null;
  const oldPlan = oldPriceId ? getPlanByPriceId(oldPriceId) : null;

  // Log warnings for unresolved price IDs (expected for migrated/old prices)
  useEffect(() => {
    if (newPriceId && !resolvedNewPlan) {
      console.warn(
        '[SUBSCRIPTION_CONFIRMED] Could not resolve new price ID (may be outdated):',
        newPriceId
      );
    }
    if (oldPriceId && !resolvedOldPlan) {
      // This is expected for old/migrated price IDs - not an error
      console.log(
        '[SUBSCRIPTION_CONFIRMED] Old price ID not in current config (expected):',
        oldPriceId
      );
    }
  }, [newPriceId, oldPriceId, resolvedNewPlan, resolvedOldPlan]);

  const isDowngrade = type === 'downgrade';

  // Redirect if missing required params
  useEffect(() => {
    if (!type || !newPriceId) {
      window.location.href = '/pricing';
    }
  }, [type, newPriceId]);

  if (!newPlan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface to-main flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
              isDowngrade ? 'bg-warning/20' : 'bg-success/20'
            } mb-4`}
          >
            <CheckCircle className={`w-8 h-8 ${isDowngrade ? 'text-warning' : 'text-success'}`} />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">
            {isDowngrade
              ? t('subscription.confirmed.downgradeScheduled')
              : t('subscription.confirmed.upgradeComplete')}
          </h1>
          <p className="text-muted-foreground">
            {isDowngrade
              ? t('subscription.confirmed.downgradeSuccess')
              : t('subscription.confirmed.upgradeSuccess')}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-surface rounded-xl shadow-lg border border-border overflow-hidden">
          {/* Plan Change Summary */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {isDowngrade
                    ? t('subscription.confirmed.currentPlan')
                    : t('subscription.confirmed.previousPlan')}
                </p>
                <p className="font-semibold text-muted-foreground">
                  {resolvedOldPlan?.name || oldPlan?.name || 'N/A'}
                </p>
                {(resolvedOldPlan || oldPlan) && (
                  <p className="text-sm text-muted-foreground">
                    {t('subscription.confirmed.creditsPerMonth', {
                      credits: resolvedOldPlan?.creditsPerCycle || oldPlan?.creditsPerCycle || 0,
                    })}
                  </p>
                )}
              </div>

              <ArrowRight className="w-5 h-5 text-muted-foreground mx-4" />

              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {isDowngrade
                    ? t('subscription.confirmed.scheduledPlan')
                    : t('subscription.confirmed.newPlan')}
                </p>
                <p className={`font-semibold ${isDowngrade ? 'text-warning' : 'text-success'}`}>
                  {resolvedNewPlan?.name || newPlan?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('subscription.confirmed.creditsPerMonth', {
                    credits: resolvedNewPlan?.creditsPerCycle || newPlan?.creditsPerCycle,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {isDowngrade ? (
              <>
                {/* Downgrade Info */}
                <div className="flex items-start gap-3 p-4 bg-warning/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-primary">
                      {t('subscription.confirmed.keepUsingUntil', {
                        planName:
                          resolvedOldPlan?.name ||
                          oldPlan?.name ||
                          t('subscription.confirmed.currentPlan'),
                      })}
                    </p>
                    <p className="text-lg font-semibold text-warning">
                      {effectiveDate
                        ? formatDate(effectiveDate)
                        : t('subscription.confirmed.endOfBillingPeriod')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-surface rounded-lg">
                  <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-primary">
                      {t('subscription.confirmed.noChargesToday')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('subscription.confirmed.nextBillWillBe', {
                        amount: formatCurrency(newPlan?.priceInCents || 0),
                        planName: resolvedNewPlan?.name || newPlan?.name,
                      })}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground bg-accent/10 p-4 rounded-lg">
                  <p className="font-medium text-primary mb-1">
                    {t('subscription.confirmed.whatHappensNext')}
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>
                      {t('subscription.confirmed.continueUsingFeatures', {
                        planName:
                          resolvedOldPlan?.name ||
                          oldPlan?.name ||
                          t('subscription.confirmed.currentPlan'),
                      })}
                    </li>
                    <li>
                      {t('subscription.confirmed.creditsWillReset', {
                        credits: resolvedNewPlan?.creditsPerCycle || newPlan?.creditsPerCycle || 0,
                      })}
                    </li>
                    <li>{t('subscription.confirmed.cancelChangeAnytime')}</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                {/* Upgrade Info */}
                <div className="flex items-start gap-3 p-4 bg-success/20 rounded-lg">
                  <Sparkles className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-primary">
                      {t('subscription.confirmed.newPlanActive')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('subscription.confirmed.accessToCredits', {
                        credits: resolvedNewPlan?.creditsPerCycle || newPlan?.creditsPerCycle || 0,
                      })}
                    </p>
                  </div>
                </div>

                {prorationAmount && Number(prorationAmount) !== 0 && (
                  <div className="flex items-start gap-3 p-4 bg-surface rounded-lg">
                    <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-primary">
                        {t('subscription.confirmed.proratedCharge')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Number(prorationAmount) > 0
                          ? t('subscription.confirmed.chargedForRemainder', {
                              amount: formatCurrency(Number(prorationAmount)),
                            })
                          : t('subscription.confirmed.creditForUnusedTime', {
                              amount: formatCurrency(Math.abs(Number(prorationAmount))),
                            })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground bg-accent/10 p-4 rounded-lg">
                  <p className="font-medium text-primary mb-1">
                    {t('subscription.confirmed.whatsIncluded')}
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>
                      {t('subscription.confirmed.creditsPerMonthIncluded', {
                        credits: resolvedNewPlan?.creditsPerCycle || newPlan?.creditsPerCycle || 0,
                      })}
                    </li>
                    <li>{t('subscription.confirmed.creditsRefreshStart')}</li>
                    <li>{t('subscription.confirmed.unusedCreditsDontRollover')}</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 bg-surface border-t border-border">
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/dashboard"
                className="flex-1 px-4 py-2.5 bg-accent text-white text-center font-medium rounded-lg hover:bg-accent-hover transition-colors"
              >
                {t('subscription.confirmed.goToDashboard')}
              </a>
              <a
                href="/pricing"
                className="flex-1 px-4 py-2.5 bg-surface text-muted-foreground text-center font-medium rounded-lg border border-border hover:bg-surface transition-colors"
              >
                {t('subscription.confirmed.viewPlans')}
              </a>
            </div>
          </div>
        </div>

        {/* Help Link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t('subscription.confirmed.questions')}{' '}
          <a href="/help" className="text-accent hover:text-accent-hover">
            {t('subscription.confirmed.contactSupport')}
          </a>
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    </div>
  );
}

export function SubscriptionConfirmedClient() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SubscriptionConfirmedContent />
    </Suspense>
  );
}

export default SubscriptionConfirmedClient;
