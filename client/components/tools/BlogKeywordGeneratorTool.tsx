import { useState } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';

interface IBlogKeywordGeneratorToolProps {
  className?: string;
}

interface IKeywordGroup {
  category: string;
  keywords: string[];
}

const QUESTION_WORDS = ['what is', 'how to', 'how does', 'why use', 'when to use', 'can you use'];
const INFORMATIONAL_SUFFIXES = [
  'guide',
  'tutorial',
  'examples',
  'tips',
  'best practices',
  'checklist',
];
const COMMERCIAL_PREFIXES = ['best', 'top', 'free', 'affordable', 'professional'];
const COMMERCIAL_SUFFIXES = ['software', 'tools', 'services', 'platform', 'agency'];
const LONG_TAIL_SUFFIXES = [
  'for small business',
  'for beginners',
  'for agencies',
  `tools ${new Date().getFullYear()}`,
  'step by step',
  'that works',
];

function generateKeywords(seed: string): IKeywordGroup[] {
  const s = seed.trim().toLowerCase();
  if (!s) return [];

  const questions = QUESTION_WORDS.map(q => `${q} ${s}`);
  const informational = INFORMATIONAL_SUFFIXES.map(sfx => `${s} ${sfx}`);
  const commercial = [
    ...COMMERCIAL_PREFIXES.map(pfx => `${pfx} ${s}`),
    ...COMMERCIAL_SUFFIXES.map(sfx => `${s} ${sfx}`),
  ];
  const longTail = LONG_TAIL_SUFFIXES.map(sfx => `${s} ${sfx}`);

  return [
    { category: 'Question Keywords', keywords: questions },
    { category: 'Informational', keywords: informational },
    { category: 'Commercial', keywords: commercial },
    { category: 'Long-Tail', keywords: longTail },
  ];
}

export function BlogKeywordGeneratorTool({
  className = '',
}: IBlogKeywordGeneratorToolProps): JSX.Element {
  const [seed, setSeed] = useState('');
  const [groups, setGroups] = useState<IKeywordGroup[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!seed.trim()) return;
    setGroups(generateKeywords(seed));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(key);
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  };

  const handleCopyAll = () => {
    const allKeywords = groups.flatMap(g => g.keywords).join('\n');
    handleCopy(allKeywords, 'all');
  };

  const totalKeywords = groups.reduce((sum, g) => sum + g.keywords.length, 0);

  return (
    <div className={`bg-surface rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Seed Topic or Keyword</label>
          <input
            type="text"
            value={seed}
            onChange={e => setSeed(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. automated SEO"
            className="w-full bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!seed.trim()}
          className="w-full bg-accent hover:bg-accent/90 disabled:bg-muted disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Generate Keywords
        </button>

        {groups.length > 0 && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Generated <span className="text-white font-semibold">{totalKeywords}</span> keyword
                ideas for &ldquo;{seed}&rdquo;
              </p>
              <button
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              >
                {copiedIndex === 'all' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedIndex === 'all' ? 'Copied!' : 'Copy All'}
              </button>
            </div>

            {groups.map(group => (
              <div key={group.category}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-3">
                  {group.category}
                </h3>
                <ul className="space-y-2">
                  {group.keywords.map(kw => (
                    <li
                      key={kw}
                      className="flex items-center justify-between gap-3 bg-main/60 border border-border rounded-lg px-4 py-2.5"
                    >
                      <span className="text-sm text-white">{kw}</span>
                      <button
                        onClick={() => handleCopy(kw, kw)}
                        className="flex-shrink-0 text-muted-foreground hover:text-accent transition-colors"
                        aria-label={`Copy ${kw}`}
                      >
                        {copiedIndex === kw ? (
                          <Check className="w-4 h-4 text-accent" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-center text-muted-foreground mb-3">
          Turn these keywords into published articles automatically
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
