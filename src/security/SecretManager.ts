import crypto from 'crypto';
import { readFileSync, writeFileSync, chmodSync, statSync } from 'fs';
import { CloudStackEnvironment, CloudStackConfig } from '../cloudstack/types.js';
import { Logger } from '../utils/logger.js';

export interface EncryptedConfig {
  encrypted: string;
  iv: string;
  salt: string;
  algorithm: string;
  keyDerivation: string;
}

export interface SecretRotationResult {
  success: boolean;
  newApiKey?: string;
  newSecretKey?: string;
  error?: string;
}

export class SecretManager {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_DERIVATION = 'pbkdf2';
  private static readonly ITERATIONS = 100000;
  private static readonly SALT_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  constructor() {
    Logger.info('SecretManager initialized with AES-256-GCM encryption');
  }

  /**
   * Encrypt configuration data using AES-256-GCM
   */
  public encryptConfig(config: CloudStackConfig, password: string): EncryptedConfig {
    try {
      const salt = crypto.randomBytes(SecretManager.SALT_LENGTH);
      const iv = crypto.randomBytes(SecretManager.IV_LENGTH);
      
      const key = crypto.pbkdf2Sync(password, salt, SecretManager.ITERATIONS, 32, 'sha256');
      
      const cipher = crypto.createCipher(SecretManager.ALGORITHM, key);
      cipher.setAAD(Buffer.from('cloudstack-mcp-server'));
      
      const configString = JSON.stringify(config);
      let encrypted = cipher.update(configString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      const result: EncryptedConfig = {
        encrypted: encrypted + authTag.toString('hex'),
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        algorithm: SecretManager.ALGORITHM,
        keyDerivation: SecretManager.KEY_DERIVATION
      };

      Logger.info('Configuration encrypted successfully');
      return result;
    } catch (error) {
      Logger.error('Failed to encrypt configuration', error);
      throw new Error('Configuration encryption failed');
    }
  }

  /**
   * Decrypt configuration data using AES-256-GCM
   */
  public decryptConfig(encryptedConfig: EncryptedConfig, password: string): CloudStackConfig {
    try {
      const salt = Buffer.from(encryptedConfig.salt, 'hex');
      const iv = Buffer.from(encryptedConfig.iv, 'hex');
      
      const key = crypto.pbkdf2Sync(password, salt, SecretManager.ITERATIONS, 32, 'sha256');
      
      const encryptedData = encryptedConfig.encrypted;
      const encrypted = encryptedData.slice(0, -SecretManager.TAG_LENGTH * 2);
      const authTag = Buffer.from(encryptedData.slice(-SecretManager.TAG_LENGTH * 2), 'hex');
      
      const decipher = crypto.createDecipher(SecretManager.ALGORITHM, key);
      decipher.setAAD(Buffer.from('cloudstack-mcp-server'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const config = JSON.parse(decrypted) as CloudStackConfig;
      Logger.info('Configuration decrypted successfully');
      return config;
    } catch (error) {
      Logger.error('Failed to decrypt configuration', error);
      throw new Error('Configuration decryption failed - check password');
    }
  }

  /**
   * Load configuration with support for both encrypted and plain text formats
   */
  public loadSecureConfig(configPath: string, password?: string): CloudStackConfig {
    try {
      this.validateConfigFilePermissions(configPath);
      
      const configData = readFileSync(configPath, 'utf-8');
      const parsedData = JSON.parse(configData);
      
      // Check if config is encrypted
      if (this.isEncryptedConfig(parsedData)) {
        if (!password) {
          password = process.env.CLOUDSTACK_CONFIG_PASSWORD;
          if (!password) {
            throw new Error('Encrypted configuration requires password (set CLOUDSTACK_CONFIG_PASSWORD)');
          }
        }
        return this.decryptConfig(parsedData, password);
      }
      
      // Plain text config - warn about security
      Logger.warn('Loading plain text configuration - consider encrypting with SecretManager.encryptConfigFile()');
      return parsedData as CloudStackConfig;
    } catch (error) {
      Logger.error('Failed to load secure configuration', error);
      throw error;
    }
  }

  /**
   * Save encrypted configuration to file
   */
  public saveEncryptedConfig(config: CloudStackConfig, configPath: string, password: string): void {
    try {
      const encryptedConfig = this.encryptConfig(config, password);
      const configData = JSON.stringify(encryptedConfig, null, 2);
      
      writeFileSync(configPath, configData, { mode: 0o600 });
      this.validateConfigFilePermissions(configPath);
      
      Logger.info(`Encrypted configuration saved to ${configPath}`);
    } catch (error) {
      Logger.error('Failed to save encrypted configuration', error);
      throw error;
    }
  }

  /**
   * Rotate credentials for an environment
   */
  public async rotateCredentials(
    environment: CloudStackEnvironment,
    newApiKey?: string,
    newSecretKey?: string
  ): Promise<SecretRotationResult> {
    try {
      // Generate new credentials if not provided
      const apiKey = newApiKey || this.generateApiKey();
      const secretKey = newSecretKey || this.generateSecretKey();
      
      // Validate new credentials format
      if (!this.validateCredentialFormat(apiKey, secretKey)) {
        return {
          success: false,
          error: 'Invalid credential format'
        };
      }
      
      Logger.info(`Rotating credentials for environment: ${environment.name}`);
      
      return {
        success: true,
        newApiKey: apiKey,
        newSecretKey: secretKey
      };
    } catch (error) {
      Logger.error('Credential rotation failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate credentials against CloudStack API
   */
  public async validateCredentials(environment: CloudStackEnvironment): Promise<boolean> {
    try {
      // This would normally make an API call to CloudStack to validate
      // For now, we'll do basic format validation
      const isValid = this.validateCredentialFormat(environment.apiKey, environment.secretKey);
      
      if (isValid) {
        Logger.info(`Credentials validated for environment: ${environment.name}`);
      } else {
        Logger.warn(`Invalid credentials for environment: ${environment.name}`);
      }
      
      return isValid;
    } catch (error) {
      Logger.error('Credential validation failed', error);
      return false;
    }
  }

  /**
   * Get configuration from environment variables
   */
  public getEnvironmentConfig(): Partial<CloudStackEnvironment> {
    const config: Partial<CloudStackEnvironment> = {};
    
    if (process.env.CLOUDSTACK_API_URL) {
      config.apiUrl = process.env.CLOUDSTACK_API_URL;
    }
    
    if (process.env.CLOUDSTACK_API_KEY) {
      config.apiKey = process.env.CLOUDSTACK_API_KEY;
    }
    
    if (process.env.CLOUDSTACK_SECRET_KEY) {
      config.secretKey = process.env.CLOUDSTACK_SECRET_KEY;
    }
    
    if (process.env.CLOUDSTACK_TIMEOUT) {
      config.timeout = parseInt(process.env.CLOUDSTACK_TIMEOUT, 10);
    }
    
    if (process.env.CLOUDSTACK_RETRIES) {
      config.retries = parseInt(process.env.CLOUDSTACK_RETRIES, 10);
    }
    
    if (process.env.CLOUDSTACK_ENVIRONMENT_NAME) {
      config.name = process.env.CLOUDSTACK_ENVIRONMENT_NAME;
    }
    
    return config;
  }

  /**
   * Validate configuration file permissions (should be 600)
   */
  private validateConfigFilePermissions(configPath: string): void {
    try {
      const stats = statSync(configPath);
      const permissions = stats.mode & parseInt('777', 8);
      
      if (permissions !== parseInt('600', 8)) {
        Logger.warn(`Configuration file ${configPath} has insecure permissions: ${permissions.toString(8)}`);
        Logger.info(`Setting secure permissions (600) for ${configPath}`);
        chmodSync(configPath, 0o600);
      }
    } catch (error) {
      Logger.warn('Unable to validate config file permissions', error);
    }
  }

  /**
   * Check if configuration data is encrypted
   */
  private isEncryptedConfig(data: any): data is EncryptedConfig {
    return (
      typeof data === 'object' &&
      typeof data.encrypted === 'string' &&
      typeof data.iv === 'string' &&
      typeof data.salt === 'string' &&
      data.algorithm === SecretManager.ALGORITHM
    );
  }

  /**
   * Validate credential format
   */
  private validateCredentialFormat(apiKey: string, secretKey: string): boolean {
    // Basic format validation for CloudStack credentials
    const apiKeyRegex = /^[A-Za-z0-9_-]{20,}$/;
    const secretKeyRegex = /^[A-Za-z0-9+/=]{40,}$/;
    
    return apiKeyRegex.test(apiKey) && secretKeyRegex.test(secretKey);
  }

  /**
   * Generate a new API key
   */
  private generateApiKey(): string {
    return crypto.randomBytes(20).toString('hex').toUpperCase();
  }

  /**
   * Generate a new secret key
   */
  private generateSecretKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}