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

describe('System Administration - Comprehensive Test Suite', () => {
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

  describe('System VM Management', () => {
    describe('list_system_vms', () => {
      it('should list system VMs successfully', async () => {
        const response = await (server as any).handleListSystemVms({});

        expect(testFramework.mockClient.listSystemVms).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list system VMs with filtering parameters', async () => {
        const params = {
          systemvmtype: 'secondarystoragevm',
          state: 'Running',
          zoneid: 'zone-123',
          hostid: 'host-456'
        };

        const response = await (server as any).handleListSystemVms(params);

        expect(testFramework.mockClient.listSystemVms).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('start_system_vm', () => {
      it('should start system VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.startSystemVm.mockResolvedValue(mockResponse);

        const params = { id: 'svm-123' };
        const response = await (server as any).handleStartSystemVm(params);

        expect(testFramework.mockClient.startSystemVm).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'System VM start');
      });

      it('should fail when system VM ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleStartSystemVm({}),
          'System VM ID is required'
        );
      });
    });

    describe('stop_system_vm', () => {
      it('should stop system VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.stopSystemVm.mockResolvedValue(mockResponse);

        const params = { id: 'svm-123' };
        const response = await (server as any).handleStopSystemVm(params);

        expect(testFramework.mockClient.stopSystemVm).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'System VM stop');
      });

      it('should stop system VM with forced option', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.stopSystemVm.mockResolvedValue(mockResponse);

        const params = { id: 'svm-123', forced: true };
        const response = await (server as any).handleStopSystemVm(params);
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('reboot_system_vm', () => {
      it('should reboot system VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.rebootSystemVm.mockResolvedValue(mockResponse);

        const params = { id: 'svm-123' };
        const response = await (server as any).handleRebootSystemVm(params);

        expect(testFramework.mockClient.rebootSystemVm).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'System VM reboot');
      });
    });

    describe('destroy_system_vm', () => {
      it('should destroy system VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.destroySystemVm.mockResolvedValue(mockResponse);

        const params = { id: 'svm-123' };
        const response = await (server as any).handleDestroySystemVm(params);

        expect(testFramework.mockClient.destroySystemVm).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'System VM destroy');
      });
    });

    describe('scale_system_vm', () => {
      it('should scale system VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.scaleSystemVm.mockResolvedValue(mockResponse);

        const params = {
          id: 'svm-123',
          serviceofferingid: 'so-456'
        };

        const response = await (server as any).handleScaleSystemVm(params);

        expect(testFramework.mockClient.scaleSystemVm).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'System VM scaling');
      });

      it('should fail when service offering ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleScaleSystemVm({ id: 'svm-123' }),
          'Service offering ID is required'
        );
      });
    });

    describe('migrate_system_vm', () => {
      it('should migrate system VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.migrateSystemVm.mockResolvedValue(mockResponse);

        const params = {
          virtualmachineid: 'svm-123',
          hostid: 'host-456'
        };

        const response = await (server as any).handleMigrateSystemVm(params);

        expect(testFramework.mockClient.migrateSystemVm).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'System VM migration');
      });

      it('should fail when VM ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleMigrateSystemVm({ hostid: 'host-456' }),
          'Virtual machine ID is required'
        );
      });
    });

    describe('patch_system_vm', () => {
      it('should patch system VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.patchSystemVm.mockResolvedValue(mockResponse);

        const params = { id: 'svm-123' };
        const response = await (server as any).handlePatchSystemVm(params);

        expect(testFramework.mockClient.patchSystemVm).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'System VM patching');
      });
    });

    describe('change_service_for_system_vm', () => {
      it('should change service offering for system VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.changeServiceForSystemVm.mockResolvedValue(mockResponse);

        const params = {
          id: 'svm-123',
          serviceofferingid: 'so-789'
        };

        const response = await (server as any).handleChangeServiceForSystemVm(params);

        expect(testFramework.mockClient.changeServiceForSystemVm).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'System VM service change');
      });
    });

    describe('list_system_vms_usage_history', () => {
      it('should list system VMs usage history successfully', async () => {
        const response = await (server as any).handleListSystemVmsUsageHistory({});

        expect(testFramework.mockClient.listSystemVmsUsageHistory).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list system VMs usage history with date range', async () => {
        const params = {
          startdate: '2025-06-01',
          enddate: '2025-06-30',
          account: 'test-account'
        };

        const response = await (server as any).handleListSystemVmsUsageHistory(params);

        expect(testFramework.mockClient.listSystemVmsUsageHistory).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('Configuration Management', () => {
    describe('list_configurations', () => {
      it('should list configurations successfully', async () => {
        const response = await (server as any).handleListConfigurations({});

        expect(testFramework.mockClient.listConfigurations).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list configurations with filtering', async () => {
        const params = {
          category: 'VM',
          name: 'vm.instance.name',
          keyword: 'instance'
        };

        const response = await (server as any).handleListConfigurations(params);

        expect(testFramework.mockClient.listConfigurations).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_configuration', () => {
      it('should update configuration successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateConfiguration.mockResolvedValue(mockResponse);

        const params = {
          name: 'vm.instance.name',
          value: 'false'
        };

        const response = await (server as any).handleUpdateConfiguration(params);

        expect(testFramework.mockClient.updateConfiguration).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Configuration update');
      });

      it('should fail when configuration name is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateConfiguration({ value: 'false' }),
          'Configuration name is required'
        );
      });

      it('should fail when configuration value is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateConfiguration({ name: 'vm.instance.name' }),
          'Configuration value is required'
        );
      });
    });

    describe('list_capabilities', () => {
      it('should list capabilities successfully', async () => {
        const response = await (server as any).handleListCapabilities({});

        expect(testFramework.mockClient.listCapabilities).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('Router Management', () => {
    describe('list_routers', () => {
      it('should list routers successfully', async () => {
        const response = await (server as any).handleListRouters({});

        expect(testFramework.mockClient.listRouters).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list routers with filtering parameters', async () => {
        const params = {
          state: 'Running',
          zoneid: 'zone-123',
          account: 'test-account',
          networkid: 'net-456'
        };

        const response = await (server as any).handleListRouters(params);

        expect(testFramework.mockClient.listRouters).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('start_router', () => {
      it('should start router successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.startRouter.mockResolvedValue(mockResponse);

        const params = { id: 'router-123' };
        const response = await (server as any).handleStartRouter(params);

        expect(testFramework.mockClient.startRouter).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Router start');
      });

      it('should fail when router ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleStartRouter({}),
          'Router ID is required'
        );
      });
    });

    describe('stop_router', () => {
      it('should stop router successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.stopRouter.mockResolvedValue(mockResponse);

        const params = { id: 'router-123' };
        const response = await (server as any).handleStopRouter(params);

        expect(testFramework.mockClient.stopRouter).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Router stop');
      });

      it('should stop router with forced option', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.stopRouter.mockResolvedValue(mockResponse);

        const params = { id: 'router-123', forced: true };
        const response = await (server as any).handleStopRouter(params);
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('reboot_router', () => {
      it('should reboot router successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.rebootRouter.mockResolvedValue(mockResponse);

        const params = { id: 'router-123' };
        const response = await (server as any).handleRebootRouter(params);

        expect(testFramework.mockClient.rebootRouter).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Router reboot');
      });
    });

    describe('destroy_router', () => {
      it('should destroy router successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.destroyRouter.mockResolvedValue(mockResponse);

        const params = { id: 'router-123' };
        const response = await (server as any).handleDestroyRouter(params);

        expect(testFramework.mockClient.destroyRouter).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Router destroy');
      });
    });

    describe('change_service_for_router', () => {
      it('should change service offering for router successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.changeServiceForRouter.mockResolvedValue(mockResponse);

        const params = {
          id: 'router-123',
          serviceofferingid: 'so-789'
        };

        const response = await (server as any).handleChangeServiceForRouter(params);

        expect(testFramework.mockClient.changeServiceForRouter).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Router service change');
      });
    });

    describe('list_router_health', () => {
      it('should list router health successfully', async () => {
        const response = await (server as any).handleListRouterHealth({});

        expect(testFramework.mockClient.listRouterHealth).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list router health with filtering', async () => {
        const params = {
          routerid: 'router-123'
        };

        const response = await (server as any).handleListRouterHealth(params);

        expect(testFramework.mockClient.listRouterHealth).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle system VM not found errors', async () => {
      const error = testFramework.createErrorResponse(
        404,
        'System VM not found'
      );
      testFramework.mockClient.startSystemVm.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleStartSystemVm({ id: 'svm-nonexistent' }),
        'System VM not found'
      );
    });

    it('should handle invalid system VM state transitions', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot start system VM in current state'
      );
      testFramework.mockClient.startSystemVm.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleStartSystemVm({ id: 'svm-invalid-state' }),
        'Cannot start system VM'
      );
    });

    it('should handle configuration update validation errors', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Invalid configuration value for vm.instance.name'
      );
      testFramework.mockClient.updateConfiguration.mockRejectedValue(error);

      const params = {
        name: 'vm.instance.name',
        value: 'invalid-value'
      };

      await testFramework.expectError(
        () => (server as any).handleUpdateConfiguration(params),
        'Invalid configuration value'
      );
    });

    it('should handle router operation conflicts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot stop router while VMs are running'
      );
      testFramework.mockClient.stopRouter.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleStopRouter({ id: 'router-with-vms' }),
        'Cannot stop router'
      );
    });

    it('should handle system VM migration constraints', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Target host does not support system VM migration'
      );
      testFramework.mockClient.migrateSystemVm.mockRejectedValue(error);

      const params = {
        virtualmachineid: 'svm-123',
        hostid: 'incompatible-host'
      };

      await testFramework.expectError(
        () => (server as any).handleMigrateSystemVm(params),
        'does not support'
      );
    });

    it('should handle permission errors for system operations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to system administration resource'
      );
      testFramework.mockClient.updateConfiguration.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleUpdateConfiguration({ 
          name: 'restricted.config', 
          value: 'new-value' 
        }),
        'Access denied'
      );
    });

    it('should handle network timeouts during system operations', async () => {
      const timeoutError = new Error('System operation timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      testFramework.mockClient.destroySystemVm.mockRejectedValue(timeoutError);

      await testFramework.expectError(
        () => (server as any).handleDestroySystemVm({ id: 'svm-123' }),
        'System operation timeout'
      );
    });

    it('should handle insufficient resources for system VM scaling', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Insufficient capacity for system VM scaling'
      );
      testFramework.mockClient.scaleSystemVm.mockRejectedValue(error);

      const params = {
        id: 'svm-123',
        serviceofferingid: 'so-large'
      };

      await testFramework.expectError(
        () => (server as any).handleScaleSystemVm(params),
        'Insufficient capacity'
      );
    });
  });
});