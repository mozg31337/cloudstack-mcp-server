import { readFileSync } from 'fs';
import { CloudStackConfig, CloudStackEnvironment } from '../cloudstack/types.js';
import { SecretManager } from '../security/SecretManager.js';

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
      // Try to load secure config first (supports both encrypted and plain text)
      const config = this.secretManager.loadSecureConfig(this.configPath);
      
      // Merge with environment variables (environment variables take precedence)
      this.mergeEnvironmentVariables(config);
      
      this.validateConfig(config);
      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load CloudStack configuration from ${this.configPath}: ${error.message}`);
      }
      throw new Error(`Failed to load CloudStack configuration from ${this.configPath}`);
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
      this.config.environments[envName].apiKey = result.newApiKey;
      this.config.environments[envName].secretKey = result.newSecretKey;
      return true;
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
   * Merge environment variables into configuration
   */
  private mergeEnvironmentVariables(config: CloudStackConfig): void {
    // Support environment-specific variables
    const currentEnv = config.defaultEnvironment;
    if (config.environments[currentEnv]) {
      const envConfig = this.secretManager.getEnvironmentConfig();
      Object.assign(config.environments[currentEnv], envConfig);
    }

    // Support default environment override
    if (process.env.CLOUDSTACK_DEFAULT_ENVIRONMENT) {
      config.defaultEnvironment = process.env.CLOUDSTACK_DEFAULT_ENVIRONMENT;
    }

    // Support logging configuration
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