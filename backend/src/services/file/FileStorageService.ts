import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { env } from '@config/environment';
import { logger } from '@utils/logger';

/**
 * File metadata after upload
 */
export interface FileMetadata {
  fileName: string;
  filePath: string;
  fileSize: number;
  fileHash: string;
  uploadedAt: Date;
}

/**
 * File storage service handling file uploads and management.
 * Stores files on local filesystem in organized directory structure.
 */
export class FileStorageService {
  private baseUploadPath: string;
  private modPath: string;
  private screenshotPath: string;
  private avatarPath: string;

  constructor() {
    this.baseUploadPath = env.UPLOAD_PATH || './uploads';
    this.modPath = path.join(this.baseUploadPath, 'mods');
    this.screenshotPath = path.join(this.baseUploadPath, 'screenshots');
    this.avatarPath = path.join(this.baseUploadPath, 'avatars');
  }

  /**
   * Upload a mod file.
   * @param file Express multer file
   * @param modId Mod ID for directory organization
   * @param version Version number for directory organization
   * @returns File metadata
   */
  public async uploadModFile(
    file: Express.Multer.File,
    modId: number,
    version: string
  ): Promise<FileMetadata> {
    try {
      // Validate file
      if (!file.originalname || !file.buffer) {
        throw new Error('Invalid file');
      }

      // Allowed extensions
      const allowedExtensions = ['.package', '.ts4script', '.zip'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        throw new Error(`File type not allowed. Allowed: ${allowedExtensions.join(', ')}`);
      }

      // Check file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('File too large (max 100MB)');
      }

      // Create directory structure
      const modDirectory = path.join(this.modPath, String(modId), version);
      await this.ensureDirectory(modDirectory);

      // Generate safe filename
      const sanitizedName = this.sanitizeFilename(file.originalname);
      const filePath = path.join(modDirectory, sanitizedName);

      // Write file
      await fs.writeFile(filePath, file.buffer);

      // Calculate hash
      const fileHash = await this.calculateHash(filePath);

      logger.info('Mod file uploaded successfully', {
        modId,
        version,
        fileName: sanitizedName,
        fileSize: file.size,
        fileHash,
      });

      return {
        fileName: sanitizedName,
        filePath: path.relative(this.baseUploadPath, filePath),
        fileSize: file.size,
        fileHash,
        uploadedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to upload mod file', {
        modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Upload a screenshot.
   * @param file Express multer file
   * @param modId Mod ID for directory organization
   * @returns File metadata
   */
  public async uploadScreenshot(
    file: Express.Multer.File,
    modId: number
  ): Promise<FileMetadata> {
    try {
      // Validate file
      if (!file.originalname || !file.buffer) {
        throw new Error('Invalid file');
      }

      // Allowed image extensions
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        throw new Error(`Image type not allowed. Allowed: ${allowedExtensions.join(', ')}`);
      }

      // Check file size (10MB max for images)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File too large (max 10MB)');
      }

      // Create directory
      const modScreenshotPath = path.join(this.screenshotPath, String(modId));
      await this.ensureDirectory(modScreenshotPath);

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const extension = path.extname(file.originalname).toLowerCase();
      const fileName = `${timestamp}-${random}${extension}`;
      const filePath = path.join(modScreenshotPath, fileName);

      // Write file
      await fs.writeFile(filePath, file.buffer);

      // Calculate hash
      const fileHash = await this.calculateHash(filePath);

      logger.info('Screenshot uploaded successfully', {
        modId,
        fileName,
        fileSize: file.size,
      });

      return {
        fileName,
        filePath: path.relative(this.baseUploadPath, filePath),
        fileSize: file.size,
        fileHash,
        uploadedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to upload screenshot', {
        modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Upload an avatar.
   * @param file Express multer file
   * @param userId User ID for directory organization
   * @returns File metadata
   */
  public async uploadAvatar(
    file: Express.Multer.File,
    userId: number
  ): Promise<FileMetadata> {
    try {
      // Validate file
      if (!file.originalname || !file.buffer) {
        throw new Error('Invalid file');
      }

      // Allowed image extensions
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        throw new Error(`Image type not allowed. Allowed: ${allowedExtensions.join(', ')}`);
      }

      // Check file size (5MB max for avatars)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large (max 5MB)');
      }

      // Create directory
      const userAvatarPath = path.join(this.avatarPath, String(userId));
      await this.ensureDirectory(userAvatarPath);

      // Generate filename
      const timestamp = Date.now();
      const extension = path.extname(file.originalname).toLowerCase();
      const fileName = `avatar-${timestamp}${extension}`;
      const filePath = path.join(userAvatarPath, fileName);

      // Write file
      await fs.writeFile(filePath, file.buffer);

      // Calculate hash
      const fileHash = await this.calculateHash(filePath);

      logger.info('Avatar uploaded successfully', {
        userId,
        fileName,
      });

      return {
        fileName,
        filePath: path.relative(this.baseUploadPath, filePath),
        fileSize: file.size,
        fileHash,
        uploadedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to upload avatar', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a file.
   * @param filePath Relative file path
   */
  public async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.baseUploadPath, filePath);
      await fs.unlink(fullPath);
      logger.info('File deleted successfully', { filePath });
    } catch (error) {
      logger.error('Failed to delete file', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - file might already be deleted
    }
  }

  /**
   * Calculate SHA-256 hash of a file.
   * @param filePath Absolute file path
   * @returns File hash (hex)
   */
  public async calculateHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      logger.error('Failed to calculate file hash', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Ensure directory exists, create if not.
   * Private helper method.
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directory', {
        dirPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Sanitize filename to prevent directory traversal attacks.
   * Private helper method.
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9._-]/gi, '_') // Replace unsafe characters
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 255); // Limit length
  }
}
