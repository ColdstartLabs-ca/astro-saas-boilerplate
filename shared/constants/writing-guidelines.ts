/**
 * Human Writing Guidelines
 *
 * Single source of truth for anti-AI writing patterns.
 * Used by the article generation prompts at runtime and referenced
 * by the humanizer Claude Code skill (.claude/skills/humanizer/SKILL.md).
 *
 * Based on Wikipedia's "Signs of AI writing" guide:
 * https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
 */

/**
 * Words and phrases that are strong signals of AI-generated text.
 * Organized by category for clarity.
 */
export const FORBIDDEN_AI_VOCABULARY = {
  connectors: ['Additionally', 'Moreover', 'Furthermore', 'In addition', 'It is worth noting'],
  inflatedVerbs: [
    'serves as',
    'stands as',
    'marks',
    'represents',
    'boasts',
    'features',
    'showcases',
    'exemplifies',
    'underscores',
    'highlights',
    'emphasizes',
    'garnered',
    'fostering',
    'enhancing',
    'encompassing',
    'ensuring',
    'reflecting',
    'symbolizing',
    'contributing to',
    'delve',
    'interplay',
  ],
  inflatedAdjectives: [
    'crucial',
    'pivotal',
    'key',
    'valuable',
    'vital',
    'significant',
    'intricate',
    'intricacies',
    'groundbreaking',
    'renowned',
    'breathtaking',
    'stunning',
    'must-visit',
    'vibrant',
    'rich',
    'profound',
    'enduring',
    'lasting',
    'indelible',
    'seamless',
  ],
  abstractNouns: ['landscape', 'tapestry', 'testament', 'focal point'],
  promotionalPhrases: [
    'nestled',
    'in the heart of',
    'natural beauty',
    'commitment to',
    'setting the stage for',
    'is a reminder',
    'serves as a testament',
    'contributing to the broader',
    'marking/shaping the',
    'represents a shift',
    'key turning point',
    'evolving landscape',
    'deeply rooted',
  ],
  vagueAttributions: [
    'Industry reports',
    'Observers have cited',
    'Experts argue',
    'Some critics argue',
    'several sources',
    'Experts believe',
  ],
  fillerPhrases: [
    'In order to',
    'Due to the fact that',
    'At this point in time',
    'In the event that',
    'has the ability to',
    'It is important to note that',
    'It is worth mentioning that',
    'based on available information',
  ],
  sycophantic: [
    'Great question!',
    "You're absolutely right!",
    'Of course!',
    'Certainly!',
    "That's an excellent point",
    'I hope this helps',
    'Let me know if',
    'Would you like me to',
  ],
  knowledgeCutoff: [
    'as of my last',
    'Up to my last training',
    'While specific details are limited',
    'While specific details are scarce',
    'based on available information',
  ],
} as const;

/**
 * Structural and stylistic patterns that signal AI-generated text.
 */
export const FORBIDDEN_AI_PATTERNS = [
  'No "-ing" phrases tacked onto end of sentences (highlighting, ensuring, reflecting, etc.)',
  'No "not only...but also" or "it\'s not just...it\'s..." constructions (negative parallelisms)',
  'No rule of three: avoid three adjectives/nouns in a row ("fast, secure, and reliable")',
  'No em dashes (\u2014) \u2014 use commas or periods instead',
  'No emojis in the content',
  'No "Challenges and Future Prospects" style formulaic sections',
  'No vague upbeat endings ("exciting times lie ahead", "the future looks bright")',
  'No promotional language ("in the heart of", "nestled", "breathtaking", "must-visit")',
  'No title case in headings \u2014 use sentence case',
  'No synonym cycling: don\'t call the same thing "protagonist" then "main character" then "central figure" then "hero"',
  "No overuse of boldface: don't mechanically bold every term or concept",
  'No inline-header vertical lists (bullet points starting with **Bold Header:** followed by explanation)',
  'No curly quotation marks (\u201c\u201d) \u2014 use straight quotes ("") only',
  'No "from X to Y" constructions unless X and Y are on a real, meaningful scale',
  'No knowledge-cutoff disclaimers ("as of 2024", "while details are limited")',
  'No excessive hedging ("could potentially possibly be argued that it might")',
  'No generic positive conclusions ("this represents a major step in the right direction")',
] as const;

/**
 * Positive writing guidelines - how to write like a human.
 */
export const HUMAN_WRITING_STYLE = [
  'Use simple verbs: is, are, has, does (not "serves as" or "stands as")',
  'Vary sentence length dramatically: some short, some long, some medium',
  "Start sentences with: But, And, So, Yet, Or (it's natural)",
  'Use specific details, numbers, dates, names instead of vague claims',
  'Include personal opinions and subjective assessments',
  'Add contrarian takes and unexpected insights',
  "Use contractions (it's, don't, won't, you're) freely",
  'Include parenthetical asides (like this) for extra context',
  'Acknowledge uncertainty when appropriate ("it\'s unclear", "seems to suggest")',
  'Write as if talking to a friend, not writing a term paper',
  'Use straight quotes ("") not curly quotes',
  'Replace filler phrases: "In order to" \u2192 "To", "Due to the fact that" \u2192 "Because", "At this point in time" \u2192 "Now"',
  "Keep one term for one thing: don't cycle through synonyms to avoid repetition",
] as const;

/**
 * Guidelines for adding personality and soul to writing.
 */
