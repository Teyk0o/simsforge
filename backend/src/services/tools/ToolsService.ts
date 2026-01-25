/**
 * Tools Service
 *
 * Provides access to helper tools like the Sims Log Enabler.
 * Handles metadata retrieval and file streaming for downloads.
 */

import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import {
  ToolMetadata,
  ToolsMetadataCollection,
  ToolId,
  ToolFileMetadata,
} from '../../types/tools.types';
import { NotFoundError, BadRequestError } from '../../utils/errors';

/**
 * Path to the tools assets directory (resolved to absolute path)
 */
const TOOLS_ASSETS_DIR = path.resolve(__dirname, '../../../assets/tools');

/**
 * Valid tool identifiers (runtime validation)
 */
const VALID_TOOL_IDS: readonly ToolId[] = ['sims-log-enabler'] as const;

/**
 * Validate that a toolId is in the allowed list
 *
 * @param toolId - The tool identifier to validate
 * @throws BadRequestError if toolId is invalid
 */
function validateToolId(toolId: string): asserts toolId is ToolId {
  if (!VALID_TOOL_IDS.includes(toolId as ToolId)) {
    throw new BadRequestError(`Invalid tool ID: ${toolId}`);
  }
}

/**
 * Validate that a filename is safe (no path traversal)
 *
 * @param filename - The filename to validate
 * @throws BadRequestError if filename contains path traversal attempts
 */
function validateFilename(filename: string): void {
  // Check for path traversal patterns
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0')
  ) {
    throw new BadRequestError('Invalid filename: path traversal not allowed');
  }

  // Check for empty or whitespace-only filenames
  if (!filename || !filename.trim()) {
    throw new BadRequestError('Invalid filename: filename cannot be empty');
  }
}

/**
 * Validate that a resolved path is within the allowed directory
 *
 * @param resolvedPath - The resolved absolute path
 * @param allowedBaseDir - The allowed base directory
 * @throws BadRequestError if path escapes the allowed directory
 */
function validatePathWithinBounds(
  resolvedPath: string,
  allowedBaseDir: string
): void {
  const normalizedResolved = path.normalize(resolvedPath);
  const normalizedBase = path.normalize(allowedBaseDir);

  if (!normalizedResolved.startsWith(normalizedBase + path.sep)) {
    throw new BadRequestError('Invalid path: access denied');
  }
}

/**
 * Path to the tools metadata file
 */
const TOOLS_METADATA_PATH = path.join(TOOLS_ASSETS_DIR, 'tools-metadata.json');

/**
 * Service for managing and serving tool files
 */
export class ToolsService {
  private metadataCache: ToolsMetadataCollection | null = null;

  /**
   * Load and cache the tools metadata from disk
   */
  private loadMetadata(): ToolsMetadataCollection {
    if (this.metadataCache) {
      return this.metadataCache;
    }

    if (!fs.existsSync(TOOLS_METADATA_PATH)) {
      throw new NotFoundError('Tools metadata file not found');
    }

    const metadataContent = fs.readFileSync(TOOLS_METADATA_PATH, 'utf-8');
    this.metadataCache = JSON.parse(metadataContent) as ToolsMetadataCollection;
    return this.metadataCache;
  }

  /**
   * Get metadata for a specific tool
   *
   * @param toolId - The identifier of the tool
   * @returns The tool metadata
   * @throws NotFoundError if tool doesn't exist
   * @throws BadRequestError if toolId is invalid
   */
  getMetadata(toolId: ToolId): ToolMetadata {
    // Validate toolId at runtime to prevent path traversal
    validateToolId(toolId);

    const metadata = this.loadMetadata();

    if (!metadata[toolId]) {
      throw new NotFoundError(`Tool not found: ${toolId}`);
    }

    return metadata[toolId];
  }

  /**
   * Get file metadata for a specific file within a tool
   *
   * @param toolId - The identifier of the tool
   * @param filename - The filename to look up
   * @returns The file metadata
   * @throws NotFoundError if tool or file doesn't exist
   * @throws BadRequestError if filename contains path traversal
   */
  getFileMetadata(toolId: ToolId, filename: string): ToolFileMetadata {
    // Validate filename to prevent path traversal
    validateFilename(filename);

    const metadata = this.getMetadata(toolId);
    const fileMetadata = metadata.files.find((f) => f.filename === filename);

    if (!fileMetadata) {
      throw new NotFoundError(`File not found in tool ${toolId}: ${filename}`);
    }

    return fileMetadata;
  }

  /**
   * Get the file path for a specific file within a tool
   *
   * @param toolId - The identifier of the tool
   * @param filename - The filename to get path for
   * @returns Absolute path to the tool file
   * @throws NotFoundError if tool or file doesn't exist
   * @throws BadRequestError if path traversal is attempted
   */
  getFilePath(toolId: ToolId, filename: string): string {
    // Verify file exists in metadata (also validates toolId and filename)
    this.getFileMetadata(toolId, filename);

    // Tool files are stored in a subdirectory named after the tool
    const filePath = path.resolve(TOOLS_ASSETS_DIR, toolId, filename);

    // Final safety check: ensure resolved path is within allowed directory
    validatePathWithinBounds(filePath, TOOLS_ASSETS_DIR);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`Tool file not found on disk: ${filename}`);
    }

    return filePath;
  }

  /**
   * Get a readable stream for a specific file within a tool
   *
   * @param toolId - The identifier of the tool
   * @param filename - The filename to stream
   * @returns Readable stream of the file contents
   */
  getFileStream(toolId: ToolId, filename: string): Readable {
    const filePath = this.getFilePath(toolId, filename);
    return fs.createReadStream(filePath);
  }

  /**
   * Get all filenames for a tool
   *
   * @param toolId - The identifier of the tool
   * @returns Array of filenames
   */
  getFileList(toolId: ToolId): string[] {
    const metadata = this.getMetadata(toolId);
    return metadata.files.map((f) => f.filename);
  }

  /**
   * Check if a tool exists
   *
   * @param toolId - The identifier of the tool
   * @returns True if the tool exists and all its files are present
   */
  toolExists(toolId: ToolId): boolean {
    try {
      // getMetadata validates toolId
      const metadata = this.getMetadata(toolId);
      return metadata.files.every((file) => {
        // Validate each filename and check path bounds
        validateFilename(file.filename);
        const filePath = path.resolve(TOOLS_ASSETS_DIR, toolId, file.filename);
        validatePathWithinBounds(filePath, TOOLS_ASSETS_DIR);
        return fs.existsSync(filePath);
      });
    } catch {
      return false;
    }
  }

  /**
   * Clear the metadata cache (useful for testing or hot-reload)
   */
  clearCache(): void {
    this.metadataCache = null;
  }
}

// Export singleton instance
export const toolsService = new ToolsService();
