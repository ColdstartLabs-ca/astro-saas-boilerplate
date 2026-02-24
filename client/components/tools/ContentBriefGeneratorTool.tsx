import { useState } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';

interface IContentBriefGeneratorToolProps {
  className?: string;
}

type ContentType = 'How-To Guide' | 'Listicle' | 'Pillar Page' | 'Comparison' | 'Review';

interface IContentBrief {
  h1: string;
  wordCount: number;
  primaryKeyword: string;
  secondaryKeywords: string[];
  sections: Array<{ h2: string; notes: string }>;
}

const CONTENT_TYPES: ContentType[] = [
  'How-To Guide',
  'Listicle',
  'Pillar Page',
  'Comparison',
  'Review',
];

const WORD_COUNTS: Record<ContentType, number> = {
  'How-To Guide': 1800,
  Listicle: 2200,
  'Pillar Page': 3500,
  Comparison: 2000,
  Review: 1600,
};

const YEAR = new Date().getFullYear();

function buildSections(
  keyword: string,
  contentType: ContentType
): Array<{ h2: string; notes: string }> {
  const kw = keyword.trim();

  if (contentType === 'How-To Guide') {
    return [
      { h2: `What Is ${kw}?`, notes: 'Define the topic. Target "what is" question keywords.' },
      { h2: `Why ${kw} Matters in ${YEAR}`, notes: 'Explain relevance and benefits.' },
      { h2: `What You Need Before You Start`, notes: 'Prerequisites, tools, or resources needed.' },
      {
        h2: `Step-by-Step: How to ${kw}`,
        notes: 'Core instructional section with numbered steps.',
      },
      {
        h2: `Common Mistakes to Avoid`,
        notes: 'Builds trust; targets "mistake" long-tail keywords.',
      },
      {
        h2: `Pro Tips for Better Results`,
        notes: 'Advanced tactics to differentiate from basic guides.',
      },
      { h2: `FAQs About ${kw}`, notes: 'Target question keywords. Aim for 4-6 QA pairs.' },
    ];
  }

  if (contentType === 'Listicle') {
    return [
      {
        h2: `Why ${kw} Is Worth Your Attention`,
        notes: 'Brief intro making the case for this list.',
      },
      { h2: `How We Evaluated Each Option`, notes: 'Establishes selection criteria and trust.' },
      { h2: `#1: [Top Pick Name]`, notes: 'Lead with the best option. Include pros/cons.' },
      {
        h2: `#2–#5: [Runner-Up Options]`,
        notes: 'Cover remaining items with clear differentiators.',
      },
      {
        h2: `Which ${kw} Is Right for You?`,
        notes: 'Audience segmentation: beginner vs advanced.',
      },
      { h2: `Final Verdict`, notes: 'Summary recommendation with CTA.' },
      { h2: `FAQs`, notes: 'Address common objections and questions.' },
    ];
  }

  if (contentType === 'Pillar Page') {
    return [
      {
        h2: `What Is ${kw}? (Complete Definition)`,
        notes: 'Comprehensive definition targeting "what is" searches.',
      },
      { h2: `Why ${kw} Is Critical for Growth`, notes: 'Business case and impact statistics.' },
      { h2: `The Core Components of ${kw}`, notes: 'Break down the main elements.' },
      { h2: `How ${kw} Works: Step by Step`, notes: 'Process explanation with visuals.' },
      {
        h2: `${kw} Best Practices`,
        notes: 'Expert-level tips targeting "best practices" keywords.',
      },
      {
        h2: `Common ${kw} Tools and Software`,
        notes: 'Comparison section for tool-related keywords.',
      },
      { h2: `${kw} Metrics and KPIs to Track`, notes: 'Measurable outcomes section.' },
      { h2: `${kw} Case Studies`, notes: 'Social proof and real-world examples.' },
      { h2: `FAQs About ${kw}`, notes: 'Address the most common questions.' },
    ];
  }

  if (contentType === 'Comparison') {
    return [
      { h2: `Overview: What We're Comparing`, notes: 'Set context for the comparison.' },
      { h2: `Key Criteria for Evaluation`, notes: 'Explain what factors matter most.' },
      { h2: `Option A vs Option B: Feature Breakdown`, notes: 'Side-by-side comparison table.' },
      { h2: `Pricing Comparison`, notes: 'Cost breakdown — high commercial intent.' },
      {
        h2: `Use Case Scenarios: Who Should Choose What`,
        notes: 'Audience segmentation for each option.',
      },
      { h2: `Our Recommendation`, notes: 'Clear verdict with CTA.' },
      { h2: `FAQs`, notes: 'Answer top comparison questions.' },
    ];
  }

  // Review
  return [
    { h2: `What Is ${kw}?`, notes: 'Brief product/service overview.' },
    { h2: `Who Is ${kw} For?`, notes: 'Target audience definition.' },
    { h2: `Key Features of ${kw}`, notes: 'Feature list with honest assessment.' },
    { h2: `${kw} Pricing`, notes: 'Pricing tiers — critical for commercial intent.' },
    { h2: `What I Like About ${kw}`, notes: 'Pros list with personal experience.' },
    { h2: `What Could Be Improved`, notes: 'Honest cons — builds trust.' },
    { h2: `${kw} vs Alternatives`, notes: 'Brief competitive comparison.' },
    { h2: `Final Verdict: Is ${kw} Worth It?`, notes: 'Clear recommendation with CTA.' },
  ];
}

