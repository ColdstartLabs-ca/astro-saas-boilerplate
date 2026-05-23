import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
} from '@react-email/components';

interface ILowCreditsEmailProps {
  userName?: string;
  creditsRemaining?: number;
  planCredits?: number;
  upgradeUrl?: string;
  baseUrl: string;
  supportEmail: string;
  appName?: string;
}

export function LowCreditsEmail({
  userName = 'there',
  creditsRemaining,
  planCredits,
  upgradeUrl,
  baseUrl,
  supportEmail,
  appName = 'SaaS Boilerplate',
}: ILowCreditsEmailProps): React.JSX.Element {
  const pricingUrl = `${baseUrl}/pricing`;
  const billingUrl = `${baseUrl}/dashboard?view=billing`;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>{appName}</Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>Running Low on Credits</Text>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              {planCredits !== undefined && creditsRemaining !== undefined
                ? `You have ${creditsRemaining} of your ${planCredits} monthly credits remaining.`
                : creditsRemaining !== undefined
                  ? `You have ${creditsRemaining} credits remaining.`
                  : 'Your credit balance is getting low.'}
            </Text>
            <Text style={paragraph}>
              Don&apos;t let your work stop! Top up your credits to continue generating
              SEO-optimized articles.
            </Text>
            <Text style={paragraph}>
              Upgrade to get more articles per month, or buy a credit pack for instant access.
            </Text>

            <Section style={buttonContainer}>
              <Button href={upgradeUrl || pricingUrl} style={button}>
                Upgrade Plan
              </Button>
              <Button href={billingUrl} style={secondaryButton}>
                Buy Credits
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Questions?{' '}
              <Link href={`mailto:${supportEmail}`} style={footerLink}>
                Contact us
              </Link>
            </Text>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} {appName}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
};

const header = {
  backgroundColor: '#3b82f6',
  padding: '24px',
  textAlign: 'center' as const,
};

const logo = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '32px 24px',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0f172a',
  marginBottom: '16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  marginBottom: '16px',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
  marginRight: '12px',
};

const secondaryButton = {
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  color: '#3b82f6',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
  border: '1px solid #e2e8f0',
};

const buttonContainer = {
  marginBottom: '16px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '0',
};

const footer = {
  padding: '24px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#64748b',
  margin: '4px 0',
};

const footerLink = {
  color: '#3b82f6',
  textDecoration: 'underline',
};
