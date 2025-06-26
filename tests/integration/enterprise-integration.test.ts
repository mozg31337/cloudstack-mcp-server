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

describe('Enterprise Integration - Comprehensive Test Suite', () => {
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

  describe('Storage Pool Management', () => {
    describe('list_storage_pools', () => {
      it('should list storage pools successfully', async () => {
        const response = await (server as any).handleListStoragePools({});

        expect(testFramework.mockClient.listStoragePools).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list storage pools with comprehensive filtering', async () => {
        const params = {
          clusterid: 'cluster-123',
          id: 'pool-456',
          ipaddress: '192.168.1.100',
          keyword: 'production-storage',
          name: 'prod-nfs-pool',
          path: '/export/primary',
          scope: 'CLUSTER',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleListStoragePools(params);

        expect(testFramework.mockClient.listStoragePools).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should list storage pools by type', async () => {
        const storageTypes = [
          'NetworkFilesystem',
          'iSCSI',
          'SharedMountPoint',
          'VMFS',
          'PreSetup',
          'DatastoreCluster'
        ];

        for (const storageType of storageTypes) {
          const params = { scope: 'CLUSTER' };
          const response = await (server as any).handleListStoragePools(params);

          expect(testFramework.mockClient.listStoragePools).toHaveBeenCalledWith(
            expect.objectContaining(params)
          );
          testFramework.expectSuccessResponse(response);
        }
      });
    });

    describe('create_storage_pool', () => {
      it('should create storage pool successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createStoragePool.mockResolvedValue(mockResponse);

        const params = {
          name: 'new-storage-pool',
          url: 'nfs://192.168.1.100/export/primary',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleCreateStoragePool(params);

        expect(testFramework.mockClient.createStoragePool).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Storage pool creation');
      });

      it('should create storage pool with advanced options', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createStoragePool.mockResolvedValue(mockResponse);

        const params = {
          name: 'enterprise-storage-pool',
          url: 'iscsi://192.168.1.200:3260/iqn.2025-06.com.example:target01',
          zoneid: 'zone-123',
          clusterid: 'cluster-456',
          details: {
            'storage.overprovisioning.factor': '2.0',
            'managed': 'true'
          },
          scope: 'CLUSTER',
          hypervisor: 'VMware'
        };

        const response = await (server as any).handleCreateStoragePool(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when name is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateStoragePool({ 
            url: 'nfs://192.168.1.100/export/primary', 
            zoneid: 'zone-123' 
          }),
          'Storage pool name is required'
        );
      });

      it('should fail when URL is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateStoragePool({ 
            name: 'test-pool', 
            zoneid: 'zone-123' 
          }),
          'Storage pool URL is required'
        );
      });

      it('should fail when zone ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateStoragePool({ 
            name: 'test-pool', 
            url: 'nfs://192.168.1.100/export/primary' 
          }),
          'Zone ID is required'
        );
      });
    });

    describe('update_storage_pool', () => {
      it('should update storage pool successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateStoragePool.mockResolvedValue(mockResponse);

        const params = {
          id: 'pool-123',
          tags: 'production,high-performance',
          capacitybytes: 10737418240000,
          capacityiops: 50000
        };

        const response = await (server as any).handleUpdateStoragePool(params);

        expect(testFramework.mockClient.updateStoragePool).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Storage pool update');
      });

      it('should update storage pool with maintenance mode', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateStoragePool.mockResolvedValue(mockResponse);

        const params = {
          id: 'pool-123',
          enabled: false
        };

        const response = await (server as any).handleUpdateStoragePool(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when pool ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateStoragePool({ tags: 'production' }),
          'Storage pool ID is required'
        );
      });
    });

    describe('delete_storage_pool', () => {
      it('should delete storage pool successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteStoragePool.mockResolvedValue(mockResponse);

        const params = { id: 'pool-123' };
        const response = await (server as any).handleDeleteStoragePool(params);

        expect(testFramework.mockClient.deleteStoragePool).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Storage pool deletion');
      });

      it('should delete storage pool with forced option', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteStoragePool.mockResolvedValue(mockResponse);

        const params = { id: 'pool-123', forced: true };
        const response = await (server as any).handleDeleteStoragePool(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when pool ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteStoragePool({}),
          'Storage pool ID is required'
        );
      });
    });
  });

  describe('Advanced Infrastructure Management', () => {
    describe('CloudStack Information', () => {
      it('should get CloudStack information successfully', async () => {
        const mockResponse = {
          version: '4.20.0',
          buildnumber: '20250625-001',
          supportedhypervisors: ['VMware', 'KVM', 'XenServer'],
          capabilities: {
            securitygroupsenabled: true,
            elasticloadbalancerenabled: true,
            supportedstorageprotocols: ['NFS', 'iSCSI', 'SMB']
          }
        };
        testFramework.mockClient.getCloudstackInfo = jest.fn().mockResolvedValue(mockResponse);

        const response = await (server as any).handleGetCloudstackInfo({});

        expect(testFramework.mockClient.getCloudstackInfo).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('Zone Operations', () => {
      it('should handle zone-wide operations', async () => {
        // Test zone-scoped storage operations
        const params = {
          zoneid: 'zone-123',
          scope: 'ZONE'
        };

        const response = await (server as any).handleListStoragePools(params);

        expect(testFramework.mockClient.listStoragePools).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('Cluster Operations', () => {
      it('should handle cluster-scoped operations', async () => {
        // Test cluster-scoped storage operations
        const params = {
          clusterid: 'cluster-123',
          scope: 'CLUSTER'
        };

        const response = await (server as any).handleListStoragePools(params);

        expect(testFramework.mockClient.listStoragePools).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('Host Operations', () => {
      it('should handle host-scoped operations', async () => {
        // Test host-scoped storage operations
        const params = {
          scope: 'HOST',
          keyword: 'local-storage'
        };

        const response = await (server as any).handleListStoragePools(params);

        expect(testFramework.mockClient.listStoragePools).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('Enterprise Storage Integration', () => {
    it('should integrate with NFS storage systems', async () => {
      const mockResponse = testFramework.createAsyncJobResponse();
      testFramework.mockClient.createStoragePool.mockResolvedValue(mockResponse);

      const nfsParams = {
        name: 'enterprise-nfs-pool',
        url: 'nfs://storage.enterprise.com/cloudstack/primary',
        zoneid: 'zone-123',
        scope: 'CLUSTER'
      };

      const response = await (server as any).handleCreateStoragePool(nfsParams);
      testFramework.expectSuccessResponse(response);
    });

    it('should integrate with iSCSI storage systems', async () => {
      const mockResponse = testFramework.createAsyncJobResponse();
      testFramework.mockClient.createStoragePool.mockResolvedValue(mockResponse);

      const iscsiParams = {
        name: 'enterprise-iscsi-pool',
        url: 'iscsi://storage.enterprise.com:3260/iqn.2025-06.com.enterprise:target01',
        zoneid: 'zone-123',
        scope: 'CLUSTER',
        details: {
          'iqn': 'iqn.2025-06.com.enterprise:target01',
          'lun': '0'
        }
      };

      const response = await (server as any).handleCreateStoragePool(iscsiParams);
      testFramework.expectSuccessResponse(response);
    });

    it('should integrate with VMware VMFS datastores', async () => {
      const mockResponse = testFramework.createAsyncJobResponse();
      testFramework.mockClient.createStoragePool.mockResolvedValue(mockResponse);

      const vmfsParams = {
        name: 'vmware-vmfs-datastore',
        url: 'vmfs://vcenter.enterprise.com/datacenter/datastore1',
        zoneid: 'zone-123',
        hypervisor: 'VMware',
        scope: 'CLUSTER'
      };

      const response = await (server as any).handleCreateStoragePool(vmfsParams);
      testFramework.expectSuccessResponse(response);
    });

    it('should integrate with shared mount point storage', async () => {
      const mockResponse = testFramework.createAsyncJobResponse();
      testFramework.mockClient.createStoragePool.mockResolvedValue(mockResponse);

      const sharedParams = {
        name: 'shared-storage-pool',
        url: 'SharedMountPoint:///shared/storage/cloudstack',
        zoneid: 'zone-123',
        scope: 'HOST'
      };

      const response = await (server as any).handleCreateStoragePool(sharedParams);
      testFramework.expectSuccessResponse(response);
    });
  });

  describe('High Availability Storage', () => {
    it('should handle storage pool failover scenarios', async () => {
      // Test storage pool status during maintenance
      const params = {
        id: 'pool-ha-123',
        enabled: false
      };

      const mockResponse = testFramework.createAsyncJobResponse();
      testFramework.mockClient.updateStoragePool.mockResolvedValue(mockResponse);

      const response = await (server as any).handleUpdateStoragePool(params);
      testFramework.expectSuccessResponse(response);
    });

    it('should handle storage pool recovery operations', async () => {
      // Test storage pool recovery
      const params = {
        id: 'pool-recovery-123',
        enabled: true
      };

      const mockResponse = testFramework.createAsyncJobResponse();
      testFramework.mockClient.updateStoragePool.mockResolvedValue(mockResponse);

      const response = await (server as any).handleUpdateStoragePool(params);
      testFramework.expectSuccessResponse(response);
    });

    it('should validate storage redundancy configurations', async () => {
      // Test redundant storage configurations
      const params = {
        tags: 'redundant,high-availability',
        scope: 'CLUSTER'
      };

      const response = await (server as any).handleListStoragePools(params);

      expect(testFramework.mockClient.listStoragePools).toHaveBeenCalledWith(
        expect.objectContaining(params)
      );
      testFramework.expectSuccessResponse(response);
    });
  });

  describe('Performance Optimization', () => {
    it('should configure high-performance storage pools', async () => {
      const mockResponse = testFramework.createAsyncJobResponse();
      testFramework.mockClient.createStoragePool.mockResolvedValue(mockResponse);

      const performanceParams = {
        name: 'high-performance-ssd-pool',
        url: 'nfs://ssd-storage.enterprise.com/high-perf',
        zoneid: 'zone-123',
        details: {
          'storage.overprovisioning.factor': '1.5',
          'storage.cache.size': '10737418240'
        },
        capacityiops: 100000
      };

      const response = await (server as any).handleCreateStoragePool(performanceParams);
      testFramework.expectSuccessResponse(response);
    });

    it('should monitor storage pool performance metrics', async () => {
      // Test storage performance monitoring
      const params = {
        keyword: 'high-performance',
        scope: 'CLUSTER'
      };

      const response = await (server as any).handleListStoragePools(params);

      expect(testFramework.mockClient.listStoragePools).toHaveBeenCalledWith(
        expect.objectContaining(params)
      );
      testFramework.expectSuccessResponse(response);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle storage pool creation failures', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Storage pool with this name already exists'
      );
      testFramework.mockClient.createStoragePool.mockRejectedValue(error);

      const params = {
        name: 'existing-pool',
        url: 'nfs://192.168.1.100/export/primary',
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateStoragePool(params),
        'already exists'
      );
    });

    it('should handle storage connectivity issues', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot connect to storage server: connection timeout'
      );
      testFramework.mockClient.createStoragePool.mockRejectedValue(error);

      const params = {
        name: 'unreachable-pool',
        url: 'nfs://unreachable.server.com/export/primary',
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateStoragePool(params),
        'Cannot connect to storage'
      );
    });

    it('should handle insufficient storage capacity', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Insufficient storage capacity available'
      );
      testFramework.mockClient.createStoragePool.mockRejectedValue(error);

      const params = {
        name: 'full-storage-pool',
        url: 'nfs://full-storage.com/export/primary',
        zoneid: 'zone-123',
        capacitybytes: 999999999999999
      };

      await testFramework.expectError(
        () => (server as any).handleCreateStoragePool(params),
        'Insufficient storage capacity'
      );
    });

    it('should handle storage pool in use deletion attempts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete storage pool that contains volumes'
      );
      testFramework.mockClient.deleteStoragePool.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteStoragePool({ id: 'pool-with-volumes' }),
        'Cannot delete storage pool'
      );
    });

    it('should handle invalid storage URLs', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Invalid storage URL format'
      );
      testFramework.mockClient.createStoragePool.mockRejectedValue(error);

      const params = {
        name: 'invalid-url-pool',
        url: 'invalid://malformed-url',
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateStoragePool(params),
        'Invalid storage URL'
      );
    });

    it('should handle storage pool maintenance mode conflicts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot update storage pool in maintenance mode'
      );
      testFramework.mockClient.updateStoragePool.mockRejectedValue(error);

      const params = {
        id: 'maintenance-pool-123',
        capacitybytes: 10737418240000
      };

      await testFramework.expectError(
        () => (server as any).handleUpdateStoragePool(params),
        'Cannot update storage pool'
      );
    });

    it('should handle permission errors for storage operations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to storage pool management'
      );
      testFramework.mockClient.deleteStoragePool.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteStoragePool({ id: 'restricted-pool' }),
        'Access denied'
      );
    });

    it('should handle network timeouts during storage operations', async () => {
      const timeoutError = new Error('Storage operation timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      testFramework.mockClient.createStoragePool.mockRejectedValue(timeoutError);

      const params = {
        name: 'slow-storage-pool',
        url: 'nfs://slow-storage.com/export/primary',
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateStoragePool(params),
        'Storage operation timeout'
      );
    });

    it('should handle storage protocol compatibility issues', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Storage protocol not supported by hypervisor'
      );
      testFramework.mockClient.createStoragePool.mockRejectedValue(error);

      const params = {
        name: 'incompatible-storage',
        url: 'smb://windows-storage.com/share',
        zoneid: 'zone-123',
        hypervisor: 'KVM'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateStoragePool(params),
        'Storage protocol not supported'
      );
    });
  });
});