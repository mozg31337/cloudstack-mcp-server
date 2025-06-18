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