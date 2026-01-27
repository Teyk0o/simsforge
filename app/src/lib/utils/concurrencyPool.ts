/**
 * Concurrency Pool Utility
 *
 * Generic utility for executing async operations in parallel with a concurrency limit.
 * Uses Promise.allSettled for error resilience - individual failures don't abort the batch.
 */

/**
 * Execute async operations in parallel with concurrency limit.
 *
 * @param items - Array of items to process
 * @param fn - Async function to execute for each item
 * @param poolSize - Maximum concurrent operations
 * @param onProgress - Optional callback for progress updates
 * @returns Array of PromiseSettledResult for each item
 *
 * @example
 * ```ts
 * const results = await concurrentMap(
 *   files,
 *   async (file) => await processFile(file),
 *   5,
 *   (completed, total) => console.log(`${completed}/${total}`)
 * );
 * ```
 */
export async function concurrentMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  poolSize: number,
  onProgress?: (completed: number, total: number) => void
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  let completed = 0;

  // Process in batches of poolSize
  for (let i = 0; i < items.length; i += poolSize) {
    const batch = items.slice(i, i + poolSize);
    const batchResults = await Promise.allSettled(
      batch.map((item, idx) => fn(item, i + idx))
    );
    results.push(...batchResults);
    completed += batch.length;
    onProgress?.(completed, items.length);
  }

  return results;
}

/**
 * Extract successful results from settled promises.
 *
 * @param results - Array of PromiseSettledResult
 * @returns Array of fulfilled values
 *
 * @example
 * ```ts
 * const results = await concurrentMap(items, processItem, 5);
 * const successful = getSuccessful(results);
 * console.log(`${successful.length} items processed successfully`);
 * ```
 */
export function getSuccessful<T>(results: PromiseSettledResult<T>[]): T[] {
  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Extract failed results with error information and original index.
 *
 * @param results - Array of PromiseSettledResult
 * @returns Array of objects with index and error reason
 *
 * @example
 * ```ts
 * const results = await concurrentMap(items, processItem, 5);
 * const failed = getFailed(results);
 * failed.forEach(({ index, error }) => {
 *   console.error(`Item ${index} failed: ${error}`);
 * });
 * ```
 */
export function getFailed<T>(
  results: PromiseSettledResult<T>[]
): { index: number; error: unknown }[] {
  return results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ result, index }) => ({
      index,
      error: (result as PromiseRejectedResult).reason,
    }));
}

/**
 * Count successful and failed results.
 *
 * @param results - Array of PromiseSettledResult
 * @returns Object with successful and failed counts
 */
export function countResults<T>(
  results: PromiseSettledResult<T>[]
): { successful: number; failed: number } {
  let successful = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful++;
    } else {
      failed++;
    }
  }

  return { successful, failed };
}
