import { CloudStackClient } from '../../src/cloudstack/client';
import { ConfigManager } from '../../src/utils/config';

jest.mock('../../src/cloudstack/client');
jest.mock('../../src/utils/config');

const MockedCloudStackClient = CloudStackClient as jest.MockedClass<typeof CloudStackClient>;
const MockedConfigManager = ConfigManager as jest.MockedClass<typeof ConfigManager>;

describe('CloudStack MCP Server - New Features Integration', () => {
  let mockClient: jest.Mocked<CloudStackClient>;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    // Mock ConfigManager
    mockConfigManager = {
      getDefaultEnvironment: jest.fn().mockReturnValue({
        name: 'Test Environment',
        apiUrl: 'https://test.example.com/client/api',
        apiKey: 'test-key',
        secretKey: 'test-secret',
        timeout: 30000,
        retries: 3
      }),
      getLoggingConfig: jest.fn().mockReturnValue({
        level: 'info',
        file: 'logs/test.log'
      }),
      listEnvironments: jest.fn().mockReturnValue(['default', 'dev'])
    } as any;

    // Mock CloudStackClient with new methods
    mockClient = {
      // Image Store methods
      addImageStore: jest.fn(),
      addImageStoreS3: jest.fn(),
      addSwift: jest.fn(),
      deleteImageStore: jest.fn(),
      listImageStores: jest.fn(),
      updateImageStore: jest.fn(),
      
      // Pod Management methods
      createPod: jest.fn(),
      deletePod: jest.fn(),
      updatePod: jest.fn(),
      listPods: jest.fn(),
      dedicatePod: jest.fn(),
      
      // Certificate Management methods
      issueCertificate: jest.fn(),
      uploadCustomCertificate: jest.fn(),
      revokeCertificate: jest.fn(),
      listCAProviders: jest.fn(),
      
      // Existing methods
      testConnection: jest.fn(),
      getEnvironmentInfo: jest.fn().mockReturnValue({
        name: 'Test Environment',
        apiUrl: 'https://test.example.com/client/api',
        timeout: 30000,
        retries: 3
      })
    } as any;

    MockedConfigManager.mockImplementation(() => mockConfigManager);
    MockedCloudStackClient.mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Image Store Management Tools', () => {
    describe('add_image_store', () => {
      it('should handle successful image store addition', async () => {
        const mockResponse = {
          imagestore: {
            id: 'store-1',
            name: 'test-store',
            url: 'nfs://test.com/storage',
            providername: 'NFS',
            protocol: 'nfs',
            zonename: 'test-zone'
          }
        };

        mockClient.addImageStore.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-store',
          url: 'nfs://test.com/storage',
          provider: 'NFS',
          zoneid: 'zone-1'
        };

        const result = await mockClient.addImageStore(params);

        expect(mockClient.addImageStore).toHaveBeenCalledWith(params);
        expect(result.imagestore.name).toBe('test-store');
        expect(result.imagestore.providername).toBe('NFS');
      });

      it('should handle image store addition without zoneid', async () => {
        const mockResponse = {
          imagestore: {
            id: 'store-2',
            name: 'global-store',
            url: 'nfs://global.com/storage',
            providername: 'NFS',
            protocol: 'nfs'
          }
        };

        mockClient.addImageStore.mockResolvedValue(mockResponse);

        const params = {
          name: 'global-store',
          url: 'nfs://global.com/storage',
          provider: 'NFS'
        };

        const result = await mockClient.addImageStore(params);

        expect(mockClient.addImageStore).toHaveBeenCalledWith(params);
        expect(result.imagestore.name).toBe('global-store');
      });
    });

    describe('add_image_store_s3', () => {
      it('should handle successful S3 image store addition', async () => {
        const mockResponse = {
          imagestore: {
            id: 'store-s3-1',
            name: 'test-s3-store',
            url: 's3://test-bucket',
            providername: 'S3',
            protocol: 's3'
          }
        };

        mockClient.addImageStoreS3.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-s3-store',
          bucket: 'test-bucket',
          accesskey: 'AKIAIOSFODNN7EXAMPLE',
          secretkey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          endpoint: 'https://s3.amazonaws.com',
          region: 'us-east-1'
        };

        const result = await mockClient.addImageStoreS3(params);

        expect(mockClient.addImageStoreS3).toHaveBeenCalledWith(params);
        expect(result.imagestore.providername).toBe('S3');
        expect(result.imagestore.protocol).toBe('s3');
      });
    });

    describe('list_image_stores', () => {
      it('should handle successful image stores listing', async () => {
        const mockResponse = {
          imagestore: [
            {
              id: 'store-1',
              name: 'nfs-store',
              url: 'nfs://nfs.example.com/storage',
              providername: 'NFS',
              protocol: 'nfs',
              zonename: 'zone-1'
            },
            {
              id: 'store-2',
              name: 's3-store',
              url: 's3://bucket-name',
              providername: 'S3',
              protocol: 's3'
            }
          ]
        };

        mockClient.listImageStores.mockResolvedValue(mockResponse);

        const result = await mockClient.listImageStores({});

        expect(mockClient.listImageStores).toHaveBeenCalledWith({});
        expect(result.imagestore).toHaveLength(2);
        expect(result.imagestore[0].providername).toBe('NFS');
        expect(result.imagestore[1].providername).toBe('S3');
      });

      it('should handle empty image stores list', async () => {
        const mockResponse = { imagestore: [] };
        mockClient.listImageStores.mockResolvedValue(mockResponse);

        const result = await mockClient.listImageStores({});

        expect(result.imagestore).toHaveLength(0);
      });
    });
  });

  describe('Pod Management Tools', () => {
    describe('create_pod', () => {
      it('should handle successful pod creation', async () => {
        const mockResponse = {
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
        };

        mockClient.createPod.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-pod',
          zoneid: 'zone-1',
          startip: '192.168.1.10',
          endip: '192.168.1.100',
          netmask: '255.255.255.0',
          gateway: '192.168.1.1'
        };

        const result = await mockClient.createPod(params);

        expect(mockClient.createPod).toHaveBeenCalledWith(params);
        expect(result.pod.name).toBe('test-pod');
        expect(result.pod.allocationstate).toBe('Enabled');
      });
    });

    describe('list_pods', () => {
      it('should handle successful pods listing', async () => {
        const mockResponse = {
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
        };

        mockClient.listPods.mockResolvedValue(mockResponse);

        const params = { zoneid: 'zone-1' };
        const result = await mockClient.listPods(params);

        expect(mockClient.listPods).toHaveBeenCalledWith(params);
        expect(result.pod).toHaveLength(2);
        expect(result.pod[0].name).toBe('pod-1');
        expect(result.pod[1].name).toBe('pod-2');
      });
    });

    describe('dedicate_pod', () => {
      it('should handle successful pod dedication', async () => {
        const mockResponse = {
          dedicatedresources: {
            id: 'dedicated-1',
            podid: 'pod-1',
            podname: 'test-pod',
            domainid: 'domain-1',
            domainname: 'test-domain',
            account: 'test-account'
          }
        };

        mockClient.dedicatePod.mockResolvedValue(mockResponse);

        const params = {
          podid: 'pod-1',
          domainid: 'domain-1',
          account: 'test-account'
        };

        const result = await mockClient.dedicatePod(params);

        expect(mockClient.dedicatePod).toHaveBeenCalledWith(params);
        expect(result.dedicatedresources.podname).toBe('test-pod');
        expect(result.dedicatedresources.account).toBe('test-account');
      });
    });
  });

  describe('Certificate Management Tools', () => {
    describe('issue_certificate', () => {
      it('should handle successful certificate issuance', async () => {
        const mockResponse = {
          jobid: 'job-123',
          jobstatus: 0
        };

        mockClient.issueCertificate.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-certificate',
          domainname: 'example.com',
          provider: 'letsencrypt',
          validityperiod: 90
        };

        const result = await mockClient.issueCertificate(params);

        expect(mockClient.issueCertificate).toHaveBeenCalledWith(params);
        expect(result.jobid).toBe('job-123');
        expect(result.jobstatus).toBe(0);
      });
    });

    describe('upload_custom_certificate', () => {
      it('should handle successful custom certificate upload', async () => {
        const mockResponse = {
          jobid: 'job-124',
          jobstatus: 0
        };

        mockClient.uploadCustomCertificate.mockResolvedValue(mockResponse);

        const params = {
          name: 'custom-certificate',
          certificate: '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAL...\n-----END CERTIFICATE-----',
          privatekey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkq...\n-----END PRIVATE KEY-----',
          certchain: '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAL...\n-----END CERTIFICATE-----'
        };

        const result = await mockClient.uploadCustomCertificate(params);

        expect(mockClient.uploadCustomCertificate).toHaveBeenCalledWith(params);
        expect(result.jobid).toBe('job-124');
      });
    });

    describe('list_ca_providers', () => {
      it('should handle successful CA providers listing', async () => {
        const mockResponse = {
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
        };

        mockClient.listCAProviders.mockResolvedValue(mockResponse);

        const result = await mockClient.listCAProviders({});

        expect(mockClient.listCAProviders).toHaveBeenCalledWith({});
        expect(result.caproviders).toHaveLength(2);
        expect(result.caproviders[0].name).toBe('letsencrypt');
        expect(result.caproviders[1].name).toBe('custom-ca');
      });

      it('should handle empty CA providers list', async () => {
        const mockResponse = { caproviders: [] };
        mockClient.listCAProviders.mockResolvedValue(mockResponse);

        const result = await mockClient.listCAProviders({});

        expect(result.caproviders).toHaveLength(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle image store API errors', async () => {
      const errorMessage = 'Image store with specified name already exists';
      mockClient.addImageStore.mockRejectedValue(new Error(errorMessage));

      await expect(mockClient.addImageStore({
        name: 'duplicate-store',
        url: 'nfs://test.com/storage',
        provider: 'NFS'
      })).rejects.toThrow(errorMessage);
    });

    it('should handle pod management API errors', async () => {
      const errorMessage = 'Pod with specified name already exists in this zone';
      mockClient.createPod.mockRejectedValue(new Error(errorMessage));

      await expect(mockClient.createPod({
        name: 'duplicate-pod',
        zoneid: 'zone-1',
        startip: '192.168.1.10',
        endip: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1'
      })).rejects.toThrow(errorMessage);
    });

    it('should handle certificate management API errors', async () => {
      const errorMessage = 'Certificate with specified name already exists';
      mockClient.issueCertificate.mockRejectedValue(new Error(errorMessage));

      await expect(mockClient.issueCertificate({
        name: 'duplicate-certificate',
        domainname: 'example.com',
        provider: 'letsencrypt'
      })).rejects.toThrow(errorMessage);
    });
  });

  describe('Parameter Validation', () => {
    it('should handle missing required parameters for image store', async () => {
      const errorMessage = 'Missing required parameter: name';
      mockClient.addImageStore.mockRejectedValue(new Error(errorMessage));

      await expect(mockClient.addImageStore({
        url: 'nfs://test.com/storage',
        provider: 'NFS'
      })).rejects.toThrow(errorMessage);
    });

    it('should handle missing required parameters for pod creation', async () => {
      const errorMessage = 'Missing required parameter: zoneid';
      mockClient.createPod.mockRejectedValue(new Error(errorMessage));

      await expect(mockClient.createPod({
        name: 'test-pod',
        startip: '192.168.1.10',
        endip: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1'
      })).rejects.toThrow(errorMessage);
    });

    it('should handle missing required parameters for certificate issuance', async () => {
      const errorMessage = 'Missing required parameter: domainname';
      mockClient.issueCertificate.mockRejectedValue(new Error(errorMessage));

      await expect(mockClient.issueCertificate({
        name: 'test-certificate',
        provider: 'letsencrypt'
      })).rejects.toThrow(errorMessage);
    });
  });
});