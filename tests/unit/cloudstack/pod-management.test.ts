import { CloudStackClient } from '../../../src/cloudstack/client';
import { CloudStackEnvironment } from '../../../src/cloudstack/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CloudStackClient - Pod Management Operations', () => {
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
      post: jest.fn(),
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

  describe('createPod', () => {
    it('should call createPod API with correct parameters', async () => {
      const mockResponse = {
        data: {
          createpodresponse: {
            pod: {
              id: 'pod-1',
              name: 'test-pod',
              zonename: 'test-zone',
              gateway: '192.168.1.1',
              netmask: '255.255.255.0',
              startip: '192.168.1.10',
              endip: '192.168.1.100',
              allocationstate: 'Enabled'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'test-pod',
        zoneid: 'zone-1',
        startip: '192.168.1.10',
        endip: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1'
      };

      const result = await client.createPod(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=createPod'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=test-pod'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('zoneid=zone-1'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('startip=192.168.1.10'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('endip=192.168.1.100'));
      expect(result).toEqual(mockResponse.data.createpodresponse);
    });
  });

  describe('deletePod', () => {
    it('should call deletePod API with correct parameters', async () => {
      const mockResponse = {
        data: {
          deletepodresponse: {
            success: true
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = { id: 'pod-1' };
      const result = await client.deletePod(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=deletePod'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('id=pod-1'));
      expect(result).toEqual(mockResponse.data.deletepodresponse);
    });
  });

  describe('updatePod', () => {
    it('should call updatePod API with correct parameters', async () => {
      const mockResponse = {
        data: {
          updatepodresponse: {
            pod: {
              id: 'pod-1',
              name: 'updated-pod',
              zonename: 'test-zone',
              gateway: '192.168.1.1',
              netmask: '255.255.255.0',
              startip: '192.168.1.20',
              endip: '192.168.1.90',
              allocationstate: 'Enabled'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'pod-1',
        name: 'updated-pod',
        startip: '192.168.1.20',
        endip: '192.168.1.90'
      };

      const result = await client.updatePod(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=updatePod'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('id=pod-1'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=updated-pod'));
      expect(result).toEqual(mockResponse.data.updatepodresponse);
    });
  });

  describe('listPods', () => {
    it('should call listPods API with correct parameters', async () => {
      const mockResponse = {
        data: {
          listpodsresponse: {
            pod: [
              {
                id: 'pod-1',
                name: 'pod-1',
                zonename: 'zone-1',
                gateway: '192.168.1.1',
                netmask: '255.255.255.0',
                startip: '192.168.1.10',
                endip: '192.168.1.100',
                allocationstate: 'Enabled'
              },
              {
                id: 'pod-2',
                name: 'pod-2',
                zonename: 'zone-1',
                gateway: '192.168.2.1',
                netmask: '255.255.255.0',
                startip: '192.168.2.10',
                endip: '192.168.2.100',
                allocationstate: 'Enabled'
              }
            ]
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = { zoneid: 'zone-1' };
      const result = await client.listPods(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listPods'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('zoneid=zone-1'));
      expect(result).toEqual(mockResponse.data.listpodsresponse);
    });

    it('should call listPods API without parameters', async () => {
      const mockResponse = {
        data: {
          listpodsresponse: {
            pod: []
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.listPods({});

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listPods'));
      expect(result).toEqual(mockResponse.data.listpodsresponse);
    });
  });

  describe('dedicatePod', () => {
    it('should call dedicatePod API with correct parameters', async () => {
      const mockResponse = {
        data: {
          dedicatepodresponse: {
            dedicatedresources: {
              id: 'dedicated-1',
              podid: 'pod-1',
              podname: 'test-pod',
              domainid: 'domain-1',
              domainname: 'test-domain',
              account: 'test-account'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        podid: 'pod-1',
        domainid: 'domain-1',
        account: 'test-account'
      };

      const result = await client.dedicatePod(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=dedicatePod'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('podid=pod-1'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('domainid=domain-1'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('account=test-account'));
      expect(result).toEqual(mockResponse.data.dedicatepodresponse);
    });

    it('should call dedicatePod API without account parameter', async () => {
      const mockResponse = {
        data: {
          dedicatepodresponse: {
            dedicatedresources: {
              id: 'dedicated-1',
              podid: 'pod-1',
              domainid: 'domain-1'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        podid: 'pod-1',
        domainid: 'domain-1'
      };

      const result = await client.dedicatePod(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=dedicatePod'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('podid=pod-1'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('domainid=domain-1'));
      expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining('account='));
      expect(result).toEqual(mockResponse.data.dedicatepodresponse);
    });
  });

  describe('error handling', () => {
    it('should handle API errors for createPod', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 431,
          errortext: 'Pod with specified name already exists in this zone'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.createPod({
        name: 'duplicate-pod',
        zoneid: 'zone-1',
        startip: '192.168.1.10',
        endip: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1'
      })).rejects.toThrow('CloudStack API Error (431): Pod with specified name already exists in this zone');
    });

    it('should handle missing required parameters', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 400,
          errortext: 'Missing required parameter: zoneid'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.createPod({
        name: 'test-pod',
        startip: '192.168.1.10',
        endip: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1'
      })).rejects.toThrow('CloudStack API Error (400): Missing required parameter: zoneid');
    });

    it('should handle invalid IP range errors', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 431,
          errortext: 'Start IP address must be before end IP address'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.createPod({
        name: 'test-pod',
        zoneid: 'zone-1',
        startip: '192.168.1.100',
        endip: '192.168.1.10',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1'
      })).rejects.toThrow('CloudStack API Error (431): Start IP address must be before end IP address');
    });
  });
});