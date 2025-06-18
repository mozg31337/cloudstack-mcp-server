import { readFileSync } from 'fs';
import { CloudStackConfig, CloudStackEnvironment } from '../cloudstack/types.js';

export class ConfigManager {
  private config: CloudStackConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || process.env.CLOUDSTACK_CONFIG || 'config/cloudstack.json';
    this.config = this.loadConfig();
  }

  private loadConfig(): CloudStackConfig {
    try {
      const configData = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as CloudStackConfig;
      
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
}