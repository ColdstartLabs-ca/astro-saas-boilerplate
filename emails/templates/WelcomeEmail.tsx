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

interface IWelcomeEmailProps {
  userName?: string;
  verifyUrl?: string;
  baseUrl: string;
  supportEmail: string;
  appName?: string;
}

export function WelcomeEmail({
  userName = 'there',
  verifyUrl,
  baseUrl,
  supportEmail,
  appName = 'SaaS Boilerplate',
}: IWelcomeEmailProps): React.JSX.Element {
  const dashboardUrl = `${baseUrl}/dashboard`;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>{appName}</Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>Welcome to {appName}!</Text>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              Thanks for signing up! You&apos;re 3 steps away from your first SEO article:
            </Text>
            <Text style={listItem}>1. Create a project and connect your site</Text>
            <Text style={listItem}>2. Add your target keywords</Text>
            <Text style={listItem}>3. Hit Generate and watch the magic happen</Text>
            <Text style={paragraph}>
              Start with 3 free articles to try it out — no credit card needed.
            </Text>

            {verifyUrl ? (
              <Button href={verifyUrl} style={button}>
                Verify Email
              </Button>
            ) : (
              <Button href={dashboardUrl} style={button}>
                Create Your First Article
              </Button>
            )}
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

const listItem = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  marginBottom: '8px',
  marginLeft: '16px',
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
