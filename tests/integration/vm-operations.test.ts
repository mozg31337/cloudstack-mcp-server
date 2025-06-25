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

describe('Virtual Machine Operations - Comprehensive Test Suite', () => {
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

  describe('VM Deployment Operations', () => {
    describe('deploy_virtual_machine', () => {
      it('should deploy VM successfully with required parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse('deploy-job-123');
        testFramework.mockClient.deployVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          serviceofferingid: 'so-123',
          templateid: 'tpl-123',
          zoneid: 'zone-123',
          name: 'test-vm'
        };

        const response = await (server as any).handleDeployVirtualMachine(params);

        expect(testFramework.mockClient.deployVirtualMachine).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response, 'VM deployment');
      });

      it('should deploy VM with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deployVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          serviceofferingid: 'so-123',
          templateid: 'tpl-123',
          zoneid: 'zone-123',
          name: 'test-vm',
          displayname: 'Test Virtual Machine',
          networkids: 'net-123,net-456',
          account: 'test-account',
          group: 'test-group'
        };

        const response = await (server as any).handleDeployVirtualMachine(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when serviceofferingid is missing', async () => {
        const params = {
          templateid: 'tpl-123',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleDeployVirtualMachine(params),
          'Missing required parameter: serviceofferingid'
        );
      });

      it('should fail when templateid is missing', async () => {
        const params = {
          serviceofferingid: 'so-123',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleDeployVirtualMachine(params),
          'Missing required parameter: templateid'
        );
      });

      it('should fail when zoneid is missing', async () => {
        const params = {
          serviceofferingid: 'so-123',
          templateid: 'tpl-123'
        };

        await testFramework.expectError(
          () => (server as any).handleDeployVirtualMachine(params),
          'Missing required parameter: zoneid'
        );
      });

      it('should handle CloudStack API errors', async () => {
        const error = testFramework.createErrorResponse(431, 'Unable to find template');
        testFramework.mockClient.deployVirtualMachine.mockRejectedValue(error);

        const params = {
          serviceofferingid: 'so-123',
          templateid: 'invalid-tpl',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleDeployVirtualMachine(params),
          'Unable to find template'
        );
      });
    });
  });

  describe('VM Lifecycle Operations', () => {
    describe('list_virtual_machines', () => {
      it('should list VMs successfully', async () => {
        const response = await (server as any).handleListVirtualMachines({});

        expect(testFramework.mockClient.listVirtualMachines).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list VMs with filtering parameters', async () => {
        const params = {
          zone: 'zone-123',
          state: 'Running',
          account: 'test-account',
          keyword: 'web-server'
        };

        const response = await (server as any).handleListVirtualMachines(params);

        expect(testFramework.mockClient.listVirtualMachines).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('start_virtual_machine', () => {
      it('should start VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.startVirtualMachine.mockResolvedValue(mockResponse);

        const params = { id: 'vm-123' };
        const response = await (server as any).handleStartVirtualMachine(params);

        expect(testFramework.mockClient.startVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM start');
      });

      it('should fail when VM ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleStartVirtualMachine({}),
          'Virtual machine ID is required'
        );
      });
    });

    describe('stop_virtual_machine', () => {
      it('should stop VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.stopVirtualMachine.mockResolvedValue(mockResponse);

        const params = { id: 'vm-123' };
        const response = await (server as any).handleStopVirtualMachine(params);

        expect(testFramework.mockClient.stopVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM stop');
      });

      it('should stop VM with forced option', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.stopVirtualMachine.mockResolvedValue(mockResponse);

        const params = { id: 'vm-123', forced: true };
        const response = await (server as any).handleStopVirtualMachine(params);

        expect(testFramework.mockClient.stopVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('reboot_virtual_machine', () => {
      it('should reboot VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.rebootVirtualMachine.mockResolvedValue(mockResponse);

        const params = { id: 'vm-123' };
        const response = await (server as any).handleRebootVirtualMachine(params);

        expect(testFramework.mockClient.rebootVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM reboot');
      });
    });

    describe('destroy_virtual_machine', () => {
      it('should destroy VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.destroyVirtualMachine.mockResolvedValue(mockResponse);

        const params = { id: 'vm-123' };
        const response = await (server as any).handleDestroyVirtualMachine(params);

        expect(testFramework.mockClient.destroyVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM destroy');
      });

      it('should destroy VM with expunge option', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.destroyVirtualMachine.mockResolvedValue(mockResponse);

        const params = { id: 'vm-123', expunge: true };
        const response = await (server as any).handleDestroyVirtualMachine(params);

        expect(testFramework.mockClient.destroyVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('expunge_virtual_machine', () => {
      it('should expunge VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.expungeVirtualMachine.mockResolvedValue(mockResponse);

        const params = { id: 'vm-123' };
        const response = await (server as any).handleExpungeVirtualMachine(params);

        expect(testFramework.mockClient.expungeVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM expunge');
      });
    });

    describe('recover_virtual_machine', () => {
      it('should recover VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.recoverVirtualMachine.mockResolvedValue(mockResponse);

        const params = { id: 'vm-123' };
        const response = await (server as any).handleRecoverVirtualMachine(params);

        expect(testFramework.mockClient.recoverVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM recover');
      });
    });

    describe('restore_virtual_machine', () => {
      it('should restore VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.restoreVirtualMachine.mockResolvedValue(mockResponse);

        const params = { virtualmachineid: 'vm-123' };
        const response = await (server as any).handleRestoreVirtualMachine(params);

        expect(testFramework.mockClient.restoreVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM restore');
      });
    });
  });

  describe('VM Management Operations', () => {
    describe('update_virtual_machine', () => {
      it('should update VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          id: 'vm-123',
          displayname: 'Updated VM Name',
          haenable: true
        };

        const response = await (server as any).handleUpdateVirtualMachine(params);

        expect(testFramework.mockClient.updateVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM update');
      });
    });

    describe('migrate_virtual_machine', () => {
      it('should migrate VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.migrateVirtualMachine.mockResolvedValue(mockResponse);

        const params = { virtualmachineid: 'vm-123', hostid: 'host-456' };
        const response = await (server as any).handleMigrateVirtualMachine(params);

        expect(testFramework.mockClient.migrateVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM migration');
      });

      it('should fail when VM ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleMigrateVirtualMachine({ hostid: 'host-456' }),
          'Virtual machine ID is required'
        );
      });
    });

    describe('scale_virtual_machine', () => {
      it('should scale VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.scaleVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          id: 'vm-123',
          serviceofferingid: 'so-456'
        };

        const response = await (server as any).handleScaleVirtualMachine(params);

        expect(testFramework.mockClient.scaleVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM scaling');
      });

      it('should fail when service offering ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleScaleVirtualMachine({ id: 'vm-123' }),
          'Service offering ID is required'
        );
      });
    });

    describe('assign_virtual_machine', () => {
      it('should assign VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.assignVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          virtualmachineid: 'vm-123',
          account: 'target-account',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleAssignVirtualMachine(params);

        expect(testFramework.mockClient.assignVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM assignment');
      });
    });

    describe('clone_virtual_machine', () => {
      it('should clone VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.cloneVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          virtualmachineid: 'vm-123',
          name: 'cloned-vm'
        };

        const response = await (server as any).handleCloneVirtualMachine(params);

        expect(testFramework.mockClient.cloneVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM cloning');
      });
    });
  });

  describe('VM Network Interface Operations', () => {
    describe('add_nic_to_virtual_machine', () => {
      it('should add NIC successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.addNicToVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          virtualmachineid: 'vm-123',
          networkid: 'net-456'
        };

        const response = await (server as any).handleAddNicToVirtualMachine(params);

        expect(testFramework.mockClient.addNicToVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'NIC addition');
      });
    });

    describe('remove_nic_from_virtual_machine', () => {
      it('should remove NIC successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.removeNicFromVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          virtualmachineid: 'vm-123',
          nicid: 'nic-456'
        };

        const response = await (server as any).handleRemoveNicFromVirtualMachine(params);

        expect(testFramework.mockClient.removeNicFromVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'NIC removal');
      });
    });

    describe('update_default_nic_for_virtual_machine', () => {
      it('should update default NIC successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateDefaultNicForVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          virtualmachineid: 'vm-123',
          nicid: 'nic-456'
        };

        const response = await (server as any).handleUpdateDefaultNicForVirtualMachine(params);

        expect(testFramework.mockClient.updateDefaultNicForVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Default NIC update');
      });
    });
  });

  describe('VM Configuration Operations', () => {
    describe('configure_virtual_machine', () => {
      it('should configure VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.configureVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          id: 'vm-123',
          cpunumber: 4,
          memory: 8192
        };

        const response = await (server as any).handleConfigureVirtualMachine(params);

        expect(testFramework.mockClient.configureVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM configuration');
      });
    });

    describe('upgrade_virtual_machine', () => {
      it('should upgrade VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.upgradeVirtualMachine.mockResolvedValue(mockResponse);

        const params = {
          id: 'vm-123',
          serviceofferingid: 'so-789'
        };

        const response = await (server as any).handleUpgradeVirtualMachine(params);

        expect(testFramework.mockClient.upgradeVirtualMachine).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM upgrade');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      testFramework.mockClient.deployVirtualMachine.mockRejectedValue(timeoutError);

      const params = {
        serviceofferingid: 'so-123',
        templateid: 'tpl-123',
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleDeployVirtualMachine(params),
        'Request timeout'
      );
    });

    it('should handle invalid VM states', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Unable to start VM in current state'
      );
      testFramework.mockClient.startVirtualMachine.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleStartVirtualMachine({ id: 'vm-123' }),
        'Unable to start VM in current state'
      );
    });

    it('should handle resource constraints', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Insufficient capacity for the requested virtual machine'
      );
      testFramework.mockClient.deployVirtualMachine.mockRejectedValue(error);

      const params = {
        serviceofferingid: 'so-large',
        templateid: 'tpl-123',
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleDeployVirtualMachine(params),
        'Insufficient capacity'
      );
    });

    it('should handle permission errors', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to virtual machine'
      );
      testFramework.mockClient.destroyVirtualMachine.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDestroyVirtualMachine({ id: 'vm-restricted' }),
        'Access denied'
      );
    });
  });
});