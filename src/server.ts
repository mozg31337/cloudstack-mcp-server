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
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.configManager = new ConfigManager();
    const environment = this.configManager.getDefaultEnvironment();
    this.client = new CloudStackClient(environment);

    const loggingConfig = this.configManager.getLoggingConfig();
    Logger.getInstance(loggingConfig.level, loggingConfig.file);

    this.setupToolHandlers();
    this.setupErrorHandling();
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
    Logger.error('Failed to start CloudStack MCP Server', error);
    process.exit(1);
  });
}