import { CloudStackClient } from '../../../src/cloudstack/client';
import { CloudStackEnvironment } from '../../../src/cloudstack/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CloudStackClient', () => {
  let client: CloudStackClient;
  let mockEnvironment: CloudStackEnvironment;

  beforeEach(() => {
    mockEnvironment = {
      name: 'Test Environment',
      apiUrl: 'https://test.example.com/client/api',
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      timeout: 30000,
      retries: 3
    };

    const mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    client = new CloudStackClient(mockEnvironment);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided environment', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: 30000,
        headers: {
          'User-Agent': 'CloudStack-MCP-Server/1.0.0',
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    });
  });

  describe('makeRequest', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        data: {
          listvirtualmachinesresponse: {
            virtualmachine: [
              {
                id: 'vm-1',
                name: 'test-vm',
                state: 'Running'
              }
            ]
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.makeRequest('listVirtualMachines', { account: 'test' });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listVirtualMachines'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('account=test'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('apikey=test-api-key'));
      expect(result).toEqual(mockResponse.data.listvirtualmachinesresponse);
    });

    it('should handle CloudStack API errors', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 401,
          errortext: 'Unable to verify user credentials'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.makeRequest('listVirtualMachines')).rejects.toThrow(
        'CloudStack API Error (401): Unable to verify user credentials'
      );
    });

    it('should handle network timeouts', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      const mockGet = jest.fn().mockRejectedValue(timeoutError);
      (client as any).httpClient.get = mockGet;

      await expect(client.makeRequest('listVirtualMachines')).rejects.toThrow(
        'Request timeout after 30000ms'
      );
    });

    it('should handle authentication errors', async () => {
      const authError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { errortext: 'Authentication failed' }
        }
      };

      // Mock axios.isAxiosError to return true
      const originalIsAxiosError = require('axios').isAxiosError;
      require('axios').isAxiosError = jest.fn().mockReturnValue(true);

      const mockGet = jest.fn().mockRejectedValue(authError);
      (client as any).httpClient.get = mockGet;

      await expect(client.makeRequest('listVirtualMachines')).rejects.toThrow(
        'Authentication failed - check your API credentials'
      );

      // Restore original function
      require('axios').isAxiosError = originalIsAxiosError;
    });

    it('should handle permission errors', async () => {
      const permissionError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { errortext: 'Access denied' }
        }
      };

      // Mock axios.isAxiosError to return true
      const originalIsAxiosError = require('axios').isAxiosError;
      require('axios').isAxiosError = jest.fn().mockReturnValue(true);

      const mockGet = jest.fn().mockRejectedValue(permissionError);
      (client as any).httpClient.get = mockGet;

      await expect(client.makeRequest('listVirtualMachines')).rejects.toThrow(
        'Access denied - insufficient permissions'
      );

      // Restore original function
      require('axios').isAxiosError = originalIsAxiosError;
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const mockResponse = {
        data: {
          listcapabilitiesresponse: {
            capability: {}
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      const mockGet = jest.fn().mockRejectedValue(new Error('Connection failed'));
      (client as any).httpClient.get = mockGet;

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getEnvironmentInfo', () => {
    it('should return environment info without sensitive data', () => {
      const info = client.getEnvironmentInfo();
      
      expect(info).toEqual({
        name: 'Test Environment',
        apiUrl: 'https://test.example.com/client/api',
        timeout: 30000,
        retries: 3
      });
      
      expect(info).not.toHaveProperty('apiKey');
      expect(info).not.toHaveProperty('secretKey');
    });
  });

  describe('resource listing methods', () => {
    beforeEach(() => {
      const mockGet = jest.fn().mockResolvedValue({
        data: { mockresponse: { mock: 'data' } }
      });
      (client as any).httpClient.get = mockGet;
    });

    it('should call listVirtualMachines with correct parameters', async () => {
      const params = { account: 'test', zone: 'zone1' };
      await client.listVirtualMachines(params);
      
      const mockGet = (client as any).httpClient.get;
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=listVirtualMachines')
      );
    });

    it('should call listNetworks with correct parameters', async () => {
      const params = { type: 'Isolated' };
      await client.listNetworks(params);
      
      const mockGet = (client as any).httpClient.get;
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=listNetworks')
      );
    });

    it('should call listVolumes with correct parameters', async () => {
      const params = { virtualmachineid: 'vm-1' };
      await client.listVolumes(params);
      
      const mockGet = (client as any).httpClient.get;
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=listVolumes')
      );
    });

    it('should call listZones with correct parameters', async () => {
      const params = { available: true };
      await client.listZones(params);
      
      const mockGet = (client as any).httpClient.get;
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=listZones')
      );
    });
  });
});