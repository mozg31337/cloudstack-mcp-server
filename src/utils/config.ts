import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { CloudStackConfig, CloudStackEnvironment } from '../cloudstack/types.js';
import { SecretManager } from '../security/SecretManager.js';

// Load environment variables from .env file
config();

export class ConfigManager {
  private config: CloudStackConfig;
  private secretManager: SecretManager;

  constructor() {
    this.secretManager = new SecretManager();
    this.config = this.loadConfig();
  }

  private loadConfig(): CloudStackConfig {
    try {
      // Always load configuration from environment variables only
      const config = this.createConfigFromEnvironment();
      
      this.validateConfig(config);
      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load CloudStack configuration from environment variables: ${error.message}`);
      }
      throw new Error(`Failed to load CloudStack configuration from environment variables`);
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

    return environment;
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

}