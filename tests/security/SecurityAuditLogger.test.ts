import { SecurityAuditLogger, SecurityEventType, SecuritySeverity, SecurityResult } from '../../src/security/SecurityAuditLogger';
import { unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('SecurityAuditLogger', () => {
  let auditLogger: SecurityAuditLogger;
  let testLogDirectory: string;

  beforeEach(() => {
    testLogDirectory = join(tmpdir(), `security-test-${Date.now()}`);
    auditLogger = new SecurityAuditLogger(testLogDirectory);
  });

  afterEach(() => {
    // Clean up test files
    try {
      unlinkSync(join(testLogDirectory, 'audit.log'));
      unlinkSync(join(testLogDirectory, 'security.log'));
    } catch {
      // Ignore if files don't exist
    }
  });

  describe('Security Event Logging', () => {
    test('should log security events with all required fields', () => {
      const testEvent = {
        eventType: SecurityEventType.AUTHENTICATION,
        severity: SecuritySeverity.HIGH,
        source: 'test-source',
        user: 'test-user',
        action: 'login_attempt',
        resource: 'mcp-server',
        result: SecurityResult.FAILURE,
        details: { reason: 'invalid_credentials' }
      };

      auditLogger.logSecurityEvent(testEvent);

      // Verify file was created
      expect(existsSync(join(testLogDirectory, 'audit.log'))).toBe(true);
    });

    test('should log high severity events to security log', () => {
      const criticalEvent = {
        eventType: SecurityEventType.SECURITY_VIOLATION,
        severity: SecuritySeverity.CRITICAL,
        source: 'security-system',
        action: 'intrusion_detected',
        result: SecurityResult.BLOCKED
      };

      auditLogger.logSecurityEvent(criticalEvent);

      // Should be in both audit and security logs
      expect(existsSync(join(testLogDirectory, 'audit.log'))).toBe(true);
      expect(existsSync(join(testLogDirectory, 'security.log'))).toBe(true);
    });

    test('should generate correlation IDs for events', () => {
      const event1 = {
        eventType: SecurityEventType.API_ACCESS,
        severity: SecuritySeverity.LOW,
        source: 'api',
        action: 'list_vms',
        result: SecurityResult.SUCCESS
      };

      const event2 = {
        eventType: SecurityEventType.API_ACCESS,
        severity: SecuritySeverity.LOW,
        source: 'api',
        action: 'create_vm',
        result: SecurityResult.SUCCESS
      };

      auditLogger.logSecurityEvent(event1);
      auditLogger.logSecurityEvent(event2);

      const events = auditLogger.getEventsByType(
        SecurityEventType.API_ACCESS,
        Date.now() - 1000,
        Date.now() + 1000
      );

      expect(events).toHaveLength(2);
      expect(events[0].correlationId).toBeDefined();
      expect(events[1].correlationId).toBeDefined();
      expect(events[0].correlationId).not.toBe(events[1].correlationId);
    });
  });

  describe('Specialized Logging Methods', () => {
    test('should log API calls with proper structure', () => {
      auditLogger.logAPICall('listVirtualMachines', 'test-user', SecurityResult.SUCCESS, {
        parametersCount: 3,
        responseTime: 150
      });

      const events = auditLogger.getEventsByType(
        SecurityEventType.API_ACCESS,
        Date.now() - 1000,
        Date.now() + 1000
      );

      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('listVirtualMachines');
      expect(events[0].user).toBe('test-user');
      expect(events[0].result).toBe(SecurityResult.SUCCESS);
      expect(events[0].details?.parametersCount).toBe(3);
    });

    test('should log authentication attempts', () => {
      auditLogger.logAuthenticationAttempt('test-user', SecurityResult.FAILURE, 'mcp-server', {
        reason: 'invalid_password',
        attempts: 3
      });

      const events = auditLogger.getEventsByType(
        SecurityEventType.AUTHENTICATION,
        Date.now() - 1000,
        Date.now() + 1000
      );

      expect(events).toHaveLength(1);
      expect(events[0].severity).toBe(SecuritySeverity.HIGH);
      expect(events[0].result).toBe(SecurityResult.FAILURE);
    });

    test('should log authorization checks', () => {
      auditLogger.logAuthorizationCheck('test-user', 'delete_vm', 'vm-123', SecurityResult.BLOCKED, {
        requiredRole: 'admin',
        userRole: 'user'
      });

      const events = auditLogger.getEventsByType(
        SecurityEventType.AUTHORIZATION,
        Date.now() - 1000,
        Date.now() + 1000
      );

      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('delete_vm');
      expect(events[0].resource).toBe('vm-123');
      expect(events[0].result).toBe(SecurityResult.BLOCKED);
    });

    test('should log security violations', () => {
      auditLogger.logSecurityViolation('input-validator', 'sql_injection_detected', SecuritySeverity.HIGH, {
        input: "'; DROP TABLE users; --",
        parameter: 'name'
      });

      const events = auditLogger.getEventsByType(
        SecurityEventType.SECURITY_VIOLATION,
        Date.now() - 1000,
        Date.now() + 1000
      );

      expect(events).toHaveLength(1);
      expect(events[0].severity).toBe(SecuritySeverity.HIGH);
      expect(events[0].result).toBe(SecurityResult.BLOCKED);
    });

    test('should log rate limit exceeded events', () => {
      auditLogger.logRateLimitExceeded('api-gateway', 'list_vms', 'test-user', {
        requestCount: 150,
        timeWindow: '1 minute'
      });

      const events = auditLogger.getEventsByType(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        Date.now() - 1000,
        Date.now() + 1000
      );

      expect(events).toHaveLength(1);
      expect(events[0].severity).toBe(SecuritySeverity.MEDIUM);
      expect(events[0].user).toBe('test-user');
    });

    test('should log configuration changes', () => {
      auditLogger.logConfigurationChange('admin-user', 'update_api_timeout', {
        oldValue: 30000,
        newValue: 45000,
        environment: 'production'
      });

      const events = auditLogger.getEventsByType(
        SecurityEventType.CONFIG_CHANGE,
        Date.now() - 1000,
        Date.now() + 1000
      );

      expect(events).toHaveLength(1);
      expect(events[0].user).toBe('admin-user');
      expect(events[0].severity).toBe(SecuritySeverity.MEDIUM);
    });

    test('should log credential rotation', () => {
      auditLogger.logCredentialRotation('admin-user', 'production', SecurityResult.SUCCESS, {
        rotationType: 'scheduled',
        keyType: 'api_key'
      });

      const events = auditLogger.getEventsByType(
        SecurityEventType.CREDENTIAL_ROTATION,
        Date.now() - 1000,
        Date.now() + 1000
      );

      expect(events).toHaveLength(1);
      expect(events[0].resource).toBe('production');
      expect(events[0].result).toBe(SecurityResult.SUCCESS);
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(() => {
      // Add some test events
      auditLogger.logSecurityEvent({
        eventType: SecurityEventType.AUTHENTICATION,
        severity: SecuritySeverity.LOW,
        source: 'test',
        action: 'login',
        result: SecurityResult.SUCCESS
      });

      auditLogger.logSecurityEvent({
        eventType: SecurityEventType.API_ACCESS,
        severity: SecuritySeverity.HIGH,
        source: 'test',
        action: 'admin_action',
        result: SecurityResult.SUCCESS
      });

      auditLogger.logSecurityEvent({
        eventType: SecurityEventType.AUTHENTICATION,
        severity: SecuritySeverity.CRITICAL,
        source: 'test',
        action: 'failed_login',
        result: SecurityResult.FAILURE
      });
    });

    test('should retrieve events by type', () => {
      const authEvents = auditLogger.getEventsByType(
        SecurityEventType.AUTHENTICATION,
        Date.now() - 1000,
        Date.now() + 1000
      );

      expect(authEvents).toHaveLength(2);
      expect(authEvents.every(e => e.eventType === SecurityEventType.AUTHENTICATION)).toBe(true);
    });

    test('should retrieve events by severity', () => {
      const criticalEvents = auditLogger.getEventsBySeverity(SecuritySeverity.CRITICAL);
      const highEvents = auditLogger.getEventsBySeverity(SecuritySeverity.HIGH);

      expect(criticalEvents).toHaveLength(1);
      expect(highEvents).toHaveLength(1);
      expect(criticalEvents[0].severity).toBe(SecuritySeverity.CRITICAL);
    });
  });

  describe('Security Report Generation', () => {
    beforeEach(() => {
      const now = Date.now();
      
      // Add various events for report testing
      auditLogger.logAuthenticationAttempt('user1', SecurityResult.SUCCESS);
      auditLogger.logAuthenticationAttempt('user2', SecurityResult.FAILURE);
      auditLogger.logAuthenticationAttempt('user3', SecurityResult.FAILURE);
      
      auditLogger.logRateLimitExceeded('api', 'bulk_action', 'user4');
      
      auditLogger.logSecurityViolation('validator', 'xss_attempt', SecuritySeverity.HIGH);
      
      auditLogger.logAPICall('listVMs', 'user1', SecurityResult.SUCCESS);
      auditLogger.logAPICall('deleteVM', 'user2', SecurityResult.BLOCKED);
    });

    test('should generate comprehensive security report', () => {
      const startTime = Date.now() - 10000;
      const endTime = Date.now() + 1000;
      
      const report = auditLogger.generateSecurityReport(startTime, endTime);

      expect(report.totalEvents).toBeGreaterThan(0);
      expect(report.failedAuthentications).toBe(2);
      expect(report.blockedRequests).toBeGreaterThanOrEqual(1);
      expect(report.eventsByType).toBeDefined();
      expect(report.eventsBySeverity).toBeDefined();
      expect(report.suspiciousActivities).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('should include security recommendations in report', () => {
      const startTime = Date.now() - 10000;
      const endTime = Date.now() + 1000;
      
      const report = auditLogger.generateSecurityReport(startTime, endTime);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('failed authentication'))).toBe(true);
    });

    test('should identify suspicious activities', () => {
      const startTime = Date.now() - 10000;
      const endTime = Date.now() + 1000;
      
      const report = auditLogger.generateSecurityReport(startTime, endTime);

      expect(report.suspiciousActivities.length).toBeGreaterThan(0);
      expect(report.suspiciousActivities.some(a => 
        a.eventType === SecurityEventType.SECURITY_VIOLATION || 
        a.eventType === SecurityEventType.AUTHENTICATION && a.result === SecurityResult.FAILURE
      )).toBe(true);
    });
  });

  describe('Audit Log Export', () => {
    test('should export audit log to JSON file', () => {
      const exportPath = join(testLogDirectory, 'export.json');
      
      // Add some events
      auditLogger.logAPICall('test', 'user1', SecurityResult.SUCCESS);
      auditLogger.logAuthenticationAttempt('user2', SecurityResult.FAILURE);
      
      auditLogger.exportAuditLog(exportPath);

      expect(existsSync(exportPath)).toBe(true);
      
      // Verify content
      const exportedData = JSON.parse(require('fs').readFileSync(exportPath, 'utf-8'));
      expect(exportedData.events).toBeDefined();
      expect(exportedData.totalEvents).toBeGreaterThan(0);
      expect(exportedData.exportedAt).toBeDefined();
    });

    test('should export audit log with time range filter', () => {
      const exportPath = join(testLogDirectory, 'filtered-export.json');
      const startTime = Date.now() - 1000;
      const endTime = Date.now() + 1000;
      
      auditLogger.logAPICall('test', 'user1', SecurityResult.SUCCESS);
      
      auditLogger.exportAuditLog(exportPath, startTime, endTime);

      expect(existsSync(exportPath)).toBe(true);
      
      const exportedData = JSON.parse(require('fs').readFileSync(exportPath, 'utf-8'));
      expect(exportedData.periodStart).toBe(startTime);
      expect(exportedData.periodEnd).toBe(endTime);
    });
  });

  describe('Memory Management', () => {
    test('should cleanup old events when memory limit reached', () => {
      // Create a new logger with small memory limit for testing
      const smallLogger = new SecurityAuditLogger(testLogDirectory);
      
      // Add many events
      for (let i = 0; i < 100; i++) {
        smallLogger.logAPICall(`action_${i}`, 'user', SecurityResult.SUCCESS);
      }
      
      // Cleanup to keep only 50 events
      smallLogger.cleanupOldEvents(50);
      
      const allEvents = smallLogger.getEventsByType(
        SecurityEventType.API_ACCESS,
        0,
        Date.now() + 1000
      );
      
      expect(allEvents.length).toBeLessThanOrEqual(50);
    });
  });
});