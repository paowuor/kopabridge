import { Test, TestingModule } from '@nestjs/testing';
import { VaultService } from './vault.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('VaultService', () => {
  let service: VaultService;

  // A valid 64-character hex key for testing (32 bytes)
  const MOCK_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const ALTERNATE_MOCK_KEY =
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultService,
        {
          provide: ConfigService,
          // Mock the configuration store to return our test key
          useValue: {
            get: jest.fn().mockReturnValue(MOCK_KEY),
          },
        },
      ],
    }).compile();

    service = module.get<VaultService>(VaultService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 1. Encrypt then decrypt returns original value
  it('should return the original plaintext value after encryption and decryption', () => {
    const originalToken = 'm_kopa_secret_oauth_token_12345';

    const cipherText = service.encrypt(originalToken);
    expect(cipherText).not.toEqual(originalToken);
    expect(cipherText.startsWith('v1.')).toBe(true);

    const decryptedToken = service.decrypt(cipherText);
    expect(decryptedToken).toEqual(originalToken);
  });

  // 1b. Legacy unversioned tokens can still be decrypted
  it('should decrypt legacy 3-part unversioned ciphertext format', () => {
    const iv = crypto.randomBytes(12);
    const key = Buffer.from(MOCK_KEY, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update('legacy-secret-token', 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    const legacyCipher = `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted}`;

    expect(service.decrypt(legacyCipher)).toEqual('legacy-secret-token');
  });

  // 2. Encrypting the same token twice produces different ciphertexts (because of random IVs)
  it('should produce distinct ciphertexts when encrypting the same token twice due to random IVs', () => {
    const targetToken = 'same_persistent_token_value';

    const cipherTextOne = service.encrypt(targetToken);
    const cipherTextTwo = service.encrypt(targetToken);

    expect(cipherTextOne).not.toEqual(cipherTextTwo);

    // Both must still resolve back to the same original token string
    expect(service.decrypt(cipherTextOne)).toEqual(targetToken);
    expect(service.decrypt(cipherTextTwo)).toEqual(targetToken);
  });

  // 3. Invalid ciphertext throws an error
  it('should throw an InternalServerErrorException if the ciphertext format is invalid or malformed', () => {
    const malformedCipherText = 'invalid-format-without-periods';

    expect(() => service.decrypt(malformedCipherText)).toThrow(
      InternalServerErrorException,
    );
  });

  // 4. Incorrect encryption key fails decryption
  it('should fail decryption if a different encryption key is introduced', async () => {
    const originalToken = 'highly_sensitive_solar_provider_secret';
    const cipherText = service.encrypt(originalToken);

    // Create a rogue Vault instance initialized with an entirely different key
    const rogueModule: TestingModule = await Test.createTestingModule({
      providers: [
        VaultService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(ALTERNATE_MOCK_KEY),
          },
        },
      ],
    }).compile();

    const rogueVaultService = rogueModule.get<VaultService>(VaultService);

    // Decrypting with the wrong key must trigger an error because the authentication tag validation fails
    expect(() => rogueVaultService.decrypt(cipherText)).toThrow(
      InternalServerErrorException,
    );
  });
});
