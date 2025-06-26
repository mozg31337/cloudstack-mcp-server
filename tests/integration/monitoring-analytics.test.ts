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

describe('Monitoring & Analytics - Comprehensive Test Suite', () => {
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

  describe('Usage Analytics', () => {
    describe('list_usage_records', () => {
      it('should list usage records successfully', async () => {
        const response = await (server as any).handleListUsageRecords({});

        expect(testFramework.mockClient.listUsageRecords).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list usage records with comprehensive filtering', async () => {
        const params = {
          account: 'test-account',
          domainid: 'domain-123',
          startdate: '2025-06-01',
          enddate: '2025-06-30',
          type: 1, // VM usage
          usageid: 'vm-123',
          keyword: 'production'
        };

        const response = await (server as any).handleListUsageRecords(params);

        expect(testFramework.mockClient.listUsageRecords).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should list usage records with pagination', async () => {
        const params = {
          startdate: '2025-06-01',
          enddate: '2025-06-30',
          page: 2,
          pagesize: 100
        };

        const response = await (server as any).handleListUsageRecords(params);

        expect(testFramework.mockClient.listUsageRecords).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when date range is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleListUsageRecords({ account: 'test-account' }),
          'Start date and end date are required'
        );
      });
    });

    describe('list_vm_usage_history', () => {
      it('should list VM usage history successfully', async () => {
        const response = await (server as any).handleListVmUsageHistory({});

        expect(testFramework.mockClient.listVmUsageHistory).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list VM usage history with filtering', async () => {
        const params = {
          virtualmachineid: 'vm-123',
          startdate: '2025-06-01',
          enddate: '2025-06-30',
          account: 'test-account'
        };

        const response = await (server as any).handleListVmUsageHistory(params);

        expect(testFramework.mockClient.listVmUsageHistory).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('Capacity Management', () => {
    describe('list_capacity', () => {
      it('should list capacity successfully', async () => {
        const response = await (server as any).handleListCapacity({});

        expect(testFramework.mockClient.listCapacity).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list capacity with detailed filtering', async () => {
        const params = {
          type: 1, // CPU capacity
          zoneid: 'zone-123',
          clusterid: 'cluster-456',
          hostid: 'host-789',
          fetchlatest: true
        };

        const response = await (server as any).handleListCapacity(params);

        expect(testFramework.mockClient.listCapacity).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should list capacity by resource type', async () => {
        const capacityTypes = [
          { type: 0, description: 'Memory' },
          { type: 1, description: 'CPU' },
          { type: 2, description: 'Storage' },
          { type: 3, description: 'Primary Storage' },
          { type: 6, description: 'Secondary Storage' }
        ];

        for (const capacityType of capacityTypes) {
          const params = { type: capacityType.type };
          const response = await (server as any).handleListCapacity(params);

          expect(testFramework.mockClient.listCapacity).toHaveBeenCalledWith(
            expect.objectContaining(params)
          );
          testFramework.expectSuccessResponse(response);
        }
      });
    });
  });

  describe('Metrics Collection', () => {
    describe('list_vm_metrics', () => {
      it('should list VM metrics successfully', async () => {
        const response = await (server as any).handleListVmMetrics({});

        expect(testFramework.mockClient.listVmMetrics).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list VM metrics with filtering', async () => {
        const params = {
          ids: 'vm-123,vm-456',
          hostid: 'host-789',
          zoneid: 'zone-123',
          account: 'test-account'
        };

        const response = await (server as any).handleListVmMetrics(params);

        expect(testFramework.mockClient.listVmMetrics).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('list_volume_metrics', () => {
      it('should list volume metrics successfully', async () => {
        const response = await (server as any).handleListVolumeMetrics({});

        expect(testFramework.mockClient.listVolumeMetrics).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list volume metrics with comprehensive filtering', async () => {
        const params = {
          ids: 'vol-123,vol-456',
          zoneid: 'zone-123',
          account: 'test-account',
          keyword: 'database-volume'
        };

        const response = await (server as any).handleListVolumeMetrics(params);

        expect(testFramework.mockClient.listVolumeMetrics).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('list_load_balancer_metrics', () => {
      it('should list load balancer metrics successfully', async () => {
        const response = await (server as any).handleListLoadBalancerMetrics({});

        expect(testFramework.mockClient.listLoadBalancerMetrics).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list load balancer metrics with filtering', async () => {
        const params = {
          id: 'lb-rule-123',
          account: 'test-account',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleListLoadBalancerMetrics(params);

        expect(testFramework.mockClient.listLoadBalancerMetrics).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('list_hosts_metrics', () => {
      it('should list host metrics successfully', async () => {
        const response = await (server as any).handleListHostsMetrics({});

        expect(testFramework.mockClient.listHostsMetrics).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list host metrics with detailed filtering', async () => {
        const params = {
          type: 'Routing',
          zoneid: 'zone-123',
          clusterid: 'cluster-456',
          state: 'Up',
          name: 'host-prod-01'
        };

        const response = await (server as any).handleListHostsMetrics(params);

        expect(testFramework.mockClient.listHostsMetrics).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('Async Job Management', () => {
    describe('list_async_jobs', () => {
      it('should list async jobs successfully', async () => {
        const response = await (server as any).handleListAsyncJobs({});

        expect(testFramework.mockClient.listAsyncJobs).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list async jobs with comprehensive filtering', async () => {
        const params = {
          account: 'test-account',
          domainid: 'domain-123',
          keyword: 'VirtualMachine',
          startdate: '2025-06-25T00:00:00Z',
          listall: true
        };

        const response = await (server as any).handleListAsyncJobs(params);

        expect(testFramework.mockClient.listAsyncJobs).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should list async jobs by status', async () => {
        const jobStatuses = [
          { status: 0, description: 'In Progress' },
          { status: 1, description: 'Completed Successfully' },
          { status: 2, description: 'Failed' }
        ];

        for (const jobStatus of jobStatuses) {
          const params = { status: jobStatus.status };
          const response = await (server as any).handleListAsyncJobs(params);

          expect(testFramework.mockClient.listAsyncJobs).toHaveBeenCalledWith(
            expect.objectContaining(params)
          );
          testFramework.expectSuccessResponse(response);
        }
      });
    });

    describe('query_async_job_result', () => {
      it('should query async job result successfully', async () => {
        const mockResponse = {
          jobid: 'job-123',
          jobstatus: 1,
          jobresult: { success: true, displaytext: 'Job completed successfully' }
        };
        testFramework.mockClient.queryAsyncJobResult.mockResolvedValue(mockResponse);

        const params = { jobid: 'job-123' };
        const response = await (server as any).handleQueryAsyncJobResult(params);

        expect(testFramework.mockClient.queryAsyncJobResult).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Async job query');
      });

      it('should handle job in progress status', async () => {
        const mockResponse = {
          jobid: 'job-456',
          jobstatus: 0,
          jobresult: null
        };
        testFramework.mockClient.queryAsyncJobResult.mockResolvedValue(mockResponse);

        const params = { jobid: 'job-456' };
        const response = await (server as any).handleQueryAsyncJobResult(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should handle job failure status', async () => {
        const mockResponse = {
          jobid: 'job-789',
          jobstatus: 2,
          jobresult: { errortext: 'Job failed due to insufficient resources' }
        };
        testFramework.mockClient.queryAsyncJobResult.mockResolvedValue(mockResponse);

        const params = { jobid: 'job-789' };
        const response = await (server as any).handleQueryAsyncJobResult(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when job ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleQueryAsyncJobResult({}),
          'Job ID is required'
        );
      });

      it('should handle non-existent job queries', async () => {
        const error = testFramework.createErrorResponse(
          404,
          'Async job not found'
        );
        testFramework.mockClient.queryAsyncJobResult.mockRejectedValue(error);

        await testFramework.expectError(
          () => (server as any).handleQueryAsyncJobResult({ jobid: 'non-existent-job' }),
          'Async job not found'
        );
      });
    });
  });

  describe('Performance Analytics', () => {
    it('should analyze VM performance trends', async () => {
      // Test VM performance analysis
      const performanceParams = {
        ids: 'vm-123',
        startdate: '2025-06-01',
        enddate: '2025-06-30'
      };

      const response = await (server as any).handleListVmMetrics(performanceParams);

      expect(testFramework.mockClient.listVmMetrics).toHaveBeenCalledWith(
        expect.objectContaining(performanceParams)
      );
      testFramework.expectSuccessResponse(response);
    });

    it('should analyze capacity utilization patterns', async () => {
      // Test capacity utilization analysis
      const capacityParams = {
        zoneid: 'zone-123',
        fetchlatest: true
      };

      const response = await (server as any).handleListCapacity(capacityParams);

      expect(testFramework.mockClient.listCapacity).toHaveBeenCalledWith(
        expect.objectContaining(capacityParams)
      );
      testFramework.expectSuccessResponse(response);
    });

    it('should analyze usage billing patterns', async () => {
      // Test billing analytics
      const billingParams = {
        account: 'test-account',
        startdate: '2025-06-01',
        enddate: '2025-06-30',
        type: 1 // VM usage
      };

      const response = await (server as any).handleListUsageRecords(billingParams);

      expect(testFramework.mockClient.listUsageRecords).toHaveBeenCalledWith(
        expect.objectContaining(billingParams)
      );
      testFramework.expectSuccessResponse(response);
    });

    it('should analyze job execution patterns', async () => {
      // Test job execution analytics
      const jobParams = {
        keyword: 'DeployVM',
        startdate: '2025-06-25T00:00:00Z'
      };

      const response = await (server as any).handleListAsyncJobs(jobParams);

      expect(testFramework.mockClient.listAsyncJobs).toHaveBeenCalledWith(
        expect.objectContaining(jobParams)
      );
      testFramework.expectSuccessResponse(response);
    });
  });

  describe('Real-time Monitoring', () => {
    it('should monitor infrastructure health metrics', async () => {
      // Test infrastructure health monitoring
      const healthParams = {
        type: 'Routing',
        state: 'Up'
      };

      const response = await (server as any).handleListHostsMetrics(healthParams);

      expect(testFramework.mockClient.listHostsMetrics).toHaveBeenCalledWith(
        expect.objectContaining(healthParams)
      );
      testFramework.expectSuccessResponse(response);
    });

    it('should monitor storage performance', async () => {
      // Test storage performance monitoring
      const storageParams = {
        zoneid: 'zone-123',
        keyword: 'high-performance'
      };

      const response = await (server as any).handleListVolumeMetrics(storageParams);

      expect(testFramework.mockClient.listVolumeMetrics).toHaveBeenCalledWith(
        expect.objectContaining(storageParams)
      );
      testFramework.expectSuccessResponse(response);
    });

    it('should monitor load balancer performance', async () => {
      // Test load balancer performance monitoring
      const lbParams = {
        account: 'production-account'
      };

      const response = await (server as any).handleListLoadBalancerMetrics(lbParams);

      expect(testFramework.mockClient.listLoadBalancerMetrics).toHaveBeenCalledWith(
        expect.objectContaining(lbParams)
      );
      testFramework.expectSuccessResponse(response);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle metrics collection service unavailable', async () => {
      const error = testFramework.createErrorResponse(
        503,
        'Metrics collection service temporarily unavailable'
      );
      testFramework.mockClient.listVmMetrics.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleListVmMetrics({}),
        'Metrics collection service'
      );
    });

    it('should handle invalid date ranges in usage records', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Date range cannot exceed 90 days'
      );
      testFramework.mockClient.listUsageRecords.mockRejectedValue(error);

      const params = {
        startdate: '2025-01-01',
        enddate: '2025-12-31'
      };

      await testFramework.expectError(
        () => (server as any).handleListUsageRecords(params),
        'Date range cannot exceed'
      );
    });

    it('should handle capacity calculation errors', async () => {
      const error = testFramework.createErrorResponse(
        500,
        'Error calculating capacity: database inconsistency'
      );
      testFramework.mockClient.listCapacity.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleListCapacity({ type: 1 }),
        'Error calculating capacity'
      );
    });

    it('should handle async job query timeouts', async () => {
      const timeoutError = new Error('Job query timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      testFramework.mockClient.queryAsyncJobResult.mockRejectedValue(timeoutError);

      await testFramework.expectError(
        () => (server as any).handleQueryAsyncJobResult({ jobid: 'slow-job-123' }),
        'Job query timeout'
      );
    });

    it('should handle metrics aggregation failures', async () => {
      const error = testFramework.createErrorResponse(
        500,
        'Failed to aggregate host metrics'
      );
      testFramework.mockClient.listHostsMetrics.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleListHostsMetrics({ zoneid: 'problematic-zone' }),
        'Failed to aggregate'
      );
    });

    it('should handle large dataset pagination limits', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Page size exceeds maximum allowed limit of 500'
      );
      testFramework.mockClient.listUsageRecords.mockRejectedValue(error);

      const params = {
        startdate: '2025-06-01',
        enddate: '2025-06-30',
        pagesize: 1000
      };

      await testFramework.expectError(
        () => (server as any).handleListUsageRecords(params),
        'Page size exceeds maximum'
      );
    });

    it('should handle permission errors for monitoring data', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to monitoring and analytics resources'
      );
      testFramework.mockClient.listVmUsageHistory.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleListVmUsageHistory({ virtualmachineid: 'restricted-vm' }),
        'Access denied'
      );
    });

    it('should handle corrupted metrics data', async () => {
      const error = testFramework.createErrorResponse(
        500,
        'Corrupted metrics data detected, please contact administrator'
      );
      testFramework.mockClient.listLoadBalancerMetrics.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleListLoadBalancerMetrics({ id: 'corrupted-lb-123' }),
        'Corrupted metrics data'
      );
    });
  });
});