import { describe, test, expect } from 'vitest';
import { getSubscriptionConfig } from '../../shared/config/subscription.config';
import { CREDIT_COSTS } from '../../shared/config/credits.config';
import { PLAN_FIXTURES, FREE_TIER_FIXTURE } from '../fixtures/plan-fixtures';

describe('Starter Tier Configuration', () => {
  const config = getSubscriptionConfig();
  const starterPlan = config.plans.find(p => p.key === 'starter');
  const fixture = PLAN_FIXTURES.starter;

  test('should have Starter plan enabled', () => {
    expect(starterPlan).toBeDefined();
    expect(starterPlan?.enabled).toBe(true);
  });

  test('should have correct basic Starter plan properties', () => {
    expect(starterPlan?.key).toBe(fixture.key);
    expect(starterPlan?.name).toBe(fixture.name);
    expect(starterPlan?.description).toBe(fixture.description);
    expect(starterPlan?.displayOrder).toBe(1);
    expect(starterPlan?.recommended).toBe(false);
  });

  test('should have correct pricing for Starter tier', () => {
    expect(starterPlan?.priceInCents).toBe(fixture.priceInCents);
    expect(starterPlan?.currency).toBe(fixture.currency);
    expect(starterPlan?.interval).toBe(fixture.interval);
  });

  test('should have correct credit allocation for Starter tier', () => {
    expect(starterPlan?.creditsPerCycle).toBe(fixture.creditsPerCycle);
    expect(starterPlan?.maxRollover).toBe(fixture.maxRollover);
    expect(starterPlan?.rolloverMultiplier).toBe(fixture.rolloverMultiplier);
  });

  test('should have correct rollover configuration for Starter tier', () => {
    expect(starterPlan?.creditsExpiration.mode).toBe('never');
    expect(starterPlan?.creditsExpiration.gracePeriodDays).toBe(0);
    expect(starterPlan?.creditsExpiration.sendExpirationWarning).toBe(false);
    expect(starterPlan?.creditsExpiration.warningDaysBefore).toBe(0);
  });

  test('should have correct trial configuration for Starter tier', () => {
    expect(starterPlan?.trial.enabled).toBe(false);
    expect(starterPlan?.trial.durationDays).toBe(0);
    expect(starterPlan?.trial.trialCredits).toBeNull();
    expect(starterPlan?.trial.requirePaymentMethod).toBe(true);
    expect(starterPlan?.trial.allowMultipleTrials).toBe(false);
    expect(starterPlan?.trial.autoConvertToPaid).toBe(true);
  });

  test('should have correct features for Starter tier', () => {
    expect(starterPlan?.features).toEqual(fixture.features);
  });

  test('should have correct batch limit for Starter tier', () => {
    expect(starterPlan?.batchLimit).toBe(fixture.batchLimit);
  });

  test('should have valid Stripe price ID format', () => {
    expect(starterPlan?.stripePriceId).toMatch(/^price_/);
    expect(starterPlan?.stripePriceId).toBeTruthy();
  });
});

