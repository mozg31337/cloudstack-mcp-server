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

describe('Kubernetes Operations - Comprehensive Test Suite', () => {
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

  describe('Kubernetes Cluster Management', () => {
    describe('create_kubernetes_cluster', () => {
      it('should create Kubernetes cluster successfully with required parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse('create-k8s-job-123');
        testFramework.mockClient.createKubernetesCluster.mockResolvedValue(mockResponse);

        const params = {
          description: 'Test Kubernetes Cluster',
          kubernetesversionid: 'k8s-version-123',
          name: 'test-k8s-cluster',
          serviceofferingid: 'service-offering-123',
          size: 3,
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleCreateKubernetesCluster(params);

        expect(testFramework.mockClient.createKubernetesCluster).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response, 'Kubernetes cluster creation');
      });

      it('should create Kubernetes cluster with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createKubernetesCluster.mockResolvedValue(mockResponse);

        const params = {
          description: 'Test Kubernetes Cluster',
          kubernetesversionid: 'k8s-version-123',
          name: 'test-k8s-cluster',
          serviceofferingid: 'service-offering-123',
          size: 3,
          zoneid: 'zone-123',
          account: 'test-account',
          domainid: 'domain-123',
          networkid: 'network-456',
          keypair: 'ssh-keypair',
          masternodes: 1,
          externalloadbalanceripaddress: '192.168.1.100'
        };

        const response = await (server as any).handleCreateKubernetesCluster(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when name is missing', async () => {
        const params = {
          description: 'Test Kubernetes Cluster',
          kubernetesversionid: 'k8s-version-123',
          serviceofferingid: 'service-offering-123',
          size: 3,
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateKubernetesCluster(params),
          'Missing required parameter: name'
        );
      });

      it('should fail when Kubernetes version ID is missing', async () => {
        const params = {
          description: 'Test Kubernetes Cluster',
          name: 'test-k8s-cluster',
          serviceofferingid: 'service-offering-123',
          size: 3,
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateKubernetesCluster(params),
          'Missing required parameter: kubernetesversionid'
        );
      });

      it('should fail when service offering ID is missing', async () => {
        const params = {
          description: 'Test Kubernetes Cluster',
          kubernetesversionid: 'k8s-version-123',
          name: 'test-k8s-cluster',
          size: 3,
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateKubernetesCluster(params),
          'Missing required parameter: serviceofferingid'
        );
      });

      it('should fail when size is missing', async () => {
        const params = {
          description: 'Test Kubernetes Cluster',
          kubernetesversionid: 'k8s-version-123',
          name: 'test-k8s-cluster',
          serviceofferingid: 'service-offering-123',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateKubernetesCluster(params),
          'Missing required parameter: size'
        );
      });

      it('should fail when zone ID is missing', async () => {
        const params = {
          description: 'Test Kubernetes Cluster',
          kubernetesversionid: 'k8s-version-123',
          name: 'test-k8s-cluster',
          serviceofferingid: 'service-offering-123',
          size: 3
        };

        await testFramework.expectError(
          () => (server as any).handleCreateKubernetesCluster(params),
          'Missing required parameter: zoneid'
        );
      });
    });

    describe('list_kubernetes_clusters', () => {
      it('should list Kubernetes clusters successfully', async () => {
        const response = await (server as any).handleListKubernetesClusters({});

        expect(testFramework.mockClient.listKubernetesClusters).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list Kubernetes clusters with filtering parameters', async () => {
        const params = {
          account: 'test-account',
          state: 'Running',
          zoneid: 'zone-123',
          keyword: 'production'
        };

        const response = await (server as any).handleListKubernetesClusters(params);

        expect(testFramework.mockClient.listKubernetesClusters).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('delete_kubernetes_cluster', () => {
      it('should delete Kubernetes cluster successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteKubernetesCluster.mockResolvedValue(mockResponse);

        const params = { id: 'k8s-cluster-123' };
        const response = await (server as any).handleDeleteKubernetesCluster(params);

        expect(testFramework.mockClient.deleteKubernetesCluster).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Kubernetes cluster deletion');
      });

      it('should fail when cluster ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteKubernetesCluster({}),
          'Kubernetes cluster ID is required'
        );
      });
    });

    describe('get_kubernetes_cluster_config', () => {
      it('should get Kubernetes cluster config successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.getKubernetesClusterConfig.mockResolvedValue(mockResponse);

        const params = { id: 'k8s-cluster-123' };
        const response = await (server as any).handleGetKubernetesClusterConfig(params);

        expect(testFramework.mockClient.getKubernetesClusterConfig).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Kubernetes cluster config');
      });

      it('should fail when cluster ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleGetKubernetesClusterConfig({}),
          'Kubernetes cluster ID is required'
        );
      });
    });
  });

  describe('Kubernetes Cluster Lifecycle Operations', () => {
    describe('start_kubernetes_cluster', () => {
      it('should start Kubernetes cluster successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.startKubernetesCluster.mockResolvedValue(mockResponse);

        const params = { id: 'k8s-cluster-123' };
        const response = await (server as any).handleStartKubernetesCluster(params);

        expect(testFramework.mockClient.startKubernetesCluster).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Kubernetes cluster start');
      });

      it('should fail when cluster ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleStartKubernetesCluster({}),
          'Kubernetes cluster ID is required'
        );
      });
    });

    describe('stop_kubernetes_cluster', () => {
      it('should stop Kubernetes cluster successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.stopKubernetesCluster.mockResolvedValue(mockResponse);

        const params = { id: 'k8s-cluster-123' };
        const response = await (server as any).handleStopKubernetesCluster(params);

        expect(testFramework.mockClient.stopKubernetesCluster).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Kubernetes cluster stop');
      });

      it('should fail when cluster ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleStopKubernetesCluster({}),
          'Kubernetes cluster ID is required'
        );
      });
    });

    describe('scale_kubernetes_cluster', () => {
      it('should scale Kubernetes cluster successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.scaleKubernetesCluster.mockResolvedValue(mockResponse);

        const params = {
          id: 'k8s-cluster-123',
          size: 5
        };

        const response = await (server as any).handleScaleKubernetesCluster(params);

        expect(testFramework.mockClient.scaleKubernetesCluster).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Kubernetes cluster scaling');
      });

      it('should scale cluster with node IDs', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.scaleKubernetesCluster.mockResolvedValue(mockResponse);

        const params = {
          id: 'k8s-cluster-123',
          nodeids: 'node-1,node-2,node-3'
        };

        const response = await (server as any).handleScaleKubernetesCluster(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when cluster ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleScaleKubernetesCluster({ size: 5 }),
          'Kubernetes cluster ID is required'
        );
      });
    });

    describe('upgrade_kubernetes_cluster', () => {
      it('should upgrade Kubernetes cluster successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.upgradeKubernetesCluster.mockResolvedValue(mockResponse);

        const params = {
          id: 'k8s-cluster-123',
          kubernetesversionid: 'new-k8s-version-456'
        };

        const response = await (server as any).handleUpgradeKubernetesCluster(params);

        expect(testFramework.mockClient.upgradeKubernetesCluster).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Kubernetes cluster upgrade');
      });

      it('should fail when cluster ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpgradeKubernetesCluster({ 
            kubernetesversionid: 'new-k8s-version-456' 
          }),
          'Kubernetes cluster ID is required'
        );
      });

      it('should fail when Kubernetes version ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpgradeKubernetesCluster({ id: 'k8s-cluster-123' }),
          'Kubernetes version ID is required'
        );
      });
    });
  });

  describe('Kubernetes Node Management', () => {
    describe('add_vms_to_kubernetes_cluster', () => {
      it('should add VMs to Kubernetes cluster successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.addVmsToKubernetesCluster.mockResolvedValue(mockResponse);

        const params = {
          id: 'k8s-cluster-123',
          virtualmachineids: 'vm-1,vm-2,vm-3'
        };

        const response = await (server as any).handleAddVmsToKubernetesCluster(params);

        expect(testFramework.mockClient.addVmsToKubernetesCluster).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VMs addition to Kubernetes cluster');
      });

      it('should fail when cluster ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleAddVmsToKubernetesCluster({ 
            virtualmachineids: 'vm-1,vm-2' 
          }),
          'Kubernetes cluster ID is required'
        );
      });

      it('should fail when VM IDs are missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleAddVmsToKubernetesCluster({ id: 'k8s-cluster-123' }),
          'Virtual machine IDs are required'
        );
      });
    });

    describe('remove_vms_from_kubernetes_cluster', () => {
      it('should remove VMs from Kubernetes cluster successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.removeVmsFromKubernetesCluster.mockResolvedValue(mockResponse);

        const params = {
          id: 'k8s-cluster-123',
          virtualmachineids: 'vm-1,vm-2'
        };

        const response = await (server as any).handleRemoveVmsFromKubernetesCluster(params);

        expect(testFramework.mockClient.removeVmsFromKubernetesCluster).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VMs removal from Kubernetes cluster');
      });

      it('should fail when cluster ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleRemoveVmsFromKubernetesCluster({ 
            virtualmachineids: 'vm-1,vm-2' 
          }),
          'Kubernetes cluster ID is required'
        );
      });

      it('should fail when VM IDs are missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleRemoveVmsFromKubernetesCluster({ id: 'k8s-cluster-123' }),
          'Virtual machine IDs are required'
        );
      });
    });
  });

  describe('Kubernetes Version Management', () => {
    describe('list_kubernetes_supported_versions', () => {
      it('should list Kubernetes supported versions successfully', async () => {
        const response = await (server as any).handleListKubernetesSupportedVersions({});

        expect(testFramework.mockClient.listKubernetesSupportedVersions).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list Kubernetes supported versions with filtering', async () => {
        const params = {
          zoneid: 'zone-123',
          minimumkubernetesversionid: 'k8s-version-123'
        };

        const response = await (server as any).handleListKubernetesSupportedVersions(params);

        expect(testFramework.mockClient.listKubernetesSupportedVersions).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('add_kubernetes_supported_version', () => {
      it('should add Kubernetes supported version successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.addKubernetesSupportedVersion.mockResolvedValue(mockResponse);

        const params = {
          semanticversion: '1.21.0',
          zoneid: 'zone-123',
          url: 'https://example.com/kubernetes-1.21.0.iso'
        };

        const response = await (server as any).handleAddKubernetesSupportedVersion(params);

        expect(testFramework.mockClient.addKubernetesSupportedVersion).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Kubernetes version addition');
      });

      it('should fail when semantic version is missing', async () => {
        const params = {
          zoneid: 'zone-123',
          url: 'https://example.com/kubernetes.iso'
        };

        await testFramework.expectError(
          () => (server as any).handleAddKubernetesSupportedVersion(params),
          'Missing required parameter: semanticversion'
        );
      });

      it('should fail when zone ID is missing', async () => {
        const params = {
          semanticversion: '1.21.0',
          url: 'https://example.com/kubernetes.iso'
        };

        await testFramework.expectError(
          () => (server as any).handleAddKubernetesSupportedVersion(params),
          'Missing required parameter: zoneid'
        );
      });
    });

    describe('update_kubernetes_supported_version', () => {
      it('should update Kubernetes supported version successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateKubernetesSupportedVersion.mockResolvedValue(mockResponse);

        const params = {
          id: 'k8s-version-123',
          state: 'Enabled'
        };

        const response = await (server as any).handleUpdateKubernetesSupportedVersion(params);

        expect(testFramework.mockClient.updateKubernetesSupportedVersion).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Kubernetes version update');
      });

      it('should fail when version ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateKubernetesSupportedVersion({ state: 'Enabled' }),
          'Kubernetes version ID is required'
        );
      });
    });

    describe('delete_kubernetes_supported_version', () => {
      it('should delete Kubernetes supported version successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteKubernetesSupportedVersion.mockResolvedValue(mockResponse);

        const params = { id: 'k8s-version-123' };
        const response = await (server as any).handleDeleteKubernetesSupportedVersion(params);

        expect(testFramework.mockClient.deleteKubernetesSupportedVersion).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Kubernetes version deletion');
      });

      it('should fail when version ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteKubernetesSupportedVersion({}),
          'Kubernetes version ID is required'
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle insufficient capacity for cluster creation', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Insufficient capacity for Kubernetes cluster nodes'
      );
      testFramework.mockClient.createKubernetesCluster.mockRejectedValue(error);

      const params = {
        description: 'Large Kubernetes Cluster',
        kubernetesversionid: 'k8s-version-123',
        name: 'large-k8s-cluster',
        serviceofferingid: 'large-service-offering',
        size: 100,
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateKubernetesCluster(params),
        'Insufficient capacity'
      );
    });

    it('should handle cluster in use deletion attempts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete Kubernetes cluster with running workloads'
      );
      testFramework.mockClient.deleteKubernetesCluster.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteKubernetesCluster({ id: 'k8s-cluster-active' }),
        'Cannot delete Kubernetes cluster'
      );
    });

    it('should handle version compatibility issues during upgrade', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Kubernetes version is not compatible with current cluster configuration'
      );
      testFramework.mockClient.upgradeKubernetesCluster.mockRejectedValue(error);

      const params = {
        id: 'k8s-cluster-123',
        kubernetesversionid: 'incompatible-version'
      };

      await testFramework.expectError(
        () => (server as any).handleUpgradeKubernetesCluster(params),
        'not compatible'
      );
    });

    it('should handle scaling limits', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Maximum cluster size exceeded'
      );
      testFramework.mockClient.scaleKubernetesCluster.mockRejectedValue(error);

      const params = {
        id: 'k8s-cluster-123',
        size: 1000
      };

      await testFramework.expectError(
        () => (server as any).handleScaleKubernetesCluster(params),
        'Maximum cluster size'
      );
    });

    it('should handle VM already in cluster errors', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Virtual machine is already part of another Kubernetes cluster'
      );
      testFramework.mockClient.addVmsToKubernetesCluster.mockRejectedValue(error);

      const params = {
        id: 'k8s-cluster-123',
        virtualmachineids: 'vm-already-used'
      };

      await testFramework.expectError(
        () => (server as any).handleAddVmsToKubernetesCluster(params),
        'already part of another'
      );
    });

    it('should handle Kubernetes version in use deletion attempts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete Kubernetes version that is in use by clusters'
      );
      testFramework.mockClient.deleteKubernetesSupportedVersion.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteKubernetesSupportedVersion({ id: 'k8s-version-in-use' }),
        'Cannot delete Kubernetes version'
      );
    });

    it('should handle permission errors for cluster operations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to Kubernetes cluster resource'
      );
      testFramework.mockClient.startKubernetesCluster.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleStartKubernetesCluster({ id: 'k8s-cluster-restricted' }),
        'Access denied'
      );
    });

    it('should handle network timeouts during cluster operations', async () => {
      const timeoutError = new Error('Cluster operation timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      testFramework.mockClient.createKubernetesCluster.mockRejectedValue(timeoutError);

      const params = {
        description: 'Test Kubernetes Cluster',
        kubernetesversionid: 'k8s-version-123',
        name: 'test-k8s-cluster',
        serviceofferingid: 'service-offering-123',
        size: 3,
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateKubernetesCluster(params),
        'Cluster operation timeout'
      );
    });
  });
});