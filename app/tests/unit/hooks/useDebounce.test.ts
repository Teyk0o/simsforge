/**
 * Unit tests for useDebounce hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    // Update value
    rerender({ value: 'world', delay: 500 });

    // Value should still be old before timeout
    expect(result.current).toBe('hello');

    // Advance time past delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe('world');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    // Rapid updates
    rerender({ value: 'ab', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'abc', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'abcd', delay: 300 });

    // Still showing initial value
    expect(result.current).toBe('a');

    // Advance past delay from last change
    act(() => { vi.advanceTimersByTime(300); });

    // Should show final value
    expect(result.current).toBe('abcd');
  });

  it('should use default delay of 500ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => { vi.advanceTimersByTime(499); });
    expect(result.current).toBe('initial');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('updated');
  });

  it('should work with non-string types', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 42 } }
    );

    rerender({ value: 100 });

    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(100);
  });
});
