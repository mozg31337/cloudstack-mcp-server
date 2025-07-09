import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { CloudStackConfig, CloudStackEnvironment } from '../cloudstack/types.js';
import { SecretManager } from '../security/SecretManager.js';

// Load environment variables from .env file
config();

export class ConfigManager {
  private config: CloudStackConfig;
  private configPath: string;
  private secretManager: SecretManager;

  constructor(configPath?: string) {
    this.configPath = configPath || process.env.CLOUDSTACK_CONFIG || 'config/cloudstack.json';
    this.secretManager = new SecretManager();
    this.config = this.loadConfig();
  }

  private loadConfig(): CloudStackConfig {
    try {
      let config: CloudStackConfig;
      
      // First try to load from environment variables if we have the required ones
      if (this.hasRequiredEnvironmentVariables()) {
        config = this.createConfigFromEnvironment();
      } else {
        // Fallback to file-based configuration
        try {
          config = this.secretManager.loadSecureConfig(this.configPath);
        } catch (fileError) {
          // If file doesn't exist or fails, create minimal config from env vars
          config = this.createConfigFromEnvironment();
        }
      }
      
      // Merge with environment variables (environment variables take precedence)
      this.mergeEnvironmentVariables(config);
      
      this.validateConfig(config);
      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load CloudStack configuration: ${error.message}`);
      }
      throw new Error(`Failed to load CloudStack configuration`);
    }
  }

  private validateConfig(config: CloudStackConfig): void {
    if (!config.environments) {
      throw new Error('Configuration must have environments defined');
    }

    if (!config.defaultEnvironment) {
      throw new Error('Configuration must have defaultEnvironment specified');
    }

    if (!config.environments[config.defaultEnvironment]) {
      throw new Error(`Default environment '${config.defaultEnvironment}' not found in environments`);
    }

    for (const [envName, env] of Object.entries(config.environments)) {
      this.validateEnvironment(envName, env);
    }
  }

  private validateEnvironment(envName: string, env: CloudStackEnvironment): void {
    const requiredFields = ['name', 'apiUrl', 'apiKey', 'secretKey'];
    
    for (const field of requiredFields) {
      if (!env[field as keyof CloudStackEnvironment]) {
        throw new Error(`Environment '${envName}' is missing required field: ${field}`);
      }
    }

    if (!env.apiUrl.startsWith('http')) {
      throw new Error(`Environment '${envName}' apiUrl must be a valid HTTP(S) URL`);
    }
  }

  public getEnvironment(envName?: string): CloudStackEnvironment {
    const targetEnv = envName || this.config.defaultEnvironment;
    const environment = this.config.environments[targetEnv];
    
    if (!environment) {
      throw new Error(`Environment '${targetEnv}' not found`);
    }

    // Apply environment-specific overrides
    const envConfig = this.secretManager.getEnvironmentConfig();
    return { ...environment, ...envConfig };
  }

  public getDefaultEnvironment(): CloudStackEnvironment {
    return this.getEnvironment();
  }

  public listEnvironments(): string[] {
    return Object.keys(this.config.environments);
  }

  public getLoggingConfig(): { level: string; file: string } {
    return this.config.logging || { level: 'info', file: 'logs/cloudstack-mcp.log' };
  }

  public reload(): void {
    this.config = this.loadConfig();
  }

  /**
   * Save configuration with encryption
   */
  public saveEncryptedConfig(password: string): void {
    this.secretManager.saveEncryptedConfig(this.config, this.configPath, password);
  }

  /**
   * Rotate credentials for an environment
   */
  public async rotateEnvironmentCredentials(envName: string): Promise<boolean> {
    const environment = this.getEnvironment(envName);
    const result = await this.secretManager.rotateCredentials(environment);
    
    if (result.success && result.newApiKey && result.newSecretKey) {
      // Update the configuration
      if (this.config.environments && this.config.environments[envName]) {
        this.config.environments[envName].apiKey = result.newApiKey;
        this.config.environments[envName].secretKey = result.newSecretKey;
        return true;
      }
    }
    
    return false;
  }

  /**
   * Validate credentials for an environment
   */
  public async validateEnvironmentCredentials(envName?: string): Promise<boolean> {
    const environment = this.getEnvironment(envName);
    return this.secretManager.validateCredentials(environment);
  }

  /**
   * Check if we have required environment variables for configuration
   */
  private hasRequiredEnvironmentVariables(): boolean {
    const hasDefault = process.env.CLOUDSTACK_PROD_API_KEY && process.env.CLOUDSTACK_PROD_SECRET_KEY && process.env.CLOUDSTACK_PROD_API_URL;
    const hasDev = process.env.CLOUDSTACK_DEV_API_KEY && process.env.CLOUDSTACK_DEV_SECRET_KEY && process.env.CLOUDSTACK_DEV_API_URL;
    return !!(hasDefault || hasDev);
  }

  /**
   * Create configuration from environment variables
   */
  private createConfigFromEnvironment(): CloudStackConfig {
    const environments: Record<string, CloudStackEnvironment> = {};
    
    // Create default (production) environment
    if (process.env.CLOUDSTACK_PROD_API_KEY && process.env.CLOUDSTACK_PROD_SECRET_KEY && process.env.CLOUDSTACK_PROD_API_URL) {
      environments.default = {
        name: process.env.CLOUDSTACK_PROD_NAME || 'Production CloudStack',
        apiUrl: process.env.CLOUDSTACK_PROD_API_URL,
        apiKey: process.env.CLOUDSTACK_PROD_API_KEY,
        secretKey: process.env.CLOUDSTACK_PROD_SECRET_KEY,
        timeout: process.env.CLOUDSTACK_PROD_TIMEOUT ? parseInt(process.env.CLOUDSTACK_PROD_TIMEOUT, 10) : 30000,
        retries: process.env.CLOUDSTACK_PROD_RETRIES ? parseInt(process.env.CLOUDSTACK_PROD_RETRIES, 10) : 3
      };
    }
    
    // Create development environment
    if (process.env.CLOUDSTACK_DEV_API_KEY && process.env.CLOUDSTACK_DEV_SECRET_KEY && process.env.CLOUDSTACK_DEV_API_URL) {
      environments.dev = {
        name: process.env.CLOUDSTACK_DEV_NAME || 'Development CloudStack',
        apiUrl: process.env.CLOUDSTACK_DEV_API_URL,
        apiKey: process.env.CLOUDSTACK_DEV_API_KEY,
        secretKey: process.env.CLOUDSTACK_DEV_SECRET_KEY,
        timeout: process.env.CLOUDSTACK_DEV_TIMEOUT ? parseInt(process.env.CLOUDSTACK_DEV_TIMEOUT, 10) : 30000,
        retries: process.env.CLOUDSTACK_DEV_RETRIES ? parseInt(process.env.CLOUDSTACK_DEV_RETRIES, 10) : 3
      };
    }
    
    if (Object.keys(environments).length === 0) {
      throw new Error('No valid CloudStack environments found in environment variables');
    }
    
    return {
      environments,
      defaultEnvironment: process.env.CLOUDSTACK_DEFAULT_ENVIRONMENT || 'default',
      logging: {
        level: process.env.CLOUDSTACK_LOG_LEVEL || 'info',
        file: process.env.CLOUDSTACK_LOG_FILE || 'logs/cloudstack-mcp.log'
      }
    };
  }

  /**
   * Merge environment variables into configuration
   */
  private mergeEnvironmentVariables(config: CloudStackConfig): void {
    // Merge environment-specific variables for each environment
    for (const [envName, environment] of Object.entries(config.environments)) {
      const envConfig = this.secretManager.getEnvironmentSpecificConfig(envName);
      Object.assign(environment, envConfig);
    }
    
    // Also try legacy environment variables
    const currentEnv = config.defaultEnvironment;
    if (config.environments[currentEnv]) {
      const legacyEnvConfig = this.secretManager.getEnvironmentConfig();
      Object.assign(config.environments[currentEnv], legacyEnvConfig);
    }

    // Support default environment override
    if (process.env.CLOUDSTACK_DEFAULT_ENVIRONMENT) {
      config.defaultEnvironment = process.env.CLOUDSTACK_DEFAULT_ENVIRONMENT;
    }

    // Support logging configuration
    if (process.env.CLOUDSTACK_LOG_LEVEL) {
      config.logging = config.logging || {};
      config.logging.level = process.env.CLOUDSTACK_LOG_LEVEL;
    }

    if (process.env.CLOUDSTACK_LOG_FILE) {
      config.logging = config.logging || {};
      config.logging.file = process.env.CLOUDSTACK_LOG_FILE;
    }

    // Legacy support
    if (process.env.LOG_LEVEL) {
      config.logging = config.logging || {};
      config.logging.level = process.env.LOG_LEVEL;
    }

    if (process.env.LOG_FILE) {
      config.logging = config.logging || {};
      config.logging.file = process.env.LOG_FILE;
    }
  }
}