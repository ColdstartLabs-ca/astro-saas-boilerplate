import type { Metadata } from 'next';
import { HomePageClient } from '@client/components/pages/HomePageClient';
import { clientEnv } from '@shared/config/env';
import type { Locale } from '@/i18n/config';

interface ILocaleHomePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: ILocaleHomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = `${clientEnv.APP_NAME} - Build Your SaaS Faster`;
  const description = `Powerful API platform for developers. Start building with ${clientEnv.APP_NAME} - simple, fast, and reliable infrastructure for your next project.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: '/',
      locale: locale,
      siteName: clientEnv.APP_NAME,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: `${clientEnv.BASE_URL}/`,
    },
  };
}

export default async function LocaleHomePage({ params }: ILocaleHomePageProps) {
  // Locale is available in params but not used in this generic page
  await params;

  return <HomePageClient />;
}
