/**
 * Types for the Tools API
 *
 * Defines types for distributing helper tools like the Sims Log Enabler.
 */

/**
 * Metadata for a single file within a tool
 */
export interface ToolFileMetadata {
  /** Filename (e.g., "Scumbumbo_SimsLogEnabler.ts4script") */
  filename: string;
  /** SHA-256 hash of the file for integrity verification */
  hash: string;
  /** File size in bytes */
  fileSize: number;
}

/**
 * Metadata for a tool package (can contain multiple files)
 */
export interface ToolMetadata {
  /** Semantic version of the tool */
  version: string;
  /** Human-readable description of the tool */
  description: string;
  /** List of files included in this tool */
  files: ToolFileMetadata[];
}

/**
 * Collection of all tools with their metadata
 */
export interface ToolsMetadataCollection {
  [toolName: string]: ToolMetadata;
}

/**
 * API response for tool metadata
 */
export interface ToolMetadataResponse {
  success: true;
  data: ToolMetadata;
}

/**
 * Valid tool identifiers
 */
export type ToolId = 'sims-log-enabler';
