import { DangerousActionConfirmation, DangerousActionConfig } from '../../src/security/DangerousActionConfirmation';
import { SecurityAuditLogger } from '../../src/security/SecurityAuditLogger';

jest.mock('../../src/security/SecurityAuditLogger');

describe('DangerousActionConfirmation - New Actions', () => {
  let dangerousActionConfirmation: DangerousActionConfirmation;
  let mockAuditLogger: jest.Mocked<SecurityAuditLogger>;

  beforeEach(() => {
    mockAuditLogger = {
      logSecurityEvent: jest.fn(),
      logSecurityViolation: jest.fn(),
      getSecurityMetrics: jest.fn(),
      exportSecurityEvents: jest.fn()
    } as any;

    dangerousActionConfirmation = new DangerousActionConfirmation(mockAuditLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('delete_image_store dangerous action', () => {
    it('should be registered as a dangerous action', () => {
      const isDangerous = dangerousActionConfirmation.isDangerousAction('delete_image_store');
      expect(isDangerous).toBe(true);
    });

    it('should have correct configuration', () => {
      const config = dangerousActionConfirmation.getDangerousActionConfig('delete_image_store');
      
      expect(config).toBeDefined();
      expect(config!.severity).toBe('critical');
      expect(config!.category).toBe('Image Store Operations');
      expect(config!.description).toBe('Delete an image store backend');
      expect(config!.warningMessage).toContain('PERMANENTLY DELETE');
      expect(config!.warningMessage).toContain('templates, ISOs, and snapshots');
      expect(config!.requiredConfirmation).toBe('delete image store permanently');
      expect(config!.reversible).toBe(false);
      expect(config!.impactScope).toBe('infrastructure');
    });

    it('should generate confirmation request', () => {
      const params = { id: 'store-123' };
      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_image_store',
        params
      );

      expect(request).toBeDefined();
      expect(request!.toolName).toBe('delete_image_store');
      expect(request!.parameters).toEqual(params);
      expect(request!.action.severity).toBe('critical');
      expect(request!.correlationId).toMatch(/^confirm-\d+-[a-z0-9]+$/);
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'confirmation_requested',
          resource: 'delete_image_store'
        })
      );
    });

    it('should validate confirmation response correctly', () => {
      const params = { id: 'store-123' };
      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_image_store',
        params
      );

      const validResponse = {
        confirmed: true,
        userInput: 'delete image store permanently',
        correlationId: request!.correlationId,
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        request!,
        validResponse
      );

      expect(isValid).toBe(true);
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'confirmation_validated',
          resource: 'delete_image_store'
        })
      );
    });

    it('should reject incorrect confirmation text', () => {
      const params = { id: 'store-123' };
      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_image_store',
        params
      );

      const invalidResponse = {
        confirmed: true,
        userInput: 'delete store',
        correlationId: request!.correlationId,
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        request!,
        invalidResponse
      );

      expect(isValid).toBe(false);
      expect(mockAuditLogger.logSecurityViolation).toHaveBeenCalledWith(
        'dangerous-action-confirmation',
        'invalid_confirmation_text',
        expect.anything(),
        expect.objectContaining({
          toolName: 'delete_image_store',
          expectedText: 'delete image store permanently',
          receivedText: 'delete store'
        })
      );
    });
  });

  describe('delete_pod dangerous action', () => {
    it('should be registered as a dangerous action', () => {
      const isDangerous = dangerousActionConfirmation.isDangerousAction('delete_pod');
      expect(isDangerous).toBe(true);
    });

    it('should have correct configuration', () => {
      const config = dangerousActionConfirmation.getDangerousActionConfig('delete_pod');
      
      expect(config).toBeDefined();
      expect(config!.severity).toBe('critical');
      expect(config!.category).toBe('Infrastructure Management');
      expect(config!.description).toBe('Delete a pod');
      expect(config!.warningMessage).toContain('DELETE the pod');
      expect(config!.warningMessage).toContain('ALL hosts, primary storage, and VMs');
      expect(config!.requiredConfirmation).toBe('delete pod permanently');
      expect(config!.reversible).toBe(false);
      expect(config!.impactScope).toBe('infrastructure');
    });

    it('should generate confirmation request', () => {
      const params = { id: 'pod-123' };
      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_pod',
        params
      );

      expect(request).toBeDefined();
      expect(request!.toolName).toBe('delete_pod');
      expect(request!.parameters).toEqual(params);
      expect(request!.action.severity).toBe('critical');
      expect(request!.correlationId).toMatch(/^confirm-\d+-[a-z0-9]+$/);
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'confirmation_requested',
          resource: 'delete_pod'
        })
      );
    });

    it('should validate confirmation response correctly', () => {
      const params = { id: 'pod-123' };
      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_pod',
        params
      );

      const validResponse = {
        confirmed: true,
        userInput: 'delete pod permanently',
        correlationId: request!.correlationId,
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        request!,
        validResponse
      );

      expect(isValid).toBe(true);
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'confirmation_validated',
          resource: 'delete_pod'
        })
      );
    });

    it('should reject when confirmation is denied', () => {
      const params = { id: 'pod-123' };
      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_pod',
        params
      );

      const deniedResponse = {
        confirmed: false,
        correlationId: request!.correlationId,
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        request!,
        deniedResponse
      );

      expect(isValid).toBe(false);
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'confirmation_denied',
          resource: 'delete_pod'
        })
      );
    });
  });

  describe('dangerous action statistics', () => {
    it('should include new dangerous actions in statistics', () => {
      const stats = dangerousActionConfirmation.getDangerousActionStatistics();

      expect(stats.totalActions).toBeGreaterThan(0);
      expect(stats.bySeverity.critical).toBeGreaterThan(0);
      expect(stats.byCategory['Image Store Operations']).toBe(1);
      expect(stats.byCategory['Infrastructure Management']).toBeGreaterThan(1); // Includes existing infrastructure actions
      expect(stats.byImpactScope.infrastructure).toBeGreaterThan(0);
      expect(stats.irreversibleActions).toBeGreaterThan(0);
    });

    it('should categorize new actions correctly', () => {
      const allActions = dangerousActionConfirmation.getAllDangerousActions();

      const imageStoreAction = allActions.get('delete_image_store');
      const podAction = allActions.get('delete_pod');

      expect(imageStoreAction).toBeDefined();
      expect(imageStoreAction!.category).toBe('Image Store Operations');
      expect(imageStoreAction!.severity).toBe('critical');
      expect(imageStoreAction!.impactScope).toBe('infrastructure');

      expect(podAction).toBeDefined();
      expect(podAction!.category).toBe('Infrastructure Management');
      expect(podAction!.severity).toBe('critical');
      expect(podAction!.impactScope).toBe('infrastructure');
    });
  });

  describe('parameter sanitization', () => {
    it('should sanitize sensitive parameters in image store operations', () => {
      const params = {
        id: 'store-123',
        accesskey: 'AKIAIOSFODNN7EXAMPLE',
        secretkey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      };

      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_image_store',
        params
      );

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            parameters: expect.objectContaining({
              id: 'store-123',
              accesskey: '[REDACTED]',
              secretkey: '[REDACTED]'
            })
          })
        })
      );
    });

    it('should handle long parameter values', () => {
      const longValue = 'a'.repeat(150);
      const params = {
        id: 'pod-123',
        description: longValue
      };

      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_pod',
        params
      );

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            parameters: expect.objectContaining({
              id: 'pod-123',
              description: expect.stringMatching(/^a{100}.*\[TRUNCATED\]$/)
            })
          })
        })
      );
    });
  });

  describe('correlation ID validation', () => {
    it('should reject mismatched correlation IDs', () => {
      const params = { id: 'store-123' };
      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_image_store',
        params
      );

      const responseWithWrongId = {
        confirmed: true,
        userInput: 'delete image store permanently',
        correlationId: 'wrong-correlation-id',
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        request!,
        responseWithWrongId
      );

      expect(isValid).toBe(false);
      expect(mockAuditLogger.logSecurityViolation).toHaveBeenCalledWith(
        'dangerous-action-confirmation',
        'correlation_id_mismatch',
        expect.anything(),
        expect.objectContaining({
          expectedCorrelationId: request!.correlationId,
          receivedCorrelationId: 'wrong-correlation-id'
        })
      );
    });
  });

  describe('non-dangerous actions', () => {
    it('should not treat safe operations as dangerous', () => {
      const safeActions = [
        'list_image_stores',
        'list_pods',
        'list_ca_providers',
        'add_image_store',
        'create_pod',
        'issue_certificate'
      ];

      for (const action of safeActions) {
        expect(dangerousActionConfirmation.isDangerousAction(action)).toBe(false);
      }
    });

    it('should return null for non-dangerous action confirmation requests', () => {
      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'list_image_stores',
        {}
      );

      expect(request).toBeNull();
      expect(mockAuditLogger.logSecurityEvent).not.toHaveBeenCalled();
    });
  });
});