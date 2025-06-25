import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { Logger } from '../utils/logger.js';
import crypto from 'crypto';

export interface SecurityEvent {
  timestamp: number;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  user?: string;
  action: string;
  resource?: string;
  result: SecurityResult;
  details?: Record<string, any>;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  API_ACCESS = 'api_access',
  CONFIG_CHANGE = 'config_change',
  SECURITY_VIOLATION = 'security_violation',
  CREDENTIAL_ROTATION = 'credential_rotation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum SecurityResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  BLOCKED = 'blocked',
  WARNING = 'warning'
}

export interface SecurityReport {
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  failedAuthentications: number;
  blockedRequests: number;
  suspiciousActivities: SecurityEvent[];
  recommendations: string[];
}

export class SecurityAuditLogger {
  private auditLogPath: string;
  private securityLogPath: string;
  private events: SecurityEvent[] = [];
  private maxEventsInMemory = 10000;

  constructor(logDirectory: string = 'logs/security') {
    this.auditLogPath = `${logDirectory}/audit.log`;
    this.securityLogPath = `${logDirectory}/security.log`;
    
    this.ensureLogDirectory(logDirectory);
    Logger.info('SecurityAuditLogger initialized', { auditLogPath: this.auditLogPath });
  }

  /**
   * Log a security event
   */
  public logSecurityEvent(event: Omit<SecurityEvent, 'timestamp' | 'correlationId'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
      correlationId: this.generateCorrelationId()
    };

    // Add to in-memory buffer
    this.events.push(fullEvent);
    if (this.events.length > this.maxEventsInMemory) {
      this.events.shift(); // Remove oldest event
    }

    // Write to appropriate log file
    const logEntry = this.formatLogEntry(fullEvent);
    
