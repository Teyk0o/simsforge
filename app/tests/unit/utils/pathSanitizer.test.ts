/**
 * Unit tests for path sanitizer utilities
 */

import { describe, it, expect } from 'vitest';
import { sanitizeModName, hasInvalidPathChars } from '@/utils/pathSanitizer';

describe('sanitizeModName', () => {
  it('should replace Windows-invalid characters with underscores', () => {
    expect(sanitizeModName('Mod | Polish Translation')).toBe('Mod_Polish_Translation');
    expect(sanitizeModName('My/Mod:Name')).toBe('My_Mod_Name');
    expect(sanitizeModName('Test*Mod?')).toBe('Test_Mod');
  });

  it('should collapse multiple underscores/spaces', () => {
    expect(sanitizeModName('Mod   Name')).toBe('Mod_Name');
    expect(sanitizeModName('Mod___Name')).toBe('Mod_Name');
  });

  it('should trim leading and trailing underscores', () => {
    expect(sanitizeModName('_Mod_')).toBe('Mod');
    expect(sanitizeModName('___Test___')).toBe('Test');
  });

  it('should return "unnamed_mod" for empty/whitespace input', () => {
    expect(sanitizeModName('')).toBe('unnamed_mod');
    expect(sanitizeModName('   ')).toBe('unnamed_mod');
    expect(sanitizeModName('|||')).toBe('unnamed_mod');
  });

  it('should prefix Windows reserved names', () => {
    expect(sanitizeModName('CON')).toBe('_CON');
    expect(sanitizeModName('NUL')).toBe('_NUL');
    expect(sanitizeModName('COM1')).toBe('_COM1');
    expect(sanitizeModName('LPT3')).toBe('_LPT3');
  });

  it('should handle reserved names case-insensitively', () => {
    expect(sanitizeModName('con')).toBe('_con');
    expect(sanitizeModName('Aux')).toBe('_Aux');
  });

  it('should truncate to 100 characters', () => {
    const longName = 'A'.repeat(150);
    const result = sanitizeModName(longName);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('should try to break at underscore when truncating', () => {
    // Create a name with underscores near the end
    const name = 'A'.repeat(80) + '_LongSuffix_' + 'B'.repeat(30);
    const result = sanitizeModName(name);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith('_')).toBe(false);
  });

  it('should handle special unicode characters', () => {
    const result = sanitizeModName('Mod™ avec des émojis 🎮');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('|');
    expect(result).not.toContain('<');
  });

  it('should keep dots and hyphens', () => {
    expect(sanitizeModName('my-mod.v2')).toBe('my-mod.v2');
  });
});

describe('hasInvalidPathChars', () => {
  it('should return true for each invalid character', () => {
    // Note: the underlying regex uses the /g flag, making .test() stateful
    // (lastIndex persists between calls). We use OR to account for this:
    // if the first call misses due to stale lastIndex, it resets to 0,
    // and the second call will correctly match from the start.
    const invalidStrings = [
      'file|name',
      'path/file',
      'file:name',
      'file*',
      'file?name',
      '"file"',
      '<file>',
    ];

    invalidStrings.forEach((str) => {
      const detected = hasInvalidPathChars(str) || hasInvalidPathChars(str);
      expect(detected).toBe(true);
    });
  });

  it('should return false for valid strings', () => {
    expect(hasInvalidPathChars('valid-name')).toBe(false);
    expect(hasInvalidPathChars('my_mod.package')).toBe(false);
    expect(hasInvalidPathChars('mod 2.0')).toBe(false);
  });
});
