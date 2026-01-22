/**
 * Path Sanitizer Utilities
 *
 * Functions for sanitizing file and folder names for cross-platform compatibility,
 * especially for Windows filesystem restrictions.
 */

/**
 * Maximum length for sanitized folder names.
 * Windows MAX_PATH is 260 chars, so we limit folder names to leave room for the full path.
 */
const MAX_FOLDER_NAME_LENGTH = 100;

/**
 * Characters that are invalid in Windows file/folder names.
 * Includes: \ / : * ? " < > |
 */
const WINDOWS_INVALID_CHARS_REGEX = /[\\/:*?"<>|]/g;

/**
 * Reserved names in Windows (case-insensitive).
 * These cannot be used as file or folder names.
 */
const WINDOWS_RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
];

/**
 * Sanitize a mod name for use as a folder name on Windows.
 *
 * This function:
 * - Replaces Windows-invalid characters with underscores
 * - Replaces multiple consecutive underscores with a single one
 * - Trims leading/trailing underscores and spaces
 * - Limits the length to MAX_FOLDER_NAME_LENGTH
 * - Handles Windows reserved names
 *
 * @param modName - The original mod name from CurseForge or other sources
 * @returns A sanitized string safe for use as a Windows folder name
 *
 * @example
 * sanitizeModName("Mod | Polish Translation") // "Mod_Polish_Translation"
 * sanitizeModName("My/Mod:Name") // "My_Mod_Name"
 * sanitizeModName("A very long mod name...") // Truncated to 100 chars
 */
export function sanitizeModName(modName: string): string {
  if (!modName || modName.trim().length === 0) {
    return 'unnamed_mod';
  }

  let sanitized = modName
    // Replace Windows-invalid characters with underscore
    .replace(WINDOWS_INVALID_CHARS_REGEX, '_')
    // Also replace other problematic characters (control chars, etc.)
    .replace(/[^\w\s.-]/g, '_')
    // Replace multiple spaces or underscores with single underscore
    .replace(/[\s_]+/g, '_')
    // Trim leading/trailing underscores and spaces
    .trim()
    .replace(/^_+|_+$/g, '');

  // Handle empty result after sanitization
  if (sanitized.length === 0) {
    return 'unnamed_mod';
  }

  // Check for Windows reserved names
  const upperSanitized = sanitized.toUpperCase();
  if (WINDOWS_RESERVED_NAMES.includes(upperSanitized)) {
    sanitized = `_${sanitized}`;
  }

  // Truncate to max length, but try to break at underscore
  if (sanitized.length > MAX_FOLDER_NAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_FOLDER_NAME_LENGTH);
    // Try to break at last underscore to avoid cutting words
    const lastUnderscore = sanitized.lastIndexOf('_');
    if (lastUnderscore > MAX_FOLDER_NAME_LENGTH * 0.7) {
      sanitized = sanitized.substring(0, lastUnderscore);
    }
    // Remove trailing underscore if present
    sanitized = sanitized.replace(/_+$/, '');
  }

  return sanitized;
}

/**
 * Check if a string contains characters invalid for Windows paths.
 *
 * @param name - The string to check
 * @returns true if the string contains invalid characters
 */
export function hasInvalidPathChars(name: string): boolean {
  return WINDOWS_INVALID_CHARS_REGEX.test(name);
}
