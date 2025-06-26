import { CloudStackClient } from '../../src/cloudstack/client';
import { ConfigManager } from '../../src/utils/config';
import { CloudStackEnvironment } from '../../src/cloudstack/types';

/**
 * Comprehensive test framework for CloudStack MCP Server
 * Provides mocking, utilities, and common test patterns
 */
export class TestFramework {
  public mockClient: jest.Mocked<CloudStackClient>;
  public mockConfigManager: jest.Mocked<ConfigManager>;
  public mockEnvironment: CloudStackEnvironment;

  constructor() {
    this.setupMocks();
    this.setupDefaultResponses();
  }

  private setupMocks(): void {
    // Mock CloudStack Client
    this.mockClient = {
      makeRequest: jest.fn(),
      testConnection: jest.fn().mockResolvedValue(true),
      getEnvironmentInfo: jest.fn(),
      
      // VM Operations
      deployVirtualMachine: jest.fn(),
      listVirtualMachines: jest.fn(),
      startVirtualMachine: jest.fn(),
      stopVirtualMachine: jest.fn(),
      rebootVirtualMachine: jest.fn(),
      destroyVirtualMachine: jest.fn(),
      updateVirtualMachine: jest.fn(),
      migrateVirtualMachine: jest.fn(),
      scaleVirtualMachine: jest.fn(),
      recoverVirtualMachine: jest.fn(),
      expungeVirtualMachine: jest.fn(),
      restoreVirtualMachine: jest.fn(),
      assignVirtualMachine: jest.fn(),
      cloneVirtualMachine: jest.fn(),

      // Storage Operations
      createVolume: jest.fn(),
      listVolumes: jest.fn(),
      attachVolume: jest.fn(),
      detachVolume: jest.fn(),
      deleteVolume: jest.fn(),
      resizeVolume: jest.fn(),
      createSnapshot: jest.fn(),
      listSnapshots: jest.fn(),
      deleteSnapshot: jest.fn(),
      createVolumeFromSnapshot: jest.fn(),
      migrateVolume: jest.fn(),
      extractVolume: jest.fn(),
      uploadVolume: jest.fn(),

      // Network Operations
      createNetwork: jest.fn(),
      listNetworks: jest.fn(),
      deleteNetwork: jest.fn(),
      updateNetwork: jest.fn(),
      restartNetwork: jest.fn(),
      createVpc: jest.fn(),
      listVpcs: jest.fn(),
      deleteVpc: jest.fn(),
      updateVpc: jest.fn(),
      restartVpc: jest.fn(),
      createNetworkOffering: jest.fn(),
      listNetworkOfferings: jest.fn(),
      deleteNetworkOffering: jest.fn(),
      updateNetworkOffering: jest.fn(),

      // Account Management
      createAccount: jest.fn(),
      listAccounts: jest.fn(),
      updateAccount: jest.fn(),
      deleteAccount: jest.fn(),
      createUser: jest.fn(),
      listUsers: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      createDomain: jest.fn(),
      listDomains: jest.fn(),
      updateDomain: jest.fn(),
      deleteDomain: jest.fn(),

      // Kubernetes Operations  
      createKubernetesCluster: jest.fn(),
      listKubernetesClusters: jest.fn(),
      deleteKubernetesCluster: jest.fn(),
      scaleKubernetesCluster: jest.fn(),
      startKubernetesCluster: jest.fn(),
      stopKubernetesCluster: jest.fn(),
      upgradeKubernetesCluster: jest.fn(),
      getKubernetesClusterConfig: jest.fn(),

      // Load Balancer Operations
      createLoadBalancerRule: jest.fn(),
      listLoadBalancerRules: jest.fn(),
      deleteLoadBalancerRule: jest.fn(),
      updateLoadBalancerRule: jest.fn(),
      assignToLoadBalancerRule: jest.fn(),
      removeFromLoadBalancerRule: jest.fn(),
      createLbHealthCheckPolicy: jest.fn(),
      deleteLbHealthCheckPolicy: jest.fn(),
      createLbStickinessPolicy: jest.fn(),
      deleteLbStickinessPolicy: jest.fn(),

      // VPN Operations
      createVpnConnection: jest.fn(),
      listVpnConnections: jest.fn(),
      deleteVpnConnection: jest.fn(),
      resetVpnConnection: jest.fn(),
      createVpnGateway: jest.fn(),
      listVpnGateways: jest.fn(),
      deleteVpnGateway: jest.fn(),
      createRemoteAccessVpn: jest.fn(),
      deleteRemoteAccessVpn: jest.fn(),
      addVpnUser: jest.fn(),
      removeVpnUser: jest.fn(),

      // Template Operations
      createTemplate: jest.fn(),
      listTemplates: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      copyTemplate: jest.fn(),
      registerTemplate: jest.fn(),
      extractTemplate: jest.fn(),
      listIsos: jest.fn(),
      registerIso: jest.fn(),
      updateIso: jest.fn(),
      deleteIso: jest.fn(),
      attachIso: jest.fn(),
      detachIso: jest.fn(),

      // Phase 3: System Administration Operations
      listSystemVms: jest.fn(),
      startSystemVm: jest.fn(),
      stopSystemVm: jest.fn(),
      rebootSystemVm: jest.fn(),
      destroySystemVm: jest.fn(),
      scaleSystemVm: jest.fn(),
      migrateSystemVm: jest.fn(),
      patchSystemVm: jest.fn(),
      changeServiceForSystemVm: jest.fn(),
      listSystemVmsUsageHistory: jest.fn(),

      // Configuration Management
      listConfigurations: jest.fn(),
      updateConfiguration: jest.fn(),
      listCapabilities: jest.fn(),

      // Phase 3: Security & Compliance Operations
      listAlerts: jest.fn(),
      archiveAlerts: jest.fn(),
      deleteAlerts: jest.fn(),
      listEvents: jest.fn(),
      confirmDangerousAction: jest.fn(),

      // Phase 3: Monitoring & Analytics Operations
      listUsageRecords: jest.fn(),
      listCapacity: jest.fn(),
      listAsyncJobs: jest.fn(),
      queryAsyncJobResult: jest.fn(),
      listVmMetrics: jest.fn(),
      listVolumeMetrics: jest.fn(),
      listLoadBalancerMetrics: jest.fn(),
      listHostsMetrics: jest.fn(),
      listVmUsageHistory: jest.fn(),

      // Phase 3: Enterprise Integration Operations
      listStoragePools: jest.fn(),
      createStoragePool: jest.fn(),
      updateStoragePool: jest.fn(),
      deleteStoragePool: jest.fn(),
      listRouters: jest.fn(),
      startRouter: jest.fn(),
      stopRouter: jest.fn(),
      rebootRouter: jest.fn(),
      destroyRouter: jest.fn(),
      changeServiceForRouter: jest.fn(),
      listRouterHealth: jest.fn(),

      // Quota Management Operations
      quotaStatement: jest.fn(),
      quotaCredits: jest.fn(),
      quotaUpdate: jest.fn(),
      quotaSummary: jest.fn(),
      quotaBalance: jest.fn()
    } as any;

    // Mock Config Manager
    this.mockConfigManager = {
      getDefaultEnvironment: jest.fn(),
      getEnvironment: jest.fn(),
      getLoggingConfig: jest.fn().mockReturnValue({
        level: 'info',
        file: 'test.log'
      }),
      validateConfiguration: jest.fn().mockReturnValue(true),
      loadConfiguration: jest.fn(),
      saveConfiguration: jest.fn(),
      rotateEnvironmentCredentials: jest.fn(),
      validateEnvironmentCredentials: jest.fn(),
      mergeEnvironmentVariables: jest.fn()
    } as any;

    // Mock Environment
    this.mockEnvironment = {
      name: 'Test Environment',
      apiUrl: 'https://test.cloudstack.com/client/api',
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      timeout: 30000,
      retries: 3
    };

    this.mockConfigManager.getDefaultEnvironment.mockReturnValue(this.mockEnvironment);
    this.mockConfigManager.getEnvironment.mockReturnValue(this.mockEnvironment);
  }

