import { TestFramework } from '../helpers/TestFramework';

// Mock all dependencies
jest.mock('../../src/cloudstack/client');
jest.mock('../../src/utils/config');
jest.mock('../../src/utils/logger', () => ({
  Logger: {
    getInstance: jest.fn().mockReturnValue({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Storage Operations - Comprehensive Test Suite', () => {
  let testFramework: TestFramework;
  let server: any;

  beforeEach(async () => {
    testFramework = new TestFramework();
    
    // Import server after mocks are set up
    const { CloudStackMCPServer } = await import('../../src/server');
    server = new (CloudStackMCPServer as any)();
    
    // Replace the mocked dependencies
    (server as any).client = testFramework.mockClient;
    (server as any).configManager = testFramework.mockConfigManager;
  });

  afterEach(() => {
    testFramework.resetMocks();
  });

  describe('Volume Management Operations', () => {
    describe('create_volume', () => {
      it('should create volume successfully with required parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse('create-vol-job-123');
        testFramework.mockClient.createVolume.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-volume',
          diskofferingid: 'disk-offering-123',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleCreateVolume(params);

        expect(testFramework.mockClient.createVolume).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response, 'Volume creation');
      });

      it('should create volume with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createVolume.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-volume',
          diskofferingid: 'disk-offering-123',
          zoneid: 'zone-123',
          size: 100,
          account: 'test-account',
          domainid: 'domain-123',
          displaytext: 'Test volume description'
        };

        const response = await (server as any).handleCreateVolume(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when name is missing', async () => {
        const params = {
          diskofferingid: 'disk-offering-123',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateVolume(params),
          'Missing required parameter: name'
        );
      });

      it('should fail when disk offering ID is missing', async () => {
        const params = {
          name: 'test-volume',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateVolume(params),
          'Missing required parameter: diskofferingid'
        );
      });

      it('should fail when zone ID is missing', async () => {
        const params = {
          name: 'test-volume',
          diskofferingid: 'disk-offering-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateVolume(params),
          'Missing required parameter: zoneid'
        );
      });
    });

    describe('list_volumes', () => {
      it('should list volumes successfully', async () => {
        const response = await (server as any).handleListVolumes({});

        expect(testFramework.mockClient.listVolumes).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list volumes with filtering parameters', async () => {
        const params = {
          virtualmachineid: 'vm-123',
          type: 'ROOT',
          state: 'Ready',
          account: 'test-account',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleListVolumes(params);

        expect(testFramework.mockClient.listVolumes).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('attach_volume', () => {
      it('should attach volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.attachVolume.mockResolvedValue(mockResponse);

        const params = {
          id: 'vol-123',
          virtualmachineid: 'vm-456'
        };

        const response = await (server as any).handleAttachVolume(params);

        expect(testFramework.mockClient.attachVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume attachment');
      });

      it('should attach volume with device ID', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.attachVolume.mockResolvedValue(mockResponse);

        const params = {
          id: 'vol-123',
          virtualmachineid: 'vm-456',
          deviceid: 1
        };

        const response = await (server as any).handleAttachVolume(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when volume ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleAttachVolume({ virtualmachineid: 'vm-456' }),
          'Volume ID is required'
        );
      });

      it('should fail when VM ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleAttachVolume({ id: 'vol-123' }),
          'Virtual machine ID is required'
        );
      });
    });

    describe('detach_volume', () => {
      it('should detach volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.detachVolume.mockResolvedValue(mockResponse);

        const params = { id: 'vol-123' };
        const response = await (server as any).handleDetachVolume(params);

        expect(testFramework.mockClient.detachVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume detachment');
      });

      it('should fail when volume ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDetachVolume({}),
          'Volume ID is required'
        );
      });
    });

    describe('delete_volume', () => {
      it('should delete volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteVolume.mockResolvedValue(mockResponse);

        const params = { id: 'vol-123' };
        const response = await (server as any).handleDeleteVolume(params);

        expect(testFramework.mockClient.deleteVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume deletion');
      });

      it('should handle CloudStack API errors', async () => {
        const error = testFramework.createErrorResponse(431, 'Volume is attached to a VM');
        testFramework.mockClient.deleteVolume.mockRejectedValue(error);

        await testFramework.expectError(
          () => (server as any).handleDeleteVolume({ id: 'vol-attached' }),
          'Volume is attached'
        );
      });
    });

    describe('resize_volume', () => {
      it('should resize volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.resizeVolume.mockResolvedValue(mockResponse);

        const params = {
          id: 'vol-123',
          size: 200
        };

        const response = await (server as any).handleResizeVolume(params);

        expect(testFramework.mockClient.resizeVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume resize');
      });

      it('should resize volume with disk offering change', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.resizeVolume.mockResolvedValue(mockResponse);

        const params = {
          id: 'vol-123',
          diskofferingid: 'new-disk-offering-456'
        };

        const response = await (server as any).handleResizeVolume(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when volume ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleResizeVolume({ size: 200 }),
          'Volume ID is required'
        );
      });
    });

    describe('update_volume', () => {
      it('should update volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateVolume.mockResolvedValue(mockResponse);

        const params = {
          id: 'vol-123',
          name: 'updated-volume-name',
          displaytext: 'Updated description'
        };

        const response = await (server as any).handleUpdateVolume(params);

        expect(testFramework.mockClient.updateVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume update');
      });
    });

    describe('migrate_volume', () => {
      it('should migrate volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.migrateVolume.mockResolvedValue(mockResponse);

        const params = {
          volumeid: 'vol-123',
          storageid: 'storage-456'
        };

        const response = await (server as any).handleMigrateVolume(params);

        expect(testFramework.mockClient.migrateVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume migration');
      });

      it('should fail when volume ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleMigrateVolume({ storageid: 'storage-456' }),
          'Volume ID is required'
        );
      });

      it('should fail when storage ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleMigrateVolume({ volumeid: 'vol-123' }),
          'Storage ID is required'
        );
      });
    });

    describe('extract_volume', () => {
      it('should extract volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.extractVolume.mockResolvedValue(mockResponse);

        const params = {
          id: 'vol-123',
          mode: 'HTTP_DOWNLOAD',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleExtractVolume(params);

        expect(testFramework.mockClient.extractVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume extraction');
      });
    });

    describe('upload_volume', () => {
      it('should upload volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.uploadVolume.mockResolvedValue(mockResponse);

        const params = {
          name: 'uploaded-volume',
          url: 'https://example.com/volume.img',
          zoneid: 'zone-123',
          format: 'VHD',
          diskofferingid: 'disk-offering-123'
        };

        const response = await (server as any).handleUploadVolume(params);

        expect(testFramework.mockClient.uploadVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume upload');
      });
    });
  });

  describe('Snapshot Operations', () => {
    describe('create_snapshot', () => {
      it('should create snapshot successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createSnapshot.mockResolvedValue(mockResponse);

        const params = {
          volumeid: 'vol-123',
          name: 'test-snapshot'
        };

        const response = await (server as any).handleCreateSnapshot(params);

        expect(testFramework.mockClient.createSnapshot).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Snapshot creation');
      });

      it('should create snapshot with policy', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createSnapshot.mockResolvedValue(mockResponse);

        const params = {
          volumeid: 'vol-123',
          policyid: 'policy-456'
        };

        const response = await (server as any).handleCreateSnapshot(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when volume ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateSnapshot({ name: 'test-snapshot' }),
          'Volume ID is required'
        );
      });
    });

    describe('list_snapshots', () => {
      it('should list snapshots successfully', async () => {
        const response = await (server as any).handleListSnapshots({});

        expect(testFramework.mockClient.listSnapshots).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list snapshots with filtering', async () => {
        const params = {
          volumeid: 'vol-123',
          snapshottype: 'MANUAL',
          intervaltype: 'DAILY'
        };

        const response = await (server as any).handleListSnapshots(params);

        expect(testFramework.mockClient.listSnapshots).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('delete_snapshot', () => {
      it('should delete snapshot successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteSnapshot.mockResolvedValue(mockResponse);

        const params = { id: 'snap-123' };
        const response = await (server as any).handleDeleteSnapshot(params);

        expect(testFramework.mockClient.deleteSnapshot).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Snapshot deletion');
      });

      it('should fail when snapshot ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteSnapshot({}),
          'Snapshot ID is required'
        );
      });
    });

    describe('create_volume_from_snapshot', () => {
      it('should create volume from snapshot successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createVolumeFromSnapshot.mockResolvedValue(mockResponse);

        const params = {
          snapshotid: 'snap-123',
          name: 'volume-from-snapshot'
        };

        const response = await (server as any).handleCreateVolumeFromSnapshot(params);

        expect(testFramework.mockClient.createVolumeFromSnapshot).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume creation from snapshot');
      });

      it('should fail when snapshot ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateVolumeFromSnapshot({ name: 'volume-from-snapshot' }),
          'Snapshot ID is required'
        );
      });
    });
  });

  describe('Advanced Storage Operations', () => {
    describe('assign_volume', () => {
      it('should assign volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.assignVolume.mockResolvedValue(mockResponse);

        const params = {
          volumeid: 'vol-123',
          account: 'target-account',
          domainid: 'domain-456'
        };

        const response = await (server as any).handleAssignVolume(params);

        expect(testFramework.mockClient.assignVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume assignment');
      });
    });

    describe('recover_volume', () => {
      it('should recover volume successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.recoverVolume.mockResolvedValue(mockResponse);

        const params = { id: 'vol-123' };
        const response = await (server as any).handleRecoverVolume(params);

        expect(testFramework.mockClient.recoverVolume).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume recovery');
      });
    });

    describe('change_volume_offering', () => {
      it('should change volume offering successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.changeVolumeOffering.mockResolvedValue(mockResponse);

        const params = {
          id: 'vol-123',
          diskofferingid: 'new-offering-456'
        };

        const response = await (server as any).handleChangeVolumeOffering(params);

        expect(testFramework.mockClient.changeVolumeOffering).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Volume offering change');
      });

      it('should fail when volume ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleChangeVolumeOffering({ diskofferingid: 'new-offering-456' }),
          'Volume ID is required'
        );
      });

      it('should fail when disk offering ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleChangeVolumeOffering({ id: 'vol-123' }),
          'Disk offering ID is required'
        );
      });
    });

    describe('list_volume_metrics', () => {
      it('should list volume metrics successfully', async () => {
        const response = await (server as any).handleListVolumeMetrics({});

        expect(testFramework.mockClient.listVolumeMetrics).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list volume metrics with filtering', async () => {
        const params = {
          zoneid: 'zone-123',
          account: 'test-account'
        };

        const response = await (server as any).handleListVolumeMetrics(params);

        expect(testFramework.mockClient.listVolumeMetrics).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle volume already attached errors', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Volume is already attached to another virtual machine'
      );
      testFramework.mockClient.attachVolume.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleAttachVolume({ id: 'vol-123', virtualmachineid: 'vm-456' }),
        'already attached'
      );
    });

    it('should handle insufficient storage capacity', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Insufficient storage capacity for the requested volume size'
      );
      testFramework.mockClient.createVolume.mockRejectedValue(error);

      const params = {
        name: 'large-volume',
        diskofferingid: 'disk-offering-123',
        zoneid: 'zone-123',
        size: 10000
      };

      await testFramework.expectError(
        () => (server as any).handleCreateVolume(params),
        'Insufficient storage capacity'
      );
    });

    it('should handle snapshot creation failures', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot create snapshot while VM is in transition'
      );
      testFramework.mockClient.createSnapshot.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleCreateSnapshot({ volumeid: 'vol-transitioning' }),
        'Cannot create snapshot'
      );
    });

    it('should handle volume migration constraints', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot migrate ROOT volume while VM is running'
      );
      testFramework.mockClient.migrateVolume.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleMigrateVolume({ 
          volumeid: 'vol-root', 
          storageid: 'storage-456' 
        }),
        'Cannot migrate ROOT volume'
      );
    });

    it('should handle permission errors for volume operations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to volume resource'
      );
      testFramework.mockClient.deleteVolume.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteVolume({ id: 'vol-restricted' }),
        'Access denied'
      );
    });

    it('should handle network timeouts during upload', async () => {
      const timeoutError = new Error('Upload timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      testFramework.mockClient.uploadVolume.mockRejectedValue(timeoutError);

      const params = {
        name: 'uploaded-volume',
        url: 'https://slow-server.com/volume.img',
        zoneid: 'zone-123',
        format: 'VHD',
        diskofferingid: 'disk-offering-123'
      };

      await testFramework.expectError(
        () => (server as any).handleUploadVolume(params),
        'Upload timeout'
      );
    });
  });
});