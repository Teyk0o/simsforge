import { pool } from '@config/database';
import { encryptionService, EncryptedData } from '@services/encryption/EncryptionService';

/**
 * Represents a stored API key metadata (without the actual key)
 */
export interface UserApiKey {
  id: number;
  userId: number;
  serviceName: 'curseforge' | 'patreon';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository for managing user API keys with encryption/decryption
 * Handles CRUD operations for third-party service API keys
 */
export class UserApiKeyRepository {
  /**
   * Creates or updates an API key for a user and service
   * The key is automatically encrypted before storage
   * @param userId User ID
   * @param serviceName Service name (curseforge, patreon, etc.)
   * @param apiKey Plain text API key
   * @returns Metadata of the stored key (no sensitive data)
   */
  async create(userId: number, serviceName: string, apiKey: string): Promise<UserApiKey> {
    const encrypted = encryptionService.encrypt(apiKey);

    const result = await pool.query(
      `INSERT INTO user_api_keys (user_id, service_name, api_key_encrypted, iv, auth_tag)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, service_name)
       DO UPDATE SET
         api_key_encrypted = EXCLUDED.api_key_encrypted,
         iv = EXCLUDED.iv,
         auth_tag = EXCLUDED.auth_tag,
         updated_at = NOW()
       RETURNING id, user_id, service_name, created_at, updated_at`,
      [userId, serviceName, encrypted.encrypted, encrypted.iv, encrypted.authTag]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Retrieves the decrypted API key for a user and service
   * @param userId User ID
   * @param serviceName Service name
   * @returns Decrypted API key or null if not found
   */
  async findByUserAndService(userId: number, serviceName: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT api_key_encrypted, iv, auth_tag
       FROM user_api_keys
       WHERE user_id = $1 AND service_name = $2`,
      [userId, serviceName]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const encryptedData: EncryptedData = {
      encrypted: row.api_key_encrypted,
      iv: row.iv,
      authTag: row.auth_tag
    };

    return encryptionService.decrypt(encryptedData);
  }

  /**
   * Lists all configured service names for a user (without retrieving actual keys)
   * @param userId User ID
   * @returns Array of service names user has configured
   */
  async findServicesByUser(userId: number): Promise<string[]> {
    const result = await pool.query(
      `SELECT service_name FROM user_api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => row.service_name);
  }

  /**
   * Deletes an API key for a user and service
   * @param userId User ID
   * @param serviceName Service name
   * @returns true if deleted, false if not found
   */
  async delete(userId: number, serviceName: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM user_api_keys WHERE user_id = $1 AND service_name = $2`,
      [userId, serviceName]
    );

    return result.rowCount! > 0;
  }

  /**
   * Maps database row to UserApiKey object
   * @private
   */
  private mapRow(row: any): UserApiKey {
    return {
      id: row.id,
      userId: row.user_id,
      serviceName: row.service_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const userApiKeyRepository = new UserApiKeyRepository();