export const WRITING_PERSONALITY = [
  "Have opinions \u2014 don't just report neutrally",
  '"I genuinely don\'t know how to feel about..." is more human than neutral listing of pros and cons',
  '"Here\'s what gets me..." or "I keep coming back to..." signals real thinking',
  'Acknowledge complexity and mixed feelings openly',
  'Let some mess in: tangents, asides, half-formed thoughts are human',
  'Be specific about feelings: "there\'s something unsettling about" not "this is concerning"',
  'Vary paragraph structure \u2014 not every paragraph should be 2-3 sentences',
  'If you have mixed feelings, say so directly',
] as const;

/**
 * Before/after examples demonstrating good vs bad writing.
 * Each example targets a specific AI pattern.
 */
export const WRITING_EXAMPLES = [
  {
    label: 'Simple verbs vs fancy constructions',
    bad: "The software serves as a testament to the company's commitment to innovation. It features a seamless interface that ensures users can accomplish their goals efficiently.",
    good: 'The software adds batch processing and keyboard shortcuts. Early feedback shows users complete tasks 40% faster.',
  },
  {
    label: 'Avoiding -ing phrases and promotional language',
    bad: 'The tool enhances productivity by streamlining workflows, ensuring teams can collaborate more effectively, and fostering innovation across departments.',
    good: 'The tool lets teams share files instantly. Product jumped from 100 to 5,000 users in six months, mostly through word-of-mouth.',
  },
  {
    label: 'No vague attributions or puffery',
    bad: "Industry experts believe this represents a pivotal moment in the evolving technological landscape, highlighting the company's crucial role in shaping the future.",
    good: "Three competitors copied the feature within a month. Google's product team mentioned it in their February keynote.",
  },
  {
    label: 'Personality and opinions',
    bad: 'The new update offers significant improvements. Users can expect enhanced performance and a more intuitive experience.',
    good: "I'm genuinely impressed by this update. The load times are noticeably faster \u2014 pages that took 3 seconds now load in under one. But the new settings menu? I keep getting lost in there.",
  },
  {
    label: 'Avoiding rule of three and em dashes',
    bad: 'The platform is fast, secure, and reliable\u2014ensuring that your data remains protected at all times.',
    good: 'The platform is fast. Pages load in under a second, and data is encrypted at rest and in transit.',
  },
  {
    label: 'Specific details vs vague claims',
    bad: 'The course covers a wide range of topics, providing students with valuable insights into the subject matter.',
    good: 'The course covers Python fundamentals, Django, and database design. By week 4, students build a working web scraper.',
  },
  {
    label: 'Natural transitions vs AI connectors',
    bad: 'Additionally, the system offers cloud sync. Moreover, it supports offline mode. Furthermore, it integrates with popular tools.',
    good: 'The system syncs to the cloud automatically. It also works offline, and your changes sync when you reconnect. Integrations include Slack, Notion, and Google Workspace.',
  },
  {
    label: 'Synonym cycling (elegant variation)',
    bad: 'The protagonist faces many challenges. The main character must overcome obstacles. The central figure eventually triumphs. The hero returns home.',
    good: 'The protagonist faces many challenges but eventually triumphs and returns home.',
  },
  {
    label: 'No generic upbeat endings',
    bad: 'Exciting times lie ahead as the technology continues to evolve. This represents a major step in the right direction, and the future looks bright.',
    good: 'Version 2.0 launches next month. The team is currently hiring for three engineering roles to speed up development.',
  },
  {
    label: 'No excessive hedging',
    bad: 'It could potentially possibly be argued that the policy might have some effect on outcomes.',
    good: 'The policy may affect outcomes.',
  },
] as const;

/**
 * Build the complete writing guidelines block for use in LLM system prompts.
 * This is the canonical "humanizer" content used by the article generation pipeline.
 */
export function buildWritingGuidelinesPrompt(): string {
  const forbiddenWords = [
    ...FORBIDDEN_AI_VOCABULARY.connectors,
    ...FORBIDDEN_AI_VOCABULARY.inflatedVerbs,
    ...FORBIDDEN_AI_VOCABULARY.inflatedAdjectives,
    ...FORBIDDEN_AI_VOCABULARY.abstractNouns,
  ];

  const forbiddenPhrases = [
    ...FORBIDDEN_AI_VOCABULARY.promotionalPhrases,
    ...FORBIDDEN_AI_VOCABULARY.vagueAttributions,
    ...FORBIDDEN_AI_VOCABULARY.fillerPhrases,
    ...FORBIDDEN_AI_VOCABULARY.sycophantic,
    ...FORBIDDEN_AI_VOCABULARY.knowledgeCutoff,
  ];

  const examples = WRITING_EXAMPLES.map(
    (ex, i) => `EXAMPLE ${i + 1} - ${ex.label}:\nBAD: "${ex.bad}"\nGOOD: "${ex.good}"`
  ).join('\n\n');

  return `CRITICAL: Write naturally like a human, not like AI. Your writing must sound authentic and pass as human-written.

=== AVOID THESE AI PATTERNS ===

**FORBIDDEN WORDS** (never use these):
${forbiddenWords.join(', ')}

**FORBIDDEN PHRASES** (never use these):
${forbiddenPhrases.join(', ')}

**FORBIDDEN PATTERNS:**
${FORBIDDEN_AI_PATTERNS.map(p => `- ${p}`).join('\n')}

**WRITE LIKE THIS INSTEAD:**
${HUMAN_WRITING_STYLE.map(s => `- ${s}`).join('\n')}

**ADD PERSONALITY AND SOUL:**
${WRITING_PERSONALITY.map(p => `- ${p}`).join('\n')}

=== WRITING EXAMPLES (FOLLOW THE "GOOD" STYLE) ===

${examples}`;
}
