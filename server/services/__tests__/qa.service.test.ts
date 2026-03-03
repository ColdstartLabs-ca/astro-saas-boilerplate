/**
 * QA Service Tests
 *
 * Tests for the article QA pipeline including:
 * - Plagiarism checking
 * - Fact consistency validation
 * - Readability scoring (Flesch-Kincaid)
 * - AI likelihood detection
 * - Combined QA scenarios
 */

import { describe, it, expect } from 'vitest';
import type { IArticleOutline } from '@shared/types/article.types';
import { qaService, DEFAULT_QA_CONFIG } from '../qa.service';
import type { IQAConfig } from '../qa.service';

describe('QAService', () => {
  const mockOutline: IArticleOutline = {
    title: 'Understanding Machine Learning Algorithms',
    metaDescription:
      'A comprehensive guide to machine learning algorithms and their applications in modern technology.',
    slug: 'understanding-machine-learning-algorithms',
    sections: [
      {
        heading: 'Introduction to Machine Learning',
        keyPoints: [
          'Machine learning is a subset of artificial intelligence',
          'It enables computers to learn from data',
          'Applications span various industries',
        ],
      },
      {
        heading: 'Types of Machine Learning',
        subheadings: ['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning'],
        keyPoints: [
          'Supervised learning uses labeled data',
          'Unsupervised learning finds patterns in unlabeled data',
          'Reinforcement learning learns through trial and error',
        ],
      },
      {
        heading: 'Common Algorithms',
        keyPoints: [
          'Linear regression for continuous predictions',
          'Decision trees for classification',
          'Neural networks for complex patterns',
        ],
      },
      {
        heading: 'Practical Applications',
        keyPoints: [
          'Image recognition and computer vision',
          'Natural language processing',
          'Recommendation systems',
        ],
      },
    ],
  };

  const mockContent = `# Understanding Machine Learning Algorithms

## Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that enables computers to learn from data. It has become an essential technology in today's world, with applications spanning various industries from healthcare to finance.

The field has grown rapidly in recent years, driven by advances in computing power and the availability of large datasets. Machine learning algorithms can now perform tasks that were once thought to be exclusively human domains.

## Types of Machine Learning

### Supervised Learning

Supervised learning uses labeled data to train models. The algorithm learns from examples where the correct output is known, making it ideal for tasks like classification and regression.

### Unsupervised Learning

Unsupervised learning finds patterns in unlabeled data. It's particularly useful for discovering hidden structures in datasets and reducing dimensionality.

### Reinforcement Learning

Reinforcement learning learns through trial and error. An agent interacts with an environment and receives rewards or penalties based on its actions, gradually improving its strategy.

## Common Algorithms

Linear regression is widely used for making continuous predictions. It models the relationship between input variables and a continuous output variable.

Decision trees are popular for classification tasks. They work by splitting data based on feature values, creating a tree-like structure that leads to predictions.

Neural networks are powerful tools for finding complex patterns. Inspired by the human brain, they consist of interconnected nodes that process information in layers.

## Practical Applications

Machine learning powers image recognition systems that can identify objects in photos with remarkable accuracy. This technology is used in facial recognition, medical imaging, and autonomous vehicles.

Natural language processing enables machines to understand and generate human language. It's the technology behind chatbots, translation services, and sentiment analysis.

Recommendation systems suggest products or content based on user behavior. Streaming services and e-commerce platforms use these algorithms to personalize the user experience.

## Conclusion

Understanding machine learning algorithms is crucial in today's technology-driven world. As these technologies continue to evolve, they will undoubtedly shape the future of how we work and live.`;

  describe('Plagiarism checking', () => {
    it('should pass content with low similarity', () => {
      const originalContent = `# Unique Article Title

This is completely original content that discusses various topics in depth.
The concepts presented here are novel and innovative.`;

      const result = qaService.checkPlagiarism(originalContent);

      expect(result.passed).toBe(true);
      expect(result.similarityScore).toBeLessThan(DEFAULT_QA_CONFIG.maxPlagiarismSimilarity);
    });

    it('should flag content with many common AI phrases', () => {
      const aiHeavyContent = `
In today's world, it is important to note that technology plays a crucial role.
Furthermore, in this day and age, we must consider various factors.
In conclusion, to summarize, the key points are as follows.
It's worth noting that numerous studies have shown significant results.
Additionally, it is essential to understand that multiple factors contribute to outcomes.
In summary, to wrap up, the evidence suggests clear trends.
Last but not least, it is vital to remember that careful analysis is required.
Moreover, in addition to these points, we must consider future implications.
It is important to mention that research continues in this area.
To sum up, the findings demonstrate consistent patterns across studies.`;

      const result = qaService.checkPlagiarism(aiHeavyContent);

      expect(result.similarityScore).toBeGreaterThan(0);
      expect(result.flaggedPhrases.length).toBeGreaterThan(5);
    });

    it('should detect repeated n-grams', () => {
      const repetitiveContent = `
This exact phrase appears multiple times in the text and this exact phrase appears multiple times.
The same concept repeated here and the same concept repeated here again in the text.
Duplicate content detected here and duplicate content detected here once more.
Repetitive wording found above and repetitive wording found above consistently.`;

      const result = qaService.checkPlagiarism(repetitiveContent);

      expect(result.consecutiveMatches).toBeGreaterThan(0);
    });
  });

  describe('Fact consistency checking', () => {
    it('should pass content consistent with outline', () => {
      const result = qaService.checkFactConsistency(mockContent, mockOutline);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(DEFAULT_QA_CONFIG.minFactConsistency);
    });

    it('should flag content missing outline sections', () => {
      const incompleteContent = `# Machine Learning

Introduction content here.

Some general content but missing specific sections.`;

      const result = qaService.checkFactConsistency(incompleteContent, mockOutline);

      expect(result.passed).toBe(false);
      expect(result.flaggedStatements.length).toBeGreaterThan(0);
      expect(result.inconsistencyCount).toBeGreaterThan(0);
    });

    it('should flag content missing key points', () => {
      const lowCoverageContent = `
# Understanding Machine Learning Algorithms

## Introduction to Machine Learning

Basic introduction about machine learning.

## Types of Machine Learning

Brief mention of types.

## Common Algorithms

Some algorithms listed.

## Practical Applications

Applications mentioned.

## Conclusion

Ending section.`;

      const result = qaService.checkFactConsistency(lowCoverageContent, mockOutline);

      expect(result.score).toBeLessThan(1.0);
    });

    it('should require title in content', () => {
      const titleLessContent = `# Wrong Title

Content about machine learning...`;

      const result = qaService.checkFactConsistency(titleLessContent, mockOutline);

      expect(result.flaggedStatements).toContainEqual(expect.stringContaining('Title'));
    });
  });

  describe('Readability checking', () => {
    it('should calculate Flesch-Kincaid grade level', () => {
      const result = qaService.checkReadability(mockContent);

      expect(result.fleschKincaidGrade).toBeGreaterThan(0);
      expect(result.fleschKincaidGrade).toBeLessThan(20);
    });

    it('should calculate Flesch Reading Ease score', () => {
      const result = qaService.checkReadability(mockContent);

      expect(result.fleschReadingEase).toBeGreaterThan(0);
      expect(result.fleschReadingEase).toBeLessThanOrEqual(100);
    });

    it('should count sentences and words correctly', () => {
      const result = qaService.checkReadability(mockContent);

      expect(result.sentenceCount).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(result.sentenceCount);
    });

    it('should calculate average sentence length', () => {
      const result = qaService.checkReadability(mockContent);

      expect(result.avgSentenceLength).toBeGreaterThan(5);
      expect(result.avgSentenceLength).toBeLessThan(50);
    });

    it('should calculate average syllables per word', () => {
      const result = qaService.checkReadability(mockContent);

      expect(result.avgSyllablesPerWord).toBeGreaterThan(0);
      expect(result.avgSyllablesPerWord).toBeLessThan(5);
    });

    it('should pass content meeting readability thresholds', () => {
      const simpleContent = `This is a simple article. It has short sentences. Each sentence is clear. The words are basic. Reading is easy.`;

      const result = qaService.checkReadability(simpleContent);

      expect(result.passed).toBe(true);
    });

    it('should fail overly complex content', () => {
      const complexContent = `# Article

Furthermore, consequently, nevertheless, notwithstanding the aforementioned circumstances.`;

      const strictConfig: Partial<IQAConfig> = {
        maxReadabilityGrade: 5,
        minReadingEase: 80,
      };

      const result = qaService.checkReadability(complexContent);
      const passedWithStrict =
        result.fleschKincaidGrade <= strictConfig.maxReadabilityGrade! &&
        result.fleschReadingEase >= strictConfig.minReadingEase!;

      expect(passedWithStrict).toBe(false);
    });

    it('should handle empty content gracefully', () => {
      const result = qaService.checkReadability('');

      expect(result.passed).toBe(false);
      expect(result.sentenceCount).toBe(0);
      expect(result.wordCount).toBe(0);
    });
  });

  describe('AI likelihood detection', () => {
    it('should detect low AI likelihood in human-like content', async () => {
      const humanContent = `# My Take on Technology

You know what I've noticed? Technology moves fast. Like, really fast.

Just yesterday, I was trying to fix my printer. Again. And I thought - why does this always happen?

Anyway, that's not what I wanted to talk about. I wanted to share some thoughts about where things are heading.

First off, AI. It's everywhere. But is it actually useful? Sometimes I wonder.

Second, privacy. Remember when we didn't have to worry about this stuff? Me neither.

Third, who knows what's next? That's kind of exciting, don't you think?

Look, I don't have all the answers. Just thinking out loud here.`;

      const result = await qaService.checkAILikelihood(humanContent);

      expect(result.passed).toBe(true);
      expect(result.aiScore).toBeLessThan(DEFAULT_QA_CONFIG.maxAILikelihood);
    });

    it('should detect high AI likelihood in formulaic content', async () => {
      const aiContent = `# The Importance of Technology

In today's world, technology plays a crucial role in our daily lives. Furthermore, it has transformed how we work and communicate.

Moreover, it is essential to understand that technological advances continue to shape our future. Additionally, numerous studies have demonstrated the impact of digital innovation.

Furthermore, in this day and age, we must consider the implications of rapid technological change. It is important to note that this evolution affects multiple sectors.

Moreover, in addition to these considerations, it is vital to recognize the role of artificial intelligence. Additionally, machine learning algorithms are becoming increasingly sophisticated.

In conclusion, to summarize, technology will continue to drive progress. Furthermore, it is important to remain aware of these developments. To wrap up, the future is undoubtedly digital.`;

      const result = await qaService.checkAILikelihood(aiContent);

      expect(result.aiScore).toBeGreaterThan(0.3);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
    });

    it('should detect generic transition phrases', async () => {
      const transitionHeavy = `In conclusion, furthermore, moreover, additionally, in addition, what's more, besides, also, and, plus, furthermore.`;

      const result = await qaService.checkAILikelihood(transitionHeavy);

      expect(result.detectedPatterns).toContainEqual(expect.stringContaining('transitions'));
    });

    it('should detect formulaic introduction', async () => {
      const formulaicIntro = `In today's world, technology is important. Various applications exist.

In conclusion, to summarize, technology will continue to evolve.`;

      const result = await qaService.checkAILikelihood(formulaicIntro);

      expect(result.detectedPatterns.some(p => p.toLowerCase().includes('formulaic'))).toBe(true);
    });

    it('should detect repetitive sentence structure', async () => {
      const repetitiveStructure = `
The technology is very important for society.
The system is very useful for people.
The process is very helpful for users.
The method is very effective for teams.
The approach is very valuable for groups.`;

      const result = await qaService.checkAILikelihood(repetitiveStructure);

      expect(result.detectedPatterns).toContainEqual(expect.stringContaining('Repetitive'));
    });

    it('should detect repetitive structure in passive-voice-heavy text', async () => {
      const passiveHeavy = `
The data was collected by the team.
The results were analyzed by the researchers.
The conclusions were drawn by the experts.
The paper was written by the authors.
The findings were presented by the scientists.`;

      const result = await qaService.checkAILikelihood(passiveHeavy);

      expect(result.detectedPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Combined QA pipeline', () => {
    it('should run all QA checks and return results', async () => {
      const highQualityContent = `# Understanding Machine Learning Algorithms

Machine learning is transforming how we approach complex problems.

## Introduction to Machine Learning

Machine learning enables computers to learn from data. The field has grown rapidly with advances in computing power.

## Types of Machine Learning

Supervised learning uses labeled data. Unsupervised learning finds patterns in unlabeled data. Reinforcement learning learns through trial and error.

## Common Algorithms

Linear regression is used for predictions. Decision trees work for classification. Neural networks find complex patterns.

## Conclusion

Understanding machine learning is crucial for technology professionals.`;

      const result = await qaService.runQAChecks(highQualityContent, mockOutline);

      // Verify all checks were run
      expect(result.results.plagiarism).toBeDefined();
      expect(result.results.factConsistency).toBeDefined();
      expect(result.results.readability).toBeDefined();
      expect(result.results.aiLikelihood).toBeDefined();
      expect(result.checkedAt).toBeDefined();
    });

    it('should fail content not meeting quality thresholds', async () => {
      const lowQualityContent = `In today's world, it is important to note that many factors affect outcomes.

Furthermore, in this day and age, technology plays a crucial role.

Additionally, numerous studies demonstrate significant results.

Moreover, in conclusion, to summarize, the evidence is clear.`;

      const result = await qaService.runQAChecks(lowQualityContent, mockOutline);

      expect(result.passed).toBe(false);
      expect(result.failureReason).toBeDefined();
    });

    it('should use custom QA config when provided', async () => {
      const lenientConfig: Partial<IQAConfig> = {
        maxPlagiarismSimilarity: 0.5,
        minFactConsistency: 0.3,
        maxReadabilityGrade: 16,
        minReadingEase: 10,
        maxAILikelihood: 0.95,
      };

      const lowQualityContent = `In today's world, technology is important.

Furthermore, many applications exist.

In conclusion, the future is digital.`;

      const result = await qaService.runQAChecks(lowQualityContent, mockOutline, lenientConfig);

      // With lenient config, even low quality content might pass
      expect(result.results).toBeDefined();
    });

    it('should include timestamp in results', async () => {
      const result = await qaService.runQAChecks(mockContent, mockOutline);

      expect(result.checkedAt).toBeDefined();
      expect(new Date(result.checkedAt)).toBeInstanceOf(Date);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty content gracefully', async () => {
      const result = await qaService.runQAChecks('', mockOutline);

      expect(result.passed).toBe(false);
    });

    it('should handle markdown syntax correctly', async () => {
      const markdownContent = `# **Bold Title**

This has *italic* text and \`code\` snippets.

[Links](https://example.com) and ![images](image.jpg) are here.

## Subheading

More content with **bold** and *italic*.`;

      const result = await qaService.runQAChecks(markdownContent, mockOutline);

      expect(result.results.readability.wordCount).toBeGreaterThan(0);
      expect(result.results.plagiarism).toBeDefined();
    });

    it('should handle image markers', async () => {
      const contentWithMarkers = `# Title

[IMAGE:1]

Content here.

[IMAGE:2]

More content.`;

      const result = await qaService.runQAChecks(contentWithMarkers, mockOutline);

      expect(result.results.readability.wordCount).toBeDefined();
    });
  });
});
