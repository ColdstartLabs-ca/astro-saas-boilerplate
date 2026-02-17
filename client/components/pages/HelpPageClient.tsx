'use client';

import { ContactSupportCTA } from '@client/components/cta/ContactSupportCTA';
import React from 'react';

/**
 * Help page client component - renders the contact support CTA as an Astro island.
 * FAQ content is rendered server-side in the Astro template.
 */
export default function HelpPageClient(): React.JSX.Element {
  return <ContactSupportCTA showPricingLink={true} theme="dark" />;
}
