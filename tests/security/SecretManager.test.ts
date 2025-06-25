import { SecretManager } from '../../src/security/SecretManager';
import { CloudStackConfig } from '../../src/cloudstack/types';
import { readFileSync, writeFileSync, unlinkSync, chmodSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('SecretManager', () => {
  let secretManager: SecretManager;
  let testConfigPath: string;
  let testConfig: CloudStackConfig;

  beforeEach(() => {
    secretManager = new SecretManager();
    testConfigPath = join(tmpdir(), `test-config-${Date.now()}.json`);
    
    testConfig = {
      defaultEnvironment: 'test',
      environments: {
        test: {
          name: 'Test Environment',
          apiUrl: 'https://test.example.com/client/api',
          apiKey: 'test-api-key-12345678901234567890',
          secretKey: 'test-secret-key-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF==',
          timeout: 30000,
          retries: 3
        }
      },
      logging: {
        level: 'info',
        file: 'logs/test.log'
      }
    };
  });

  afterEach(() => {
    try {
      unlinkSync(testConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Configuration Encryption', () => {
    test('should encrypt and decrypt configuration successfully', () => {
      const password = 'test-password-123';
      
      // Encrypt configuration
      const encrypted = secretManager.encryptConfig(testConfig, password);
      
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('salt');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      
      // Decrypt configuration
      const decrypted = secretManager.decryptConfig(encrypted, password);
      
      expect(decrypted).toEqual(testConfig);
    });

    test('should fail to decrypt with wrong password', () => {
      const password = 'test-password-123';
      const wrongPassword = 'wrong-password';
      
      const encrypted = secretManager.encryptConfig(testConfig, password);
      
      expect(() => {
        secretManager.decryptConfig(encrypted, wrongPassword);
      }).toThrow('Configuration decryption failed');
    });

    test('should save and load encrypted configuration', () => {
      const password = 'test-password-123';
      
      // Save encrypted config
      secretManager.saveEncryptedConfig(testConfig, testConfigPath, password);
      
      // Load encrypted config
      const loaded = secretManager.loadSecureConfig(testConfigPath, password);
      
      expect(loaded).toEqual(testConfig);
    });
  });

  describe('File Permissions', () => {
    test('should validate config file permissions', () => {
      // Create config with wrong permissions
      writeFileSync(testConfigPath, JSON.stringify(testConfig));
      chmodSync(testConfigPath, 0o644); // Too permissive
      
      // Should still load but warn about permissions
      expect(() => {
        secretManager.loadSecureConfig(testConfigPath);
      }).not.toThrow();
    });

    test('should set secure permissions when saving encrypted config', () => {
      const password = 'test-password-123';
      
      secretManager.saveEncryptedConfig(testConfig, testConfigPath, password);
      
      const stats = require('fs').statSync(testConfigPath);
      const permissions = stats.mode & parseInt('777', 8);
      expect(permissions).toBe(parseInt('600', 8));
    });
  });

  describe('Environment Variables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should read configuration from environment variables', () => {
      process.env.CLOUDSTACK_API_URL = 'https://env.example.com/client/api';
      process.env.CLOUDSTACK_API_KEY = 'env-api-key';
      process.env.CLOUDSTACK_SECRET_KEY = 'env-secret-key';
      process.env.CLOUDSTACK_TIMEOUT = '45000';
      process.env.CLOUDSTACK_RETRIES = '5';
      process.env.CLOUDSTACK_ENVIRONMENT_NAME = 'Environment from ENV';

      const envConfig = secretManager.getEnvironmentConfig();

      expect(envConfig.apiUrl).toBe('https://env.example.com/client/api');
      expect(envConfig.apiKey).toBe('env-api-key');
      expect(envConfig.secretKey).toBe('env-secret-key');
      expect(envConfig.timeout).toBe(45000);
      expect(envConfig.retries).toBe(5);
      expect(envConfig.name).toBe('Environment from ENV');
    });

    test('should handle missing environment variables gracefully', () => {
      // Clear relevant env vars
      delete process.env.CLOUDSTACK_API_URL;
      delete process.env.CLOUDSTACK_API_KEY;
      
      const envConfig = secretManager.getEnvironmentConfig();
      
      expect(envConfig.apiUrl).toBeUndefined();
      expect(envConfig.apiKey).toBeUndefined();
    });
  });

  describe('Credential Validation', () => {
    test('should validate valid credentials', async () => {
      const validEnvironment = testConfig.environments.test;
      const isValid = await secretManager.validateCredentials(validEnvironment);
      expect(isValid).toBe(true);
    });

    test('should reject invalid credential formats', async () => {
      const invalidEnvironment = {
        ...testConfig.environments.test,
        apiKey: 'invalid-key', // Too short
        secretKey: 'invalid-secret' // Wrong format
      };
      
      const isValid = await secretManager.validateCredentials(invalidEnvironment);
      expect(isValid).toBe(false);
    });
  });

  describe('Credential Rotation', () => {
    test('should generate new credentials during rotation', async () => {
      const environment = testConfig.environments.test;
      const result = await secretManager.rotateCredentials(environment);
      
      expect(result.success).toBe(true);
      expect(result.newApiKey).toBeDefined();
      expect(result.newSecretKey).toBeDefined();
      expect(result.newApiKey).not.toBe(environment.apiKey);
      expect(result.newSecretKey).not.toBe(environment.secretKey);
    });

    test('should accept provided credentials during rotation', async () => {
      const environment = testConfig.environments.test;
      const newApiKey = 'NEW-API-KEY-12345678901234567890';
      const newSecretKey = 'NEW-SECRET-KEY-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF==';
      
      const result = await secretManager.rotateCredentials(environment, newApiKey, newSecretKey);
      
      expect(result.success).toBe(true);
      expect(result.newApiKey).toBe(newApiKey);
      expect(result.newSecretKey).toBe(newSecretKey);
    });

    test('should reject invalid credentials during rotation', async () => {
      const environment = testConfig.environments.test;
      const invalidApiKey = 'invalid';
      const invalidSecretKey = 'also-invalid';
      
      const result = await secretManager.rotateCredentials(environment, invalidApiKey, invalidSecretKey);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credential format');
    });
  });

  describe('Plain Text Configuration Support', () => {
    test('should load plain text configuration with warning', () => {
      // Save plain text config
      writeFileSync(testConfigPath, JSON.stringify(testConfig));
      
      const loaded = secretManager.loadSecureConfig(testConfigPath);
      expect(loaded).toEqual(testConfig);
    });

    test('should require password for encrypted configuration', () => {
      const password = 'test-password-123';
      
      // Save encrypted config
      secretManager.saveEncryptedConfig(testConfig, testConfigPath, password);
      
      // Try to load without password
      expect(() => {
        secretManager.loadSecureConfig(testConfigPath);
      }).toThrow('Encrypted configuration requires password');
    });

    test('should use environment variable for config password', () => {
      const password = 'test-password-123';
      const originalEnv = process.env;
      
      try {
        process.env.CLOUDSTACK_CONFIG_PASSWORD = password;
        
        // Save encrypted config
        secretManager.saveEncryptedConfig(testConfig, testConfigPath, password);
        
        // Load using env password
        const loaded = secretManager.loadSecureConfig(testConfigPath);
        expect(loaded).toEqual(testConfig);
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle file read errors gracefully', () => {
      const nonExistentPath = '/nonexistent/path/config.json';
      
      expect(() => {
        secretManager.loadSecureConfig(nonExistentPath);
      }).toThrow();
    });

    test('should handle malformed JSON gracefully', () => {
      writeFileSync(testConfigPath, 'invalid json content');
      
      expect(() => {
        secretManager.loadSecureConfig(testConfigPath);
      }).toThrow();
    });

    test('should handle corrupted encrypted data gracefully', () => {
      const corruptedEncrypted = {
        encrypted: 'corrupted-data',
        iv: 'invalid-iv',
        salt: 'invalid-salt',
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2'
      };
      
      expect(() => {
        secretManager.decryptConfig(corruptedEncrypted, 'any-password');
      }).toThrow('Configuration decryption failed');
    });
  });
});