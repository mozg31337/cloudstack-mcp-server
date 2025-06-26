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

describe('Security & Compliance - Comprehensive Test Suite', () => {
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

  describe('Alert Management', () => {
    describe('list_alerts', () => {
      it('should list alerts successfully', async () => {
        const response = await (server as any).handleListAlerts({});

        expect(testFramework.mockClient.listAlerts).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list alerts with filtering parameters', async () => {
        const params = {
          type: 'MANAGEMENT_NODE_DOWN',
          keyword: 'management',
          startdate: '2025-06-01',
          enddate: '2025-06-30'
        };

        const response = await (server as any).handleListAlerts(params);

        expect(testFramework.mockClient.listAlerts).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('archive_alerts', () => {
      it('should archive alerts successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.archiveAlerts.mockResolvedValue(mockResponse);

        const params = {
          ids: 'alert-123,alert-456',
          type: 'MANAGEMENT_NODE_DOWN'
        };

        const response = await (server as any).handleArchiveAlerts(params);

        expect(testFramework.mockClient.archiveAlerts).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Alert archiving');
      });

      it('should archive alerts by type', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.archiveAlerts.mockResolvedValue(mockResponse);

        const params = {
          type: 'HOST_DOWN',
          startdate: '2025-06-01',
          enddate: '2025-06-30'
        };

        const response = await (server as any).handleArchiveAlerts(params);
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('delete_alerts', () => {
      it('should delete alerts successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteAlerts.mockResolvedValue(mockResponse);

        const params = {
          ids: 'alert-123,alert-456'
        };

        const response = await (server as any).handleDeleteAlerts(params);

        expect(testFramework.mockClient.deleteAlerts).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Alert deletion');
      });

      it('should delete alerts by type and date range', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteAlerts.mockResolvedValue(mockResponse);

        const params = {
          type: 'VM_STOPPED',
          startdate: '2025-06-01',
          enddate: '2025-06-15'
        };

        const response = await (server as any).handleDeleteAlerts(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when no deletion criteria provided', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteAlerts({}),
          'Alert deletion criteria required'
        );
      });
    });
  });

  describe('Event Management', () => {
    describe('list_events', () => {
      it('should list events successfully', async () => {
        const response = await (server as any).handleListEvents({});

        expect(testFramework.mockClient.listEvents).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list events with comprehensive filtering', async () => {
        const params = {
          type: 'VM.CREATE',
          level: 'INFO',
          account: 'test-account',
          domainid: 'domain-123',
          startdate: '2025-06-25T00:00:00Z',
          enddate: '2025-06-25T23:59:59Z',
          keyword: 'virtual machine'
        };

        const response = await (server as any).handleListEvents(params);

        expect(testFramework.mockClient.listEvents).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should list events by duration', async () => {
        const params = {
          duration: 24,
          entrydate: '2025-06-25'
        };

        const response = await (server as any).handleListEvents(params);

        expect(testFramework.mockClient.listEvents).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('Dangerous Action Confirmation', () => {
    describe('confirm_dangerous_action', () => {
      it('should confirm dangerous action successfully', async () => {
        const mockResponse = { 
          confirmed: true, 
          actionId: 'action-123',
          timestamp: '2025-06-25T10:00:00Z'
        };
        testFramework.mockClient.confirmDangerousAction.mockResolvedValue(mockResponse);

        const params = {
          actionId: 'action-123',
          confirmationText: 'destroy permanently'
        };

        const response = await (server as any).handleConfirmDangerousAction(params);

        expect(testFramework.mockClient.confirmDangerousAction).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Action confirmation');
      });

      it('should fail with incorrect confirmation text', async () => {
        const error = testFramework.createErrorResponse(
          400,
          'Confirmation text does not match required text'
        );
        testFramework.mockClient.confirmDangerousAction.mockRejectedValue(error);

        const params = {
          actionId: 'action-123',
          confirmationText: 'incorrect text'
        };

        await testFramework.expectError(
          () => (server as any).handleConfirmDangerousAction(params),
          'Confirmation text does not match'
        );
      });

      it('should fail when action ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleConfirmDangerousAction({ 
            confirmationText: 'destroy permanently' 
          }),
          'Action ID is required'
        );
      });

      it('should fail when confirmation text is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleConfirmDangerousAction({ 
            actionId: 'action-123' 
          }),
          'Confirmation text is required'
        );
      });

      it('should handle expired confirmation requests', async () => {
        const error = testFramework.createErrorResponse(
          400,
          'Confirmation request has expired'
        );
        testFramework.mockClient.confirmDangerousAction.mockRejectedValue(error);

        const params = {
          actionId: 'expired-action-123',
          confirmationText: 'destroy permanently'
        };

        await testFramework.expectError(
          () => (server as any).handleConfirmDangerousAction(params),
          'Confirmation request has expired'
        );
      });

      it('should handle already confirmed actions', async () => {
        const error = testFramework.createErrorResponse(
          400,
          'Action has already been confirmed'
        );
        testFramework.mockClient.confirmDangerousAction.mockRejectedValue(error);

        const params = {
          actionId: 'confirmed-action-123',
          confirmationText: 'destroy permanently'
        };

        await testFramework.expectError(
          () => (server as any).handleConfirmDangerousAction(params),
          'already been confirmed'
        );
      });
    });
  });

  describe('Quota Management & Security', () => {
    describe('quota_statement', () => {
      it('should get quota statement successfully', async () => {
        const response = await (server as any).handleQuotaStatement({});

        expect(testFramework.mockClient.quotaStatement).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should get quota statement with account filtering', async () => {
        const params = {
          account: 'test-account',
          domainid: 'domain-123',
          startdate: '2025-06-01',
          enddate: '2025-06-30'
        };

        const response = await (server as any).handleQuotaStatement(params);

        expect(testFramework.mockClient.quotaStatement).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('quota_credits', () => {
      it('should get quota credits successfully', async () => {
        const response = await (server as any).handleQuotaCredits({});

        expect(testFramework.mockClient.quotaCredits).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should get quota credits with filtering', async () => {
        const params = {
          account: 'test-account',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleQuotaCredits(params);

        expect(testFramework.mockClient.quotaCredits).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('quota_update', () => {
      it('should update quota successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.quotaUpdate.mockResolvedValue(mockResponse);

        const params = {
          account: 'test-account',
          domainid: 'domain-123',
          quotatype: 'VOLUME_STORAGE',
          value: 1000
        };

        const response = await (server as any).handleQuotaUpdate(params);

        expect(testFramework.mockClient.quotaUpdate).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Quota update');
      });

      it('should fail when account is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleQuotaUpdate({ 
            quotatype: 'VOLUME_STORAGE', 
            value: 1000 
          }),
          'Account is required'
        );
      });

      it('should fail when quota type is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleQuotaUpdate({ 
            account: 'test-account', 
            value: 1000 
          }),
          'Quota type is required'
        );
      });
    });

    describe('quota_summary', () => {
      it('should get quota summary successfully', async () => {
        const response = await (server as any).handleQuotaSummary({});

        expect(testFramework.mockClient.quotaSummary).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should get quota summary with account details', async () => {
        const params = {
          account: 'test-account',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleQuotaSummary(params);

        expect(testFramework.mockClient.quotaSummary).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('quota_balance', () => {
      it('should get quota balance successfully', async () => {
        const response = await (server as any).handleQuotaBalance({});

        expect(testFramework.mockClient.quotaBalance).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should get quota balance with account specification', async () => {
        const params = {
          account: 'test-account',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleQuotaBalance(params);

        expect(testFramework.mockClient.quotaBalance).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('Security Audit & Compliance', () => {
    it('should track security event correlations', async () => {
      // Test security event tracking
      const securityParams = {
        type: 'SECURITY_VIOLATION',
        level: 'ERROR',
        account: 'suspicious-account'
      };

      const response = await (server as any).handleListEvents(securityParams);

      expect(testFramework.mockClient.listEvents).toHaveBeenCalledWith(
        expect.objectContaining(securityParams)
      );
      testFramework.expectSuccessResponse(response);
    });

    it('should validate compliance alert patterns', async () => {
      // Test compliance monitoring
      const complianceParams = {
        type: 'COMPLIANCE_VIOLATION',
        startdate: '2025-06-01',
        enddate: '2025-06-30'
      };

      const response = await (server as any).handleListAlerts(complianceParams);

      expect(testFramework.mockClient.listAlerts).toHaveBeenCalledWith(
        expect.objectContaining(complianceParams)
      );
      testFramework.expectSuccessResponse(response);
    });

    it('should enforce quota compliance validation', async () => {
      // Test quota enforcement
      const quotaParams = {
        account: 'over-quota-account',
        quotatype: 'VM_INSTANCE'
      };

      const response = await (server as any).handleQuotaSummary(quotaParams);

      expect(testFramework.mockClient.quotaSummary).toHaveBeenCalledWith(
        expect.objectContaining(quotaParams)
      );
      testFramework.expectSuccessResponse(response);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle alert system unavailable', async () => {
      const error = testFramework.createErrorResponse(
        503,
        'Alert management service temporarily unavailable'
      );
      testFramework.mockClient.listAlerts.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleListAlerts({}),
        'Alert management service'
      );
    });

    it('should handle invalid event date ranges', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Invalid date range: start date must be before end date'
      );
      testFramework.mockClient.listEvents.mockRejectedValue(error);

      const params = {
        startdate: '2025-06-30',
        enddate: '2025-06-01'
      };

      await testFramework.expectError(
        () => (server as any).handleListEvents(params),
        'Invalid date range'
      );
    });

    it('should handle quota limit violations', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Quota update would exceed maximum allowed limit'
      );
      testFramework.mockClient.quotaUpdate.mockRejectedValue(error);

      const params = {
        account: 'test-account',
        quotatype: 'VM_INSTANCE',
        value: 999999
      };

      await testFramework.expectError(
        () => (server as any).handleQuotaUpdate(params),
        'exceed maximum allowed'
      );
    });

    it('should handle security permission violations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to security and compliance resources'
      );
      testFramework.mockClient.deleteAlerts.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteAlerts({ ids: 'alert-123' }),
        'Access denied'
      );
    });

    it('should handle confirmation system failures', async () => {
      const error = testFramework.createErrorResponse(
        500,
        'Dangerous action confirmation system is temporarily unavailable'
      );
      testFramework.mockClient.confirmDangerousAction.mockRejectedValue(error);

      const params = {
        actionId: 'action-123',
        confirmationText: 'destroy permanently'
      };

      await testFramework.expectError(
        () => (server as any).handleConfirmDangerousAction(params),
        'confirmation system is temporarily unavailable'
      );
    });

    it('should handle quota database inconsistencies', async () => {
      const error = testFramework.createErrorResponse(
        500,
        'Quota database inconsistency detected'
      );
      testFramework.mockClient.quotaBalance.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleQuotaBalance({ account: 'inconsistent-account' }),
        'Quota database inconsistency'
      );
    });

    it('should handle large-scale alert archiving timeouts', async () => {
      const timeoutError = new Error('Alert archiving operation timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      testFramework.mockClient.archiveAlerts.mockRejectedValue(timeoutError);

      const params = {
        startdate: '2025-01-01',
        enddate: '2025-06-30'
      };

      await testFramework.expectError(
        () => (server as any).handleArchiveAlerts(params),
        'Alert archiving operation timeout'
      );
    });

    it('should handle concurrent dangerous action conflicts', async () => {
      const error = testFramework.createErrorResponse(
        409,
        'Another confirmation request is already pending for this action'
      );
      testFramework.mockClient.confirmDangerousAction.mockRejectedValue(error);

      const params = {
        actionId: 'concurrent-action-123',
        confirmationText: 'destroy permanently'
      };

      await testFramework.expectError(
        () => (server as any).handleConfirmDangerousAction(params),
        'Another confirmation request'
      );
    });
  });
});