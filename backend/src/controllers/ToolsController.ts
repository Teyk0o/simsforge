/**
 * Tools Controller
 *
 * Handles HTTP requests for tool downloads and metadata.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { toolsService } from '@services/tools/ToolsService';
import { ToolId, ToolMetadataResponse } from '../types/tools.types';

/**
 * Validation schema for tool ID parameter
 */
const toolIdSchema = z.enum(['sims-log-enabler']);

/**
 * Controller for tool-related endpoints
 */
export class ToolsController {
  /**
   * GET /api/v1/tools/:toolId/metadata
   * Get metadata for a specific tool (includes all files)
   */
  async getMetadata(req: Request, res: Response): Promise<void> {
    const toolId = toolIdSchema.parse(req.params.toolId) as ToolId;
    const metadata = toolsService.getMetadata(toolId);

    const response: ToolMetadataResponse = {
      success: true,
      data: metadata,
    };

    res.json(response);
  }

  /**
   * GET /api/v1/tools/:toolId/download/:filename
   * Download a specific file from a tool
   */
  async downloadFile(req: Request, res: Response): Promise<void> {
    const toolId = toolIdSchema.parse(req.params.toolId) as ToolId;
    const filename = req.params.filename as string;

    const fileMetadata = toolsService.getFileMetadata(toolId, filename);
    const fileStream = toolsService.getFileStream(toolId, filename);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileMetadata.filename}"`
    );
    res.setHeader('X-File-Hash', fileMetadata.hash);
    res.setHeader('Content-Length', fileMetadata.fileSize);

    // Stream the file to the response
    fileStream.pipe(res);
  }

  /**
   * GET /api/v1/tools/:toolId/files
   * List all files available for a tool
   */
  async listFiles(req: Request, res: Response): Promise<void> {
    const toolId = toolIdSchema.parse(req.params.toolId) as ToolId;
    const files = toolsService.getFileList(toolId);

    res.json({
      success: true,
      data: { files },
    });
  }
}

// Export singleton instance
export const toolsController = new ToolsController();