describe('Rollover Configuration for All Plans (Tiered)', () => {
  const config = getSubscriptionConfig();

  test('should have tiered rollover configuration', () => {
    const enabledPlans = config.plans.filter(p => p.enabled);

    enabledPlans.forEach(plan => {
      const fixture = PLAN_FIXTURES[plan.key as keyof typeof PLAN_FIXTURES];
      expect(plan.rolloverMultiplier).toBe(fixture.rolloverMultiplier);
      expect(plan.maxRollover).toBe(fixture.maxRollover);
    });
  });

  test('personal tiers (starter, growth) should have rollover enabled', () => {
    const personalPlans = config.plans.filter(
      p => p.enabled && ['starter', 'growth'].includes(p.key)
    );

    personalPlans.forEach(plan => {
      expect(plan.maxRollover).toBeGreaterThan(0);
      expect(plan.rolloverMultiplier).toBeGreaterThan(0);
      expect(plan.creditsExpiration.mode).toBe('never');
    });
  });

  test("agency tier should have no rollover (like Let's Enhance)", () => {
    const agencyPlan = config.plans.find(p => p.key === 'agency');
    expect(agencyPlan?.maxRollover).toBe(0);
    expect(agencyPlan?.rolloverMultiplier).toBe(0);
  });

  test('should have rollover or no-rollover mentioned in features for all plans', () => {
    const enabledPlans = config.plans.filter(p => p.enabled);

    enabledPlans.forEach(plan => {
      const hasRolloverFeature = plan.features.some(
        f => f.toLowerCase().includes('roll over') || f.toLowerCase().includes('rollover')
      );
      // Agency has no rollover, so it's OK if the feature doesn't mention rollover
      if (plan.maxRollover === 0) {
        expect(hasRolloverFeature).toBeFalsy();
      } else {
        expect(hasRolloverFeature).toBeTruthy();
      }
    });
  });
});

describe('Plan Display Order', () => {
  const config = getSubscriptionConfig();

  test('should have plans in correct display order', () => {
    const enabledPlans = config.plans
      .filter(p => p.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    expect(enabledPlans[0].key).toBe('starter');
    expect(enabledPlans[1].key).toBe('growth');
    expect(enabledPlans[2].key).toBe('agency');
  });

  test('should have consecutive display order numbers', () => {
    const enabledPlans = config.plans.filter(p => p.enabled);

    enabledPlans.forEach((plan, index) => {
      // Starter has displayOrder 1, Hobby has 2, etc.
      expect(plan.displayOrder).toBe(index + 1);
    });
  });
});

describe('Credits Configuration Constants', () => {
  test('should have STARTER_MONTHLY_CREDITS defined correctly', () => {
    expect(CREDIT_COSTS.STARTER_MONTHLY_CREDITS).toBe(PLAN_FIXTURES.starter.creditsPerCycle);
  });

  test('should have all monthly credit constants defined', () => {
    expect(CREDIT_COSTS.STARTER_MONTHLY_CREDITS).toBe(PLAN_FIXTURES.starter.creditsPerCycle);
    expect(CREDIT_COSTS.GROWTH_MONTHLY_CREDITS).toBe(PLAN_FIXTURES.growth.creditsPerCycle);
    expect(CREDIT_COSTS.AGENCY_MONTHLY_CREDITS).toBe(PLAN_FIXTURES.agency.creditsPerCycle);
  });

  test('should have increasing credit amounts across tiers', () => {
    expect(PLAN_FIXTURES.starter.creditsPerCycle).toBeLessThan(
      PLAN_FIXTURES.growth.creditsPerCycle
    );
    expect(PLAN_FIXTURES.growth.creditsPerCycle).toBeLessThan(PLAN_FIXTURES.agency.creditsPerCycle);
  });
});

describe('Starter vs Free Tier Comparison', () => {
  const config = getSubscriptionConfig();
  const starterPlan = config.plans.find(p => p.key === 'starter');
  const freeFixture = FREE_TIER_FIXTURE;
  const starterFixture = PLAN_FIXTURES.starter;

  test('should offer significantly more credits than free tier', () => {
    expect(starterPlan?.creditsPerCycle).toBeGreaterThan(freeFixture.initialCredits);
    expect(starterPlan?.creditsPerCycle).toBe(starterFixture.creditsPerCycle);
  });

  test('should have reasonable batch limit compared to free tier', () => {
    expect(starterPlan?.batchLimit).toBeGreaterThan(config.freeUser.batchLimit);
    expect(starterPlan?.batchLimit).toBe(starterFixture.batchLimit);
  });

  test('should have same maximum rollover cap as configured', () => {
    expect(starterPlan?.maxRollover).toBe(starterFixture.maxRollover);
  });
});