  private setupDefaultResponses(): void {
    // Default successful responses for common operations
    this.mockClient.listVirtualMachines.mockResolvedValue({
      virtualmachine: [
        {
          id: 'vm-123',
          name: 'test-vm',
          state: 'Running',
          zonename: 'zone1',
          templatename: 'centos-7'
        }
      ]
    });

    this.mockClient.listVolumes.mockResolvedValue({
      volume: [
        {
          id: 'vol-123',
          name: 'test-volume',
          state: 'Ready',
          size: 10737418240,
          type: 'ROOT'
        }
      ]
    });

    this.mockClient.listNetworks.mockResolvedValue({
      network: [
        {
          id: 'net-123',
          name: 'test-network',
          state: 'Allocated',
          type: 'Isolated',
          zonename: 'zone1'
        }
      ]
    });

    this.mockClient.listAccounts.mockResolvedValue({
      account: [
        {
          id: 'acc-123',
          name: 'test-account',
          accounttype: 2,
          state: 'enabled',
          domain: 'ROOT'
        }
      ]
    });

    // Phase 3: Default responses for System Administration
    this.mockClient.listSystemVms.mockResolvedValue({
      systemvm: [
        {
          id: 'svm-123',
          name: 'v-123-VM',
          systemvmtype: 'secondarystoragevm',
          state: 'Running',
          zonename: 'zone1',
          publicip: '192.168.1.10'
        }
      ]
    });

    this.mockClient.listConfigurations.mockResolvedValue({
      configuration: [
        {
          name: 'vm.instance.name',
          value: 'true',
          description: 'Indicates whether to use the instance name for hostname',
          category: 'VM'
        }
      ]
    });

    // Phase 3: Default responses for Security & Compliance
    this.mockClient.listAlerts.mockResolvedValue({
      alert: [
        {
          id: 'alert-123',
          type: 'MANAGEMENT_NODE_DOWN',
          subject: 'Management Node Alert',
          description: 'Test alert description',
          sent: '2025-06-25T10:00:00Z'
        }
      ]
    });

    this.mockClient.listEvents.mockResolvedValue({
      event: [
        {
          id: 'event-123',
          type: 'VM.CREATE',
          level: 'INFO',
          description: 'Created VM test-vm',
          created: '2025-06-25T10:00:00Z',
          account: 'test-account'
        }
      ]
    });

    // Phase 3: Default responses for Monitoring & Analytics
    this.mockClient.listUsageRecords.mockResolvedValue({
      usagerecord: [
        {
          account: 'test-account',
          vminstanceid: 'vm-123',
          vmname: 'test-vm',
          startdate: '2025-06-25T00:00:00Z',
          enddate: '2025-06-25T23:59:59Z',
          rawusage: 24
        }
      ]
    });

    this.mockClient.listCapacity.mockResolvedValue({
      capacity: [
        {
          type: 1,
          zonename: 'zone1',
          capacitytotal: 1000000000000,
          capacityused: 500000000000,
          percentused: '50.00'
        }
      ]
    });

    this.mockClient.listAsyncJobs.mockResolvedValue({
      asyncjobs: [
        {
          jobid: 'job-123',
          cmd: 'org.apache.cloudstack.api.command.user.vm.DeployVMCmd',
          jobstatus: 1,
          jobresult: { success: true }
        }
      ]
    });

    // Phase 3: Default responses for Enterprise Integration
    this.mockClient.listStoragePools.mockResolvedValue({
      storagepool: [
        {
          id: 'pool-123',
          name: 'test-storage-pool',
          state: 'Up',
          type: 'NetworkFilesystem',
          zonename: 'zone1',
          disksizetotal: 1000000000000,
          disksizeused: 200000000000
        }
      ]
    });

    this.mockClient.listRouters.mockResolvedValue({
      router: [
        {
          id: 'router-123',
          name: 'r-123-VM',
          state: 'Running',
          publicip: '192.168.1.1',
          guestnetworkid: 'net-123',
          zonename: 'zone1'
        }
      ]
    });
  }

