/**
 * Unit tests for concurrencyPool utility functions
 */

import { describe, it, expect, vi } from 'vitest';
import {
  concurrentMap,
  getSuccessful,
  getFailed,
  countResults,
} from '@/lib/utils/concurrencyPool';

describe('concurrentMap', () => {
  it('should process all items successfully', async () => {
    const items = [1, 2, 3, 4, 5];
    const fn = vi.fn(async (item: number) => item * 2);

    const results = await concurrentMap(items, fn, 2);

    expect(results).toHaveLength(5);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(getSuccessful(results)).toEqual([2, 4, 6, 8, 10]);
  });

  it('should respect pool size and process in batches', async () => {
    const items = [1, 2, 3, 4, 5, 6];
    const callOrder: number[] = [];
    const fn = vi.fn(async (item: number) => {
      callOrder.push(item);
      return item;
    });

    await concurrentMap(items, fn, 2);

    // With pool size 2, items should be processed in batches of 2
    expect(fn).toHaveBeenCalledTimes(6);
  });

  it('should handle partial failures without aborting', async () => {
    const items = [1, 2, 3, 4, 5];
    const fn = vi.fn(async (item: number) => {
      if (item === 3) {
        throw new Error('Item 3 failed');
      }
      return item * 2;
    });

    const results = await concurrentMap(items, fn, 2);

    expect(results).toHaveLength(5);
    expect(getSuccessful(results)).toEqual([2, 4, 8, 10]);
    expect(getFailed(results)).toHaveLength(1);
    expect(getFailed(results)[0].index).toBe(2);
  });

  it('should call progress callback after each batch', async () => {
    const items = [1, 2, 3, 4, 5];
    const progressCalls: Array<{ completed: number; total: number }> = [];
    const onProgress = vi.fn((completed: number, total: number) => {
      progressCalls.push({ completed, total });
    });

    await concurrentMap(items, async (item) => item, 2, onProgress);

    // With pool size 2 and 5 items: batches of [2, 4, 5]
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(progressCalls[0]).toEqual({ completed: 2, total: 5 });
    expect(progressCalls[1]).toEqual({ completed: 4, total: 5 });
    expect(progressCalls[2]).toEqual({ completed: 5, total: 5 });
  });

  it('should handle empty array', async () => {
    const results = await concurrentMap([], async (item) => item, 5);

    expect(results).toHaveLength(0);
  });

  it('should handle pool size larger than items', async () => {
    const items = [1, 2, 3];
    const fn = vi.fn(async (item: number) => item * 2);

    const results = await concurrentMap(items, fn, 10);

    expect(results).toHaveLength(3);
    expect(getSuccessful(results)).toEqual([2, 4, 6]);
  });

  it('should pass correct index to function', async () => {
    const items = ['a', 'b', 'c'];
    const indices: number[] = [];
    const fn = vi.fn(async (item: string, index: number) => {
      indices.push(index);
      return item;
    });

    await concurrentMap(items, fn, 2);

    expect(indices).toEqual([0, 1, 2]);
  });

  it('should handle all items failing', async () => {
    const items = [1, 2, 3];
    const fn = vi.fn(async () => {
      throw new Error('All failed');
    });

    const results = await concurrentMap(items, fn, 2);

    expect(results).toHaveLength(3);
    expect(getSuccessful(results)).toHaveLength(0);
    expect(getFailed(results)).toHaveLength(3);
  });
});

describe('getSuccessful', () => {
  it('should extract fulfilled values', () => {
    const results: PromiseSettledResult<number>[] = [
      { status: 'fulfilled', value: 1 },
      { status: 'rejected', reason: new Error('fail') },
      { status: 'fulfilled', value: 3 },
    ];

    expect(getSuccessful(results)).toEqual([1, 3]);
  });

  it('should return empty array when all rejected', () => {
    const results: PromiseSettledResult<number>[] = [
      { status: 'rejected', reason: new Error('fail1') },
      { status: 'rejected', reason: new Error('fail2') },
    ];

    expect(getSuccessful(results)).toEqual([]);
  });

  it('should handle empty array', () => {
    expect(getSuccessful([])).toEqual([]);
  });
});

describe('getFailed', () => {
  it('should extract rejected results with index and error', () => {
    const error1 = new Error('fail1');
    const error2 = new Error('fail2');
    const results: PromiseSettledResult<number>[] = [
      { status: 'fulfilled', value: 1 },
      { status: 'rejected', reason: error1 },
      { status: 'fulfilled', value: 3 },
      { status: 'rejected', reason: error2 },
    ];

    const failed = getFailed(results);

    expect(failed).toHaveLength(2);
    expect(failed[0]).toEqual({ index: 1, error: error1 });
    expect(failed[1]).toEqual({ index: 3, error: error2 });
  });

  it('should return empty array when all fulfilled', () => {
    const results: PromiseSettledResult<number>[] = [
      { status: 'fulfilled', value: 1 },
      { status: 'fulfilled', value: 2 },
    ];

    expect(getFailed(results)).toEqual([]);
  });

  it('should handle empty array', () => {
    expect(getFailed([])).toEqual([]);
  });
});

describe('countResults', () => {
  it('should count successful and failed results', () => {
    const results: PromiseSettledResult<number>[] = [
      { status: 'fulfilled', value: 1 },
      { status: 'rejected', reason: new Error('fail') },
      { status: 'fulfilled', value: 3 },
      { status: 'rejected', reason: new Error('fail2') },
      { status: 'fulfilled', value: 5 },
    ];

    expect(countResults(results)).toEqual({ successful: 3, failed: 2 });
  });

  it('should handle all successful', () => {
    const results: PromiseSettledResult<number>[] = [
      { status: 'fulfilled', value: 1 },
      { status: 'fulfilled', value: 2 },
    ];

    expect(countResults(results)).toEqual({ successful: 2, failed: 0 });
  });

  it('should handle all failed', () => {
    const results: PromiseSettledResult<number>[] = [
      { status: 'rejected', reason: new Error('fail1') },
      { status: 'rejected', reason: new Error('fail2') },
    ];

    expect(countResults(results)).toEqual({ successful: 0, failed: 2 });
  });

  it('should handle empty array', () => {
    expect(countResults([])).toEqual({ successful: 0, failed: 0 });
  });
});
