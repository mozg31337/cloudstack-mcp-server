import { ConfirmationMiddleware, ConfirmationMiddlewareOptions } from '../../src/security/ConfirmationMiddleware';
import { DangerousActionConfirmation } from '../../src/security/DangerousActionConfirmation';
import { SecurityAuditLogger } from '../../src/security/SecurityAuditLogger';
import { tmpdir } from 'os';
import { join } from 'path';

describe('ConfirmationMiddleware', () => {
  let confirmationMiddleware: ConfirmationMiddleware;
  let dangerousActionConfirmation: DangerousActionConfirmation;
  let auditLogger: SecurityAuditLogger;
  let testLogDirectory: string;

  beforeEach(() => {
    testLogDirectory = join(tmpdir(), `confirmation-middleware-test-${Date.now()}`);
    auditLogger = new SecurityAuditLogger(testLogDirectory);
    dangerousActionConfirmation = new DangerousActionConfirmation(auditLogger);
    
    const options: ConfirmationMiddlewareOptions = {
      confirmationTimeoutMs: 5000, // 5 seconds for testing
      maxPendingConfirmations: 10,
      enableBypass: true,
      bypassEnvironments: ['test', 'development']
    };
    
    confirmationMiddleware = new ConfirmationMiddleware(
      dangerousActionConfirmation,
      auditLogger,
      options
    );
  });

  describe('Confirmation Requirement Check', () => {
    test('should require confirmation for dangerous operations', () => {
      expect(confirmationMiddleware.requiresConfirmation('destroy_virtual_machine')).toBe(true);
      expect(confirmationMiddleware.requiresConfirmation('delete_account')).toBe(true);
      expect(confirmationMiddleware.requiresConfirmation('expunge_virtual_machine')).toBe(true);
    });

    test('should not require confirmation for safe operations', () => {
      expect(confirmationMiddleware.requiresConfirmation('list_virtual_machines')).toBe(false);
      expect(confirmationMiddleware.requiresConfirmation('list_networks')).toBe(false);
      expect(confirmationMiddleware.requiresConfirmation('get_vm_details')).toBe(false);
    });

    test('should bypass confirmation for configured environments', () => {
      expect(confirmationMiddleware.requiresConfirmation('destroy_virtual_machine', 'test')).toBe(false);
      expect(confirmationMiddleware.requiresConfirmation('delete_account', 'development')).toBe(false);
      expect(confirmationMiddleware.requiresConfirmation('destroy_virtual_machine', 'production')).toBe(true);
    });
  });

  describe('Confirmation Request Creation', () => {
    test('should create confirmation request for dangerous operations', () => {
      const parameters = {
        id: 'vm-12345',
        expunge: true
      };

      const request = confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        parameters,
        'test-user',
        'production'
      );

      expect(request).toBeDefined();
      expect(request!.toolName).toBe('destroy_virtual_machine');
      expect(request!.parameters).toEqual(parameters);
      expect(request!.correlationId).toBeDefined();
      expect(request!.timestamp).toBeGreaterThan(0);

      // Should be stored as pending
      const pending = confirmationMiddleware.getPendingConfirmation(request!.correlationId);
      expect(pending).toBeDefined();
      expect(pending!.request).toEqual(request);
    });

    test('should return null for safe operations', () => {
      const request = confirmationMiddleware.createConfirmationRequest(
        'list_virtual_machines',
        {},
        'test-user',
        'production'
      );

      expect(request).toBeNull();
    });

    test('should throw error when max pending confirmations exceeded', () => {
      // Create maximum number of pending confirmations
      for (let i = 0; i < 10; i++) {
        confirmationMiddleware.createConfirmationRequest(
          'destroy_virtual_machine',
          { id: `vm-${i}` },
          'test-user',
          'production'
        );
      }

      // This should throw an error
      expect(() => {
        confirmationMiddleware.createConfirmationRequest(
          'destroy_virtual_machine',
          { id: 'vm-overflow' },
          'test-user',
          'production'
        );
      }).toThrow('Maximum number of pending confirmations exceeded');
    });
  });

  describe('Confirmation Response Processing', () => {
    let confirmationRequest: any;

    beforeEach(() => {
      confirmationRequest = confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-12345' },
        'test-user',
        'production'
      );
    });

    test('should process valid confirmation response', () => {
      const result = confirmationMiddleware.processConfirmationResponse(
        confirmationRequest.correlationId,
        true,
        'destroy permanently',
        'test-user'
      );

      expect(result.success).toBe(true);
      expect(result.allowOperation).toBe(true);
      expect(result.error).toBeUndefined();

      // Should be removed from pending confirmations
      const pending = confirmationMiddleware.getPendingConfirmation(confirmationRequest.correlationId);
      expect(pending).toBeUndefined();
    });

    test('should reject response with invalid correlation ID', () => {
      const result = confirmationMiddleware.processConfirmationResponse(
        'invalid-correlation-id',
        true,
        'destroy permanently',
        'test-user'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired confirmation request');
      expect(result.allowOperation).toBeUndefined();
    });

    test('should reject response with wrong confirmation text', () => {
      const result = confirmationMiddleware.processConfirmationResponse(
        confirmationRequest.correlationId,
        true,
        'wrong confirmation text',
        'test-user'
      );

      expect(result.success).toBe(false);
      expect(result.allowOperation).toBe(false);
      expect(result.error).toContain('Invalid confirmation text');
    });

    test('should handle user denial', () => {
      const result = confirmationMiddleware.processConfirmationResponse(
        confirmationRequest.correlationId,
        false,
        undefined,
        'test-user'
      );

      expect(result.success).toBe(false);
      expect(result.allowOperation).toBe(false);
      expect(result.error).toBe('Operation cancelled by user');
    });
  });

  describe('Confirmation Cancellation', () => {
    test('should cancel pending confirmation', () => {
      const request = confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-12345' },
        'test-user',
        'production'
      );

      const cancelled = confirmationMiddleware.cancelConfirmation(
        request!.correlationId,
        'test-user',
        'manual_cancellation'
      );

      expect(cancelled).toBe(true);

      // Should be removed from pending confirmations
      const pending = confirmationMiddleware.getPendingConfirmation(request!.correlationId);
      expect(pending).toBeUndefined();
    });

    test('should return false for non-existent confirmation', () => {
      const cancelled = confirmationMiddleware.cancelConfirmation(
        'non-existent-id',
        'test-user',
        'manual_cancellation'
      );

      expect(cancelled).toBe(false);
    });
  });

  describe('Confirmation Formatting', () => {
    test('should format confirmation request for display', () => {
      const request = confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-12345', expunge: true },
        'test-user',
        'production'
      );

      const formatted = confirmationMiddleware.formatConfirmationRequest(request!);

      expect(formatted.title).toContain('DANGEROUS OPERATION CONFIRMATION REQUIRED');
      expect(formatted.description).toContain('virtual machine');
      expect(formatted.warningMessage).toContain('PERMANENTLY DESTROY');
      expect(formatted.confirmationInstructions).toContain('destroy permanently');
      expect(formatted.actionDetails.category).toBe('Virtual Machine Operations');
      expect(formatted.actionDetails.severity).toBe('CRITICAL');
      expect(formatted.actionDetails.reversible).toBe(false);
      expect(formatted.parameters).toEqual({ id: 'vm-12345', expunge: true });
    });

    test('should hide sensitive parameters in formatting', () => {
      const request = confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        { 
          id: 'vm-12345', 
          password: 'secret-password',
          apikey: 'secret-key' 
        },
        'test-user',
        'production'
      );

      const formatted = confirmationMiddleware.formatConfirmationRequest(request!);

      expect(formatted.parameters.id).toBe('vm-12345');
      expect(formatted.parameters.password).toBe('[HIDDEN FOR SECURITY]');
      expect(formatted.parameters.apikey).toBe('[HIDDEN FOR SECURITY]');
    });
  });

  describe('Pending Confirmations Management', () => {
    test('should track pending confirmations', () => {
      const request1 = confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-1' },
        'user1',
        'production'
      );

      const request2 = confirmationMiddleware.createConfirmationRequest(
        'delete_account',
        { id: 'account-1' },
        'user2',
        'production'
      );

      const allPending = confirmationMiddleware.getAllPendingConfirmations();
      expect(allPending.size).toBe(2);
      expect(allPending.has(request1!.correlationId)).toBe(true);
      expect(allPending.has(request2!.correlationId)).toBe(true);
    });

    test('should provide access to individual pending confirmation', () => {
      const request = confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-12345' },
        'test-user',
        'production'
      );

      const pending = confirmationMiddleware.getPendingConfirmation(request!.correlationId);
      expect(pending).toBeDefined();
      expect(pending!.request).toEqual(request);
      expect(pending!.timeout).toBeDefined();
      expect(pending!.createdAt).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide comprehensive statistics', () => {
      // Create some pending confirmations
      confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-1' },
        'user1',
        'production'
      );

      confirmationMiddleware.createConfirmationRequest(
        'delete_account',
        { id: 'account-1' },
        'user2',
        'production'
      );

      const stats = confirmationMiddleware.getConfirmationStatistics();

      expect(stats.pendingConfirmations).toBe(2);
      expect(stats.dangerousActionStats).toBeDefined();
      expect(stats.dangerousActionStats.totalActions).toBeGreaterThan(0);
      expect(stats.recentActivity).toBeDefined();
      expect(stats.recentActivity.totalRequests).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Timeout Handling', () => {
    test('should handle confirmation timeout', (done) => {
      const request = confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-12345' },
        'test-user',
        'production'
      );

      // Wait for timeout (5 seconds + buffer)
      setTimeout(() => {
        const pending = confirmationMiddleware.getPendingConfirmation(request!.correlationId);
        expect(pending).toBeUndefined();
        done();
      }, 6000);
    }, 7000);
  });

  describe('Environment Bypass', () => {
    test('should bypass confirmation in test environments', () => {
      const middlewareWithBypass = new ConfirmationMiddleware(
        dangerousActionConfirmation,
        auditLogger,
        {
          enableBypass: true,
          bypassEnvironments: ['test', 'development']
        }
      );

      expect(middlewareWithBypass.requiresConfirmation('destroy_virtual_machine', 'test')).toBe(false);
      expect(middlewareWithBypass.requiresConfirmation('delete_account', 'development')).toBe(false);
      expect(middlewareWithBypass.requiresConfirmation('destroy_virtual_machine', 'production')).toBe(true);
    });

    test('should not bypass when disabled', () => {
      const middlewareWithoutBypass = new ConfirmationMiddleware(
        dangerousActionConfirmation,
        auditLogger,
        {
          enableBypass: false,
          bypassEnvironments: ['test', 'development']
        }
      );

      expect(middlewareWithoutBypass.requiresConfirmation('destroy_virtual_machine', 'test')).toBe(true);
      expect(middlewareWithoutBypass.requiresConfirmation('delete_account', 'development')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed confirmation requests gracefully', () => {
      expect(() => {
        confirmationMiddleware.processConfirmationResponse(
          null as any,
          true,
          'destroy permanently',
          'test-user'
        );
      }).not.toThrow();
    });

    test('should handle cleanup of expired confirmations', () => {
      // This is tested implicitly through timeout handling
      // The middleware should clean up expired confirmations automatically
      const request = confirmationMiddleware.createConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-12345' },
        'test-user',
        'production'
      );

      expect(request).toBeDefined();
      // Cleanup happens automatically via setTimeout in the middleware
    });
  });

  describe('Integration with Dangerous Action Confirmation', () => {
    test('should properly integrate with dangerous action detection', () => {
      // Test that all operations detected as dangerous by DangerousActionConfirmation
      // are also handled by ConfirmationMiddleware
      const dangerousOperations = [
        'destroy_virtual_machine',
        'expunge_virtual_machine',
        'delete_account',
        'delete_domain',
        'delete_zone',
        'stop_virtual_machine',
        'reboot_virtual_machine'
      ];

      for (const operation of dangerousOperations) {
        expect(confirmationMiddleware.requiresConfirmation(operation)).toBe(true);
        
        const request = confirmationMiddleware.createConfirmationRequest(
          operation,
          { id: 'test-id' },
          'test-user',
          'production'
        );
        
        expect(request).toBeDefined();
        expect(request!.toolName).toBe(operation);
      }
    });
  });
});