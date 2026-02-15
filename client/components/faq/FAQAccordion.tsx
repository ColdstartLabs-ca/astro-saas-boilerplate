'use client';

import { ChevronDown, HelpCircle } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslations } from '@client/hooks/useTranslations';
import { clientEnv } from '@shared/config/env';

interface IFAQItem {
  question: string;
  answer: React.ReactNode;
}

interface IFAQAccordionProps {
  items: IFAQItem[];
  className?: string;
}

function FAQAccordion({ items, className = '' }: IFAQAccordionProps): React.JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-surface rounded-xl border border-border overflow-hidden transition-all duration-300"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-light/50 transition-colors"
          >
            <span className="font-medium text-foreground pr-4">{item.question}</span>
            <ChevronDown
              size={20}
              className={`text-muted-foreground flex-shrink-0 transition-transform duration-300 ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              openIndex === index ? 'max-h-96' : 'max-h-0'
            }`}
          >
            <div className="px-6 pb-4 text-muted-foreground leading-relaxed">{item.answer}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GettingStartedFAQ(): React.JSX.Element {
  const t = useTranslations('help.gettingStarted.faqs');
  const appName = clientEnv.APP_NAME;

  const items: IFAQItem[] = [
    {
      question: t('howToStart.question', { appName }),
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-foreground mb-3">{t('howToStart.answerIntro')}</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>{t('howToStart.answerStep1')}</strong> {t('howToStart.answerStep2')}
            </li>
            <li>
              {t('howToStart.answerStep3')}
            </li>
            <li>
              {t('howToStart.answerStep4')} <strong>{t('howToStart.answerStep5')}</strong>
            </li>
            <li>
              {t('howToStart.answerStep6')}
            </li>
            <li>
              {t('howToStart.answerStep7')}
            </li>
            <li>
              <strong>{t('howToStart.answerStep8')}</strong>
            </li>
            <li>
              {t('howToStart.answerStep9')}
            </li>
          </ol>
        </div>
      ),
    },
    {
      question: t('supportedFormats.question'),
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-foreground mb-3">{t('supportedFormats.answerIntro')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('supportedFormats.format1')}</li>
            <li>{t('supportedFormats.format2')}</li>
            <li>{t('supportedFormats.format3')}</li>
          </ul>
          <p className="mt-3 text-sm">
            <strong>{t('supportedFormats.maxFileSize')}</strong> {t('supportedFormats.maxFileSizeValue')}
          </p>
        </div>
      ),
    },
    {
      question: t('apiUsage.question'),
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-foreground mb-3">{t('apiUsage.answerIntro')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('apiUsage.answerDetail1')}</li>
            <li>{t('apiUsage.answerDetail2')}</li>
            <li>{t('apiUsage.answerDetail3')}</li>
          </ul>
          <p className="mt-3 text-sm italic">{t('apiUsage.example')}</p>
        </div>
      ),
    },
    {
      question: t('processingTime.question'),
      answer: <p>{t('processingTime.answer')}</p>,
    },
  ];

  return (
    <section id="getting-started" className="py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-accent/10 rounded-xl p-2">
            <HelpCircle size={24} className="text-accent" />
          </div>
          <h2 className="font-display text-3xl font-bold text-white">
            {t('title')}
          </h2>
        </div>
        <FAQAccordion items={items} />
      </div>
    </section>
  );
}

