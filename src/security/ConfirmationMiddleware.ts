import { DangerousActionConfirmation, ConfirmationRequest, ConfirmationResponse } from './DangerousActionConfirmation.js';
import { SecurityAuditLogger, SecurityEventType, SecuritySeverity, SecurityResult } from './SecurityAuditLogger.js';

export interface PendingConfirmation {
  request: ConfirmationRequest;
  timeout: NodeJS.Timeout;
  createdAt: number;
}

export interface ConfirmationMiddlewareOptions {
  confirmationTimeoutMs?: number;
  maxPendingConfirmations?: number;
  enableBypass?: boolean;
  bypassEnvironments?: string[];
}

/**
 * ConfirmationMiddleware - Manages confirmation flow for dangerous operations
 * 
 * This middleware integrates with the MCP server to intercept dangerous operations,
 * request user confirmation, and only allow the operation to proceed after
 * explicit confirmation.
 */
export class ConfirmationMiddleware {
  private readonly dangerousActionConfirmation: DangerousActionConfirmation;
  private readonly auditLogger: SecurityAuditLogger;
  private readonly pendingConfirmations: Map<string, PendingConfirmation>;
  private readonly options: Required<ConfirmationMiddlewareOptions>;

  constructor(
    dangerousActionConfirmation?: DangerousActionConfirmation,
    auditLogger?: SecurityAuditLogger,
    options: ConfirmationMiddlewareOptions = {}
  ) {
    this.dangerousActionConfirmation = dangerousActionConfirmation || new DangerousActionConfirmation();
    this.auditLogger = auditLogger || new SecurityAuditLogger();
    this.pendingConfirmations = new Map();
    
    this.options = {
      confirmationTimeoutMs: options.confirmationTimeoutMs || 300000, // 5 minutes
      maxPendingConfirmations: options.maxPendingConfirmations || 100,
      enableBypass: options.enableBypass || false,
      bypassEnvironments: options.bypassEnvironments || []
    };

    // Clean up expired confirmations every minute
    setInterval(() => this.cleanupExpiredConfirmations(), 60000);
  }

  /**
   * Check if an operation requires confirmation
   */
  public requiresConfirmation(toolName: string, environment?: string): boolean {
    // Check if bypass is enabled for this environment
    if (this.options.enableBypass && environment && this.options.bypassEnvironments.includes(environment)) {
      this.auditLogger.logSecurityEvent({
        eventType: SecurityEventType.AUTHORIZATION,
        severity: SecuritySeverity.MEDIUM,
        source: 'confirmation-middleware',
        action: 'confirmation_bypassed',
        resource: toolName,
        result: SecurityResult.SUCCESS,
        details: {
          environment,
          reason: 'environment_bypass_enabled'
        }
      });
      return false;
    }

    return this.dangerousActionConfirmation.isDangerousAction(toolName);
  }

  /**
   * Create a confirmation request for a dangerous operation
   */
  public createConfirmationRequest(
    toolName: string,
    parameters: Record<string, any>,
    user?: string,
    environment?: string
  ): ConfirmationRequest | null {
    // Check if already at max pending confirmations
    if (this.pendingConfirmations.size >= this.options.maxPendingConfirmations) {
      this.auditLogger.logSecurityViolation(
        'confirmation-middleware',
        'max_pending_confirmations_exceeded',
        SecuritySeverity.HIGH,
        {
          maxPendingConfirmations: this.options.maxPendingConfirmations,
          currentPending: this.pendingConfirmations.size,
          toolName,
          user
        }
      );
      throw new Error('Maximum number of pending confirmations exceeded. Please wait for existing confirmations to complete.');
    }

    const request = this.dangerousActionConfirmation.generateConfirmationRequest(toolName, parameters);
    if (!request) {
      return null;
    }

    // Store pending confirmation with timeout
    const timeout = setTimeout(() => {
      this.handleConfirmationTimeout(request.correlationId);
    }, this.options.confirmationTimeoutMs);

    this.pendingConfirmations.set(request.correlationId, {
      request,
      timeout,
      createdAt: Date.now()
    });

    // Log confirmation request created
    const logEvent = {
      eventType: SecurityEventType.AUTHORIZATION,
      severity: SecuritySeverity.HIGH,
      source: 'confirmation-middleware',
      user,
      action: 'confirmation_request_created',
      resource: toolName,
      result: SecurityResult.WARNING,
      details: {
        environment,
        actionCategory: request.action.category,
        actionSeverity: request.action.severity,
        timeoutMs: this.options.confirmationTimeoutMs,
        pendingConfirmations: this.pendingConfirmations.size,
        correlationId: request.correlationId
      }
    };
    this.auditLogger.logSecurityEvent(logEvent);

    return request;
  }