    try {
      appendFileSync(this.auditLogPath, logEntry + '\n');
      
      // Also log high severity events to security log
      if (fullEvent.severity === SecuritySeverity.HIGH || fullEvent.severity === SecuritySeverity.CRITICAL) {
        appendFileSync(this.securityLogPath, logEntry + '\n');
      }
      
      // Log to application logger based on severity
      switch (fullEvent.severity) {
        case SecuritySeverity.CRITICAL:
        case SecuritySeverity.HIGH:
          Logger.error(`Security Event: ${fullEvent.action}`, fullEvent);
          break;
        case SecuritySeverity.MEDIUM:
          Logger.warn(`Security Event: ${fullEvent.action}`, fullEvent);
          break;
        default:
          Logger.info(`Security Event: ${fullEvent.action}`, fullEvent);
      }
    } catch (error) {
      Logger.error('Failed to write security audit log', error);
    }
  }

  /**
   * Log API call for audit trail
   */
  public logAPICall(
    command: string, 
    user: string, 
    result: SecurityResult, 
    details?: Record<string, any>
  ): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.API_ACCESS,
      severity: result === SecurityResult.FAILURE ? SecuritySeverity.MEDIUM : SecuritySeverity.LOW,
      source: 'cloudstack-api',
      user,
      action: command,
      resource: 'cloudstack',
      result,
      details
    });
  }

  /**
   * Log authentication attempt
   */
  public logAuthenticationAttempt(
    user: string, 
    result: SecurityResult, 
    source: string = 'mcp-server',
    details?: Record<string, any>
  ): void {
    const severity = result === SecurityResult.FAILURE ? SecuritySeverity.HIGH : SecuritySeverity.LOW;
    
    this.logSecurityEvent({
      eventType: SecurityEventType.AUTHENTICATION,
      severity,
      source,
      user,
      action: 'authenticate',
      result,
      details
    });
  }

  /**
   * Log authorization check
   */
  public logAuthorizationCheck(
    user: string, 
    action: string, 
    resource: string, 
    result: SecurityResult,
    details?: Record<string, any>
  ): void {
    const severity = result === SecurityResult.BLOCKED ? SecuritySeverity.MEDIUM : SecuritySeverity.LOW;
    
    this.logSecurityEvent({
      eventType: SecurityEventType.AUTHORIZATION,
      severity,
      source: 'rbac-system',
      user,
      action,
      resource,
      result,
      details
    });
  }

  /**
   * Log security violation
   */
  public logSecurityViolation(
    source: string,
    action: string,
    severity: SecuritySeverity = SecuritySeverity.HIGH,
    details?: Record<string, any>
  ): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.SECURITY_VIOLATION,
      severity,
      source,
      action,
      result: SecurityResult.BLOCKED,
      details
    });
  }

  /**
   * Log rate limit exceeded
   */
  public logRateLimitExceeded(
    source: string,
    action: string,
    user?: string,
    details?: Record<string, any>
  ): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecuritySeverity.MEDIUM,
      source,
      user,
      action,
      result: SecurityResult.BLOCKED,
      details
    });
  }

  /**
   * Log configuration change
   */
  public logConfigurationChange(
    user: string,
    action: string,
    details?: Record<string, any>
  ): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.CONFIG_CHANGE,
      severity: SecuritySeverity.MEDIUM,
      source: 'config-manager',
      user,
      action,
      result: SecurityResult.SUCCESS,
      details
    });
  }

  /**
   * Log credential rotation
   */
  public logCredentialRotation(
    user: string,
    environment: string,
    result: SecurityResult,
    details?: Record<string, any>
  ): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.CREDENTIAL_ROTATION,
      severity: SecuritySeverity.MEDIUM,
      source: 'secret-manager',
      user,
      action: 'rotate_credentials',
      resource: environment,
      result,
      details
    });
  }

  /**
   * Generate security report for a time period
   */
  public generateSecurityReport(startTime: number, endTime: number): SecurityReport {
    const periodEvents = this.events.filter(
      event => event.timestamp >= startTime && event.timestamp <= endTime
    );

    const eventsByType = this.countByProperty(periodEvents, 'eventType') as Record<SecurityEventType, number>;
    const eventsBySeverity = this.countByProperty(periodEvents, 'severity') as Record<SecuritySeverity, number>;

    const failedAuthentications = periodEvents.filter(
      event => event.eventType === SecurityEventType.AUTHENTICATION && 
               event.result === SecurityResult.FAILURE
    ).length;

    const blockedRequests = periodEvents.filter(
      event => event.result === SecurityResult.BLOCKED
    ).length;

    const suspiciousActivities = periodEvents.filter(
      event => event.eventType === SecurityEventType.SUSPICIOUS_ACTIVITY ||
               event.eventType === SecurityEventType.SECURITY_VIOLATION ||
               (event.eventType === SecurityEventType.AUTHENTICATION && event.result === SecurityResult.FAILURE)
    );

    const recommendations = this.generateRecommendations(periodEvents);

    const report: SecurityReport = {
      generatedAt: Date.now(),
      periodStart: startTime,
      periodEnd: endTime,
      totalEvents: periodEvents.length,
      eventsByType,
      eventsBySeverity,
      failedAuthentications,
      blockedRequests,
      suspiciousActivities,
      recommendations
    };

    Logger.info('Security report generated', {
      period: `${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`,
      totalEvents: report.totalEvents,
      criticalEvents: eventsBySeverity[SecuritySeverity.CRITICAL] || 0
    });

    return report;
  }

  /**
   * Get events by type and time range
   */
  public getEventsByType(
    eventType: SecurityEventType, 
    startTime: number, 
    endTime: number
  ): SecurityEvent[] {
    return this.events.filter(
      event => event.eventType === eventType &&
               event.timestamp >= startTime && 
               event.timestamp <= endTime
    );
  }

  /**
   * Get events by severity
   */
  public getEventsBySeverity(severity: SecuritySeverity): SecurityEvent[] {
    return this.events.filter(event => event.severity === severity);
  }

  /**
   * Export audit log in JSON format
   */
  public exportAuditLog(filePath: string, startTime?: number, endTime?: number): void {
    try {
      let exportEvents = this.events;
      
      if (startTime && endTime) {
        exportEvents = this.events.filter(
          event => event.timestamp >= startTime && event.timestamp <= endTime
        );
      }

      const exportData = {
        exportedAt: Date.now(),
        periodStart: startTime,
        periodEnd: endTime,
        totalEvents: exportEvents.length,
        events: exportEvents
      };

      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      Logger.info(`Audit log exported to ${filePath}`, { eventCount: exportEvents.length });
    } catch (error) {
      Logger.error('Failed to export audit log', error);
      throw error;
    }
  }

  /**
   * Clear old events from memory (keep last N events)
   */
  public cleanupOldEvents(keepCount: number = 5000): void {
    if (this.events.length > keepCount) {
      const removedCount = this.events.length - keepCount;
      this.events = this.events.slice(-keepCount);
      Logger.info(`Cleaned up ${removedCount} old security events from memory`);
    }
  }

  /**
   * Format log entry for file output
   */
  private formatLogEntry(event: SecurityEvent): string {
    return JSON.stringify({
      ...event,
      timestamp_iso: new Date(event.timestamp).toISOString()
    });
  }

  /**
   * Generate correlation ID for event tracking
   */
  private generateCorrelationId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(logDirectory: string): void {
    try {
      if (!existsSync(logDirectory)) {
        mkdirSync(logDirectory, { recursive: true, mode: 0o750 });
      }
    } catch (error) {
      Logger.error('Failed to create security log directory', error);
      throw error;
    }
  }

  /**
   * Count events by property
   */
  private countByProperty(events: SecurityEvent[], property: keyof SecurityEvent): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const event of events) {
      const value = String(event[property]);
      counts[value] = (counts[value] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * Generate security recommendations based on events
   */
  private generateRecommendations(events: SecurityEvent[]): string[] {
    const recommendations: string[] = [];
    
    const failedAuths = events.filter(
      e => e.eventType === SecurityEventType.AUTHENTICATION && e.result === SecurityResult.FAILURE
    ).length;
    
    const rateLimitExceeded = events.filter(
      e => e.eventType === SecurityEventType.RATE_LIMIT_EXCEEDED
    ).length;
    
    const securityViolations = events.filter(
      e => e.eventType === SecurityEventType.SECURITY_VIOLATION
    ).length;

    if (failedAuths > 10) {
      recommendations.push('High number of failed authentication attempts detected. Consider implementing account lockout policies.');
    }

    if (rateLimitExceeded > 5) {
      recommendations.push('Multiple rate limit violations detected. Review rate limiting policies and client behavior.');
    }

    if (securityViolations > 0) {
      recommendations.push('Security violations detected. Review and strengthen input validation and security controls.');
    }

    const criticalEvents = events.filter(e => e.severity === SecuritySeverity.CRITICAL).length;
    if (criticalEvents > 0) {
      recommendations.push('Critical security events detected. Immediate investigation recommended.');
    }

    if (recommendations.length === 0) {
      recommendations.push('No significant security issues detected in this period.');
    }

    return recommendations;
  }
}