#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { CloudStackClient } from './cloudstack/client.js';
import { ConfigManager } from './utils/config.js';
import { Logger } from './utils/logger.js';
import { ConfirmationMiddleware } from './security/ConfirmationMiddleware.js';
import { DangerousActionConfirmation } from './security/DangerousActionConfirmation.js';
import { SecurityAuditLogger } from './security/SecurityAuditLogger.js';
import { 
  createConfirmationRequiredError,
  formatConfirmationForDisplay,
  MCP_CONFIRMATION_ERROR_CODES 
} from './security/ConfirmationProtocol.js';
import { z } from 'zod';

class CloudStackMCPServer {
  private server: Server;
  private client: CloudStackClient;
  private configManager: ConfigManager;
  private confirmationMiddleware: ConfirmationMiddleware;

  constructor() {
    this.server = new Server(
      {
        name: 'cloudstack-mcp-server',
        version: '3.0.4',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    try {
      this.configManager = new ConfigManager();
      const loggingConfig = this.configManager.getLoggingConfig();
      
      // Initialize logger first
      Logger.getInstance(loggingConfig.level, loggingConfig.file);
      
      const environment = this.configManager.getDefaultEnvironment();
      this.client = new CloudStackClient(environment);

      // Validate CloudStack credentials at startup (async validation in background)
      this.validateCredentials().catch(error => {
        Logger.warn('CloudStack credential validation failed at startup', error);
      });

      // Initialize security components
      const securityAuditLogger = new SecurityAuditLogger();
      const dangerousActionConfirmation = new DangerousActionConfirmation(securityAuditLogger);
      this.confirmationMiddleware = new ConfirmationMiddleware(
        dangerousActionConfirmation,
        securityAuditLogger,
        {
          confirmationTimeoutMs: 300000, // 5 minutes
          maxPendingConfirmations: 50,
          enableBypass: false, // Enable for development environments
          bypassEnvironments: ['development', 'test']
        }
      );

      this.setupToolHandlers();
      this.setupErrorHandling();
    } catch (error) {
      console.error('Failed to initialize CloudStack MCP Server:', error);
      throw error;
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'list_virtual_machines',
          description: 'List virtual machines in CloudStack with comprehensive filtering options',
          inputSchema: {
            type: 'object',
            properties: {
              // Basic filters
              account: {
                type: 'string',
                description: 'Account name to filter VMs (must be used with domainid)'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID (required when account is specified)'
              },
              projectid: {
                type: 'string',
                description: 'Project ID to filter VMs'
              },
              keyword: {
                type: 'string',
                description: 'Keyword to search in VM names'
              },
              name: {
                type: 'string',
                description: 'VM name to filter'
              },
              id: {
                type: 'string',
                description: 'Specific VM ID'
              },
              ids: {
                type: 'string',
                description: 'Comma-separated list of VM IDs'
              },
              // Location filters
              zoneid: {
                type: 'string',
                description: 'Zone ID to filter VMs'
              },
              clusterid: {
                type: 'string',
                description: 'Cluster ID to filter VMs'
              },
              hostid: {
                type: 'string',
                description: 'Host ID to filter VMs'
              },
              podid: {
                type: 'string',
                description: 'Pod ID to filter VMs'
              },
              storageid: {
                type: 'string',
                description: 'Storage ID to filter VMs'
              },
              // Resource filters
              templateid: {
                type: 'string',
                description: 'Template ID to filter VMs'
              },
              serviceofferingid: {
                type: 'string',
                description: 'Service offering ID to filter VMs'
              },
              diskofferingid: {
                type: 'string',
                description: 'Disk offering ID to filter VMs'
              },
              networkid: {
                type: 'string',
                description: 'Network ID to filter VMs'
              },
              vpcid: {
                type: 'string',
                description: 'VPC ID to filter VMs'
              },
              isoid: {
                type: 'string',
                description: 'ISO ID to filter VMs'
              },
              securitygroupid: {
                type: 'string',
                description: 'Security group ID to filter VMs'
              },
              affinitygroupid: {
                type: 'string',
                description: 'Affinity group ID to filter VMs'
              },
              backupofferingid: {
                type: 'string',
                description: 'Backup offering ID to filter VMs'
              },
              // State and configuration filters
              state: {
                type: 'string',
                description: 'VM state (Running, Stopped, Starting, Stopping, Migrating, Error, Unknown, Shutdowned, Destroyed, Expunging)'
              },
              haenable: {
                type: 'boolean',
                description: 'Filter VMs with High Availability enabled'
              },
              hypervisor: {
                type: 'string',
                description: 'Hypervisor type (KVM, XenServer, VMware, etc.)'
              },
              displayvm: {
                type: 'boolean',
                description: 'Filter by display flag (admin only)'
              },
              forvirtualnetwork: {
                type: 'boolean',
                description: 'Filter by virtual network type'
              },
              keypair: {
                type: 'string',
                description: 'SSH keypair name to filter VMs'
              },
              groupid: {
                type: 'string',
                description: 'Group ID to filter VMs'
              },
              userid: {
                type: 'string',
                description: 'User ID to filter VMs'
              },
              autoscalevmgroupid: {
                type: 'string',
                description: 'Auto-scaling VM group ID to filter VMs'
              },
              // Advanced filters
              details: {
                type: 'string',
                description: 'Comma-separated list of VM details to include'
              },
              userdata: {
                type: 'boolean',
                description: 'Include user data in response'
              },
              accumulate: {
                type: 'boolean',
                description: 'Accumulate VM metrics data'
              },
              isrecursive: {
                type: 'boolean',
                description: 'Recursively list resources'
              },
              listall: {
                type: 'boolean',
                description: 'List all authorized resources'
              },
              isvnf: {
                type: 'boolean',
                description: 'Filter VNF appliance VMs'
              },
              tags: {
                type: 'string',
                description: 'Resource tags to filter VMs'
              },
              // Pagination
              page: {
                type: 'number',
                description: 'Page number for pagination'
              },
              pagesize: {
                type: 'number',
                description: 'Number of items per page (1-500)'
              }
            }
          }
        },
        {
          name: 'list_networks',
          description: 'List networks in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              zone: {
                type: 'string',
                description: 'Zone ID or name to filter networks'
              },
              type: {
                type: 'string',
                description: 'Network type (Isolated, Shared, etc.)'
              },
              account: {
                type: 'string',
                description: 'Account name to filter networks'
              }
            }
          }
        },
        {
          name: 'list_volumes',
          description: 'List storage volumes in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              zone: {
                type: 'string',
                description: 'Zone ID or name to filter volumes'
              },
              type: {
                type: 'string',
                description: 'Volume type (ROOT, DATADISK)'
              },
              virtualmachineid: {
                type: 'string',
                description: 'VM ID to filter volumes'
              }
            }
          }
        },
        {
          name: 'list_snapshots',
          description: 'List volume snapshots in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              volumeid: {
                type: 'string',
                description: 'Volume ID to filter snapshots'
              },
              account: {
                type: 'string',
                description: 'Account name to filter snapshots'
              },
              intervaltype: {
                type: 'string',
                description: 'Snapshot interval type (MANUAL, HOURLY, DAILY, etc.)'
              }
            }
          }
        },
        {
          name: 'list_zones',
          description: 'List availability zones in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              available: {
                type: 'boolean',
                description: 'Show only available zones'
              }
            }
          }
        },
        {
          name: 'list_hosts',
          description: 'List hypervisor hosts in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              zone: {
                type: 'string',
                description: 'Zone ID or name to filter hosts'
              },
              type: {
                type: 'string',
                description: 'Host type (Routing, Secondary Storage, etc.)'
              },
              state: {
                type: 'string',
                description: 'Host state (Up, Down, etc.)'
              }
            }
          }
        },
        {
          name: 'list_service_offerings',
          description: 'List compute service offerings in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'VM ID to show compatible offerings'
              }
            }
          }
        },
        {
          name: 'create_service_offering',
          description: 'Create a new service offering in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the service offering'
              },
              displaytext: {
                type: 'string',
                description: 'Display text for the service offering'
              },
              cpunumber: {
                type: 'number',
                description: 'Number of CPU cores'
              },
              memory: {
                type: 'number',
                description: 'Memory in MB'
              },
              cpuspeed: {
                type: 'number',
                description: 'CPU speed in MHz'
              },
              storagetype: {
                type: 'string',
                description: 'Storage type (shared or local)'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID to scope the offering'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID to scope the offering'
              }
            },
            required: ['name', 'displaytext']
          }
        },
        {
          name: 'update_service_offering',
          description: 'Update an existing service offering in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Service offering ID'
              },
              name: {
                type: 'string',
                description: 'Updated name of the service offering'
              },
              displaytext: {
                type: 'string',
                description: 'Updated display text'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID to scope the offering'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID to scope the offering'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_service_offering',
          description: 'Delete a service offering in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Service offering ID to delete'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_templates',
          description: 'List VM templates in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              templatefilter: {
                type: 'string',
                description: 'Template filter (featured, self, selfexecutable, etc.)',
                default: 'executable'
              },
              zone: {
                type: 'string',
                description: 'Zone ID or name to filter templates'
              },
              hypervisor: {
                type: 'string',
                description: 'Hypervisor type (KVM, VMware, etc.)'
              }
            }
          }
        },
        // Template Management Tools
        {
          name: 'create_template',
          description: 'Create a template from a virtual machine or volume',
          inputSchema: {
            type: 'object',
            properties: {
              displaytext: {
                type: 'string',
                description: 'Template display text'
              },
              name: {
                type: 'string',
                description: 'Template name'
              },
              ostypeid: {
                type: 'string',
                description: 'OS Type ID'
              },
              virtualmachineid: {
                type: 'string',
                description: 'VM ID to create template from'
              },
              volumeid: {
                type: 'string',
                description: 'Volume ID to create template from'
              },
              snapshotid: {
                type: 'string',
                description: 'Snapshot ID to create template from'
              },
              isfeatured: {
                type: 'boolean',
                description: 'Make template featured'
              },
              ispublic: {
                type: 'boolean',
                description: 'Make template public'
              },
              passwordenabled: {
                type: 'boolean',
                description: 'Enable password reset'
              }
            },
            required: ['displaytext', 'name', 'ostypeid']
          }
        },
        {
          name: 'register_template',
          description: 'Register a template from external URL',
          inputSchema: {
            type: 'object',
            properties: {
              displaytext: {
                type: 'string',
                description: 'Template display text'
              },
              format: {
                type: 'string',
                description: 'Template format (VHD, QCOW2, RAW, OVA, etc.)'
              },
              hypervisor: {
                type: 'string',
                description: 'Hypervisor type'
              },
              name: {
                type: 'string',
                description: 'Template name'
              },
              ostypeid: {
                type: 'string',
                description: 'OS Type ID'
              },
              url: {
                type: 'string',
                description: 'Template download URL'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID where template will be available'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              isfeatured: {
                type: 'boolean',
                description: 'Make template featured'
              },
              ispublic: {
                type: 'boolean',
                description: 'Make template public'
              },
              passwordenabled: {
                type: 'boolean',
                description: 'Enable password reset'
              },
              requireshvm: {
                type: 'boolean',
                description: 'Requires HVM'
              }
            },
            required: ['displaytext', 'format', 'hypervisor', 'name', 'ostypeid', 'url', 'zoneid']
          }
        },
        {
          name: 'update_template',
          description: 'Update template properties',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Template ID'
              },
              displaytext: {
                type: 'string',
                description: 'Updated display text'
              },
              name: {
                type: 'string',
                description: 'Updated template name'
              },
              ostypeid: {
                type: 'string',
                description: 'Updated OS Type ID'
              },
              passwordenabled: {
                type: 'boolean',
                description: 'Enable/disable password reset'
              },
              sortkey: {
                type: 'number',
                description: 'Sort key for ordering'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'copy_template',
          description: 'Copy template to another zone',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Template ID'
              },
              destzoneid: {
                type: 'string',
                description: 'Destination zone ID'
              },
              sourcezoneid: {
                type: 'string',
                description: 'Source zone ID'
              }
            },
            required: ['id', 'destzoneid']
          }
        },
        {
          name: 'delete_template',
          description: 'Delete a template',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Template ID'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID (optional, deletes from specific zone)'
              },
              forced: {
                type: 'boolean',
                description: 'Force deletion even if template is in use'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'extract_template',
          description: 'Extract template for download',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Template ID'
              },
              mode: {
                type: 'string',
                description: 'Extraction mode (HTTP_DOWNLOAD, FTP_UPLOAD)',
                default: 'HTTP_DOWNLOAD'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              },
              url: {
                type: 'string',
                description: 'Upload URL for FTP_UPLOAD mode'
              }
            },
            required: ['id', 'mode', 'zoneid']
          }
        },
        {
          name: 'prepare_template',
          description: 'Prepare template in a specific zone',
          inputSchema: {
            type: 'object',
            properties: {
              templateid: {
                type: 'string',
                description: 'Template ID'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID where template should be prepared'
              }
            },
            required: ['templateid', 'zoneid']
          }
        },
        // ISO Management Tools
        {
          name: 'list_isos',
          description: 'List ISOs available in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name to filter ISOs'
              },
              bootable: {
                type: 'boolean',
                description: 'Filter by bootable ISOs'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID to filter ISOs'
              },
              hypervisor: {
                type: 'string',
                description: 'Hypervisor type'
              },
              id: {
                type: 'string',
                description: 'ISO ID'
              },
              isofilter: {
                type: 'string',
                description: 'ISO filter (featured, self, selfexecutable, etc.)',
                default: 'executable'
              },
              ispublic: {
                type: 'boolean',
                description: 'Filter by public ISOs'
              },
              isready: {
                type: 'boolean',
                description: 'Filter by ready state'
              },
              keyword: {
                type: 'string',
                description: 'Keyword search'
              },
              name: {
                type: 'string',
                description: 'ISO name'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID to filter ISOs'
              }
            }
          }
        },
        {
          name: 'register_iso',
          description: 'Register an ISO from external URL',
          inputSchema: {
            type: 'object',
            properties: {
              displaytext: {
                type: 'string',
                description: 'ISO display text'
              },
              name: {
                type: 'string',
                description: 'ISO name'
              },
              url: {
                type: 'string',
                description: 'ISO download URL'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID where ISO will be available'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              bootable: {
                type: 'boolean',
                description: 'Make ISO bootable'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              isfeatured: {
                type: 'boolean',
                description: 'Make ISO featured'
              },
              ispublic: {
                type: 'boolean',
                description: 'Make ISO public'
              },
              ostypeid: {
                type: 'string',
                description: 'OS Type ID'
              }
            },
            required: ['displaytext', 'name', 'url', 'zoneid']
          }
        },
        {
          name: 'update_iso',
          description: 'Update ISO properties',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ISO ID'
              },
              displaytext: {
                type: 'string',
                description: 'Updated display text'
              },
              name: {
                type: 'string',
                description: 'Updated ISO name'
              },
              ostypeid: {
                type: 'string',
                description: 'Updated OS Type ID'
              },
              bootable: {
                type: 'boolean',
                description: 'Update bootable flag'
              },
              sortkey: {
                type: 'number',
                description: 'Sort key for ordering'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'copy_iso',
          description: 'Copy ISO to another zone',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ISO ID'
              },
              destzoneid: {
                type: 'string',
                description: 'Destination zone ID'
              },
              sourcezoneid: {
                type: 'string',
                description: 'Source zone ID'
              }
            },
            required: ['id', 'destzoneid']
          }
        },
        {
          name: 'delete_iso',
          description: 'Delete an ISO',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ISO ID'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID (optional, deletes from specific zone)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'extract_iso',
          description: 'Extract ISO for download',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ISO ID'
              },
              mode: {
                type: 'string',
                description: 'Extraction mode (HTTP_DOWNLOAD, FTP_UPLOAD)',
                default: 'HTTP_DOWNLOAD'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              },
              url: {
                type: 'string',
                description: 'Upload URL for FTP_UPLOAD mode'
              }
            },
            required: ['id', 'mode', 'zoneid']
          }
        },
        {
          name: 'attach_iso',
          description: 'Attach ISO to a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ISO ID'
              },
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              }
            },
            required: ['id', 'virtualmachineid']
          }
        },
        {
          name: 'detach_iso',
          description: 'Detach ISO from a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'get_cloudstack_info',
          description: 'Get CloudStack environment information and connection status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        // VPC Management Tools
        {
          name: 'create_vpc',
          description: 'Create a Virtual Private Cloud',
          inputSchema: {
            type: 'object',
            properties: {
              cidr: {
                type: 'string',
                description: 'CIDR block for the VPC'
              },
              displaytext: {
                type: 'string',
                description: 'VPC display text'
              },
              name: {
                type: 'string',
                description: 'VPC name'
              },
              vpcofferingid: {
                type: 'string',
                description: 'VPC offering ID'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID where VPC will be created'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              networkdomain: {
                type: 'string',
                description: 'Network domain for the VPC'
              }
            },
            required: ['cidr', 'displaytext', 'name', 'vpcofferingid', 'zoneid']
          }
        },
        {
          name: 'list_vpcs',
          description: 'List Virtual Private Clouds',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'VPC ID'
              },
              keyword: {
                type: 'string',
                description: 'Keyword search'
              },
              name: {
                type: 'string',
                description: 'VPC name'
              },
              state: {
                type: 'string',
                description: 'VPC state'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              },
              isrecursive: {
                type: 'boolean',
                description: 'List VPCs recursively'
              }
            }
          }
        },
        {
          name: 'delete_vpc',
          description: 'Delete a Virtual Private Cloud',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VPC ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'update_vpc',
          description: 'Update VPC properties',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VPC ID'
              },
              displaytext: {
                type: 'string',
                description: 'Updated display text'
              },
              name: {
                type: 'string',
                description: 'Updated VPC name'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'restart_vpc',
          description: 'Restart a Virtual Private Cloud',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VPC ID'
              },
              cleanup: {
                type: 'boolean',
                description: 'Clean up VPC resources during restart'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_private_gateway',
          description: 'Create a private gateway for VPC',
          inputSchema: {
            type: 'object',
            properties: {
              gateway: {
                type: 'string',
                description: 'Gateway IP address'
              },
              ipaddress: {
                type: 'string',
                description: 'IP address for the gateway'
              },
              netmask: {
                type: 'string',
                description: 'Netmask for the gateway'
              },
              vlan: {
                type: 'string',
                description: 'VLAN tag'
              },
              vpcid: {
                type: 'string',
                description: 'VPC ID'
              },
              aclid: {
                type: 'string',
                description: 'ACL ID to apply'
              }
            },
            required: ['gateway', 'ipaddress', 'netmask', 'vlan', 'vpcid']
          }
        },
        {
          name: 'list_private_gateways',
          description: 'List private gateways',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'Private gateway ID'
              },
              ipaddress: {
                type: 'string',
                description: 'IP address'
              },
              state: {
                type: 'string',
                description: 'Gateway state'
              },
              vpcid: {
                type: 'string',
                description: 'VPC ID'
              }
            }
          }
        },
        {
          name: 'delete_private_gateway',
          description: 'Delete a private gateway',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Private gateway ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_static_route',
          description: 'Create a static route for VPC',
          inputSchema: {
            type: 'object',
            properties: {
              cidr: {
                type: 'string',
                description: 'CIDR block for the route'
              },
              gatewayid: {
                type: 'string',
                description: 'Private gateway ID'
              }
            },
            required: ['cidr', 'gatewayid']
          }
        },
        {
          name: 'list_static_routes',
          description: 'List static routes',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              gatewayid: {
                type: 'string',
                description: 'Private gateway ID'
              },
              id: {
                type: 'string',
                description: 'Static route ID'
              },
              vpcid: {
                type: 'string',
                description: 'VPC ID'
              }
            }
          }
        },
        {
          name: 'delete_static_route',
          description: 'Delete a static route',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Static route ID'
              }
            },
            required: ['id']
          }
        },
        // VPN Services Tools
        {
          name: 'create_vpn_connection',
          description: 'Create a Site-to-Site VPN connection',
          inputSchema: {
            type: 'object',
            properties: {
              customergatewayid: {
                type: 'string',
                description: 'Customer gateway ID'
              },
              vpngatewayid: {
                type: 'string',
                description: 'VPN gateway ID'
              },
              passive: {
                type: 'boolean',
                description: 'Passive connection'
              }
            },
            required: ['customergatewayid', 'vpngatewayid']
          }
        },
        {
          name: 'list_vpn_connections',
          description: 'List VPN connections',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'VPN connection ID'
              },
              vpcid: {
                type: 'string',
                description: 'VPC ID'
              }
            }
          }
        },
        {
          name: 'delete_vpn_connection',
          description: 'Delete a VPN connection',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VPN connection ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'reset_vpn_connection',
          description: 'Reset a VPN connection',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VPN connection ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_vpn_gateway',
          description: 'Create a VPN gateway',
          inputSchema: {
            type: 'object',
            properties: {
              vpcid: {
                type: 'string',
                description: 'VPC ID'
              }
            },
            required: ['vpcid']
          }
        },
        {
          name: 'list_vpn_gateways',
          description: 'List VPN gateways',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'VPN gateway ID'
              },
              vpcid: {
                type: 'string',
                description: 'VPC ID'
              }
            }
          }
        },
        {
          name: 'delete_vpn_gateway',
          description: 'Delete a VPN gateway',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VPN gateway ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_customer_gateway',
          description: 'Create a customer gateway',
          inputSchema: {
            type: 'object',
            properties: {
              cidrlist: {
                type: 'string',
                description: 'Customer CIDR list'
              },
              esppolicy: {
                type: 'string',
                description: 'ESP policy'
              },
              gateway: {
                type: 'string',
                description: 'Customer gateway IP'
              },
              ikepolicy: {
                type: 'string',
                description: 'IKE policy'
              },
              ipsecpsk: {
                type: 'string',
                description: 'IPsec pre-shared key'
              },
              name: {
                type: 'string',
                description: 'Customer gateway name'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              }
            },
            required: ['cidrlist', 'esppolicy', 'gateway', 'ikepolicy', 'ipsecpsk', 'name']
          }
        },
        {
          name: 'list_customer_gateways',
          description: 'List customer gateways',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'Customer gateway ID'
              },
              keyword: {
                type: 'string',
                description: 'Keyword search'
              }
            }
          }
        },
        {
          name: 'delete_customer_gateway',
          description: 'Delete a customer gateway',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Customer gateway ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_remote_access_vpn',
          description: 'Create Remote Access VPN',
          inputSchema: {
            type: 'object',
            properties: {
              publicipid: {
                type: 'string',
                description: 'Public IP ID'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              iprange: {
                type: 'string',
                description: 'IP range for VPN clients'
              },
              openfirewall: {
                type: 'boolean',
                description: 'Open firewall for VPN'
              }
            },
            required: ['publicipid']
          }
        },
        {
          name: 'list_remote_access_vpns',
          description: 'List Remote Access VPNs',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'Remote Access VPN ID'
              },
              networkid: {
                type: 'string',
                description: 'Network ID'
              },
              publicipid: {
                type: 'string',
                description: 'Public IP ID'
              }
            }
          }
        },
        {
          name: 'delete_remote_access_vpn',
          description: 'Delete Remote Access VPN',
          inputSchema: {
            type: 'object',
            properties: {
              publicipid: {
                type: 'string',
                description: 'Public IP ID'
              }
            },
            required: ['publicipid']
          }
        },
        {
          name: 'add_vpn_user',
          description: 'Add VPN user for Remote Access VPN',
          inputSchema: {
            type: 'object',
            properties: {
              password: {
                type: 'string',
                description: 'VPN user password'
              },
              username: {
                type: 'string',
                description: 'VPN username'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              }
            },
            required: ['password', 'username']
          }
        },
        {
          name: 'list_vpn_users',
          description: 'List VPN users',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'VPN user ID'
              },
              username: {
                type: 'string',
                description: 'Username filter'
              }
            }
          }
        },
        {
          name: 'remove_vpn_user',
          description: 'Remove VPN user',
          inputSchema: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                description: 'VPN username to remove'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              }
            },
            required: ['username']
          }
        },
        // VPN Services Enhancement - Missing APIs
        {
          name: 'update_vpn_gateway',
          description: 'Update VPN gateway configuration',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN gateway ID' },
              name: { type: 'string', description: 'Gateway name' },
              displaytext: { type: 'string', description: 'Display text' }
            },
            required: ['id']
          }
        },
        {
          name: 'enable_vpn_gateway',
          description: 'Enable VPN gateway',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN gateway ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'disable_vpn_gateway',
          description: 'Disable VPN gateway',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN gateway ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'restart_vpn_gateway',
          description: 'Restart VPN gateway service',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN gateway ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_vpn_connection',
          description: 'Update VPN connection parameters',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN connection ID' },
              fordisplay: { type: 'boolean', description: 'Display for users' },
              customid: { type: 'string', description: 'Custom ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_vpn_instances',
          description: 'List VPN instances with detailed configuration',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              keyword: { type: 'string', description: 'Keyword search' }
            }
          }
        },
        {
          name: 'update_vpn_customer_gateway',
          description: 'Update VPN customer gateway settings',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Customer gateway ID' },
              name: { type: 'string', description: 'Gateway name' },
              cidrlist: { type: 'string', description: 'CIDR list' },
              esppolicy: { type: 'string', description: 'ESP policy' },
              ikepolicy: { type: 'string', description: 'IKE policy' },
              ipsecpsk: { type: 'string', description: 'IPsec pre-shared key' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_remote_access_vpn',
          description: 'Update Remote Access VPN settings',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Remote Access VPN ID' },
              customid: { type: 'string', description: 'Custom ID' },
              fordisplay: { type: 'boolean', description: 'Display for users' }
            },
            required: ['id']
          }
        },
        // Advanced Networking Tools (exposing existing client methods)
        {
          name: 'create_network_offering',
          description: 'Create a new network offering',
          inputSchema: {
            type: 'object',
            properties: {
              displaytext: {
                type: 'string',
                description: 'Display text for the offering'
              },
              guestiptype: {
                type: 'string',
                description: 'Guest IP type (Isolated, Shared, L2, etc.)'
              },
              name: {
                type: 'string',
                description: 'Network offering name'
              },
              supportedservices: {
                type: 'string',
                description: 'Supported services (comma-separated)'
              },
              traffictype: {
                type: 'string',
                description: 'Traffic type (Guest, Management, Public, etc.)'
              },
              availability: {
                type: 'string',
                description: 'Availability (Optional, Required)'
              },
              networkrate: {
                type: 'number',
                description: 'Network rate in Mbps'
              },
              conservemode: {
                type: 'boolean',
                description: 'Enable/disable conserve mode'
              }
            },
            required: ['displaytext', 'guestiptype', 'name', 'supportedservices', 'traffictype']
          }
        },
        {
          name: 'delete_network_offering',
          description: 'Delete a network offering',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Network offering ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'update_network_offering',
          description: 'Update network offering properties',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Network offering ID'
              },
              displaytext: {
                type: 'string',
                description: 'Updated display text'
              },
              name: {
                type: 'string',
                description: 'Updated name'
              },
              availability: {
                type: 'string',
                description: 'Updated availability'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_vpc_offering',
          description: 'Create a new VPC offering',
          inputSchema: {
            type: 'object',
            properties: {
              displaytext: {
                type: 'string',
                description: 'Display text for the VPC offering'
              },
              name: {
                type: 'string',
                description: 'VPC offering name'
              },
              supportedservices: {
                type: 'string',
                description: 'Supported services (comma-separated)'
              }
            },
            required: ['displaytext', 'name', 'supportedservices']
          }
        },
        {
          name: 'list_vpc_offerings',
          description: 'List VPC offerings',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VPC offering ID'
              },
              name: {
                type: 'string',
                description: 'VPC offering name'
              },
              state: {
                type: 'string',
                description: 'VPC offering state'
              }
            }
          }
        },
        {
          name: 'update_vpc_offering',
          description: 'Update VPC offering properties',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VPC offering ID'
              },
              displaytext: {
                type: 'string',
                description: 'Updated display text'
              },
              name: {
                type: 'string',
                description: 'Updated name'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_vpc_offering',
          description: 'Delete a VPC offering',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VPC offering ID'
              }
            },
            required: ['id']
          }
        },
        // Network ACL Lists Management Tools
        {
          name: 'create_network_acl_list',
          description: 'Create a new Network ACL list for VPC',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'ACL list name'
              },
              description: {
                type: 'string',
                description: 'ACL list description'
              },
              vpcid: {
                type: 'string',
                description: 'VPC ID'
              }
            },
            required: ['name', 'vpcid']
          }
        },
        {
          name: 'list_network_acl_lists',
          description: 'List Network ACL lists',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'ACL list ID'
              },
              name: {
                type: 'string',
                description: 'ACL list name'
              },
              vpcid: {
                type: 'string',
                description: 'VPC ID'
              }
            }
          }
        },
        {
          name: 'delete_network_acl_list',
          description: 'Delete a Network ACL list',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ACL list ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'replace_network_acl_list',
          description: 'Replace Network ACL list for a network',
          inputSchema: {
            type: 'object',
            properties: {
              aclid: {
                type: 'string',
                description: 'New ACL list ID'
              },
              networkid: {
                type: 'string',
                description: 'Network ID'
              }
            },
            required: ['aclid', 'networkid']
          }
        },
        {
          name: 'update_network_acl_list',
          description: 'Update a Network ACL list',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Network ACL list ID'
              },
              name: {
                type: 'string',
                description: 'New name for the ACL list'
              },
              description: {
                type: 'string',
                description: 'New description for the ACL list'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_vlan_ip_range',
          description: 'Create a VLAN IP range',
          inputSchema: {
            type: 'object',
            properties: {
              endip: {
                type: 'string',
                description: 'End IP address'
              },
              gateway: {
                type: 'string',
                description: 'Gateway IP address'
              },
              netmask: {
                type: 'string',
                description: 'Netmask'
              },
              startip: {
                type: 'string',
                description: 'Start IP address'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              },
              vlan: {
                type: 'string',
                description: 'VLAN tag'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              }
            },
            required: ['endip', 'gateway', 'netmask', 'startip', 'zoneid']
          }
        },
        {
          name: 'delete_vlan_ip_range',
          description: 'Delete a VLAN IP range',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VLAN IP range ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_vlan_ip_ranges',
          description: 'List VLAN IP ranges',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'VLAN IP range ID'
              },
              keyword: {
                type: 'string',
                description: 'Keyword search'
              },
              networkid: {
                type: 'string',
                description: 'Network ID'
              },
              vlan: {
                type: 'string',
                description: 'VLAN tag'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              }
            }
          }
        },
        {
          name: 'dedicate_public_ip_range',
          description: 'Dedicate a public IP range to an account',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'VLAN IP range ID'
              }
            },
            required: ['account', 'domainid', 'id']
          }
        },
        {
          name: 'release_public_ip_range',
          description: 'Release a dedicated public IP range',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VLAN IP range ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'update_ip_address',
          description: 'Update IP address information',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'IP address ID'
              },
              customid: {
                type: 'string',
                description: 'Custom ID'
              },
              fordisplay: {
                type: 'boolean',
                description: 'Display flag'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_ip_forwarding_rule',
          description: 'Create an IP forwarding rule',
          inputSchema: {
            type: 'object',
            properties: {
              ipaddressid: {
                type: 'string',
                description: 'Public IP address ID'
              },
              protocol: {
                type: 'string',
                description: 'Protocol (TCP, UDP)'
              },
              startport: {
                type: 'number',
                description: 'Start port'
              },
              endport: {
                type: 'number',
                description: 'End port'
              }
            },
            required: ['ipaddressid', 'protocol', 'startport']
          }
        },
        {
          name: 'delete_ip_forwarding_rule',
          description: 'Delete an IP forwarding rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'IP forwarding rule ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_ip_forwarding_rules',
          description: 'List IP forwarding rules',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              id: {
                type: 'string',
                description: 'Rule ID'
              },
              ipaddressid: {
                type: 'string',
                description: 'IP address ID'
              },
              virtualmachineid: {
                type: 'string',
                description: 'VM ID'
              }
            }
          }
        },
        {
          name: 'update_port_forwarding_rule',
          description: 'Update port forwarding rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Port forwarding rule ID'
              },
              customid: {
                type: 'string',
                description: 'Custom ID'
              },
              fordisplay: {
                type: 'boolean',
                description: 'Display flag'
              },
              virtualmachineid: {
                type: 'string',
                description: 'VM ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'deploy_virtual_machine',
          description: 'Deploy a new virtual machine in CloudStack with comprehensive configuration options',
          inputSchema: {
            type: 'object',
            properties: {
              // Required parameters
              serviceofferingid: {
                type: 'string',
                description: 'Service offering ID for the VM'
              },
              templateid: {
                type: 'string',
                description: 'Template ID to deploy from'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID where to deploy the VM'
              },
              // Basic VM configuration
              name: {
                type: 'string',
                description: 'Name for the new VM'
              },
              displayname: {
                type: 'string',
                description: 'Display name for the new VM'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              group: {
                type: 'string',
                description: 'Group name for the VM'
              },
              projectid: {
                type: 'string',
                description: 'Project ID for deployment'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              // Network configuration
              networkids: {
                type: 'string',
                description: 'Network IDs (comma-separated) to attach to VM'
              },
              securitygroupids: {
                type: 'string',
                description: 'Security group IDs (comma-separated)'
              },
              securitygroupnames: {
                type: 'string',
                description: 'Security group names (comma-separated)'
              },
              // Storage configuration
              diskofferingid: {
                type: 'string',
                description: 'Disk offering ID for additional disks'
              },
              rootdisksize: {
                type: 'string',
                description: 'Root disk size in GB'
              },
              size: {
                type: 'string',
                description: 'Root disk size (deprecated, use rootdisksize)'
              },
              rootdiskcontroller: {
                type: 'string',
                description: 'Root disk controller type'
              },
              // Placement and affinity
              affinitygroupids: {
                type: 'string',
                description: 'Affinity group IDs (comma-separated)'
              },
              affinitygroupnames: {
                type: 'string',
                description: 'Affinity group names (comma-separated)'
              },
              hostid: {
                type: 'string',
                description: 'Host ID for deployment (admin only)'
              },
              clusterid: {
                type: 'string',
                description: 'Cluster ID for deployment (admin only)'
              },
              podid: {
                type: 'string',
                description: 'Pod ID for deployment (admin only)'
              },
              deploymentplanner: {
                type: 'string',
                description: 'Deployment planner to use (admin only)'
              },
              hypervisor: {
                type: 'string',
                description: 'Hypervisor type'
              },
              // Boot configuration
              bootmode: {
                type: 'string',
                description: 'Boot mode: Legacy or Secure'
              },
              boottype: {
                type: 'string',
                description: 'Boot type: BIOS or UEFI'
              },
              startvm: {
                type: 'boolean',
                description: 'Whether to start VM after deployment (default: true)'
              },
              // Authentication and user data
              keypair: {
                type: 'string',
                description: 'SSH keypair name'
              },
              userdata: {
                type: 'string',
                description: 'Base64 encoded user data (max 1MB)'
              },
              // Advanced configuration
              details: {
                type: 'string',
                description: 'VM details as key-value pairs'
              },
              customid: {
                type: 'string',
                description: 'Custom ID for the VM'
              },
              // Backup configuration
              backupofferingid: {
                type: 'string',
                description: 'Backup offering ID'
              },
              // Miscellaneous
              fordisplay: {
                type: 'boolean',
                description: 'Whether to display VM in UI (default: true)'
              },
              copyimagetags: {
                type: 'boolean',
                description: 'Copy image tags to VM (default: false)'
              },
              dynamicscalingenabled: {
                type: 'boolean',
                description: 'Enable dynamic scaling (default: false)'
              }
            },
            required: ['serviceofferingid', 'templateid', 'zoneid']
          }
        },
        {
          name: 'start_virtual_machine',
          description: 'Start a stopped virtual machine with advanced deployment options',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID to start'
              },
              bootintosetup: {
                type: 'boolean',
                description: 'Boot into hardware setup menu'
              },
              clusterid: {
                type: 'string',
                description: 'Destination cluster ID for VM deployment (root admin only)'
              },
              considerlasthost: {
                type: 'boolean',
                description: 'Consider last host when starting VM (default: true)'
              },
              deploymentplanner: {
                type: 'string',
                description: 'Deployment planner for VM allocation (root admin only)'
              },
              hostid: {
                type: 'string',
                description: 'Destination host ID for VM deployment (root admin only)'
              },
              podid: {
                type: 'string',
                description: 'Destination pod ID for VM deployment (root admin only)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'stop_virtual_machine',
          description: 'Stop a running virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID to stop'
              },
              forced: {
                type: 'boolean',
                description: 'Force stop the VM (default: false)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'reboot_virtual_machine',
          description: 'Reboot a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID to reboot'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'destroy_virtual_machine',
          description: 'Destroy (delete) a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID to destroy'
              },
              expunge: {
                type: 'boolean',
                description: 'Immediately expunge the VM (default: false)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'update_virtual_machine',
          description: 'Update virtual machine properties',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID to update'
              },
              displayname: {
                type: 'string',
                description: 'New display name'
              },
              group: {
                type: 'string',
                description: 'New group name'
              },
              haenable: {
                type: 'boolean',
                description: 'Enable/disable high availability'
              },
              ostypeid: {
                type: 'string',
                description: 'New OS type ID'
              },
              userdata: {
                type: 'string',
                description: 'User data for the VM'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'change_service_offering',
          description: 'Change the service offering of a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              serviceofferingid: {
                type: 'string',
                description: 'New service offering ID'
              }
            },
            required: ['id', 'serviceofferingid']
          }
        },
        {
          name: 'create_volume',
          description: 'Create a new data volume',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name for the new volume'
              },
              diskofferingid: {
                type: 'string',
                description: 'Disk offering ID for the volume'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID where to create the volume'
              },
              size: {
                type: 'number',
                description: 'Size in GB (for custom disk offerings)'
              },
              account: {
                type: 'string',
                description: 'Account name (optional)'
              }
            },
            required: ['name', 'diskofferingid', 'zoneid']
          }
        },
        {
          name: 'attach_volume',
          description: 'Attach a volume to a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Volume ID to attach'
              },
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID to attach to'
              },
              deviceid: {
                type: 'number',
                description: 'Device ID (optional)'
              }
            },
            required: ['id', 'virtualmachineid']
          }
        },
        {
          name: 'detach_volume',
          description: 'Detach a volume from a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Volume ID to detach'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_volume',
          description: 'Delete a volume',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Volume ID to delete'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'resize_volume',
          description: 'Resize a volume',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Volume ID to resize'
              },
              size: {
                type: 'number',
                description: 'New size in GB'
              },
              shrinkok: {
                type: 'boolean',
                description: 'Allow shrinking the volume (default: false)'
              }
            },
            required: ['id', 'size']
          }
        },
        {
          name: 'create_snapshot',
          description: 'Create a snapshot of a volume',
          inputSchema: {
            type: 'object',
            properties: {
              volumeid: {
                type: 'string',
                description: 'Volume ID to snapshot'
              },
              name: {
                type: 'string',
                description: 'Name for the snapshot (optional)'
              },
              account: {
                type: 'string',
                description: 'Account name (optional)'
              }
            },
            required: ['volumeid']
          }
        },
        {
          name: 'delete_snapshot',
          description: 'Delete a volume snapshot',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Snapshot ID to delete'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_volume_from_snapshot',
          description: 'Create a new volume from a snapshot',
          inputSchema: {
            type: 'object',
            properties: {
              snapshotid: {
                type: 'string',
                description: 'Snapshot ID to create volume from'
              },
              name: {
                type: 'string',
                description: 'Name for the new volume'
              },
              account: {
                type: 'string',
                description: 'Account name (optional)'
              }
            },
            required: ['snapshotid', 'name']
          }
        },
        {
          name: 'migrate_virtual_machine',
          description: 'Migrate a virtual machine to another host',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID to migrate'
              },
              hostid: {
                type: 'string',
                description: 'Destination host ID (optional - auto-select if not provided)'
              }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'scale_virtual_machine',
          description: 'Scale virtual machine CPU/memory',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID to scale'
              },
              serviceofferingid: {
                type: 'string',
                description: 'New service offering ID'
              },
              details: {
                type: 'string',
                description: 'Custom CPU/memory details (JSON format)'
              }
            },
            required: ['id', 'serviceofferingid']
          }
        },
        {
          name: 'reset_vm_password',
          description: 'Reset virtual machine password',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'get_vm_password',
          description: 'Get virtual machine password',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'add_nic_to_vm',
          description: 'Add network interface to virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              networkid: {
                type: 'string',
                description: 'Network ID to attach'
              },
              ipaddress: {
                type: 'string',
                description: 'Specific IP address (optional)'
              }
            },
            required: ['virtualmachineid', 'networkid']
          }
        },
        {
          name: 'remove_nic_from_vm',
          description: 'Remove network interface from virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              nicid: {
                type: 'string',
                description: 'Network interface ID to remove'
              }
            },
            required: ['virtualmachineid', 'nicid']
          }
        },
        {
          name: 'recover_virtual_machine',
          description: 'Recover a destroyed virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID to recover'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'expunge_virtual_machine',
          description: 'Permanently delete a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID to expunge'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'migrate_volume',
          description: 'Migrate a volume to another storage pool',
          inputSchema: {
            type: 'object',
            properties: {
              volumeid: {
                type: 'string',
                description: 'Volume ID to migrate'
              },
              storageid: {
                type: 'string',
                description: 'Destination storage pool ID'
              },
              livemigrate: {
                type: 'boolean',
                description: 'Perform live migration (default: false)'
              }
            },
            required: ['volumeid', 'storageid']
          }
        },
        {
          name: 'extract_volume',
          description: 'Extract volume for download',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Volume ID to extract'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID for extraction'
              },
              mode: {
                type: 'string',
                description: 'Extraction mode (HTTP_DOWNLOAD, FTP_UPLOAD)'
              }
            },
            required: ['id', 'zoneid', 'mode']
          }
        },
        {
          name: 'upload_volume',
          description: 'Upload a volume from URL',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name for the volume'
              },
              url: {
                type: 'string',
                description: 'URL to download volume from'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID for upload'
              },
              format: {
                type: 'string',
                description: 'Volume format (VHD, QCOW2, OVA, etc.)'
              },
              diskofferingid: {
                type: 'string',
                description: 'Disk offering ID (optional)'
              }
            },
            required: ['name', 'url', 'zoneid', 'format']
          }
        },
        {
          name: 'list_volume_metrics',
          description: 'List volume performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'string',
                description: 'Comma-separated volume IDs'
              },
              account: {
                type: 'string',
                description: 'Account name to filter'
              }
            }
          }
        },
        {
          name: 'create_network',
          description: 'Create a new network',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name for the network'
              },
              displaytext: {
                type: 'string',
                description: 'Display text for the network'
              },
              networkofferingid: {
                type: 'string',
                description: 'Network offering ID'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID for the network'
              },
              gateway: {
                type: 'string',
                description: 'Gateway IP address (optional)'
              },
              netmask: {
                type: 'string',
                description: 'Netmask (optional)'
              },
              startip: {
                type: 'string',
                description: 'Start IP range (optional)'
              },
              endip: {
                type: 'string',
                description: 'End IP range (optional)'
              },
              vlan: {
                type: 'string',
                description: 'VLAN ID (optional)'
              },
              account: {
                type: 'string',
                description: 'Account name (optional)'
              }
            },
            required: ['name', 'displaytext', 'networkofferingid', 'zoneid']
          }
        },
        // Physical Network Management
        {
          name: 'create_physical_network',
          description: 'Create a new physical network',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name for the physical network'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID for the physical network'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID (optional)'
              },
              tags: {
                type: 'string',
                description: 'Tags for the physical network (optional)'
              },
              isolationmethods: {
                type: 'string',
                description: 'Isolation methods (e.g., VLAN, GRE) (optional)'
              },
              broadcastdomainrange: {
                type: 'string',
                description: 'Broadcast domain range (optional)'
              },
              vlan: {
                type: 'string',
                description: 'VLAN range (optional)'
              }
            },
            required: ['name', 'zoneid']
          }
        },
        {
          name: 'list_physical_networks',
          description: 'List physical networks',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Physical network ID'
              },
              name: {
                type: 'string',
                description: 'Physical network name'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              keyword: {
                type: 'string',
                description: 'Search keyword'
              },
              page: {
                type: 'number',
                description: 'Page number for pagination'
              },
              pagesize: {
                type: 'number',
                description: 'Number of items per page'
              }
            }
          }
        },
        {
          name: 'update_physical_network',
          description: 'Update a physical network',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Physical network ID'
              },
              name: {
                type: 'string',
                description: 'New name for the physical network'
              },
              tags: {
                type: 'string',
                description: 'Tags for the physical network'
              },
              vlan: {
                type: 'string',
                description: 'VLAN range'
              },
              state: {
                type: 'string',
                description: 'State of the physical network'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_physical_network',
          description: 'Delete a physical network',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Physical network ID'
              }
            },
            required: ['id']
          }
        },
        // Traffic Management
        {
          name: 'add_traffic_type',
          description: 'Add a traffic type to a physical network',
          inputSchema: {
            type: 'object',
            properties: {
              physicalnetworkid: {
                type: 'string',
                description: 'Physical network ID'
              },
              traffictype: {
                type: 'string',
                description: 'Traffic type (Guest, Management, Public, Storage)'
              },
              kvmnetworklabel: {
                type: 'string',
                description: 'KVM network label (optional)'
              },
              vmwarenetworklabel: {
                type: 'string',
                description: 'VMware network label (optional)'
              },
              xennetworklabel: {
                type: 'string',
                description: 'XenServer network label (optional)'
              },
              hypervnetworklabel: {
                type: 'string',
                description: 'Hyper-V network label (optional)'
              },
              vlan: {
                type: 'string',
                description: 'VLAN ID (optional)'
              }
            },
            required: ['physicalnetworkid', 'traffictype']
          }
        },
        {
          name: 'delete_traffic_type',
          description: 'Delete a traffic type from a physical network',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Traffic type ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'update_traffic_type',
          description: 'Update a traffic type',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Traffic type ID'
              },
              kvmnetworklabel: {
                type: 'string',
                description: 'KVM network label'
              },
              vmwarenetworklabel: {
                type: 'string',
                description: 'VMware network label'
              },
              xennetworklabel: {
                type: 'string',
                description: 'XenServer network label'
              },
              hypervnetworklabel: {
                type: 'string',
                description: 'Hyper-V network label'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_traffic_types',
          description: 'List traffic types',
          inputSchema: {
            type: 'object',
            properties: {
              physicalnetworkid: {
                type: 'string',
                description: 'Physical network ID'
              },
              keyword: {
                type: 'string',
                description: 'Search keyword'
              },
              page: {
                type: 'number',
                description: 'Page number for pagination'
              },
              pagesize: {
                type: 'number',
                description: 'Number of items per page'
              }
            }
          }
        },
        {
          name: 'generate_usage_records',
          description: 'Generate usage records for billing',
          inputSchema: {
            type: 'object',
            properties: {
              startdate: {
                type: 'string',
                description: 'Start date (YYYY-MM-DD)'
              },
              enddate: {
                type: 'string',
                description: 'End date (YYYY-MM-DD)'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID (optional)'
              }
            },
            required: ['startdate', 'enddate']
          }
        },
        {
          name: 'list_usage_records',
          description: 'List usage records',
          inputSchema: {
            type: 'object',
            properties: {
              startdate: {
                type: 'string',
                description: 'Start date (YYYY-MM-DD)'
              },
              enddate: {
                type: 'string',
                description: 'End date (YYYY-MM-DD)'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              projectid: {
                type: 'string',
                description: 'Project ID'
              },
              type: {
                type: 'string',
                description: 'Usage type'
              },
              page: {
                type: 'number',
                description: 'Page number for pagination'
              },
              pagesize: {
                type: 'number',
                description: 'Number of items per page'
              }
            },
            required: ['startdate', 'enddate']
          }
        },
        {
          name: 'delete_network',
          description: 'Delete a network',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Network ID to delete'
              },
              forced: {
                type: 'boolean',
                description: 'Force delete the network'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'update_network',
          description: 'Update network properties',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Network ID to update'
              },
              name: {
                type: 'string',
                description: 'New network name (optional)'
              },
              displaytext: {
                type: 'string',
                description: 'New display text (optional)'
              },
              networkdomain: {
                type: 'string',
                description: 'Network domain (optional)'
              },
              changecidr: {
                type: 'boolean',
                description: 'Change CIDR (optional)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'restart_network',
          description: 'Restart network with cleanup',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Network ID to restart'
              },
              cleanup: {
                type: 'boolean',
                description: 'Cleanup network (default: false)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_network_offerings',
          description: 'List available network offerings',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Network offering name filter'
              },
              state: {
                type: 'string',
                description: 'Network offering state (Enabled, Disabled)'
              },
              availability: {
                type: 'string',
                description: 'Availability (Optional, Required)'
              },
              isdefault: {
                type: 'boolean',
                description: 'Show only default offerings'
              }
            }
          }
        },
        {
          name: 'associate_ip_address',
          description: 'Associate a public IP address',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: {
                type: 'string',
                description: 'Zone ID for IP association'
              },
              networkid: {
                type: 'string',
                description: 'Network ID (optional)'
              },
              account: {
                type: 'string',
                description: 'Account name (optional)'
              },
              isportable: {
                type: 'boolean',
                description: 'Make IP portable (optional)'
              }
            },
            required: ['zoneid']
          }
        },
        {
          name: 'disassociate_ip_address',
          description: 'Disassociate a public IP address',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Public IP address ID to disassociate'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_public_ip_addresses',
          description: 'List public IP addresses',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name filter'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID filter'
              },
              associatednetworkid: {
                type: 'string',
                description: 'Associated network ID filter'
              },
              isstaticnat: {
                type: 'boolean',
                description: 'Filter by static NAT enabled'
              }
            }
          }
        },
        {
          name: 'enable_static_nat',
          description: 'Enable static NAT for IP address',
          inputSchema: {
            type: 'object',
            properties: {
              ipaddressid: {
                type: 'string',
                description: 'Public IP address ID'
              },
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID for static NAT'
              },
              networkid: {
                type: 'string',
                description: 'Network ID (optional)'
              }
            },
            required: ['ipaddressid', 'virtualmachineid']
          }
        },
        {
          name: 'disable_static_nat',
          description: 'Disable static NAT for IP address',
          inputSchema: {
            type: 'object',
            properties: {
              ipaddressid: {
                type: 'string',
                description: 'Public IP address ID'
              }
            },
            required: ['ipaddressid']
          }
        },
        {
          name: 'create_port_forwarding_rule',
          description: 'Create port forwarding rule',
          inputSchema: {
            type: 'object',
            properties: {
              ipaddressid: {
                type: 'string',
                description: 'Public IP address ID'
              },
              protocol: {
                type: 'string',
                description: 'Protocol (TCP, UDP)'
              },
              publicport: {
                type: 'number',
                description: 'Public port number'
              },
              privateport: {
                type: 'number',
                description: 'Private port number'
              },
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              publicendport: {
                type: 'number',
                description: 'Public end port (for range)'
              },
              privateendport: {
                type: 'number',
                description: 'Private end port (for range)'
              }
            },
            required: ['ipaddressid', 'protocol', 'publicport', 'privateport', 'virtualmachineid']
          }
        },
        {
          name: 'delete_port_forwarding_rule',
          description: 'Delete port forwarding rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Port forwarding rule ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_port_forwarding_rules',
          description: 'List port forwarding rules',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name filter'
              },
              ipaddressid: {
                type: 'string',
                description: 'IP address ID filter'
              },
              networkid: {
                type: 'string',
                description: 'Network ID filter'
              }
            }
          }
        },
        {
          name: 'create_security_group',
          description: 'Create a security group',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name for the security group'
              },
              description: {
                type: 'string',
                description: 'Description for the security group'
              },
              account: {
                type: 'string',
                description: 'Account name (optional)'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'delete_security_group',
          description: 'Delete a security group',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Security group ID to delete'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'authorize_security_group_ingress',
          description: 'Add ingress rule to security group',
          inputSchema: {
            type: 'object',
            properties: {
              securitygroupid: {
                type: 'string',
                description: 'Security group ID'
              },
              protocol: {
                type: 'string',
                description: 'Protocol (TCP, UDP, ICMP)'
              },
              startport: {
                type: 'number',
                description: 'Start port'
              },
              endport: {
                type: 'number',
                description: 'End port'
              },
              cidrlist: {
                type: 'string',
                description: 'CIDR list (comma-separated)'
              }
            },
            required: ['securitygroupid', 'protocol']
          }
        },
        {
          name: 'revoke_security_group_ingress',
          description: 'Remove ingress rule from security group',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Rule ID to revoke'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_security_groups',
          description: 'List security groups',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name to filter security groups'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID to filter security groups'
              },
              securitygroupname: {
                type: 'string',
                description: 'Security group name'
              },
              tags: {
                type: 'string',
                description: 'List security groups by tags'
              }
            }
          }
        },
        {
          name: 'authorize_security_group_egress',
          description: 'Add egress rule to security group',
          inputSchema: {
            type: 'object',
            properties: {
              securitygroupid: {
                type: 'string',
                description: 'Security group ID'
              },
              protocol: {
                type: 'string',
                description: 'Protocol (TCP, UDP, ICMP)'
              },
              startport: {
                type: 'number',
                description: 'Start port'
              },
              endport: {
                type: 'number',
                description: 'End port'
              },
              cidrlist: {
                type: 'string',
                description: 'CIDR list (comma-separated)'
              }
            },
            required: ['securitygroupid', 'protocol']
          }
        },
        {
          name: 'revoke_security_group_egress',
          description: 'Remove egress rule from security group',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Rule ID to revoke'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_load_balancer_rule',
          description: 'Create a load balancer rule',
          inputSchema: {
            type: 'object',
            properties: {
              publicipid: {
                type: 'string',
                description: 'Public IP ID for the load balancer'
              },
              algorithm: {
                type: 'string',
                description: 'Load balancing algorithm (roundrobin, leastconn, source)'
              },
              name: {
                type: 'string',
                description: 'Name for the load balancer rule'
              },
              privateport: {
                type: 'number',
                description: 'Private port of the virtual machine'
              },
              publicport: {
                type: 'number',
                description: 'Public port'
              },
              protocol: {
                type: 'string',
                description: 'Protocol (TCP, UDP)'
              }
            },
            required: ['publicipid', 'algorithm', 'name', 'privateport', 'publicport']
          }
        },
        {
          name: 'delete_load_balancer_rule',
          description: 'Delete a load balancer rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Load balancer rule ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_load_balancer_rules',
          description: 'List load balancer rules',
          inputSchema: {
            type: 'object',
            properties: {
              publicipid: {
                type: 'string',
                description: 'Public IP ID to filter rules'
              },
              account: {
                type: 'string',
                description: 'Account name to filter rules'
              },
              name: {
                type: 'string',
                description: 'Load balancer rule name'
              }
            }
          }
        },
        {
          name: 'assign_to_load_balancer_rule',
          description: 'Assign virtual machines to load balancer rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Load balancer rule ID'
              },
              virtualmachineids: {
                type: 'string',
                description: 'Comma-separated list of virtual machine IDs'
              }
            },
            required: ['id', 'virtualmachineids']
          }
        },
        {
          name: 'remove_from_load_balancer_rule',
          description: 'Remove virtual machines from load balancer rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Load balancer rule ID'
              },
              virtualmachineids: {
                type: 'string',
                description: 'Comma-separated list of virtual machine IDs'
              }
            },
            required: ['id', 'virtualmachineids']
          }
        },
        {
          name: 'update_load_balancer_rule',
          description: 'Update a load balancer rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Load balancer rule ID'
              },
              algorithm: {
                type: 'string',
                description: 'Load balancing algorithm'
              },
              name: {
                type: 'string',
                description: 'New name for the rule'
              },
              description: {
                type: 'string',
                description: 'Description for the rule'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_lb_health_check_policy',
          description: 'Create load balancer health check policy',
          inputSchema: {
            type: 'object',
            properties: {
              lbruleid: {
                type: 'string',
                description: 'Load balancer rule ID'
              },
              healthcheckpolicy: {
                type: 'string',
                description: 'Health check policy parameters'
              }
            },
            required: ['lbruleid', 'healthcheckpolicy']
          }
        },
        {
          name: 'delete_lb_health_check_policy',
          description: 'Delete load balancer health check policy',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Health check policy ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_lb_stickiness_policy',
          description: 'Create load balancer stickiness policy',
          inputSchema: {
            type: 'object',
            properties: {
              lbruleid: {
                type: 'string',
                description: 'Load balancer rule ID'
              },
              methodname: {
                type: 'string',
                description: 'Stickiness method (LbCookie, AppCookie, SourceBased)'
              },
              name: {
                type: 'string',
                description: 'Policy name'
              }
            },
            required: ['lbruleid', 'methodname', 'name']
          }
        },
        {
          name: 'delete_lb_stickiness_policy',
          description: 'Delete load balancer stickiness policy',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Stickiness policy ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'upload_ssl_cert',
          description: 'Upload SSL certificate',
          inputSchema: {
            type: 'object',
            properties: {
              certificate: {
                type: 'string',
                description: 'SSL certificate content'
              },
              privatekey: {
                type: 'string',
                description: 'Private key content'
              },
              certchain: {
                type: 'string',
                description: 'Certificate chain (optional)'
              },
              name: {
                type: 'string',
                description: 'Certificate name'
              }
            },
            required: ['certificate', 'privatekey', 'name']
          }
        },
        {
          name: 'delete_ssl_cert',
          description: 'Delete SSL certificate',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'SSL certificate ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_ssl_certs',
          description: 'List SSL certificates',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name to filter certificates'
              }
            }
          }
        },
        // Load Balancer Enhancement - Missing APIs
        {
          name: 'list_lb_health_check_policies',
          description: 'List load balancer health check policies',
          inputSchema: {
            type: 'object',
            properties: {
              lbruleid: { type: 'string', description: 'Load balancer rule ID' },
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' }
            }
          }
        },
        {
          name: 'update_lb_health_check_policy',
          description: 'Update load balancer health check policy',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Health check policy ID' },
              pingpath: { type: 'string', description: 'Health check ping path' },
              healthythreshold: { type: 'number', description: 'Healthy threshold' },
              intervaltime: { type: 'number', description: 'Interval time' },
              responsetimeout: { type: 'number', description: 'Response timeout' },
              unhealthythreshold: { type: 'number', description: 'Unhealthy threshold' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_lb_stickiness_policies',
          description: 'List load balancer stickiness policies',
          inputSchema: {
            type: 'object',
            properties: {
              lbruleid: { type: 'string', description: 'Load balancer rule ID' },
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' }
            }
          }
        },
        {
          name: 'update_lb_stickiness_policy',
          description: 'Update load balancer stickiness policy',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Stickiness policy ID' },
              name: { type: 'string', description: 'Policy name' },
              methodname: { type: 'string', description: 'Stickiness method' },
              params: { type: 'string', description: 'Policy parameters' }
            },
            required: ['id']
          }
        },
        {
          name: 'create_application_load_balancer',
          description: 'Create application load balancer',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Load balancer name' },
              sourceipaddressnetworkid: { type: 'string', description: 'Source IP address network ID' },
              scheme: { type: 'string', description: 'Load balancer scheme (Internal/Internet-facing)' },
              sourceipaddress: { type: 'string', description: 'Source IP address' },
              description: { type: 'string', description: 'Load balancer description' }
            },
            required: ['name', 'sourceipaddressnetworkid']
          }
        },
        {
          name: 'delete_application_load_balancer',
          description: 'Delete application load balancer',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Application load balancer ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_application_load_balancers',
          description: 'List application load balancers',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              name: { type: 'string', description: 'Load balancer name' },
              networkid: { type: 'string', description: 'Network ID' }
            }
          }
        },
        {
          name: 'configure_application_load_balancer',
          description: 'Configure application load balancer',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Application load balancer ID' },
              algorithm: { type: 'string', description: 'Load balancing algorithm' },
              description: { type: 'string', description: 'Load balancer description' },
              name: { type: 'string', description: 'Load balancer name' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_application_load_balancer',
          description: 'Update application load balancer',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Application load balancer ID' },
              algorithm: { type: 'string', description: 'Load balancing algorithm' },
              description: { type: 'string', description: 'Load balancer description' },
              name: { type: 'string', description: 'Load balancer name' },
              customid: { type: 'string', description: 'Custom ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'create_global_load_balancer',
          description: 'Create global load balancer rule',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Global load balancer name' },
              gslbdomainname: { type: 'string', description: 'GSLB domain name' },
              gslbservicetype: { type: 'string', description: 'GSLB service type (TCP/UDP/HTTP)' },
              regionid: { type: 'string', description: 'Region ID' },
              description: { type: 'string', description: 'Description' }
            },
            required: ['name', 'gslbdomainname', 'gslbservicetype', 'regionid']
          }
        },
        {
          name: 'delete_global_load_balancer',
          description: 'Delete global load balancer rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Global load balancer ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_global_load_balancers',
          description: 'List global load balancer rules',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              regionid: { type: 'string', description: 'Region ID' }
            }
          }
        },
        {
          name: 'update_global_load_balancer',
          description: 'Update global load balancer rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Global load balancer ID' },
              description: { type: 'string', description: 'Description' },
              gslbdomainname: { type: 'string', description: 'GSLB domain name' },
              gslbservicetype: { type: 'string', description: 'GSLB service type' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_ssl_cert',
          description: 'Update SSL certificate',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'SSL certificate ID' },
              certificate: { type: 'string', description: 'Updated certificate content' },
              privatekey: { type: 'string', description: 'Updated private key' },
              certchain: { type: 'string', description: 'Updated certificate chain' }
            },
            required: ['id']
          }
        },
        {
          name: 'assign_ssl_cert_to_application_load_balancer',
          description: 'Assign SSL certificate to application load balancer',
          inputSchema: {
            type: 'object',
            properties: {
              lbruleid: { type: 'string', description: 'Load balancer rule ID' },
              certid: { type: 'string', description: 'SSL certificate ID' }
            },
            required: ['lbruleid', 'certid']
          }
        },
        {
          name: 'list_load_balancer_certificates',
          description: 'List load balancer SSL certificates',
          inputSchema: {
            type: 'object',
            properties: {
              lbruleid: { type: 'string', description: 'Load balancer rule ID' },
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' }
            }
          }
        },
        {
          name: 'list_load_balancer_metrics',
          description: 'List load balancer performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              lbruleid: { type: 'string', description: 'Load balancer rule ID' },
              startdate: { type: 'string', description: 'Start date for metrics' },
              enddate: { type: 'string', description: 'End date for metrics' }
            }
          }
        },
        {
          name: 'get_load_balancer_health',
          description: 'Get load balancer health status',
          inputSchema: {
            type: 'object',
            properties: {
              lbruleid: { type: 'string', description: 'Load balancer rule ID' }
            },
            required: ['lbruleid']
          }
        },
        {
          name: 'reset_load_balancer_rule',
          description: 'Reset load balancer rule statistics',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Load balancer rule ID' }
            },
            required: ['id']
          }
        },
        // Administrative Enhancement - Account Management Tools
        {
          name: 'quota_statement',
          description: 'Generate detailed billing statements for account',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              startdate: { type: 'string', description: 'Start date for statement' },
              enddate: { type: 'string', description: 'End date for statement' }
            },
            required: ['account']
          }
        },
        {
          name: 'quota_credits',
          description: 'Manage account credit allocations',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              credits: { type: 'number', description: 'Credit amount' },
              operation: { type: 'string', description: 'Operation: add, subtract, set' }
            },
            required: ['account', 'credits', 'operation']
          }
        },
        {
          name: 'quota_update',
          description: 'Update account quota settings',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              quota: { type: 'number', description: 'New quota amount' },
              quotatype: { type: 'string', description: 'Type of quota' }
            },
            required: ['account', 'quota']
          }
        },
        {
          name: 'quota_summary',
          description: 'Get account resource usage summary',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              startdate: { type: 'string', description: 'Start date' },
              enddate: { type: 'string', description: 'End date' }
            }
          }
        },
        {
          name: 'quota_balance',
          description: 'Check current quota balance for account',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' }
            },
            required: ['account']
          }
        },
        {
          name: 'transfer_account',
          description: 'Transfer account ownership to different domain',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Source domain ID' },
              newdomainid: { type: 'string', description: 'Target domain ID' }
            },
            required: ['account', 'domainid', 'newdomainid']
          }
        },
        {
          name: 'list_account_types',
          description: 'List available account types',
          inputSchema: {
            type: 'object',
            properties: {
              listall: { type: 'boolean', description: 'List all account types' }
            }
          }
        },
        {
          name: 'get_account_billing',
          description: 'Retrieve detailed billing data for account',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              startdate: { type: 'string', description: 'Start date' },
              enddate: { type: 'string', description: 'End date' }
            },
            required: ['account']
          }
        },
        {
          name: 'generate_account_usage_report',
          description: 'Generate usage analytics report for account',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              reporttype: { type: 'string', description: 'Type of report' },
              startdate: { type: 'string', description: 'Start date' },
              enddate: { type: 'string', description: 'End date' }
            },
            required: ['account', 'reporttype']
          }
        },
        {
          name: 'validate_account_limits',
          description: 'Validate resource limit compliance for account',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              resourcetype: { type: 'string', description: 'Resource type to validate' }
            },
            required: ['account']
          }
        },
        // User Management Enhancement Tools
        {
          name: 'reset_user_password',
          description: 'Admin password reset capability for users',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'User ID' },
              password: { type: 'string', description: 'New password' }
            },
            required: ['id', 'password']
          }
        },
        {
          name: 'get_user_login_history',
          description: 'Track user login activities and history',
          inputSchema: {
            type: 'object',
            properties: {
              userid: { type: 'string', description: 'User ID' },
              account: { type: 'string', description: 'Account name' },
              startdate: { type: 'string', description: 'Start date' },
              enddate: { type: 'string', description: 'End date' }
            },
            required: ['userid']
          }
        },
        {
          name: 'enable_2fa',
          description: 'Enable two-factor authentication for user',
          inputSchema: {
            type: 'object',
            properties: {
              userid: { type: 'string', description: 'User ID' },
              provider: { type: 'string', description: '2FA provider (totp, sms)' }
            },
            required: ['userid', 'provider']
          }
        },
        {
          name: 'disable_2fa',
          description: 'Disable two-factor authentication for user',
          inputSchema: {
            type: 'object',
            properties: {
              userid: { type: 'string', description: 'User ID' }
            },
            required: ['userid']
          }
        },
        {
          name: 'validate_user_permissions',
          description: 'Check user permission status and validate access',
          inputSchema: {
            type: 'object',
            properties: {
              userid: { type: 'string', description: 'User ID' },
              resource: { type: 'string', description: 'Resource to check access for' },
              operation: { type: 'string', description: 'Operation to validate' }
            },
            required: ['userid', 'resource']
          }
        },
        {
          name: 'get_user_audit_trail',
          description: 'Get user activity audit logs and history',
          inputSchema: {
            type: 'object',
            properties: {
              userid: { type: 'string', description: 'User ID' },
              account: { type: 'string', description: 'Account name' },
              startdate: { type: 'string', description: 'Start date' },
              enddate: { type: 'string', description: 'End date' }
            },
            required: ['userid']
          }
        },
        {
          name: 'list_user_sessions',
          description: 'List active user sessions',
          inputSchema: {
            type: 'object',
            properties: {
              userid: { type: 'string', description: 'User ID' },
              account: { type: 'string', description: 'Account name' }
            }
          }
        },
        {
          name: 'invalidate_user_session',
          description: 'Terminate user sessions',
          inputSchema: {
            type: 'object',
            properties: {
              sessionid: { type: 'string', description: 'Session ID to terminate' },
              userid: { type: 'string', description: 'User ID' }
            },
            required: ['sessionid']
          }
        },
        {
          name: 'set_user_security_policy',
          description: 'Configure user security settings and policies',
          inputSchema: {
            type: 'object',
            properties: {
              userid: { type: 'string', description: 'User ID' },
              policy: { type: 'string', description: 'Security policy configuration' },
              value: { type: 'string', description: 'Policy value' }
            },
            required: ['userid', 'policy']
          }
        },
        {
          name: 'create_firewall_rule',
          description: 'Create firewall rule',
          inputSchema: {
            type: 'object',
            properties: {
              ipaddressid: {
                type: 'string',
                description: 'IP address ID'
              },
              protocol: {
                type: 'string',
                description: 'Protocol (TCP, UDP, ICMP)'
              },
              startport: {
                type: 'number',
                description: 'Start port'
              },
              endport: {
                type: 'number',
                description: 'End port'
              },
              cidrlist: {
                type: 'string',
                description: 'CIDR list (comma-separated)'
              }
            },
            required: ['ipaddressid', 'protocol']
          }
        },
        {
          name: 'delete_firewall_rule',
          description: 'Delete firewall rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Firewall rule ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_firewall_rules',
          description: 'List firewall rules',
          inputSchema: {
            type: 'object',
            properties: {
              ipaddressid: {
                type: 'string',
                description: 'IP address ID to filter rules'
              },
              account: {
                type: 'string',
                description: 'Account name to filter rules'
              }
            }
          }
        },
        {
          name: 'create_network_acl',
          description: 'Create network ACL rule',
          inputSchema: {
            type: 'object',
            properties: {
              aclid: {
                type: 'string',
                description: 'ACL list ID'
              },
              protocol: {
                type: 'string',
                description: 'Protocol (TCP, UDP, ICMP, ALL)'
              },
              startport: {
                type: 'number',
                description: 'Start port'
              },
              endport: {
                type: 'number',
                description: 'End port'
              },
              cidrlist: {
                type: 'string',
                description: 'CIDR list (comma-separated)'
              },
              traffictype: {
                type: 'string',
                description: 'Traffic type (Ingress, Egress)'
              },
              action: {
                type: 'string',
                description: 'Action (Allow, Deny)'
              }
            },
            required: ['aclid', 'protocol', 'traffictype', 'action']
          }
        },
        {
          name: 'delete_network_acl',
          description: 'Delete network ACL rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ACL rule ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_network_acls',
          description: 'List network ACL rules',
          inputSchema: {
            type: 'object',
            properties: {
              aclid: {
                type: 'string',
                description: 'ACL list ID to filter rules'
              },
              networkid: {
                type: 'string',
                description: 'Network ID to filter rules'
              }
            }
          }
        },
        {
          name: 'update_network_acl_item',
          description: 'Update a Network ACL rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ACL rule ID'
              },
              action: {
                type: 'string',
                description: 'Action (allow/deny)'
              },
              cidrlist: {
                type: 'string',
                description: 'CIDR list for the rule'
              },
              endport: {
                type: 'number',
                description: 'End port for the rule'
              },
              startport: {
                type: 'number',
                description: 'Start port for the rule'
              },
              protocol: {
                type: 'string',
                description: 'Protocol (TCP/UDP/ICMP)'
              },
              number: {
                type: 'number',
                description: 'Rule number for ordering'
              },
              reason: {
                type: 'string',
                description: 'Reason for the rule'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'restore_virtual_machine',
          description: 'Restore a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID to restore'
              }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'assign_virtual_machine',
          description: 'Assign virtual machine to account',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID to assign'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              }
            },
            required: ['virtualmachineid', 'account']
          }
        },
        {
          name: 'update_default_nic_for_vm',
          description: 'Update default NIC for virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              nicid: {
                type: 'string',
                description: 'NIC ID to set as default'
              }
            },
            required: ['virtualmachineid', 'nicid']
          }
        },
        {
          name: 'add_resource_detail',
          description: 'Add resource detail to virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              resourceid: {
                type: 'string',
                description: 'Resource ID (VM ID)'
              },
              resourcetype: {
                type: 'string',
                description: 'Resource type (UserVm)'
              },
              details: {
                type: 'string',
                description: 'Details as key=value pairs'
              }
            },
            required: ['resourceid', 'resourcetype', 'details']
          }
        },
        {
          name: 'remove_resource_detail',
          description: 'Remove resource detail from virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              resourceid: {
                type: 'string',
                description: 'Resource ID (VM ID)'
              },
              resourcetype: {
                type: 'string',
                description: 'Resource type (UserVm)'
              },
              key: {
                type: 'string',
                description: 'Detail key to remove'
              }
            },
            required: ['resourceid', 'resourcetype', 'key']
          }
        },
        {
          name: 'list_resource_details',
          description: 'List resource details for virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              resourceid: {
                type: 'string',
                description: 'Resource ID (VM ID)'
              },
              resourcetype: {
                type: 'string',
                description: 'Resource type (UserVm)'
              }
            },
            required: ['resourceid', 'resourcetype']
          }
        },
        {
          name: 'assign_vm_to_backup_offering',
          description: 'Assign virtual machine to backup offering',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              backupofferingid: {
                type: 'string',
                description: 'Backup offering ID'
              }
            },
            required: ['virtualmachineid', 'backupofferingid']
          }
        },
        {
          name: 'create_vm_schedule',
          description: 'Create virtual machine schedule',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              action: {
                type: 'string',
                description: 'Action to schedule (start, stop, reboot)'
              },
              schedule: {
                type: 'string',
                description: 'Schedule in cron format'
              },
              timezone: {
                type: 'string',
                description: 'Timezone for schedule'
              },
              description: {
                type: 'string',
                description: 'Schedule description'
              }
            },
            required: ['virtualmachineid', 'action', 'schedule']
          }
        },
        {
          name: 'delete_vm_schedule',
          description: 'Delete virtual machine schedule',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Schedule ID to delete'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_vm_schedule',
          description: 'List virtual machine schedules',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID filter'
              },
              account: {
                type: 'string',
                description: 'Account name filter'
              }
            }
          }
        },
        {
          name: 'get_vm_user_data',
          description: 'Get virtual machine user data',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'reset_vm_user_data',
          description: 'Reset virtual machine user data',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              userdata: {
                type: 'string',
                description: 'New user data (base64 encoded)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_vm_metrics',
          description: 'List virtual machine metrics',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'string',
                description: 'Comma-separated VM IDs'
              },
              account: {
                type: 'string',
                description: 'Account name filter'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID filter'
              }
            }
          }
        },
        {
          name: 'list_vm_usage_history',
          description: 'List virtual machine usage history',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              startdate: {
                type: 'string',
                description: 'Start date (YYYY-MM-DD)'
              },
              enddate: {
                type: 'string',
                description: 'End date (YYYY-MM-DD)'
              }
            }
          }
        },
        {
          name: 'migrate_vm_with_volume',
          description: 'Migrate virtual machine with volumes',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID to migrate'
              },
              hostid: {
                type: 'string',
                description: 'Destination host ID'
              },
              migrateto: {
                type: 'string',
                description: 'Storage pool mappings for volumes'
              }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'import_vm',
          description: 'Import virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'VM name'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              },
              hypervisor: {
                type: 'string',
                description: 'Hypervisor type'
              },
              templateid: {
                type: 'string',
                description: 'Template ID'
              },
              serviceofferingid: {
                type: 'string',
                description: 'Service offering ID'
              }
            },
            required: ['name', 'zoneid', 'hypervisor']
          }
        },
        {
          name: 'import_unmanaged_instance',
          description: 'Import unmanaged virtual machine instance',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Instance name'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              },
              clusterid: {
                type: 'string',
                description: 'Cluster ID'
              },
              hypervisor: {
                type: 'string',
                description: 'Hypervisor type'
              }
            },
            required: ['name', 'zoneid', 'clusterid', 'hypervisor']
          }
        },
        {
          name: 'clean_vm_reservations',
          description: 'Clean virtual machine reservations',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              }
            }
          }
        },
        {
          name: 'enable_vm_ha',
          description: 'Enable high availability for virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'disable_vm_ha',
          description: 'Disable high availability for virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_vm_snapshots',
          description: 'List virtual machine snapshots',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID filter'
              },
              account: {
                type: 'string',
                description: 'Account name filter'
              },
              name: {
                type: 'string',
                description: 'Snapshot name filter'
              }
            }
          }
        },
        {
          name: 'create_vm_snapshot',
          description: 'Create virtual machine snapshot',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              name: {
                type: 'string',
                description: 'Snapshot name'
              },
              description: {
                type: 'string',
                description: 'Snapshot description'
              },
              snapshotmemory: {
                type: 'boolean',
                description: 'Include memory in snapshot'
              }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'delete_vm_snapshot',
          description: 'Delete virtual machine snapshot',
          inputSchema: {
            type: 'object',
            properties: {
              vmsnapshotid: {
                type: 'string',
                description: 'VM snapshot ID to delete'
              }
            },
            required: ['vmsnapshotid']
          }
        },
        {
          name: 'revert_to_vm_snapshot',
          description: 'Revert virtual machine to snapshot',
          inputSchema: {
            type: 'object',
            properties: {
              vmsnapshotid: {
                type: 'string',
                description: 'VM snapshot ID to revert to'
              }
            },
            required: ['vmsnapshotid']
          }
        },
        {
          name: 'update_vm_snapshot',
          description: 'Update virtual machine snapshot',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VM snapshot ID'
              },
              name: {
                type: 'string',
                description: 'New snapshot name'
              },
              description: {
                type: 'string',
                description: 'New snapshot description'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'configure_virtual_machine',
          description: 'Configure virtual machine settings',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              cpunumber: {
                type: 'number',
                description: 'Number of CPU cores'
              },
              memory: {
                type: 'number',
                description: 'Memory in MB'
              },
              cpuspeed: {
                type: 'number',
                description: 'CPU speed in MHz'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'link_vm_to_backup',
          description: 'Link virtual machine to backup',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              backupid: {
                type: 'string',
                description: 'Backup ID'
              }
            },
            required: ['virtualmachineid', 'backupid']
          }
        },
        {
          name: 'unlink_vm_from_backup',
          description: 'Unlink virtual machine from backup',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'upgrade_virtual_machine',
          description: 'Upgrade virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              serviceofferingid: {
                type: 'string',
                description: 'New service offering ID'
              },
              customized: {
                type: 'boolean',
                description: 'Custom service offering'
              }
            },
            required: ['id', 'serviceofferingid']
          }
        },
        {
          name: 'find_hosts_for_migration',
          description: 'Find suitable hosts for VM migration',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID'
              }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'list_vm_affinity_groups',
          description: 'List virtual machine affinity groups',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: {
                type: 'string',
                description: 'Virtual machine ID filter'
              },
              account: {
                type: 'string',
                description: 'Account name filter'
              }
            }
          }
        },
        {
          name: 'update_vm_affinity_group',
          description: 'Update virtual machine affinity group',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID'
              },
              affinitygroupids: {
                type: 'string',
                description: 'Comma-separated affinity group IDs'
              },
              affinitygroupnames: {
                type: 'string',
                description: 'Comma-separated affinity group names'
              }
            },
            required: ['id']
          }
        },
        // Account Management Tools
        {
          name: 'create_account',
          description: 'Create a new CloudStack account',
          inputSchema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'User email address'
              },
              firstname: {
                type: 'string',
                description: 'User first name'
              },
              lastname: {
                type: 'string',
                description: 'User last name'
              },
              password: {
                type: 'string',
                description: 'User password'
              },
              username: {
                type: 'string',
                description: 'Unique username'
              },
              account: {
                type: 'string',
                description: 'Account name (optional)'
              },
              accounttype: {
                type: 'number',
                description: 'Account type (0=user, 1=admin, 2=domain-admin)'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID where account is created'
              },
              roleid: {
                type: 'string',
                description: 'Role ID to assign'
              }
            },
            required: ['email', 'firstname', 'lastname', 'password', 'username']
          }
        },
        {
          name: 'list_accounts',
          description: 'List CloudStack accounts',
          inputSchema: {
            type: 'object',
            properties: {
              accounttype: {
                type: 'number',
                description: 'Account type filter (0=user, 1=admin, 2=domain-admin)'
              },
              domainid: {
                type: 'string',
                description: 'List accounts in specific domain'
              },
              name: {
                type: 'string',
                description: 'Account name filter'
              },
              state: {
                type: 'string',
                description: 'Account state filter (enabled, disabled, locked)'
              },
              isrecursive: {
                type: 'boolean',
                description: 'List accounts recursively from parent domain'
              }
            }
          }
        },
        {
          name: 'update_account',
          description: 'Update account information',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Account ID'
              },
              newname: {
                type: 'string',
                description: 'New account name'
              },
              networkdomain: {
                type: 'string',
                description: 'Updated network domain'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_account',
          description: 'Delete a CloudStack account',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Account ID to delete'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'enable_account',
          description: 'Enable a disabled account',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              }
            },
            required: ['account', 'domainid']
          }
        },
        {
          name: 'disable_account',
          description: 'Disable an account',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              lock: {
                type: 'boolean',
                description: 'Lock the account'
              }
            },
            required: ['account', 'domainid', 'lock']
          }
        },
        {
          name: 'lock_account',
          description: 'Lock an account to prevent login',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              }
            },
            required: ['account', 'domainid']
          }
        },
        // Domain Management Tools
        {
          name: 'create_domain',
          description: 'Create a new domain',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Domain name'
              },
              parentdomainid: {
                type: 'string',
                description: 'Parent domain ID'
              },
              networkdomain: {
                type: 'string',
                description: 'Network domain'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'list_domains',
          description: 'List domains',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Domain ID'
              },
              name: {
                type: 'string',
                description: 'Domain name'
              },
              level: {
                type: 'number',
                description: 'Domain level'
              },
              isrecursive: {
                type: 'boolean',
                description: 'List subdomains recursively'
              }
            }
          }
        },
        {
          name: 'update_domain',
          description: 'Update domain information',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Domain ID'
              },
              name: {
                type: 'string',
                description: 'New domain name'
              },
              networkdomain: {
                type: 'string',
                description: 'Updated network domain'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_domain',
          description: 'Delete a domain',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Domain ID to delete'
              },
              cleanup: {
                type: 'boolean',
                description: 'Clean up domain resources'
              },
              force: {
                type: 'boolean',
                description: 'Force deletion even with existing resources'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_domain_children',
          description: 'List immediate children of a domain',
          inputSchema: {
            type: 'object',
            properties: {
              domainid: {
                type: 'string',
                description: 'Parent domain ID'
              },
              isrecursive: {
                type: 'boolean',
                description: 'List all descendants'
              },
              name: {
                type: 'string',
                description: 'Child domain name filter'
              }
            }
          }
        },
        // User Management Tools
        {
          name: 'create_user',
          description: 'Create a user for an existing account',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name where user is created'
              },
              email: {
                type: 'string',
                description: 'User email address'
              },
              firstname: {
                type: 'string',
                description: 'User first name'
              },
              lastname: {
                type: 'string',
                description: 'User last name'
              },
              password: {
                type: 'string',
                description: 'User password'
              },
              username: {
                type: 'string',
                description: 'Unique username'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              timezone: {
                type: 'string',
                description: 'User timezone'
              }
            },
            required: ['account', 'email', 'firstname', 'lastname', 'password', 'username']
          }
        },
        {
          name: 'list_users',
          description: 'List users',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'List users by account'
              },
              accounttype: {
                type: 'number',
                description: 'Filter by account type'
              },
              domainid: {
                type: 'string',
                description: 'List users in specific domain'
              },
              id: {
                type: 'string',
                description: 'List user by ID'
              },
              username: {
                type: 'string',
                description: 'List user by username'
              },
              state: {
                type: 'string',
                description: 'User state filter'
              }
            }
          }
        },
        {
          name: 'update_user',
          description: 'Update user information',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'User ID'
              },
              email: {
                type: 'string',
                description: 'Updated email'
              },
              firstname: {
                type: 'string',
                description: 'Updated first name'
              },
              lastname: {
                type: 'string',
                description: 'Updated last name'
              },
              password: {
                type: 'string',
                description: 'New password'
              },
              username: {
                type: 'string',
                description: 'New username'
              },
              timezone: {
                type: 'string',
                description: 'Updated timezone'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_user',
          description: 'Delete a user',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'User ID to delete'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'enable_user',
          description: 'Enable a previously disabled user',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'User ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'disable_user',
          description: 'Disable a user',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'User ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'lock_user',
          description: 'Lock a user account',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'User ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'register_user_keys',
          description: 'Register API key/secret key for a user',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'User ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'get_user',
          description: 'Get detailed information about a specific user',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'User ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'get_user_keys',
          description: 'Get API keys for a specific user',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'User ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'move_user',
          description: 'Move a user to a different account',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'User ID'
              },
              account: {
                type: 'string',
                description: 'Target account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID of the target account'
              }
            },
            required: ['id', 'account', 'domainid']
          }
        },
        // Resource Limits and Quotas Tools
        {
          name: 'list_resource_limits',
          description: 'List resource limits for accounts, domains, or projects',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'List limits for specific account'
              },
              domainid: {
                type: 'string',
                description: 'List limits for specific domain'
              },
              projectid: {
                type: 'string',
                description: 'List limits for project'
              },
              resourcetype: {
                type: 'number',
                description: 'Resource type (0-11)'
              },
              isrecursive: {
                type: 'boolean',
                description: 'List limits recursively'
              }
            }
          }
        },
        {
          name: 'update_resource_limit',
          description: 'Update resource limits for accounts or domains',
          inputSchema: {
            type: 'object',
            properties: {
              resourcetype: {
                type: 'number',
                description: 'Resource type (0-11)'
              },
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              projectid: {
                type: 'string',
                description: 'Project ID'
              },
              max: {
                type: 'number',
                description: 'Maximum limit (-1 for unlimited)'
              }
            },
            required: ['resourcetype']
          }
        },
        {
          name: 'update_resource_count',
          description: 'Recalculate and update resource usage counts',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              projectid: {
                type: 'string',
                description: 'Project ID'
              },
              resourcetype: {
                type: 'number',
                description: 'Specific resource type'
              }
            }
          }
        },
        // Role and Permission Management Tools
        {
          name: 'create_role',
          description: 'Create a new role with specified permissions',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Unique role name'
              },
              type: {
                type: 'string',
                description: 'Role type (Admin, ResourceAdmin, DomainAdmin, User)'
              },
              description: {
                type: 'string',
                description: 'Role description'
              }
            },
            required: ['name', 'type']
          }
        },
        {
          name: 'list_roles',
          description: 'List roles in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'List role by ID'
              },
              name: {
                type: 'string',
                description: 'List role by name'
              },
              type: {
                type: 'string',
                description: 'List roles by type'
              }
            }
          }
        },
        {
          name: 'update_role',
          description: 'Update role information',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Role ID'
              },
              name: {
                type: 'string',
                description: 'New role name'
              },
              type: {
                type: 'string',
                description: 'New role type'
              },
              description: {
                type: 'string',
                description: 'Updated description'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_role',
          description: 'Delete a role',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Role ID to delete'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'create_role_permission',
          description: 'Create permission rules for a role',
          inputSchema: {
            type: 'object',
            properties: {
              permission: {
                type: 'string',
                description: 'Permission type (allow/deny)'
              },
              roleid: {
                type: 'string',
                description: 'Role ID'
              },
              rule: {
                type: 'string',
                description: 'API rule or pattern'
              },
              description: {
                type: 'string',
                description: 'Permission description'
              }
            },
            required: ['permission', 'roleid', 'rule']
          }
        },
        {
          name: 'list_role_permissions',
          description: 'List permissions for a role',
          inputSchema: {
            type: 'object',
            properties: {
              roleid: {
                type: 'string',
                description: 'Role ID'
              }
            }
          }
        },
        // Project Management Tools
        {
          name: 'create_project',
          description: 'Create a new project for multi-tenancy',
          inputSchema: {
            type: 'object',
            properties: {
              displaytext: {
                type: 'string',
                description: 'Project display text'
              },
              name: {
                type: 'string',
                description: 'Project name'
              },
              account: {
                type: 'string',
                description: 'Project owner account'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              }
            },
            required: ['displaytext', 'name']
          }
        },
        {
          name: 'list_projects',
          description: 'List projects',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'List projects by account'
              },
              domainid: {
                type: 'string',
                description: 'List projects in domain'
              },
              id: {
                type: 'string',
                description: 'List project by ID'
              },
              name: {
                type: 'string',
                description: 'List project by name'
              },
              state: {
                type: 'string',
                description: 'Project state filter'
              },
              isrecursive: {
                type: 'boolean',
                description: 'List projects recursively'
              }
            }
          }
        },
        {
          name: 'update_project',
          description: 'Update project information',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Project ID'
              },
              displaytext: {
                type: 'string',
                description: 'Updated display text'
              },
              name: {
                type: 'string',
                description: 'Updated project name'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_project',
          description: 'Delete a project and its resources',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Project ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'activate_project',
          description: 'Activate a suspended project',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Project ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'suspend_project',
          description: 'Suspend a project',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Project ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'add_account_to_project',
          description: 'Add an account to a project',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              projectid: {
                type: 'string',
                description: 'Project ID'
              },
              email: {
                type: 'string',
                description: 'Account email'
              }
            },
            required: ['account', 'projectid']
          }
        },
        {
          name: 'delete_account_from_project',
          description: 'Remove an account from a project',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              projectid: {
                type: 'string',
                description: 'Project ID'
              }
            },
            required: ['account', 'projectid']
          }
        },
        {
          name: 'list_project_accounts',
          description: 'List accounts in a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectid: {
                type: 'string',
                description: 'Project ID'
              },
              role: {
                type: 'string',
                description: 'Filter by project role'
              }
            },
            required: ['projectid']
          }
        },
        // System Administration & Configuration Tools
        {
          name: 'list_configurations',
          description: 'List CloudStack global configurations',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Configuration category'
              },
              name: {
                type: 'string',
                description: 'Configuration name'
              },
              keyword: {
                type: 'string',
                description: 'Search keyword'
              }
            }
          }
        },
        {
          name: 'update_configuration',
          description: 'Update a CloudStack global configuration',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Configuration name'
              },
              value: {
                type: 'string',
                description: 'New configuration value'
              }
            },
            required: ['name', 'value']
          }
        },
        {
          name: 'list_capabilities',
          description: 'List CloudStack capabilities and features',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'list_alerts',
          description: 'List system alerts',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Alert ID'
              },
              type: {
                type: 'string',
                description: 'Alert type'
              },
              keyword: {
                type: 'string',
                description: 'Search keyword'
              }
            }
          }
        },
        {
          name: 'archive_alerts',
          description: 'Archive system alerts',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'string',
                description: 'Comma-separated alert IDs'
              },
              startdate: {
                type: 'string',
                description: 'Start date for archiving (yyyy-MM-dd)'
              },
              enddate: {
                type: 'string',
                description: 'End date for archiving (yyyy-MM-dd)'
              }
            }
          }
        },
        {
          name: 'delete_alerts',
          description: 'Delete system alerts',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'string',
                description: 'Comma-separated alert IDs'
              },
              startdate: {
                type: 'string',
                description: 'Start date for deletion (yyyy-MM-dd)'
              },
              enddate: {
                type: 'string',
                description: 'End date for deletion (yyyy-MM-dd)'
              }
            }
          }
        },
        {
          name: 'list_events',
          description: 'List system events',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              duration: {
                type: 'number',
                description: 'Duration in days'
              },
              level: {
                type: 'string',
                description: 'Event level (INFO, WARN, ERROR)'
              },
              type: {
                type: 'string',
                description: 'Event type'
              }
            }
          }
        },
        {
          name: 'list_system_vms',
          description: 'List system virtual machines',
          inputSchema: {
            type: 'object',
            properties: {
              hostid: {
                type: 'string',
                description: 'Host ID'
              },
              id: {
                type: 'string',
                description: 'System VM ID'
              },
              name: {
                type: 'string',
                description: 'System VM name'
              },
              podid: {
                type: 'string',
                description: 'Pod ID'
              },
              state: {
                type: 'string',
                description: 'System VM state'
              },
              systemvmtype: {
                type: 'string',
                description: 'System VM type (consoleproxy, secondarystoragevm)'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              }
            }
          }
        },
        {
          name: 'start_system_vm',
          description: 'Start a system virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'System VM ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'stop_system_vm',
          description: 'Stop a system virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'System VM ID'
              },
              forced: {
                type: 'boolean',
                description: 'Force stop the system VM'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'reboot_system_vm',
          description: 'Reboot a system virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'System VM ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_routers',
          description: 'List virtual routers',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              hostid: {
                type: 'string',
                description: 'Host ID'
              },
              id: {
                type: 'string',
                description: 'Router ID'
              },
              name: {
                type: 'string',
                description: 'Router name'
              },
              networkid: {
                type: 'string',
                description: 'Network ID'
              },
              state: {
                type: 'string',
                description: 'Router state'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              }
            }
          }
        },
        // Storage Pool Management Tools
        {
          name: 'list_storage_pools',
          description: 'List storage pools',
          inputSchema: {
            type: 'object',
            properties: {
              clusterid: {
                type: 'string',
                description: 'Cluster ID'
              },
              id: {
                type: 'string',
                description: 'Storage pool ID'
              },
              name: {
                type: 'string',
                description: 'Storage pool name'
              },
              path: {
                type: 'string',
                description: 'Storage pool path'
              },
              podid: {
                type: 'string',
                description: 'Pod ID'
              },
              scope: {
                type: 'string',
                description: 'Storage pool scope'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              }
            }
          }
        },
        {
          name: 'create_storage_pool',
          description: 'Create a new storage pool',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Storage pool name'
              },
              url: {
                type: 'string',
                description: 'Storage pool URL'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              },
              clusterid: {
                type: 'string',
                description: 'Cluster ID'
              },
              podid: {
                type: 'string',
                description: 'Pod ID'
              },
              scope: {
                type: 'string',
                description: 'Storage pool scope'
              },
              tags: {
                type: 'string',
                description: 'Storage tags'
              }
            },
            required: ['name', 'url', 'zoneid']
          }
        },
        {
          name: 'update_storage_pool',
          description: 'Update storage pool properties',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Storage pool ID'
              },
              tags: {
                type: 'string',
                description: 'Storage tags'
              },
              capacitybytes: {
                type: 'number',
                description: 'Storage capacity in bytes'
              },
              capacityiops: {
                type: 'number',
                description: 'Storage IOPS capacity'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_storage_pool',
          description: 'Delete a storage pool',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Storage pool ID'
              },
              forced: {
                type: 'boolean',
                description: 'Force deletion'
              }
            },
            required: ['id']
          }
        },
        // Monitoring & Usage Tools
        {
          name: 'list_usage_records',
          description: 'List usage records for billing',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              enddate: {
                type: 'string',
                description: 'End date (yyyy-MM-dd)'
              },
              startdate: {
                type: 'string',
                description: 'Start date (yyyy-MM-dd)'
              },
              type: {
                type: 'number',
                description: 'Usage type'
              }
            },
            required: ['enddate', 'startdate']
          }
        },
        {
          name: 'list_capacity',
          description: 'List system capacity information',
          inputSchema: {
            type: 'object',
            properties: {
              clusterid: {
                type: 'string',
                description: 'Cluster ID'
              },
              fetchlatest: {
                type: 'boolean',
                description: 'Fetch latest capacity data'
              },
              hostid: {
                type: 'string',
                description: 'Host ID'
              },
              podid: {
                type: 'string',
                description: 'Pod ID'
              },
              sortby: {
                type: 'string',
                description: 'Sort by field'
              },
              type: {
                type: 'number',
                description: 'Capacity type'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              }
            }
          }
        },
        {
          name: 'list_async_jobs',
          description: 'List asynchronous jobs',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'Account name'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              keyword: {
                type: 'string',
                description: 'Search keyword'
              },
              startdate: {
                type: 'string',
                description: 'Start date'
              }
            }
          }
        },
        {
          name: 'query_async_job_result',
          description: 'Query the result of an asynchronous job',
          inputSchema: {
            type: 'object',
            properties: {
              jobid: {
                type: 'string',
                description: 'Job ID'
              }
            },
            required: ['jobid']
          }
        },
        // Advanced Router Management
        {
          name: 'start_router',
          description: 'Start a virtual router',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Router ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'stop_router',
          description: 'Stop a virtual router',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Router ID' },
              forced: { type: 'boolean', description: 'Force stop the router' }
            },
            required: ['id']
          }
        },
        {
          name: 'reboot_router',
          description: 'Reboot a virtual router',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Router ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'destroy_router',
          description: 'Destroy a virtual router',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Router ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'change_service_for_router',
          description: 'Change service offering for a router',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Router ID' },
              serviceofferingid: { type: 'string', description: 'New service offering ID' }
            },
            required: ['id', 'serviceofferingid']
          }
        },
        {
          name: 'list_router_health',
          description: 'List router health status',
          inputSchema: {
            type: 'object',
            properties: {
              routerid: { type: 'string', description: 'Router ID' }
            }
          }
        },
        // VPC Static Routes
        {
          name: 'create_static_route',
          description: 'Create a static route for VPC',
          inputSchema: {
            type: 'object',
            properties: {
              cidr: { type: 'string', description: 'CIDR for the static route' },
              gatewayid: { type: 'string', description: 'Gateway ID' }
            },
            required: ['cidr', 'gatewayid']
          }
        },
        {
          name: 'delete_static_route',
          description: 'Delete a static route',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Static route ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_static_routes',
          description: 'List static routes',
          inputSchema: {
            type: 'object',
            properties: {
              gatewayid: { type: 'string', description: 'Gateway ID' },
              vpcid: { type: 'string', description: 'VPC ID' }
            }
          }
        },
        // Private Gateways
        {
          name: 'create_private_gateway',
          description: 'Create a private gateway for VPC',
          inputSchema: {
            type: 'object',
            properties: {
              gateway: { type: 'string', description: 'Gateway IP address' },
              ipaddress: { type: 'string', description: 'IP address for the gateway' },
              netmask: { type: 'string', description: 'Netmask for the gateway' },
              vlan: { type: 'string', description: 'VLAN for the gateway' },
              vpcid: { type: 'string', description: 'VPC ID' }
            },
            required: ['gateway', 'ipaddress', 'netmask', 'vlan', 'vpcid']
          }
        },
        {
          name: 'delete_private_gateway',
          description: 'Delete a private gateway',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Private gateway ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_private_gateways',
          description: 'List private gateways',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Private gateway ID' },
              ipaddress: { type: 'string', description: 'IP address' },
              vpcid: { type: 'string', description: 'VPC ID' }
            }
          }
        },
        // Remote Access VPN
        {
          name: 'create_remote_access_vpn',
          description: 'Create a remote access VPN',
          inputSchema: {
            type: 'object',
            properties: {
              publicipid: { type: 'string', description: 'Public IP address ID' },
              openfirewall: { type: 'boolean', description: 'Open firewall rule' }
            },
            required: ['publicipid']
          }
        },
        {
          name: 'delete_remote_access_vpn',
          description: 'Delete a remote access VPN',
          inputSchema: {
            type: 'object',
            properties: {
              publicipid: { type: 'string', description: 'Public IP address ID' }
            },
            required: ['publicipid']
          }
        },
        {
          name: 'list_remote_access_vpns',
          description: 'List remote access VPNs',
          inputSchema: {
            type: 'object',
            properties: {
              publicipid: { type: 'string', description: 'Public IP address ID' },
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' }
            }
          }
        },
        {
          name: 'add_vpn_user',
          description: 'Add a VPN user',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string', description: 'Username' },
              password: { type: 'string', description: 'Password' },
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' }
            },
            required: ['username', 'password']
          }
        },
        {
          name: 'remove_vpn_user',
          description: 'Remove a VPN user',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string', description: 'Username' },
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' }
            },
            required: ['username']
          }
        },
        {
          name: 'list_vpn_users',
          description: 'List VPN users',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              username: { type: 'string', description: 'Username' }
            }
          }
        },
        // Network Service Providers
        {
          name: 'list_network_service_providers',
          description: 'List network service providers',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Provider name' },
              physicalnetworkid: { type: 'string', description: 'Physical network ID' },
              state: { type: 'string', description: 'Provider state' }
            }
          }
        },
        {
          name: 'add_network_service_provider',
          description: 'Add a network service provider',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Provider name' },
              physicalnetworkid: { type: 'string', description: 'Physical network ID' },
              destinationphysicalnetworkid: { type: 'string', description: 'Destination physical network ID' },
              servicelist: { type: 'array', items: { type: 'string' }, description: 'List of services' }
            },
            required: ['name', 'physicalnetworkid']
          }
        },
        {
          name: 'delete_network_service_provider',
          description: 'Delete a network service provider',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Provider ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_network_service_provider',
          description: 'Update a network service provider',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Provider ID' },
              state: { type: 'string', description: 'Provider state (Enabled/Disabled)' },
              servicelist: { type: 'array', items: { type: 'string' }, description: 'List of services' }
            },
            required: ['id']
          }
        },
        // Egress Firewall Rules
        {
          name: 'create_egress_firewall_rule',
          description: 'Create an egress firewall rule',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              protocol: { type: 'string', description: 'Protocol (TCP, UDP, ICMP, ALL)' },
              startport: { type: 'number', description: 'Start port' },
              endport: { type: 'number', description: 'End port' },
              cidrlist: { type: 'string', description: 'CIDR list' },
              destcidrlist: { type: 'string', description: 'Destination CIDR list' },
              type: { type: 'string', description: 'Type (User or System)' }
            },
            required: ['networkid', 'protocol']
          }
        },
        {
          name: 'delete_egress_firewall_rule',
          description: 'Delete an egress firewall rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Egress firewall rule ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_egress_firewall_rules',
          description: 'List egress firewall rules',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              id: { type: 'string', description: 'Firewall rule ID' },
              ipaddressid: { type: 'string', description: 'IP address ID' }
            }
          }
        },
        // NIC Management
        {
          name: 'add_nic_to_virtual_machine',
          description: 'Add a NIC to a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'Virtual machine ID' },
              networkid: { type: 'string', description: 'Network ID' },
              ipaddress: { type: 'string', description: 'IP address for the NIC' },
              macaddress: { type: 'string', description: 'MAC address for the NIC' }
            },
            required: ['virtualmachineid', 'networkid']
          }
        },
        {
          name: 'remove_nic_from_virtual_machine',
          description: 'Remove a NIC from a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'Virtual machine ID' },
              nicid: { type: 'string', description: 'NIC ID' }
            },
            required: ['virtualmachineid', 'nicid']
          }
        },
        {
          name: 'update_default_nic_for_virtual_machine',
          description: 'Update the default NIC for a virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'Virtual machine ID' },
              nicid: { type: 'string', description: 'NIC ID to set as default' }
            },
            required: ['virtualmachineid', 'nicid']
          }
        },
        {
          name: 'list_nics',
          description: 'List NICs',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'Virtual machine ID' },
              nicid: { type: 'string', description: 'NIC ID' },
              networkid: { type: 'string', description: 'Network ID' }
            }
          }
        },
        // Network Device Management
        {
          name: 'list_network_device',
          description: 'List network devices',
          inputSchema: {
            type: 'object',
            properties: {
              networkdeviceparametertype: { type: 'string', description: 'Network device parameter type' },
              networkdevicetype: { type: 'string', description: 'Network device type' }
            }
          }
        },
        {
          name: 'add_network_device',
          description: 'Add a network device',
          inputSchema: {
            type: 'object',
            properties: {
              networkdeviceparameterlist: { type: 'object', description: 'Network device parameters' },
              networkdevicetype: { type: 'string', description: 'Network device type' }
            },
            required: ['networkdevicetype']
          }
        },
        {
          name: 'delete_network_device',
          description: 'Delete a network device',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Network device ID' }
            },
            required: ['id']
          }
        },
        // DHCP Management
        {
          name: 'list_dhcp_options',
          description: 'List DHCP options for a network',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              nicid: { type: 'string', description: 'NIC ID' }
            }
          }
        },
        {
          name: 'create_dhcp_option',
          description: 'Create a DHCP option',
          inputSchema: {
            type: 'object',
            properties: {
              dhcpoptionsnetworklist: { type: 'array', items: { type: 'object' }, description: 'DHCP options network list' },
              dhcpoptionsniclist: { type: 'array', items: { type: 'object' }, description: 'DHCP options NIC list' }
            }
          }
        },
        {
          name: 'delete_dhcp_option',
          description: 'Delete a DHCP option',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              nicid: { type: 'string', description: 'NIC ID' },
              dhcpoptionsnetworklist: { type: 'array', items: { type: 'object' }, description: 'DHCP options to remove' }
            }
          }
        },
        // Network Permissions
        {
          name: 'list_network_permissions',
          description: 'List network permissions',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' }
            },
            required: ['networkid']
          }
        },
        {
          name: 'reset_network_permissions',
          description: 'Reset network permissions',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              accounts: { type: 'string', description: 'Comma-separated list of accounts' },
              op: { type: 'string', description: 'Operation (add or remove)' }
            },
            required: ['networkid']
          }
        },
        // Advanced VPC Functions
        {
          name: 'replace_network_acl_list',
          description: 'Replace network ACL list on a private gateway',
          inputSchema: {
            type: 'object',
            properties: {
              aclid: { type: 'string', description: 'ACL ID' },
              gatewayid: { type: 'string', description: 'Private gateway ID' }
            },
            required: ['aclid', 'gatewayid']
          }
        },
        {
          name: 'move_network_acl_item',
          description: 'Move a network ACL item to a different position',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              previousaclruleid: { type: 'string', description: 'Previous ACL rule ID' },
              ruleorder: { type: 'string', description: 'Rule order' }
            },
            required: ['networkid']
          }
        },
        // IPv6 Firewall Management
        {
          name: 'create_ipv6_firewall_rule',
          description: 'Create IPv6 firewall rule for network',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              protocol: { type: 'string', description: 'Protocol (tcp/udp/icmp)' },
              startport: { type: 'number', description: 'Start port' },
              endport: { type: 'number', description: 'End port' },
              cidrlist: { type: 'string', description: 'IPv6 CIDR list' },
              traffictype: { type: 'string', description: 'Traffic type (ingress/egress)' }
            },
            required: ['networkid', 'protocol']
          }
        },
        {
          name: 'delete_ipv6_firewall_rule',
          description: 'Delete IPv6 firewall rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Firewall rule ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_ipv6_firewall_rule',
          description: 'Update IPv6 firewall rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Firewall rule ID' },
              protocol: { type: 'string', description: 'Protocol (tcp/udp/icmp)' },
              startport: { type: 'number', description: 'Start port' },
              endport: { type: 'number', description: 'End port' },
              cidrlist: { type: 'string', description: 'IPv6 CIDR list' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_ipv6_firewall_rules',
          description: 'List IPv6 firewall rules',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              ipaddressid: { type: 'string', description: 'IP address ID' },
              traffictype: { type: 'string', description: 'Traffic type filter' }
            }
          }
        },
        // Routing Firewall Management
        {
          name: 'create_routing_firewall_rule',
          description: 'Create IPv4 routing firewall rule',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              protocol: { type: 'string', description: 'Protocol (tcp/udp/icmp)' },
              startport: { type: 'number', description: 'Start port' },
              endport: { type: 'number', description: 'End port' },
              destinationcidrlist: { type: 'string', description: 'Destination CIDR list' },
              action: { type: 'string', description: 'Action (allow/deny)' }
            },
            required: ['networkid', 'protocol', 'action']
          }
        },
        {
          name: 'delete_routing_firewall_rule',
          description: 'Delete IPv4 routing firewall rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Routing firewall rule ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_routing_firewall_rule',
          description: 'Update IPv4 routing firewall rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Routing firewall rule ID' },
              protocol: { type: 'string', description: 'Protocol (tcp/udp/icmp)' },
              startport: { type: 'number', description: 'Start port' },
              endport: { type: 'number', description: 'End port' },
              destinationcidrlist: { type: 'string', description: 'Destination CIDR list' },
              action: { type: 'string', description: 'Action (allow/deny)' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_routing_firewall_rules',
          description: 'List IPv4 routing firewall rules',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Network ID' },
              action: { type: 'string', description: 'Action filter (allow/deny)' }
            }
          }
        },
        // BGP Peer Management
        {
          name: 'create_bgp_peer',
          description: 'Create BGP peer for dynamic routing',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: { type: 'string', description: 'Zone ID' },
              ip4address: { type: 'string', description: 'IPv4 address of BGP peer' },
              ip6address: { type: 'string', description: 'IPv6 address of BGP peer' },
              asnumber: { type: 'number', description: 'AS number' },
              password: { type: 'string', description: 'BGP password' }
            },
            required: ['zoneid', 'asnumber']
          }
        },
        {
          name: 'delete_bgp_peer',
          description: 'Delete BGP peer',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'BGP peer ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_bgp_peer',
          description: 'Update BGP peer configuration',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'BGP peer ID' },
              ip4address: { type: 'string', description: 'IPv4 address of BGP peer' },
              ip6address: { type: 'string', description: 'IPv6 address of BGP peer' },
              asnumber: { type: 'number', description: 'AS number' },
              password: { type: 'string', description: 'BGP password' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_bgp_peers',
          description: 'List BGP peers',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: { type: 'string', description: 'Zone ID' },
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' }
            }
          }
        },
        {
          name: 'dedicate_bgp_peer',
          description: 'Dedicate BGP peer to domain/account',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'BGP peer ID' },
              domainid: { type: 'string', description: 'Domain ID' },
              account: { type: 'string', description: 'Account name' }
            },
            required: ['id']
          }
        },
        {
          name: 'release_bgp_peer',
          description: 'Release dedicated BGP peer',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'BGP peer ID' }
            },
            required: ['id']
          }
        },
        // Advanced VPC Management
        {
          name: 'migrate_vpc',
          description: 'Migrate VPC to different zone',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPC ID' },
              zoneid: { type: 'string', description: 'Target zone ID' }
            },
            required: ['id', 'zoneid']
          }
        },
        // IPv4 Subnet Management
        {
          name: 'dedicate_ipv4_subnet_for_zone',
          description: 'Dedicate IPv4 subnet for zone to domain/account',
          inputSchema: {
            type: 'object',
            properties: {
              subnetid: { type: 'string', description: 'IPv4 subnet ID' },
              domainid: { type: 'string', description: 'Domain ID' },
              account: { type: 'string', description: 'Account name' }
            },
            required: ['subnetid']
          }
        },
        {
          name: 'release_ipv4_subnet_for_zone',
          description: 'Release dedicated IPv4 subnet for zone',
          inputSchema: {
            type: 'object',
            properties: {
              subnetid: { type: 'string', description: 'IPv4 subnet ID' }
            },
            required: ['subnetid']
          }
        },
        {
          name: 'create_ipv4_subnet_for_guest_network',
          description: 'Create IPv4 subnet for guest network',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Guest network ID' },
              subnet: { type: 'string', description: 'IPv4 subnet CIDR' },
              gateway: { type: 'string', description: 'Gateway IP address' },
              netmask: { type: 'string', description: 'Subnet netmask' }
            },
            required: ['networkid', 'subnet']
          }
        },
        {
          name: 'delete_ipv4_subnet_for_guest_network',
          description: 'Delete IPv4 subnet for guest network',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'IPv4 subnet ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_ipv4_subnets_for_guest_network',
          description: 'List IPv4 subnets for guest networks',
          inputSchema: {
            type: 'object',
            properties: {
              networkid: { type: 'string', description: 'Guest network ID' },
              zoneid: { type: 'string', description: 'Zone ID' }
            }
          }
        },
        // Enhanced Network ACL Management
        {
          name: 'update_network_acl',
          description: 'Update network ACL rule',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Network ACL rule ID' },
              protocol: { type: 'string', description: 'Protocol (tcp/udp/icmp)' },
              startport: { type: 'number', description: 'Start port' },
              endport: { type: 'number', description: 'End port' },
              cidrlist: { type: 'string', description: 'CIDR list' },
              action: { type: 'string', description: 'Action (allow/deny)' }
            },
            required: ['id']
          }
        },
        // Network Tags
        {
          name: 'create_tags',
          description: 'Create tags for resources',
          inputSchema: {
            type: 'object',
            properties: {
              resourceids: { type: 'string', description: 'Comma-separated resource IDs' },
              resourcetype: { type: 'string', description: 'Resource type (Network, VirtualMachine, etc.)' },
              tags: { type: 'object', description: 'Key-value pairs for tags' }
            },
            required: ['resourceids', 'resourcetype', 'tags']
          }
        },
        {
          name: 'delete_tags',
          description: 'Delete tags from resources',
          inputSchema: {
            type: 'object',
            properties: {
              resourceids: { type: 'string', description: 'Comma-separated resource IDs' },
              resourcetype: { type: 'string', description: 'Resource type' },
              tags: { type: 'object', description: 'Key-value pairs for tags to delete' }
            },
            required: ['resourceids', 'resourcetype']
          }
        },
        {
          name: 'list_tags',
          description: 'List tags',
          inputSchema: {
            type: 'object',
            properties: {
              resourceid: { type: 'string', description: 'Resource ID' },
              resourcetype: { type: 'string', description: 'Resource type' },
              account: { type: 'string', description: 'Account name' },
              key: { type: 'string', description: 'Tag key' },
              value: { type: 'string', description: 'Tag value' }
            }
          }
        },
        // Site-to-Site VPN for VPC
        {
          name: 'create_vpn_gateway',
          description: 'Create a VPN gateway for VPC',
          inputSchema: {
            type: 'object',
            properties: {
              vpcid: { type: 'string', description: 'VPC ID' }
            },
            required: ['vpcid']
          }
        },
        {
          name: 'delete_vpn_gateway',
          description: 'Delete a VPN gateway',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN gateway ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_vpn_gateways',
          description: 'List VPN gateways',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN gateway ID' },
              vpcid: { type: 'string', description: 'VPC ID' },
              account: { type: 'string', description: 'Account name' }
            }
          }
        },
        {
          name: 'create_vpn_customer_gateway',
          description: 'Create a VPN customer gateway',
          inputSchema: {
            type: 'object',
            properties: {
              cidrlist: { type: 'string', description: 'CIDR list' },
              esppolicy: { type: 'string', description: 'ESP policy' },
              gateway: { type: 'string', description: 'Gateway IP address' },
              ikepolicy: { type: 'string', description: 'IKE policy' },
              ipsecpsk: { type: 'string', description: 'IPsec pre-shared key' },
              name: { type: 'string', description: 'Customer gateway name' }
            },
            required: ['cidrlist', 'esppolicy', 'gateway', 'ikepolicy', 'ipsecpsk', 'name']
          }
        },
        {
          name: 'delete_vpn_customer_gateway',
          description: 'Delete a VPN customer gateway',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Customer gateway ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_vpn_customer_gateways',
          description: 'List VPN customer gateways',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Customer gateway ID' },
              account: { type: 'string', description: 'Account name' },
              keyword: { type: 'string', description: 'Keyword for searching' }
            }
          }
        },
        {
          name: 'update_vpn_customer_gateway',
          description: 'Update a VPN customer gateway',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Customer gateway ID' },
              cidrlist: { type: 'string', description: 'CIDR list' },
              esppolicy: { type: 'string', description: 'ESP policy' },
              gateway: { type: 'string', description: 'Gateway IP address' },
              ikepolicy: { type: 'string', description: 'IKE policy' },
              ipsecpsk: { type: 'string', description: 'IPsec pre-shared key' },
              name: { type: 'string', description: 'Customer gateway name' }
            },
            required: ['id']
          }
        },
        {
          name: 'create_vpn_connection',
          description: 'Create a VPN connection',
          inputSchema: {
            type: 'object',
            properties: {
              customergatewayid: { type: 'string', description: 'Customer gateway ID' },
              vpngatewayid: { type: 'string', description: 'VPN gateway ID' },
              passive: { type: 'boolean', description: 'Passive mode' }
            },
            required: ['customergatewayid', 'vpngatewayid']
          }
        },
        {
          name: 'delete_vpn_connection',
          description: 'Delete a VPN connection',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN connection ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_vpn_connections',
          description: 'List VPN connections',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN connection ID' },
              vpcid: { type: 'string', description: 'VPC ID' },
              account: { type: 'string', description: 'Account name' }
            }
          }
        },
        {
          name: 'reset_vpn_connection',
          description: 'Reset a VPN connection',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VPN connection ID' }
            },
            required: ['id']
          }
        },

        // VM Guest OS Management
        {
          name: 'update_vm_guest_os',
          description: 'Update virtual machine guest OS type',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VM ID' },
              ostypeid: { type: 'string', description: 'OS type ID' }
            },
            required: ['id', 'ostypeid']
          }
        },
        {
          name: 'list_guest_os_mapping',
          description: 'List guest OS mappings',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Mapping ID' },
              osversionid: { type: 'string', description: 'OS version ID' }
            }
          }
        },
        {
          name: 'add_guest_os_mapping',
          description: 'Add guest OS mapping',
          inputSchema: {
            type: 'object',
            properties: {
              hypervisor: { type: 'string', description: 'Hypervisor type' },
              hypervisorversion: { type: 'string', description: 'Hypervisor version' },
              osnameforhypervisor: { type: 'string', description: 'OS name for hypervisor' },
              ostypeid: { type: 'string', description: 'OS type ID' }
            },
            required: ['hypervisor', 'hypervisorversion', 'osnameforhypervisor', 'ostypeid']
          }
        },
        {
          name: 'remove_guest_os_mapping',
          description: 'Remove guest OS mapping',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Mapping ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_os_types',
          description: 'List supported OS types',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'OS type ID' },
              oscategoryid: { type: 'string', description: 'OS category ID' },
              description: { type: 'string', description: 'OS description' }
            }
          }
        },
        {
          name: 'list_os_categories',
          description: 'List OS categories',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Category ID' },
              name: { type: 'string', description: 'Category name' }
            }
          }
        },

        // VM Console & Remote Access
        {
          name: 'get_vm_console_url',
          description: 'Get virtual machine console URL',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'VM ID' }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'get_vm_vnc_url',
          description: 'Get virtual machine VNC console URL',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'VM ID' }
            },
            required: ['virtualmachineid']
          }
        },

        // VM Template & Cloning Operations
        {
          name: 'create_template_from_vm',
          description: 'Create template from virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'VM ID' },
              name: { type: 'string', description: 'Template name' },
              displaytext: { type: 'string', description: 'Template display text' },
              ostypeid: { type: 'string', description: 'OS type ID' },
              volumeid: { type: 'string', description: 'Volume ID' }
            },
            required: ['virtualmachineid', 'name', 'displaytext', 'ostypeid']
          }
        },
        {
          name: 'clone_virtual_machine',
          description: 'Clone virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'VM ID to clone' },
              name: { type: 'string', description: 'New VM name' },
              displayname: { type: 'string', description: 'New VM display name' }
            },
            required: ['virtualmachineid', 'name']
          }
        },
        {
          name: 'copy_virtual_machine',
          description: 'Copy virtual machine to another zone',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'VM ID to copy' },
              destzoneid: { type: 'string', description: 'Destination zone ID' }
            },
            required: ['virtualmachineid', 'destzoneid']
          }
        },

        // Advanced Volume Operations
        {
          name: 'assign_volume',
          description: 'Assign volume to different account',
          inputSchema: {
            type: 'object',
            properties: {
              volumeid: { type: 'string', description: 'Volume ID' },
              account: { type: 'string', description: 'Target account' },
              domainid: { type: 'string', description: 'Domain ID' }
            },
            required: ['volumeid', 'account']
          }
        },
        {
          name: 'check_volume',
          description: 'Check volume integrity',
          inputSchema: {
            type: 'object',
            properties: {
              volumeid: { type: 'string', description: 'Volume ID' }
            },
            required: ['volumeid']
          }
        },
        {
          name: 'update_volume',
          description: 'Update volume properties',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Volume ID' },
              name: { type: 'string', description: 'Volume name' },
              displayvolume: { type: 'boolean', description: 'Display volume' }
            },
            required: ['id']
          }
        },
        {
          name: 'recover_volume',
          description: 'Recover deleted volume',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Volume ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'change_volume_offering',
          description: 'Change disk offering for volume',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Volume ID' },
              diskofferingid: { type: 'string', description: 'New disk offering ID' }
            },
            required: ['id', 'diskofferingid']
          }
        },

        // Disk Offering Management
        {
          name: 'create_disk_offering',
          description: 'Create disk offering',
          inputSchema: {
            type: 'object',
            properties: {
              displaytext: { type: 'string', description: 'Display text' },
              name: { type: 'string', description: 'Offering name' },
              disksize: { type: 'number', description: 'Disk size in GB' }
            },
            required: ['displaytext', 'name']
          }
        },
        {
          name: 'delete_disk_offering',
          description: 'Delete disk offering',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Disk offering ID' }
            },
            required: ['id']
          }
        },

        // Advanced Snapshot Operations
        {
          name: 'create_snapshot_policy',
          description: 'Create snapshot policy',
          inputSchema: {
            type: 'object',
            properties: {
              intervaltype: { type: 'string', description: 'Interval type (HOURLY, DAILY, WEEKLY, MONTHLY)' },
              maxsnaps: { type: 'number', description: 'Maximum snapshots to retain' },
              schedule: { type: 'string', description: 'Schedule time' },
              timezone: { type: 'string', description: 'Timezone' },
              volumeid: { type: 'string', description: 'Volume ID' }
            },
            required: ['intervaltype', 'maxsnaps', 'schedule', 'timezone', 'volumeid']
          }
        },
        {
          name: 'list_snapshot_policies',
          description: 'List snapshot policies',
          inputSchema: {
            type: 'object',
            properties: {
              volumeid: { type: 'string', description: 'Volume ID' },
              account: { type: 'string', description: 'Account name' }
            }
          }
        },
        {
          name: 'delete_snapshot_policies',
          description: 'Delete snapshot policies',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Policy ID' },
              ids: { type: 'string', description: 'Comma-separated policy IDs' }
            }
          }
        },

        // Template Management
        {
          name: 'create_template',
          description: 'Create template',
          inputSchema: {
            type: 'object',
            properties: {
              displaytext: { type: 'string', description: 'Display text' },
              name: { type: 'string', description: 'Template name' },
              ostypeid: { type: 'string', description: 'OS type ID' },
              volumeid: { type: 'string', description: 'Volume ID' },
              snapshotid: { type: 'string', description: 'Snapshot ID' }
            },
            required: ['displaytext', 'name', 'ostypeid']
          }
        },
        {
          name: 'list_templates',
          description: 'List templates',
          inputSchema: {
            type: 'object',
            properties: {
              templatefilter: { type: 'string', description: 'Template filter (featured, self, selfexecutable, sharedexecutable, executable, community)' },
              account: { type: 'string', description: 'Account name' },
              hypervisor: { type: 'string', description: 'Hypervisor type' }
            },
            required: ['templatefilter']
          }
        },
        {
          name: 'update_template',
          description: 'Update template',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Template ID' },
              displaytext: { type: 'string', description: 'Display text' },
              name: { type: 'string', description: 'Template name' }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_template',
          description: 'Delete template',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Template ID' },
              zoneid: { type: 'string', description: 'Zone ID' }
            },
            required: ['id']
          }
        },

        // ISO Management
        {
          name: 'attach_iso',
          description: 'Attach ISO to virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ISO ID' },
              virtualmachineid: { type: 'string', description: 'VM ID' }
            },
            required: ['id', 'virtualmachineid']
          }
        },
        {
          name: 'detach_iso',
          description: 'Detach ISO from virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'VM ID' }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'list_isos',
          description: 'List ISOs',
          inputSchema: {
            type: 'object',
            properties: {
              isofilter: { type: 'string', description: 'ISO filter (featured, self, selfexecutable, sharedexecutable, executable, community)' },
              account: { type: 'string', description: 'Account name' },
              bootable: { type: 'boolean', description: 'Bootable ISO' }
            },
            required: ['isofilter']
          }
        },
        {
          name: 'register_iso',
          description: 'Register ISO',
          inputSchema: {
            type: 'object',
            properties: {
              displaytext: { type: 'string', description: 'Display text' },
              name: { type: 'string', description: 'ISO name' },
              url: { type: 'string', description: 'ISO URL' },
              zoneid: { type: 'string', description: 'Zone ID' },
              ostypeid: { type: 'string', description: 'OS type ID' }
            },
            required: ['displaytext', 'name', 'url', 'zoneid']
          }
        },

        // Backup and Recovery
        {
          name: 'create_backup',
          description: 'Create backup',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'VM ID' },
              quiescevm: { type: 'boolean', description: 'Quiesce VM before backup' }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'list_backups',
          description: 'List backups',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'VM ID' },
              account: { type: 'string', description: 'Account name' }
            }
          }
        },
        {
          name: 'restore_backup',
          description: 'Restore backup',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Backup ID' }
            },
            required: ['id']
          }
        },

        // Object Storage Integration
        {
          name: 'list_object_storage_pools',
          description: 'List object storage pools',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Pool ID' },
              name: { type: 'string', description: 'Pool name' }
            }
          }
        },
        {
          name: 'create_bucket',
          description: 'Create storage bucket',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Bucket name' },
              objectstorageid: { type: 'string', description: 'Object storage ID' }
            },
            required: ['name', 'objectstorageid']
          }
        },
        {
          name: 'list_buckets',
          description: 'List storage buckets',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              objectstorageid: { type: 'string', description: 'Object storage ID' }
            }
          }
        },
        {
          name: 'add_kubernetes_supported_version',
          description: 'Add a new supported Kubernetes version',
          inputSchema: {
            type: 'object',
            properties: {
              minkubernetesnodecount: { type: 'number', description: 'Minimum node count' },
              maxkubernetesnodecount: { type: 'number', description: 'Maximum node count' },
              kubernetesversionname: { type: 'string', description: 'Kubernetes version name' },
              url: { type: 'string', description: 'URL for Kubernetes binaries' },
              checksum: { type: 'string', description: 'Checksum for verification' }
            },
            required: ['kubernetesversionname', 'url']
          }
        },
        {
          name: 'add_vms_to_kubernetes_cluster',
          description: 'Add virtual machines to an existing Kubernetes cluster',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes cluster ID' },
              virtualmachineids: { type: 'string', description: 'Comma-separated VM IDs to add' }
            },
            required: ['id', 'virtualmachineids']
          }
        },
        {
          name: 'create_kubernetes_cluster',
          description: 'Create a new Kubernetes cluster',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Cluster name' },
              description: { type: 'string', description: 'Cluster description' },
              kubernetesversionid: { type: 'string', description: 'Kubernetes version ID' },
              size: { type: 'number', description: 'Number of nodes' },
              masterNodes: { type: 'number', description: 'Number of master nodes' },
              serviceofferingid: { type: 'string', description: 'Service offering ID' },
              zoneid: { type: 'string', description: 'Zone ID' },
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              networkid: { type: 'string', description: 'Network ID' },
              keypair: { type: 'string', description: 'SSH key pair name' },
              externalloadbalanceripaddress: { type: 'string', description: 'External load balancer IP' }
            },
            required: ['name', 'kubernetesversionid', 'size', 'serviceofferingid', 'zoneid']
          }
        },
        {
          name: 'delete_kubernetes_cluster',
          description: 'Delete an existing Kubernetes cluster',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes cluster ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_kubernetes_supported_version',
          description: 'Remove a previously added Kubernetes version',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes version ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'get_kubernetes_cluster_config',
          description: 'Retrieve configuration for a Kubernetes cluster',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes cluster ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_kubernetes_clusters',
          description: 'List all Kubernetes clusters',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              id: { type: 'string', description: 'Cluster ID' },
              name: { type: 'string', description: 'Cluster name' },
              state: { type: 'string', description: 'Cluster state' },
              zoneid: { type: 'string', description: 'Zone ID' },
              keyword: { type: 'string', description: 'Keyword for search' }
            }
          }
        },
        {
          name: 'list_kubernetes_supported_versions',
          description: 'Display supported Kubernetes versions',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Version ID' },
              keyword: { type: 'string', description: 'Keyword for search' }
            }
          }
        },
        {
          name: 'remove_vms_from_kubernetes_cluster',
          description: 'Remove virtual machines from a Kubernetes cluster',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes cluster ID' },
              virtualmachineids: { type: 'string', description: 'Comma-separated VM IDs to remove' }
            },
            required: ['id', 'virtualmachineids']
          }
        },
        {
          name: 'scale_kubernetes_cluster',
          description: 'Scale a Kubernetes cluster up or down',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes cluster ID' },
              size: { type: 'number', description: 'New cluster size' },
              masterNodes: { type: 'number', description: 'Number of master nodes' },
              serviceofferingid: { type: 'string', description: 'Service offering ID' }
            },
            required: ['id', 'size']
          }
        },
        {
          name: 'start_kubernetes_cluster',
          description: 'Start a Kubernetes cluster',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes cluster ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'stop_kubernetes_cluster',
          description: 'Stop a running Kubernetes cluster',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes cluster ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_kubernetes_supported_version',
          description: 'Update a previously added Kubernetes version',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes version ID' },
              state: { type: 'string', description: 'Version state (Enabled/Disabled)' }
            },
            required: ['id', 'state']
          }
        },
        {
          name: 'upgrade_kubernetes_cluster',
          description: 'Upgrade a Kubernetes cluster to a different version',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Kubernetes cluster ID' },
              kubernetesversionid: { type: 'string', description: 'Target Kubernetes version ID' }
            },
            required: ['id', 'kubernetesversionid']
          }
        },
        {
          name: 'change_service_for_system_vm',
          description: 'Change service offering for system VM',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'System VM ID' },
              serviceofferingid: { type: 'string', description: 'New service offering ID' }
            },
            required: ['id', 'serviceofferingid']
          }
        },
        {
          name: 'destroy_system_vm',
          description: 'Destroy system virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'System VM ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_system_vms_usage_history',
          description: 'List system VMs usage history',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'System VM ID' },
              startdate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              enddate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
            }
          }
        },
        {
          name: 'migrate_system_vm',
          description: 'Migrate system VM to another host',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'System VM ID' },
              hostid: { type: 'string', description: 'Target host ID' }
            },
            required: ['virtualmachineid', 'hostid']
          }
        },
        {
          name: 'patch_system_vm',
          description: 'Patch system virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'System VM ID' },
              forced: { type: 'boolean', description: 'Force patch installation' }
            },
            required: ['id']
          }
        },
        {
          name: 'reboot_system_vm',
          description: 'Reboot system virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'System VM ID' },
              forced: { type: 'boolean', description: 'Force reboot' }
            },
            required: ['id']
          }
        },
        {
          name: 'scale_system_vm',
          description: 'Scale system VM resources',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'System VM ID' },
              serviceofferingid: { type: 'string', description: 'New service offering ID' }
            },
            required: ['id', 'serviceofferingid']
          }
        },
        {
          name: 'start_system_vm',
          description: 'Start system virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'System VM ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'stop_system_vm',
          description: 'Stop system virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'System VM ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'create_zone',
          description: 'Create a new zone/data center',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Zone name' },
              dns1: { type: 'string', description: 'Primary DNS server' },
              internaldns1: { type: 'string', description: 'Internal DNS server' },
              networktype: { type: 'string', description: 'Network type (Basic/Advanced)' },
              domain: { type: 'string', description: 'Network domain' },
              dns2: { type: 'string', description: 'Secondary DNS server' },
              internaldns2: { type: 'string', description: 'Secondary internal DNS' },
              securitygroupenabled: { type: 'boolean', description: 'Enable security groups' }
            },
            required: ['name', 'dns1', 'internaldns1', 'networktype']
          }
        },
        {
          name: 'delete_zone',
          description: 'Delete a zone/data center',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Zone ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_zone',
          description: 'Update zone configuration',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Zone ID' },
              name: { type: 'string', description: 'Zone name' },
              dns1: { type: 'string', description: 'Primary DNS server' },
              dns2: { type: 'string', description: 'Secondary DNS server' },
              internaldns1: { type: 'string', description: 'Internal DNS server' },
              internaldns2: { type: 'string', description: 'Secondary internal DNS' },
              domain: { type: 'string', description: 'Network domain' }
            },
            required: ['id']
          }
        },
        {
          name: 'enable_ha_for_zone',
          description: 'Enable high availability for zone',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: { type: 'string', description: 'Zone ID' }
            },
            required: ['zoneid']
          }
        },
        {
          name: 'disable_ha_for_zone',
          description: 'Disable high availability for zone',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: { type: 'string', description: 'Zone ID' }
            },
            required: ['zoneid']
          }
        },
        {
          name: 'create_ipv4_subnet_for_zone',
          description: 'Create IPv4 subnet for zone',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: { type: 'string', description: 'Zone ID' },
              subnet: { type: 'string', description: 'IPv4 subnet (CIDR)' },
              netmask: { type: 'string', description: 'Subnet netmask' }
            },
            required: ['zoneid', 'subnet', 'netmask']
          }
        },
        {
          name: 'delete_ipv4_subnet_for_zone',
          description: 'Delete IPv4 subnet for zone',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Subnet ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_ipv4_subnet_for_zone',
          description: 'Update IPv4 subnet for zone',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Subnet ID' },
              subnet: { type: 'string', description: 'IPv4 subnet (CIDR)' },
              netmask: { type: 'string', description: 'Subnet netmask' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_ipv4_subnets_for_zone',
          description: 'List IPv4 subnets for zone',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: { type: 'string', description: 'Zone ID' }
            }
          }
        },
        {
          name: 'dedicate_zone',
          description: 'Dedicate zone to specific account',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: { type: 'string', description: 'Zone ID' },
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' }
            },
            required: ['zoneid', 'account', 'domainid']
          }
        },
        {
          name: 'list_dedicated_zones',
          description: 'List dedicated zones',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              zoneid: { type: 'string', description: 'Zone ID' }
            }
          }
        },
        {
          name: 'release_dedicated_zone',
          description: 'Release zone dedication',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: { type: 'string', description: 'Zone ID' }
            },
            required: ['zoneid']
          }
        },
        {
          name: 'add_vmware_dc',
          description: 'Add VMware datacenter',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'VMware DC name' },
              vcenter: { type: 'string', description: 'vCenter server' },
              username: { type: 'string', description: 'vCenter username' },
              password: { type: 'string', description: 'vCenter password' },
              zoneid: { type: 'string', description: 'Zone ID' }
            },
            required: ['name', 'vcenter', 'username', 'password', 'zoneid']
          }
        },
        {
          name: 'remove_vmware_dc',
          description: 'Remove VMware datacenter',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VMware DC ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_vmware_dc',
          description: 'Update VMware datacenter',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VMware DC ID' },
              name: { type: 'string', description: 'VMware DC name' },
              username: { type: 'string', description: 'vCenter username' },
              password: { type: 'string', description: 'vCenter password' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_vmware_dcs',
          description: 'List VMware datacenters',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: { type: 'string', description: 'Zone ID' },
              keyword: { type: 'string', description: 'Search keyword' }
            }
          }
        },
        {
          name: 'list_vmware_dc_vms',
          description: 'List VMs in VMware datacenter',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'VMware DC ID' },
              keyword: { type: 'string', description: 'Search keyword' }
            },
            required: ['id']
          }
        },
        {
          name: 'add_host',
          description: 'Add hypervisor host to cluster',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Host URL (e.g., http://host:port)' },
              username: { type: 'string', description: 'Host username' },
              password: { type: 'string', description: 'Host password' },
              hypervisor: { type: 'string', description: 'Hypervisor type' },
              zoneid: { type: 'string', description: 'Zone ID' },
              podid: { type: 'string', description: 'Pod ID' },
              clusterid: { type: 'string', description: 'Cluster ID' },
              clustername: { type: 'string', description: 'Cluster name' },
              hosttags: { type: 'string', description: 'Host tags (comma-separated)' }
            },
            required: ['url', 'username', 'password', 'hypervisor', 'zoneid']
          }
        },
        {
          name: 'delete_host',
          description: 'Delete hypervisor host',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Host ID' },
              forced: { type: 'boolean', description: 'Force deletion' },
              forcedestroylocalstorage: { type: 'boolean', description: 'Force destroy local storage' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_host',
          description: 'Update host configuration',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Host ID' },
              url: { type: 'string', description: 'Host URL' },
              osenabled: { type: 'boolean', description: 'Enable over-subscription' },
              allocationstate: { type: 'string', description: 'Allocation state' },
              hosttags: { type: 'string', description: 'Host tags (comma-separated)' }
            },
            required: ['id']
          }
        },
        {
          name: 'prepare_host_for_maintenance',
          description: 'Put host in maintenance mode',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Host ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'cancel_host_maintenance',
          description: 'Cancel host maintenance mode',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Host ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'configure_ha_for_host',
          description: 'Configure HA for host',
          inputSchema: {
            type: 'object',
            properties: {
              hostid: { type: 'string', description: 'Host ID' },
              provider: { type: 'string', description: 'HA provider' }
            },
            required: ['hostid', 'provider']
          }
        },
        {
          name: 'enable_ha_for_host',
          description: 'Enable HA for host',
          inputSchema: {
            type: 'object',
            properties: {
              hostid: { type: 'string', description: 'Host ID' }
            },
            required: ['hostid']
          }
        },
        {
          name: 'disable_ha_for_host',
          description: 'Disable HA for host',
          inputSchema: {
            type: 'object',
            properties: {
              hostid: { type: 'string', description: 'Host ID' }
            },
            required: ['hostid']
          }
        },
        {
          name: 'list_host_ha_providers',
          description: 'List host HA providers',
          inputSchema: {
            type: 'object',
            properties: {
              hypervisor: { type: 'string', description: 'Hypervisor type' }
            }
          }
        },
        {
          name: 'list_host_ha_resources',
          description: 'List host HA resources',
          inputSchema: {
            type: 'object',
            properties: {
              hostid: { type: 'string', description: 'Host ID' }
            }
          }
        },
        {
          name: 'list_hosts_metrics',
          description: 'List host performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              clusterid: { type: 'string', description: 'Cluster ID' },
              id: { type: 'string', description: 'Host ID' },
              name: { type: 'string', description: 'Host name' },
              podid: { type: 'string', description: 'Pod ID' },
              state: { type: 'string', description: 'Host state' },
              type: { type: 'string', description: 'Host type' },
              zoneid: { type: 'string', description: 'Zone ID' }
            }
          }
        },
        {
          name: 'reconnect_host',
          description: 'Reconnect disconnected host',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Host ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'find_hosts_for_migration',
          description: 'Find suitable hosts for VM migration',
          inputSchema: {
            type: 'object',
            properties: {
              virtualmachineid: { type: 'string', description: 'VM ID to migrate' },
              keyword: { type: 'string', description: 'Search keyword' }
            },
            required: ['virtualmachineid']
          }
        },
        {
          name: 'declare_host_as_degraded',
          description: 'Declare host as degraded',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Host ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'cancel_host_as_degraded',
          description: 'Cancel host degraded status',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Host ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_host_tags',
          description: 'List host tags',
          inputSchema: {
            type: 'object',
            properties: {
              keyword: { type: 'string', description: 'Search keyword' }
            }
          }
        },
        {
          name: 'release_host_reservation',
          description: 'Release host reservation',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Host ID' }
            },
            required: ['id']
          }
        },
        {
          name: 'update_host_password',
          description: 'Update host password',
          inputSchema: {
            type: 'object',
            properties: {
              hostid: { type: 'string', description: 'Host ID' },
              username: { type: 'string', description: 'Username' },
              password: { type: 'string', description: 'New password' }
            },
            required: ['hostid', 'username', 'password']
          }
        },
        {
          name: 'list_dedicated_hosts',
          description: 'List dedicated hosts',
          inputSchema: {
            type: 'object',
            properties: {
              account: { type: 'string', description: 'Account name' },
              domainid: { type: 'string', description: 'Domain ID' },
              hostid: { type: 'string', description: 'Host ID' }
            }
          }
        },
        {
          name: 'confirm_dangerous_action',
          description: 'Confirm a dangerous action that requires explicit user approval',
          inputSchema: {
            type: 'object',
            properties: {
              correlationId: {
                type: 'string',
                description: 'Correlation ID from the confirmation request'
              },
              confirmed: {
                type: 'boolean',
                description: 'Whether the user confirms the dangerous action'
              },
              confirmationText: {
                type: 'string',
                description: 'The exact confirmation text required for the action'
              }
            },
            required: ['correlationId', 'confirmed']
          }
        },
        // Image Store Management Tools
        {
          name: 'add_image_store',
          description: 'Add a new image store backend',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Image store name'
              },
              url: {
                type: 'string',
                description: 'Image store URL'
              },
              provider: {
                type: 'string',
                description: 'Storage provider (NFS, S3, Swift)'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              }
            },
            required: ['name', 'url', 'provider']
          }
        },
        {
          name: 'add_image_store_s3',
          description: 'Add Amazon S3 as image store backend',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'S3 store name'
              },
              bucket: {
                type: 'string',
                description: 'S3 bucket name'
              },
              accesskey: {
                type: 'string',
                description: 'AWS access key'
              },
              secretkey: {
                type: 'string',
                description: 'AWS secret key'
              },
              endpoint: {
                type: 'string',
                description: 'S3 endpoint URL'
              },
              region: {
                type: 'string',
                description: 'AWS region'
              }
            },
            required: ['name', 'bucket', 'accesskey', 'secretkey']
          }
        },
        {
          name: 'add_swift',
          description: 'Add OpenStack Swift as image store backend',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Swift store name'
              },
              url: {
                type: 'string',
                description: 'Swift URL'
              },
              account: {
                type: 'string',
                description: 'Swift account'
              },
              username: {
                type: 'string',
                description: 'Swift username'
              },
              key: {
                type: 'string',
                description: 'Swift key'
              }
            },
            required: ['name', 'url', 'account', 'username', 'key']
          }
        },
        {
          name: 'delete_image_store',
          description: 'Delete an image store backend',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Image store ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_image_stores',
          description: 'List all image store backends',
          inputSchema: {
            type: 'object',
            properties: {
              protocol: {
                type: 'string',
                description: 'Storage protocol filter'
              },
              provider: {
                type: 'string',
                description: 'Storage provider filter'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID filter'
              }
            }
          }
        },
        {
          name: 'update_image_store',
          description: 'Update an image store backend',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Image store ID'
              },
              name: {
                type: 'string',
                description: 'Updated store name'
              },
              url: {
                type: 'string',
                description: 'Updated store URL'
              }
            },
            required: ['id']
          }
        },
        // Pod Management Tools
        {
          name: 'create_pod',
          description: 'Create a new pod',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Pod name'
              },
              zoneid: {
                type: 'string',
                description: 'Zone ID'
              },
              startip: {
                type: 'string',
                description: 'Starting IP address'
              },
              endip: {
                type: 'string',
                description: 'Ending IP address'
              },
              netmask: {
                type: 'string',
                description: 'Network mask'
              },
              gateway: {
                type: 'string',
                description: 'Gateway IP address'
              }
            },
            required: ['name', 'zoneid', 'startip', 'endip', 'netmask', 'gateway']
          }
        },
        {
          name: 'delete_pod',
          description: 'Delete a pod',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Pod ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'update_pod',
          description: 'Update a pod',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Pod ID'
              },
              name: {
                type: 'string',
                description: 'Updated pod name'
              },
              startip: {
                type: 'string',
                description: 'Updated starting IP address'
              },
              endip: {
                type: 'string',
                description: 'Updated ending IP address'
              },
              netmask: {
                type: 'string',
                description: 'Updated network mask'
              },
              gateway: {
                type: 'string',
                description: 'Updated gateway IP address'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_pods',
          description: 'List all pods',
          inputSchema: {
            type: 'object',
            properties: {
              zoneid: {
                type: 'string',
                description: 'Zone ID filter'
              },
              name: {
                type: 'string',
                description: 'Pod name filter'
              },
              allocationstate: {
                type: 'string',
                description: 'Allocation state filter'
              }
            }
          }
        },
        {
          name: 'dedicate_pod',
          description: 'Dedicate a pod to a domain or account',
          inputSchema: {
            type: 'object',
            properties: {
              podid: {
                type: 'string',
                description: 'Pod ID'
              },
              domainid: {
                type: 'string',
                description: 'Domain ID'
              },
              account: {
                type: 'string',
                description: 'Account name'
              }
            },
            required: ['podid', 'domainid']
          }
        },
        // Certificate Management Tools
        {
          name: 'issue_certificate',
          description: 'Issue a new SSL certificate',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Certificate name'
              },
              domainname: {
                type: 'string',
                description: 'Domain name for certificate'
              },
              provider: {
                type: 'string',
                description: 'CA provider'
              },
              validityperiod: {
                type: 'number',
                description: 'Certificate validity in days'
              }
            },
            required: ['name', 'domainname', 'provider']
          }
        },
        {
          name: 'upload_custom_certificate',
          description: 'Upload a custom SSL certificate',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Certificate name'
              },
              certificate: {
                type: 'string',
                description: 'Certificate content'
              },
              privatekey: {
                type: 'string',
                description: 'Private key content'
              },
              certchain: {
                type: 'string',
                description: 'Certificate chain'
              }
            },
            required: ['name', 'certificate', 'privatekey']
          }
        },
        {
          name: 'revoke_certificate',
          description: 'Revoke an SSL certificate',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Certificate ID'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_ca_providers',
          description: 'List available Certificate Authority providers',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ];

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        Logger.info(`Executing tool: ${name}`, args);

        // Check if this operation requires confirmation
        const environment = this.configManager.getDefaultEnvironment();
        if (this.confirmationMiddleware.requiresConfirmation(name, environment.name)) {
          // Create confirmation request
          const confirmationRequest = this.confirmationMiddleware.createConfirmationRequest(
            name,
            args || {},
            'claude-user', // MCP doesn't provide user context, using default
            environment.name
          );

          if (confirmationRequest) {
            // Format the confirmation request for display
            const formattedRequest = this.confirmationMiddleware.formatConfirmationRequest(confirmationRequest);
            const expiresAt = Date.now() + 300000; // 5 minutes from now

            // Throw an MCP error that Claude Desktop can handle
            const confirmationError = createConfirmationRequiredError(formattedRequest, expiresAt);
            
            // MCP protocol requires throwing an error for tool failures
            const error = new Error(confirmationError.message);
            (error as any).code = confirmationError.code;
            (error as any).data = confirmationError.data;
            throw error;
          }
        }

        switch (name) {
          case 'list_virtual_machines':
            return await this.handleListVirtualMachines(args);
          
          case 'list_networks':
            return await this.handleListNetworks(args);
          
          case 'list_volumes':
            return await this.handleListVolumes(args);
          
          case 'list_snapshots':
            return await this.handleListSnapshots(args);
          
          case 'list_zones':
            return await this.handleListZones(args);
          
          case 'list_hosts':
            return await this.handleListHosts(args);
          
          case 'list_service_offerings':
            return await this.handleListServiceOfferings(args);
          
          case 'create_service_offering':
            return await this.handleCreateServiceOffering(args);
          
          case 'update_service_offering':
            return await this.handleUpdateServiceOffering(args);
          
          case 'delete_service_offering':
            return await this.handleDeleteServiceOffering(args);
          
          case 'list_templates':
            return await this.handleListTemplates(args);
          
          // Template Management Handlers
          case 'create_template':
            return await this.handleCreateTemplate(args);
          
          case 'register_template':
            return await this.handleRegisterTemplate(args);
          
          case 'update_template':
            return await this.handleUpdateTemplate(args);
          
          case 'copy_template':
            return await this.handleCopyTemplate(args);
          
          case 'delete_template':
            return await this.handleDeleteTemplate(args);
          
          case 'extract_template':
            return await this.handleExtractTemplate(args);
          
          case 'prepare_template':
            return await this.handlePrepareTemplate(args);
          
          // ISO Management Handlers
          case 'list_isos':
            return await this.handleListIsos(args);
          
          case 'register_iso':
            return await this.handleRegisterIso(args);
          
          case 'update_iso':
            return await this.handleUpdateIso(args);
          
          case 'copy_iso':
            return await this.handleCopyIso(args);
          
          case 'delete_iso':
            return await this.handleDeleteIso(args);
          
          case 'extract_iso':
            return await this.handleExtractIso(args);
          
          case 'attach_iso':
            return await this.handleAttachIso(args);
          
          case 'detach_iso':
            return await this.handleDetachIso(args);
          
          // OS Type Management Handlers
          case 'list_os_types':
            return await this.handleListOsTypes(args);
          
          case 'list_os_categories':
            return await this.handleListOsCategories(args);
          
          // VPC Management Handlers
          case 'create_vpc':
            return await this.handleCreateVpc(args);
          
          case 'list_vpcs':
            return await this.handleListVpcs(args);
          
          case 'delete_vpc':
            return await this.handleDeleteVpc(args);
          
          case 'update_vpc':
            return await this.handleUpdateVpc(args);
          
          case 'restart_vpc':
            return await this.handleRestartVpc(args);
          
          case 'create_private_gateway':
            return await this.handleCreatePrivateGateway(args);
          
          case 'list_private_gateways':
            return await this.handleListPrivateGateways(args);
          
          case 'delete_private_gateway':
            return await this.handleDeletePrivateGateway(args);
          
          case 'create_static_route':
            return await this.handleCreateStaticRoute(args);
          
          case 'list_static_routes':
            return await this.handleListStaticRoutes(args);
          
          case 'delete_static_route':
            return await this.handleDeleteStaticRoute(args);
          
          // VPN Services Handlers
          case 'create_vpn_connection':
            return await this.handleCreateVpnConnection(args);
          
          case 'list_vpn_connections':
            return await this.handleListVpnConnections(args);
          
          case 'delete_vpn_connection':
            return await this.handleDeleteVpnConnection(args);
          
          case 'reset_vpn_connection':
            return await this.handleResetVpnConnection(args);
          
          case 'create_vpn_gateway':
            return await this.handleCreateVpnGateway(args);
          
          case 'list_vpn_gateways':
            return await this.handleListVpnGateways(args);
          
          case 'delete_vpn_gateway':
            return await this.handleDeleteVpnGateway(args);
          
          case 'create_customer_gateway':
            return await this.handleCreateCustomerGateway(args);
          
          case 'list_customer_gateways':
            return await this.handleListCustomerGateways(args);
          
          case 'delete_customer_gateway':
            return await this.handleDeleteCustomerGateway(args);
          
          case 'create_remote_access_vpn':
            return await this.handleCreateRemoteAccessVpn(args);
          
          case 'list_remote_access_vpns':
            return await this.handleListRemoteAccessVpns(args);
          
          case 'delete_remote_access_vpn':
            return await this.handleDeleteRemoteAccessVpn(args);
          
          case 'add_vpn_user':
            return await this.handleAddVpnUser(args);
          
          case 'list_vpn_users':
            return await this.handleListVpnUsers(args);
          
          case 'remove_vpn_user':
            return await this.handleRemoveVpnUser(args);

          // VPN Services Enhancement Cases
          case 'update_vpn_gateway':
            return await this.handleUpdateVpnGateway(args);
          
          case 'enable_vpn_gateway':
            return await this.handleEnableVpnGateway(args);
          
          case 'disable_vpn_gateway':
            return await this.handleDisableVpnGateway(args);
          
          case 'restart_vpn_gateway':
            return await this.handleRestartVpnGateway(args);
          
          case 'update_vpn_connection':
            return await this.handleUpdateVpnConnection(args);
          
          case 'list_vpn_instances':
            return await this.handleListVpnInstances(args);
          
          case 'update_vpn_customer_gateway':
            return await this.handleUpdateVpnCustomerGateway(args);
          
          case 'update_remote_access_vpn':
            return await this.handleUpdateRemoteAccessVpn(args);

          // VPC Offerings Handlers
          case 'create_vpc_offering':
            return await this.handleCreateVpcOffering(args);
          
          case 'list_vpc_offerings':
            return await this.handleListVpcOfferings(args);
          
          case 'update_vpc_offering':
            return await this.handleUpdateVpcOffering(args);
          
          case 'delete_vpc_offering':
            return await this.handleDeleteVpcOffering(args);

          case 'replace_network_acl_list':
            return await this.handleReplaceNetworkAclList(args);

          // System Administration Handlers
          case 'list_configurations':
            return await this.handleListConfigurations(args);
          
          case 'update_configuration':
            return await this.handleUpdateConfiguration(args);
          
          case 'list_capabilities':
            return await this.handleListCapabilities(args);
          
          case 'list_alerts':
            return await this.handleListAlerts(args);
          
          case 'archive_alerts':
            return await this.handleArchiveAlerts(args);
          
          case 'delete_alerts':
            return await this.handleDeleteAlerts(args);
          
          case 'list_events':
            return await this.handleListEvents(args);
          
          case 'list_system_vms':
            return await this.handleListSystemVms(args);
          
          case 'start_system_vm':
            return await this.handleStartSystemVm(args);
          
          case 'stop_system_vm':
            return await this.handleStopSystemVm(args);
          
          case 'reboot_system_vm':
            return await this.handleRebootSystemVm(args);
          
          case 'list_routers':
            return await this.handleListRouters(args);

          // Storage Pool Management Handlers
          case 'list_storage_pools':
            return await this.handleListStoragePools(args);
          
          case 'create_storage_pool':
            return await this.handleCreateStoragePool(args);
          
          case 'update_storage_pool':
            return await this.handleUpdateStoragePool(args);
          
          case 'delete_storage_pool':
            return await this.handleDeleteStoragePool(args);

          // Monitoring & Usage Handlers
          case 'list_usage_records':
            return await this.handleListUsageRecords(args);
          
          case 'list_capacity':
            return await this.handleListCapacity(args);
          
          case 'list_async_jobs':
            return await this.handleListAsyncJobs(args);
          
          case 'query_async_job_result':
            return await this.handleQueryAsyncJobResult(args);
          
          case 'get_cloudstack_info':
            return await this.handleGetCloudStackInfo(args);
          
          case 'deploy_virtual_machine':
            return await this.handleDeployVirtualMachine(args);
          
          case 'start_virtual_machine':
            return await this.handleStartVirtualMachine(args);
          
          case 'stop_virtual_machine':
            return await this.handleStopVirtualMachine(args);
          
          case 'reboot_virtual_machine':
            return await this.handleRebootVirtualMachine(args);
          
          case 'destroy_virtual_machine':
            return await this.handleDestroyVirtualMachine(args);
          
          case 'update_virtual_machine':
            return await this.handleUpdateVirtualMachine(args);
          
          case 'change_service_offering':
            return await this.handleChangeServiceOffering(args);
          
          case 'create_volume':
            return await this.handleCreateVolume(args);
          
          case 'attach_volume':
            return await this.handleAttachVolume(args);
          
          case 'detach_volume':
            return await this.handleDetachVolume(args);
          
          case 'delete_volume':
            return await this.handleDeleteVolume(args);
          
          case 'resize_volume':
            return await this.handleResizeVolume(args);
          
          case 'create_snapshot':
            return await this.handleCreateSnapshot(args);
          
          case 'delete_snapshot':
            return await this.handleDeleteSnapshot(args);
          
          case 'create_volume_from_snapshot':
            return await this.handleCreateVolumeFromSnapshot(args);
          
          case 'create_security_group':
            return await this.handleCreateSecurityGroup(args);
          
          case 'delete_security_group':
            return await this.handleDeleteSecurityGroup(args);
          
          case 'authorize_security_group_ingress':
            return await this.handleAuthorizeSecurityGroupIngress(args);
          
          case 'revoke_security_group_ingress':
            return await this.handleRevokeSecurityGroupIngress(args);
          
          case 'list_security_groups':
            return await this.handleListSecurityGroups(args);
          
          case 'authorize_security_group_egress':
            return await this.handleAuthorizeSecurityGroupEgress(args);
          
          case 'revoke_security_group_egress':
            return await this.handleRevokeSecurityGroupEgress(args);

          // Load Balancer Management
          case 'create_load_balancer_rule':
            return await this.handleCreateLoadBalancerRule(args);
          
          case 'delete_load_balancer_rule':
            return await this.handleDeleteLoadBalancerRule(args);
          
          case 'list_load_balancer_rules':
            return await this.handleListLoadBalancerRules(args);
          
          case 'assign_to_load_balancer_rule':
            return await this.handleAssignToLoadBalancerRule(args);
          
          case 'remove_from_load_balancer_rule':
            return await this.handleRemoveFromLoadBalancerRule(args);
          
          case 'update_load_balancer_rule':
            return await this.handleUpdateLoadBalancerRule(args);

          // Load Balancer Policies
          case 'create_lb_health_check_policy':
            return await this.handleCreateLBHealthCheckPolicy(args);
          
          case 'delete_lb_health_check_policy':
            return await this.handleDeleteLBHealthCheckPolicy(args);
          
          case 'create_lb_stickiness_policy':
            return await this.handleCreateLBStickinessPolicy(args);
          
          case 'delete_lb_stickiness_policy':
            return await this.handleDeleteLBStickinessPolicy(args);

          // SSL Certificate Management
          case 'upload_ssl_cert':
            return await this.handleUploadSslCert(args);
          
          case 'delete_ssl_cert':
            return await this.handleDeleteSslCert(args);
          
          case 'list_ssl_certs':
            return await this.handleListSslCerts(args);

          // Load Balancer Enhancement Cases
          case 'list_lb_health_check_policies':
            return await this.handleListLBHealthCheckPolicies(args);
          
          case 'update_lb_health_check_policy':
            return await this.handleUpdateLBHealthCheckPolicy(args);
          
          case 'list_lb_stickiness_policies':
            return await this.handleListLBStickinessPolicies(args);
          
          case 'update_lb_stickiness_policy':
            return await this.handleUpdateLBStickinessPolicy(args);
          
          case 'create_application_load_balancer':
            return await this.handleCreateApplicationLoadBalancer(args);
          
          case 'delete_application_load_balancer':
            return await this.handleDeleteApplicationLoadBalancer(args);
          
          case 'list_application_load_balancers':
            return await this.handleListApplicationLoadBalancers(args);
          
          case 'configure_application_load_balancer':
            return await this.handleConfigureApplicationLoadBalancer(args);
          
          case 'update_application_load_balancer':
            return await this.handleUpdateApplicationLoadBalancer(args);
          
          case 'create_global_load_balancer':
            return await this.handleCreateGlobalLoadBalancer(args);
          
          case 'delete_global_load_balancer':
            return await this.handleDeleteGlobalLoadBalancer(args);
          
          case 'list_global_load_balancers':
            return await this.handleListGlobalLoadBalancers(args);
          
          case 'update_global_load_balancer':
            return await this.handleUpdateGlobalLoadBalancer(args);
          
          case 'update_ssl_cert':
            return await this.handleUpdateSslCert(args);
          
          case 'assign_ssl_cert_to_application_load_balancer':
            return await this.handleAssignSslCertToApplicationLoadBalancer(args);
          
          case 'list_load_balancer_certificates':
            return await this.handleListLoadBalancerCertificates(args);
          
          case 'list_load_balancer_metrics':
            return await this.handleListLoadBalancerMetrics(args);
          
          case 'get_load_balancer_health':
            return await this.handleGetLoadBalancerHealth(args);
          
          case 'reset_load_balancer_rule':
            return await this.handleResetLoadBalancerRule(args);

          // Firewall Rules
          case 'create_firewall_rule':
            return await this.handleCreateFirewallRule(args);
          
          case 'delete_firewall_rule':
            return await this.handleDeleteFirewallRule(args);
          
          case 'list_firewall_rules':
            return await this.handleListFirewallRules(args);

          // Network ACL Management
          case 'create_network_acl':
            return await this.handleCreateNetworkACL(args);
          
          case 'delete_network_acl':
            return await this.handleDeleteNetworkACL(args);
          
          case 'list_network_acls':
            return await this.handleListNetworkACLs(args);
          
          case 'create_network_acl_list':
            return await this.handleCreateNetworkACLList(args);
          
          case 'delete_network_acl_list':
            return await this.handleDeleteNetworkACLList(args);
          
          case 'list_network_acl_lists':
            return await this.handleListNetworkACLLists(args);
          
          case 'update_network_acl_item':
            return await this.handleUpdateNetworkACLItem(args);
          
          case 'update_network_acl_list':
            return await this.handleUpdateNetworkACLList(args);
          
          case 'migrate_virtual_machine':
            return await this.handleMigrateVirtualMachine(args);
          
          case 'scale_virtual_machine':
            return await this.handleScaleVirtualMachine(args);
          
          case 'reset_vm_password':
            return await this.handleResetVMPassword(args);
          
          case 'get_vm_password':
            return await this.handleGetVMPassword(args);
          
          case 'add_nic_to_vm':
            return await this.handleAddNicToVM(args);
          
          case 'remove_nic_from_vm':
            return await this.handleRemoveNicFromVM(args);
          
          case 'recover_virtual_machine':
            return await this.handleRecoverVirtualMachine(args);
          
          case 'expunge_virtual_machine':
            return await this.handleExpungeVirtualMachine(args);
          
          // Additional VM Management Methods
          case 'assign_virtual_machine_to_backup_offering':
            return await this.handleAssignVirtualMachineToBackupOffering(args);
          
          case 'remove_virtual_machine_from_backup_offering':
            return await this.handleRemoveVirtualMachineFromBackupOffering(args);
          
          case 'reset_ssh_key_for_virtual_machine':
            return await this.handleResetSSHKeyForVirtualMachine(args);
          
          case 'revert_to_vm_snapshot':
            return await this.handleRevertToVMSnapshot(args);
          
          case 'unmanage_virtual_machine':
            return await this.handleUnmanageVirtualMachine(args);
          
          case 'migrate_virtual_machine_with_volume':
            return await this.handleMigrateVirtualMachineWithVolume(args);
          
          case 'import_unmanaged_instance':
            return await this.handleImportUnmanagedInstance(args);
          
          case 'import_vm':
            return await this.handleImportVm(args);
          
          case 'get_virtual_machine_user_data':
            return await this.handleGetVirtualMachineUserData(args);
          
          case 'list_unmanaged_instances':
            return await this.handleListUnmanagedInstances(args);
          
          case 'list_vm_schedule':
            return await this.handleListVMSchedule(args);
          
          case 'list_virtual_machines_metrics':
            return await this.handleListVirtualMachinesMetrics(args);
          
          case 'list_virtual_machines_usage_history':
            return await this.handleListVirtualMachinesUsageHistory(args);
          
          case 'list_vms_for_import':
            return await this.handleListVmsForImport(args);
          
          case 'update_vm_schedule':
            return await this.handleUpdateVMSchedule(args);
          
          case 'clean_vm_reservations':
            return await this.handleCleanVMReservations(args);
          
          case 'migrate_volume':
            return await this.handleMigrateVolume(args);
          
          case 'extract_volume':
            return await this.handleExtractVolume(args);
          
          case 'upload_volume':
            return await this.handleUploadVolume(args);
          
          case 'list_volume_metrics':
            return await this.handleListVolumeMetrics(args);
          
          case 'create_network':
            return await this.handleCreateNetwork(args);
          
          case 'delete_network':
            return await this.handleDeleteNetwork(args);
          
          case 'update_network':
            return await this.handleUpdateNetwork(args);
          
          case 'restart_network':
            return await this.handleRestartNetwork(args);

          // Physical Network Management
          case 'create_physical_network':
            return await this.handleCreatePhysicalNetwork(args);
          
          case 'list_physical_networks':
            return await this.handleListPhysicalNetworks(args);
          
          case 'update_physical_network':
            return await this.handleUpdatePhysicalNetwork(args);
          
          case 'delete_physical_network':
            return await this.handleDeletePhysicalNetwork(args);

          // Traffic Management
          case 'add_traffic_type':
            return await this.handleAddTrafficType(args);
          
          case 'delete_traffic_type':
            return await this.handleDeleteTrafficType(args);
          
          case 'update_traffic_type':
            return await this.handleUpdateTrafficType(args);
          
          case 'list_traffic_types':
            return await this.handleListTrafficTypes(args);
          
          case 'generate_usage_records':
            return await this.handleGenerateUsageRecords(args);
          
          case 'list_usage_records':
            return await this.handleListUsageRecords(args);
          
          case 'list_network_offerings':
            return await this.handleListNetworkOfferings(args);
          
          case 'associate_ip_address':
            return await this.handleAssociateIpAddress(args);
          
          case 'disassociate_ip_address':
            return await this.handleDisassociateIpAddress(args);
          
          case 'list_public_ip_addresses':
            return await this.handleListPublicIpAddresses(args);
          
          case 'enable_static_nat':
            return await this.handleEnableStaticNat(args);
          
          case 'disable_static_nat':
            return await this.handleDisableStaticNat(args);
          
          case 'create_port_forwarding_rule':
            return await this.handleCreatePortForwardingRule(args);
          
          case 'delete_port_forwarding_rule':
            return await this.handleDeletePortForwardingRule(args);
          
          case 'list_port_forwarding_rules':
            return await this.handleListPortForwardingRules(args);

          // IPv6 Firewall Management Cases
          case 'create_ipv6_firewall_rule':
            return await this.handleCreateIpv6FirewallRule(args);
          
          case 'delete_ipv6_firewall_rule':
            return await this.handleDeleteIpv6FirewallRule(args);
          
          case 'update_ipv6_firewall_rule':
            return await this.handleUpdateIpv6FirewallRule(args);
          
          case 'list_ipv6_firewall_rules':
            return await this.handleListIpv6FirewallRules(args);

          // Routing Firewall Management Cases
          case 'create_routing_firewall_rule':
            return await this.handleCreateRoutingFirewallRule(args);
          
          case 'delete_routing_firewall_rule':
            return await this.handleDeleteRoutingFirewallRule(args);
          
          case 'update_routing_firewall_rule':
            return await this.handleUpdateRoutingFirewallRule(args);
          
          case 'list_routing_firewall_rules':
            return await this.handleListRoutingFirewallRules(args);

          // BGP Peer Management Cases
          case 'create_bgp_peer':
            return await this.handleCreateBgpPeer(args);
          
          case 'delete_bgp_peer':
            return await this.handleDeleteBgpPeer(args);
          
          case 'update_bgp_peer':
            return await this.handleUpdateBgpPeer(args);
          
          case 'list_bgp_peers':
            return await this.handleListBgpPeers(args);
          
          case 'dedicate_bgp_peer':
            return await this.handleDedicateBgpPeer(args);
          
          case 'release_bgp_peer':
            return await this.handleReleaseBgpPeer(args);

          // Advanced VPC Management Cases
          case 'migrate_vpc':
            return await this.handleMigrateVpc(args);

          // IPv4 Subnet Management Cases
          case 'dedicate_ipv4_subnet_for_zone':
            return await this.handleDedicateIpv4SubnetForZone(args);
          
          case 'release_ipv4_subnet_for_zone':
            return await this.handleReleaseIpv4SubnetForZone(args);
          
          case 'create_ipv4_subnet_for_guest_network':
            return await this.handleCreateIpv4SubnetForGuestNetwork(args);
          
          case 'delete_ipv4_subnet_for_guest_network':
            return await this.handleDeleteIpv4SubnetForGuestNetwork(args);
          
          case 'list_ipv4_subnets_for_guest_network':
            return await this.handleListIpv4SubnetsForGuestNetwork(args);

          // Enhanced Network ACL Management Cases
          case 'update_network_acl':
            return await this.handleUpdateNetworkACL(args);

          // Account Management Cases
          case 'create_account':
            return await this.handleCreateAccount(args);
          
          case 'list_accounts':
            return await this.handleListAccounts(args);
          
          case 'update_account':
            return await this.handleUpdateAccount(args);
          
          case 'delete_account':
            return await this.handleDeleteAccount(args);
          
          case 'enable_account':
            return await this.handleEnableAccount(args);
          
          case 'disable_account':
            return await this.handleDisableAccount(args);
          
          case 'lock_account':
            return await this.handleLockAccount(args);

          // Domain Management Cases
          case 'create_domain':
            return await this.handleCreateDomain(args);
          
          case 'list_domains':
            return await this.handleListDomains(args);
          
          case 'update_domain':
            return await this.handleUpdateDomain(args);
          
          case 'delete_domain':
            return await this.handleDeleteDomain(args);
          
          case 'list_domain_children':
            return await this.handleListDomainChildren(args);

          // User Management Cases
          case 'create_user':
            return await this.handleCreateUser(args);
          
          case 'list_users':
            return await this.handleListUsers(args);
          
          case 'update_user':
            return await this.handleUpdateUser(args);
          
          case 'delete_user':
            return await this.handleDeleteUser(args);
          
          case 'enable_user':
            return await this.handleEnableUser(args);
          
          case 'disable_user':
            return await this.handleDisableUser(args);
          
          case 'lock_user':
            return await this.handleLockUser(args);
          
          case 'register_user_keys':
            return await this.handleRegisterUserKeys(args);
          
          case 'get_user':
            return await this.handleGetUser(args);
          
          case 'get_user_keys':
            return await this.handleGetUserKeys(args);
          
          case 'move_user':
            return await this.handleMoveUser(args);

          // Resource Limits and Quotas Cases
          case 'list_resource_limits':
            return await this.handleListResourceLimits(args);
          
          case 'update_resource_limit':
            return await this.handleUpdateResourceLimit(args);
          
          case 'update_resource_count':
            return await this.handleUpdateResourceCount(args);

          // Role and Permission Management Cases
          case 'create_role':
            return await this.handleCreateRole(args);
          
          case 'list_roles':
            return await this.handleListRoles(args);
          
          case 'update_role':
            return await this.handleUpdateRole(args);
          
          case 'delete_role':
            return await this.handleDeleteRole(args);
          
          case 'create_role_permission':
            return await this.handleCreateRolePermission(args);
          
          case 'list_role_permissions':
            return await this.handleListRolePermissions(args);

          // Project Management Cases
          case 'create_project':
            return await this.handleCreateProject(args);
          
          case 'list_projects':
            return await this.handleListProjects(args);
          
          case 'update_project':
            return await this.handleUpdateProject(args);
          
          case 'delete_project':
            return await this.handleDeleteProject(args);
          
          case 'activate_project':
            return await this.handleActivateProject(args);
          
          case 'suspend_project':
            return await this.handleSuspendProject(args);
          
          case 'add_account_to_project':
            return await this.handleAddAccountToProject(args);
          
          case 'delete_account_from_project':
            return await this.handleDeleteAccountFromProject(args);
          
          case 'list_project_accounts':
            return await this.handleListProjectAccounts(args);
          
          // Advanced Networking Tools - Network Offering Management
          case 'create_network_offering':
            return await this.handleCreateNetworkOffering(args);
          
          case 'delete_network_offering':
            return await this.handleDeleteNetworkOffering(args);
          
          case 'update_network_offering':
            return await this.handleUpdateNetworkOffering(args);
          
          // VLAN IP Range Management
          case 'create_vlan_ip_range':
            return await this.handleCreateVlanIpRange(args);
          
          case 'delete_vlan_ip_range':
            return await this.handleDeleteVlanIpRange(args);
          
          case 'list_vlan_ip_ranges':
            return await this.handleListVlanIpRanges(args);
          
          case 'dedicate_public_ip_range':
            return await this.handleDedicatePublicIpRange(args);
          
          case 'release_public_ip_range':
            return await this.handleReleasePublicIpRange(args);
          
          // IP Address & Forwarding Management
          case 'update_ip_address':
            return await this.handleUpdateIpAddress(args);
          
          case 'create_ip_forwarding_rule':
            return await this.handleCreateIpForwardingRule(args);
          
          case 'delete_ip_forwarding_rule':
            return await this.handleDeleteIpForwardingRule(args);
          
          case 'list_ip_forwarding_rules':
            return await this.handleListIpForwardingRules(args);
          
          case 'update_port_forwarding_rule':
            return await this.handleUpdatePortForwardingRule(args);
          
          // Advanced Router Management
          case 'start_router':
            return await this.handleStartRouter(args);
          
          case 'stop_router':
            return await this.handleStopRouter(args);
          
          case 'reboot_router':
            return await this.handleRebootRouter(args);
          
          case 'destroy_router':
            return await this.handleDestroyRouter(args);
          
          case 'change_service_for_router':
            return await this.handleChangeServiceForRouter(args);
          
          case 'list_router_health_checks':
            return await this.handleListRouterHealthChecks(args);
          
          case 'get_router_health_check_results':
            return await this.handleGetRouterHealthCheckResults(args);
          
          case 'configure_virtual_router_element':
            return await this.handleConfigureVirtualRouterElement(args);
          
          // VPC Static Routes
          case 'create_static_route':
            return await this.handleCreateStaticRoute(args);
          
          case 'delete_static_route':
            return await this.handleDeleteStaticRoute(args);
          
          case 'list_static_routes':
            return await this.handleListStaticRoutes(args);
          
          // VPC Private Gateways
          case 'create_private_gateway':
            return await this.handleCreatePrivateGateway(args);
          
          case 'delete_private_gateway':
            return await this.handleDeletePrivateGateway(args);
          
          case 'list_private_gateways':
            return await this.handleListPrivateGateways(args);
          
          // Remote Access VPN for VPC
          case 'create_remote_access_vpn':
            return await this.handleCreateRemoteAccessVpn(args);
          
          case 'delete_remote_access_vpn':
            return await this.handleDeleteRemoteAccessVpn(args);
          
          case 'list_remote_access_vpns':
            return await this.handleListRemoteAccessVpns(args);
          
          case 'add_vpn_user':
            return await this.handleAddVpnUser(args);
          
          case 'remove_vpn_user':
            return await this.handleRemoveVpnUser(args);
          
          case 'list_vpn_users':
            return await this.handleListVpnUsers(args);
          
          // Network Service Providers
          case 'list_network_service_providers':
            return await this.handleListNetworkServiceProviders(args);
          
          case 'add_network_service_provider':
            return await this.handleAddNetworkServiceProvider(args);
          
          case 'delete_network_service_provider':
            return await this.handleDeleteNetworkServiceProvider(args);
          
          case 'update_network_service_provider':
            return await this.handleUpdateNetworkServiceProvider(args);
          
          // DHCP Management
          case 'list_dhcp_options':
            return await this.handleListDhcpOptions(args);
          
          case 'create_dhcp_options':
            return await this.handleCreateDhcpOptions(args);
          
          case 'delete_dhcp_options':
            return await this.handleDeleteDhcpOptions(args);
          
          // Egress Firewall Rules
          case 'create_egress_firewall_rule':
            return await this.handleCreateEgressFirewallRule(args);
          
          case 'delete_egress_firewall_rule':
            return await this.handleDeleteEgressFirewallRule(args);
          
          case 'list_egress_firewall_rules':
            return await this.handleListEgressFirewallRules(args);
          
          case 'update_egress_firewall_rule':
            return await this.handleUpdateEgressFirewallRule(args);
          
          // NIC Management
          case 'add_nic_to_virtual_machine':
            return await this.handleAddNicToVirtualMachine(args);
          
          case 'remove_nic_from_virtual_machine':
            return await this.handleRemoveNicFromVirtualMachine(args);
          
          case 'update_default_nic_for_virtual_machine':
            return await this.handleUpdateDefaultNicForVirtualMachine(args);
          
          case 'list_nics':
            return await this.handleListNics(args);
          
          // Network Device Management
          case 'list_network_device':
            return await this.handleListNetworkDevice(args);
          
          case 'add_network_device':
            return await this.handleAddNetworkDevice(args);
          
          case 'delete_network_device':
            return await this.handleDeleteNetworkDevice(args);
          
          // Network Permissions
          case 'create_network_permissions':
            return await this.handleCreateNetworkPermissions(args);
          
          case 'remove_network_permissions':
            return await this.handleRemoveNetworkPermissions(args);
          
          case 'list_network_permissions':
            return await this.handleListNetworkPermissions(args);
          
          case 'reset_network_permissions':
            return await this.handleResetNetworkPermissions(args);
          
          // Site-to-Site VPN for VPC
          case 'create_site2site_vpn_connection':
            return await this.handleCreateSite2SiteVpnConnection(args);
          
          case 'delete_site2site_vpn_connection':
            return await this.handleDeleteSite2SiteVpnConnection(args);
          
          case 'list_site2site_vpn_connections':
            return await this.handleListSite2SiteVpnConnections(args);
          
          case 'reset_site2site_vpn_connection':
            return await this.handleResetSite2SiteVpnConnection(args);
          
          case 'update_site2site_vpn_connection':
            return await this.handleUpdateSite2SiteVpnConnection(args);
          
          // Kubernetes Service Handlers
          case 'add_kubernetes_supported_version':
            return await this.handleAddKubernetesSupportedVersion(args);
          
          case 'add_vms_to_kubernetes_cluster':
            return await this.handleAddVmsToKubernetesCluster(args);
          
          case 'create_kubernetes_cluster':
            return await this.handleCreateKubernetesCluster(args);
          
          case 'delete_kubernetes_cluster':
            return await this.handleDeleteKubernetesCluster(args);
          
          case 'delete_kubernetes_supported_version':
            return await this.handleDeleteKubernetesSupportedVersion(args);
          
          case 'get_kubernetes_cluster_config':
            return await this.handleGetKubernetesClusterConfig(args);
          
          case 'list_kubernetes_clusters':
            return await this.handleListKubernetesClusters(args);
          
          case 'list_kubernetes_supported_versions':
            return await this.handleListKubernetesSupportedVersions(args);
          
          case 'remove_vms_from_kubernetes_cluster':
            return await this.handleRemoveVmsFromKubernetesCluster(args);
          
          case 'scale_kubernetes_cluster':
            return await this.handleScaleKubernetesCluster(args);
          
          case 'start_kubernetes_cluster':
            return await this.handleStartKubernetesCluster(args);
          
          case 'stop_kubernetes_cluster':
            return await this.handleStopKubernetesCluster(args);
          
          case 'update_kubernetes_supported_version':
            return await this.handleUpdateKubernetesSupportedVersion(args);
          
          case 'upgrade_kubernetes_cluster':
            return await this.handleUpgradeKubernetesCluster(args);
          
          // System VM Management Handlers
          case 'change_service_for_system_vm':
            return await this.handleChangeServiceForSystemVm(args);
          
          case 'destroy_system_vm':
            return await this.handleDestroySystemVm(args);
          
          case 'list_system_vms_usage_history':
            return await this.handleListSystemVmsUsageHistory(args);
          
          case 'migrate_system_vm':
            return await this.handleMigrateSystemVm(args);
          
          case 'patch_system_vm':
            return await this.handlePatchSystemVm(args);
          
          case 'reboot_system_vm':
            return await this.handleRebootSystemVm(args);
          
          case 'scale_system_vm':
            return await this.handleScaleSystemVm(args);
          
          case 'start_system_vm':
            return await this.handleStartSystemVm(args);
          
          case 'stop_system_vm':
            return await this.handleStopSystemVm(args);
          
          // Zone Management Handlers
          case 'create_zone':
            return await this.handleCreateZone(args);
          
          case 'delete_zone':
            return await this.handleDeleteZone(args);
          
          case 'update_zone':
            return await this.handleUpdateZone(args);
          
          case 'enable_ha_for_zone':
            return await this.handleEnableHAForZone(args);
          
          case 'disable_ha_for_zone':
            return await this.handleDisableHAForZone(args);
          
          case 'create_ipv4_subnet_for_zone':
            return await this.handleCreateIpv4SubnetForZone(args);
          
          case 'delete_ipv4_subnet_for_zone':
            return await this.handleDeleteIpv4SubnetForZone(args);
          
          case 'update_ipv4_subnet_for_zone':
            return await this.handleUpdateIpv4SubnetForZone(args);
          
          case 'list_ipv4_subnets_for_zone':
            return await this.handleListIpv4SubnetsForZone(args);
          
          case 'dedicate_zone':
            return await this.handleDedicateZone(args);
          
          case 'list_dedicated_zones':
            return await this.handleListDedicatedZones(args);
          
          case 'release_dedicated_zone':
            return await this.handleReleaseDedicatedZone(args);
          
          case 'add_vmware_dc':
            return await this.handleAddVmwareDc(args);
          
          case 'remove_vmware_dc':
            return await this.handleRemoveVmwareDc(args);
          
          case 'update_vmware_dc':
            return await this.handleUpdateVmwareDc(args);
          
          case 'list_vmware_dcs':
            return await this.handleListVmwareDcs(args);
          
          case 'list_vmware_dc_vms':
            return await this.handleListVmwareDcVms(args);
          
          // Host Management Handlers
          case 'add_host':
            return await this.handleAddHost(args);
          
          case 'delete_host':
            return await this.handleDeleteHost(args);
          
          case 'update_host':
            return await this.handleUpdateHost(args);
          
          case 'prepare_host_for_maintenance':
            return await this.handlePrepareHostForMaintenance(args);
          
          case 'cancel_host_maintenance':
            return await this.handleCancelHostMaintenance(args);
          
          case 'configure_ha_for_host':
            return await this.handleConfigureHaForHost(args);
          
          case 'enable_ha_for_host':
            return await this.handleEnableHaForHost(args);
          
          case 'disable_ha_for_host':
            return await this.handleDisableHaForHost(args);
          
          case 'list_host_ha_providers':
            return await this.handleListHostHaProviders(args);
          
          case 'list_host_ha_resources':
            return await this.handleListHostHaResources(args);
          
          case 'list_hosts_metrics':
            return await this.handleListHostsMetrics(args);
          
          case 'reconnect_host':
            return await this.handleReconnectHost(args);
          
          case 'find_hosts_for_migration':
            return await this.handleFindHostsForMigration(args);
          
          case 'declare_host_as_degraded':
            return await this.handleDeclareHostAsDegraded(args);
          
          case 'cancel_host_as_degraded':
            return await this.handleCancelHostAsDegraded(args);
          
          case 'list_host_tags':
            return await this.handleListHostTags(args);
          
          case 'release_host_reservation':
            return await this.handleReleaseHostReservation(args);
          
          case 'update_host_password':
            return await this.handleUpdateHostPassword(args);
          
          case 'list_dedicated_hosts':
            return await this.handleListDedicatedHosts(args);
          
          case 'dedicate_host':
            return await this.handleDedicateHost(args);
          
          case 'release_dedicated_host':
            return await this.handleReleaseDedicatedHost(args);
          
          case 'confirm_dangerous_action':
            return await this.handleConfirmDangerousAction(args);
          
          // Image Store Management Cases
          case 'add_image_store':
            return await this.handleAddImageStore(args);
          
          case 'add_image_store_s3':
            return await this.handleAddImageStoreS3(args);
          
          case 'add_swift':
            return await this.handleAddSwift(args);
          
          case 'delete_image_store':
            return await this.handleDeleteImageStore(args);
          
          case 'list_image_stores':
            return await this.handleListImageStores(args);
          
          case 'update_image_store':
            return await this.handleUpdateImageStore(args);
          
          // Pod Management Cases
          case 'create_pod':
            return await this.handleCreatePod(args);
          
          case 'delete_pod':
            return await this.handleDeletePod(args);
          
          case 'update_pod':
            return await this.handleUpdatePod(args);
          
          case 'list_pods':
            return await this.handleListPods(args);
          
          case 'dedicate_pod':
            return await this.handleDedicatePod(args);
          
          // Certificate Management Cases
          case 'issue_certificate':
            return await this.handleIssueCertificate(args);
          
          case 'upload_custom_certificate':
            return await this.handleUploadCustomCertificate(args);
          
          case 'revoke_certificate':
            return await this.handleRevokeCertificate(args);
          
          case 'list_ca_providers':
            return await this.handleListCAProviders(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        Logger.error(`Tool execution failed: ${name}`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  private async handleListVirtualMachines(args: any): Promise<any> {
    const allowedParams = [
      // Basic filters
      'account', 'domainid', 'projectid', 'keyword', 'name', 'id', 'ids',
      
      // Location filters  
      'zoneid', 'clusterid', 'hostid', 'podid', 'storageid',
      
      // Resource filters
      'templateid', 'serviceofferingid', 'diskofferingid', 'networkid', 'vpcid',
      'isoid', 'securitygroupid', 'affinitygroupid', 'backupofferingid',
      
      // State and configuration filters
      'state', 'haenable', 'hypervisor', 'displayvm', 'forvirtualnetwork',
      'keypair', 'groupid', 'userid', 'autoscalevmgroupid',
      
      // Advanced filters
      'details', 'userdata', 'accumulate', 'isrecursive', 'listall',
      'isvnf', 'tags',
      
      // Pagination
      'page', 'pagesize'
    ];
    
    const params = this.buildParams(args, allowedParams);
    
    // Parameter validation
    if (params.account && !params.domainid) {
      throw new Error('domainid is required when account is specified');
    }
    
    if (params.state && !['Running', 'Stopped', 'Starting', 'Stopping', 'Migrating', 'Error', 'Unknown', 'Shutdowned', 'Destroyed', 'Expunging'].includes(params.state)) {
      throw new Error('Invalid state. Must be one of: Running, Stopped, Starting, Stopping, Migrating, Error, Unknown, Shutdowned, Destroyed, Expunging');
    }
    
    if (params.hypervisor && !['KVM', 'XenServer', 'VMware', 'Hyperv', 'VirtualBox', 'Parralels', 'BareMetal', 'Ovm', 'None'].includes(params.hypervisor)) {
      throw new Error('Invalid hypervisor type');
    }
    
    // Validate boolean parameters
    const booleanParams = ['haenable', 'displayvm', 'forvirtualnetwork', 'userdata', 'accumulate', 'isrecursive', 'listall', 'isvnf'];
    for (const param of booleanParams) {
      if (params[param] !== undefined && typeof params[param] !== 'boolean') {
        throw new Error(`${param} must be a boolean value`);
      }
    }
    
    // Validate pagination parameters
    if (params.page && (typeof params.page !== 'number' || params.page < 1)) {
      throw new Error('page must be a positive number');
    }
    
    if (params.pagesize && (typeof params.pagesize !== 'number' || params.pagesize < 1 || params.pagesize > 500)) {
      throw new Error('pagesize must be a number between 1 and 500');
    }
    
    const response = await this.client.listVirtualMachines(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVirtualMachinesResponse(response)
        }
      ]
    };
  }

  private async handleListNetworks(args: any): Promise<any> {
    const allowedParams = [
      // Basic filters
      'id', 'name', 'displaytext', 'zoneid', 'type', 'account', 'domainid', 'projectid',
      
      // Advanced filters
      'state', 'traffictype', 'physicalnetworkid', 'networkofferingid', 'vpcid',
      'acltype', 'subdomainaccess', 'forvpc', 'canusefordeploy', 'supportedservices',
      'restartreq', 'specifyipranges', 'ispersistent', 'networkdomain',
      
      // Search and pagination
      'keyword', 'isrecursive', 'listall', 'page', 'pagesize',
      
      // Advanced options
      'details', 'tags', 'retrieveonlyresourcecount', 'fordisplay',
      
      // Network-specific filters
      'broadcastdomaintype', 'broadcasturi', 'gateway', 'netmask',
      'startip', 'endip', 'dns1', 'dns2', 'ip6dns1', 'ip6dns2',
      
      // Security and access
      'securitygroupenabled', 'related'
    ];

    // Enhanced parameter validation
    if (args.page) {
      const page = parseInt(args.page);
      if (isNaN(page) || page < 1) {
        throw new Error('Invalid page number. Must be a positive integer');
      }
    }

    if (args.pagesize) {
      const pagesize = parseInt(args.pagesize);
      if (isNaN(pagesize) || pagesize < 1 || pagesize > 500) {
        throw new Error('Invalid page size. Must be between 1 and 500');
      }
    }

    if (args.state) {
      const validStates = ['Allocated', 'Setup', 'Implemented', 'Shutdown', 'Destroy', 'Destroyed'];
      if (!validStates.includes(args.state)) {
        throw new Error(`Invalid state. Must be one of: ${validStates.join(', ')}`);
      }
    }

    if (args.traffictype) {
      const validTrafficTypes = ['Public', 'Guest', 'Management', 'Control', 'Storage', 'Vlan'];
      if (!validTrafficTypes.includes(args.traffictype)) {
        throw new Error(`Invalid traffic type. Must be one of: ${validTrafficTypes.join(', ')}`);
      }
    }

    if (args.type) {
      const validTypes = ['Isolated', 'Shared', 'L2'];
      if (!validTypes.includes(args.type)) {
        throw new Error(`Invalid network type. Must be one of: ${validTypes.join(', ')}`);
      }
    }

    if (args.acltype) {
      const validAclTypes = ['Account', 'Domain'];
      if (!validAclTypes.includes(args.acltype)) {
        throw new Error(`Invalid ACL type. Must be one of: ${validAclTypes.join(', ')}`);
      }
    }

    if (args.gateway && !this.isValidIPAddress(args.gateway)) {
      throw new Error('Invalid gateway IP address format');
    }

    if (args.startip && !this.isValidIPAddress(args.startip)) {
      throw new Error('Invalid start IP address format');
    }

    if (args.endip && !this.isValidIPAddress(args.endip)) {
      throw new Error('Invalid end IP address format');
    }

    if (args.dns1 && !this.isValidIPAddress(args.dns1)) {
      throw new Error('Invalid DNS1 IP address format');
    }

    if (args.dns2 && !this.isValidIPAddress(args.dns2)) {
      throw new Error('Invalid DNS2 IP address format');
    }

    if (args.ip6dns1 && !this.isValidIPAddress(args.ip6dns1)) {
      throw new Error('Invalid IPv6 DNS1 address format');
    }

    if (args.ip6dns2 && !this.isValidIPAddress(args.ip6dns2)) {
      throw new Error('Invalid IPv6 DNS2 address format');
    }

    // Boolean parameter validation
    ['isrecursive', 'listall', 'restartreq', 'specifyipranges', 'ispersistent',
     'canusefordeploy', 'forvpc', 'subdomainaccess', 'securitygroupenabled',
     'retrieveonlyresourcecount', 'fordisplay'].forEach(param => {
      if (args[param] !== undefined) {
        if (typeof args[param] === 'string') {
          args[param] = args[param].toLowerCase() === 'true';
        }
      }
    });

    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listNetworks(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatNetworksResponse(response)
        }
      ]
    };
  }

  private async handleListVolumes(args: any): Promise<any> {
    const params = this.buildParams(args, ['zone', 'type', 'virtualmachineid']);
    const response = await this.client.listVolumes(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVolumesResponse(response)
        }
      ]
    };
  }

  private async handleListSnapshots(args: any): Promise<any> {
    const params = this.buildParams(args, ['volumeid', 'account', 'intervaltype']);
    const response = await this.client.listSnapshots(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatSnapshotsResponse(response)
        }
      ]
    };
  }

  private async handleListZones(args: any): Promise<any> {
    const params = this.buildParams(args, ['available']);
    const response = await this.client.listZones(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatZonesResponse(response)
        }
      ]
    };
  }

  private async handleListHosts(args: any): Promise<any> {
    const params = this.buildParams(args, ['zone', 'type', 'state']);
    const response = await this.client.listHosts(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatHostsResponse(response)
        }
      ]
    };
  }

  private async handleListServiceOfferings(args: any): Promise<any> {
    const params = this.buildParams(args, ['virtualmachineid']);
    const response = await this.client.listServiceOfferings(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatServiceOfferingsResponse(response)
        }
      ]
    };
  }

  private async handleCreateServiceOffering(args: any): Promise<any> {
    const params = this.buildParams(args, ['name', 'displaytext', 'cpunumber', 'memory', 'cpuspeed', 'storagetype', 'domainid', 'zoneid']);
    const response = await this.client.createServiceOffering(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatServiceOfferingResponse(response, 'created')
        }
      ]
    };
  }

  private async handleUpdateServiceOffering(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'name', 'displaytext', 'domainid', 'zoneid']);
    const response = await this.client.updateServiceOffering(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatServiceOfferingResponse(response, 'updated')
        }
      ]
    };
  }

  private async handleDeleteServiceOffering(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteServiceOffering(params);
    
    return {
      content: [
        {
          type: 'text',
          text: `Service offering deleted successfully.\n\nResponse: ${JSON.stringify(response, null, 2)}`
        }
      ]
    };
  }

  private async handleListTemplates(args: any): Promise<any> {
    const params = this.buildParams(args, ['templatefilter', 'zone', 'hypervisor']);
    if (!params.templatefilter) {
      params.templatefilter = 'executable';
    }
    const response = await this.client.listTemplates(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTemplatesResponse(response)
        }
      ]
    };
  }

  // Template Management Handlers
  private async handleCreateTemplate(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'displaytext', 'name', 'ostypeid', 'virtualmachineid', 'volumeid', 
      'snapshotid', 'isfeatured', 'ispublic', 'passwordenabled'
    ]);
    const response = await this.client.createTemplate(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTemplateResponse('Template creation initiated', response)
        }
      ]
    };
  }

  private async handleRegisterTemplate(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'displaytext', 'format', 'hypervisor', 'name', 'ostypeid', 'url', 'zoneid',
      'account', 'domainid', 'isfeatured', 'ispublic', 'passwordenabled', 'requireshvm'
    ]);
    const response = await this.client.registerTemplate(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTemplateResponse('Template registration initiated', response)
        }
      ]
    };
  }

  private async handleUpdateTemplate(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'displaytext', 'name', 'ostypeid', 'passwordenabled', 'sortkey'
    ]);
    const response = await this.client.updateTemplate(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTemplateResponse('Template updated successfully', response)
        }
      ]
    };
  }

  private async handleCopyTemplate(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'destzoneid', 'sourcezoneid']);
    const response = await this.client.copyTemplate(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTemplateResponse('Template copy initiated', response)
        }
      ]
    };
  }

  private async handleDeleteTemplate(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'zoneid', 'forced']);
    const response = await this.client.deleteTemplate(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTemplateResponse('Template deletion initiated', response)
        }
      ]
    };
  }

  private async handleExtractTemplate(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'mode', 'zoneid', 'url']);
    if (!params.mode) {
      params.mode = 'HTTP_DOWNLOAD';
    }
    const response = await this.client.extractTemplate(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTemplateResponse('Template extraction initiated', response)
        }
      ]
    };
  }

  private async handlePrepareTemplate(args: any): Promise<any> {
    const params = this.buildParams(args, ['templateid', 'zoneid']);
    const response = await this.client.prepareTemplate(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTemplateResponse('Template preparation initiated', response)
        }
      ]
    };
  }

  // ISO Management Handlers
  private async handleListIsos(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'account', 'bootable', 'domainid', 'hypervisor', 'id', 'isofilter',
      'ispublic', 'isready', 'keyword', 'name', 'zoneid'
    ]);
    if (!params.isofilter) {
      params.isofilter = 'executable';
    }
    const response = await this.client.listIsos(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatIsosResponse(response)
        }
      ]
    };
  }

  private async handleRegisterIso(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'displaytext', 'name', 'url', 'zoneid', 'account', 'bootable',
      'domainid', 'isfeatured', 'ispublic', 'ostypeid'
    ]);
    const response = await this.client.registerIso(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatIsoResponse('ISO registration initiated', response)
        }
      ]
    };
  }

  private async handleUpdateIso(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'displaytext', 'name', 'ostypeid', 'bootable', 'sortkey'
    ]);
    const response = await this.client.updateIso(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatIsoResponse('ISO updated successfully', response)
        }
      ]
    };
  }

  private async handleCopyIso(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'destzoneid', 'sourcezoneid']);
    const response = await this.client.copyIso(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatIsoResponse('ISO copy initiated', response)
        }
      ]
    };
  }

  private async handleDeleteIso(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'zoneid']);
    const response = await this.client.deleteIso(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatIsoResponse('ISO deletion initiated', response)
        }
      ]
    };
  }

  private async handleExtractIso(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'mode', 'zoneid', 'url']);
    if (!params.mode) {
      params.mode = 'HTTP_DOWNLOAD';
    }
    const response = await this.client.extractIso(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatIsoResponse('ISO extraction initiated', response)
        }
      ]
    };
  }

  private async handleAttachIso(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'virtualmachineid']);
    const response = await this.client.attachIso(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatIsoResponse('ISO attached to VM', response)
        }
      ]
    };
  }

  private async handleDetachIso(args: any): Promise<any> {
    const params = this.buildParams(args, ['virtualmachineid']);
    const response = await this.client.detachIso(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatIsoResponse('ISO detached from VM', response)
        }
      ]
    };
  }

  // OS Type Management Handlers
  private async handleListOsTypes(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'oscategoryid', 'keyword', 'page', 'pagesize'
    ]);
    const response = await this.client.listOsTypes(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatOsTypesResponse('Available OS Types', response)
        }
      ]
    };
  }

  private async handleListOsCategories(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'keyword', 'page', 'pagesize'
    ]);
    const response = await this.client.listOsCategories(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatOsCategoriesResponse('Available OS Categories', response)
        }
      ]
    };
  }

  // VPC Management Handlers
  private async handleCreateVpc(args: any): Promise<any> {
    const requiredParams = ['cidr', 'name', 'vpcofferingid', 'zoneid'];
    const optionalParams = [
      'displaytext', 'account', 'domainid', 'projectid',
      'networkdomain', 'publicmtu', 'sourcenatipaddress',
      'fordisplay', 'start', 'asnumber', 'bgppeerids',
      'cidrsize', 'dns1', 'dns2', 'ip6dns1', 'ip6dns2',
      'customid', 'tags', 'routerprivateipaddress',
      'routerpublicipaddress', 'vpcdomainid'
    ];

    // Validate required parameters
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Required parameter missing: ${param}`);
      }
    }

    // Enhanced parameter validation
    if (args.cidr) {
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(args.cidr)) {
        throw new Error('Invalid CIDR format. Expected format: x.x.x.x/xx');
      }
    }

    if (args.cidrsize) {
      const size = parseInt(args.cidrsize);
      if (isNaN(size) || size < 16 || size > 28) {
        throw new Error('Invalid CIDR size. Must be between 16 and 28');
      }
    }

    if (args.dns1 && !this.isValidIPAddress(args.dns1)) {
      throw new Error('Invalid DNS1 IP address format');
    }

    if (args.dns2 && !this.isValidIPAddress(args.dns2)) {
      throw new Error('Invalid DNS2 IP address format');
    }

    if (args.ip6dns1 && !this.isValidIPAddress(args.ip6dns1)) {
      throw new Error('Invalid IPv6 DNS1 address format');
    }

    if (args.ip6dns2 && !this.isValidIPAddress(args.ip6dns2)) {
      throw new Error('Invalid IPv6 DNS2 address format');
    }

    if (args.sourcenatipaddress && !this.isValidIPAddress(args.sourcenatipaddress)) {
      throw new Error('Invalid source NAT IP address format');
    }

    if (args.routerprivateipaddress && !this.isValidIPAddress(args.routerprivateipaddress)) {
      throw new Error('Invalid router private IP address format');
    }

    if (args.routerpublicipaddress && !this.isValidIPAddress(args.routerpublicipaddress)) {
      throw new Error('Invalid router public IP address format');
    }

    if (args.publicmtu) {
      const mtu = parseInt(args.publicmtu);
      if (isNaN(mtu) || mtu < 68 || mtu > 65536) {
        throw new Error('Invalid MTU value. Must be between 68 and 65536');
      }
    }

    if (args.asnumber) {
      const asn = parseInt(args.asnumber);
      if (isNaN(asn) || asn < 1 || asn > 4294967295) {
        throw new Error('Invalid AS number. Must be between 1 and 4294967295');
      }
    }

    if (args.fordisplay !== undefined) {
      if (typeof args.fordisplay === 'string') {
        args.fordisplay = args.fordisplay.toLowerCase() === 'true';
      }
    }

    if (args.start !== undefined) {
      if (typeof args.start === 'string') {
        args.start = args.start.toLowerCase() === 'true';
      }
    }

    const params = this.buildParams(args, [...requiredParams, ...optionalParams]);
    const response = await this.client.createVPC(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVpcResponse('VPC creation initiated', response)
        }
      ]
    };
  }

  private async handleListVpcs(args: any): Promise<any> {
    const allowedParams = [
      // Basic filters
      'id', 'name', 'displaytext', 'account', 'domainid', 'projectid', 'zoneid',
      
      // VPC-specific filters
      'state', 'vpcofferingid', 'supportedservices', 'restartreq', 'networkdomain',
      'cidr', 'distributedvpcrouter', 'redundantvpcrouter', 'sourcenatsupported',
      
      // Search and pagination
      'keyword', 'isrecursive', 'listall', 'page', 'pagesize',
      
      // Advanced options
      'details', 'tags', 'retrieveonlyresourcecount', 'fordisplay',
      
      // Network and routing
      'publicmtu', 'sourcenatipaddress', 'routerprivateipaddress',
      'routerpublicipaddress', 'dns1', 'dns2', 'ip6dns1', 'ip6dns2',
      
      // BGP and routing
      'asnumber', 'bgppeerids', 'routertype', 'userdatadetails',
      
      // Access and security
      'related', 'ispersistent', 'fordisplay'
    ];

    // Enhanced parameter validation
    if (args.page) {
      const page = parseInt(args.page);
      if (isNaN(page) || page < 1) {
        throw new Error('Invalid page number. Must be a positive integer');
      }
    }

    if (args.pagesize) {
      const pagesize = parseInt(args.pagesize);
      if (isNaN(pagesize) || pagesize < 1 || pagesize > 500) {
        throw new Error('Invalid page size. Must be between 1 and 500');
      }
    }

    if (args.state) {
      const validStates = ['Enabled', 'Disabled', 'Inactive'];
      if (!validStates.includes(args.state)) {
        throw new Error(`Invalid state. Must be one of: ${validStates.join(', ')}`);
      }
    }

    if (args.cidr) {
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(args.cidr)) {
        throw new Error('Invalid CIDR format. Expected format: x.x.x.x/xx');
      }
    }

    if (args.dns1 && !this.isValidIPAddress(args.dns1)) {
      throw new Error('Invalid DNS1 IP address format');
    }

    if (args.dns2 && !this.isValidIPAddress(args.dns2)) {
      throw new Error('Invalid DNS2 IP address format');
    }

    if (args.ip6dns1 && !this.isValidIPAddress(args.ip6dns1)) {
      throw new Error('Invalid IPv6 DNS1 address format');
    }

    if (args.ip6dns2 && !this.isValidIPAddress(args.ip6dns2)) {
      throw new Error('Invalid IPv6 DNS2 address format');
    }

    if (args.sourcenatipaddress && !this.isValidIPAddress(args.sourcenatipaddress)) {
      throw new Error('Invalid source NAT IP address format');
    }

    if (args.routerprivateipaddress && !this.isValidIPAddress(args.routerprivateipaddress)) {
      throw new Error('Invalid router private IP address format');
    }

    if (args.routerpublicipaddress && !this.isValidIPAddress(args.routerpublicipaddress)) {
      throw new Error('Invalid router public IP address format');
    }

    if (args.publicmtu) {
      const mtu = parseInt(args.publicmtu);
      if (isNaN(mtu) || mtu < 68 || mtu > 65536) {
        throw new Error('Invalid MTU value. Must be between 68 and 65536');
      }
    }

    if (args.asnumber) {
      const asn = parseInt(args.asnumber);
      if (isNaN(asn) || asn < 1 || asn > 4294967295) {
        throw new Error('Invalid AS number. Must be between 1 and 4294967295');
      }
    }

    // Boolean parameter validation
    ['isrecursive', 'listall', 'restartreq', 'distributedvpcrouter', 'redundantvpcrouter',
     'sourcenatsupported', 'retrieveonlyresourcecount', 'fordisplay', 'ispersistent'].forEach(param => {
      if (args[param] !== undefined) {
        if (typeof args[param] === 'string') {
          args[param] = args[param].toLowerCase() === 'true';
        }
      }
    });

    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listVPCs(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVpcsResponse(response)
        }
      ]
    };
  }

  private async handleDeleteVpc(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteVPC(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVpcResponse('VPC deletion initiated', response)
        }
      ]
    };
  }

  private async handleUpdateVpc(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'displaytext', 'name']);
    const response = await this.client.updateVPC(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVpcResponse('VPC updated successfully', response)
        }
      ]
    };
  }

  private async handleRestartVpc(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'cleanup']);
    const response = await this.client.restartVPC(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVpcResponse('VPC restart initiated', response)
        }
      ]
    };
  }



  private async handleGetCloudStackInfo(args: any): Promise<any> {
    const environmentInfo = this.client.getEnvironmentInfo();
    const connectionStatus = await this.client.testConnection();
    
    return {
      content: [
        {
          type: 'text',
          text: `CloudStack Environment Information:
Environment: ${environmentInfo.name}
API URL: ${environmentInfo.apiUrl}
Connection Status: ${connectionStatus ? 'Connected' : 'Failed'}
Timeout: ${environmentInfo.timeout}ms
Retries: ${environmentInfo.retries}

Available environments: ${this.configManager.listEnvironments().join(', ')}`
        }
      ]
    };
  }

  private buildParams(args: any, allowedParams: string[], requiredParams: string[] = []): Record<string, any> {
    // Validate required parameters
    for (const required of requiredParams) {
      if (!args[required] || args[required] === null || args[required] === undefined) {
        throw new Error(`Required parameter missing: ${required}`);
      }
    }
    
    const params: Record<string, any> = {};
    
    for (const param of allowedParams) {
      if (args[param] !== undefined && args[param] !== null) {
        params[param] = args[param];
      }
    }
    
    return params;
  }

  private isValidIPAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private formatVirtualMachinesResponse(response: any): string {
    const vms = response.virtualmachine || [];
    
    if (vms.length === 0) {
      return 'No virtual machines found.';
    }

    let result = `Found ${vms.length} virtual machine(s):\n\n`;
    
    for (const vm of vms) {
      result += `Name: ${vm.name}\n`;
      result += `  ID: ${vm.id}\n`;
      result += `  Display Name: ${vm.displayname || 'N/A'}\n`;
      result += `  State: ${vm.state}\n`;
      result += `  Zone: ${vm.zonename || 'N/A'}\n`;
      result += `  Service Offering: ${vm.serviceofferingname || 'N/A'}\n`;
      result += `  Template: ${vm.templatename || 'N/A'}\n`;
      result += `  CPU: ${vm.cpunumber || 'N/A'} cores @ ${vm.cpuspeed || 'N/A'} MHz\n`;
      result += `  Memory: ${vm.memory || 'N/A'} MB\n`;
      result += `  Hypervisor: ${vm.hypervisor || 'N/A'}\n`;
      result += `  Created: ${vm.created || 'N/A'}\n`;
      result += `  Account: ${vm.account || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatNetworksResponse(response: any): string {
    const networks = response.network || [];
    
    if (networks.length === 0) {
      return 'No networks found.';
    }

    let result = `Found ${networks.length} network(s):\n\n`;
    
    for (const network of networks) {
      result += `Name: ${network.name}\n`;
      result += `  ID: ${network.id}\n`;
      result += `  Display Text: ${network.displaytext || 'N/A'}\n`;
      result += `  Type: ${network.type || 'N/A'}\n`;
      result += `  State: ${network.state || 'N/A'}\n`;
      result += `  Zone: ${network.zonename || 'N/A'}\n`;
      result += `  CIDR: ${network.cidr || 'N/A'}\n`;
      result += `  Gateway: ${network.gateway || 'N/A'}\n`;
      result += `  Netmask: ${network.netmask || 'N/A'}\n`;
      result += `  Traffic Type: ${network.traffictype || 'N/A'}\n`;
      result += `  Account: ${network.account || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatPhysicalNetworkResponse(action: string, response: any): string {
    const physicalNetwork = response.physicalnetwork || response;
    
    if (!physicalNetwork) {
      return `${action} - No physical network data returned`;
    }

    let result = `${action} successfully:\n\n`;
    result += `Name: ${physicalNetwork.name}\n`;
    result += `ID: ${physicalNetwork.id}\n`;
    result += `Zone: ${physicalNetwork.zonename || physicalNetwork.zoneid || 'N/A'}\n`;
    result += `State: ${physicalNetwork.state || 'N/A'}\n`;
    result += `Broadcast Domain Range: ${physicalNetwork.broadcastdomainrange || 'N/A'}\n`;
    result += `Isolation Methods: ${physicalNetwork.isolationmethods || 'N/A'}\n`;
    result += `VLAN: ${physicalNetwork.vlan || 'N/A'}\n`;
    result += `Tags: ${physicalNetwork.tags || 'N/A'}\n`;
    result += `Domain: ${physicalNetwork.domainname || physicalNetwork.domainid || 'N/A'}\n`;

    return result;
  }

  private formatPhysicalNetworksResponse(response: any): string {
    const physicalNetworks = response.physicalnetwork || [];
    
    if (physicalNetworks.length === 0) {
      return 'No physical networks found.';
    }

    let result = `Found ${physicalNetworks.length} physical network(s):\n\n`;
    
    for (const physicalNetwork of physicalNetworks) {
      result += `Name: ${physicalNetwork.name}\n`;
      result += `  ID: ${physicalNetwork.id}\n`;
      result += `  Zone: ${physicalNetwork.zonename || physicalNetwork.zoneid || 'N/A'}\n`;
      result += `  State: ${physicalNetwork.state || 'N/A'}\n`;
      result += `  Broadcast Domain Range: ${physicalNetwork.broadcastdomainrange || 'N/A'}\n`;
      result += `  Isolation Methods: ${physicalNetwork.isolationmethods || 'N/A'}\n`;
      result += `  VLAN: ${physicalNetwork.vlan || 'N/A'}\n`;
      result += `  Tags: ${physicalNetwork.tags || 'N/A'}\n`;
      result += `  Domain: ${physicalNetwork.domainname || physicalNetwork.domainid || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatTrafficTypeResponse(action: string, response: any): string {
    const trafficType = response.traffictype || response;
    
    if (!trafficType) {
      return `${action} - No traffic type data returned`;
    }

    let result = `${action} successfully:\n\n`;
    result += `ID: ${trafficType.id}\n`;
    result += `Traffic Type: ${trafficType.traffictype}\n`;
    result += `Physical Network: ${trafficType.physicalnetworkid}\n`;
    result += `KVM Network Label: ${trafficType.kvmnetworklabel || 'N/A'}\n`;
    result += `VMware Network Label: ${trafficType.vmwarenetworklabel || 'N/A'}\n`;
    result += `XenServer Network Label: ${trafficType.xennetworklabel || 'N/A'}\n`;
    result += `Hyper-V Network Label: ${trafficType.hypervnetworklabel || 'N/A'}\n`;

    return result;
  }

  private formatTrafficTypesResponse(response: any): string {
    const trafficTypes = response.traffictype || [];
    
    if (trafficTypes.length === 0) {
      return 'No traffic types found.';
    }

    let result = `Found ${trafficTypes.length} traffic type(s):\n\n`;
    
    for (const trafficType of trafficTypes) {
      result += `Traffic Type: ${trafficType.traffictype}\n`;
      result += `  ID: ${trafficType.id}\n`;
      result += `  Physical Network: ${trafficType.physicalnetworkid}\n`;
      result += `  KVM Network Label: ${trafficType.kvmnetworklabel || 'N/A'}\n`;
      result += `  VMware Network Label: ${trafficType.vmwarenetworklabel || 'N/A'}\n`;
      result += `  XenServer Network Label: ${trafficType.xennetworklabel || 'N/A'}\n`;
      result += `  Hyper-V Network Label: ${trafficType.hypervnetworklabel || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatUsageRecordsResponse(response: any): string {
    const usageRecords = response.usagerecord || [];
    
    if (usageRecords.length === 0) {
      return 'No usage records found.';
    }

    let result = `Found ${usageRecords.length} usage record(s):\n\n`;
    
    for (const record of usageRecords) {
      result += `Usage Type: ${record.usagetype || 'N/A'}\n`;
      result += `  Description: ${record.description || 'N/A'}\n`;
      result += `  Account: ${record.account || 'N/A'}\n`;
      result += `  Domain: ${record.domain || 'N/A'}\n`;
      result += `  Zone: ${record.zone || 'N/A'}\n`;
      result += `  Raw Usage: ${record.rawusage || 'N/A'}\n`;
      result += `  Usage: ${record.usage || 'N/A'}\n`;
      result += `  Start Date: ${record.startdate || 'N/A'}\n`;
      result += `  End Date: ${record.enddate || 'N/A'}\n`;
      result += `  Virtual Machine: ${record.virtualmachinename || 'N/A'}\n`;
      result += `  Template: ${record.templatename || 'N/A'}\n`;
      result += `  Service Offering: ${record.serviceofferingname || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatVolumesResponse(response: any): string {
    const volumes = response.volume || [];
    
    if (volumes.length === 0) {
      return 'No volumes found.';
    }

    let result = `Found ${volumes.length} volume(s):\n\n`;
    
    for (const volume of volumes) {
      result += `Name: ${volume.name}\n`;
      result += `  ID: ${volume.id}\n`;
      result += `  Type: ${volume.type || 'N/A'}\n`;
      result += `  Size: ${volume.size ? (volume.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : 'N/A'}\n`;
      result += `  State: ${volume.state || 'N/A'}\n`;
      result += `  Zone: ${volume.zonename || 'N/A'}\n`;
      result += `  VM: ${volume.vmname || 'N/A'}\n`;
      result += `  Storage Type: ${volume.storagetype || 'N/A'}\n`;
      result += `  Created: ${volume.created || 'N/A'}\n`;
      result += `  Account: ${volume.account || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatSnapshotsResponse(response: any): string {
    const snapshots = response.snapshot || [];
    
    if (snapshots.length === 0) {
      return 'No snapshots found.';
    }

    let result = `Found ${snapshots.length} snapshot(s):\n\n`;
    
    for (const snapshot of snapshots) {
      result += `Name: ${snapshot.name}\n`;
      result += `  ID: ${snapshot.id}\n`;
      result += `  Volume: ${snapshot.volumename || 'N/A'}\n`;
      result += `  Type: ${snapshot.snapshottype || 'N/A'}\n`;
      result += `  State: ${snapshot.state || 'N/A'}\n`;
      result += `  Created: ${snapshot.created || 'N/A'}\n`;
      result += `  Account: ${snapshot.account || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatZonesResponse(response: any): string {
    const zones = response.zone || [];
    
    if (zones.length === 0) {
      return 'No zones found.';
    }

    let result = `Found ${zones.length} zone(s):\n\n`;
    
    for (const zone of zones) {
      result += `Name: ${zone.name}\n`;
      result += `  ID: ${zone.id}\n`;
      result += `  Description: ${zone.description || 'N/A'}\n`;
      result += `  Network Type: ${zone.networktype || 'N/A'}\n`;
      result += `  Allocation State: ${zone.allocationstate || 'N/A'}\n`;
      result += `  Local Storage: ${zone.localstorageenabled ? 'Enabled' : 'Disabled'}\n`;
      result += `  Security Groups: ${zone.securitygroupsenabled ? 'Enabled' : 'Disabled'}\n\n`;
    }

    return result;
  }

  private formatHostsResponse(response: any): string {
    const hosts = response.host || [];
    
    if (hosts.length === 0) {
      return 'No hosts found.';
    }

    let result = `Found ${hosts.length} host(s):\n\n`;
    
    for (const host of hosts) {
      result += `Name: ${host.name}\n`;
      result += `  ID: ${host.id}\n`;
      result += `  Type: ${host.type || 'N/A'}\n`;
      result += `  State: ${host.state || 'N/A'}\n`;
      result += `  IP Address: ${host.ipaddress || 'N/A'}\n`;
      result += `  Zone: ${host.zonename || 'N/A'}\n`;
      result += `  Cluster: ${host.clustername || 'N/A'}\n`;
      result += `  Hypervisor: ${host.hypervisor || 'N/A'}\n`;
      result += `  Resource State: ${host.resourcestate || 'N/A'}\n`;
      result += `  Created: ${host.created || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatServiceOfferingsResponse(response: any): string {
    const offerings = response.serviceoffering || [];
    
    if (offerings.length === 0) {
      return 'No service offerings found.';
    }

    let result = `Found ${offerings.length} service offering(s):\n\n`;
    
    for (const offering of offerings) {
      result += `Name: ${offering.name}\n`;
      result += `  ID: ${offering.id}\n`;
      result += `  Display Text: ${offering.displaytext || 'N/A'}\n`;
      result += `  CPU: ${offering.cpunumber || 'N/A'} cores @ ${offering.cpuspeed || 'N/A'} MHz\n`;
      result += `  Memory: ${offering.memory || 'N/A'} MB\n`;
      result += `  Storage Type: ${offering.storagetype || 'N/A'}\n`;
      result += `  Created: ${offering.created || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatServiceOfferingResponse(response: any, action: string): string {
    const offering = response.serviceoffering;
    
    if (!offering) {
      return `Service offering ${action} successfully.\n\nResponse: ${JSON.stringify(response, null, 2)}`;
    }

    let result = `Service offering ${action} successfully:\n\n`;
    result += `Name: ${offering.name}\n`;
    result += `ID: ${offering.id}\n`;
    result += `Display Text: ${offering.displaytext || 'N/A'}\n`;
    result += `CPU: ${offering.cpunumber || 'N/A'} cores @ ${offering.cpuspeed || 'N/A'} MHz\n`;
    result += `Memory: ${offering.memory || 'N/A'} MB\n`;
    result += `Storage Type: ${offering.storagetype || 'N/A'}\n`;
    result += `Created: ${offering.created || 'N/A'}\n`;

    return result;
  }

  private formatTemplatesResponse(response: any): string {
    const templates = response.template || [];
    
    if (templates.length === 0) {
      return 'No templates found.';
    }

    let result = `Found ${templates.length} template(s):\n\n`;
    
    for (const template of templates) {
      result += `Name: ${template.name}\n`;
      result += `  ID: ${template.id}\n`;
      result += `  Display Text: ${template.displaytext || 'N/A'}\n`;
      result += `  OS Type: ${template.ostypename || 'N/A'}\n`;
      result += `  Hypervisor: ${template.hypervisor || 'N/A'}\n`;
      result += `  Format: ${template.format || 'N/A'}\n`;
      result += `  Size: ${template.size ? (template.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : 'N/A'}\n`;
      result += `  Status: ${template.status || 'N/A'}\n`;
      result += `  Ready: ${template.isready ? 'Yes' : 'No'}\n`;
      result += `  Public: ${template.ispublic ? 'Yes' : 'No'}\n`;
      result += `  Created: ${template.created || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatTemplateResponse(operation: string, response: any): string {
    if (response.template) {
      const template = response.template;
      return `${operation}.\nTemplate: ${template.name} (${template.id})\nStatus: ${template.status || 'N/A'}\nCreated: ${template.created || 'N/A'}`;
    }
    
    if (response.jobid) {
      return `${operation}.\nJob ID: ${response.jobid}\nStatus: ${response.jobstatus === 0 ? 'In Progress' : response.jobstatus === 1 ? 'Completed' : 'Failed'}`;
    }
    
    return `${operation}.`;
  }

  private formatIsosResponse(response: any): string {
    const isos = response.iso || [];
    
    if (isos.length === 0) {
      return 'No ISOs found.';
    }

    let result = `Found ${isos.length} ISO(s):\n\n`;
    
    for (const iso of isos) {
      result += `Name: ${iso.name}\n`;
      result += `  ID: ${iso.id}\n`;
      result += `  Display Text: ${iso.displaytext || 'N/A'}\n`;
      result += `  OS Type: ${iso.ostypename || 'N/A'}\n`;
      result += `  Size: ${iso.size ? (iso.size / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}\n`;
      result += `  Bootable: ${iso.bootable ? 'Yes' : 'No'}\n`;
      result += `  Ready: ${iso.isready ? 'Yes' : 'No'}\n`;
      result += `  Public: ${iso.ispublic ? 'Yes' : 'No'}\n`;
      result += `  Featured: ${iso.isfeatured ? 'Yes' : 'No'}\n`;
      result += `  Created: ${iso.created || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatIsoResponse(operation: string, response: any): string {
    if (response.iso) {
      const iso = response.iso;
      return `${operation}.\nISO: ${iso.name} (${iso.id})\nBootable: ${iso.bootable ? 'Yes' : 'No'}\nCreated: ${iso.created || 'N/A'}`;
    }
    
    if (response.jobid) {
      return `${operation}.\nJob ID: ${response.jobid}\nStatus: ${response.jobstatus === 0 ? 'In Progress' : response.jobstatus === 1 ? 'Completed' : 'Failed'}`;
    }
    
    return `${operation}.`;
  }

  private formatVpcResponse(operation: string, response: any): string {
    if (response.vpc) {
      const vpc = response.vpc;
      return `${operation}.\nVPC: ${vpc.name} (${vpc.id})\nCIDR: ${vpc.cidr}\nState: ${vpc.state || 'N/A'}\nCreated: ${vpc.created || 'N/A'}`;
    }
    
    if (response.jobid) {
      return `${operation}.\nJob ID: ${response.jobid}\nStatus: ${response.jobstatus === 0 ? 'In Progress' : response.jobstatus === 1 ? 'Completed' : 'Failed'}`;
    }
    
    return `${operation}.`;
  }

  private formatVpcsResponse(response: any): string {
    const vpcs = response.vpc || [];
    
    if (vpcs.length === 0) {
      return 'No VPCs found.';
    }

    let result = `Found ${vpcs.length} VPC(s):\n\n`;
    
    for (const vpc of vpcs) {
      result += `Name: ${vpc.name}\n`;
      result += `  ID: ${vpc.id}\n`;
      result += `  Display Text: ${vpc.displaytext || 'N/A'}\n`;
      result += `  CIDR: ${vpc.cidr}\n`;
      result += `  State: ${vpc.state || 'N/A'}\n`;
      result += `  Zone: ${vpc.zonename || vpc.zoneid || 'N/A'}\n`;
      result += `  Network Domain: ${vpc.networkdomain || 'N/A'}\n`;
      result += `  Restart Required: ${vpc.restartrequired ? 'Yes' : 'No'}\n`;
      result += `  Created: ${vpc.created || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatPrivateGatewayResponse(operation: string, response: any): string {
    if (response.privategateway) {
      const gateway = response.privategateway;
      return `${operation}.\nGateway: ${gateway.gateway} (${gateway.id})\nIP: ${gateway.ipaddress}\nState: ${gateway.state || 'N/A'}`;
    }
    
    if (response.jobid) {
      return `${operation}.\nJob ID: ${response.jobid}\nStatus: ${response.jobstatus === 0 ? 'In Progress' : response.jobstatus === 1 ? 'Completed' : 'Failed'}`;
    }
    
    return `${operation}.`;
  }


  private formatStaticRouteResponse(operation: string, response: any): string {
    if (response.staticroute) {
      const route = response.staticroute;
      return `${operation}.\nRoute: ${route.cidr} (${route.id})\nGateway: ${route.gatewayid}\nState: ${route.state || 'N/A'}`;
    }
    
    if (response.jobid) {
      return `${operation}.\nJob ID: ${response.jobid}\nStatus: ${response.jobstatus === 0 ? 'In Progress' : response.jobstatus === 1 ? 'Completed' : 'Failed'}`;
    }
    
    return `${operation}.`;
  }


  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      Logger.error('MCP Server Error', error);
    };

    process.on('SIGINT', async () => {
      Logger.info('Received SIGINT, shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      Logger.info('Received SIGTERM, shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });
  }

  // Virtual Machine Management Handlers
  private async handleDeployVirtualMachine(args: any): Promise<any> {
    const requiredParams = ['serviceofferingid', 'templateid', 'zoneid'];
    const optionalParams = [
      // Basic VM configuration
      'name', 'displayname', 'account', 'group', 'projectid', 'domainid',
      
      // Network configuration
      'networkids', 'securitygroupids', 'securitygroupnames', 'iptonetworklist',
      'nicnetworklist', 'macaddress', 'dhcpoptionsnetworklist',
      
      // Storage configuration
      'diskofferingid', 'rootdisksize', 'size', 'rootdiskcontroller',
      'datadiskofferinglist', 'overridediskofferingid',
      
      // Placement and affinity
      'affinitygroupids', 'affinitygroupnames', 'hostid', 'clusterid', 'podid',
      'deploymentplanner', 'hypervisor',
      
      // Boot configuration
      'bootmode', 'boottype', 'startvm',
      
      // Authentication and user data
      'keypair', 'userdata', 'sshkeypairs',
      
      // Advanced configuration
      'details', 'extraconfig', 'properties', 'customid',
      
      // Backup and recovery
      'backupofferingid', 'recoverypoint',
      
      // Miscellaneous
      'fordisplay', 'copyimagetags', 'dynamicscalingenabled'
    ];
    
    const params = this.buildParams(args, [...requiredParams, ...optionalParams], requiredParams);
    
    // Enhanced parameter validation
    if (params.userdata) {
      try {
        const userdataSize = Buffer.byteLength(params.userdata, 'base64');
        if (userdataSize > 1048576) { // 1MB limit
          throw new Error('Userdata exceeds 1MB limit');
        }
      } catch (error) {
        throw new Error('Invalid userdata format - must be base64 encoded');
      }
    }
    
    // Validate boot mode options
    if (params.bootmode && !['Legacy', 'Secure'].includes(params.bootmode)) {
      throw new Error('Invalid boot mode. Must be Legacy or Secure');
    }
    
    // Validate boot type options
    if (params.boottype && !['BIOS', 'UEFI'].includes(params.boottype)) {
      throw new Error('Invalid boot type. Must be BIOS or UEFI');
    }
    
    // Validate mutually exclusive affinity group parameters
    if (params.affinitygroupids && params.affinitygroupnames) {
      throw new Error('Cannot specify both affinitygroupids and affinitygroupnames');
    }
    
    // Validate mutually exclusive security group parameters
    if (params.securitygroupids && params.securitygroupnames) {
      throw new Error('Cannot specify both securitygroupids and securitygroupnames');
    }
    
    // Validate root disk size parameters
    if (params.rootdisksize && params.size) {
      throw new Error('Cannot specify both rootdisksize and size parameters');
    }
    
    const response = await this.client.deployVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM deployment', response)
        }
      ]
    };
  }

  private async handleStartVirtualMachine(args: any): Promise<any> {
    const requiredParams = ['id'];
    const optionalParams = [
      'bootintosetup',      // Boot into hardware setup menu
      'clusterid',          // Destination cluster ID (root admin only)
      'considerlasthost',   // Consider last host when starting VM (default: true)
      'deploymentplanner',  // Deployment planner for VM allocation (root admin only)
      'hostid',             // Destination host ID (root admin only)
      'podid'               // Destination pod ID (root admin only)
    ];
    
    const params = this.buildParams(args, [...requiredParams, ...optionalParams], requiredParams);
    
    // Validate boolean parameters
    if (params.bootintosetup !== undefined && typeof params.bootintosetup !== 'boolean') {
      throw new Error('bootintosetup must be a boolean value');
    }
    
    if (params.considerlasthost !== undefined && typeof params.considerlasthost !== 'boolean') {
      throw new Error('considerlasthost must be a boolean value');
    }
    
    // Note: Admin-only parameters (clusterid, deploymentplanner, hostid, podid) 
    // will be validated by CloudStack API based on user permissions
    
    const response = await this.client.startVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM start', response)
        }
      ]
    };
  }

  private async handleStopVirtualMachine(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Virtual machine ID is required');
    }
    
    const params: Record<string, any> = { id: args.id };
    if (args.forced) {
      params.forced = args.forced;
    }
    
    const response = await this.client.stopVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM stop', response)
        }
      ]
    };
  }

  private async handleRebootVirtualMachine(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Virtual machine ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.rebootVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM reboot', response)
        }
      ]
    };
  }

  private async handleDestroyVirtualMachine(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Virtual machine ID is required');
    }
    
    const params: Record<string, any> = { id: args.id };
    if (args.expunge) {
      params.expunge = args.expunge;
    }
    
    const response = await this.client.destroyVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM destroy', response)
        }
      ]
    };
  }

  private async handleUpdateVirtualMachine(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Virtual machine ID is required');
    }
    
    const allowedParams = ['id', 'displayname', 'group', 'haenable', 'ostypeid', 'userdata'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVirtualMachineUpdateResponse(response)
        }
      ]
    };
  }

  private async handleChangeServiceOffering(args: any): Promise<any> {
    if (!args.id || !args.serviceofferingid) {
      throw new Error('Virtual machine ID and service offering ID are required');
    }
    
    const params = {
      id: args.id,
      serviceofferingid: args.serviceofferingid
    };
    
    const response = await this.client.changeServiceForVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVirtualMachineUpdateResponse(response)
        }
      ]
    };
  }

  // Response Formatting Helpers
  private formatAsyncJobResponse(operation: string, response: any): string {
    if (response.jobid) {
      return `${operation} initiated successfully.\nJob ID: ${response.jobid}\nStatus: The operation is running asynchronously. You can check the job status or list VMs to see the current state.`;
    }
    
    if (response.virtualmachine) {
      const vm = response.virtualmachine;
      return `${operation} completed successfully.\nVM: ${vm.name} (${vm.id})\nState: ${vm.state}\nDisplay Name: ${vm.displayname || 'N/A'}`;
    }
    
    return `${operation} initiated. Please check the virtual machine status for updates.`;
  }

  private formatVirtualMachineUpdateResponse(response: any): string {
    if (response.virtualmachine) {
      const vm = response.virtualmachine;
      return `Virtual machine updated successfully.\nVM: ${vm.name} (${vm.id})\nDisplay Name: ${vm.displayname || 'N/A'}\nState: ${vm.state}\nUpdated: ${new Date().toISOString()}`;
    }
    
    return 'Virtual machine update completed successfully.';
  }

  // Volume Management Handlers
  private async handleCreateVolume(args: any): Promise<any> {
    const requiredParams = ['name', 'diskofferingid', 'zoneid'];
    const optionalParams = ['size', 'account'];
    const params = this.buildParams(args, [...requiredParams, ...optionalParams]);
    
    // Validate required parameters
    for (const param of requiredParams) {
      if (!params[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
    
    const response = await this.client.createVolume(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Volume creation', response)
        }
      ]
    };
  }

  private async handleAttachVolume(args: any): Promise<any> {
    if (!args.id || !args.virtualmachineid) {
      throw new Error('Volume ID and virtual machine ID are required');
    }
    
    const params: Record<string, any> = {
      id: args.id,
      virtualmachineid: args.virtualmachineid
    };
    
    if (args.deviceid !== undefined) {
      params.deviceid = args.deviceid;
    }
    
    const response = await this.client.attachVolume(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Volume attachment', response)
        }
      ]
    };
  }

  private async handleDetachVolume(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Volume ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.detachVolume(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Volume detachment', response)
        }
      ]
    };
  }

  private async handleDeleteVolume(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Volume ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteVolume(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Volume deletion', response)
        }
      ]
    };
  }

  private async handleResizeVolume(args: any): Promise<any> {
    if (!args.id || !args.size) {
      throw new Error('Volume ID and size are required');
    }
    
    const params: Record<string, any> = {
      id: args.id,
      size: args.size
    };
    
    if (args.shrinkok !== undefined) {
      params.shrinkok = args.shrinkok;
    }
    
    const response = await this.client.resizeVolume(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Volume resize', response)
        }
      ]
    };
  }

  // Snapshot Management Handlers
  private async handleCreateSnapshot(args: any): Promise<any> {
    if (!args.volumeid) {
      throw new Error('Volume ID is required');
    }
    
    const allowedParams = ['volumeid', 'name', 'account'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createSnapshot(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Snapshot creation', response)
        }
      ]
    };
  }

  private async handleDeleteSnapshot(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Snapshot ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteSnapshot(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Snapshot deletion', response)
        }
      ]
    };
  }

  private async handleCreateVolumeFromSnapshot(args: any): Promise<any> {
    if (!args.snapshotid || !args.name) {
      throw new Error('Snapshot ID and volume name are required');
    }
    
    const allowedParams = ['snapshotid', 'name', 'account'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createVolumeFromSnapshot(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Volume creation from snapshot', response)
        }
      ]
    };
  }

  // Security Group Management Handlers
  private async handleCreateSecurityGroup(args: any): Promise<any> {
    if (!args.name) {
      throw new Error('Security group name is required');
    }
    
    const allowedParams = ['name', 'description', 'account'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createSecurityGroup(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatSecurityGroupResponse('Security group creation', response)
        }
      ]
    };
  }

  private async handleDeleteSecurityGroup(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Security group ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteSecurityGroup(params);
    
    return {
      content: [
        {
          type: 'text',
          text: 'Security group deleted successfully.'
        }
      ]
    };
  }

  private async handleAuthorizeSecurityGroupIngress(args: any): Promise<any> {
    if (!args.securitygroupid || !args.protocol) {
      throw new Error('Security group ID and protocol are required');
    }
    
    const allowedParams = ['securitygroupid', 'protocol', 'startport', 'endport', 'cidrlist'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.authorizeSecurityGroupIngress(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Security group rule authorization', response)
        }
      ]
    };
  }

  private async handleRevokeSecurityGroupIngress(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Rule ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.revokeSecurityGroupIngress(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Security group rule revocation', response)
        }
      ]
    };
  }

  private formatSecurityGroupResponse(operation: string, response: any): string {
    if (response.securitygroup) {
      const sg = response.securitygroup;
      return `${operation} completed successfully.\nSecurity Group: ${sg.name} (${sg.id})\nDescription: ${sg.description || 'N/A'}\nAccount: ${sg.account || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private async handleListSecurityGroups(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'securitygroupname', 'tags', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listSecurityGroups(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatSecurityGroupListResponse(response)
        }
      ]
    };
  }

  private async handleAuthorizeSecurityGroupEgress(args: any): Promise<any> {
    if (!args.securitygroupid || !args.protocol) {
      throw new Error('Security group ID and protocol are required');
    }
    
    const allowedParams = ['securitygroupid', 'protocol', 'startport', 'endport', 'cidrlist'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.authorizeSecurityGroupEgress(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Security group egress rule authorization', response)
        }
      ]
    };
  }

  private async handleRevokeSecurityGroupEgress(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Rule ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.revokeSecurityGroupEgress(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Security group egress rule revocation', response)
        }
      ]
    };
  }

  private formatSecurityGroupListResponse(response: any): string {
    const groups = response.securitygroup || [];
    
    if (groups.length === 0) {
      return 'No security groups found.';
    }
    
    let result = `Found ${groups.length} security group(s):\n\n`;
    
    for (const group of groups) {
      result += `Security Group: ${group.name} (${group.id})\n`;
      result += `  Description: ${group.description || 'N/A'}\n`;
      result += `  Account: ${group.account || 'N/A'}\n`;
      result += `  Domain: ${group.domain || 'N/A'}\n`;
      
      if (group.ingressrule && group.ingressrule.length > 0) {
        result += `  Ingress Rules (${group.ingressrule.length}):\n`;
        for (const rule of group.ingressrule) {
          result += `    ${rule.protocol}`;
          if (rule.startport) {
            result += `:${rule.startport}`;
            if (rule.endport && rule.endport !== rule.startport) {
              result += `-${rule.endport}`;
            }
          }
          result += ` from ${rule.cidr || rule.securitygroupname || 'Any'}\n`;
        }
      }
      
      if (group.egressrule && group.egressrule.length > 0) {
        result += `  Egress Rules (${group.egressrule.length}):\n`;
        for (const rule of group.egressrule) {
          result += `    ${rule.protocol}`;
          if (rule.startport) {
            result += `:${rule.startport}`;
            if (rule.endport && rule.endport !== rule.startport) {
              result += `-${rule.endport}`;
            }
          }
          result += ` to ${rule.cidr || rule.securitygroupname || 'Any'}\n`;
        }
      }
      
      result += '\n';
    }
    
    return result.trim();
  }

  // Advanced Virtual Machine Management Handlers
  private async handleMigrateVirtualMachine(args: any): Promise<any> {
    if (!args.virtualmachineid) {
      throw new Error('Virtual machine ID is required');
    }
    
    const allowedParams = ['virtualmachineid', 'hostid'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.migrateVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM migration', response)
        }
      ]
    };
  }

  private async handleScaleVirtualMachine(args: any): Promise<any> {
    if (!args.id || !args.serviceofferingid) {
      throw new Error('Virtual machine ID and service offering ID are required');
    }
    
    const allowedParams = ['id', 'serviceofferingid', 'details'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.scaleVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM scaling', response)
        }
      ]
    };
  }

  private async handleResetVMPassword(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Virtual machine ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.resetPasswordForVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM password reset', response)
        }
      ]
    };
  }

  private async handleGetVMPassword(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Virtual machine ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.getVMPassword(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVMPasswordResponse(response)
        }
      ]
    };
  }

  private async handleAddNicToVM(args: any): Promise<any> {
    if (!args.virtualmachineid || !args.networkid) {
      throw new Error('Virtual machine ID and network ID are required');
    }
    
    const allowedParams = ['virtualmachineid', 'networkid', 'ipaddress'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.addNicToVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('NIC addition', response)
        }
      ]
    };
  }

  private async handleRemoveNicFromVM(args: any): Promise<any> {
    if (!args.virtualmachineid || !args.nicid) {
      throw new Error('Virtual machine ID and NIC ID are required');
    }
    
    const params = {
      virtualmachineid: args.virtualmachineid,
      nicid: args.nicid
    };
    
    const response = await this.client.removeNicFromVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('NIC removal', response)
        }
      ]
    };
  }

  private async handleRecoverVirtualMachine(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Virtual machine ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.recoverVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVirtualMachineUpdateResponse(response)
        }
      ]
    };
  }

  private async handleExpungeVirtualMachine(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Virtual machine ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.expungeVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM expunge', response)
        }
      ]
    };
  }

  // Additional VM Management Methods
  private async handleAssignVirtualMachineToBackupOffering(args: any): Promise<any> {
    const requiredParams = ['virtualmachineid', 'backupofferingid'];
    const params = this.buildParams(args, requiredParams, requiredParams);
    
    const response = await this.client.assignVirtualMachineToBackupOffering(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM backup offering assignment', response)
        }
      ]
    };
  }

  private async handleRemoveVirtualMachineFromBackupOffering(args: any): Promise<any> {
    const requiredParams = ['virtualmachineid'];
    const params = this.buildParams(args, requiredParams, requiredParams);
    
    const response = await this.client.removeVirtualMachineFromBackupOffering(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM backup offering removal', response)
        }
      ]
    };
  }

  private async handleResetSSHKeyForVirtualMachine(args: any): Promise<any> {
    const requiredParams = ['id'];
    const optionalParams = ['keypair', 'account', 'projectid'];
    const params = this.buildParams(args, [...requiredParams, ...optionalParams], requiredParams);
    
    const response = await this.client.resetSSHKeyForVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('SSH key reset', response)
        }
      ]
    };
  }

  private async handleRevertToVMSnapshot(args: any): Promise<any> {
    const requiredParams = ['vmsnapshotid'];
    const params = this.buildParams(args, requiredParams, requiredParams);
    
    const response = await this.client.revertToVMSnapshot(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM snapshot revert', response)
        }
      ]
    };
  }

  private async handleUnmanageVirtualMachine(args: any): Promise<any> {
    const requiredParams = ['id'];
    const params = this.buildParams(args, requiredParams, requiredParams);
    
    const response = await this.client.unmanageVirtualMachine(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM unmanage', response)
        }
      ]
    };
  }

  private async handleMigrateVirtualMachineWithVolume(args: any): Promise<any> {
    const requiredParams = ['virtualmachineid', 'hostid'];
    const optionalParams = ['migrateto'];
    const params = this.buildParams(args, [...requiredParams, ...optionalParams], requiredParams);
    
    const response = await this.client.migrateVirtualMachineWithVolume(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM migration with volume', response)
        }
      ]
    };
  }

  private async handleImportUnmanagedInstance(args: any): Promise<any> {
    const requiredParams = ['clusterid', 'name'];
    const optionalParams = ['displayname', 'hostname', 'account', 'domainid', 'projectid'];
    const params = this.buildParams(args, [...requiredParams, ...optionalParams], requiredParams);
    
    const response = await this.client.importUnmanagedInstance(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Unmanaged instance import', response)
        }
      ]
    };
  }

  private async handleImportVm(args: any): Promise<any> {
    const requiredParams = ['name', 'zoneid'];
    const optionalParams = ['displayname', 'account', 'domainid', 'projectid', 'templateid'];
    const params = this.buildParams(args, [...requiredParams, ...optionalParams], requiredParams);
    
    const response = await this.client.importVm(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM import', response)
        }
      ]
    };
  }

  private async handleGetVirtualMachineUserData(args: any): Promise<any> {
    const requiredParams = ['virtualmachineid'];
    const params = this.buildParams(args, requiredParams, requiredParams);
    
    const response = await this.client.getVirtualMachineUserData(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserDataResponse(response)
        }
      ]
    };
  }

  private async handleListUnmanagedInstances(args: any): Promise<any> {
    const allowedParams = ['clusterid', 'name', 'page', 'pagesize'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listUnmanagedInstances(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUnmanagedInstancesResponse(response)
        }
      ]
    };
  }

  private async handleListVMSchedule(args: any): Promise<any> {
    const allowedParams = ['virtualmachineid', 'id', 'page', 'pagesize'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listVMSchedule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVMScheduleResponse(response)
        }
      ]
    };
  }

  private async handleListVirtualMachinesMetrics(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'projectid', 'zoneid', 'ids', 'page', 'pagesize'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listVirtualMachinesMetrics(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVirtualMachinesMetricsResponse(response)
        }
      ]
    };
  }

  private async handleListVirtualMachinesUsageHistory(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'projectid', 'zoneid', 'ids', 'startdate', 'enddate', 'page', 'pagesize'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listVirtualMachinesUsageHistory(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVirtualMachinesUsageHistoryResponse(response)
        }
      ]
    };
  }

  private async handleListVmsForImport(args: any): Promise<any> {
    const allowedParams = ['zoneid', 'clusterid', 'page', 'pagesize'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listVmsForImport(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVmsForImportResponse(response)
        }
      ]
    };
  }

  private async handleUpdateVMSchedule(args: any): Promise<any> {
    const requiredParams = ['id'];
    const optionalParams = ['description', 'startdate', 'enddate', 'timezone', 'interval'];
    const params = this.buildParams(args, [...requiredParams, ...optionalParams], requiredParams);
    
    const response = await this.client.updateVMSchedule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVMScheduleResponse(response)
        }
      ]
    };
  }

  private async handleCleanVMReservations(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'projectid'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.cleanVMReservations(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM reservations cleanup', response)
        }
      ]
    };
  }

  // Advanced Volume Management Handlers
  private async handleMigrateVolume(args: any): Promise<any> {
    if (!args.volumeid || !args.storageid) {
      throw new Error('Volume ID and storage pool ID are required');
    }
    
    const allowedParams = ['volumeid', 'storageid', 'livemigrate'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.migrateVolume(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Volume migration', response)
        }
      ]
    };
  }

  private async handleExtractVolume(args: any): Promise<any> {
    const requiredParams = ['id', 'zoneid', 'mode'];
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
    
    const params = this.buildParams(args, requiredParams);
    const response = await this.client.extractVolume(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatExtractResponse('Volume extraction', response)
        }
      ]
    };
  }

  private async handleUploadVolume(args: any): Promise<any> {
    const requiredParams = ['name', 'url', 'zoneid', 'format'];
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
    
    const allowedParams = [...requiredParams, 'diskofferingid'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.uploadVolume(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Volume upload', response)
        }
      ]
    };
  }

  private async handleListVolumeMetrics(args: any): Promise<any> {
    const allowedParams = ['ids', 'account'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listVolumeMetrics(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatVolumeMetricsResponse(response)
        }
      ]
    };
  }

  // Network Management Handlers
  private async handleCreateNetwork(args: any): Promise<any> {
    const requiredParams = ['name', 'networkofferingid', 'zoneid'];
    const optionalParams = [
      // Basic network configuration
      'displaytext', 'account', 'domainid', 'projectid',
      
      // Network ACL configuration
      'aclid', 'acltype',
      
      // BGP configuration
      'asnumber', 'bgppeerids',
      
      // IP and CIDR configuration
      'gateway', 'netmask', 'startip', 'endip', 'cidrsize',
      
      // DNS configuration
      'dns1', 'dns2',
      
      // VLAN and physical network
      'vlan', 'physicalnetworkid', 'bypassvlanoverlapcheck',
      
      // Network domain and display
      'networkdomain', 'displaynetwork',
      
      // VPC association
      'vpcid', 'associatednetworkid'
    ];
    
    const params = this.buildParams(args, [...requiredParams, ...optionalParams], requiredParams);
    
    // Enhanced parameter validation
    if (params.dns1 && !this.isValidIPAddress(params.dns1)) {
      throw new Error('Invalid DNS1 IP address format');
    }
    
    if (params.dns2 && !this.isValidIPAddress(params.dns2)) {
      throw new Error('Invalid DNS2 IP address format');
    }
    
    if (params.gateway && !this.isValidIPAddress(params.gateway)) {
      throw new Error('Invalid gateway IP address format');
    }
    
    if (params.startip && !this.isValidIPAddress(params.startip)) {
      throw new Error('Invalid start IP address format');
    }
    
    if (params.endip && !this.isValidIPAddress(params.endip)) {
      throw new Error('Invalid end IP address format');
    }
    
    // Validate CIDR size
    if (params.cidrsize && (params.cidrsize < 16 || params.cidrsize > 28)) {
      throw new Error('CIDR size must be between 16 and 28');
    }
    
    // Validate ACL type
    if (params.acltype && !['account', 'domain'].includes(params.acltype)) {
      throw new Error('ACL type must be either account or domain');
    }
    
    // Validate boolean parameters
    if (params.bypassvlanoverlapcheck !== undefined && typeof params.bypassvlanoverlapcheck !== 'boolean') {
      throw new Error('bypassvlanoverlapcheck must be a boolean value');
    }
    
    if (params.displaynetwork !== undefined && typeof params.displaynetwork !== 'boolean') {
      throw new Error('displaynetwork must be a boolean value');
    }
    
    // Validate AS number format
    if (params.asnumber && (!/^\d+$/.test(params.asnumber) || parseInt(params.asnumber) <= 0)) {
      throw new Error('AS number must be a positive integer');
    }
    
    const response = await this.client.createNetwork(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatNetworkResponse('Network creation', response)
        }
      ]
    };
  }

  private async handleDeleteNetwork(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Network ID is required');
    }
    
    const allowedParams = ['id', 'forced'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.deleteNetwork(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Network deletion', response)
        }
      ]
    };
  }

  private async handleUpdateNetwork(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Network ID is required');
    }
    
    const allowedParams = ['id', 'name', 'displaytext', 'networkdomain', 'changecidr'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateNetwork(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatNetworkResponse('Network update', response)
        }
      ]
    };
  }

  private async handleRestartNetwork(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Network ID is required');
    }
    
    const allowedParams = ['id', 'cleanup'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.restartNetwork(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Network restart', response)
        }
      ]
    };
  }

  // Physical Network Management Handlers
  private async handleCreatePhysicalNetwork(args: any): Promise<any> {
    const requiredParams = ['name', 'zoneid'];
    const optionalParams = [
      'domainid', 'tags', 'isolationmethods', 'broadcastdomainrange', 'vlan'
    ];

    // Validate required parameters
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Required parameter missing: ${param}`);
      }
    }

    // Enhanced parameter validation
    if (args.isolationmethods) {
      const validMethods = ['VLAN', 'GRE', 'L3', 'VXLAN', 'STT'];
      const methods = args.isolationmethods.split(',').map((m: string) => m.trim());
      for (const method of methods) {
        if (!validMethods.includes(method)) {
          throw new Error(`Invalid isolation method: ${method}. Must be one of: ${validMethods.join(', ')}`);
        }
      }
    }

    if (args.broadcastdomainrange) {
      const validRanges = ['Zone', 'Pod', 'Cluster'];
      if (!validRanges.includes(args.broadcastdomainrange)) {
        throw new Error(`Invalid broadcast domain range. Must be one of: ${validRanges.join(', ')}`);
      }
    }

    const params = this.buildParams(args, [...requiredParams, ...optionalParams]);
    const response = await this.client.createPhysicalNetwork(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatPhysicalNetworkResponse('Physical network created', response)
        }
      ]
    };
  }

  private async handleListPhysicalNetworks(args: any): Promise<any> {
    const allowedParams = [
      'id', 'name', 'zoneid', 'domainid', 'keyword', 'page', 'pagesize'
    ];

    // Enhanced parameter validation
    if (args.page) {
      const page = parseInt(args.page);
      if (isNaN(page) || page < 1) {
        throw new Error('Invalid page number. Must be a positive integer');
      }
    }

    if (args.pagesize) {
      const pagesize = parseInt(args.pagesize);
      if (isNaN(pagesize) || pagesize < 1 || pagesize > 500) {
        throw new Error('Invalid page size. Must be between 1 and 500');
      }
    }

    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listPhysicalNetworks(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatPhysicalNetworksResponse(response)
        }
      ]
    };
  }

  private async handleUpdatePhysicalNetwork(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Physical network ID is required');
    }

    const allowedParams = ['id', 'name', 'tags', 'vlan', 'state'];

    // Enhanced parameter validation
    if (args.state) {
      const validStates = ['Enabled', 'Disabled'];
      if (!validStates.includes(args.state)) {
        throw new Error(`Invalid state. Must be one of: ${validStates.join(', ')}`);
      }
    }

    const params = this.buildParams(args, allowedParams);
    const response = await this.client.updatePhysicalNetwork(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatPhysicalNetworkResponse('Physical network updated', response)
        }
      ]
    };
  }

  private async handleDeletePhysicalNetwork(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Physical network ID is required');
    }

    const params = this.buildParams(args, ['id']);
    const response = await this.client.deletePhysicalNetwork(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Physical network deletion', response)
        }
      ]
    };
  }

  // Traffic Management Handlers
  private async handleAddTrafficType(args: any): Promise<any> {
    const requiredParams = ['physicalnetworkid', 'traffictype'];
    const optionalParams = [
      'kvmnetworklabel', 'vmwarenetworklabel', 'xennetworklabel', 'hypervnetworklabel', 'vlan'
    ];

    // Validate required parameters
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Required parameter missing: ${param}`);
      }
    }

    // Enhanced parameter validation
    if (args.traffictype) {
      const validTrafficTypes = ['Guest', 'Management', 'Public', 'Storage'];
      if (!validTrafficTypes.includes(args.traffictype)) {
        throw new Error(`Invalid traffic type. Must be one of: ${validTrafficTypes.join(', ')}`);
      }
    }

    if (args.vlan) {
      const vlanId = parseInt(args.vlan);
      if (isNaN(vlanId) || vlanId < 1 || vlanId > 4094) {
        throw new Error('Invalid VLAN ID. Must be between 1 and 4094');
      }
    }

    const params = this.buildParams(args, [...requiredParams, ...optionalParams]);
    const response = await this.client.addTrafficType(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTrafficTypeResponse('Traffic type added', response)
        }
      ]
    };
  }

  private async handleDeleteTrafficType(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Traffic type ID is required');
    }

    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteTrafficType(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Traffic type deletion', response)
        }
      ]
    };
  }

  private async handleUpdateTrafficType(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Traffic type ID is required');
    }

    const allowedParams = ['id', 'kvmnetworklabel', 'vmwarenetworklabel', 'xennetworklabel', 'hypervnetworklabel'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.updateTrafficType(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTrafficTypeResponse('Traffic type updated', response)
        }
      ]
    };
  }

  private async handleListTrafficTypes(args: any): Promise<any> {
    const allowedParams = ['physicalnetworkid', 'keyword', 'page', 'pagesize'];

    // Enhanced parameter validation
    if (args.page) {
      const page = parseInt(args.page);
      if (isNaN(page) || page < 1) {
        throw new Error('Invalid page number. Must be a positive integer');
      }
    }

    if (args.pagesize) {
      const pagesize = parseInt(args.pagesize);
      if (isNaN(pagesize) || pagesize < 1 || pagesize > 500) {
        throw new Error('Invalid page size. Must be between 1 and 500');
      }
    }

    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listTrafficTypes(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatTrafficTypesResponse(response)
        }
      ]
    };
  }

  private async handleGenerateUsageRecords(args: any): Promise<any> {
    const requiredParams = ['startdate', 'enddate'];
    const optionalParams = ['domainid'];

    // Validate required parameters
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Required parameter missing: ${param}`);
      }
    }

    // Enhanced parameter validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(args.startdate)) {
      throw new Error('Invalid start date format. Expected YYYY-MM-DD');
    }
    if (!dateRegex.test(args.enddate)) {
      throw new Error('Invalid end date format. Expected YYYY-MM-DD');
    }

    const startDate = new Date(args.startdate);
    const endDate = new Date(args.enddate);
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    const params = this.buildParams(args, [...requiredParams, ...optionalParams]);
    const response = await this.client.generateUsageRecords(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Usage records generation', response)
        }
      ]
    };
  }

  private async handleListUsageRecords(args: any): Promise<any> {
    const requiredParams = ['startdate', 'enddate'];
    const optionalParams = ['account', 'domainid', 'projectid', 'type', 'page', 'pagesize'];

    // Validate required parameters
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Required parameter missing: ${param}`);
      }
    }

    // Enhanced parameter validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(args.startdate)) {
      throw new Error('Invalid start date format. Expected YYYY-MM-DD');
    }
    if (!dateRegex.test(args.enddate)) {
      throw new Error('Invalid end date format. Expected YYYY-MM-DD');
    }

    const startDate = new Date(args.startdate);
    const endDate = new Date(args.enddate);
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    if (args.page) {
      const page = parseInt(args.page);
      if (isNaN(page) || page < 1) {
        throw new Error('Invalid page number. Must be a positive integer');
      }
    }

    if (args.pagesize) {
      const pagesize = parseInt(args.pagesize);
      if (isNaN(pagesize) || pagesize < 1 || pagesize > 500) {
        throw new Error('Invalid page size. Must be between 1 and 500');
      }
    }

    const params = this.buildParams(args, [...requiredParams, ...optionalParams]);
    const response = await this.client.listUsageRecords(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUsageRecordsResponse(response)
        }
      ]
    };
  }

  private async handleListNetworkOfferings(args: any): Promise<any> {
    const allowedParams = ['name', 'state', 'availability', 'isdefault'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listNetworkOfferings(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatNetworkOfferingsResponse(response)
        }
      ]
    };
  }

  // IP Address Management Handlers
  private async handleAssociateIpAddress(args: any): Promise<any> {
    if (!args.zoneid) {
      throw new Error('Zone ID is required');
    }
    
    const allowedParams = ['zoneid', 'networkid', 'account', 'isportable'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.associateIpAddress(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('IP address association', response)
        }
      ]
    };
  }

  private async handleDisassociateIpAddress(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('IP address ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.disassociateIpAddress(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('IP address disassociation', response)
        }
      ]
    };
  }

  private async handleListPublicIpAddresses(args: any): Promise<any> {
    const allowedParams = ['account', 'zoneid', 'associatednetworkid', 'isstaticnat'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listPublicIpAddresses(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatPublicIpAddressesResponse(response)
        }
      ]
    };
  }

  private async handleEnableStaticNat(args: any): Promise<any> {
    if (!args.ipaddressid || !args.virtualmachineid) {
      throw new Error('IP address ID and virtual machine ID are required');
    }
    
    const allowedParams = ['ipaddressid', 'virtualmachineid', 'networkid'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.enableStaticNat(params);
    
    return {
      content: [
        {
          type: 'text',
          text: 'Static NAT enabled successfully.'
        }
      ]
    };
  }

  private async handleDisableStaticNat(args: any): Promise<any> {
    if (!args.ipaddressid) {
      throw new Error('IP address ID is required');
    }
    
    const params = { ipaddressid: args.ipaddressid };
    const response = await this.client.disableStaticNat(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Static NAT disable', response)
        }
      ]
    };
  }

  // Port Forwarding Handlers
  private async handleCreatePortForwardingRule(args: any): Promise<any> {
    const requiredParams = ['ipaddressid', 'protocol', 'publicport', 'privateport', 'virtualmachineid'];
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
    
    const allowedParams = [...requiredParams, 'publicendport', 'privateendport'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createPortForwardingRule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Port forwarding rule creation', response)
        }
      ]
    };
  }

  private async handleDeletePortForwardingRule(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Port forwarding rule ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deletePortForwardingRule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Port forwarding rule deletion', response)
        }
      ]
    };
  }

  private async handleListPortForwardingRules(args: any): Promise<any> {
    const allowedParams = ['account', 'ipaddressid', 'networkid'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listPortForwardingRules(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatPortForwardingRulesResponse(response)
        }
      ]
    };
  }

  // Response Formatting Helpers for New Features
  private formatVMPasswordResponse(response: any): string {
    if (response.password) {
      return `VM Password retrieved successfully.\nPassword: ${response.password}\nEncrypted: ${response.encryptedpassword ? 'Yes' : 'No'}`;
    }
    
    return 'VM password retrieval completed. Please check the VM console for the password.';
  }

  private formatExtractResponse(operation: string, response: any): string {
    if (response.url) {
      return `${operation} initiated successfully.\nDownload URL: ${response.url}\nMode: ${response.mode}\nState: ${response.state}`;
    }
    
    return `${operation} initiated. Please check the job status for the download URL.`;
  }

  private formatVolumeMetricsResponse(response: any): string {
    const metrics = response.volume || [];
    
    if (metrics.length === 0) {
      return 'No volume metrics found.';
    }

    let result = `Found metrics for ${metrics.length} volume(s):\n\n`;
    
    for (const metric of metrics) {
      result += `Volume: ${metric.name} (${metric.id})\n`;
      result += `  Size: ${metric.size ? (metric.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : 'N/A'}\n`;
      result += `  IOPS: ${metric.diskIopsTotal || 'N/A'}\n`;
      result += `  Throughput: ${metric.diskKbsTotal || 'N/A'} KB/s\n`;
      result += `  Storage Pool: ${metric.storage || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatNetworkResponse(operation: string, response: any): string {
    if (response.network) {
      const network = response.network;
      return `${operation} completed successfully.\nNetwork: ${network.name} (${network.id})\nType: ${network.type}\nState: ${network.state}\nCIDR: ${network.cidr || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatNetworkOfferingsResponse(response: any): string {
    const offerings = response.networkoffering || [];
    
    if (offerings.length === 0) {
      return 'No network offerings found.';
    }

    let result = `Found ${offerings.length} network offering(s):\n\n`;
    
    for (const offering of offerings) {
      result += `Name: ${offering.name}\n`;
      result += `  ID: ${offering.id}\n`;
      result += `  Display Text: ${offering.displaytext || 'N/A'}\n`;
      result += `  State: ${offering.state || 'N/A'}\n`;
      result += `  Availability: ${offering.availability || 'N/A'}\n`;
      result += `  Guest Type: ${offering.guestiptype || 'N/A'}\n`;
      result += `  Traffic Type: ${offering.traffictype || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatPublicIpAddressesResponse(response: any): string {
    const ips = response.publicipaddress || [];
    
    if (ips.length === 0) {
      return 'No public IP addresses found.';
    }

    let result = `Found ${ips.length} public IP address(es):\n\n`;
    
    for (const ip of ips) {
      result += `IP Address: ${ip.ipaddress}\n`;
      result += `  ID: ${ip.id}\n`;
      result += `  State: ${ip.state || 'N/A'}\n`;
      result += `  Zone: ${ip.zonename || 'N/A'}\n`;
      result += `  Network: ${ip.associatednetworkname || 'N/A'}\n`;
      result += `  VM: ${ip.virtualmachinename || 'N/A'}\n`;
      result += `  Static NAT: ${ip.isstaticnat ? 'Enabled' : 'Disabled'}\n`;
      result += `  Source NAT: ${ip.issourcenat ? 'Yes' : 'No'}\n\n`;
    }

    return result;
  }

  private formatPortForwardingRulesResponse(response: any): string {
    const rules = response.portforwardingrule || [];
    
    if (rules.length === 0) {
      return 'No port forwarding rules found.';
    }

    let result = `Found ${rules.length} port forwarding rule(s):\n\n`;
    
    for (const rule of rules) {
      result += `Rule: ${rule.ipaddress}:${rule.publicport} → ${rule.privateport}\n`;
      result += `  ID: ${rule.id}\n`;
      result += `  Protocol: ${rule.protocol || 'N/A'}\n`;
      result += `  Public Port: ${rule.publicport}${rule.publicendport ? `-${rule.publicendport}` : ''}\n`;
      result += `  Private Port: ${rule.privateport}${rule.privateendport ? `-${rule.privateendport}` : ''}\n`;
      result += `  VM: ${rule.virtualmachinename || 'N/A'}\n`;
      result += `  State: ${rule.state || 'N/A'}\n\n`;
    }

    return result;
  }

  // Load Balancer Management Handlers
  private async handleCreateLoadBalancerRule(args: any): Promise<any> {
    if (!args.publicipid || !args.algorithm || !args.name || !args.privateport || !args.publicport) {
      throw new Error('Public IP ID, algorithm, name, private port, and public port are required');
    }
    
    const allowedParams = ['publicipid', 'algorithm', 'name', 'privateport', 'publicport', 'protocol', 'description'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createLoadBalancerRule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Load balancer rule creation', response)
        }
      ]
    };
  }

  private async handleDeleteLoadBalancerRule(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Load balancer rule ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteLoadBalancerRule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Load balancer rule deletion', response)
        }
      ]
    };
  }

  private async handleListLoadBalancerRules(args: any): Promise<any> {
    const allowedParams = ['publicipid', 'account', 'name', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listLoadBalancerRules(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatLoadBalancerRulesResponse(response)
        }
      ]
    };
  }

  private async handleAssignToLoadBalancerRule(args: any): Promise<any> {
    if (!args.id || !args.virtualmachineids) {
      throw new Error('Load balancer rule ID and virtual machine IDs are required');
    }
    
    const params = {
      id: args.id,
      virtualmachineids: args.virtualmachineids
    };
    
    const response = await this.client.assignToLoadBalancerRule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM assignment to load balancer', response)
        }
      ]
    };
  }

  private async handleRemoveFromLoadBalancerRule(args: any): Promise<any> {
    if (!args.id || !args.virtualmachineids) {
      throw new Error('Load balancer rule ID and virtual machine IDs are required');
    }
    
    const params = {
      id: args.id,
      virtualmachineids: args.virtualmachineids
    };
    
    const response = await this.client.removeFromLoadBalancerRule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('VM removal from load balancer', response)
        }
      ]
    };
  }

  private async handleUpdateLoadBalancerRule(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Load balancer rule ID is required');
    }
    
    const allowedParams = ['id', 'algorithm', 'name', 'description'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateLoadBalancerRule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Load balancer rule update', response)
        }
      ]
    };
  }

  // Load Balancer Policy Handlers
  private async handleCreateLBHealthCheckPolicy(args: any): Promise<any> {
    if (!args.lbruleid || !args.healthcheckpolicy) {
      throw new Error('Load balancer rule ID and health check policy are required');
    }
    
    const params = {
      lbruleid: args.lbruleid,
      healthcheckpolicy: args.healthcheckpolicy
    };
    
    const response = await this.client.createLBHealthCheckPolicy(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Health check policy creation', response)
        }
      ]
    };
  }

  private async handleDeleteLBHealthCheckPolicy(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Health check policy ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteLBHealthCheckPolicy(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Health check policy deletion', response)
        }
      ]
    };
  }

  private async handleCreateLBStickinessPolicy(args: any): Promise<any> {
    if (!args.lbruleid || !args.methodname || !args.name) {
      throw new Error('Load balancer rule ID, method name, and name are required');
    }
    
    const allowedParams = ['lbruleid', 'methodname', 'name', 'param'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createLBStickinessPolicy(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Stickiness policy creation', response)
        }
      ]
    };
  }

  private async handleDeleteLBStickinessPolicy(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Stickiness policy ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteLBStickinessPolicy(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Stickiness policy deletion', response)
        }
      ]
    };
  }

  // SSL Certificate Handlers
  private async handleUploadSslCert(args: any): Promise<any> {
    if (!args.certificate || !args.privatekey || !args.name) {
      throw new Error('Certificate, private key, and name are required');
    }
    
    const allowedParams = ['certificate', 'privatekey', 'name', 'certchain', 'password'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.uploadSslCert(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatSslCertResponse('SSL certificate upload', response)
        }
      ]
    };
  }

  private async handleDeleteSslCert(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('SSL certificate ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteSslCert(params);
    
    return {
      content: [
        {
          type: 'text',
          text: 'SSL certificate deleted successfully.'
        }
      ]
    };
  }

  private async handleListSslCerts(args: any): Promise<any> {
    const allowedParams = ['account', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listSslCerts(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatSslCertListResponse(response)
        }
      ]
    };
  }

  // Load Balancer Enhancement Handlers
  private async handleListLBHealthCheckPolicies(args: any): Promise<any> {
    const params = this.buildParams(args, ['lbruleid', 'account', 'domainid', 'listall']);
    const response = await this.client.listLBHealthCheckPolicies(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatHealthCheckPolicyResponse(response)
      }]
    };
  }

  private async handleUpdateLBHealthCheckPolicy(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'pingpath', 'healthythreshold', 'intervaltime', 'responsetimeout', 'unhealthythreshold'
    ]);
    const response = await this.client.updateLBHealthCheckPolicy(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatHealthCheckPolicyResponse(response)
      }]
    };
  }

  private async handleListLBStickinessPolicies(args: any): Promise<any> {
    const params = this.buildParams(args, ['lbruleid', 'account', 'domainid', 'listall']);
    const response = await this.client.listLBStickinessPolicies(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatStickinessPolicyResponse(response)
      }]
    };
  }

  private async handleUpdateLBStickinessPolicy(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'name', 'methodname', 'params']);
    const response = await this.client.updateLBStickinessPolicy(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatStickinessPolicyResponse(response)
      }]
    };
  }

  private async handleCreateApplicationLoadBalancer(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'name', 'sourceipaddressnetworkid', 'scheme', 'sourceipaddress', 'description'
    ]);
    const response = await this.client.createApplicationLoadBalancer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatApplicationLoadBalancerResponse('Application load balancer creation', response)
      }]
    };
  }

  private async handleDeleteApplicationLoadBalancer(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteApplicationLoadBalancer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Application load balancer deletion', response)
      }]
    };
  }

  private async handleListApplicationLoadBalancers(args: any): Promise<any> {
    const params = this.buildParams(args, ['account', 'domainid', 'name', 'networkid', 'listall']);
    const response = await this.client.listApplicationLoadBalancers(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatApplicationLoadBalancerResponse('Application load balancers', response)
      }]
    };
  }

  private async handleConfigureApplicationLoadBalancer(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'algorithm', 'description', 'name']);
    const response = await this.client.configureApplicationLoadBalancer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatApplicationLoadBalancerResponse('Application load balancer configuration', response)
      }]
    };
  }

  private async handleUpdateApplicationLoadBalancer(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'algorithm', 'description', 'name', 'customid']);
    const response = await this.client.updateApplicationLoadBalancer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatApplicationLoadBalancerResponse('Application load balancer update', response)
      }]
    };
  }

  private async handleCreateGlobalLoadBalancer(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'name', 'gslbdomainname', 'gslbservicetype', 'regionid', 'description'
    ]);
    const response = await this.client.createGlobalLoadBalancer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatGlobalLoadBalancerResponse('Global load balancer creation', response)
      }]
    };
  }

  private async handleDeleteGlobalLoadBalancer(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteGlobalLoadBalancer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Global load balancer deletion', response)
      }]
    };
  }

  private async handleListGlobalLoadBalancers(args: any): Promise<any> {
    const params = this.buildParams(args, ['account', 'domainid', 'regionid', 'listall']);
    const response = await this.client.listGlobalLoadBalancers(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatGlobalLoadBalancerResponse('Global load balancers', response)
      }]
    };
  }

  private async handleUpdateGlobalLoadBalancer(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'description', 'gslbdomainname', 'gslbservicetype']);
    const response = await this.client.updateGlobalLoadBalancer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatGlobalLoadBalancerResponse('Global load balancer update', response)
      }]
    };
  }

  private async handleUpdateSslCert(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'certificate', 'privatekey', 'certchain']);
    const response = await this.client.updateSslCert(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSslCertResponse('SSL certificate update', response)
      }]
    };
  }

  private async handleAssignSslCertToApplicationLoadBalancer(args: any): Promise<any> {
    const params = this.buildParams(args, ['lbruleid', 'certid']);
    const response = await this.client.assignSslCertToApplicationLoadBalancer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('SSL certificate assignment', response)
      }]
    };
  }

  private async handleListLoadBalancerCertificates(args: any): Promise<any> {
    const params = this.buildParams(args, ['lbruleid', 'account', 'domainid', 'listall']);
    const response = await this.client.listLoadBalancerCertificates(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatLoadBalancerCertificatesResponse(response)
      }]
    };
  }

  private async handleListLoadBalancerMetrics(args: any): Promise<any> {
    const params = this.buildParams(args, ['lbruleid', 'startdate', 'enddate', 'listall']);
    const response = await this.client.listLoadBalancerMetrics(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatLoadBalancerMetricsResponse(response)
      }]
    };
  }

  private async handleGetLoadBalancerHealth(args: any): Promise<any> {
    const params = this.buildParams(args, ['lbruleid']);
    const response = await this.client.getLoadBalancerHealth(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatLoadBalancerHealthResponse(response)
      }]
    };
  }

  private async handleResetLoadBalancerRule(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.resetLoadBalancerRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Load balancer rule reset', response)
      }]
    };
  }

  // Firewall Rule Handlers
  private async handleCreateFirewallRule(args: any): Promise<any> {
    if (!args.ipaddressid || !args.protocol) {
      throw new Error('IP address ID and protocol are required');
    }
    
    const allowedParams = ['ipaddressid', 'protocol', 'startport', 'endport', 'cidrlist', 'icmptype', 'icmpcode'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createFirewallRule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Firewall rule creation', response)
        }
      ]
    };
  }

  private async handleDeleteFirewallRule(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Firewall rule ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteFirewallRule(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Firewall rule deletion', response)
        }
      ]
    };
  }

  private async handleListFirewallRules(args: any): Promise<any> {
    const allowedParams = ['ipaddressid', 'account', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listFirewallRules(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatFirewallRulesResponse(response)
        }
      ]
    };
  }

  // Network ACL Handlers
  private async handleCreateNetworkACL(args: any): Promise<any> {
    if (!args.aclid || !args.protocol || !args.traffictype || !args.action) {
      throw new Error('ACL ID, protocol, traffic type, and action are required');
    }
    
    const allowedParams = ['aclid', 'protocol', 'startport', 'endport', 'cidrlist', 'traffictype', 'action', 'number'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createNetworkACL(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Network ACL rule creation', response)
        }
      ]
    };
  }

  private async handleDeleteNetworkACL(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Network ACL rule ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteNetworkACL(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Network ACL rule deletion', response)
        }
      ]
    };
  }

  private async handleListNetworkACLs(args: any): Promise<any> {
    const allowedParams = ['aclid', 'networkid', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listNetworkACLs(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatNetworkACLResponse(response)
        }
      ]
    };
  }

  private async handleCreateNetworkACLList(args: any): Promise<any> {
    const allowedParams = ['name', 'description', 'vpcid'];
    const requiredParams = ['name', 'vpcid'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.createNetworkACLList(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatNetworkACLListResponse('Network ACL list creation', response)
        }
      ]
    };
  }

  private async handleDeleteNetworkACLList(args: any): Promise<any> {
    const allowedParams = ['id'];
    const requiredParams = ['id'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.deleteNetworkACLList(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Network ACL list deletion', response)
        }
      ]
    };
  }

  private async handleListNetworkACLLists(args: any): Promise<any> {
    const allowedParams = ['vpcid', 'name', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listNetworkACLLists(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatNetworkACLListsResponse(response)
        }
      ]
    };
  }

  private async handleReplaceNetworkAclList(args: any): Promise<any> {
    const allowedParams = ['aclid', 'networkid'];
    const requiredParams = ['aclid', 'networkid'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.replaceNetworkACLList(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Network ACL list replacement', response)
        }
      ]
    };
  }

  private async handleUpdateNetworkACLItem(args: any): Promise<any> {
    const allowedParams = ['id', 'protocol', 'startport', 'endport', 'cidrlist', 'action', 'traffictype', 'icmptype', 'icmpcode', 'number'];
    const requiredParams = ['id'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.updateNetworkACL(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Network ACL item update', response)
        }
      ]
    };
  }

  private async handleUpdateNetworkACLList(args: any): Promise<any> {
    const allowedParams = ['id', 'name', 'description'];
    const requiredParams = ['id'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.updateNetworkACLList(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatNetworkACLListResponse('Network ACL list update', response)
        }
      ]
    };
  }

  // Response Formatting Methods
  private formatLoadBalancerRulesResponse(response: any): string {
    const rules = response.loadbalancerrule || [];
    
    if (rules.length === 0) {
      return 'No load balancer rules found.';
    }
    
    let result = `Found ${rules.length} load balancer rule(s):\n\n`;
    
    for (const rule of rules) {
      result += `Rule: ${rule.name} (${rule.id})\n`;
      result += `  Algorithm: ${rule.algorithm}\n`;
      result += `  Public Port: ${rule.publicport}\n`;
      result += `  Private Port: ${rule.privateport}\n`;
      result += `  Protocol: ${rule.protocol || 'TCP'}\n`;
      result += `  State: ${rule.state}\n`;
      result += `  Public IP: ${rule.publicip}\n`;
      
      if (rule.loadbalancerinstance && rule.loadbalancerinstance.length > 0) {
        result += `  Assigned VMs (${rule.loadbalancerinstance.length}):\n`;
        for (const vm of rule.loadbalancerinstance) {
          result += `    ${vm.name} (${vm.id}) - ${vm.ipaddress}\n`;
        }
      }
      
      result += '\n';
    }
    
    return result.trim();
  }

  private formatSslCertResponse(operation: string, response: any): string {
    if (response.sslcert) {
      const cert = response.sslcert;
      return `${operation} completed successfully.\nCertificate: ${cert.name} (${cert.id})\nFingerprint: ${cert.fingerprint || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatSslCertListResponse(response: any): string {
    const certs = response.sslcert || [];
    
    if (certs.length === 0) {
      return 'No SSL certificates found.';
    }
    
    let result = `Found ${certs.length} SSL certificate(s):\n\n`;
    
    for (const cert of certs) {
      result += `Certificate: ${cert.name} (${cert.id})\n`;
      result += `  Fingerprint: ${cert.fingerprint || 'N/A'}\n`;
      result += `  Account: ${cert.account || 'N/A'}\n`;
      result += '\n';
    }
    
    return result.trim();
  }

  private formatFirewallRulesResponse(response: any): string {
    const rules = response.firewallrule || [];
    
    if (rules.length === 0) {
      return 'No firewall rules found.';
    }
    
    let result = `Found ${rules.length} firewall rule(s):\n\n`;
    
    for (const rule of rules) {
      result += `Rule ID: ${rule.id}\n`;
      result += `  Protocol: ${rule.protocol}`;
      if (rule.startport) {
        result += `:${rule.startport}`;
        if (rule.endport && rule.endport !== rule.startport) {
          result += `-${rule.endport}`;
        }
      }
      result += `\n  CIDR: ${rule.cidrlist || 'Any'}\n`;
      result += `  State: ${rule.state}\n`;
      result += '\n';
    }
    
    return result.trim();
  }

  private formatNetworkACLResponse(response: any): string {
    const rules = response.networkacl || [];
    
    if (rules.length === 0) {
      return 'No network ACL rules found.';
    }
    
    let result = `Found ${rules.length} network ACL rule(s):\n\n`;
    
    for (const rule of rules) {
      result += `Rule #${rule.number || rule.id}: ${rule.protocol}`;
      if (rule.startport) {
        result += `:${rule.startport}`;
        if (rule.endport && rule.endport !== rule.startport) {
          result += `-${rule.endport}`;
        }
      }
      result += `\n  Traffic: ${rule.traffictype} | Action: ${rule.action}\n`;
      result += `  CIDR: ${rule.cidrlist || 'Any'}\n`;
      result += `  State: ${rule.state}\n\n`;
    }
    
    return result.trim();
  }

  private formatNetworkACLListResponse(operation: string, response: any): string {
    if (response.networkacllist) {
      const list = response.networkacllist;
      return `${operation} completed successfully.\nACL List: ${list.name} (${list.id})\nDescription: ${list.description || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatNetworkACLListsResponse(response: any): string {
    const lists = response.networkacllist || [];
    
    if (lists.length === 0) {
      return 'No network ACL lists found.';
    }
    
    let result = `Found ${lists.length} network ACL list(s):\n\n`;
    
    for (const list of lists) {
      result += `ACL List: ${list.name} (${list.id})\n`;
      result += `  Description: ${list.description || 'N/A'}\n`;
      result += `  VPC: ${list.vpcid}\n`;
      result += '\n';
    }
    
    return result.trim();
  }

  // Account Management Handlers
  private async handleCreateAccount(args: any): Promise<any> {
    const requiredParams = ['email', 'firstname', 'lastname', 'password', 'username'];
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
    
    const allowedParams = ['email', 'firstname', 'lastname', 'password', 'username', 'account', 'accounttype', 'domainid', 'roleid', 'timezone'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createAccount(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAccountResponse('Account creation', response)
        }
      ]
    };
  }

  private async handleListAccounts(args: any): Promise<any> {
    const allowedParams = ['accounttype', 'domainid', 'name', 'state', 'isrecursive', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listAccounts(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAccountListResponse(response)
        }
      ]
    };
  }

  private async handleUpdateAccount(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Account ID is required');
    }
    
    const allowedParams = ['id', 'newname', 'networkdomain'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateAccount(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAccountResponse('Account update', response)
        }
      ]
    };
  }

  private async handleDeleteAccount(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Account ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteAccount(params);
    
    return {
      content: [
        {
          type: 'text',
          text: `Account deleted successfully. ${response.displaytext || ''}`
        }
      ]
    };
  }

  private async handleEnableAccount(args: any): Promise<any> {
    if (!args.account || !args.domainid) {
      throw new Error('Account name and domain ID are required');
    }
    
    const params = { account: args.account, domainid: args.domainid };
    const response = await this.client.enableAccount(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAccountResponse('Account enable', response)
        }
      ]
    };
  }

  private async handleDisableAccount(args: any): Promise<any> {
    if (!args.account || !args.domainid || args.lock === undefined) {
      throw new Error('Account name, domain ID, and lock parameter are required');
    }
    
    const params = { account: args.account, domainid: args.domainid, lock: args.lock };
    const response = await this.client.disableAccount(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAccountResponse('Account disable', response)
        }
      ]
    };
  }

  private async handleLockAccount(args: any): Promise<any> {
    if (!args.account || !args.domainid) {
      throw new Error('Account name and domain ID are required');
    }
    
    const params = { account: args.account, domainid: args.domainid };
    const response = await this.client.lockAccount(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAccountResponse('Account lock', response)
        }
      ]
    };
  }

  // Domain Management Handlers
  private async handleCreateDomain(args: any): Promise<any> {
    if (!args.name) {
      throw new Error('Domain name is required');
    }
    
    const allowedParams = ['name', 'parentdomainid', 'networkdomain'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createDomain(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatDomainResponse('Domain creation', response)
        }
      ]
    };
  }

  private async handleListDomains(args: any): Promise<any> {
    const allowedParams = ['id', 'name', 'level', 'isrecursive', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listDomains(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatDomainListResponse(response)
        }
      ]
    };
  }

  private async handleUpdateDomain(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Domain ID is required');
    }
    
    const allowedParams = ['id', 'name', 'networkdomain'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateDomain(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatDomainResponse('Domain update', response)
        }
      ]
    };
  }

  private async handleDeleteDomain(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Domain ID is required');
    }
    
    const allowedParams = ['id', 'cleanup', 'force'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.deleteDomain(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatAsyncJobResponse('Domain deletion', response)
        }
      ]
    };
  }

  private async handleListDomainChildren(args: any): Promise<any> {
    const allowedParams = ['domainid', 'isrecursive', 'name', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listDomainChildren(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatDomainListResponse(response)
        }
      ]
    };
  }

  // User Management Handlers
  private async handleCreateUser(args: any): Promise<any> {
    const requiredParams = ['account', 'email', 'firstname', 'lastname', 'password', 'username'];
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
    
    const allowedParams = [...requiredParams, 'domainid', 'timezone'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createUser(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserResponse('User creation', response)
        }
      ]
    };
  }

  private async handleListUsers(args: any): Promise<any> {
    const allowedParams = ['account', 'accounttype', 'domainid', 'id', 'username', 'state', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listUsers(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserListResponse(response)
        }
      ]
    };
  }

  private async handleUpdateUser(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('User ID is required');
    }
    
    const allowedParams = ['id', 'email', 'firstname', 'lastname', 'password', 'username', 'timezone'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateUser(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserResponse('User update', response)
        }
      ]
    };
  }

  private async handleDeleteUser(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('User ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteUser(params);
    
    return {
      content: [
        {
          type: 'text',
          text: `User deleted successfully. ${response.displaytext || ''}`
        }
      ]
    };
  }

  private async handleEnableUser(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('User ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.enableUser(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserResponse('User enable', response)
        }
      ]
    };
  }

  private async handleDisableUser(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('User ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.disableUser(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserResponse('User disable', response)
        }
      ]
    };
  }

  private async handleLockUser(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('User ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.lockUser(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserResponse('User lock', response)
        }
      ]
    };
  }

  private async handleRegisterUserKeys(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('User ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.registerUserKeys(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserKeysResponse(response)
        }
      ]
    };
  }

  private async handleGetUser(args: any): Promise<any> {
    const allowedParams = ['id'];
    const params = this.buildParams(args, allowedParams);

    if (!params.id) {
      throw new Error('User ID is required');
    }

    const response = await this.client.getUser(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserResponse('User retrieval', response)
        }
      ]
    };
  }

  private async handleGetUserKeys(args: any): Promise<any> {
    const allowedParams = ['id'];
    const params = this.buildParams(args, allowedParams);

    if (!params.id) {
      throw new Error('User ID is required');
    }

    const response = await this.client.getUserKeys(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserKeysResponse(response)
        }
      ]
    };
  }

  private async handleMoveUser(args: any): Promise<any> {
    const allowedParams = ['id', 'account', 'domainid'];
    const params = this.buildParams(args, allowedParams);

    if (!params.id || !params.account || !params.domainid) {
      throw new Error('User ID, account, and domain ID are required');
    }

    const response = await this.client.moveUser(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatUserResponse('User move', response)
        }
      ]
    };
  }

  // Resource Limits and Quotas Handlers
  private async handleListResourceLimits(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'projectid', 'resourcetype', 'isrecursive', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listResourceLimits(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatResourceLimitsResponse(response)
        }
      ]
    };
  }

  private async handleUpdateResourceLimit(args: any): Promise<any> {
    if (args.resourcetype === undefined) {
      throw new Error('Resource type is required');
    }
    
    const allowedParams = ['resourcetype', 'account', 'domainid', 'projectid', 'max'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateResourceLimit(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatResourceLimitResponse('Resource limit update', response)
        }
      ]
    };
  }

  private async handleUpdateResourceCount(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'projectid', 'resourcetype'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateResourceCount(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatResourceCountResponse(response)
        }
      ]
    };
  }

  // Role and Permission Management Handlers
  private async handleCreateRole(args: any): Promise<any> {
    if (!args.name || !args.type) {
      throw new Error('Role name and type are required');
    }
    
    const allowedParams = ['name', 'type', 'description'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createRole(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatRoleResponse('Role creation', response)
        }
      ]
    };
  }

  private async handleListRoles(args: any): Promise<any> {
    const allowedParams = ['id', 'name', 'type'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listRoles(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatRoleListResponse(response)
        }
      ]
    };
  }

  private async handleUpdateRole(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Role ID is required');
    }
    
    const allowedParams = ['id', 'name', 'type', 'description'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateRole(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatRoleResponse('Role update', response)
        }
      ]
    };
  }

  private async handleDeleteRole(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Role ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteRole(params);
    
    return {
      content: [
        {
          type: 'text',
          text: `Role deleted successfully. ${response.displaytext || ''}`
        }
      ]
    };
  }

  private async handleCreateRolePermission(args: any): Promise<any> {
    if (!args.permission || !args.roleid || !args.rule) {
      throw new Error('Permission, role ID, and rule are required');
    }
    
    const allowedParams = ['permission', 'roleid', 'rule', 'description'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createRolePermission(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatRolePermissionResponse('Role permission creation', response)
        }
      ]
    };
  }

  private async handleListRolePermissions(args: any): Promise<any> {
    const allowedParams = ['roleid'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listRolePermissions(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatRolePermissionListResponse(response)
        }
      ]
    };
  }

  // Project Management Handlers
  private async handleCreateProject(args: any): Promise<any> {
    if (!args.displaytext || !args.name) {
      throw new Error('Display text and name are required');
    }
    
    const allowedParams = ['displaytext', 'name', 'account', 'domainid'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.createProject(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatProjectResponse('Project creation', response)
        }
      ]
    };
  }

  private async handleListProjects(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'id', 'name', 'state', 'isrecursive', 'listall'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listProjects(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatProjectListResponse(response)
        }
      ]
    };
  }

  private async handleUpdateProject(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Project ID is required');
    }
    
    const allowedParams = ['id', 'displaytext', 'name'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.updateProject(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatProjectResponse('Project update', response)
        }
      ]
    };
  }

  private async handleDeleteProject(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Project ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.deleteProject(params);
    
    return {
      content: [
        {
          type: 'text',
          text: `Project deleted successfully. ${response.displaytext || ''}`
        }
      ]
    };
  }

  private async handleActivateProject(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Project ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.activateProject(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatProjectResponse('Project activation', response)
        }
      ]
    };
  }

  private async handleSuspendProject(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Project ID is required');
    }
    
    const params = { id: args.id };
    const response = await this.client.suspendProject(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatProjectResponse('Project suspension', response)
        }
      ]
    };
  }

  private async handleAddAccountToProject(args: any): Promise<any> {
    if (!args.account || !args.projectid) {
      throw new Error('Account name and project ID are required');
    }
    
    const allowedParams = ['account', 'projectid', 'email'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.addAccountToProject(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatProjectAccountResponse('Account added to project', response)
        }
      ]
    };
  }

  private async handleDeleteAccountFromProject(args: any): Promise<any> {
    if (!args.account || !args.projectid) {
      throw new Error('Account name and project ID are required');
    }
    
    const params = { account: args.account, projectid: args.projectid };
    const response = await this.client.deleteAccountFromProject(params);
    
    return {
      content: [
        {
          type: 'text',
          text: `Account removed from project successfully. ${response.displaytext || ''}`
        }
      ]
    };
  }

  private async handleListProjectAccounts(args: any): Promise<any> {
    if (!args.projectid) {
      throw new Error('Project ID is required');
    }
    
    const allowedParams = ['projectid', 'role'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listProjectAccounts(params);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatProjectAccountListResponse(response)
        }
      ]
    };
  }

  // Advanced Networking Handler Methods

  // Network Offering Management Handlers
  private async handleCreateNetworkOffering(args: any): Promise<any> {
    const requiredParams = ['displaytext', 'guestiptype', 'name', 'supportedservices', 'traffictype'];
    const allowedParams = [...requiredParams, 'availability', 'networkrate', 'conservemode'];
    
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`${param} is required`);
      }
    }
    
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.createNetworkOffering(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNetworkOfferingResponse('Network offering creation initiated', response)
      }]
    };
  }

  private async handleDeleteNetworkOffering(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Network offering ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteNetworkOffering(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Network offering deletion initiated', response)
      }]
    };
  }

  private async handleUpdateNetworkOffering(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Network offering ID is required');
    }
    
    const allowedParams = ['id', 'displaytext', 'name', 'sortkey', 'tags'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.updateNetworkOffering(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNetworkOfferingResponse('Network offering updated', response)
      }]
    };
  }

  // VLAN IP Range Management Handlers
  private async handleCreateVlanIpRange(args: any): Promise<any> {
    if (!args.startip || !args.endip) {
      throw new Error('Start IP and End IP are required');
    }
    
    const allowedParams = ['startip', 'endip', 'vlan', 'gateway', 'netmask', 'zoneid', 'podid', 'networkid', 'physicalnetworkid', 'account', 'domainid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.createVlanIpRange(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVlanIpRangeResponse('VLAN IP range created', response)
      }]
    };
  }

  private async handleDeleteVlanIpRange(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('VLAN IP range ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteVlanIpRange(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VLAN IP range deletion initiated', response)
      }]
    };
  }

  private async handleListVlanIpRanges(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'forvirtualnetwork', 'id', 'keyword', 'networkid', 'physicalnetworkid', 'podid', 'vlan', 'zoneid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listVlanIpRanges(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVlanIpRangeListResponse(response)
      }]
    };
  }

  private async handleDedicatePublicIpRange(args: any): Promise<any> {
    if (!args.account || !args.domainid || !args.id) {
      throw new Error('Account, Domain ID, and VLAN IP range ID are required');
    }
    
    const params = this.buildParams(args, ['account', 'domainid', 'id']);
    const response = await this.client.dedicatePublicIpRange(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Public IP range dedication initiated', response)
      }]
    };
  }

  private async handleReleasePublicIpRange(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('VLAN IP range ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.releasePublicIpRange(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Public IP range release initiated', response)
      }]
    };
  }

  // IP Address & Forwarding Management Handlers
  private async handleUpdateIpAddress(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('IP address ID is required');
    }
    
    const allowedParams = ['id', 'customid', 'fordisplay'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.updateIpAddress(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('IP address update initiated', response)
      }]
    };
  }

  private async handleCreateIpForwardingRule(args: any): Promise<any> {
    if (!args.ipaddressid || !args.protocol || !args.startport) {
      throw new Error('IP address ID, protocol, and start port are required');
    }
    
    const allowedParams = ['ipaddressid', 'protocol', 'startport', 'endport'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.createIpForwardingRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('IP forwarding rule creation initiated', response)
      }]
    };
  }

  private async handleDeleteIpForwardingRule(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('IP forwarding rule ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteIpForwardingRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('IP forwarding rule deletion initiated', response)
      }]
    };
  }

  private async handleListIpForwardingRules(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'id', 'ipaddressid', 'virtualmachineid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listIpForwardingRules(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatIpForwardingRuleListResponse(response)
      }]
    };
  }

  private async handleUpdatePortForwardingRule(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Port forwarding rule ID is required');
    }
    
    const allowedParams = ['id', 'customid', 'fordisplay', 'virtualmachineid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.updatePortForwardingRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Port forwarding rule update initiated', response)
      }]
    };
  }

  // VPN Services Handler Methods
  private async handleCreateVpnConnection(args: any): Promise<any> {
    if (!args.customergatewayid || !args.vpngatewayid) {
      throw new Error('Customer gateway ID and VPN gateway ID are required');
    }
    
    const allowedParams = ['customergatewayid', 'vpngatewayid', 'passive'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.createVpnConnection(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN connection creation initiated', response)
      }]
    };
  }

  private async handleListVpnConnections(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'id', 'keyword', 'listall', 'page', 'pagesize', 'projectid', 'vpcid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listVpnConnections(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpnConnectionListResponse(response)
      }]
    };
  }

  private async handleDeleteVpnConnection(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('VPN connection ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteVpnConnection(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN connection deletion initiated', response)
      }]
    };
  }

  private async handleResetVpnConnection(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('VPN connection ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.resetVpnConnection(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN connection reset initiated', response)
      }]
    };
  }

  private async handleCreateVpnGateway(args: any): Promise<any> {
    if (!args.vpcid) {
      throw new Error('VPC ID is required');
    }
    
    const allowedParams = ['vpcid', 'fordisplay'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.createVpnGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN gateway creation initiated', response)
      }]
    };
  }

  private async handleListVpnGateways(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'fordisplay', 'id', 'keyword', 'listall', 'page', 'pagesize', 'projectid', 'vpcid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listVpnGateways(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpnGatewayListResponse(response)
      }]
    };
  }

  private async handleDeleteVpnGateway(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('VPN gateway ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteVpnGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN gateway deletion initiated', response)
      }]
    };
  }

  private async handleCreateCustomerGateway(args: any): Promise<any> {
    if (!args.cidrlist || !args.esppolicy || !args.gateway || !args.ikepolicy || !args.ipsecpsk) {
      throw new Error('CIDR list, ESP policy, gateway, IKE policy, and IPSec PSK are required');
    }
    
    const allowedParams = ['cidrlist', 'esppolicy', 'gateway', 'ikepolicy', 'ipsecpsk', 'account', 'domainid', 'name'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.createVpnCustomerGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Customer gateway creation initiated', response)
      }]
    };
  }

  private async handleListCustomerGateways(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'id', 'keyword', 'listall', 'page', 'pagesize', 'projectid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listVpnCustomerGateways(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatCustomerGatewayListResponse(response)
      }]
    };
  }

  private async handleDeleteCustomerGateway(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Customer gateway ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteVpnCustomerGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Customer gateway deletion initiated', response)
      }]
    };
  }

  // Duplicate Remote Access VPN handlers removed - kept versions located later in file

  // VPC Offerings Handler Methods
  private async handleCreateVpcOffering(args: any): Promise<any> {
    if (!args.displaytext || !args.name) {
      throw new Error('Display text and name are required');
    }
    
    const allowedParams = ['displaytext', 'name', 'supportedservices', 'availability', 'conservemode', 'tags'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.createVpcOffering(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpcOfferingResponse('VPC offering creation initiated', response)
      }]
    };
  }

  private async handleListVpcOfferings(args: any): Promise<any> {
    const allowedParams = ['id', 'isdefault', 'keyword', 'name', 'state', 'supportedservices'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listVpcOfferings(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpcOfferingListResponse(response)
      }]
    };
  }

  private async handleUpdateVpcOffering(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('VPC offering ID is required');
    }
    
    const allowedParams = ['id', 'displaytext', 'name', 'sortkey', 'state'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.updateVpcOffering(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpcOfferingResponse('VPC offering updated', response)
      }]
    };
  }

  private async handleDeleteVpcOffering(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('VPC offering ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteVpcOffering(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPC offering deletion initiated', response)
      }]
    };
  }


  // System Administration Handler Methods
  private async handleListConfigurations(args: any): Promise<any> {
    const allowedParams = ['category', 'keyword', 'name', 'page', 'pagesize'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listConfigurations(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatConfigurationListResponse(response)
      }]
    };
  }

  private async handleUpdateConfiguration(args: any): Promise<any> {
    if (!args.name || !args.value) {
      throw new Error('Configuration name and value are required');
    }
    
    const allowedParams = ['name', 'value'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.updateConfiguration(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatConfigurationResponse('Configuration updated', response)
      }]
    };
  }

  private async handleListCapabilities(args: any): Promise<any> {
    const response = await this.client.listCapabilities();
    
    return {
      content: [{
        type: 'text',
        text: this.formatCapabilitiesResponse(response)
      }]
    };
  }

  private async handleListAlerts(args: any): Promise<any> {
    const allowedParams = ['id', 'keyword', 'name', 'page', 'pagesize', 'type'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listAlerts(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAlertListResponse(response)
      }]
    };
  }

  private async handleArchiveAlerts(args: any): Promise<any> {
    const allowedParams = ['enddate', 'ids', 'startdate', 'type'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.archiveAlerts(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Alert archival initiated', response)
      }]
    };
  }

  private async handleDeleteAlerts(args: any): Promise<any> {
    const allowedParams = ['enddate', 'ids', 'startdate', 'type'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.deleteAlerts(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Alert deletion initiated', response)
      }]
    };
  }

  private async handleListEvents(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'duration', 'enddate', 'entrytime', 'id', 'isrecursive', 'keyword', 'level', 'listall', 'page', 'pagesize', 'projectid', 'startdate', 'type'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listEvents(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatEventListResponse(response)
      }]
    };
  }

  private async handleListSystemVms(args: any): Promise<any> {
    const allowedParams = ['hostid', 'id', 'keyword', 'name', 'page', 'pagesize', 'podid', 'state', 'storageid', 'systemvmtype', 'zoneid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listSystemVms(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSystemVmListResponse(response)
      }]
    };
  }

  private async handleStartSystemVm(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('System VM ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.startSystemVm(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('System VM start initiated', response)
      }]
    };
  }

  private async handleStopSystemVm(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('System VM ID is required');
    }
    
    const allowedParams = ['id', 'forced'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.stopSystemVm(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('System VM stop initiated', response)
      }]
    };
  }

  private async handleRebootSystemVm(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('System VM ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.rebootSystemVm(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('System VM reboot initiated', response)
      }]
    };
  }

  private async handleListRouters(args: any): Promise<any> {
    const allowedParams = ['account', 'clusterid', 'domainid', 'fordisplay', 'hostid', 'id', 'isrecursive', 'keyword', 'listall', 'name', 'networkid', 'page', 'pagesize', 'podid', 'projectid', 'state', 'version', 'vpcid', 'zoneid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listRouters(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatRouterListResponse(response)
      }]
    };
  }

  // Storage Pool Management Handler Methods
  private async handleListStoragePools(args: any): Promise<any> {
    const allowedParams = ['clusterid', 'id', 'ipaddress', 'keyword', 'name', 'page', 'pagesize', 'path', 'podid', 'scope', 'zoneid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listStoragePools(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatStoragePoolListResponse(response)
      }]
    };
  }

  private async handleCreateStoragePool(args: any): Promise<any> {
    if (!args.name || !args.url || !args.zoneid) {
      throw new Error('Name, URL, and Zone ID are required');
    }
    
    const allowedParams = ['name', 'url', 'zoneid', 'clusterid', 'details', 'hypervisor', 'managed', 'podid', 'provider', 'scope', 'tags'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.createStoragePool(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatStoragePoolResponse('Storage pool creation initiated', response)
      }]
    };
  }

  private async handleUpdateStoragePool(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Storage pool ID is required');
    }
    
    const allowedParams = ['id', 'capacitybytes', 'capacityiops', 'enabled', 'tags'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.updateStoragePool(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatStoragePoolResponse('Storage pool updated', response)
      }]
    };
  }

  private async handleDeleteStoragePool(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Storage pool ID is required');
    }
    
    const allowedParams = ['id', 'forced'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.deleteStoragePool(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Storage pool deletion initiated', response)
      }]
    };
  }

  // Monitoring & Usage Handler Methods

  private async handleListCapacity(args: any): Promise<any> {
    const allowedParams = ['clusterid', 'fetchlatest', 'hostid', 'keyword', 'page', 'pagesize', 'podid', 'sortby', 'type', 'zoneid'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listCapacity(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatCapacityListResponse(response)
      }]
    };
  }

  private async handleListAsyncJobs(args: any): Promise<any> {
    const allowedParams = ['account', 'domainid', 'keyword', 'listall', 'page', 'pagesize', 'startdate'];
    const params = this.buildParams(args, allowedParams);
    const response = await this.client.listAsyncJobs(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobListResponse(response)
      }]
    };
  }

  private async handleQueryAsyncJobResult(args: any): Promise<any> {
    if (!args.jobid) {
      throw new Error('Job ID is required');
    }
    
    const params = this.buildParams(args, ['jobid']);
    const response = await this.client.queryAsyncJobResult(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResultResponse(response)
      }]
    };
  }

  // Advanced Router Management Handlers
  private async handleStartRouter(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Router ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.startRouter(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Router start', response)
      }]
    };
  }

  private async handleStopRouter(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Router ID is required');
    }
    
    const params = this.buildParams(args, ['id', 'forced']);
    const response = await this.client.stopRouter(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Router stop', response)
      }]
    };
  }

  private async handleRebootRouter(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Router ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.rebootRouter(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Router reboot', response)
      }]
    };
  }

  private async handleDestroyRouter(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Router ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.destroyRouter(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Router destruction', response)
      }]
    };
  }

  private async handleChangeServiceForRouter(args: any): Promise<any> {
    if (!args.id || !args.serviceofferingid) {
      throw new Error('Router ID and service offering ID are required');
    }
    
    const params = this.buildParams(args, ['id', 'serviceofferingid']);
    const response = await this.client.changeServiceForRouter(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Router service change', response)
      }]
    };
  }

  private async handleListRouterHealthChecks(args: any): Promise<any> {
    const params = this.buildParams(args, ['routerid']);
    const response = await this.client.listRouterHealth(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatRouterHealthChecksResponse(response)
      }]
    };
  }

  private async handleGetRouterHealthCheckResults(args: any): Promise<any> {
    if (!args.routerid) {
      throw new Error('Router ID is required');
    }
    
    const params = this.buildParams(args, ['routerid']);
    const response = await this.client.listRouterHealth(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatRouterHealthCheckResultsResponse(response)
      }]
    };
  }

  private async handleConfigureVirtualRouterElement(args: any): Promise<any> {
    if (!args.id || !args.enabled) {
      throw new Error('Element ID and enabled status are required');
    }
    
    const params = this.buildParams(args, ['id', 'enabled']);
    const response = await this.client.updateNetworkServiceProvider(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVirtualRouterElementResponse(response)
      }]
    };
  }

  // VPC Static Routes Handlers
  private async handleCreateStaticRoute(args: any): Promise<any> {
    if (!args.cidr || !args.gatewayid) {
      throw new Error('CIDR and Gateway ID are required');
    }
    
    const params = this.buildParams(args, ['cidr', 'gatewayid']);
    const response = await this.client.createStaticRoute(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Static route creation', response)
      }]
    };
  }

  private async handleDeleteStaticRoute(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Static route ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteStaticRoute(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Static route deletion', response)
      }]
    };
  }

  private async handleListStaticRoutes(args: any): Promise<any> {
    const params = this.buildParams(args, ['gatewayid', 'id', 'vpcid']);
    const response = await this.client.listStaticRoutes(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatStaticRoutesResponse(response)
      }]
    };
  }

  // VPC Private Gateways Handlers
  private async handleCreatePrivateGateway(args: any): Promise<any> {
    if (!args.gateway || !args.ipaddress || !args.netmask || !args.vlan) {
      throw new Error('Gateway, IP address, netmask, and VLAN are required');
    }
    
    const params = this.buildParams(args, ['gateway', 'ipaddress', 'netmask', 'vlan', 'vpcid', 'physicalnetworkid', 'aclid']);
    const response = await this.client.createPrivateGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Private gateway creation', response)
      }]
    };
  }

  private async handleDeletePrivateGateway(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Private gateway ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deletePrivateGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Private gateway deletion', response)
      }]
    };
  }

  private async handleListPrivateGateways(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'ipaddress', 'state', 'vpcid']);
    const response = await this.client.listPrivateGateways(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatPrivateGatewaysResponse(response)
      }]
    };
  }

  // Remote Access VPN Handlers
  private async handleCreateRemoteAccessVpn(args: any): Promise<any> {
    if (!args.publicipid) {
      throw new Error('Public IP ID is required');
    }
    
    const params = this.buildParams(args, ['publicipid', 'account', 'domainid', 'iprange', 'openfirewall']);
    const response = await this.client.createRemoteAccessVpn(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Remote access VPN creation', response)
      }]
    };
  }

  private async handleDeleteRemoteAccessVpn(args: any): Promise<any> {
    if (!args.publicipid) {
      throw new Error('Public IP ID is required');
    }
    
    const params = this.buildParams(args, ['publicipid']);
    const response = await this.client.deleteRemoteAccessVpn(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Remote access VPN deletion', response)
      }]
    };
  }

  private async handleListRemoteAccessVpns(args: any): Promise<any> {
    const params = this.buildParams(args, ['publicipid', 'account', 'domainid', 'listall']);
    const response = await this.client.listRemoteAccessVpns(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatRemoteAccessVpnsResponse(response)
      }]
    };
  }

  private async handleAddVpnUser(args: any): Promise<any> {
    if (!args.password || !args.username) {
      throw new Error('Username and password are required');
    }
    
    const params = this.buildParams(args, ['password', 'username', 'account', 'domainid']);
    const response = await this.client.addVpnUser(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN user addition', response)
      }]
    };
  }

  private async handleRemoveVpnUser(args: any): Promise<any> {
    if (!args.username) {
      throw new Error('Username is required');
    }
    
    const params = this.buildParams(args, ['username', 'account', 'domainid']);
    const response = await this.client.removeVpnUser(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN user removal', response)
      }]
    };
  }

  private async handleListVpnUsers(args: any): Promise<any> {
    const params = this.buildParams(args, ['account', 'domainid', 'id', 'listall', 'username']);
    const response = await this.client.listVpnUsers(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpnUsersResponse(response)
      }]
    };
  }

  // VPN Services Enhancement Handlers
  private async handleUpdateVpnGateway(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'name', 'displaytext']);
    const response = await this.client.updateVpnGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpnGatewayResponse('VPN gateway update', response)
      }]
    };
  }

  private async handleEnableVpnGateway(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.enableVpnGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN gateway enable', response)
      }]
    };
  }

  private async handleDisableVpnGateway(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.disableVpnGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN gateway disable', response)
      }]
    };
  }

  private async handleRestartVpnGateway(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.restartVpnGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPN gateway restart', response)
      }]
    };
  }

  private async handleUpdateVpnConnection(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'fordisplay', 'customid']);
    const response = await this.client.updateVpnConnection(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpnConnectionResponse('VPN connection update', response)
      }]
    };
  }

  private async handleListVpnInstances(args: any): Promise<any> {
    const params = this.buildParams(args, ['account', 'domainid', 'keyword', 'listall']);
    const response = await this.client.listVpnInstances(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpnInstancesResponse(response)
      }]
    };
  }

  private async handleUpdateVpnCustomerGateway(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'name', 'cidrlist', 'esppolicy', 'ikepolicy', 'ipsecpsk'
    ]);
    const response = await this.client.updateVpnCustomerGateway(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVpnCustomerGatewayResponse('VPN customer gateway update', response)
      }]
    };
  }

  private async handleUpdateRemoteAccessVpn(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'customid', 'fordisplay']);
    const response = await this.client.updateRemoteAccessVpn(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatRemoteAccessVpnResponse('Remote Access VPN update', response)
      }]
    };
  }

  // Network Service Providers Handlers
  private async handleListNetworkServiceProviders(args: any): Promise<any> {
    const params = this.buildParams(args, ['name', 'physicalnetworkid', 'state']);
    const response = await this.client.listNetworkServiceProviders(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNetworkServiceProvidersResponse(response)
      }]
    };
  }

  private async handleAddNetworkServiceProvider(args: any): Promise<any> {
    if (!args.name || !args.physicalnetworkid) {
      throw new Error('Provider name and physical network ID are required');
    }
    
    const params = this.buildParams(args, ['name', 'physicalnetworkid', 'destinationphysicalnetworkid', 'servicelist']);
    const response = await this.client.addNetworkServiceProvider(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNetworkServiceProviderResponse(response)
      }]
    };
  }

  private async handleDeleteNetworkServiceProvider(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Network service provider ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteNetworkServiceProvider(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Network service provider deletion', response)
      }]
    };
  }

  private async handleUpdateNetworkServiceProvider(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Network service provider ID is required');
    }
    
    const params = this.buildParams(args, ['id', 'servicelist', 'state']);
    const response = await this.client.updateNetworkServiceProvider(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNetworkServiceProviderResponse(response)
      }]
    };
  }

  // DHCP Options Handlers
  private async handleListDhcpOptions(args: any): Promise<any> {
    const params = this.buildParams(args, ['networkid', 'nicid']);
    const response = await this.client.listDhcpOptions(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatDhcpOptionsResponse(response)
      }]
    };
  }

  private async handleCreateDhcpOptions(args: any): Promise<any> {
    if (!args.dhcpoptions) {
      throw new Error('DHCP options are required');
    }
    
    const params = this.buildParams(args, ['dhcpoptions', 'networkid', 'nicid']);
    const response = await this.client.createDhcpOption(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('DHCP options creation', response)
      }]
    };
  }

  private async handleDeleteDhcpOptions(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('DHCP options ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteDhcpOption(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('DHCP options deletion', response)
      }]
    };
  }

  // Egress Firewall Rules Handlers
  private async handleCreateEgressFirewallRule(args: any): Promise<any> {
    if (!args.networkid || !args.protocol) {
      throw new Error('Network ID and protocol are required');
    }
    
    const params = this.buildParams(args, ['networkid', 'protocol', 'cidrlist', 'startport', 'endport', 'icmptype', 'icmpcode', 'type']);
    const response = await this.client.createEgressFirewallRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Egress firewall rule creation', response)
      }]
    };
  }

  private async handleDeleteEgressFirewallRule(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Egress firewall rule ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteEgressFirewallRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Egress firewall rule deletion', response)
      }]
    };
  }

  private async handleListEgressFirewallRules(args: any): Promise<any> {
    const params = this.buildParams(args, ['networkid', 'id', 'ipaddressid', 'listall']);
    const response = await this.client.listEgressFirewallRules(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatEgressFirewallRulesResponse(response)
      }]
    };
  }

  private async handleUpdateEgressFirewallRule(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Egress firewall rule ID is required');
    }
    
    const params = this.buildParams(args, ['id', 'customid', 'fordisplay']);
    const response = await this.client.updateFirewallRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Egress firewall rule update', response)
      }]
    };
  }

  // NIC Management Handlers
  private async handleAddNicToVirtualMachine(args: any): Promise<any> {
    if (!args.networkid || !args.virtualmachineid) {
      throw new Error('Network ID and virtual machine ID are required');
    }
    
    const params = this.buildParams(args, ['networkid', 'virtualmachineid', 'ipaddress', 'dhcpoptions']);
    const response = await this.client.addNicToVirtualMachine(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('NIC addition to VM', response)
      }]
    };
  }

  private async handleRemoveNicFromVirtualMachine(args: any): Promise<any> {
    if (!args.nicid || !args.virtualmachineid) {
      throw new Error('NIC ID and virtual machine ID are required');
    }
    
    const params = this.buildParams(args, ['nicid', 'virtualmachineid']);
    const response = await this.client.removeNicFromVirtualMachine(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('NIC removal from VM', response)
      }]
    };
  }

  private async handleUpdateDefaultNicForVirtualMachine(args: any): Promise<any> {
    if (!args.nicid || !args.virtualmachineid) {
      throw new Error('NIC ID and virtual machine ID are required');
    }
    
    const params = this.buildParams(args, ['nicid', 'virtualmachineid']);
    const response = await this.client.updateDefaultNicForVirtualMachine(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Default NIC update', response)
      }]
    };
  }

  private async handleListNics(args: any): Promise<any> {
    const params = this.buildParams(args, ['virtualmachineid', 'networkid', 'nicid', 'keyword']);
    const response = await this.client.listNics(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNicsResponse(response)
      }]
    };
  }

  // Network Device Management Handlers
  private async handleListNetworkDevice(args: any): Promise<any> {
    const params = this.buildParams(args, ['networkdeviceparameterlist', 'networkdevicetype']);
    const response = await this.client.listNetworkDevice(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNetworkDevicesResponse(response)
      }]
    };
  }

  private async handleAddNetworkDevice(args: any): Promise<any> {
    if (!args.networkdeviceparameterlist || !args.networkdevicetype) {
      throw new Error('Network device parameter list and device type are required');
    }
    
    const params = this.buildParams(args, ['networkdeviceparameterlist', 'networkdevicetype']);
    const response = await this.client.addNetworkDevice(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNetworkDeviceResponse(response)
      }]
    };
  }

  private async handleDeleteNetworkDevice(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Network device ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteNetworkDevice(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Network device deletion', response)
      }]
    };
  }

  // Network Permissions Handlers
  private async handleCreateNetworkPermissions(args: any): Promise<any> {
    if (!args.networkid) {
      throw new Error('Network ID is required');
    }
    
    const params = this.buildParams(args, ['networkid', 'accounts', 'projectids']);
    const response = await this.client.resetNetworkPermissions(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Network permissions creation', response)
      }]
    };
  }

  private async handleRemoveNetworkPermissions(args: any): Promise<any> {
    if (!args.networkid) {
      throw new Error('Network ID is required');
    }
    
    const params = this.buildParams(args, ['networkid', 'accounts', 'projectids']);
    const response = await this.client.resetNetworkPermissions(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Network permissions removal', response)
      }]
    };
  }

  private async handleListNetworkPermissions(args: any): Promise<any> {
    if (!args.networkid) {
      throw new Error('Network ID is required');
    }
    
    const params = this.buildParams(args, ['networkid']);
    const response = await this.client.listNetworkPermissions(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNetworkPermissionsResponse(response)
      }]
    };
  }

  private async handleResetNetworkPermissions(args: any): Promise<any> {
    if (!args.networkid) {
      throw new Error('Network ID is required');
    }
    
    const params = this.buildParams(args, ['networkid']);
    const response = await this.client.resetNetworkPermissions(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Network permissions reset', response)
      }]
    };
  }

  // Site-to-Site VPN Handlers
  private async handleCreateSite2SiteVpnConnection(args: any): Promise<any> {
    if (!args.s2scustomergatewayid || !args.s2svpngatewayid) {
      throw new Error('Customer gateway ID and VPN gateway ID are required');
    }
    
    const params = this.buildParams(args, ['s2scustomergatewayid', 's2svpngatewayid', 'passive']);
    const response = await this.client.createVpnConnection(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Site-to-site VPN connection creation', response)
      }]
    };
  }

  private async handleDeleteSite2SiteVpnConnection(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Site-to-site VPN connection ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteVpnConnection(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Site-to-site VPN connection deletion', response)
      }]
    };
  }

  private async handleListSite2SiteVpnConnections(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 's2scustomergatewayid', 's2svpngatewayid', 'vpcid']);
    const response = await this.client.listVpnConnections(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSite2SiteVpnConnectionsResponse(response)
      }]
    };
  }

  private async handleResetSite2SiteVpnConnection(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Site-to-site VPN connection ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.resetVpnConnection(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Site-to-site VPN connection reset', response)
      }]
    };
  }

  private async handleUpdateSite2SiteVpnConnection(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Site-to-site VPN connection ID is required');
    }
    
    const params = this.buildParams(args, ['id', 'customid', 'fordisplay']);
    const response = await this.client.deleteVpnConnection(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Site-to-site VPN connection update', response)
      }]
    };
  }

  // Kubernetes Service Handlers
  private async handleAddKubernetesSupportedVersion(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'minkubernetesnodecount', 'maxkubernetesnodecount', 'kubernetesversionname', 
      'url', 'checksum'
    ]);
    const response = await this.client.addKubernetesSupportedVersion(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatKubernetesVersionResponse('Kubernetes version added', response)
      }]
    };
  }

  private async handleAddVmsToKubernetesCluster(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'virtualmachineids']);
    const response = await this.client.addVirtualMachinesToKubernetesCluster(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VMs addition to Kubernetes cluster', response)
      }]
    };
  }

  private async handleCreateKubernetesCluster(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'name', 'description', 'kubernetesversionid', 'size', 'masterNodes',
      'serviceofferingid', 'zoneid', 'account', 'domainid', 'networkid',
      'keypair', 'externalloadbalanceripaddress'
    ]);
    const response = await this.client.createKubernetesCluster(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Kubernetes cluster creation', response)
      }]
    };
  }

  private async handleDeleteKubernetesCluster(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteKubernetesCluster(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Kubernetes cluster deletion', response)
      }]
    };
  }

  private async handleDeleteKubernetesSupportedVersion(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteKubernetesSupportedVersion(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Kubernetes version deletion', response)
      }]
    };
  }

  private async handleGetKubernetesClusterConfig(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.getKubernetesClusterConfig(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatKubernetesConfigResponse(response)
      }]
    };
  }

  private async handleListKubernetesClusters(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'account', 'domainid', 'id', 'name', 'state', 'zoneid', 'keyword'
    ]);
    const response = await this.client.listKubernetesClusters(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatKubernetesClustersResponse(response)
      }]
    };
  }

  private async handleListKubernetesSupportedVersions(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'keyword']);
    const response = await this.client.listKubernetesSupportedVersions(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatKubernetesVersionsResponse(response)
      }]
    };
  }

  private async handleRemoveVmsFromKubernetesCluster(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'virtualmachineids']);
    const response = await this.client.removeVirtualMachinesFromKubernetesCluster(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VMs removal from Kubernetes cluster', response)
      }]
    };
  }

  private async handleScaleKubernetesCluster(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'size', 'masterNodes', 'serviceofferingid']);
    const response = await this.client.scaleKubernetesCluster(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Kubernetes cluster scaling', response)
      }]
    };
  }

  private async handleStartKubernetesCluster(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.startKubernetesCluster(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Kubernetes cluster start', response)
      }]
    };
  }

  private async handleStopKubernetesCluster(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.stopKubernetesCluster(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Kubernetes cluster stop', response)
      }]
    };
  }

  private async handleUpdateKubernetesSupportedVersion(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'state']);
    const response = await this.client.updateKubernetesSupportedVersion(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatKubernetesVersionResponse('Kubernetes version updated', response)
      }]
    };
  }

  private async handleUpgradeKubernetesCluster(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'kubernetesversionid']);
    const response = await this.client.upgradeKubernetesCluster(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Kubernetes cluster upgrade', response)
      }]
    };
  }

  // Response Formatting Methods for Account Management
  private formatAccountResponse(operation: string, response: any): string {
    if (response.account) {
      const account = response.account;
      return `${operation} completed successfully.\nAccount: ${account.name} (${account.id})\nType: ${account.accounttype}\nState: ${account.state}\nDomain: ${account.domain || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatAccountListResponse(response: any): string {
    const accounts = response.account || [];
    
    if (accounts.length === 0) {
      return 'No accounts found.';
    }

    let result = `Found ${accounts.length} account(s):\n\n`;
    
    for (const account of accounts) {
      result += `Account: ${account.name} (${account.id})\n`;
      result += `  Type: ${this.getAccountTypeName(account.accounttype)}\n`;
      result += `  State: ${account.state}\n`;
      result += `  Domain: ${account.domain || 'N/A'}\n`;
      result += `  Created: ${account.created || 'N/A'}\n`;
      
      if (account.user && account.user.length > 0) {
        result += `  Users (${account.user.length}):\n`;
        for (const user of account.user) {
          result += `    ${user.firstname} ${user.lastname} (${user.username})\n`;
        }
      }
      
      result += '\n';
    }

    return result.trim();
  }

  private formatDomainResponse(operation: string, response: any): string {
    if (response.domain) {
      const domain = response.domain;
      return `${operation} completed successfully.\nDomain: ${domain.name} (${domain.id})\nPath: ${domain.path || 'N/A'}\nLevel: ${domain.level || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatDomainListResponse(response: any): string {
    const domains = response.domain || [];
    
    if (domains.length === 0) {
      return 'No domains found.';
    }

    let result = `Found ${domains.length} domain(s):\n\n`;
    
    for (const domain of domains) {
      result += `Domain: ${domain.name} (${domain.id})\n`;
      result += `  Path: ${domain.path || 'N/A'}\n`;
      result += `  Level: ${domain.level || 'N/A'}\n`;
      result += `  State: ${domain.state || 'N/A'}\n`;
      result += `  Network Domain: ${domain.networkdomain || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatUserResponse(operation: string, response: any): string {
    if (response.user) {
      const user = response.user;
      return `${operation} completed successfully.\nUser: ${user.firstname} ${user.lastname} (${user.username})\nEmail: ${user.email}\nAccount: ${user.account}\nState: ${user.state}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatUserListResponse(response: any): string {
    const users = response.user || [];
    
    if (users.length === 0) {
      return 'No users found.';
    }

    let result = `Found ${users.length} user(s):\n\n`;
    
    for (const user of users) {
      result += `User: ${user.firstname} ${user.lastname} (${user.username})\n`;
      result += `  Email: ${user.email}\n`;
      result += `  Account: ${user.account}\n`;
      result += `  Domain: ${user.domain || 'N/A'}\n`;
      result += `  State: ${user.state}\n`;
      result += `  Created: ${user.created || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatUserKeysResponse(response: any): string {
    if (response.userkeys) {
      const keys = response.userkeys;
      return `User API keys registered successfully.\nAPI Key: ${keys.apikey}\nSecret Key: ${keys.secretkey ? '***' + keys.secretkey.slice(-4) : 'N/A'}`;
    }
    
    return 'User API keys registered successfully.';
  }

  private formatResourceLimitsResponse(response: any): string {
    const limits = response.resourcelimit || [];
    
    if (limits.length === 0) {
      return 'No resource limits found.';
    }

    let result = `Found ${limits.length} resource limit(s):\n\n`;
    
    for (const limit of limits) {
      result += `Resource: ${this.getResourceTypeName(limit.resourcetype)}\n`;
      result += `  Account: ${limit.account || 'N/A'}\n`;
      result += `  Domain: ${limit.domain || 'N/A'}\n`;
      result += `  Max: ${limit.max === -1 ? 'Unlimited' : limit.max}\n`;
      result += `  Total: ${limit.total || 0}\n\n`;
    }

    return result.trim();
  }

  private formatResourceLimitResponse(operation: string, response: any): string {
    if (response.resourcelimit) {
      const limit = response.resourcelimit;
      return `${operation} completed successfully.\nResource: ${this.getResourceTypeName(limit.resourcetype)}\nMax: ${limit.max === -1 ? 'Unlimited' : limit.max}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatResourceCountResponse(response: any): string {
    const counts = response.resourcecount || [];
    
    if (counts.length === 0) {
      return 'Resource counts updated successfully.';
    }

    let result = 'Resource counts updated successfully:\n\n';
    
    for (const count of counts) {
      result += `${this.getResourceTypeName(count.resourcetype)}: ${count.resourcecount}\n`;
    }

    return result.trim();
  }

  private formatRoleResponse(operation: string, response: any): string {
    if (response.role) {
      const role = response.role;
      return `${operation} completed successfully.\nRole: ${role.name} (${role.id})\nType: ${role.type}\nDescription: ${role.description || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatRoleListResponse(response: any): string {
    const roles = response.role || [];
    
    if (roles.length === 0) {
      return 'No roles found.';
    }

    let result = `Found ${roles.length} role(s):\n\n`;
    
    for (const role of roles) {
      result += `Role: ${role.name} (${role.id})\n`;
      result += `  Type: ${role.type}\n`;
      result += `  Description: ${role.description || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatRolePermissionResponse(operation: string, response: any): string {
    if (response.rolepermission) {
      const permission = response.rolepermission;
      return `${operation} completed successfully.\nRule: ${permission.rule}\nPermission: ${permission.permission}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatRolePermissionListResponse(response: any): string {
    const permissions = response.rolepermission || [];
    
    if (permissions.length === 0) {
      return 'No role permissions found.';
    }

    let result = `Found ${permissions.length} role permission(s):\n\n`;
    
    for (const permission of permissions) {
      result += `Rule: ${permission.rule}\n`;
      result += `  Permission: ${permission.permission}\n`;
      result += `  Description: ${permission.description || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatProjectResponse(operation: string, response: any): string {
    if (response.project) {
      const project = response.project;
      return `${operation} completed successfully.\nProject: ${project.name} (${project.id})\nDisplay Text: ${project.displaytext}\nState: ${project.state}\nDomain: ${project.domain || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatProjectListResponse(response: any): string {
    const projects = response.project || [];
    
    if (projects.length === 0) {
      return 'No projects found.';
    }

    let result = `Found ${projects.length} project(s):\n\n`;
    
    for (const project of projects) {
      result += `Project: ${project.name} (${project.id})\n`;
      result += `  Display Text: ${project.displaytext}\n`;
      result += `  State: ${project.state}\n`;
      result += `  Domain: ${project.domain || 'N/A'}\n`;
      result += `  Created: ${project.created || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatProjectAccountResponse(operation: string, response: any): string {
    if (response.account) {
      const account = response.account;
      return `${operation} completed successfully.\nAccount: ${account.account}\nRole: ${account.role || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatProjectAccountListResponse(response: any): string {
    const accounts = response.account || [];
    
    if (accounts.length === 0) {
      return 'No project accounts found.';
    }

    let result = `Found ${accounts.length} project account(s):\n\n`;
    
    for (const account of accounts) {
      result += `Account: ${account.account}\n`;
      result += `  Role: ${account.role || 'N/A'}\n`;
      result += `  Domain: ${account.domain || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  // Advanced Networking Response Formatting Methods
  private formatNetworkOfferingResponse(operation: string, response: any): string {
    if (response.networkoffering) {
      const offering = response.networkoffering;
      return `${operation} completed successfully.\nNetwork Offering: ${offering.name} (${offering.id})\nDisplay Text: ${offering.displaytext}\nType: ${offering.guestiptype}\nTraffic Type: ${offering.traffictype}\nState: ${offering.state || 'N/A'}`;
    }
    
    if (response.jobid) {
      return `${operation} - Job ID: ${response.jobid}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatVlanIpRangeResponse(operation: string, response: any): string {
    if (response.vlan) {
      const vlan = response.vlan;
      return `${operation} successfully.\nVLAN: ${vlan.vlan || 'N/A'} (${vlan.id})\nIP Range: ${vlan.startip} - ${vlan.endip}\nGateway: ${vlan.gateway || 'N/A'}\nNetmask: ${vlan.netmask || 'N/A'}\nZone: ${vlan.zonename || vlan.zoneid || 'N/A'}`;
    }
    
    if (response.jobid) {
      return `${operation} - Job ID: ${response.jobid}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatVlanIpRangeListResponse(response: any): string {
    const vlans = response.vlan || [];
    
    if (vlans.length === 0) {
      return 'No VLAN IP ranges found.';
    }

    let result = `Found ${vlans.length} VLAN IP range(s):\n\n`;
    
    for (const vlan of vlans) {
      result += `VLAN: ${vlan.vlan || 'N/A'} (${vlan.id})\n`;
      result += `  IP Range: ${vlan.startip} - ${vlan.endip}\n`;
      result += `  Gateway: ${vlan.gateway || 'N/A'}\n`;
      result += `  Netmask: ${vlan.netmask || 'N/A'}\n`;
      result += `  Zone: ${vlan.zonename || vlan.zoneid || 'N/A'}\n`;
      result += `  Physical Network: ${vlan.physicalnetworkname || vlan.physicalnetworkid || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatIpForwardingRuleListResponse(response: any): string {
    const rules = response.ipforwardingrule || [];
    
    if (rules.length === 0) {
      return 'No IP forwarding rules found.';
    }

    let result = `Found ${rules.length} IP forwarding rule(s):\n\n`;
    
    for (const rule of rules) {
      result += `Rule ID: ${rule.id}\n`;
      result += `  Protocol: ${rule.protocol}\n`;
      result += `  Port Range: ${rule.startport}`;
      if (rule.endport && rule.endport !== rule.startport) {
        result += ` - ${rule.endport}`;
      }
      result += `\n`;
      result += `  Public IP: ${rule.publicip || 'N/A'}\n`;
      result += `  VM: ${rule.virtualmachinename || 'N/A'} (${rule.virtualmachineid || 'N/A'})\n`;
      result += `  State: ${rule.state || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  // VPN Services Response Formatting Methods
  private formatVpnConnectionListResponse(response: any): string {
    const connections = response.vpnconnection || [];
    
    if (connections.length === 0) {
      return 'No VPN connections found.';
    }

    let result = `Found ${connections.length} VPN connection(s):\n\n`;
    
    for (const conn of connections) {
      result += `Connection ID: ${conn.id}\n`;
      result += `  State: ${conn.state || 'N/A'}\n`;
      result += `  Customer Gateway: ${conn.customergatewayid || 'N/A'}\n`;
      result += `  VPN Gateway: ${conn.vpngatewayid || 'N/A'}\n`;
      result += `  Public IP: ${conn.publicip || 'N/A'}\n`;
      result += `  Gateway: ${conn.gateway || 'N/A'}\n`;
      result += `  CIDR List: ${conn.cidrlist || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatVpnGatewayListResponse(response: any): string {
    const gateways = response.vpngateway || [];
    
    if (gateways.length === 0) {
      return 'No VPN gateways found.';
    }

    let result = `Found ${gateways.length} VPN gateway(s):\n\n`;
    
    for (const gw of gateways) {
      result += `Gateway ID: ${gw.id}\n`;
      result += `  VPC: ${gw.vpcname || gw.vpcid || 'N/A'}\n`;
      result += `  Public IP: ${gw.publicip || 'N/A'}\n`;
      result += `  Account: ${gw.account || 'N/A'}\n`;
      result += `  Domain: ${gw.domain || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatCustomerGatewayListResponse(response: any): string {
    const gateways = response.vpncustomergateway || [];
    
    if (gateways.length === 0) {
      return 'No customer gateways found.';
    }

    let result = `Found ${gateways.length} customer gateway(s):\n\n`;
    
    for (const gw of gateways) {
      result += `Gateway ID: ${gw.id}\n`;
      result += `  Name: ${gw.name || 'N/A'}\n`;
      result += `  Gateway: ${gw.gateway || 'N/A'}\n`;
      result += `  CIDR List: ${gw.cidrlist || 'N/A'}\n`;
      result += `  ESP Policy: ${gw.esppolicy || 'N/A'}\n`;
      result += `  IKE Policy: ${gw.ikepolicy || 'N/A'}\n`;
      result += `  Account: ${gw.account || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatRemoteAccessVpnListResponse(response: any): string {
    const vpns = response.remoteaccessvpn || [];
    
    if (vpns.length === 0) {
      return 'No Remote Access VPNs found.';
    }

    let result = `Found ${vpns.length} Remote Access VPN(s):\n\n`;
    
    for (const vpn of vpns) {
      result += `VPN ID: ${vpn.id}\n`;
      result += `  Public IP: ${vpn.publicip || 'N/A'}\n`;
      result += `  IP Range: ${vpn.iprange || 'N/A'}\n`;
      result += `  Pre-shared Key: ${vpn.presharedkey || 'N/A'}\n`;
      result += `  State: ${vpn.state || 'N/A'}\n`;
      result += `  Account: ${vpn.account || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatVpnUserListResponse(response: any): string {
    const users = response.vpnuser || [];
    
    if (users.length === 0) {
      return 'No VPN users found.';
    }

    let result = `Found ${users.length} VPN user(s):\n\n`;
    
    for (const user of users) {
      result += `User ID: ${user.id}\n`;
      result += `  Username: ${user.username || 'N/A'}\n`;
      result += `  Account: ${user.account || 'N/A'}\n`;
      result += `  Domain: ${user.domain || 'N/A'}\n`;
      result += `  State: ${user.state || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  // VPC Offerings Response Formatting Methods
  private formatVpcOfferingResponse(operation: string, response: any): string {
    if (response.vpcoffering) {
      const offering = response.vpcoffering;
      return `${operation} completed successfully.\nVPC Offering: ${offering.name} (${offering.id})\nDisplay Text: ${offering.displaytext}\nState: ${offering.state || 'N/A'}\nDefault: ${offering.isdefault ? 'Yes' : 'No'}`;
    }
    
    if (response.jobid) {
      return `${operation} - Job ID: ${response.jobid}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatVpcOfferingListResponse(response: any): string {
    const offerings = response.vpcoffering || [];
    
    if (offerings.length === 0) {
      return 'No VPC offerings found.';
    }

    let result = `Found ${offerings.length} VPC offering(s):\n\n`;
    
    for (const offering of offerings) {
      result += `VPC Offering: ${offering.name} (${offering.id})\n`;
      result += `  Display Text: ${offering.displaytext}\n`;
      result += `  State: ${offering.state || 'N/A'}\n`;
      result += `  Default: ${offering.isdefault ? 'Yes' : 'No'}\n`;
      result += `  Created: ${offering.created || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  // Network ACL Lists Response Formatting Methods
  private formatNetworkAclListResponse(response: any): string {
    const acllists = response.networkacl || [];
    
    if (acllists.length === 0) {
      return 'No Network ACL lists found.';
    }

    let result = `Found ${acllists.length} Network ACL list(s):\n\n`;
    
    for (const acl of acllists) {
      result += `ACL List: ${acl.name} (${acl.id})\n`;
      result += `  Description: ${acl.description || 'N/A'}\n`;
      result += `  VPC: ${acl.vpcname || acl.vpcid || 'N/A'}\n`;
      result += `  Account: ${acl.account || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  // System Administration Response Formatting Methods
  private formatConfigurationListResponse(response: any): string {
    const configs = response.configuration || [];
    
    if (configs.length === 0) {
      return 'No configurations found.';
    }

    let result = `Found ${configs.length} configuration(s):\n\n`;
    
    for (const config of configs) {
      result += `${config.name}:\n`;
      result += `  Value: ${config.value || 'N/A'}\n`;
      result += `  Category: ${config.category || 'N/A'}\n`;
      result += `  Description: ${config.description || 'N/A'}\n`;
      result += `  Scope: ${config.scope || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatConfigurationResponse(operation: string, response: any): string {
    if (response.configuration) {
      const config = response.configuration;
      return `${operation} completed successfully.\nConfiguration: ${config.name}\nNew Value: ${config.value}\nCategory: ${config.category || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatCapabilitiesResponse(response: any): string {
    if (response.capability) {
      const cap = response.capability;
      let result = 'CloudStack Capabilities:\n\n';
      result += `CloudStack Version: ${cap.cloudstackversion || 'N/A'}\n`;
      result += `User Public Template Creation: ${cap.userpublictemplateenabled ? 'Enabled' : 'Disabled'}\n`;
      result += `Custom Disk Offering: ${cap.customdiskofferingdisplaytext ? 'Enabled' : 'Disabled'}\n`;
      result += `Project Invitations: ${cap.allowuserexpungerecovervm ? 'Enabled' : 'Disabled'}\n`;
      result += `Dynamic Roles: ${cap.dynamicrolesenabled ? 'Enabled' : 'Disabled'}\n`;
      result += `Security Groups: ${cap.securitygroupsenabled ? 'Enabled' : 'Disabled'}\n`;
      
      if (cap.supportELB) {
        result += `Elastic Load Balancer: Supported\n`;
      }
      
      return result;
    }
    
    return 'No capability information available.';
  }

  private formatAlertListResponse(response: any): string {
    const alerts = response.alert || [];
    
    if (alerts.length === 0) {
      return 'No alerts found.';
    }

    let result = `Found ${alerts.length} alert(s):\n\n`;
    
    for (const alert of alerts) {
      result += `Alert: ${alert.name || alert.type || 'N/A'} (${alert.id})\n`;
      result += `  Type: ${alert.type || 'N/A'}\n`;
      result += `  Subject: ${alert.subject || 'N/A'}\n`;
      result += `  Description: ${alert.description || 'N/A'}\n`;
      result += `  Sent: ${alert.sent || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatEventListResponse(response: any): string {
    const events = response.event || [];
    
    if (events.length === 0) {
      return 'No events found.';
    }

    let result = `Found ${events.length} event(s):\n\n`;
    
    for (const event of events) {
      result += `Event: ${event.type || 'N/A'} (${event.id})\n`;
      result += `  Description: ${event.description || 'N/A'}\n`;
      result += `  Level: ${event.level || 'N/A'}\n`;
      result += `  Account: ${event.account || 'N/A'}\n`;
      result += `  Created: ${event.created || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatSystemVmListResponse(response: any): string {
    const vms = response.systemvm || [];
    
    if (vms.length === 0) {
      return 'No system VMs found.';
    }

    let result = `Found ${vms.length} system VM(s):\n\n`;
    
    for (const vm of vms) {
      result += `System VM: ${vm.name || 'N/A'} (${vm.id})\n`;
      result += `  Type: ${vm.systemvmtype || 'N/A'}\n`;
      result += `  State: ${vm.state || 'N/A'}\n`;
      result += `  Host: ${vm.hostname || vm.hostid || 'N/A'}\n`;
      result += `  Zone: ${vm.zonename || vm.zoneid || 'N/A'}\n`;
      result += `  Public IP: ${vm.publicip || 'N/A'}\n`;
      result += `  Private IP: ${vm.privateip || 'N/A'}\n`;
      result += `  Created: ${vm.created || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatRouterListResponse(response: any): string {
    const routers = response.router || [];
    
    if (routers.length === 0) {
      return 'No virtual routers found.';
    }

    let result = `Found ${routers.length} virtual router(s):\n\n`;
    
    for (const router of routers) {
      result += `Router: ${router.name || 'N/A'} (${router.id})\n`;
      result += `  State: ${router.state || 'N/A'}\n`;
      result += `  Account: ${router.account || 'N/A'}\n`;
      result += `  Zone: ${router.zonename || router.zoneid || 'N/A'}\n`;
      result += `  Host: ${router.hostname || router.hostid || 'N/A'}\n`;
      result += `  Public IP: ${router.publicip || 'N/A'}\n`;
      result += `  Link Local IP: ${router.linklocalip || 'N/A'}\n`;
      result += `  Role: ${router.role || 'N/A'}\n`;
      result += `  Created: ${router.created || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  // Storage Pool Management Response Formatting Methods
  private formatStoragePoolListResponse(response: any): string {
    const pools = response.storagepool || [];
    
    if (pools.length === 0) {
      return 'No storage pools found.';
    }

    let result = `Found ${pools.length} storage pool(s):\n\n`;
    
    for (const pool of pools) {
      result += `Storage Pool: ${pool.name || 'N/A'} (${pool.id})\n`;
      result += `  Type: ${pool.type || 'N/A'}\n`;
      result += `  State: ${pool.state || 'N/A'}\n`;
      result += `  Path: ${pool.path || 'N/A'}\n`;
      result += `  Zone: ${pool.zonename || pool.zoneid || 'N/A'}\n`;
      result += `  Cluster: ${pool.clustername || pool.clusterid || 'N/A'}\n`;
      result += `  Scope: ${pool.scope || 'N/A'}\n`;
      result += `  Capacity: ${pool.disksizeallocated || 'N/A'} / ${pool.disksizetotal || 'N/A'}\n`;
      result += `  Tags: ${pool.tags || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatStoragePoolResponse(operation: string, response: any): string {
    if (response.storagepool) {
      const pool = response.storagepool;
      return `${operation} completed successfully.\nStorage Pool: ${pool.name} (${pool.id})\nType: ${pool.type}\nState: ${pool.state}\nPath: ${pool.path}`;
    }
    
    if (response.jobid) {
      return `${operation} - Job ID: ${response.jobid}`;
    }
    
    return `${operation} completed successfully.`;
  }

  // Monitoring & Usage Response Formatting Methods
  private formatUsageRecordListResponse(response: any): string {
    const records = response.usagerecord || [];
    
    if (records.length === 0) {
      return 'No usage records found.';
    }

    let result = `Found ${records.length} usage record(s):\n\n`;
    
    for (const record of records) {
      result += `Usage Record: ${record.usageid || 'N/A'}\n`;
      result += `  Account: ${record.account || 'N/A'}\n`;
      result += `  Type: ${record.usagetype || 'N/A'}\n`;
      result += `  Description: ${record.description || 'N/A'}\n`;
      result += `  Usage: ${record.usage || 'N/A'}\n`;
      result += `  Start Date: ${record.startdate || 'N/A'}\n`;
      result += `  End Date: ${record.enddate || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatCapacityListResponse(response: any): string {
    const capacities = response.capacity || [];
    
    if (capacities.length === 0) {
      return 'No capacity information found.';
    }

    let result = `Found ${capacities.length} capacity item(s):\n\n`;
    
    for (const cap of capacities) {
      result += `Capacity Type: ${this.getCapacityTypeName(cap.type)} (${cap.type})\n`;
      result += `  Zone: ${cap.zonename || cap.zoneid || 'N/A'}\n`;
      result += `  Capacity Used: ${cap.capacityused || 'N/A'}\n`;
      result += `  Capacity Total: ${cap.capacitytotal || 'N/A'}\n`;
      result += `  Percent Used: ${cap.percentused || 'N/A'}%\n`;
      result += `  Pod: ${cap.podname || cap.podid || 'N/A'}\n`;
      result += `  Cluster: ${cap.clustername || cap.clusterid || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatAsyncJobListResponse(response: any): string {
    const jobs = response.asyncjobs || [];
    
    if (jobs.length === 0) {
      return 'No async jobs found.';
    }

    let result = `Found ${jobs.length} async job(s):\n\n`;
    
    for (const job of jobs) {
      result += `Job: ${job.cmd || 'N/A'} (${job.jobid})\n`;
      result += `  Status: ${this.getJobStatusName(job.jobstatus)}\n`;
      result += `  Progress: ${job.jobprocstatus || 'N/A'}\n`;
      result += `  Account: ${job.account || 'N/A'}\n`;
      result += `  Created: ${job.created || 'N/A'}\n\n`;
    }

    return result.trim();
  }

  private formatAsyncJobResultResponse(response: any): string {
    if (response.asyncjobs && response.asyncjobs.length > 0) {
      const job = response.asyncjobs[0];
      let result = `Job Result: ${job.cmd || 'N/A'} (${job.jobid})\n`;
      result += `Status: ${this.getJobStatusName(job.jobstatus)}\n`;
      result += `Progress: ${job.jobprocstatus || 'N/A'}\n`;
      result += `Account: ${job.account || 'N/A'}\n`;
      result += `Created: ${job.created || 'N/A'}\n`;
      
      if (job.jobresult) {
        result += `\nResult:\n${JSON.stringify(job.jobresult, null, 2)}`;
      }
      
      return result;
    }
    
    return 'No job result found.';
  }

  // Helper Methods
  private getAccountTypeName(type: number): string {
    switch (type) {
      case 0: return 'User';
      case 1: return 'Root Admin';
      case 2: return 'Domain Admin';
      default: return `Unknown (${type})`;
    }
  }

  private getResourceTypeName(type: number): string {
    switch (type) {
      case 0: return 'Instances (VMs)';
      case 1: return 'Public IP addresses';
      case 2: return 'Disk volumes';
      case 3: return 'Snapshots';
      case 4: return 'Templates';
      case 6: return 'Networks';
      case 7: return 'VPCs';
      case 8: return 'CPU cores';
      case 9: return 'Memory (RAM)';
      case 10: return 'Primary storage';
      case 11: return 'Secondary storage';
      default: return `Unknown resource type (${type})`;
    }
  }

  private getCapacityTypeName(type: number): string {
    switch (type) {
      case 0: return 'Memory';
      case 1: return 'CPU';
      case 2: return 'Storage';
      case 3: return 'Storage Allocated';
      case 4: return 'Virtual Network Public IP';
      case 5: return 'Private IP';
      case 6: return 'Secondary Storage';
      case 7: return 'VLAN';
      case 8: return 'Direct Attached Public IP';
      case 9: return 'Local Storage';
      case 19: return 'GPU';
      default: return `Unknown Capacity Type (${type})`;
    }
  }

  private getJobStatusName(status: number): string {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'In Progress'; 
      case 2: return 'Completed';
      case 3: return 'Failed';
      default: return `Unknown Status (${status})`;
    }
  }

  // Response Formatting Methods for Advanced Network Management
  private formatRouterHealthChecksResponse(response: any): string {
    if (response.routerhealthcheck && response.routerhealthcheck.length > 0) {
      let result = `Router Health Checks (${response.routerhealthcheck.length} checks):\n\n`;
      
      response.routerhealthcheck.forEach((check: any, index: number) => {
        result += `${index + 1}. Check: ${check.checkname || 'N/A'}\n`;
        result += `   Router: ${check.routerid || 'N/A'}\n`;
        result += `   Status: ${check.checkresult || 'N/A'}\n`;
        result += `   Last Update: ${check.lastupdated || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No router health checks found.';
  }

  private formatRouterHealthCheckResultsResponse(response: any): string {
    if (response.routerhealthcheckresults) {
      const results = response.routerhealthcheckresults;
      let result = `Router Health Check Results:\n\n`;
      result += `Router ID: ${results.routerid || 'N/A'}\n`;
      result += `Overall Status: ${results.status || 'N/A'}\n`;
      result += `Check Time: ${results.checktime || 'N/A'}\n\n`;
      
      if (results.checks && results.checks.length > 0) {
        result += `Individual Checks (${results.checks.length}):\n`;
        results.checks.forEach((check: any, index: number) => {
          result += `${index + 1}. ${check.name || 'N/A'}: ${check.result || 'N/A'}\n`;
          if (check.details) {
            result += `   Details: ${check.details}\n`;
          }
        });
      }
      
      return result.trim();
    }
    
    return 'No router health check results found.';
  }

  private formatVirtualRouterElementResponse(response: any): string {
    if (response.virtualrouterelement) {
      const element = response.virtualrouterelement;
      let result = `Virtual Router Element Configuration:\n\n`;
      result += `ID: ${element.id || 'N/A'}\n`;
      result += `NSP ID: ${element.nspid || 'N/A'}\n`;
      result += `Enabled: ${element.enabled || 'N/A'}\n`;
      result += `Provider Name: ${element.providername || 'N/A'}\n`;
      
      return result;
    }
    
    return 'Virtual router element configuration not found.';
  }

  private formatStaticRoutesResponse(response: any): string {
    if (response.staticroute && response.staticroute.length > 0) {
      let result = `Static Routes (${response.staticroute.length} routes):\n\n`;
      
      response.staticroute.forEach((route: any, index: number) => {
        result += `${index + 1}. Route ID: ${route.id || 'N/A'}\n`;
        result += `   CIDR: ${route.cidr || 'N/A'}\n`;
        result += `   Gateway ID: ${route.gatewayid || 'N/A'}\n`;
        result += `   VPC ID: ${route.vpcid || 'N/A'}\n`;
        result += `   State: ${route.state || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No static routes found.';
  }

  private formatPrivateGatewaysResponse(response: any): string {
    if (response.privategateway && response.privategateway.length > 0) {
      let result = `Private Gateways (${response.privategateway.length} gateways):\n\n`;
      
      response.privategateway.forEach((gateway: any, index: number) => {
        result += `${index + 1}. Gateway ID: ${gateway.id || 'N/A'}\n`;
        result += `   IP Address: ${gateway.ipaddress || 'N/A'}\n`;
        result += `   Gateway: ${gateway.gateway || 'N/A'}\n`;
        result += `   Netmask: ${gateway.netmask || 'N/A'}\n`;
        result += `   VLAN: ${gateway.vlan || 'N/A'}\n`;
        result += `   VPC ID: ${gateway.vpcid || 'N/A'}\n`;
        result += `   State: ${gateway.state || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No private gateways found.';
  }

  private formatRemoteAccessVpnsResponse(response: any): string {
    if (response.remoteaccessvpn && response.remoteaccessvpn.length > 0) {
      let result = `Remote Access VPNs (${response.remoteaccessvpn.length} VPNs):\n\n`;
      
      response.remoteaccessvpn.forEach((vpn: any, index: number) => {
        result += `${index + 1}. VPN ID: ${vpn.id || 'N/A'}\n`;
        result += `   Public IP: ${vpn.publicip || 'N/A'}\n`;
        result += `   Public IP ID: ${vpn.publicipid || 'N/A'}\n`;
        result += `   IP Range: ${vpn.iprange || 'N/A'}\n`;
        result += `   Pre-shared Key: ${vpn.presharedkey || 'N/A'}\n`;
        result += `   State: ${vpn.state || 'N/A'}\n`;
        result += `   Account: ${vpn.account || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No remote access VPNs found.';
  }

  private formatVpnUsersResponse(response: any): string {
    if (response.vpnuser && response.vpnuser.length > 0) {
      let result = `VPN Users (${response.vpnuser.length} users):\n\n`;
      
      response.vpnuser.forEach((user: any, index: number) => {
        result += `${index + 1}. User ID: ${user.id || 'N/A'}\n`;
        result += `   Username: ${user.username || 'N/A'}\n`;
        result += `   Account: ${user.account || 'N/A'}\n`;
        result += `   Domain: ${user.domain || 'N/A'}\n`;
        result += `   State: ${user.state || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No VPN users found.';
  }

  // VPN Services Enhancement Response Formatters
  private formatVpnGatewayResponse(operation: string, response: any): string {
    if (response.vpngateway) {
      const gateway = response.vpngateway;
      let result = `${operation} successful:\n\n`;
      result += `VPN Gateway ID: ${gateway.id || 'N/A'}\n`;
      result += `Public IP: ${gateway.publicip || 'N/A'}\n`;
      result += `VPC ID: ${gateway.vpcid || 'N/A'}\n`;
      result += `Account: ${gateway.account || 'N/A'}\n`;
      result += `Domain: ${gateway.domain || 'N/A'}\n`;
      result += `State: ${gateway.removed ? 'Removed' : 'Active'}\n`;
      return result;
    }
    return `${operation} completed successfully.`;
  }

  private formatVpnConnectionResponse(operation: string, response: any): string {
    if (response.vpnconnection) {
      const connection = response.vpnconnection;
      let result = `${operation} successful:\n\n`;
      result += `VPN Connection ID: ${connection.id || 'N/A'}\n`;
      result += `Customer Gateway ID: ${connection.customergatewayid || 'N/A'}\n`;
      result += `VPN Gateway ID: ${connection.vpngatewayid || 'N/A'}\n`;
      result += `State: ${connection.state || 'N/A'}\n`;
      result += `Account: ${connection.account || 'N/A'}\n`;
      result += `Domain: ${connection.domain || 'N/A'}\n`;
      return result;
    }
    return `${operation} completed successfully.`;
  }

  private formatVpnInstancesResponse(response: any): string {
    if (response.vpninstance && response.vpninstance.length > 0) {
      let result = `VPN Instances (${response.vpninstance.length} instances):\n\n`;
      
      response.vpninstance.forEach((instance: any, index: number) => {
        result += `${index + 1}. Instance ID: ${instance.id || 'N/A'}\n`;
        result += `   Type: ${instance.type || 'N/A'}\n`;
        result += `   Public IP: ${instance.publicip || 'N/A'}\n`;
        result += `   Private IP: ${instance.privateip || 'N/A'}\n`;
        result += `   State: ${instance.state || 'N/A'}\n`;
        result += `   Account: ${instance.account || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No VPN instances found.';
  }

  private formatVpnCustomerGatewayResponse(operation: string, response: any): string {
    if (response.vpncustomergateway) {
      const gateway = response.vpncustomergateway;
      let result = `${operation} successful:\n\n`;
      result += `Customer Gateway ID: ${gateway.id || 'N/A'}\n`;
      result += `Name: ${gateway.name || 'N/A'}\n`;
      result += `Gateway: ${gateway.gateway || 'N/A'}\n`;
      result += `CIDR List: ${gateway.cidrlist || 'N/A'}\n`;
      result += `IKE Policy: ${gateway.ikepolicy || 'N/A'}\n`;
      result += `ESP Policy: ${gateway.esppolicy || 'N/A'}\n`;
      result += `Account: ${gateway.account || 'N/A'}\n`;
      result += `Domain: ${gateway.domain || 'N/A'}\n`;
      return result;
    }
    return `${operation} completed successfully.`;
  }

  private formatRemoteAccessVpnResponse(operation: string, response: any): string {
    if (response.remoteaccessvpn) {
      const vpn = response.remoteaccessvpn;
      let result = `${operation} successful:\n\n`;
      result += `Remote Access VPN ID: ${vpn.id || 'N/A'}\n`;
      result += `Public IP: ${vpn.publicip || 'N/A'}\n`;
      result += `Public IP ID: ${vpn.publicipid || 'N/A'}\n`;
      result += `IP Range: ${vpn.iprange || 'N/A'}\n`;
      result += `Pre-shared Key: ${vpn.presharedkey || 'N/A'}\n`;
      result += `State: ${vpn.state || 'N/A'}\n`;
      result += `Account: ${vpn.account || 'N/A'}\n`;
      result += `Domain: ${vpn.domain || 'N/A'}\n`;
      return result;
    }
    return `${operation} completed successfully.`;
  }

  // Load Balancer Enhancement Response Formatters
  private formatHealthCheckPolicyResponse(response: any): string {
    if (response.healthcheckpolicy && response.healthcheckpolicy.length > 0) {
      let result = `Health Check Policies (${response.healthcheckpolicy.length} policies):\n\n`;
      
      response.healthcheckpolicy.forEach((policy: any, index: number) => {
        result += `${index + 1}. Policy ID: ${policy.id || 'N/A'}\n`;
        result += `   Ping Path: ${policy.pingpath || 'N/A'}\n`;
        result += `   Response Timeout: ${policy.responsetimeout || 'N/A'}s\n`;
        result += `   Healthy Threshold: ${policy.healthythreshold || 'N/A'}\n`;
        result += `   Unhealthy Threshold: ${policy.unhealthythreshold || 'N/A'}\n`;
        result += `   Interval Time: ${policy.intervaltime || 'N/A'}s\n`;
        result += `   Load Balancer Rule ID: ${policy.lbruleid || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    if (response.healthcheckpolicy) {
      const policy = response.healthcheckpolicy;
      return `Health Check Policy updated:\n\nPolicy ID: ${policy.id || 'N/A'}\nPing Path: ${policy.pingpath || 'N/A'}\nResponse Timeout: ${policy.responsetimeout || 'N/A'}s`;
    }
    
    return 'No health check policies found.';
  }

  private formatStickinessPolicyResponse(response: any): string {
    if (response.stickinesspolicy && response.stickinesspolicy.length > 0) {
      let result = `Stickiness Policies (${response.stickinesspolicy.length} policies):\n\n`;
      
      response.stickinesspolicy.forEach((policy: any, index: number) => {
        result += `${index + 1}. Policy ID: ${policy.id || 'N/A'}\n`;
        result += `   Name: ${policy.name || 'N/A'}\n`;
        result += `   Method: ${policy.methodname || 'N/A'}\n`;
        result += `   Parameters: ${policy.params || 'N/A'}\n`;
        result += `   Load Balancer Rule ID: ${policy.lbruleid || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    if (response.stickinesspolicy) {
      const policy = response.stickinesspolicy;
      return `Stickiness Policy updated:\n\nPolicy ID: ${policy.id || 'N/A'}\nName: ${policy.name || 'N/A'}\nMethod: ${policy.methodname || 'N/A'}`;
    }
    
    return 'No stickiness policies found.';
  }

  private formatApplicationLoadBalancerResponse(operation: string, response: any): string {
    if (response.applicationloadbalancer && response.applicationloadbalancer.length > 0) {
      let result = `Application Load Balancers (${response.applicationloadbalancer.length} load balancers):\n\n`;
      
      response.applicationloadbalancer.forEach((lb: any, index: number) => {
        result += `${index + 1}. Load Balancer ID: ${lb.id || 'N/A'}\n`;
        result += `   Name: ${lb.name || 'N/A'}\n`;
        result += `   Description: ${lb.description || 'N/A'}\n`;
        result += `   Algorithm: ${lb.algorithm || 'N/A'}\n`;
        result += `   Source IP: ${lb.sourceipaddress || 'N/A'}\n`;
        result += `   Network ID: ${lb.sourceipaddressnetworkid || 'N/A'}\n`;
        result += `   Scheme: ${lb.scheme || 'N/A'}\n`;
        result += `   State: ${lb.state || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    if (response.applicationloadbalancer) {
      const lb = response.applicationloadbalancer;
      return `${operation} successful:\n\nLoad Balancer ID: ${lb.id || 'N/A'}\nName: ${lb.name || 'N/A'}\nAlgorithm: ${lb.algorithm || 'N/A'}\nState: ${lb.state || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatGlobalLoadBalancerResponse(operation: string, response: any): string {
    if (response.globalloadbalancerrule && response.globalloadbalancerrule.length > 0) {
      let result = `Global Load Balancer Rules (${response.globalloadbalancerrule.length} rules):\n\n`;
      
      response.globalloadbalancerrule.forEach((lb: any, index: number) => {
        result += `${index + 1}. Rule ID: ${lb.id || 'N/A'}\n`;
        result += `   Name: ${lb.name || 'N/A'}\n`;
        result += `   Description: ${lb.description || 'N/A'}\n`;
        result += `   GSLB Domain: ${lb.gslbdomainname || 'N/A'}\n`;
        result += `   Service Type: ${lb.gslbservicetype || 'N/A'}\n`;
        result += `   Region ID: ${lb.regionid || 'N/A'}\n`;
        result += `   State: ${lb.state || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    if (response.globalloadbalancerrule) {
      const lb = response.globalloadbalancerrule;
      return `${operation} successful:\n\nRule ID: ${lb.id || 'N/A'}\nName: ${lb.name || 'N/A'}\nGSLB Domain: ${lb.gslbdomainname || 'N/A'}\nService Type: ${lb.gslbservicetype || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }


  private formatLoadBalancerCertificatesResponse(response: any): string {
    if (response.lbcertificate && response.lbcertificate.length > 0) {
      let result = `Load Balancer Certificates (${response.lbcertificate.length} certificates):\n\n`;
      
      response.lbcertificate.forEach((cert: any, index: number) => {
        result += `${index + 1}. Certificate ID: ${cert.id || 'N/A'}\n`;
        result += `   Name: ${cert.name || 'N/A'}\n`;
        result += `   Load Balancer Rule ID: ${cert.lbruleid || 'N/A'}\n`;
        result += `   Certificate Chain: ${cert.certchain ? 'Present' : 'Not provided'}\n`;
        result += `   Account: ${cert.account || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No load balancer certificates found.';
  }

  private formatLoadBalancerMetricsResponse(response: any): string {
    if (response.loadbalancermetrics && response.loadbalancermetrics.length > 0) {
      let result = `Load Balancer Metrics (${response.loadbalancermetrics.length} metrics):\n\n`;
      
      response.loadbalancermetrics.forEach((metric: any, index: number) => {
        result += `${index + 1}. Metric Period: ${metric.startdate || 'N/A'} - ${metric.enddate || 'N/A'}\n`;
        result += `   Load Balancer Rule ID: ${metric.lbruleid || 'N/A'}\n`;
        result += `   Requests: ${metric.requests || 'N/A'}\n`;
        result += `   Bytes Transferred: ${metric.bytes || 'N/A'}\n`;
        result += `   Active Connections: ${metric.activeconnections || 'N/A'}\n`;
        result += `   Response Time: ${metric.responsetime || 'N/A'}ms\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No load balancer metrics found.';
  }

  private formatLoadBalancerHealthResponse(response: any): string {
    if (response.loadbalancerhealth) {
      const health = response.loadbalancerhealth;
      let result = `Load Balancer Health Status:\n\n`;
      result += `Load Balancer Rule ID: ${health.lbruleid || 'N/A'}\n`;
      result += `Overall Status: ${health.status || 'N/A'}\n`;
      result += `Active Instances: ${health.activeinstances || 'N/A'}\n`;
      result += `Total Instances: ${health.totalinstances || 'N/A'}\n`;
      result += `Last Check: ${health.lastcheck || 'N/A'}\n`;
      
      if (health.instances && health.instances.length > 0) {
        result += `\nInstance Health Details:\n`;
        health.instances.forEach((instance: any, index: number) => {
          result += `  ${index + 1}. Instance ${instance.id || 'N/A'}: ${instance.status || 'N/A'}\n`;
        });
      }
      
      return result;
    }
    
    return 'Load balancer health information not found.';
  }

  private formatNetworkServiceProvidersResponse(response: any): string {
    if (response.networkserviceprovider && response.networkserviceprovider.length > 0) {
      let result = `Network Service Providers (${response.networkserviceprovider.length} providers):\n\n`;
      
      response.networkserviceprovider.forEach((provider: any, index: number) => {
        result += `${index + 1}. Provider ID: ${provider.id || 'N/A'}\n`;
        result += `   Name: ${provider.name || 'N/A'}\n`;
        result += `   Physical Network ID: ${provider.physicalnetworkid || 'N/A'}\n`;
        result += `   State: ${provider.state || 'N/A'}\n`;
        result += `   Service List: ${provider.servicelist ? provider.servicelist.join(', ') : 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No network service providers found.';
  }

  private formatNetworkServiceProviderResponse(response: any): string {
    if (response.networkserviceprovider) {
      const provider = response.networkserviceprovider;
      let result = `Network Service Provider:\n\n`;
      result += `ID: ${provider.id || 'N/A'}\n`;
      result += `Name: ${provider.name || 'N/A'}\n`;
      result += `Physical Network ID: ${provider.physicalnetworkid || 'N/A'}\n`;
      result += `State: ${provider.state || 'N/A'}\n`;
      result += `Service List: ${provider.servicelist ? provider.servicelist.join(', ') : 'N/A'}\n`;
      
      return result;
    }
    
    return 'Network service provider information not found.';
  }

  private formatDhcpOptionsResponse(response: any): string {
    if (response.dhcpoption && response.dhcpoption.length > 0) {
      let result = `DHCP Options (${response.dhcpoption.length} options):\n\n`;
      
      response.dhcpoption.forEach((option: any, index: number) => {
        result += `${index + 1}. Option ID: ${option.id || 'N/A'}\n`;
        result += `   Network ID: ${option.networkid || 'N/A'}\n`;
        result += `   NIC ID: ${option.nicid || 'N/A'}\n`;
        result += `   Options: ${option.dhcpoptions || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No DHCP options found.';
  }

  private formatEgressFirewallRulesResponse(response: any): string {
    if (response.firewallrule && response.firewallrule.length > 0) {
      let result = `Egress Firewall Rules (${response.firewallrule.length} rules):\n\n`;
      
      response.firewallrule.forEach((rule: any, index: number) => {
        result += `${index + 1}. Rule ID: ${rule.id || 'N/A'}\n`;
        result += `   Protocol: ${rule.protocol || 'N/A'}\n`;
        result += `   Start Port: ${rule.startport || 'N/A'}\n`;
        result += `   End Port: ${rule.endport || 'N/A'}\n`;
        result += `   CIDR List: ${rule.cidrlist || 'N/A'}\n`;
        result += `   Network ID: ${rule.networkid || 'N/A'}\n`;
        result += `   State: ${rule.state || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No egress firewall rules found.';
  }

  private formatNicsResponse(response: any): string {
    if (response.nic && response.nic.length > 0) {
      let result = `NICs (${response.nic.length} interfaces):\n\n`;
      
      response.nic.forEach((nic: any, index: number) => {
        result += `${index + 1}. NIC ID: ${nic.id || 'N/A'}\n`;
        result += `   IP Address: ${nic.ipaddress || 'N/A'}\n`;
        result += `   MAC Address: ${nic.macaddress || 'N/A'}\n`;
        result += `   Network ID: ${nic.networkid || 'N/A'}\n`;
        result += `   Network Name: ${nic.networkname || 'N/A'}\n`;
        result += `   Is Default: ${nic.isdefault || 'N/A'}\n`;
        result += `   VM ID: ${nic.virtualmachineid || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No NICs found.';
  }

  private formatNetworkDevicesResponse(response: any): string {
    if (response.networkdevice && response.networkdevice.length > 0) {
      let result = `Network Devices (${response.networkdevice.length} devices):\n\n`;
      
      response.networkdevice.forEach((device: any, index: number) => {
        result += `${index + 1}. Device ID: ${device.id || 'N/A'}\n`;
        result += `   Name: ${device.name || 'N/A'}\n`;
        result += `   Type: ${device.networkdevicetype || 'N/A'}\n`;
        result += `   Management IP: ${device.managementip || 'N/A'}\n`;
        result += `   Physical Network ID: ${device.physicalnetworkid || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No network devices found.';
  }

  private formatNetworkDeviceResponse(response: any): string {
    if (response.networkdevice) {
      const device = response.networkdevice;
      let result = `Network Device:\n\n`;
      result += `ID: ${device.id || 'N/A'}\n`;
      result += `Name: ${device.name || 'N/A'}\n`;
      result += `Type: ${device.networkdevicetype || 'N/A'}\n`;
      result += `Management IP: ${device.managementip || 'N/A'}\n`;
      result += `Physical Network ID: ${device.physicalnetworkid || 'N/A'}\n`;
      
      return result;
    }
    
    return 'Network device information not found.';
  }

  private formatNetworkPermissionsResponse(response: any): string {
    if (response.networkpermission && response.networkpermission.length > 0) {
      let result = `Network Permissions (${response.networkpermission.length} permissions):\n\n`;
      
      response.networkpermission.forEach((permission: any, index: number) => {
        result += `${index + 1}. Permission ID: ${permission.id || 'N/A'}\n`;
        result += `   Network ID: ${permission.networkid || 'N/A'}\n`;
        result += `   Account: ${permission.account || 'N/A'}\n`;
        result += `   Project ID: ${permission.projectid || 'N/A'}\n`;
        result += `   Permission Type: ${permission.permissiontype || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No network permissions found.';
  }

  private formatSite2SiteVpnConnectionsResponse(response: any): string {
    if (response.site2sitevpnconnection && response.site2sitevpnconnection.length > 0) {
      let result = `Site-to-Site VPN Connections (${response.site2sitevpnconnection.length} connections):\n\n`;
      
      response.site2sitevpnconnection.forEach((connection: any, index: number) => {
        result += `${index + 1}. Connection ID: ${connection.id || 'N/A'}\n`;
        result += `   Customer Gateway ID: ${connection.s2scustomergatewayid || 'N/A'}\n`;
        result += `   VPN Gateway ID: ${connection.s2svpngatewayid || 'N/A'}\n`;
        result += `   VPC ID: ${connection.vpcid || 'N/A'}\n`;
        result += `   State: ${connection.state || 'N/A'}\n`;
        result += `   Passive: ${connection.passive || 'N/A'}\n`;
        result += `   Created: ${connection.created || 'N/A'}\n\n`;
      });
      
      return result.trim();
    }
    
    return 'No site-to-site VPN connections found.';
  }

  // System VM Management Handlers
  private async handleChangeServiceForSystemVm(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'serviceofferingid']);
    const response = await this.client.changeServiceForSystemVm(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('System VM service offering change', response)
      }]
    };
  }

  private async handleDestroySystemVm(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.destroySystemVm(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('System VM destruction', response)
      }]
    };
  }

  private async handleListSystemVmsUsageHistory(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'startdate', 'enddate']);
    const response = await this.client.listSystemVmsUsageHistory(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSystemVmUsageHistoryResponse(response)
      }]
    };
  }

  private async handleMigrateSystemVm(args: any): Promise<any> {
    const params = this.buildParams(args, ['virtualmachineid', 'hostid']);
    const response = await this.client.migrateSystemVm(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('System VM migration', response)
      }]
    };
  }

  private async handlePatchSystemVm(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'forced']);
    const response = await this.client.patchSystemVm(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('System VM patching', response)
      }]
    };
  }

  private async handleScaleSystemVm(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'serviceofferingid']);
    const response = await this.client.scaleSystemVm(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('System VM scaling', response)
      }]
    };
  }

  // Zone Management Response Formatting Methods
  private formatZoneResponse(operation: string, response: any): string {
    if (response.zone) {
      const zone = response.zone;
      return `${operation} completed successfully.\nZone: ${zone.name || 'N/A'} (${zone.id})\nNetworktype: ${zone.networktype || 'N/A'}\nAllocation State: ${zone.allocationstate || 'N/A'}\nStatus: ${zone.status || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatSubnetResponse(operation: string, response: any): string {
    if (response.ipv4subnet) {
      const subnet = response.ipv4subnet;
      return `${operation} completed successfully.\nSubnet: ${subnet.subnet || 'N/A'} (${subnet.id})\nGateway: ${subnet.gateway || 'N/A'}\nNetmask: ${subnet.netmask || 'N/A'}\nVLAN: ${subnet.vlan || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatSubnetListResponse(response: any): string {
    const subnets = response.ipv4subnet || [];
    
    if (subnets.length === 0) {
      return 'No IPv4 subnets found.';
    }

    let result = `Found ${subnets.length} IPv4 subnet(s):\n\n`;
    
    for (const subnet of subnets) {
      result += `Subnet: ${subnet.subnet}\n`;
      result += `  ID: ${subnet.id}\n`;
      result += `  Gateway: ${subnet.gateway || 'N/A'}\n`;
      result += `  Netmask: ${subnet.netmask || 'N/A'}\n`;
      result += `  VLAN: ${subnet.vlan || 'N/A'}\n`;
      result += `  Zone: ${subnet.zoneid || 'N/A'}\n\n`;
    }
    
    return result.trim();
  }

  private formatDedicatedZoneResponse(operation: string, response: any): string {
    if (response.dedicatedzone) {
      const dedicatedzone = response.dedicatedzone;
      return `${operation} completed successfully.\nZone: ${dedicatedzone.zonename || 'N/A'} (${dedicatedzone.zoneid})\nAccount: ${dedicatedzone.account || 'N/A'}\nDomain: ${dedicatedzone.domainid || 'N/A'}\nAffinity Group: ${dedicatedzone.affinitygroup || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatDedicatedZoneListResponse(response: any): string {
    const dedicatedzones = response.dedicatedzone || [];
    
    if (dedicatedzones.length === 0) {
      return 'No dedicated zones found.';
    }

    let result = `Found ${dedicatedzones.length} dedicated zone(s):\n\n`;
    
    for (const zone of dedicatedzones) {
      result += `Zone: ${zone.zonename}\n`;
      result += `  ID: ${zone.zoneid}\n`;
      result += `  Account: ${zone.account || 'N/A'}\n`;
      result += `  Domain: ${zone.domainid || 'N/A'}\n`;
      result += `  Affinity Group: ${zone.affinitygroup || 'N/A'}\n\n`;
    }
    
    return result.trim();
  }

  private formatVmwareDcResponse(operation: string, response: any): string {
    if (response.vmwaredc) {
      const vmwaredc = response.vmwaredc;
      return `${operation} completed successfully.\nVMware DC: ${vmwaredc.name || 'N/A'} (${vmwaredc.id})\nVcenter: ${vmwaredc.vcenter || 'N/A'}\nZone: ${vmwaredc.zoneid || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatVmwareDcListResponse(response: any): string {
    const vmwaredcs = response.vmwaredc || [];
    
    if (vmwaredcs.length === 0) {
      return 'No VMware datacenters found.';
    }

    let result = `Found ${vmwaredcs.length} VMware datacenter(s):\n\n`;
    
    for (const dc of vmwaredcs) {
      result += `VMware DC: ${dc.name}\n`;
      result += `  ID: ${dc.id}\n`;
      result += `  vCenter: ${dc.vcenter || 'N/A'}\n`;
      result += `  Zone: ${dc.zoneid || 'N/A'}\n\n`;
    }
    
    return result.trim();
  }

  private formatVmwareDcVmsResponse(response: any): string {
    const vms = response.vmwaredc || [];
    
    if (vms.length === 0) {
      return 'No VMware datacenter VMs found.';
    }

    let result = `Found ${vms.length} VMware datacenter VM(s):\n\n`;
    
    for (const vm of vms) {
      result += `VM: ${vm.name}\n`;
      result += `  ID: ${vm.id}\n`;
      result += `  State: ${vm.state || 'N/A'}\n`;
      result += `  VMware DC: ${vm.vmwaredc || 'N/A'}\n\n`;
    }
    
    return result.trim();
  }

  // Kubernetes Service Response Formatting Methods
  private formatKubernetesVersionResponse(operation: string, response: any): string {
    if (response.kubernetessupportedversion) {
      const version = response.kubernetessupportedversion;
      return `${operation} completed successfully.\nVersion: ${version.name || 'N/A'} (${version.id})\nState: ${version.state || 'N/A'}\nMin Nodes: ${version.minkubernetesnodecount || 'N/A'}\nMax Nodes: ${version.maxkubernetesnodecount || 'N/A'}\nURL: ${version.url || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatKubernetesConfigResponse(response: any): string {
    if (response.kubernetesclusterconfig) {
      const config = response.kubernetesclusterconfig;
      return `Kubernetes cluster configuration retrieved successfully.\nCluster ID: ${config.clusterid || 'N/A'}\nConfig Data:\n${config.configdata || 'Configuration data not available'}`;
    }
    
    return 'Kubernetes cluster configuration not available.';
  }

  private formatKubernetesClustersResponse(response: any): string {
    const clusters = response.kubernetescluster || [];
    
    if (clusters.length === 0) {
      return 'No Kubernetes clusters found.';
    }

    let result = `Found ${clusters.length} Kubernetes cluster(s):\n\n`;
    
    for (const cluster of clusters) {
      result += `Name: ${cluster.name}\n`;
      result += `  ID: ${cluster.id}\n`;
      result += `  Description: ${cluster.description || 'N/A'}\n`;
      result += `  State: ${cluster.state || 'N/A'}\n`;
      result += `  Zone: ${cluster.zonename || 'N/A'}\n`;
      result += `  Kubernetes Version: ${cluster.kubernetesversionname || 'N/A'}\n`;
      result += `  Size: ${cluster.size || 'N/A'} nodes\n`;
      result += `  Master Nodes: ${cluster.masternodes || 'N/A'}\n`;
      result += `  Control Node Count: ${cluster.controlnodes || 'N/A'}\n`;
      result += `  Service Offering: ${cluster.serviceofferingname || 'N/A'}\n`;
      result += `  Network: ${cluster.associatednetworkname || 'N/A'}\n`;
      result += `  Key Pair: ${cluster.keypair || 'N/A'}\n`;
      result += `  Created: ${cluster.created || 'N/A'}\n`;
      result += `  Account: ${cluster.account || 'N/A'}\n`;
      result += `  Domain: ${cluster.domain || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatKubernetesVersionsResponse(response: any): string {
    const versions = response.kubernetessupportedversion || [];
    
    if (versions.length === 0) {
      return 'No Kubernetes versions found.';
    }

    let result = `Found ${versions.length} Kubernetes version(s):\n\n`;
    
    for (const version of versions) {
      result += `Version: ${version.name}\n`;
      result += `  ID: ${version.id}\n`;
      result += `  State: ${version.state || 'N/A'}\n`;
      result += `  Min Node Count: ${version.minkubernetesnodecount || 'N/A'}\n`;
      result += `  Max Node Count: ${version.maxkubernetesnodecount || 'N/A'}\n`;
      result += `  Download URL: ${version.url || 'N/A'}\n`;
      result += `  Checksum: ${version.checksum || 'N/A'}\n`;
      result += `  Zone: ${version.zonename || 'N/A'}\n`;
      result += `  Created: ${version.created || 'N/A'}\n\n`;
    }

    return result;
  }

  // Zone Management Handlers
  private async handleCreateZone(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'name', 'dns1', 'internaldns1', 'networktype', 'domain', 
      'dns2', 'internaldns2', 'securitygroupenabled'
    ]);
    const response = await this.client.createZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatZoneResponse('Zone creation', response)
      }]
    };
  }

  private async handleDeleteZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatZoneResponse('Zone deletion', response)
      }]
    };
  }

  private async handleUpdateZone(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'name', 'dns1', 'dns2', 'internaldns1', 'internaldns2', 'domain'
    ]);
    const response = await this.client.updateZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatZoneResponse('Zone update', response)
      }]
    };
  }

  private async handleEnableHAForZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['zoneid']);
    const response = await this.client.enableHAForZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Zone HA enablement', response)
      }]
    };
  }

  private async handleDisableHAForZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['zoneid']);
    const response = await this.client.disableHAForZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Zone HA disablement', response)
      }]
    };
  }

  private async handleCreateIpv4SubnetForZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['zoneid', 'subnet', 'netmask']);
    const response = await this.client.createIpv4SubnetForZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSubnetResponse('IPv4 subnet creation', response)
      }]
    };
  }

  private async handleDeleteIpv4SubnetForZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteIpv4SubnetForZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSubnetResponse('IPv4 subnet deletion', response)
      }]
    };
  }

  private async handleUpdateIpv4SubnetForZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'subnet', 'netmask']);
    const response = await this.client.updateIpv4SubnetForZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSubnetResponse('IPv4 subnet update', response)
      }]
    };
  }

  private async handleListIpv4SubnetsForZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['zoneid']);
    const response = await this.client.listIpv4SubnetsForZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSubnetListResponse(response)
      }]
    };
  }

  private async handleDedicateZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['zoneid', 'account', 'domainid']);
    const response = await this.client.dedicateZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatDedicatedZoneResponse('Zone dedication', response)
      }]
    };
  }

  private async handleListDedicatedZones(args: any): Promise<any> {
    const params = this.buildParams(args, ['account', 'domainid', 'zoneid']);
    const response = await this.client.listDedicatedZones(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatDedicatedZoneListResponse(response)
      }]
    };
  }

  private async handleReleaseDedicatedZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['zoneid']);
    const response = await this.client.releaseDedicatedZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Zone dedication release', response)
      }]
    };
  }

  private async handleAddVmwareDc(args: any): Promise<any> {
    const params = this.buildParams(args, ['name', 'vcenter', 'username', 'password', 'zoneid']);
    const response = await this.client.addVmwareDc(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVmwareDcResponse('VMware datacenter addition', response)
      }]
    };
  }

  private async handleRemoveVmwareDc(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.removeVmwareDc(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVmwareDcResponse('VMware datacenter removal', response)
      }]
    };
  }

  private async handleUpdateVmwareDc(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'name', 'username', 'password']);
    const response = await this.client.updateVmwareDc(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVmwareDcResponse('VMware datacenter update', response)
      }]
    };
  }

  private async handleListVmwareDcs(args: any): Promise<any> {
    const params = this.buildParams(args, ['zoneid', 'keyword']);
    const response = await this.client.listVmwareDcs(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVmwareDcListResponse(response)
      }]
    };
  }

  private async handleListVmwareDcVms(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'keyword']);
    const response = await this.client.listVmwareDcVms(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatVmwareDcVmsResponse(response)
      }]
    };
  }

  // Host Management Handler Methods
  private async handleAddHost(args: any): Promise<any> {
    if (!args.url || !args.username || !args.password || !args.hypervisor || !args.zoneid) {
      throw new Error('URL, username, password, hypervisor, and zone ID are required');
    }
    
    const params = this.buildParams(args, ['url', 'username', 'password', 'hypervisor', 'zoneid', 'podid', 'clusterid', 'clustername', 'hosttags']);
    const response = await this.client.addHost(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host addition', response)
      }]
    };
  }

  private async handleDeleteHost(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['id', 'forced', 'forcedestroylocalstorage']);
    const response = await this.client.deleteHost(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host deletion', response)
      }]
    };
  }

  private async handleUpdateHost(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['id', 'url', 'osenabled', 'allocationstate', 'hosttags']);
    const response = await this.client.updateHost(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatHostResponse('Host update', response)
      }]
    };
  }

  private async handlePrepareHostForMaintenance(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.prepareHostForMaintenance(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host maintenance preparation', response)
      }]
    };
  }

  private async handleCancelHostMaintenance(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.cancelHostMaintenance(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host maintenance cancellation', response)
      }]
    };
  }

  private async handleConfigureHaForHost(args: any): Promise<any> {
    if (!args.hostid || !args.provider) {
      throw new Error('Host ID and provider are required');
    }
    
    const params = this.buildParams(args, ['hostid', 'provider']);
    const response = await this.client.configureHAForHost(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host HA configuration', response)
      }]
    };
  }

  private async handleEnableHaForHost(args: any): Promise<any> {
    if (!args.hostid) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['hostid']);
    const response = await this.client.enableHAForHost(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host HA enablement', response)
      }]
    };
  }

  private async handleDisableHaForHost(args: any): Promise<any> {
    if (!args.hostid) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['hostid']);
    const response = await this.client.disableHAForHost(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host HA disablement', response)
      }]
    };
  }

  private async handleListHostHaProviders(args: any): Promise<any> {
    const params = this.buildParams(args, ['hypervisor']);
    const response = await this.client.listHostHAProviders(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatHostHaProvidersResponse(response)
      }]
    };
  }

  private async handleListHostHaResources(args: any): Promise<any> {
    const params = this.buildParams(args, ['hostid']);
    const response = await this.client.listHostHAResources(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatHostHaResourcesResponse(response)
      }]
    };
  }

  private async handleListHostsMetrics(args: any): Promise<any> {
    const params = this.buildParams(args, ['clusterid', 'id', 'name', 'podid', 'state', 'type', 'zoneid']);
    const response = await this.client.listHostsMetrics(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatHostsMetricsResponse(response)
      }]
    };
  }

  private async handleReconnectHost(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.reconnectHost(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host reconnection', response)
      }]
    };
  }

  private async handleFindHostsForMigration(args: any): Promise<any> {
    if (!args.virtualmachineid) {
      throw new Error('Virtual machine ID is required');
    }
    
    const params = this.buildParams(args, ['virtualmachineid', 'keyword']);
    const response = await this.client.findHostsForMigration(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatHostsResponse(response)
      }]
    };
  }

  private async handleDeclareHostAsDegraded(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.declareHostAsDegraded(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host degraded declaration', response)
      }]
    };
  }

  private async handleCancelHostAsDegraded(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.cancelHostAsDegraded(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host degraded status cancellation', response)
      }]
    };
  }

  private async handleListHostTags(args: any): Promise<any> {
    const params = this.buildParams(args, ['keyword']);
    const response = await this.client.listHostTags(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatHostTagsResponse(response)
      }]
    };
  }

  private async handleReleaseHostReservation(args: any): Promise<any> {
    if (!args.id) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['id']);
    const response = await this.client.releaseHostReservation(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host reservation release', response)
      }]
    };
  }

  private async handleUpdateHostPassword(args: any): Promise<any> {
    if (!args.hostid || !args.username || !args.password) {
      throw new Error('Host ID, username, and password are required');
    }
    
    const params = this.buildParams(args, ['hostid', 'username', 'password']);
    const response = await this.client.updateHostPassword(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host password update', response)
      }]
    };
  }

  private async handleListDedicatedHosts(args: any): Promise<any> {
    const params = this.buildParams(args, ['account', 'affinitygroup', 'domainid', 'hostid', 'keyword']);
    const response = await this.client.listDedicatedHosts(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatDedicatedHostsResponse(response)
      }]
    };
  }

  private async handleDedicateHost(args: any): Promise<any> {
    if (!args.hostid) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['hostid', 'account', 'domainid']);
    const response = await this.client.dedicateHost(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Host dedication', response)
      }]
    };
  }

  private async handleReleaseDedicatedHost(args: any): Promise<any> {
    if (!args.hostid) {
      throw new Error('Host ID is required');
    }
    
    const params = this.buildParams(args, ['hostid']);
    const response = await this.client.releaseDedicatedHost(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Dedicated host release', response)
      }]
    };
  }

  private async handleConfirmDangerousAction(args: any): Promise<any> {
    const { correlationId, confirmed, confirmationText } = args;

    try {
      // Validate required parameters
      if (!correlationId) {
        throw new Error('correlationId is required');
      }

      if (typeof confirmed !== 'boolean') {
        throw new Error('confirmed must be a boolean value');
      }

      // Process the confirmation response
      const result = this.confirmationMiddleware.processConfirmationResponse(
        correlationId,
        confirmed,
        confirmationText,
        'claude-user'
      );

      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: `❌ Confirmation failed: ${result.error}`
          }]
        };
      }

      if (result.allowOperation) {
        // Get the pending confirmation details to re-execute the original operation
        const pendingConfirmation = this.confirmationMiddleware.getPendingConfirmation(correlationId);
        if (pendingConfirmation) {
          const originalTool = pendingConfirmation.request.toolName;
          const originalArgs = pendingConfirmation.request.parameters;

          Logger.info(`Re-executing confirmed dangerous operation: ${originalTool}`, originalArgs);

          // Re-execute the original tool with confirmed parameters
          // NOTE: This is a simplified approach. In production, you might want to use
          // a more sophisticated queue system for re-execution
          try {
            // Clear the confirmation state to avoid infinite recursion
            this.confirmationMiddleware.cancelConfirmation(correlationId, 'claude-user', 'operation_confirmed');

            // Call the original tool handler
            return await this.executeToolByName(originalTool, originalArgs);
          } catch (executeError) {
            return {
              content: [{
                type: 'text',
                text: `❌ Failed to execute confirmed operation: ${executeError instanceof Error ? executeError.message : 'Unknown error'}`
              }]
            };
          }
        } else {
          return {
            content: [{
              type: 'text',
              text: `❌ Confirmation processed successfully, but the original operation context was not found. The operation may have expired.`
            }]
          };
        }
      } else {
        return {
          content: [{
            type: 'text',
            text: `✅ Operation cancelled successfully. The dangerous action was not performed.`
          }]
        };
      }
    } catch (error) {
      Logger.error('Confirmation processing failed', error);
      return {
        content: [{
          type: 'text',
          text: `❌ Confirmation processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  // Helper method to execute tools by name (used for re-execution after confirmation)
  private async executeToolByName(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'destroy_virtual_machine':
        return await this.handleDestroyVirtualMachine(args);
      case 'expunge_virtual_machine':
        return await this.handleExpungeVirtualMachine(args);
      case 'stop_virtual_machine':
        return await this.handleStopVirtualMachine(args);
      case 'reboot_virtual_machine':
        return await this.handleRebootVirtualMachine(args);
      case 'migrate_virtual_machine':
        return await this.handleMigrateVirtualMachine(args);
      case 'scale_virtual_machine':
        return await this.handleScaleVirtualMachine(args);
      case 'delete_volume':
        return await this.handleDeleteVolume(args);
      case 'delete_snapshot':
        return await this.handleDeleteSnapshot(args);
      case 'migrate_volume':
        return await this.handleMigrateVolume(args);
      case 'delete_network':
        return await this.handleDeleteNetwork(args);
      case 'restart_network':
        return await this.handleRestartNetwork(args);
      case 'delete_security_group':
        return await this.handleDeleteSecurityGroup(args);
      case 'delete_vpc':
        return await this.handleDeleteVpc(args);
      case 'restart_vpc':
        return await this.handleRestartVpc(args);
      case 'delete_load_balancer_rule':
        return await this.handleDeleteLoadBalancerRule(args);
      case 'delete_vpn_connection':
        return await this.handleDeleteVpnConnection(args);
      case 'delete_vpn_gateway':
        return await this.handleDeleteVpnGateway(args);
      case 'delete_account':
        return await this.handleDeleteAccount(args);
      case 'delete_domain':
        return await this.handleDeleteDomain(args);
      case 'delete_user':
        return await this.handleDeleteUser(args);
      case 'destroy_system_vm':
        return await this.handleDestroySystemVm(args);
      case 'stop_system_vm':
        return await this.handleStopSystemVm(args);
      case 'reboot_system_vm':
        return await this.handleRebootSystemVm(args);
      case 'delete_kubernetes_cluster':
        return await this.handleDeleteKubernetesCluster(args);
      case 'scale_kubernetes_cluster':
        return await this.handleScaleKubernetesCluster(args);
      case 'stop_kubernetes_cluster':
        return await this.handleStopKubernetesCluster(args);
      case 'delete_zone':
        return await this.handleDeleteZone(args);
      case 'delete_host':
        return await this.handleDeleteHost(args);
      case 'delete_template':
        return await this.handleDeleteTemplate(args);
      case 'delete_iso':
        return await this.handleDeleteIso(args);
      case 'destroy_router':
        return await this.handleDestroyRouter(args);
      case 'stop_router':
        return await this.handleStopRouter(args);
      case 'reboot_router':
        return await this.handleRebootRouter(args);
      // Add more dangerous operations as needed
      default:
        throw new Error(`Confirmed tool execution not implemented for: ${toolName}`);
    }
  }

  // Host Management Response Formatting Methods
  private formatHostResponse(operation: string, response: any): string {
    if (response.host) {
      const host = response.host;
      return `${operation} completed successfully.\nHost: ${host.name || 'N/A'} (${host.id})\nType: ${host.type || 'N/A'}\nState: ${host.state || 'N/A'}\nCluster: ${host.clustername || 'N/A'}\nZone: ${host.zonename || 'N/A'}`;
    }
    
    return `${operation} completed successfully.`;
  }

  private formatHostHaProvidersResponse(response: any): string {
    const providers = response.hosthaprovidersresponse || [];
    
    if (providers.length === 0) {
      return 'No host HA providers found.';
    }

    let result = `Found ${providers.length} host HA provider(s):\n\n`;
    
    for (const provider of providers) {
      result += `Provider: ${provider.name}\n`;
      result += `  Type: ${provider.type || 'N/A'}\n`;
      result += `  Hypervisor: ${provider.hypervisor || 'N/A'}\n\n`;
    }
    
    return result.trim();
  }

  private formatHostHaResourcesResponse(response: any): string {
    const resources = response.hostharesourcesresponse || [];
    
    if (resources.length === 0) {
      return 'No host HA resources found.';
    }

    let result = `Found ${resources.length} host HA resource(s):\n\n`;
    
    for (const resource of resources) {
      result += `Resource: ${resource.name}\n`;
      result += `  ID: ${resource.id}\n`;
      result += `  Host: ${resource.hostid || 'N/A'}\n`;
      result += `  Provider: ${resource.provider || 'N/A'}\n\n`;
    }
    
    return result.trim();
  }

  private formatHostsMetricsResponse(response: any): string {
    const hosts = response.host || [];
    
    if (hosts.length === 0) {
      return 'No host metrics found.';
    }

    let result = `Found ${hosts.length} host(s) with metrics:\n\n`;
    
    for (const host of hosts) {
      result += `Host: ${host.name}\n`;
      result += `  ID: ${host.id}\n`;
      result += `  State: ${host.state || 'N/A'}\n`;
      result += `  CPU Used: ${host.cpuused || 'N/A'}%\n`;
      result += `  Memory Used: ${host.memoryused || 'N/A'}MB\n`;
      result += `  Network KB/s Read: ${host.networkkbsread || 'N/A'}\n`;
      result += `  Network KB/s Write: ${host.networkkbswrite || 'N/A'}\n\n`;
    }
    
    return result.trim();
  }

  private formatHostTagsResponse(response: any): string {
    const tags = response.hosttag || [];
    
    if (tags.length === 0) {
      return 'No host tags found.';
    }

    let result = `Found ${tags.length} host tag(s):\n\n`;
    
    for (const tag of tags) {
      result += `Tag: ${tag.name}\n`;
      result += `  ID: ${tag.id}\n`;
      result += `  Hosts Count: ${tag.hostcount || 'N/A'}\n\n`;
    }
    
    return result.trim();
  }

  private formatDedicatedHostsResponse(response: any): string {
    const hosts = response.dedicatedhost || [];
    
    if (hosts.length === 0) {
      return 'No dedicated hosts found.';
    }

    let result = `Found ${hosts.length} dedicated host(s):\n\n`;
    
    for (const host of hosts) {
      result += `Host: ${host.hostname}\n`;
      result += `  ID: ${host.hostid}\n`;
      result += `  Account: ${host.account || 'N/A'}\n`;
      result += `  Domain: ${host.domainid || 'N/A'}\n`;
      result += `  Affinity Group: ${host.affinitygroup || 'N/A'}\n\n`;
    }
    
    return result.trim();
  }

  // IPv6 Firewall Management Handlers
  private async handleCreateIpv6FirewallRule(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'networkid', 'protocol', 'startport', 'endport', 'cidrlist', 'traffictype', 'icmptype', 'icmpcode'
    ]);
    const response = await this.client.createIpv6FirewallRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatFirewallRulesResponse(response)
      }]
    };
  }

  private async handleDeleteIpv6FirewallRule(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteIpv6FirewallRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('IPv6 firewall rule deletion', response)
      }]
    };
  }

  private async handleUpdateIpv6FirewallRule(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'protocol', 'startport', 'endport', 'cidrlist', 'icmptype', 'icmpcode'
    ]);
    const response = await this.client.updateIpv6FirewallRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatFirewallRulesResponse(response)
      }]
    };
  }

  private async handleListIpv6FirewallRules(args: any): Promise<any> {
    const params = this.buildParams(args, ['networkid', 'ipaddressid', 'traffictype', 'listall']);
    const response = await this.client.listIpv6FirewallRules(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatFirewallRulesResponse(response)
      }]
    };
  }

  // Routing Firewall Management Handlers
  private async handleCreateRoutingFirewallRule(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'networkid', 'protocol', 'startport', 'endport', 'destinationcidrlist', 'action', 'icmptype', 'icmpcode'
    ]);
    const response = await this.client.createRoutingFirewallRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatFirewallRulesResponse(response)
      }]
    };
  }

  private async handleDeleteRoutingFirewallRule(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteRoutingFirewallRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Routing firewall rule deletion', response)
      }]
    };
  }

  private async handleUpdateRoutingFirewallRule(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'protocol', 'startport', 'endport', 'destinationcidrlist', 'action', 'icmptype', 'icmpcode'
    ]);
    const response = await this.client.updateRoutingFirewallRule(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatFirewallRulesResponse(response)
      }]
    };
  }

  private async handleListRoutingFirewallRules(args: any): Promise<any> {
    const params = this.buildParams(args, ['networkid', 'action', 'listall']);
    const response = await this.client.listRoutingFirewallRules(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatFirewallRulesResponse(response)
      }]
    };
  }

  // BGP Peer Management Handlers
  private async handleCreateBgpPeer(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'zoneid', 'ip4address', 'ip6address', 'asnumber', 'password'
    ]);
    const response = await this.client.createBgpPeer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatBgpPeerResponse('BGP peer creation', response)
      }]
    };
  }

  private async handleDeleteBgpPeer(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteBgpPeer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('BGP peer deletion', response)
      }]
    };
  }

  private async handleUpdateBgpPeer(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'ip4address', 'ip6address', 'asnumber', 'password'
    ]);
    const response = await this.client.updateBgpPeer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatBgpPeerResponse('BGP peer update', response)
      }]
    };
  }

  private async handleListBgpPeers(args: any): Promise<any> {
    const params = this.buildParams(args, ['zoneid', 'account', 'domainid', 'listall']);
    const response = await this.client.listBgpPeers(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatBgpPeerResponse('BGP peers', response)
      }]
    };
  }

  private async handleDedicateBgpPeer(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'domainid', 'account']);
    const response = await this.client.dedicateBgpPeer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatBgpPeerResponse('BGP peer dedication', response)
      }]
    };
  }

  private async handleReleaseBgpPeer(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.releaseBgpPeer(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('BGP peer release', response)
      }]
    };
  }

  // Advanced VPC Management Handlers
  private async handleMigrateVpc(args: any): Promise<any> {
    const params = this.buildParams(args, ['id', 'zoneid']);
    const response = await this.client.migrateVpc(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('VPC migration', response)
      }]
    };
  }

  // IPv4 Subnet Management Handlers
  private async handleDedicateIpv4SubnetForZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['subnetid', 'domainid', 'account']);
    const response = await this.client.dedicateIpv4SubnetForZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSubnetResponse('IPv4 subnet dedication', response)
      }]
    };
  }

  private async handleReleaseIpv4SubnetForZone(args: any): Promise<any> {
    const params = this.buildParams(args, ['subnetid']);
    const response = await this.client.releaseIpv4SubnetForZone(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('IPv4 subnet release', response)
      }]
    };
  }

  private async handleCreateIpv4SubnetForGuestNetwork(args: any): Promise<any> {
    const params = this.buildParams(args, ['networkid', 'subnet', 'gateway', 'netmask']);
    const response = await this.client.createIpv4SubnetForGuestNetwork(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSubnetResponse('IPv4 subnet for guest network creation', response)
      }]
    };
  }

  private async handleDeleteIpv4SubnetForGuestNetwork(args: any): Promise<any> {
    const params = this.buildParams(args, ['id']);
    const response = await this.client.deleteIpv4SubnetForGuestNetwork(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('IPv4 subnet for guest network deletion', response)
      }]
    };
  }

  private async handleListIpv4SubnetsForGuestNetwork(args: any): Promise<any> {
    const params = this.buildParams(args, ['networkid', 'zoneid', 'listall']);
    const response = await this.client.listIpv4SubnetsForGuestNetwork(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSubnetResponse('IPv4 subnets for guest networks', response)
      }]
    };
  }

  // Enhanced Network ACL Management Handlers
  private async handleUpdateNetworkACL(args: any): Promise<any> {
    const params = this.buildParams(args, [
      'id', 'protocol', 'startport', 'endport', 'cidrlist', 'action', 'traffictype', 'icmptype', 'icmpcode'
    ]);
    const response = await this.client.updateNetworkACL(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatNetworkACLResponse(response)
      }]
    };
  }

  // BGP Peer Response Formatting Methods
  private formatBgpPeerResponse(operation: string, response: any): string {
    if (response.bgppeer) {
      const peer = response.bgppeer;
      let result = `${operation} successful:\n\n`;
      result += `BGP Peer ID: ${peer.id || 'N/A'}\n`;
      result += `IPv4 Address: ${peer.ip4address || 'N/A'}\n`;
      result += `IPv6 Address: ${peer.ip6address || 'N/A'}\n`;
      result += `AS Number: ${peer.asnumber || 'N/A'}\n`;
      result += `Zone: ${peer.zonename || 'N/A'}\n`;
      result += `State: ${peer.state || 'N/A'}\n`;
      result += `Account: ${peer.account || 'N/A'}\n`;
      result += `Domain: ${peer.domain || 'N/A'}\n`;
      return result;
    }
    
    if (response.bgppeers) {
      const peers = response.bgppeers;
      if (peers.length === 0) {
        return 'No BGP peers found.';
      }
      
      let result = `Found ${peers.length} BGP peer(s):\n\n`;
      for (const peer of peers) {
        result += `BGP Peer: ${peer.id || 'N/A'}\n`;
        result += `  IPv4: ${peer.ip4address || 'N/A'}\n`;
        result += `  IPv6: ${peer.ip6address || 'N/A'}\n`;
        result += `  AS Number: ${peer.asnumber || 'N/A'}\n`;
        result += `  Zone: ${peer.zonename || 'N/A'}\n`;
        result += `  State: ${peer.state || 'N/A'}\n`;
        result += `  Account: ${peer.account || 'N/A'}\n\n`;
      }
      return result;
    }
    
    return `${operation} completed successfully.`;
  }

  // System VM Response Formatting Methods
  private formatSystemVmUsageHistoryResponse(response: any): string {
    const usage = response.systemvmusage || [];
    
    if (usage.length === 0) {
      return 'No system VM usage history found.';
    }

    let result = `Found ${usage.length} system VM usage record(s):\n\n`;
    
    for (const record of usage) {
      result += `System VM: ${record.name || 'N/A'}\n`;
      result += `  ID: ${record.id || 'N/A'}\n`;
      result += `  Type: ${record.systemvmtype || 'N/A'}\n`;
      result += `  State: ${record.state || 'N/A'}\n`;
      result += `  Usage Start: ${record.startdate || 'N/A'}\n`;
      result += `  Usage End: ${record.enddate || 'N/A'}\n`;
      result += `  Running Hours: ${record.runninghours || 'N/A'}\n`;
      result += `  Allocated Hours: ${record.allocatedhours || 'N/A'}\n`;
      result += `  Zone: ${record.zonename || 'N/A'}\n`;
      result += `  Account: ${record.account || 'N/A'}\n\n`;
    }

    return result;
  }

  // Additional VM Format Methods
  private formatUserDataResponse(response: any): string {
    if (!response || !response.userdata) {
      return 'No user data found.';
    }
    
    return `User Data:\n${response.userdata}\n\nEncoding: ${response.encoding || 'N/A'}`;
  }

  private formatUnmanagedInstancesResponse(response: any): string {
    const instances = response.unmanagedinstance || [];
    
    if (instances.length === 0) {
      return 'No unmanaged instances found.';
    }
    
    let result = `Found ${instances.length} unmanaged instance(s):\n\n`;
    
    for (const instance of instances) {
      result += `Instance: ${instance.name || 'N/A'}\n`;
      result += `  ID: ${instance.id || 'N/A'}\n`;
      result += `  Host: ${instance.hostname || 'N/A'}\n`;
      result += `  Cluster: ${instance.clustername || 'N/A'}\n`;
      result += `  Operating System: ${instance.operatingsystem || 'N/A'}\n`;
      result += `  CPU: ${instance.cpunumber || 'N/A'} cores\n`;
      result += `  Memory: ${instance.memory || 'N/A'} MB\n`;
      result += `  State: ${instance.powerstate || 'N/A'}\n\n`;
    }
    
    return result;
  }

  private formatVMScheduleResponse(response: any): string {
    const schedules = response.vmschedule || [];
    
    if (schedules.length === 0) {
      return 'No VM schedules found.';
    }
    
    let result = `Found ${schedules.length} VM schedule(s):\n\n`;
    
    for (const schedule of schedules) {
      result += `Schedule: ${schedule.id || 'N/A'}\n`;
      result += `  VM: ${schedule.virtualmachinename || 'N/A'}\n`;
      result += `  Action: ${schedule.action || 'N/A'}\n`;
      result += `  Start Date: ${schedule.startdate || 'N/A'}\n`;
      result += `  End Date: ${schedule.enddate || 'N/A'}\n`;
      result += `  Timezone: ${schedule.timezone || 'N/A'}\n`;
      result += `  Enabled: ${schedule.enabled || 'N/A'}\n\n`;
    }
    
    return result;
  }

  private formatVirtualMachinesMetricsResponse(response: any): string {
    const vms = response.virtualmachine || [];
    
    if (vms.length === 0) {
      return 'No virtual machine metrics found.';
    }
    
    let result = `Found ${vms.length} virtual machine(s) with metrics:\n\n`;
    
    for (const vm of vms) {
      result += `VM: ${vm.name || 'N/A'} (${vm.id || 'N/A'})\n`;
      result += `  CPU Usage: ${vm.cpuused || 'N/A'}\n`;
      result += `  Memory Usage: ${vm.memorykbs || 'N/A'} KB\n`;
      result += `  Network Read: ${vm.networkread || 'N/A'} bytes\n`;
      result += `  Network Write: ${vm.networkwrite || 'N/A'} bytes\n`;
      result += `  Disk Read: ${vm.diskread || 'N/A'} bytes\n`;
      result += `  Disk Write: ${vm.diskwrite || 'N/A'} bytes\n`;
      result += `  State: ${vm.state || 'N/A'}\n\n`;
    }
    
    return result;
  }

  private formatVirtualMachinesUsageHistoryResponse(response: any): string {
    const usage = response.vmUsageHistory || [];
    
    if (usage.length === 0) {
      return 'No virtual machine usage history found.';
    }
    
    let result = `Found ${usage.length} VM usage record(s):\n\n`;
    
    for (const record of usage) {
      result += `VM: ${record.name || 'N/A'}\n`;
      result += `  ID: ${record.id || 'N/A'}\n`;
      result += `  Account: ${record.account || 'N/A'}\n`;
      result += `  Zone: ${record.zonename || 'N/A'}\n`;
      result += `  Usage Start: ${record.startdate || 'N/A'}\n`;
      result += `  Usage End: ${record.enddate || 'N/A'}\n`;
      result += `  Running Hours: ${record.runninghours || 'N/A'}\n`;
      result += `  CPU Hours: ${record.cpuhours || 'N/A'}\n`;
      result += `  Memory Hours: ${record.memoryhours || 'N/A'}\n\n`;
    }
    
    return result;
  }

  private formatVmsForImportResponse(response: any): string {
    const vms = response.unmanageinstance || [];
    
    if (vms.length === 0) {
      return 'No VMs available for import.';
    }
    
    let result = `Found ${vms.length} VM(s) available for import:\n\n`;
    
    for (const vm of vms) {
      result += `VM: ${vm.name || 'N/A'}\n`;
      result += `  Host: ${vm.hostname || 'N/A'}\n`;
      result += `  Cluster: ${vm.clustername || 'N/A'}\n`;
      result += `  Operating System: ${vm.operatingsystem || 'N/A'}\n`;
      result += `  CPU: ${vm.cpunumber || 'N/A'} cores\n`;
      result += `  Memory: ${vm.memory || 'N/A'} MB\n`;
      result += `  Power State: ${vm.powerstate || 'N/A'}\n\n`;
    }
    
    return result;
  }

  /**
   * Validate CloudStack credentials by making a simple API call
   */
  private async validateCredentials(): Promise<void> {
    try {
      Logger.info('Validating CloudStack credentials...');
      
      // Make a simple API call to validate credentials
      // Use listCapabilities as it's a lightweight call that requires valid credentials
      await this.client.makeRequest('listCapabilities');
      
      Logger.info('CloudStack credentials validated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('CloudStack credential validation failed', { error: errorMessage });
      
      // Don't throw error to allow server to start, but log the issue
      if (errorMessage.includes('Authentication failed') || errorMessage.includes('401')) {
        Logger.error('CRITICAL: Invalid CloudStack API credentials detected');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNABORTED')) {
        Logger.warn('CloudStack API timeout during credential validation - server may be unavailable');
      } else {
        Logger.warn('CloudStack credential validation inconclusive', { error: errorMessage });
      }
    }
  }

  // Image Store Management Handlers
  private async handleAddImageStore(args: any): Promise<any> {
    const allowedParams = ['name', 'url', 'provider', 'zoneid'];
    const requiredParams = ['name', 'url', 'provider'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.addImageStore(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatImageStoreResponse('Image store added', response)
      }]
    };
  }

  private async handleAddImageStoreS3(args: any): Promise<any> {
    const allowedParams = ['name', 'bucket', 'accesskey', 'secretkey', 'endpoint', 'region'];
    const requiredParams = ['name', 'bucket', 'accesskey', 'secretkey'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.addImageStoreS3(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatImageStoreResponse('S3 image store added', response)
      }]
    };
  }

  private async handleAddSwift(args: any): Promise<any> {
    const allowedParams = ['name', 'url', 'account', 'username', 'key'];
    const requiredParams = ['name', 'url', 'account', 'username', 'key'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.addSwift(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatImageStoreResponse('Swift image store added', response)
      }]
    };
  }

  private async handleDeleteImageStore(args: any): Promise<any> {
    const allowedParams = ['id'];
    const requiredParams = ['id'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.deleteImageStore(params);
    
    return {
      content: [{
        type: 'text',
        text: `Image store deleted successfully.\n\nResponse: ${JSON.stringify(response, null, 2)}`
      }]
    };
  }

  private async handleListImageStores(args: any): Promise<any> {
    const allowedParams = ['protocol', 'provider', 'zoneid'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listImageStores(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatImageStoresListResponse(response)
      }]
    };
  }

  private async handleUpdateImageStore(args: any): Promise<any> {
    const allowedParams = ['id', 'name', 'url'];
    const requiredParams = ['id'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.updateImageStore(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatImageStoreResponse('Image store updated', response)
      }]
    };
  }

  // Pod Management Handlers
  private async handleCreatePod(args: any): Promise<any> {
    const allowedParams = ['name', 'zoneid', 'startip', 'endip', 'netmask', 'gateway'];
    const requiredParams = ['name', 'zoneid', 'startip', 'endip', 'netmask', 'gateway'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.createPod(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatPodResponse('Pod created', response)
      }]
    };
  }

  private async handleDeletePod(args: any): Promise<any> {
    const allowedParams = ['id'];
    const requiredParams = ['id'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.deletePod(params);
    
    return {
      content: [{
        type: 'text',
        text: `Pod deleted successfully.\n\nResponse: ${JSON.stringify(response, null, 2)}`
      }]
    };
  }

  private async handleUpdatePod(args: any): Promise<any> {
    const allowedParams = ['id', 'name', 'startip', 'endip', 'netmask', 'gateway'];
    const requiredParams = ['id'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.updatePod(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatPodResponse('Pod updated', response)
      }]
    };
  }

  private async handleListPods(args: any): Promise<any> {
    const allowedParams = ['zoneid', 'name', 'allocationstate'];
    const params = this.buildParams(args, allowedParams);
    
    const response = await this.client.listPods(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatPodsListResponse(response)
      }]
    };
  }

  private async handleDedicatePod(args: any): Promise<any> {
    const allowedParams = ['podid', 'domainid', 'account'];
    const requiredParams = ['podid', 'domainid'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.dedicatePod(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatPodResponse('Pod dedicated', response)
      }]
    };
  }

  // Certificate Management Handlers
  private async handleIssueCertificate(args: any): Promise<any> {
    const allowedParams = ['name', 'domainname', 'provider', 'validityperiod'];
    const requiredParams = ['name', 'domainname', 'provider'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.issueCertificate(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Certificate issuance', response)
      }]
    };
  }

  private async handleUploadCustomCertificate(args: any): Promise<any> {
    const allowedParams = ['name', 'certificate', 'privatekey', 'certchain'];
    const requiredParams = ['name', 'certificate', 'privatekey'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.uploadCustomCertificate(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Certificate upload', response)
      }]
    };
  }

  private async handleRevokeCertificate(args: any): Promise<any> {
    const allowedParams = ['id'];
    const requiredParams = ['id'];
    const params = this.buildParams(args, allowedParams, requiredParams);
    
    const response = await this.client.revokeCertificate(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatAsyncJobResponse('Certificate revocation', response)
      }]
    };
  }

  private async handleListCAProviders(args: any): Promise<any> {
    const response = await this.client.listCAProviders({});
    
    return {
      content: [{
        type: 'text',
        text: this.formatCAProvidersResponse(response)
      }]
    };
  }

  // Response Formatters for New Features
  private formatImageStoreResponse(operation: string, response: any): string {
    const store = response.imagestore;
    
    if (!store) {
      return `${operation} successfully.\n\nResponse: ${JSON.stringify(response, null, 2)}`;
    }

    let result = `${operation} successfully:\n\n`;
    result += `Name: ${store.name}\n`;
    result += `ID: ${store.id}\n`;
    result += `URL: ${store.url}\n`;
    result += `Provider: ${store.providername || 'N/A'}\n`;
    result += `Protocol: ${store.protocol || 'N/A'}\n`;
    result += `Zone: ${store.zonename || 'All Zones'}\n`;

    return result;
  }

  private formatImageStoresListResponse(response: any): string {
    const stores = response.imagestore || [];
    
    if (stores.length === 0) {
      return 'No image stores found.';
    }

    let result = `Found ${stores.length} image store(s):\n\n`;
    
    for (const store of stores) {
      result += `Name: ${store.name}\n`;
      result += `  ID: ${store.id}\n`;
      result += `  URL: ${store.url}\n`;
      result += `  Provider: ${store.providername || 'N/A'}\n`;
      result += `  Protocol: ${store.protocol || 'N/A'}\n`;
      result += `  Zone: ${store.zonename || 'All Zones'}\n\n`;
    }

    return result;
  }

  private formatPodResponse(operation: string, response: any): string {
    const pod = response.pod;
    
    if (!pod) {
      return `${operation} successfully.\n\nResponse: ${JSON.stringify(response, null, 2)}`;
    }

    let result = `${operation} successfully:\n\n`;
    result += `Name: ${pod.name}\n`;
    result += `ID: ${pod.id}\n`;
    result += `Zone: ${pod.zonename}\n`;
    result += `Gateway: ${pod.gateway}\n`;
    result += `Netmask: ${pod.netmask}\n`;
    result += `Start IP: ${pod.startip}\n`;
    result += `End IP: ${pod.endip}\n`;
    result += `Allocation State: ${pod.allocationstate}\n`;

    return result;
  }

  private formatPodsListResponse(response: any): string {
    const pods = response.pod || [];
    
    if (pods.length === 0) {
      return 'No pods found.';
    }

    let result = `Found ${pods.length} pod(s):\n\n`;
    
    for (const pod of pods) {
      result += `Name: ${pod.name}\n`;
      result += `  ID: ${pod.id}\n`;
      result += `  Zone: ${pod.zonename}\n`;
      result += `  Gateway: ${pod.gateway}\n`;
      result += `  IP Range: ${pod.startip} - ${pod.endip}\n`;
      result += `  State: ${pod.allocationstate}\n\n`;
    }

    return result;
  }

  private formatCAProvidersResponse(response: any): string {
    const providers = response.caproviders || [];
    
    if (providers.length === 0) {
      return 'No Certificate Authority providers found.';
    }

    let result = `Found ${providers.length} CA provider(s):\n\n`;
    
    for (const provider of providers) {
      result += `Name: ${provider.name}\n`;
      result += `  Description: ${provider.description || 'N/A'}\n\n`;
    }

    return result;
  }

  private formatOsTypesResponse(title: string, response: any): string {
    const osTypes = response.ostype || [];
    
    if (osTypes.length === 0) {
      return 'No OS types found.';
    }

    let result = `${title}:\n\n`;
    
    for (const osType of osTypes) {
      result += `Name: ${osType.description}\n`;
      result += `  ID: ${osType.id}\n`;
      result += `  OS Category: ${osType.oscategoryname || osType.oscategoryid || 'N/A'}\n`;
      result += `  Is User Defined: ${osType.isuserdefined ? 'Yes' : 'No'}\n\n`;
    }

    return result;
  }

  private formatOsCategoriesResponse(title: string, response: any): string {
    const osCategories = response.oscategory || [];
    
    if (osCategories.length === 0) {
      return 'No OS categories found.';
    }

    let result = `${title}:\n\n`;
    
    for (const category of osCategories) {
      result += `Name: ${category.name}\n`;
      result += `  ID: ${category.id}\n\n`;
    }

    return result;
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    Logger.info('CloudStack MCP Server started successfully');
  }
}

async function main(): Promise<void> {
  const server = new CloudStackMCPServer();
  await server.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    // Use console.error as a fallback in case Logger isn't initialized
    try {
      Logger.error('Failed to start CloudStack MCP Server', error);
    } catch (logError) {
      console.error('Failed to start CloudStack MCP Server:', error);
      console.error('Logger error:', logError);
    }
    process.exit(1);
  });
}