  /**
   * Process a confirmation response
   */
  public processConfirmationResponse(
    correlationId: string,
    confirmed: boolean,
    userInput?: string,
    user?: string
  ): { success: boolean; error?: string; allowOperation?: boolean } {
    const pending = this.pendingConfirmations.get(correlationId);
    if (!pending) {
      this.auditLogger.logSecurityViolation(
        'confirmation-middleware',
        'invalid_confirmation_correlation_id',
        SecuritySeverity.HIGH,
        {
          correlationId,
          user
        }
      );
      return {
        success: false,
        error: 'Invalid or expired confirmation request'
      };
    }

    // Clear timeout
    clearTimeout(pending.timeout);
    this.pendingConfirmations.delete(correlationId);

    const response: ConfirmationResponse = {
      confirmed,
      userInput,
      correlationId,
      timestamp: Date.now()
    };

    const isValid = this.dangerousActionConfirmation.validateConfirmationResponse(pending.request, response);

    // Log the response processing
    const responseEvent = {
      eventType: SecurityEventType.AUTHORIZATION,
      severity: isValid ? SecuritySeverity.MEDIUM : SecuritySeverity.HIGH,
      source: 'confirmation-middleware',
      user,
      action: 'confirmation_response_processed',
      resource: pending.request.toolName,
      result: isValid ? SecurityResult.SUCCESS : SecurityResult.BLOCKED,
      details: {
        confirmed,
        validationResult: isValid,
        responseTime: response.timestamp - pending.request.timestamp,
        actionCategory: pending.request.action.category,
        actionSeverity: pending.request.action.severity,
        correlationId
      }
    };
    this.auditLogger.logSecurityEvent(responseEvent);

    if (!isValid) {
      return {
        success: false,
        error: confirmed ? 'Invalid confirmation text. Please type the exact confirmation phrase.' : 'Operation cancelled by user',
        allowOperation: false
      };
    }

    return {
      success: true,
      allowOperation: true
    };
  }

  /**
   * Get pending confirmation details
   */
  public getPendingConfirmation(correlationId: string): PendingConfirmation | undefined {
    return this.pendingConfirmations.get(correlationId);
  }

  /**
   * Get all pending confirmations (for administrative purposes)
   */
  public getAllPendingConfirmations(): Map<string, PendingConfirmation> {
    return new Map(this.pendingConfirmations);
  }

  /**
   * Cancel a pending confirmation
   */
  public cancelConfirmation(correlationId: string, user?: string, reason?: string): boolean {
    const pending = this.pendingConfirmations.get(correlationId);
    if (!pending) {
      return false;
    }

    clearTimeout(pending.timeout);
    this.pendingConfirmations.delete(correlationId);

    const cancelEvent = {
      eventType: SecurityEventType.AUTHORIZATION,
      severity: SecuritySeverity.MEDIUM,
      source: 'confirmation-middleware',
      user,
      action: 'confirmation_cancelled',
      resource: pending.request.toolName,
      result: SecurityResult.BLOCKED,
      details: {
        reason: reason || 'manual_cancellation',
        actionCategory: pending.request.action.category,
        pendingDuration: Date.now() - pending.createdAt,
        correlationId
      }
    };
    this.auditLogger.logSecurityEvent(cancelEvent);

    return true;
  }

