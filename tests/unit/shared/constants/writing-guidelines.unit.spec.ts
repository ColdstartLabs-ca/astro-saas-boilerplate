import { describe, it, expect } from 'vitest';
import {
  buildWritingGuidelinesPrompt,
  FORBIDDEN_AI_VOCABULARY,
  FORBIDDEN_AI_PATTERNS,
  HUMAN_WRITING_STYLE,
  WRITING_PERSONALITY,
  WRITING_EXAMPLES,
} from '@shared/constants/writing-guidelines';

describe('writing-guidelines', () => {
  describe('buildWritingGuidelinesPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = buildWritingGuidelinesPrompt();
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
    });

    it('should include forbidden AI vocabulary words', () => {
      const prompt = buildWritingGuidelinesPrompt();
      expect(prompt).toContain('Additionally');
      expect(prompt).toContain('serves as');
      expect(prompt).toContain('crucial');
      expect(prompt).toContain('tapestry');
    });

    it('should include forbidden phrases', () => {
      const prompt = buildWritingGuidelinesPrompt();
      expect(prompt).toContain('nestled');
      expect(prompt).toContain('Experts argue');
      expect(prompt).toContain('In order to');
    });

    it('should include forbidden patterns', () => {
      const prompt = buildWritingGuidelinesPrompt();
      expect(prompt).toContain('negative parallelisms');
      expect(prompt).toContain('rule of three');
      expect(prompt).toContain('synonym cycling');
      expect(prompt).toContain('curly quotation marks');
    });

    it('should include human writing style guidelines', () => {
      const prompt = buildWritingGuidelinesPrompt();
      expect(prompt).toContain('simple verbs');
      expect(prompt).toContain('contractions');
      expect(prompt).toContain('straight quotes');
    });

    it('should include personality guidelines', () => {
      const prompt = buildWritingGuidelinesPrompt();
      expect(prompt).toContain('Have opinions');
      expect(prompt).toContain('mixed feelings');
    });

    it('should include all writing examples', () => {
      const prompt = buildWritingGuidelinesPrompt();
      for (const example of WRITING_EXAMPLES) {
        expect(prompt).toContain(example.label);
        expect(prompt).toContain(example.bad);
        expect(prompt).toContain(example.good);
      }
    });

    it('should include the critical instruction header', () => {
      const prompt = buildWritingGuidelinesPrompt();
      expect(prompt).toContain('CRITICAL: Write naturally like a human');
    });
  });

  describe('constants completeness', () => {
    it('should have vocabulary categories covering all major AI patterns', () => {
      expect(FORBIDDEN_AI_VOCABULARY.connectors.length).toBeGreaterThan(0);
      expect(FORBIDDEN_AI_VOCABULARY.inflatedVerbs.length).toBeGreaterThan(0);
      expect(FORBIDDEN_AI_VOCABULARY.inflatedAdjectives.length).toBeGreaterThan(0);
      expect(FORBIDDEN_AI_VOCABULARY.abstractNouns.length).toBeGreaterThan(0);
      expect(FORBIDDEN_AI_VOCABULARY.promotionalPhrases.length).toBeGreaterThan(0);
      expect(FORBIDDEN_AI_VOCABULARY.vagueAttributions.length).toBeGreaterThan(0);
      expect(FORBIDDEN_AI_VOCABULARY.fillerPhrases.length).toBeGreaterThan(0);
      expect(FORBIDDEN_AI_VOCABULARY.sycophantic.length).toBeGreaterThan(0);
      expect(FORBIDDEN_AI_VOCABULARY.knowledgeCutoff.length).toBeGreaterThan(0);
    });

    it('should have at least 10 forbidden patterns', () => {
      expect(FORBIDDEN_AI_PATTERNS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have at least 10 human writing style tips', () => {
      expect(HUMAN_WRITING_STYLE.length).toBeGreaterThanOrEqual(10);
    });

    it('should have at least 5 personality guidelines', () => {
      expect(WRITING_PERSONALITY.length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 10 writing examples', () => {
      expect(WRITING_EXAMPLES.length).toBeGreaterThanOrEqual(10);
    });
  });
});