  /**
   * Create a mock async job response
   */
  createAsyncJobResponse(jobId: string = 'job-123', status: number = 1): any {
    return {
      jobid: jobId,
      jobstatus: status,
      jobresult: {
        success: true,
        displaytext: 'Operation completed successfully'
      }
    };
  }

  /**
   * Create a mock CloudStack error response
   */
  createErrorResponse(errorCode: number, errorText: string): any {
    const error = new Error(`CloudStack API Error (${errorCode}): ${errorText}`);
    (error as any).isCloudStackError = true;
    (error as any).errorCode = errorCode;
    return error;
  }

  /**
   * Create mock parameters for testing
   */
  createMockParams(required: Record<string, any>, optional: Record<string, any> = {}): any {
    return { ...required, ...optional };
  }

  /**
   * Validate that a function throws with specific error message
   */
  async expectError(fn: () => Promise<any>, expectedMessage: string): Promise<void> {
    await expect(fn()).rejects.toThrow(expectedMessage);
  }

  /**
   * Validate successful response format
   */
  expectSuccessResponse(response: any, expectedText?: string): void {
    expect(response).toHaveProperty('content');
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content[0]).toHaveProperty('type', 'text');
    expect(response.content[0]).toHaveProperty('text');
    
    if (expectedText) {
      expect(response.content[0].text).toContain(expectedText);
    }
  }

  /**
   * Reset all mocks
   */
  resetMocks(): void {
    jest.clearAllMocks();
    this.setupDefaultResponses();
  }

  /**
   * Common test patterns for CRUD operations
   */
  createCrudTestSuite(
    operations: {
      create?: { handler: any; requiredParams: string[]; optionalParams?: string[] };
      list?: { handler: any; optionalParams?: string[] };
      update?: { handler: any; requiredParams: string[]; optionalParams?: string[] };
      delete?: { handler: any; requiredParams: string[] };
    }
  ) {
    const tests: Array<() => void> = [];

    if (operations.create) {
      tests.push(() => {
        describe('Create Operation', () => {
          it('should create successfully with valid parameters', async () => {
            const params = this.createMockParams(
              operations.create!.requiredParams.reduce((acc, param) => {
                acc[param] = `test-${param}`;
                return acc;
              }, {} as Record<string, string>)
            );

            const response = await operations.create!.handler(params);
            this.expectSuccessResponse(response);
          });

          operations.create!.requiredParams.forEach(param => {
            it(`should fail when ${param} is missing`, async () => {
              const params = this.createMockParams(
                operations.create!.requiredParams.reduce((acc, p) => {
                  if (p !== param) acc[p] = `test-${p}`;
                  return acc;
                }, {} as Record<string, string>)
              );

              await this.expectError(
                () => operations.create!.handler(params),
                `Missing required parameter: ${param}`
              );
            });
          });
        });
      });
    }

    if (operations.list) {
      tests.push(() => {
        describe('List Operation', () => {
          it('should list successfully', async () => {
            const response = await operations.list!.handler({});
            this.expectSuccessResponse(response);
          });

          it('should list with optional parameters', async () => {
            const params = operations.list!.optionalParams?.reduce((acc, param) => {
              acc[param] = `test-${param}`;
              return acc;
            }, {} as Record<string, string>) || {};

            const response = await operations.list!.handler(params);
            this.expectSuccessResponse(response);
          });
        });
      });
    }

    if (operations.delete) {
      tests.push(() => {
        describe('Delete Operation', () => {
          it('should delete successfully with valid parameters', async () => {
            const params = this.createMockParams(
              operations.delete!.requiredParams.reduce((acc, param) => {
                acc[param] = `test-${param}`;
                return acc;
              }, {} as Record<string, string>)
            );

            const response = await operations.delete!.handler(params);
            this.expectSuccessResponse(response);
          });

          operations.delete!.requiredParams.forEach(param => {
            it(`should fail when ${param} is missing`, async () => {
              const params = this.createMockParams(
                operations.delete!.requiredParams.reduce((acc, p) => {
                  if (p !== param) acc[p] = `test-${p}`;
                  return acc;
                }, {} as Record<string, string>)
              );

              await this.expectError(
                () => operations.delete!.handler(params),
                param
              );
            });
          });
        });
      });
    }

    return tests;
  }
}

export const testFramework = new TestFramework();