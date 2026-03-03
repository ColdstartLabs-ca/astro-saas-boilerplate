/**
 * AI Detection Service
 *
 * Provides AI detection analysis using heuristic and external providers.
 * Heuristic analysis is free and uses pattern-based detection.
 * External providers (Originality.ai) offer higher accuracy for a credit cost.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { qaService } from './qa.service';
import { serverEnv } from '@shared/config/env';
import type { IAIDetectionDetails } from '@shared/types/article.types';

// =============================================================================
// Types
// =============================================================================

export interface IAIDetectionResult {
  score: number; // 0-100, higher = more human-like
  details: IAIDetectionDetails;
}

export type AIProvider = 'heuristic' | 'originality';

// =============================================================================
// AI Detection Service
// =============================================================================

class AIDetectionService {
  /**
   * Analyze content using heuristic pattern detection.
   * This is free and runs locally without external API calls.
   */
  async analyzeHeuristic(articleId: string, content: string): Promise<IAIDetectionResult> {
    // Run heuristic check via QA service
    const qaResult = await qaService.checkAILikelihood(content);

    // Convert QA aiScore (0-1, higher = more AI) to display score (0-100, higher = more human)
    const score = Math.round((1 - qaResult.aiScore) * 100);

    const details: IAIDetectionDetails = {
      provider: 'heuristic',
      confidence: qaResult.confidence,
      detectedPatterns: qaResult.detectedPatterns,
      analyzedAt: new Date().toISOString(),
      rawScore: qaResult.aiScore,
    };

    // Update article in database
    const { error: updateError } = await supabaseAdmin
      .from('articles')
      .update({
        ai_detection_score: score,
        ai_detection_details: details,
        ai_detection_provider: 'heuristic',
      })
      .eq('id', articleId);

    if (updateError) {
      console.error('[AIDetection] Failed to persist heuristic score to DB:', updateError);
    }

    return { score, details };
  }

  /**
   * Analyze content using Originality.ai external API.
   * This costs 1 credit per scan.
   */
  async analyzeWithOriginality(
    articleId: string,
    content: string,
    userId: string
  ): Promise<IAIDetectionResult> {
    const apiKey = serverEnv.ORIGINALITY_AI_API_KEY;

    if (!apiKey) {
      throw new Error('SERVICE_UNAVAILABLE: Originality.ai API key not configured');
    }

    // Check and deduct credits (1 credit per scan)
    const creditCheck = await this.checkAndDeductCredits(userId, 1);
    if (!creditCheck.success) {
      throw new Error('INSUFFICIENT_CREDITS: Not enough credits for external AI detection');
    }

    try {
      // Call Originality.ai API
      const response = await fetch('https://api.originality.ai/api/v1/scan/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OAI-API-KEY': apiKey,
        },
        body: JSON.stringify({
          content: content.substring(0, 50000), // Originality.ai has a character limit
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AIDetection] Originality.ai API error:', response.status, errorText);
        throw new Error(`Originality.ai API error: ${response.status}`);
      }

      const data = await response.json();

      // Map Originality.ai response to our format
      // Originality.ai returns score as 0-100 where higher = more AI
      // We invert to match our convention (higher = more human)
      const originalityScore = data?.score ?? data?.ai_score ?? 0;
      const score = Math.round(100 - originalityScore);

      // Extract detected patterns from Originality.ai response
      const detectedPatterns: string[] = [];
      if (data?.sentences && Array.isArray(data.sentences)) {
        // Get sentences with high AI probability
        const aiSentences = data.sentences
          .filter((s: { probability?: number }) => (s.probability ?? 0) > 0.7)
          .slice(0, 5); // Limit to top 5
        if (aiSentences.length > 0) {
          detectedPatterns.push(`${aiSentences.length} sentences with high AI probability`);
        }
      }

      const details: IAIDetectionDetails = {
        provider: 'originality',
        confidence: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
        detectedPatterns,
        analyzedAt: new Date().toISOString(),
        rawScore: originalityScore,
      };

      // Update article in database
      const { error: updateError } = await supabaseAdmin
        .from('articles')
        .update({
          ai_detection_score: score,
          ai_detection_details: details,
          ai_detection_provider: 'originality',
        })
        .eq('id', articleId);

      if (updateError) {
        console.error('[AIDetection] Failed to persist originality score to DB:', updateError);
      }

      return { score, details };
    } catch (error) {
      // Refund credits on failure
      await this.refundCredits(userId, 1);
      throw error;
    }
  }

  /**
   * Check if user has enough credits and deduct them atomically via FIFO RPC.
   * Returns { success: true } if credits were deducted, { success: false } otherwise.
   * consume_credits_v2 raises a Postgres exception when balance is insufficient,
   * so any error here means the deduction did not happen.
   */
  private async checkAndDeductCredits(
    userId: string,
    amount: number
  ): Promise<{ success: boolean }> {
    const { error } = await supabaseAdmin.rpc('consume_credits_v2', {
      target_user_id: userId,
      amount,
      ref_id: null,
      description: 'AI detection scan (Originality.ai)',
    });

    if (error) {
      console.error('[AIDetection] Error deducting credits:', error);
      return { success: false };
    }

    return { success: true };
  }

  /**
   * Refund credits to user (used when external API call fails).
   */
  private async refundCredits(userId: string, amount: number): Promise<void> {
    try {
      await supabaseAdmin.rpc('add_purchased_credits', {
        target_user_id: userId,
        amount,
        ref_id: null,
        description: 'Refund: AI detection scan failed',
      });
    } catch (error) {
      console.error('[AIDetection] Error refunding credits:', error);
    }
  }
}

// Export singleton instance
export const aiDetectionService = new AIDetectionService();
