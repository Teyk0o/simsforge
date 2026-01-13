import crypto from 'crypto';
import { env } from '@config/environment';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits

/**
 * Encrypted data structure containing cipher text, IV, and authentication tag
 */
export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Service for encrypting and decrypting sensitive data using AES-256-GCM.
 * AES-256-GCM provides both confidentiality and authenticity.
 *
 * @example
 * const encrypted = encryptionService.encrypt('my-api-key');
 * const decrypted = encryptionService.decrypt(encrypted);
 */
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    this.key = Buffer.from(env.ENCRYPTION_KEY, 'hex');

    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   * @param plaintext Data to encrypt
   * @returns Object containing encrypted data, IV, and auth tag
   * @throws Error if encryption fails
   */
  encrypt(plaintext: string): EncryptedData {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypts ciphertext using AES-256-GCM
   * Validates authentication tag to ensure data integrity
   * @param encryptedData Object containing encrypted data, IV, and auth tag
   * @returns Decrypted plaintext
   * @throws Error if decryption or authentication verification fails
   */
  decrypt(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );

    // Set authentication tag for verification
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    try {
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      // Authentication failed - data may have been tampered with
      throw new Error('Decryption failed: Authentication tag verification failed');
    }
  }
}

export const encryptionService = new EncryptionService();