  /**
   * Get confirmation statistics
   */
  public getConfirmationStatistics(): {
    pendingConfirmations: number;
    dangerousActionStats: any;
    recentActivity: {
      totalRequests: number;
      totalConfirmed: number;
      totalDenied: number;
      totalTimedOut: number;
    };
  } {
    const dangerousActionStats = this.dangerousActionConfirmation.getDangerousActionStatistics();
    
    // Get recent activity from audit logs (last 24 hours)
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentEvents = this.auditLogger.getEventsByType(
      SecurityEventType.AUTHORIZATION,
      twentyFourHoursAgo,
      Date.now()
    ).filter(event => event.source === 'confirmation-middleware');

    const recentActivity = {
      totalRequests: recentEvents.filter(e => e.action === 'confirmation_request_created').length,
      totalConfirmed: recentEvents.filter(e => e.action === 'confirmation_response_processed' && e.result === SecurityResult.SUCCESS).length,
      totalDenied: recentEvents.filter(e => e.action === 'confirmation_response_processed' && e.result === SecurityResult.BLOCKED).length,
      totalTimedOut: recentEvents.filter(e => e.action === 'confirmation_timeout').length
    };

    return {
      pendingConfirmations: this.pendingConfirmations.size,
      dangerousActionStats,
      recentActivity
    };
  }

  /**
   * Format confirmation request for user display
   */
  public formatConfirmationRequest(request: ConfirmationRequest): {
    title: string;
    description: string;
    warningMessage: string;
    confirmationInstructions: string;
    actionDetails: {
      category: string;
      severity: string;
      reversible: boolean;
      impactScope: string;
    };
    parameters: Record<string, any>;
  } {
    const action = request.action;
    
    return {
      title: `⚠️  DANGEROUS OPERATION CONFIRMATION REQUIRED`,
      description: action.description,
      warningMessage: action.warningMessage,
      confirmationInstructions: `To proceed with this operation, type exactly: "${action.requiredConfirmation}"`,
      actionDetails: {
        category: action.category,
        severity: action.severity.toUpperCase(),
        reversible: action.reversible,
        impactScope: action.impactScope
      },
      parameters: this.formatParametersForDisplay(request.parameters)
    };
  }

  /**
   * Handle confirmation timeout
   */
  private handleConfirmationTimeout(correlationId: string): void {
    const pending = this.pendingConfirmations.get(correlationId);
    if (!pending) {
      return;
    }

    this.pendingConfirmations.delete(correlationId);

    const timeoutEvent = {
      eventType: SecurityEventType.AUTHORIZATION,
      severity: SecuritySeverity.MEDIUM,
      source: 'confirmation-middleware',
      action: 'confirmation_timeout',
      resource: pending.request.toolName,
      result: SecurityResult.BLOCKED,
      details: {
        timeoutMs: this.options.confirmationTimeoutMs,
        actionCategory: pending.request.action.category,
        actionSeverity: pending.request.action.severity,
        pendingDuration: Date.now() - pending.createdAt,
        correlationId
      }
    };
    this.auditLogger.logSecurityEvent(timeoutEvent);
  }

  /**
   * Clean up expired confirmations
   */
  private cleanupExpiredConfirmations(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [correlationId, pending] of this.pendingConfirmations) {
      if (now - pending.createdAt > this.options.confirmationTimeoutMs) {
        expiredIds.push(correlationId);
      }
    }

    for (const expiredId of expiredIds) {
      this.handleConfirmationTimeout(expiredId);
    }

    if (expiredIds.length > 0) {
      this.auditLogger.logSecurityEvent({
        eventType: SecurityEventType.AUTHORIZATION,
        severity: SecuritySeverity.LOW,
        source: 'confirmation-middleware',
        action: 'expired_confirmations_cleanup',
        result: SecurityResult.SUCCESS,
        details: {
          expiredCount: expiredIds.length,
          totalPending: this.pendingConfirmations.size
        }
      });
    }
  }

  /**
   * Format parameters for user-friendly display
   */
  private formatParametersForDisplay(parameters: Record<string, any>): Record<string, any> {
    const formatted: Record<string, any> = {};
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential'];

    for (const [key, value] of Object.entries(parameters)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
        formatted[key] = '[HIDDEN FOR SECURITY]';
      } else {
        formatted[key] = value;
      }
    }

    return formatted;
  }
}