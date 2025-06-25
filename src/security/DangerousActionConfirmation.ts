import { SecurityAuditLogger, SecurityEventType, SecuritySeverity, SecurityResult } from './SecurityAuditLogger';

export interface DangerousActionConfig {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  warningMessage: string;
  requiredConfirmation: string;
  reversible: boolean;
  impactScope: 'single-resource' | 'multiple-resources' | 'infrastructure' | 'service-disruption';
}

export interface ConfirmationRequest {
  toolName: string;
  action: DangerousActionConfig;
  parameters: Record<string, any>;
  correlationId: string;
  timestamp: number;
}

export interface ConfirmationResponse {
  confirmed: boolean;
  userInput?: string;
  correlationId: string;
  timestamp: number;
}

/**
 * DangerousActionConfirmation - Provides confirmation prompts for destructive operations
 * 
 * This middleware intercepts potentially dangerous CloudStack operations and requires
 * explicit user confirmation before allowing the operation to proceed. It provides
 * detailed descriptions of the action and its potential impact.
 */
export class DangerousActionConfirmation {
  private readonly auditLogger: SecurityAuditLogger;
  private readonly dangerousActions: Map<string, DangerousActionConfig>;

  constructor(auditLogger?: SecurityAuditLogger) {
    this.auditLogger = auditLogger || new SecurityAuditLogger();
    this.dangerousActions = new Map();
    this.initializeDangerousActions();
  }

