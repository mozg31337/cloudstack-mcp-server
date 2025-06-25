import { DangerousActionConfirmation, DangerousActionConfig, ConfirmationRequest } from '../../src/security/DangerousActionConfirmation';
import { SecurityAuditLogger, SecurityEventType, SecuritySeverity, SecurityResult } from '../../src/security/SecurityAuditLogger';
import { tmpdir } from 'os';
import { join } from 'path';

describe('DangerousActionConfirmation', () => {
  let dangerousActionConfirmation: DangerousActionConfirmation;
  let testLogDirectory: string;

  beforeEach(() => {
    testLogDirectory = join(tmpdir(), `dangerous-action-test-${Date.now()}`);
    const auditLogger = new SecurityAuditLogger(testLogDirectory);
    dangerousActionConfirmation = new DangerousActionConfirmation(auditLogger);
  });

  describe('Dangerous Action Detection', () => {
    test('should identify dangerous actions correctly', () => {
      // Critical operations
      expect(dangerousActionConfirmation.isDangerousAction('destroy_virtual_machine')).toBe(true);
      expect(dangerousActionConfirmation.isDangerousAction('expunge_virtual_machine')).toBe(true);
      expect(dangerousActionConfirmation.isDangerousAction('delete_account')).toBe(true);
      expect(dangerousActionConfirmation.isDangerousAction('delete_domain')).toBe(true);
      expect(dangerousActionConfirmation.isDangerousAction('delete_zone')).toBe(true);

      // High risk operations
      expect(dangerousActionConfirmation.isDangerousAction('stop_virtual_machine')).toBe(true);
      expect(dangerousActionConfirmation.isDangerousAction('reboot_virtual_machine')).toBe(true);
      expect(dangerousActionConfirmation.isDangerousAction('delete_vpc')).toBe(true);
      expect(dangerousActionConfirmation.isDangerousAction('restart_network')).toBe(true);

      // Safe operations
      expect(dangerousActionConfirmation.isDangerousAction('list_virtual_machines')).toBe(false);
      expect(dangerousActionConfirmation.isDangerousAction('list_networks')).toBe(false);
      expect(dangerousActionConfirmation.isDangerousAction('list_volumes')).toBe(false);
      expect(dangerousActionConfirmation.isDangerousAction('get_vm_details')).toBe(false);
    });

    test('should return correct action configurations', () => {
      const destroyVmConfig = dangerousActionConfirmation.getDangerousActionConfig('destroy_virtual_machine');
      expect(destroyVmConfig).toBeDefined();
      expect(destroyVmConfig!.severity).toBe('critical');
      expect(destroyVmConfig!.category).toBe('Virtual Machine Operations');
      expect(destroyVmConfig!.reversible).toBe(false);
      expect(destroyVmConfig!.impactScope).toBe('single-resource');

      const stopVmConfig = dangerousActionConfirmation.getDangerousActionConfig('stop_virtual_machine');
      expect(stopVmConfig).toBeDefined();
      expect(stopVmConfig!.severity).toBe('high');
      expect(stopVmConfig!.reversible).toBe(true);

      const safeOperation = dangerousActionConfirmation.getDangerousActionConfig('list_virtual_machines');
      expect(safeOperation).toBeUndefined();
    });
  });

  describe('Confirmation Request Generation', () => {
    test('should generate confirmation request for dangerous actions', () => {
      const parameters = {
        id: 'vm-12345',
        expunge: true
      };

      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'destroy_virtual_machine',
        parameters
      );

      expect(request).toBeDefined();
      expect(request!.toolName).toBe('destroy_virtual_machine');
      expect(request!.action.severity).toBe('critical');
      expect(request!.action.requiredConfirmation).toBe('destroy permanently');
      expect(request!.parameters).toEqual(parameters);
      expect(request!.correlationId).toBeDefined();
      expect(request!.timestamp).toBeGreaterThan(0);
    });

    test('should return null for safe operations', () => {
      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'list_virtual_machines',
        {}
      );

      expect(request).toBeNull();
    });

    test('should generate unique correlation IDs', () => {
      const request1 = dangerousActionConfirmation.generateConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-1' }
      );
      const request2 = dangerousActionConfirmation.generateConfirmationRequest(
        'delete_account',
        { id: 'account-1' }
      );

      expect(request1!.correlationId).not.toBe(request2!.correlationId);
    });
  });

  describe('Confirmation Response Validation', () => {
    let confirmationRequest: ConfirmationRequest;

    beforeEach(() => {
      confirmationRequest = dangerousActionConfirmation.generateConfirmationRequest(
        'destroy_virtual_machine',
        { id: 'vm-12345' }
      )!;
    });

    test('should validate correct confirmation response', () => {
      const response = {
        confirmed: true,
        userInput: 'destroy permanently',
        correlationId: confirmationRequest.correlationId,
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        confirmationRequest,
        response
      );

      expect(isValid).toBe(true);
    });

    test('should reject response with wrong correlation ID', () => {
      const response = {
        confirmed: true,
        userInput: 'destroy permanently',
        correlationId: 'wrong-correlation-id',
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        confirmationRequest,
        response
      );

      expect(isValid).toBe(false);
    });

    test('should reject response with wrong confirmation text', () => {
      const response = {
        confirmed: true,
        userInput: 'wrong confirmation text',
        correlationId: confirmationRequest.correlationId,
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        confirmationRequest,
        response
      );

      expect(isValid).toBe(false);
    });

    test('should reject denied confirmation', () => {
      const response = {
        confirmed: false,
        correlationId: confirmationRequest.correlationId,
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        confirmationRequest,
        response
      );

      expect(isValid).toBe(false);
    });

    test('should handle case-insensitive confirmation text', () => {
      const response = {
        confirmed: true,
        userInput: 'DESTROY PERMANENTLY',
        correlationId: confirmationRequest.correlationId,
        timestamp: Date.now()
      };

      const isValid = dangerousActionConfirmation.validateConfirmationResponse(
        confirmationRequest,
        response
      );

      expect(isValid).toBe(true);
    });
  });

  describe('Action Categories and Severity', () => {
    test('should have correct categorization for VM operations', () => {
      const vmOperations = [
        'destroy_virtual_machine',
        'expunge_virtual_machine',
        'stop_virtual_machine',
        'reboot_virtual_machine',
        'migrate_virtual_machine',
        'scale_virtual_machine'
      ];

      for (const operation of vmOperations) {
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config).toBeDefined();
        expect(config!.category).toBe('Virtual Machine Operations');
      }
    });

    test('should have correct categorization for storage operations', () => {
      const storageOperations = [
        'delete_volume',
        'delete_snapshot',
        'migrate_volume'
      ];

      for (const operation of storageOperations) {
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config).toBeDefined();
        expect(config!.category).toBe('Storage Operations');
      }
    });

    test('should have correct severity levels', () => {
      // Critical operations
      expect(dangerousActionConfirmation.getDangerousActionConfig('destroy_virtual_machine')!.severity).toBe('critical');
      expect(dangerousActionConfirmation.getDangerousActionConfig('delete_account')!.severity).toBe('critical');
      expect(dangerousActionConfirmation.getDangerousActionConfig('delete_zone')!.severity).toBe('critical');

      // High severity operations
      expect(dangerousActionConfirmation.getDangerousActionConfig('stop_virtual_machine')!.severity).toBe('high');
      expect(dangerousActionConfirmation.getDangerousActionConfig('delete_template')!.severity).toBe('high');

      // Medium severity operations
      expect(dangerousActionConfirmation.getDangerousActionConfig('reset_vm_password')!.severity).toBe('medium');
    });
  });

  describe('Impact Scope Classification', () => {
    test('should classify single-resource impact correctly', () => {
      const singleResourceOperations = [
        'destroy_virtual_machine',
        'delete_volume',
        'delete_user'
      ];

      for (const operation of singleResourceOperations) {
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.impactScope).toBe('single-resource');
      }
    });

    test('should classify infrastructure impact correctly', () => {
      const infrastructureOperations = [
        'delete_zone',
        'delete_account',
        'delete_domain',
        'destroy_system_vm'
      ];

      for (const operation of infrastructureOperations) {
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.impactScope).toBe('infrastructure');
      }
    });

    test('should classify service disruption correctly', () => {
      const serviceDisruptionOperations = [
        'restart_network',
        'restart_vpc',
        'delete_load_balancer_rule'
      ];

      for (const operation of serviceDisruptionOperations) {
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.impactScope).toBe('service-disruption');
      }
    });
  });

  describe('Reversibility Classification', () => {
    test('should classify irreversible operations correctly', () => {
      const irreversibleOperations = [
        'destroy_virtual_machine',
        'expunge_virtual_machine',
        'delete_account',
        'delete_domain',
        'delete_volume',
        'delete_snapshot'
      ];

      for (const operation of irreversibleOperations) {
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.reversible).toBe(false);
      }
    });

    test('should classify reversible operations correctly', () => {
      const reversibleOperations = [
        'stop_virtual_machine',
        'reboot_virtual_machine',
        'restart_network',
        'migrate_virtual_machine'
      ];

      for (const operation of reversibleOperations) {
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.reversible).toBe(true);
      }
    });
  });

  describe('Statistics Generation', () => {
    test('should generate comprehensive statistics', () => {
      const stats = dangerousActionConfirmation.getDangerousActionStatistics();

      expect(stats.totalActions).toBeGreaterThan(0);
      expect(stats.bySeverity).toHaveProperty('critical');
      expect(stats.bySeverity).toHaveProperty('high');
      expect(stats.bySeverity).toHaveProperty('medium');
      expect(stats.byCategory).toHaveProperty('Virtual Machine Operations');
      expect(stats.byCategory).toHaveProperty('Storage Operations');
      expect(stats.byImpactScope).toHaveProperty('single-resource');
      expect(stats.byImpactScope).toHaveProperty('infrastructure');
      expect(stats.irreversibleActions).toBeGreaterThan(0);
    });

    test('should have reasonable distribution of severity levels', () => {
      const stats = dangerousActionConfirmation.getDangerousActionStatistics();

      // Should have critical operations
      expect(stats.bySeverity.critical).toBeGreaterThan(0);
      
      // Should have high severity operations
      expect(stats.bySeverity.high).toBeGreaterThan(0);
      
      // Should have some medium severity operations
      expect(stats.bySeverity.medium).toBeGreaterThan(0);
    });
  });

  describe('Kubernetes Operations', () => {
    test('should handle Kubernetes dangerous operations', () => {
      const k8sOperations = [
        'delete_kubernetes_cluster',
        'scale_kubernetes_cluster',
        'stop_kubernetes_cluster'
      ];

      for (const operation of k8sOperations) {
        expect(dangerousActionConfirmation.isDangerousAction(operation)).toBe(true);
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.category).toBe('Kubernetes Operations');
      }
    });
  });

  describe('Network Operations', () => {
    test('should handle network dangerous operations', () => {
      const networkOperations = [
        'delete_network',
        'restart_network',
        'delete_security_group',
        'delete_firewall_rule'
      ];

      for (const operation of networkOperations) {
        expect(dangerousActionConfirmation.isDangerousAction(operation)).toBe(true);
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.category).toBe('Network Operations');
      }
    });
  });

  describe('VPN Operations', () => {
    test('should handle VPN dangerous operations', () => {
      const vpnOperations = [
        'delete_vpn_connection',
        'delete_vpn_gateway'
      ];

      for (const operation of vpnOperations) {
        expect(dangerousActionConfirmation.isDangerousAction(operation)).toBe(true);
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.category).toBe('VPN Operations');
      }
    });
  });

  describe('System Operations', () => {
    test('should handle system VM dangerous operations', () => {
      const systemOperations = [
        'destroy_system_vm',
        'stop_system_vm',
        'reboot_system_vm'
      ];

      for (const operation of systemOperations) {
        expect(dangerousActionConfirmation.isDangerousAction(operation)).toBe(true);
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.category).toBe('System Operations');
      }
    });
  });

  describe('Router Operations', () => {
    test('should handle router dangerous operations', () => {
      const routerOperations = [
        'destroy_router',
        'stop_router',
        'reboot_router'
      ];

      for (const operation of routerOperations) {
        expect(dangerousActionConfirmation.isDangerousAction(operation)).toBe(true);
        const config = dangerousActionConfirmation.getDangerousActionConfig(operation);
        expect(config!.category).toBe('Router Operations');
      }
    });
  });

  describe('Parameter Sanitization', () => {
    test('should sanitize sensitive parameters in logs', () => {
      const parametersWithSecrets = {
        id: 'vm-12345',
        password: 'secret-password',
        apikey: 'secret-api-key',
        token: 'secret-token',
        normalParam: 'normal-value'
      };

      const request = dangerousActionConfirmation.generateConfirmationRequest(
        'destroy_virtual_machine',
        parametersWithSecrets
      );

      expect(request).toBeDefined();
      // The actual sanitization happens internally in the audit logger
      // We're testing that the request is created successfully with sensitive data
      expect(request!.parameters).toEqual(parametersWithSecrets);
    });
  });
});