export function CreditsBillingFAQ(): React.JSX.Element {
  const t = useTranslations('help.creditsBilling.faqs');
  const tGeneral = useTranslations('help.creditsBilling');

  const items: IFAQItem[] = [
    {
      question: t('whatAreCredits.question'),
      answer: (
        <p>
          {t('whatAreCredits.answerPart1')}{' '}
          <strong className="text-foreground">{t('whatAreCredits.answerPart2')} {t('whatAreCredits.answerPart3')}</strong> {t('whatAreCredits.answerPart4')}
        </p>
      ),
    },
    {
      question: t('purchaseCredits.question'),
      answer: (
        <div className="space-y-2">
          <p>
            {t('purchaseCredits.answerIntro')}{' '}
            <a href="/pricing" className="text-accent hover:underline font-medium">
              {t('purchaseCredits.pricingPage')}
            </a>{' '}
            {t('purchaseCredits.answerMid')}
          </p>
          <ul className="list-none space-y-1 mt-3">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <strong>Hobby:</strong> {t('purchaseCredits.plan1')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <strong>Professional:</strong> {t('purchaseCredits.plan2')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <strong>Business:</strong> {t('purchaseCredits.plan3')}
            </li>
          </ul>
        </div>
      ),
    },
    {
      question: t('creditsExpire.question'),
      answer: <p>{t('creditsExpire.answer')}</p>,
    },
    {
      question: t('cancelSubscription.question'),
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-foreground mb-2">{t('cancelSubscription.answerIntro')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              {t('cancelSubscription.option1')}{' '}
              <a href="/dashboard/billing" className="text-accent hover:underline">
                {t('cancelSubscription.option2')}
              </a>
            </li>
            <li>{t('cancelSubscription.option3')}</li>
          </ul>
          <p className="mt-3">{t('cancelSubscription.answerOutro')}</p>
        </div>
      ),
    },
    {
      question: t('paymentMethods.question'),
      answer: <p>{t('paymentMethods.answer')}</p>,
    },
    {
      question: t('refunds.question'),
      answer: (
        <div className="space-y-2">
          <p>{t('refunds.answerIntro')}</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{t('refunds.reason1')}</li>
            <li>{t('refunds.reason2')}</li>
            <li>{t('refunds.reason3')}</li>
          </ul>
          <p className="mt-2">
            <a href="/help" className="text-accent hover:underline">{t('refunds.contactSupport')}</a>
          </p>
        </div>
      ),
    },
  ];

  return (
    <section id="credits-billing" className="py-12 bg-surface/30">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-accent/10 rounded-xl p-2">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="font-display text-3xl font-bold text-white">
            {tGeneral('title')}
          </h2>
        </div>
        <FAQAccordion items={items} />
      </div>
    </section>
  );
}

export function TechnicalSupportFAQ(): React.JSX.Element {
  const t = useTranslations('help.technicalSupport.faqs');
  const tGeneral = useTranslations('help.technicalSupport');

  const items: IFAQItem[] = [
    {
      question: t('failedProcessing.question'),
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-foreground mb-2">{t('failedProcessing.answerIntro')}</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>{t('failedProcessing.step1')}</li>
            <li>{t('failedProcessing.step2')}</li>
            <li>{t('failedProcessing.step3')}</li>
            <li>{t('failedProcessing.step4')}</li>
            <li>
              {t('failedProcessing.step5')}{' '}
              <a href="/help" className="text-accent hover:underline">support</a>
            </li>
          </ol>
        </div>
      ),
    },
    {
      question: t('qualityIssues.question'),
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-foreground mb-2">{t('qualityIssues.answerIntro')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('qualityIssues.result1')}</li>
            <li>{t('qualityIssues.result2')}</li>
            <li>{t('qualityIssues.result3')}</li>
          </ul>
          <p className="mt-3">{t('qualityIssues.answerOutro')}</p>
        </div>
      ),
    },
    {
      question: t('dataPrivacy.question'),
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-foreground mb-2">{t('dataPrivacy.answerIntro')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('dataPrivacy.point1')}</li>
            <li>{t('dataPrivacy.point2')}</li>
            <li>{t('dataPrivacy.point3')}</li>
            <li>{t('dataPrivacy.point4')}</li>
          </ul>
          <p className="mt-3">
            {t('dataPrivacy.answerOutro')}{' '}
            <a href="/privacy" className="text-accent hover:underline">
              {t('dataPrivacy.privacyPolicy')}
            </a>{' '}
            {t('dataPrivacy.answerEnd')}
          </p>
        </div>
      ),
    },
    {
      question: t('commercialUse.question'),
      answer: <p>{t('commercialUse.answer')}</p>,
    },
    {
      question: t('browserSupport.question'),
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-foreground mb-2">{t('browserSupport.answerIntro')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('browserSupport.browser1')}</li>
            <li>{t('browserSupport.browser2')}</li>
            <li>{t('browserSupport.browser3')}</li>
          </ul>
          <p className="mt-3 text-sm italic">{t('browserSupport.jsNote')}</p>
        </div>
      ),
    },
  ];

  return (
    <section id="technical" className="py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-accent/10 rounded-xl p-2">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="font-display text-3xl font-bold text-white">
            {tGeneral('title')}
          </h2>
        </div>
        <FAQAccordion items={items} />
      </div>
    </section>
  );
}
