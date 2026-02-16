/**
 * Analytics event types - re-exported from shared types.
 *
 * This file exists for backward compatibility with existing server imports.
 * New code should import directly from '@shared/types/analytics.types'.
 */

export type {
  IPageViewProperties,
  ISignupProperties,
  ISubscriptionProperties,
  ICreditPackProperties,
  IApiCallProperties,
  IArticleGeneratedProperties,
  IArticlePublishedProperties,
  IProjectCreatedProperties,
  ISeanEllisResponseProperties,
  ISubscriptionExpansionProperties,
  IAnalyticsEventName,
  IAnalyticsEvent,
  IUserIdentity,
  IConsentStatus,
  IAnalyticsConsent,
} from '@shared/types/analytics.types';
