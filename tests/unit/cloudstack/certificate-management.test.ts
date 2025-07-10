import { CloudStackClient } from '../../../src/cloudstack/client';
import { CloudStackEnvironment } from '../../../src/cloudstack/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CloudStackClient - Certificate Management Operations', () => {
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

  describe('issueCertificate', () => {
    it('should call issueCertificate API with correct parameters', async () => {
      const mockResponse = {
        data: {
          issuecertificateresponse: {
            jobid: 'job-123',
            jobstatus: 0
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'test-certificate',
        domainname: 'example.com',
        provider: 'letsencrypt',
        validityperiod: 90
      };

      const result = await client.issueCertificate(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=issueCertificate'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=test-certificate'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('domainname=example.com'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('provider=letsencrypt'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('validityperiod=90'));
      expect(result).toEqual(mockResponse.data.issuecertificateresponse);
    });

    it('should call issueCertificate API without optional parameters', async () => {
      const mockResponse = {
        data: {
          issuecertificateresponse: {
            jobid: 'job-124',
            jobstatus: 0
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'test-certificate',
        domainname: 'example.com',
        provider: 'letsencrypt'
      };

      const result = await client.issueCertificate(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=issueCertificate'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=test-certificate'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('domainname=example.com'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('provider=letsencrypt'));
      expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining('validityperiod='));
      expect(result).toEqual(mockResponse.data.issuecertificateresponse);
    });
  });

  describe('uploadCustomCertificate', () => {
    it('should call uploadCustomCertificate API with correct parameters', async () => {
      const mockResponse = {
        data: {
          uploadcustomcertificateresponse: {
            jobid: 'job-125',
            jobstatus: 0
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'custom-certificate',
        certificate: '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAL...\n-----END CERTIFICATE-----',
        privatekey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkq...\n-----END PRIVATE KEY-----',
        certchain: '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAL...\n-----END CERTIFICATE-----'
      };

      const result = await client.uploadCustomCertificate(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=uploadCustomCertificate'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=custom-certificate'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringMatching(/certificate=.*BEGIN%20CERTIFICATE/));
      expect(mockGet).toHaveBeenCalledWith(expect.stringMatching(/privatekey=.*BEGIN%20PRIVATE%20KEY/));
      expect(result).toEqual(mockResponse.data.uploadcustomcertificateresponse);
    });

    it('should call uploadCustomCertificate API without optional certchain', async () => {
      const mockResponse = {
        data: {
          uploadcustomcertificateresponse: {
            jobid: 'job-126',
            jobstatus: 0
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'custom-certificate',
        certificate: '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAL...\n-----END CERTIFICATE-----',
        privatekey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkq...\n-----END PRIVATE KEY-----'
      };

      const result = await client.uploadCustomCertificate(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=uploadCustomCertificate'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=custom-certificate'));
      expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining('certchain='));
      expect(result).toEqual(mockResponse.data.uploadcustomcertificateresponse);
    });
  });

  describe('revokeCertificate', () => {
    it('should call revokeCertificate API with correct parameters', async () => {
      const mockResponse = {
        data: {
          revokecertificateresponse: {
            jobid: 'job-127',
            jobstatus: 0
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = { id: 'cert-1' };
      const result = await client.revokeCertificate(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=revokeCertificate'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('id=cert-1'));
      expect(result).toEqual(mockResponse.data.revokecertificateresponse);
    });
  });

  describe('listCAProviders', () => {
    it('should call listCAProviders API', async () => {
      const mockResponse = {
        data: {
          listcaprovidersresponse: {
            caproviders: [
              {
                name: 'letsencrypt',
                description: 'Let\'s Encrypt Certificate Authority'
              },
              {
                name: 'custom-ca',
                description: 'Custom Certificate Authority'
              }
            ]
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.listCAProviders({});

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listCAProviders'));
      expect(result).toEqual(mockResponse.data.listcaprovidersresponse);
    });

    it('should handle empty CA providers response', async () => {
      const mockResponse = {
        data: {
          listcaprovidersresponse: {
            caproviders: []
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.listCAProviders({});

      expect(result.caproviders).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle API errors for issueCertificate', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 431,
          errortext: 'Certificate with specified name already exists'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.issueCertificate({
        name: 'duplicate-certificate',
        domainname: 'example.com',
        provider: 'letsencrypt'
      })).rejects.toThrow('CloudStack API Error (431): Certificate with specified name already exists');
    });

    it('should handle invalid domain name errors', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 400,
          errortext: 'Invalid domain name format'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.issueCertificate({
        name: 'test-certificate',
        domainname: 'invalid..domain',
        provider: 'letsencrypt'
      })).rejects.toThrow('CloudStack API Error (400): Invalid domain name format');
    });

    it('should handle invalid certificate format errors', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 400,
          errortext: 'Invalid certificate format'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.uploadCustomCertificate({
        name: 'test-certificate',
        certificate: 'invalid-certificate-content',
        privatekey: 'invalid-private-key-content'
      })).rejects.toThrow('CloudStack API Error (400): Invalid certificate format');
    });

    it('should handle certificate not found errors', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 404,
          errortext: 'Certificate not found'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.revokeCertificate({
        id: 'non-existent-cert'
      })).rejects.toThrow('CloudStack API Error (404): Certificate not found');
    });

    it('should handle missing required parameters', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 400,
          errortext: 'Missing required parameter: domainname'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.issueCertificate({
        name: 'test-certificate',
        provider: 'letsencrypt'
      })).rejects.toThrow('CloudStack API Error (400): Missing required parameter: domainname');
    });

    it('should handle unsupported CA provider errors', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 400,
          errortext: 'Unsupported CA provider: invalid-provider'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.issueCertificate({
        name: 'test-certificate',
        domainname: 'example.com',
        provider: 'invalid-provider'
      })).rejects.toThrow('CloudStack API Error (400): Unsupported CA provider: invalid-provider');
    });
  });
});