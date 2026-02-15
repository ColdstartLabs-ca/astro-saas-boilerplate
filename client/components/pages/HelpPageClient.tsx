'use client';

import { ContactSupportCTA } from '@client/components/cta/ContactSupportCTA';
import { GettingStartedFAQ, CreditsBillingFAQ, TechnicalSupportFAQ } from '@client/components/faq/FAQAccordion';
import React from 'react';

/**
 * Help page client component - renders the FAQ sections and contact support CTA
 * Used as an Astro island in the help page
 */
export default function HelpPageClient(): React.JSX.Element {
  return (
    <>
      <GettingStartedFAQ />
      <CreditsBillingFAQ />
      <TechnicalSupportFAQ />
      <ContactSupportCTA showPricingLink={true} theme="dark" />
    </>
  );
}
