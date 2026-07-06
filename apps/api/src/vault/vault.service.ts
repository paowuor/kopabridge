import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class VaultService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12; // Standard IV length for GCM
  private readonly tagLength = 16; // Standard authentication tag length

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('TOKEN_ENCRYPTION_KEY');
    
    if (!keyHex || keyHex.length !== 64) {
      throw new InternalServerErrorException(
        'VaultService: TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).',
      );
    }
    
    // Convert the hex string into raw binary buffer bytes
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypts plaintext into a unified string formatted as: iv.authTag.cipherText
   */
  encrypt(plainText: string): string {
    // 1. Generate a cryptographically secure, random Initialization Vector (IV)
    const iv = crypto.randomBytes(this.ivLength);

    // 2. Initialize the cipher with AES-256-GCM, key, and IV
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv) as crypto.CipherGCM;

    // 3. Encrypt the string data
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 4. Extract the authentication tag protecting the message integrity
    const authTag = cipher.getAuthTag();

    // 5. Join IV, Auth Tag, and Ciphertext with a delimiter for single-column database storage
    return `${iv.toString('hex')}.${authTag.toString('hex')}.${encrypted}`;
  }

  /**
   * Decrypts a formatted token string back into raw plaintext
   */
  decrypt(cipherText: string): string {
    try {
      // 1. Unpack the components from our stored string contract
      const [ivHex, tagHex, encryptedHex] = cipherText.split('.');
      
      if (!ivHex || !tagHex || !encryptedHex) {
        throw new Error('Invalid encrypted text format format.');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      // 2. Initialize the decipher instance
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv) as crypto.DecipherGCM;

      // 3. Feed the authentication tag back into the decipher engine to verify integrity
      decipher.setAuthTag(tag);

      // 4. Decrypt the ciphertext stream
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException(
        'Vault decryption failed. Data may be corrupted or the encryption key is incorrect.',
      );
    }
  }
}