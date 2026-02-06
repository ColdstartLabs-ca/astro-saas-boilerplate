/**
 * Bulk processing utilities for handling multiple images in batches
 * Provides progress tracking, error handling, and parallel processing capabilities
 */

import type { IBatchItem } from '@/shared/types/coreflow.types';

export interface IProcessBatchOptions {
  concurrency?: number; // Number of items to process in parallel (default: 3)
  onProgress?: (progress: IBatchProgress) => void; // Progress callback
  onError?: (item: IBatchItem, error: Error) => void; // Error callback per item
  signal?: AbortSignal; // AbortSignal for cancellation
}

export interface IBatchProgress {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  percentage: number;
  currentItemId?: string;
}

export interface IProcessBatchResult<T> {
  successful: Array<{ item: IBatchItem; result: T }>;
  failed: Array<{ item: IBatchItem; error: Error }>;
  cancelled: boolean;
}

export interface IProcessorFunction<T> {
  (item: IBatchItem, signal?: AbortSignal): Promise<T>;
}

/**
 * Process multiple items in a batch with controlled concurrency
 * Tracks progress and handles individual errors gracefully
 *
 * @param items - Array of batch items to process
 * @param processor - Async function that processes a single item
 * @param options - Processing options including concurrency and callbacks
 * @returns Promise with results separated by success/failure
 *
 * @example
 * ```typescript
 * const results = await processImagesInBatch(
 *   batchItems,
 *   async (item) => {
 *     return await upscaleImage(item.file);
 *   },
 *   {
 *     concurrency: 3,
 *     onProgress: (progress) => console.log(`Progress: ${progress.percentage}%`)
 *   }
 * );
 * ```
 */
export async function processImagesInBatch<T>(
  items: IBatchItem[],
  processor: IProcessorFunction<T>,
  options: IProcessBatchOptions = {}
): Promise<IProcessBatchResult<T>> {
  const { concurrency = 3, onProgress, onError, signal } = options;

  // Validate inputs
  if (!items.length) {
    return { successful: [], failed: [], cancelled: false };
  }

  if (concurrency < 1) {
    throw new Error('Concurrency must be at least 1');
  }

  // Check for abort signal
  if (signal?.aborted) {
    return { successful: [], failed: [], cancelled: true };
  }

  const successful: Array<{ item: IBatchItem; result: T }> = [];
  const failed: Array<{ item: IBatchItem; error: Error }> = [];
  let completed = 0;
  let failedCount = 0;
  let currentIndex = 0;

  // Progress tracking
  const updateProgress = (currentItemId?: string): void => {
    const progress: IBatchProgress = {
      total: items.length,
      completed,
      failed: failedCount,
      processing: Math.min(concurrency, items.length - currentIndex),
      percentage: Math.round(((completed + failedCount) / items.length) * 100),
      currentItemId,
    };
    onProgress?.(progress);
  };

  // Process items with controlled concurrency
  const processNext = async (): Promise<void> => {
    // Check if we should stop processing
    if (signal?.aborted) {
      return;
    }

    // Check if all items have been processed
    if (currentIndex >= items.length) {
      return;
    }

    const item = items[currentIndex++];
    updateProgress(item.id);

    try {
      const result = await processor(item, signal);
      successful.push({ item, result });
      completed++;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      failed.push({ item, error: errorObj });
      failedCount++;
      onError?.(item, errorObj);
    }

    // Update progress after completion
    updateProgress();

    // Process next item if available
    if (currentIndex < items.length && !signal?.aborted) {
      await processNext();
    }
  };

  // Start initial batch of concurrent workers
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => processNext());

  // Wait for all workers to complete
  await Promise.all(workers);

  return {
    successful,
    failed,
    cancelled: signal?.aborted ?? false,
  };
}

/**
 * Calculate overall batch status from individual item results
 */
export function calculateBatchStatus(results: IProcessBatchResult<unknown>): {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
} {
  const total = results.successful.length + results.failed.length;
  const successful = results.successful.length;
  const failed = results.failed.length;
  const successRate = total > 0 ? (successful / total) * 100 : 0;

  return {
    total,
    successful,
    failed,
    successRate: Math.round(successRate * 100) / 100,
  };
}

/**
 * Create a retryable processor function that automatically retries on failure
 *
 * @param processor - The original processor function
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @param retryDelay - Delay between retries in ms (default: 1000)
 * @returns A new processor function with retry logic
 */
export function createRetryableProcessor<T>(
  processor: IProcessorFunction<T>,
  maxRetries: number = 2,
  retryDelay: number = 1000
): IProcessorFunction<T> {
  return async (item: IBatchItem, signal?: AbortSignal): Promise<T> => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Check for abort before each attempt
      if (signal?.aborted) {
        throw new Error('Processing was aborted');
      }

      try {
        return await processor(item, signal);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on abort
        if (signal?.aborted) {
          throw lastError;
        }

        // Don't delay after the last attempt
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Processing failed after retries');
  };
}

/**
 * Batch items into smaller chunks for processing
 *
 * @param items - Items to chunk
 * @param chunkSize - Size of each chunk
 * @returns Array of chunks
 */
export function chunkItems<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Create a progress tracker that can be used to monitor batch operations
 */
export function createProgressTracker(totalItems: number): {
  increment: (amount?: number) => void;
  incrementFailed: (amount?: number) => void;
  getProgress: () => IBatchProgress;
  setCurrentItem: (itemId: string) => void;
} {
  let completed = 0;
  let failed = 0;
  let currentItemId: string | undefined;

  return {
    increment: (amount = 1) => {
      completed += amount;
    },
    incrementFailed: (amount = 1) => {
      failed += amount;
    },
    getProgress: () => ({
      total: totalItems,
      completed,
      failed,
      processing: 0,
      percentage: Math.round(((completed + failed) / totalItems) * 100),
      currentItemId,
    }),
    setCurrentItem: (itemId: string) => {
      currentItemId = itemId;
    },
  };
}
