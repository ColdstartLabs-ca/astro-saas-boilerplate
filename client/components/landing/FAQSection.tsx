'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';

interface IProps {
  className?: string;
}

const FAQItem: React.FC<{ question: string; answer: React.ReactNode }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-800">
      <button
        className="w-full py-6 flex justify-between items-center text-left focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-lg font-medium text-slate-200 pr-8">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-brand-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="pb-6 text-slate-400 leading-relaxed animate-fade-in">{answer}</div>
      )}
    </div>
  );
};

export function FAQSection({ className = '' }: IProps): JSX.Element {
  const faqs = [
    {
      question: 'Will Google penalize AI-generated content?',
      answer: (
        <>
          <a
            href="https://developers.google.com/search/blog/2023/02/google-search-and-ai-content"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-500 hover:text-brand-400 underline"
          >
            Google Search Central has stated
          </a>{' '}
          AI content is fine when it&apos;s helpful, reliable, and people-first. Our Humanizer engine
          ensures your content meets those standards by avoiding detectable patterns.
        </>
      ),
    },
    {
      question: 'How is this different from other SEO tools?',
      answer:
        'Three key differences: (1) Quality - our Humanizer engine produces human-level content, not generic AI slop. (2) Reliability - 99.9% uptime vs. constant bugs. (3) Support - 24/7 chat vs. days of waiting. Same price, better everything.',
    },
    {
      question: 'Do I need technical skills to set this up?',
      answer:
        'No. If you can install a WordPress plugin, you can use AutopilotRank. Our guided onboarding walks you through everything in under 15 minutes.',
    },
    {
      question: 'What CMS platforms do you support?',
      answer:
        'Native: WordPress (REST API with Application Passwords). Via webhook: Shopify, Webflow, Ghost, Notion, Wix, and custom platforms. Our webhook system allows you to connect virtually any CMS or custom application.',
    },
    {
      question: 'Can I review content before it publishes?',
      answer:
        'Yes. Choose between: (1) Full autopilot - content publishes automatically after QA passes, (2) Review mode - content queued for your approval, (3) Draft mode - content saved as drafts in your CMS.',
    },
  ];

  return (
    <section id="faq" className={`py-24 bg-slate-950 ${className}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
