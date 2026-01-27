/**
 * Vitest global test setup
 */

import '@testing-library/jest-dom/vitest';

// Mock Tauri APIs globally
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  readDir: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  BaseDirectory: { AppData: 'AppData' },
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));
