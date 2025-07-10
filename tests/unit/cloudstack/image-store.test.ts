import { CloudStackClient } from '../../../src/cloudstack/client';
import { CloudStackEnvironment } from '../../../src/cloudstack/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CloudStackClient - Image Store Operations', () => {
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

  describe('addImageStore', () => {
    it('should call addImageStore API with correct parameters', async () => {
      const mockResponse = {
        data: {
          addimagestoreresponse: {
            imagestore: {
              id: 'store-1',
              name: 'test-store',
              url: 'nfs://test.com/storage',
              providername: 'NFS',
              protocol: 'nfs'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'test-store',
        url: 'nfs://test.com/storage',
        provider: 'NFS'
      };

      const result = await client.addImageStore(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=addImageStore'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=test-store'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('url=nfs%3A%2F%2Ftest.com%2Fstorage'));
      expect(result).toEqual(mockResponse.data.addimagestoreresponse);
    });
  });

  describe('addImageStoreS3', () => {
    it('should call addImageStoreS3 API with correct parameters', async () => {
      const mockResponse = {
        data: {
          addimagestoresponse: {
            imagestore: {
              id: 'store-s3-1',
              name: 'test-s3-store',
              url: 's3://test-bucket',
              providername: 'S3',
              protocol: 's3'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'test-s3-store',
        bucket: 'test-bucket',
        accesskey: 'AKIAIOSFODNN7EXAMPLE',
        secretkey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      };

      const result = await client.addImageStoreS3(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=addImageStoreS3'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=test-s3-store'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('bucket=test-bucket'));
      expect(result).toEqual(mockResponse.data.addimagestoresponse);
    });
  });

  describe('addSwift', () => {
    it('should call addSwift API with correct parameters', async () => {
      const mockResponse = {
        data: {
          addswiftresponse: {
            imagestore: {
              id: 'store-swift-1',
              name: 'test-swift-store',
              url: 'swift://swift.example.com',
              providername: 'Swift',
              protocol: 'swift'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'test-swift-store',
        url: 'swift://swift.example.com',
        account: 'test-account',
        username: 'test-user',
        key: 'test-key'
      };

      const result = await client.addSwift(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=addSwift'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=test-swift-store'));
      expect(result).toEqual(mockResponse.data.addswiftresponse);
    });
  });

  describe('deleteImageStore', () => {
    it('should call deleteImageStore API with correct parameters', async () => {
      const mockResponse = {
        data: {
          deleteimagestoresponse: {
            success: true
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = { id: 'store-1' };
      const result = await client.deleteImageStore(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=deleteImageStore'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('id=store-1'));
      expect(result).toEqual(mockResponse.data.deleteimagestoresponse);
    });
  });

  describe('listImageStores', () => {
    it('should call listImageStores API with correct parameters', async () => {
      const mockResponse = {
        data: {
          listimagestoresresponse: {
            imagestore: [
              {
                id: 'store-1',
                name: 'nfs-store',
                url: 'nfs://test.com/storage',
                providername: 'NFS',
                protocol: 'nfs'
              },
              {
                id: 'store-2',
                name: 's3-store',
                url: 's3://test-bucket',
                providername: 'S3',
                protocol: 's3'
              }
            ]
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = { provider: 'NFS' };
      const result = await client.listImageStores(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listImageStores'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('provider=NFS'));
      expect(result).toEqual(mockResponse.data.listimagestoresresponse);
    });

    it('should call listImageStores API without parameters', async () => {
      const mockResponse = {
        data: {
          listimagestoresresponse: {
            imagestore: []
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.listImageStores({});

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listImageStores'));
      expect(result).toEqual(mockResponse.data.listimagestoresresponse);
    });
  });

  describe('updateImageStore', () => {
    it('should call updateImageStore API with correct parameters', async () => {
      const mockResponse = {
        data: {
          updateimagestoresponse: {
            imagestore: {
              id: 'store-1',
              name: 'updated-store',
              url: 'nfs://updated.com/storage',
              providername: 'NFS',
              protocol: 'nfs'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'store-1',
        name: 'updated-store',
        url: 'nfs://updated.com/storage'
      };

      const result = await client.updateImageStore(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=updateImageStore'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('id=store-1'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=updated-store'));
      expect(result).toEqual(mockResponse.data.updateimagestoresponse);
    });
  });

  describe('error handling', () => {
    it('should handle API errors for addImageStore', async () => {
      const mockErrorResponse = {
        data: {
          errorcode: 431,
          errortext: 'Image store with specified name already exists'
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse);
      (client as any).httpClient.get = mockGet;

      await expect(client.addImageStore({
        name: 'duplicate-store',
        url: 'nfs://test.com/storage',
        provider: 'NFS'
      })).rejects.toThrow('CloudStack API Error (431): Image store with specified name already exists');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      const mockGet = jest.fn().mockRejectedValue(networkError);
      (client as any).httpClient.get = mockGet;

      await expect(client.listImageStores({})).rejects.toThrow('Network Error');
    });
  });
});