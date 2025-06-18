import { ConfigManager } from '../../../src/utils/config';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('ConfigManager', () => {
  const testConfigDir = 'tests/fixtures/config';
  const testConfigPath = join(testConfigDir, 'test-config.json');
  
  const validConfig = {
    environments: {
      default: {
        name: 'Test Environment',
        apiUrl: 'https://test.example.com/client/api',
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key',
        timeout: 30000,
        retries: 3
      },
      dev: {
        name: 'Dev Environment',
        apiUrl: 'https://dev.example.com/client/api',
        apiKey: 'dev-api-key',
        secretKey: 'dev-secret-key',
        timeout: 15000,
        retries: 2
      }
    },
    defaultEnvironment: 'default',
    logging: {
      level: 'info',
      file: 'logs/test.log'
    }
  };

  beforeEach(() => {
    mkdirSync(testConfigDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should load valid configuration successfully', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
      
      const configManager = new ConfigManager(testConfigPath);
      
      expect(configManager.getDefaultEnvironment()).toEqual(validConfig.environments.default);
    });

    it('should throw error for missing configuration file', () => {
      expect(() => {
        new ConfigManager('nonexistent-config.json');
      }).toThrow('Failed to load CloudStack configuration');
    });

    it('should throw error for invalid JSON', () => {
      writeFileSync(testConfigPath, 'invalid json');
      
      expect(() => {
        new ConfigManager(testConfigPath);
      }).toThrow('Failed to load CloudStack configuration');
    });

    it('should throw error for missing environments', () => {
      const invalidConfig = { ...validConfig };
      delete invalidConfig.environments;
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager(testConfigPath);
      }).toThrow('Configuration must have environments defined');
    });

    it('should throw error for missing defaultEnvironment', () => {
      const invalidConfig = { ...validConfig };
      delete invalidConfig.defaultEnvironment;
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager(testConfigPath);
      }).toThrow('Configuration must have defaultEnvironment specified');
    });

    it('should throw error for non-existent default environment', () => {
      const invalidConfig = { ...validConfig };
      invalidConfig.defaultEnvironment = 'nonexistent';
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager(testConfigPath);
      }).toThrow("Default environment 'nonexistent' not found in environments");
    });
  });

  describe('validateEnvironment', () => {
    it('should throw error for missing required fields', () => {
      const invalidConfig = { ...validConfig };
      delete invalidConfig.environments.default.apiKey;
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager(testConfigPath);
      }).toThrow("Environment 'default' is missing required field: apiKey");
    });

    it('should throw error for invalid API URL', () => {
      const invalidConfig = { ...validConfig };
      invalidConfig.environments.default.apiUrl = 'invalid-url';
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager(testConfigPath);
      }).toThrow("Environment 'default' apiUrl must be a valid HTTP(S) URL");
    });
  });

  describe('getEnvironment', () => {
    let configManager: ConfigManager;

    beforeEach(() => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
      configManager = new ConfigManager(testConfigPath);
    });

    it('should return default environment when no name specified', () => {
      const env = configManager.getEnvironment();
      expect(env).toEqual(validConfig.environments.default);
    });

    it('should return specific environment when name specified', () => {
      const env = configManager.getEnvironment('dev');
      expect(env).toEqual(validConfig.environments.dev);
    });

    it('should throw error for non-existent environment', () => {
      expect(() => {
        configManager.getEnvironment('nonexistent');
      }).toThrow("Environment 'nonexistent' not found");
    });

    it('should return default environment from getDefaultEnvironment', () => {
      const env = configManager.getDefaultEnvironment();
      expect(env).toEqual(validConfig.environments.default);
    });
  });

  describe('listEnvironments', () => {
    it('should return list of all environment names', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
      const configManager = new ConfigManager(testConfigPath);
      
      const environments = configManager.listEnvironments();
      expect(environments).toEqual(['default', 'dev']);
    });
  });

  describe('getLoggingConfig', () => {
    it('should return logging configuration', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
      const configManager = new ConfigManager(testConfigPath);
      
      const loggingConfig = configManager.getLoggingConfig();
      expect(loggingConfig).toEqual(validConfig.logging);
    });

    it('should return default logging config when not specified', () => {
      const configWithoutLogging = { ...validConfig };
      delete configWithoutLogging.logging;
      writeFileSync(testConfigPath, JSON.stringify(configWithoutLogging, null, 2));
      const configManager = new ConfigManager(testConfigPath);
      
      const loggingConfig = configManager.getLoggingConfig();
      expect(loggingConfig).toEqual({
        level: 'info',
        file: 'logs/cloudstack-mcp.log'
      });
    });
  });

  describe('reload', () => {
    it('should reload configuration from file', () => {
      writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
      const configManager = new ConfigManager(testConfigPath);
      
      // Initial environment count
      expect(configManager.listEnvironments()).toHaveLength(2);
      
      // Update config file
      const updatedConfig = { ...validConfig };
      updatedConfig.environments.prod = {
        name: 'Production',
        apiUrl: 'https://prod.example.com/client/api',
        apiKey: 'prod-key',
        secretKey: 'prod-secret',
        timeout: 60000,
        retries: 5
      };
      writeFileSync(testConfigPath, JSON.stringify(updatedConfig, null, 2));
      
      // Reload and verify
      configManager.reload();
      expect(configManager.listEnvironments()).toHaveLength(3);
      expect(configManager.listEnvironments()).toContain('prod');
    });
  });
});