  /**
   * Initialize the dangerous actions database with comprehensive definitions
   */
  private initializeDangerousActions(): void {
    // Virtual Machine Operations - Critical
    this.addDangerousAction('destroy_virtual_machine', {
      severity: 'critical',
      category: 'Virtual Machine Operations',
      description: 'Permanently destroy a virtual machine and all its data',
      warningMessage: 'This will PERMANENTLY DESTROY the virtual machine and ALL DATA stored on its disks. This action CANNOT be undone.',
      requiredConfirmation: 'destroy permanently',
      reversible: false,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('expunge_virtual_machine', {
      severity: 'critical',
      category: 'Virtual Machine Operations',
      description: 'Permanently expunge a destroyed virtual machine from the system',
      warningMessage: 'This will PERMANENTLY REMOVE the virtual machine from the system. All data will be lost and cannot be recovered.',
      requiredConfirmation: 'expunge permanently',
      reversible: false,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('stop_virtual_machine', {
      severity: 'high',
      category: 'Virtual Machine Operations',
      description: 'Stop a running virtual machine',
      warningMessage: 'This will stop the virtual machine, causing service interruption. Running applications will be terminated.',
      requiredConfirmation: 'stop vm',
      reversible: true,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('reboot_virtual_machine', {
      severity: 'high',
      category: 'Virtual Machine Operations',
      description: 'Reboot a virtual machine',
      warningMessage: 'This will restart the virtual machine, causing temporary service interruption.',
      requiredConfirmation: 'reboot vm',
      reversible: true,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('migrate_virtual_machine', {
      severity: 'high',
      category: 'Virtual Machine Operations',
      description: 'Migrate virtual machine to another host',
      warningMessage: 'This will migrate the VM to another host, causing brief service interruption during migration.',
      requiredConfirmation: 'migrate vm',
      reversible: true,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('scale_virtual_machine', {
      severity: 'high',
      category: 'Virtual Machine Operations',
      description: 'Scale (resize) virtual machine resources',
      warningMessage: 'This will change the VM resources and may require a reboot, causing service interruption.',
      requiredConfirmation: 'scale vm',
      reversible: true,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('reset_vm_password', {
      severity: 'medium',
      category: 'Virtual Machine Operations',
      description: 'Reset the password for a virtual machine',
      warningMessage: 'This will reset the VM password. Current access credentials will be invalidated.',
      requiredConfirmation: 'reset password',
      reversible: false,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('remove_nic_from_vm', {
      severity: 'high',
      category: 'Virtual Machine Operations',
      description: 'Remove network interface from virtual machine',
      warningMessage: 'This will remove network connectivity from the VM, potentially causing network isolation.',
      requiredConfirmation: 'remove nic',
      reversible: true,
      impactScope: 'single-resource'
    });

    // Storage Operations - Critical
    this.addDangerousAction('delete_volume', {
      severity: 'critical',
      category: 'Storage Operations',
      description: 'Delete a storage volume and all its data',
      warningMessage: 'This will PERMANENTLY DELETE the storage volume and ALL DATA stored on it. This action CANNOT be undone.',
      requiredConfirmation: 'delete volume permanently',
      reversible: false,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('delete_snapshot', {
      severity: 'high',
      category: 'Storage Operations',
      description: 'Delete a volume snapshot',
      warningMessage: 'This will permanently delete the snapshot. This backup point will no longer be available for recovery.',
      requiredConfirmation: 'delete snapshot',
      reversible: false,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('migrate_volume', {
      severity: 'high',
      category: 'Storage Operations',
      description: 'Migrate volume to another storage pool',
      warningMessage: 'This will migrate the volume to different storage, potentially causing I/O interruption.',
      requiredConfirmation: 'migrate volume',
      reversible: true,
      impactScope: 'single-resource'
    });

    this.addDangerousAction('delete_storage_pool', {
      severity: 'critical',
      category: 'Storage Operations',
      description: 'Delete an entire storage pool',
      warningMessage: 'This will DELETE the entire storage pool, affecting ALL volumes stored on it. This is IRREVERSIBLE.',
      requiredConfirmation: 'delete storage pool permanently',
      reversible: false,
      impactScope: 'infrastructure'
    });

    // Network Operations - High Impact
    this.addDangerousAction('delete_network', {
      severity: 'critical',
      category: 'Network Operations',
      description: 'Delete a network',
      warningMessage: 'This will DELETE the network, disconnecting ALL virtual machines connected to it.',
      requiredConfirmation: 'delete network',
      reversible: false,
      impactScope: 'multiple-resources'
    });

    this.addDangerousAction('restart_network', {
      severity: 'high',
      category: 'Network Operations',
      description: 'Restart a network',
      warningMessage: 'This will restart the network, causing temporary network interruption for all connected VMs.',
      requiredConfirmation: 'restart network',
      reversible: true,
      impactScope: 'service-disruption'
    });

    this.addDangerousAction('delete_security_group', {
      severity: 'high',
      category: 'Network Operations',
      description: 'Delete a security group',
      warningMessage: 'This will delete the security group, potentially affecting firewall rules for multiple VMs.',
      requiredConfirmation: 'delete security group',
      reversible: false,
      impactScope: 'multiple-resources'
    });

    this.addDangerousAction('delete_firewall_rule', {
      severity: 'medium',
      category: 'Network Operations',
      description: 'Delete a firewall rule',
      warningMessage: 'This will remove the firewall rule, potentially changing network access controls.',
      requiredConfirmation: 'delete firewall rule',
      reversible: false,
      impactScope: 'multiple-resources'
    });

    // VPC Operations - High Impact
    this.addDangerousAction('delete_vpc', {
      severity: 'critical',
      category: 'VPC Operations',
      description: 'Delete a Virtual Private Cloud',
      warningMessage: 'This will DELETE the entire VPC, affecting ALL networks, VMs, and resources within it.',
      requiredConfirmation: 'delete vpc permanently',
      reversible: false,
      impactScope: 'infrastructure'
    });

    this.addDangerousAction('restart_vpc', {
      severity: 'high',
      category: 'VPC Operations',
      description: 'Restart a Virtual Private Cloud',
      warningMessage: 'This will restart the VPC, causing network interruption for all resources within it.',
      requiredConfirmation: 'restart vpc',
      reversible: true,
      impactScope: 'service-disruption'
    });

    // Load Balancer Operations
    this.addDangerousAction('delete_load_balancer_rule', {
      severity: 'high',
      category: 'Load Balancer Operations',
      description: 'Delete a load balancer rule',
      warningMessage: 'This will remove load balancing, potentially causing service disruption for load-balanced applications.',
      requiredConfirmation: 'delete load balancer',
      reversible: false,
      impactScope: 'service-disruption'
    });

    this.addDangerousAction('remove_from_load_balancer_rule', {
      severity: 'medium',
      category: 'Load Balancer Operations',
      description: 'Remove VMs from load balancer rule',
      warningMessage: 'This will remove VMs from the load balancer, reducing available capacity.',
      requiredConfirmation: 'remove from load balancer',
      reversible: true,
      impactScope: 'service-disruption'
    });

    // VPN Operations
    this.addDangerousAction('delete_vpn_connection', {
      severity: 'high',
      category: 'VPN Operations',
      description: 'Delete VPN connection',
      warningMessage: 'This will terminate the VPN connection, breaking secure connectivity to remote networks.',
      requiredConfirmation: 'delete vpn connection',
      reversible: false,
      impactScope: 'service-disruption'
    });

    this.addDangerousAction('delete_vpn_gateway', {
      severity: 'critical',
      category: 'VPN Operations',
      description: 'Delete VPN gateway',
      warningMessage: 'This will DELETE the VPN gateway, terminating ALL VPN connections through it.',
      requiredConfirmation: 'delete vpn gateway',
      reversible: false,
      impactScope: 'multiple-resources'
    });

    // Account and User Management - Critical
    this.addDangerousAction('delete_account', {
      severity: 'critical',
      category: 'Account Management',
      description: 'Delete an account and all its resources',
      warningMessage: 'This will PERMANENTLY DELETE the account and ALL its resources (VMs, networks, volumes, etc.). This is IRREVERSIBLE.',
      requiredConfirmation: 'delete account permanently',
      reversible: false,
      impactScope: 'infrastructure'
    });

    this.addDangerousAction('delete_domain', {
      severity: 'critical',
      category: 'Account Management',
      description: 'Delete a domain and all its accounts',
      warningMessage: 'This will PERMANENTLY DELETE the domain and ALL accounts, users, and resources within it. This is IRREVERSIBLE.',
      requiredConfirmation: 'delete domain permanently',
      reversible: false,
      impactScope: 'infrastructure'
    });

    this.addDangerousAction('delete_user', {
      severity: 'high',
      category: 'Account Management',
      description: 'Delete a user account',
      warningMessage: 'This will permanently delete the user account. The user will lose access to all resources.',
      requiredConfirmation: 'delete user',
      reversible: false,
      impactScope: 'single-resource'
    });

    // System Operations - Critical
    this.addDangerousAction('destroy_system_vm', {
      severity: 'critical',
      category: 'System Operations',
      description: 'Destroy a system VM',
      warningMessage: 'This will DESTROY a system VM, potentially affecting CloudStack infrastructure services.',
      requiredConfirmation: 'destroy system vm',
      reversible: false,
      impactScope: 'infrastructure'
    });

    this.addDangerousAction('stop_system_vm', {
      severity: 'high',
      category: 'System Operations',
      description: 'Stop a system VM',
      warningMessage: 'This will stop a system VM, potentially affecting CloudStack infrastructure services.',
      requiredConfirmation: 'stop system vm',
      reversible: true,
      impactScope: 'infrastructure'
    });

    this.addDangerousAction('reboot_system_vm', {
      severity: 'high',
      category: 'System Operations',
      description: 'Reboot a system VM',
      warningMessage: 'This will reboot a system VM, causing temporary interruption of infrastructure services.',
      requiredConfirmation: 'reboot system vm',
      reversible: true,
      impactScope: 'infrastructure'
    });

    // Kubernetes Operations
    this.addDangerousAction('delete_kubernetes_cluster', {
      severity: 'critical',
      category: 'Kubernetes Operations',
      description: 'Delete a Kubernetes cluster',
      warningMessage: 'This will PERMANENTLY DELETE the Kubernetes cluster and ALL applications running on it.',
      requiredConfirmation: 'delete kubernetes cluster',
      reversible: false,
      impactScope: 'infrastructure'
    });

    this.addDangerousAction('scale_kubernetes_cluster', {
      severity: 'medium',
      category: 'Kubernetes Operations',
      description: 'Scale a Kubernetes cluster',
      warningMessage: 'This will scale the Kubernetes cluster, potentially affecting running applications.',
      requiredConfirmation: 'scale kubernetes cluster',
      reversible: true,
      impactScope: 'service-disruption'
    });

    this.addDangerousAction('stop_kubernetes_cluster', {
      severity: 'critical',
      category: 'Kubernetes Operations',
      description: 'Stop a Kubernetes cluster',
      warningMessage: 'This will STOP the entire Kubernetes cluster, terminating ALL applications running on it.',
      requiredConfirmation: 'stop kubernetes cluster',
      reversible: true,
      impactScope: 'infrastructure'
    });

    // Zone and Infrastructure Management
    this.addDangerousAction('delete_zone', {
      severity: 'critical',
      category: 'Infrastructure Management',
      description: 'Delete a zone',
      warningMessage: 'This will DELETE the entire zone and ALL resources within it (VMs, networks, storage, etc.). This is IRREVERSIBLE.',
      requiredConfirmation: 'delete zone permanently',
      reversible: false,
      impactScope: 'infrastructure'
    });

    this.addDangerousAction('delete_host', {
      severity: 'critical',
      category: 'Infrastructure Management',
      description: 'Delete a host',
      warningMessage: 'This will remove the host from CloudStack, affecting ALL VMs running on it.',
      requiredConfirmation: 'delete host',
      reversible: false,
      impactScope: 'infrastructure'
    });

    // Template and ISO Operations
    this.addDangerousAction('delete_template', {
      severity: 'high',
      category: 'Template Operations',
      description: 'Delete a template',
      warningMessage: 'This will permanently delete the template. New VMs cannot be created from this template.',
      requiredConfirmation: 'delete template',
      reversible: false,
      impactScope: 'multiple-resources'
    });

    this.addDangerousAction('delete_iso', {
      severity: 'medium',
      category: 'Template Operations',
      description: 'Delete an ISO',
      warningMessage: 'This will permanently delete the ISO. It will no longer be available for VM deployment.',
      requiredConfirmation: 'delete iso',
      reversible: false,
      impactScope: 'multiple-resources'
    });

    // Router Operations
    this.addDangerousAction('destroy_router', {
      severity: 'critical',
      category: 'Router Operations',
      description: 'Destroy a virtual router',
      warningMessage: 'This will DESTROY the virtual router, breaking network connectivity for associated networks.',
      requiredConfirmation: 'destroy router',
      reversible: false,
      impactScope: 'service-disruption'
    });

    this.addDangerousAction('stop_router', {
      severity: 'high',
      category: 'Router Operations',
      description: 'Stop a virtual router',
      warningMessage: 'This will stop the virtual router, interrupting network services for associated networks.',
      requiredConfirmation: 'stop router',
      reversible: true,
      impactScope: 'service-disruption'
    });

    this.addDangerousAction('reboot_router', {
      severity: 'high',
      category: 'Router Operations',
      description: 'Reboot a virtual router',
      warningMessage: 'This will reboot the virtual router, causing temporary network interruption.',
      requiredConfirmation: 'reboot router',
      reversible: true,
      impactScope: 'service-disruption'
    });
  }

  /**
   * Add a dangerous action configuration
   */
  private addDangerousAction(toolName: string, config: DangerousActionConfig): void {
    this.dangerousActions.set(toolName, config);
  }

  /**
   * Check if a tool requires confirmation
   */
  public isDangerousAction(toolName: string): boolean {
    return this.dangerousActions.has(toolName);
  }

  /**
   * Get dangerous action configuration
   */
  public getDangerousActionConfig(toolName: string): DangerousActionConfig | undefined {
    return this.dangerousActions.get(toolName);
  }

  /**
   * Get all dangerous actions
   */
  public getAllDangerousActions(): Map<string, DangerousActionConfig> {
    return new Map(this.dangerousActions);
  }

  /**
   * Generate a confirmation request for a dangerous action
   */
  public generateConfirmationRequest(
    toolName: string,
    parameters: Record<string, any>,
    correlationId?: string
  ): ConfirmationRequest | null {
    const actionConfig = this.dangerousActions.get(toolName);
    if (!actionConfig) {
      return null;
    }

    const requestCorrelationId = correlationId || this.generateCorrelationId();

    // Log the confirmation request
    const logEvent = {
      eventType: SecurityEventType.AUTHORIZATION,
      severity: this.mapSeverityToSecuritySeverity(actionConfig.severity),
      source: 'dangerous-action-confirmation',
      action: 'confirmation_requested',
      resource: toolName,
      result: SecurityResult.WARNING,
      details: {
        actionCategory: actionConfig.category,
        actionDescription: actionConfig.description,
        impactScope: actionConfig.impactScope,
        reversible: actionConfig.reversible,
        parameters: this.sanitizeParametersForLogging(parameters),
        correlationId: requestCorrelationId
      }
    };
    this.auditLogger.logSecurityEvent(logEvent);

    return {
      toolName,
      action: actionConfig,
      parameters,
      correlationId: requestCorrelationId,
      timestamp: Date.now()
    };
  }

  /**
   * Validate confirmation response
   */
  public validateConfirmationResponse(
    request: ConfirmationRequest,
    response: ConfirmationResponse
  ): boolean {
    // Check correlation ID match
    if (request.correlationId !== response.correlationId) {
      this.auditLogger.logSecurityViolation(
        'dangerous-action-confirmation',
        'correlation_id_mismatch',
        SecuritySeverity.HIGH,
        {
          expectedCorrelationId: request.correlationId,
          receivedCorrelationId: response.correlationId
        }
      );
      return false;
    }

    // Check if confirmed
    if (!response.confirmed) {
      const deniedEvent = {
        eventType: SecurityEventType.AUTHORIZATION,
        severity: SecuritySeverity.MEDIUM,
        source: 'dangerous-action-confirmation',
        action: 'confirmation_denied',
        resource: request.toolName,
        result: SecurityResult.BLOCKED,
        details: {
          actionCategory: request.action.category,
          reason: 'user_declined_confirmation',
          correlationId: request.correlationId
        }
      };
      this.auditLogger.logSecurityEvent(deniedEvent);
      return false;
    }

    // Validate required confirmation text
    const userInput = response.userInput?.toLowerCase().trim() || '';
    const requiredText = request.action.requiredConfirmation.toLowerCase().trim();

    if (userInput !== requiredText) {
      this.auditLogger.logSecurityViolation(
        'dangerous-action-confirmation',
        'invalid_confirmation_text',
        SecuritySeverity.HIGH,
        {
          toolName: request.toolName,
          expectedText: requiredText,
          receivedText: userInput,
          correlationId: request.correlationId
        }
      );
      return false;
    }

    // Log successful confirmation
    const successEvent = {
      eventType: SecurityEventType.AUTHORIZATION,
      severity: this.mapSeverityToSecuritySeverity(request.action.severity),
      source: 'dangerous-action-confirmation',
      action: 'confirmation_validated',
      resource: request.toolName,
      result: SecurityResult.SUCCESS,
      details: {
        actionCategory: request.action.category,
        actionDescription: request.action.description,
        impactScope: request.action.impactScope,
        confirmationTime: response.timestamp - request.timestamp,
        correlationId: request.correlationId
      }
    };
    this.auditLogger.logSecurityEvent(successEvent);

    return true;
  }

  /**
   * Generate statistics about dangerous actions
   */
  public getDangerousActionStatistics(): {
    totalActions: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byImpactScope: Record<string, number>;
    irreversibleActions: number;
  } {
    const stats = {
      totalActions: this.dangerousActions.size,
      bySeverity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byImpactScope: {} as Record<string, number>,
      irreversibleActions: 0
    };

    for (const [, config] of this.dangerousActions) {
      // Count by severity
      stats.bySeverity[config.severity] = (stats.bySeverity[config.severity] || 0) + 1;

      // Count by category
      stats.byCategory[config.category] = (stats.byCategory[config.category] || 0) + 1;

      // Count by impact scope
      stats.byImpactScope[config.impactScope] = (stats.byImpactScope[config.impactScope] || 0) + 1;

      // Count irreversible actions
      if (!config.reversible) {
        stats.irreversibleActions++;
      }
    }

    return stats;
  }

  /**
   * Generate a unique correlation ID
   */
  private generateCorrelationId(): string {
    return `confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map action severity to security severity
   */
  private mapSeverityToSecuritySeverity(severity: string): SecuritySeverity {
    switch (severity) {
      case 'critical':
        return SecuritySeverity.CRITICAL;
      case 'high':
        return SecuritySeverity.HIGH;
      case 'medium':
        return SecuritySeverity.MEDIUM;
      case 'low':
        return SecuritySeverity.LOW;
      default:
        return SecuritySeverity.MEDIUM;
    }
  }

  /**
   * Sanitize parameters for secure logging
   */
  private sanitizeParametersForLogging(parameters: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential'];

    for (const [key, value] of Object.entries(parameters)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}