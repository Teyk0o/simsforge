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
import { NotFoundError } from '../../utils/errors';

/**
 * Path to the tools assets directory
 */
const TOOLS_ASSETS_DIR = path.join(__dirname, '../../../assets/tools');

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
   */
  getMetadata(toolId: ToolId): ToolMetadata {
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
   */
  getFileMetadata(toolId: ToolId, filename: string): ToolFileMetadata {
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
   */
  getFilePath(toolId: ToolId, filename: string): string {
    // Verify file exists in metadata
    this.getFileMetadata(toolId, filename);

    // Tool files are stored in a subdirectory named after the tool
    const filePath = path.join(TOOLS_ASSETS_DIR, toolId, filename);

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
      const metadata = this.getMetadata(toolId);
      return metadata.files.every((file) => {
        const filePath = path.join(TOOLS_ASSETS_DIR, toolId, file.filename);
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