function buildSecondaryKeywords(keyword: string): string[] {
  const kw = keyword.trim().toLowerCase();
  return [
    `best ${kw}`,
    `${kw} guide`,
    `how to ${kw}`,
    `${kw} tips`,
    `${kw} ${YEAR}`,
    `${kw} for beginners`,
  ];
}

function generateBrief(keyword: string, contentType: ContentType): IContentBrief {
  const kw = keyword.trim();
  return {
    h1: `${kw}: The Complete ${contentType === 'How-To Guide' ? 'How-To Guide' : contentType} (${YEAR})`,
    wordCount: WORD_COUNTS[contentType],
    primaryKeyword: kw.toLowerCase(),
    secondaryKeywords: buildSecondaryKeywords(kw),
    sections: buildSections(kw, contentType),
  };
}

function briefToMarkdown(brief: IContentBrief): string {
  const lines: string[] = [
    `# CONTENT BRIEF`,
    ``,
    `## H1`,
    brief.h1,
    ``,
    `## Target Word Count`,
    `~${brief.wordCount.toLocaleString()} words`,
    ``,
    `## Keywords`,
    `**Primary:** ${brief.primaryKeyword}`,
    `**Secondary:**`,
    ...brief.secondaryKeywords.map(kw => `- ${kw}`),
    ``,
    `## H2 Sections`,
  ];

  brief.sections.forEach((section, i) => {
    lines.push(``, `### ${i + 1}. ${section.h2}`);
    lines.push(`*Notes: ${section.notes}*`);
  });

  return lines.join('\n');
}

export function ContentBriefGeneratorTool({
  className = '',
}: IContentBriefGeneratorToolProps): JSX.Element {
  const [keyword, setKeyword] = useState('');
  const [contentType, setContentType] = useState<ContentType>('How-To Guide');
  const [brief, setBrief] = useState<IContentBrief | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!keyword.trim()) return;
    setBrief(generateBrief(keyword, contentType));
  };

  const handleCopyBrief = () => {
    if (!brief) return;
    navigator.clipboard.writeText(briefToMarkdown(brief)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className={`bg-surface rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Target Keyword</label>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. automated SEO"
            className="w-full bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Content Type</label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setContentType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  contentType === type
                    ? 'bg-accent border-accent text-white'
                    : 'bg-main border-border text-muted-foreground hover:border-accent/50 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!keyword.trim()}
          className="w-full bg-accent hover:bg-accent/90 disabled:bg-muted disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Generate Content Brief
        </button>

        {brief && (
          <div className="mt-6 bg-main/60 border border-border rounded-xl p-5 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-bold text-white leading-snug">{brief.h1}</h3>
              <button
                onClick={handleCopyBrief}
                className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Brief'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Target Word Count</p>
                <p className="text-white font-semibold">
                  ~{brief.wordCount.toLocaleString()} words
                </p>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Primary Keyword</p>
                <p className="text-white font-semibold truncate">{brief.primaryKeyword}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">
                Secondary Keywords
              </p>
              <div className="flex flex-wrap gap-2">
                {brief.secondaryKeywords.map(kw => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-full text-xs text-accent"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">
                H2 Sections ({brief.sections.length})
              </p>
              <ol className="space-y-3">
                {brief.sections.map((section, i) => (
                  <li key={i} className="border border-border rounded-lg p-3">
                    <p className="text-sm font-semibold text-white">{section.h2}</p>
                    <p className="text-xs text-muted-foreground mt-1">{section.notes}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-center text-muted-foreground mb-3">
          Generate this full article automatically with AutopilotRank
        </p>
        <a
          href="/signup"
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition-colors"
        >
          Start Free Trial
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
