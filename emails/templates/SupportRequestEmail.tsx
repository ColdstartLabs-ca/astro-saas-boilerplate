import React from 'react';
import { Html, Head, Body, Container, Section, Text, Hr, Link } from '@react-email/components';
import { serverEnv } from '@shared/config/env';

interface ISupportRequestEmailProps {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  appName?: string;
  // Note: baseUrl and supportEmail are injected by the email service but not used in this template
}

export function SupportRequestEmail({
  name,
  email,
  category,
  subject,
  message,
  appName = serverEnv.APP_NAME,
}: ISupportRequestEmailProps): React.JSX.Element {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>{appName} Support</Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>New Support Request</Text>

            <Section style={infoBox}>
              <Text style={label}>Category</Text>
              <Text style={value}>{category.toUpperCase()}</Text>
            </Section>

            <Section style={infoBox}>
              <Text style={label}>From</Text>
              <Text style={value}>
                {name} ({email})
              </Text>
            </Section>

            <Section style={infoBox}>
              <Text style={label}>Subject</Text>
              <Text style={value}>{subject}</Text>
            </Section>

            <Hr style={hr} />

            <Text style={label}>Message</Text>
            <Text style={messageText}>{message}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Reply directly to this email to respond to{' '}
              <Link href={`mailto:${email}`} style={footerLink}>
                {email}
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
  backgroundColor: '#ef4444',
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
  marginBottom: '24px',
};

const infoBox = {
  marginBottom: '16px',
};

const label = {
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const value = {
  fontSize: '16px',
  color: '#0f172a',
  margin: '0',
};

const messageText = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  whiteSpace: 'pre-wrap' as const,
  backgroundColor: '#f8fafc',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
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
