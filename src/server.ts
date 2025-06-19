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
import { z } from 'zod';

class CloudStackMCPServer {
  private server: Server;
  private client: CloudStackClient;
  private configManager: ConfigManager;

  constructor() {
    this.server = new Server(
      {
        name: 'cloudstack-mcp-server',
        version: '1.1.3',
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
          description: 'List virtual machines in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
              zone: {
                type: 'string',
                description: 'Zone ID or name to filter VMs'
              },
              state: {
                type: 'string',
                description: 'VM state (Running, Stopped, etc.)'
              },
              account: {
                type: 'string',
                description: 'Account name to filter VMs'
              },
              keyword: {
                type: 'string',
                description: 'Keyword to search in VM names'
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
        {
          name: 'get_cloudstack_info',
          description: 'Get CloudStack environment information and connection status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'deploy_virtual_machine',
          description: 'Deploy a new virtual machine in CloudStack',
          inputSchema: {
            type: 'object',
            properties: {
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
              name: {
                type: 'string',
                description: 'Name for the new VM'
              },
              displayname: {
                type: 'string',
                description: 'Display name for the new VM'
              },
              networkids: {
                type: 'string',
                description: 'Network IDs (comma-separated) to attach to VM'
              },
              account: {
                type: 'string',
                description: 'Account name (optional)'
              },
              group: {
                type: 'string',
                description: 'Group name for the VM (optional)'
              }
            },
            required: ['serviceofferingid', 'templateid', 'zoneid']
          }
        },
        {
          name: 'start_virtual_machine',
          description: 'Start a stopped virtual machine',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Virtual machine ID to start'
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
          name: 'create_network_acl_list',
          description: 'Create network ACL list',
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
          name: 'delete_network_acl_list',
          description: 'Delete network ACL list',
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
          name: 'list_network_acl_lists',
          description: 'List network ACL lists',
          inputSchema: {
            type: 'object',
            properties: {
              vpcid: {
                type: 'string',
                description: 'VPC ID to filter ACL lists'
              },
              name: {
                type: 'string',
                description: 'ACL list name'
              }
            }
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
        }
      ];

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        Logger.info(`Executing tool: ${name}`, args);

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
          
          case 'list_templates':
            return await this.handleListTemplates(args);
          
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
    const params = this.buildParams(args, ['zone', 'state', 'account', 'keyword']);
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
    const params = this.buildParams(args, ['zone', 'type', 'account']);
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

  private buildParams(args: any, allowedParams: string[]): Record<string, any> {
    const params: Record<string, any> = {};
    
    for (const param of allowedParams) {
      if (args[param] !== undefined && args[param] !== null) {
        params[param] = args[param];
      }
    }
    
    return params;
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
    const optionalParams = ['name', 'displayname', 'networkids', 'account', 'group'];
    const params = this.buildParams(args, [...requiredParams, ...optionalParams]);
    
    // Validate required parameters
    for (const param of requiredParams) {
      if (!params[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
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
    if (!args.id) {
      throw new Error('Virtual machine ID is required');
    }
    
    const params = { id: args.id };
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
    const requiredParams = ['name', 'displaytext', 'networkofferingid', 'zoneid'];
    for (const param of requiredParams) {
      if (!args[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
    
    const allowedParams = [...requiredParams, 'gateway', 'netmask', 'startip', 'endip', 'vlan', 'account'];
    const params = this.buildParams(args, allowedParams);
    
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
    if (!args.name || !args.vpcid) {
      throw new Error('Name and VPC ID are required');
    }
    
    const allowedParams = ['name', 'description', 'vpcid'];
    const params = this.buildParams(args, allowedParams);
    
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
    if (!args.id) {
      throw new Error('Network ACL list ID is required');
    }
    
    const params = { id: args.id };
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