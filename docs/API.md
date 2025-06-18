# CloudStack MCP Server API Documentation

This document describes all available tools and their usage in the CloudStack MCP Server.

## Available Tools

### Virtual Machine Management

#### `list_virtual_machines`
Lists virtual machines in your CloudStack environment.

**Parameters:**
- `zone` (optional): Zone ID or name to filter VMs
- `state` (optional): VM state (Running, Stopped, Starting, Stopping, etc.)
- `account` (optional): Account name to filter VMs
- `keyword` (optional): Keyword to search in VM names

**Example usage:**
```
List all virtual machines
List running virtual machines
Show VMs in zone-1
Find VMs for account admin
```

**Response includes:**
- VM ID and name
- Current state and zone
- CPU, memory, and service offering details
- Template and hypervisor information
- Network interfaces and IP addresses
- Creation date and account

#### `deploy_virtual_machine`
Deploy a new virtual machine in CloudStack.

**Parameters:**
- `serviceofferingid` (required): Service offering ID for the VM
- `templateid` (required): Template ID to deploy from
- `zoneid` (required): Zone ID where to deploy the VM
- `name` (optional): Name for the new VM
- `displayname` (optional): Display name for the new VM
- `networkids` (optional): Network IDs (comma-separated) to attach to VM
- `account` (optional): Account name
- `group` (optional): Group name for the VM

**Example usage:**
```
Deploy a new web server VM
Create VM with Ubuntu template in zone-1
Deploy medium VM with specific network
```

**Response includes:**
- Job ID for async operation tracking
- VM ID and current state
- Deployment progress information

#### `start_virtual_machine`
Start a stopped virtual machine.

**Parameters:**
- `id` (required): Virtual machine ID to start

**Example usage:**
```
Start VM vm-12345
Start the web server VM
```

#### `stop_virtual_machine`
Stop a running virtual machine.

**Parameters:**
- `id` (required): Virtual machine ID to stop
- `forced` (optional): Force stop the VM (default: false)

**Example usage:**
```
Stop VM vm-12345
Force stop the database server
```

#### `reboot_virtual_machine`
Reboot a virtual machine.

**Parameters:**
- `id` (required): Virtual machine ID to reboot

**Example usage:**
```
Reboot VM vm-12345
Restart the web server
```

#### `destroy_virtual_machine`
Destroy (delete) a virtual machine.

**Parameters:**
- `id` (required): Virtual machine ID to destroy
- `expunge` (optional): Immediately expunge the VM (default: false)

**Example usage:**
```
Destroy VM vm-12345
Delete and expunge the old server
```

#### `update_virtual_machine`
Update virtual machine properties.

**Parameters:**
- `id` (required): Virtual machine ID to update
- `displayname` (optional): New display name
- `group` (optional): New group name
- `haenable` (optional): Enable/disable high availability
- `ostypeid` (optional): New OS type ID
- `userdata` (optional): User data for the VM

**Example usage:**
```
Update VM display name
Enable HA for VM vm-12345
Change VM group to production
```

#### `change_service_offering`
Change the service offering (CPU/memory) of a virtual machine.

**Parameters:**
- `id` (required): Virtual machine ID
- `serviceofferingid` (required): New service offering ID

**Example usage:**
```
Upgrade VM to larger service offering
Change VM to high-performance offering
```

### Networks

#### `list_networks`
Lists networks in your CloudStack environment.

**Parameters:**
- `zone` (optional): Zone ID or name to filter networks
- `type` (optional): Network type (Isolated, Shared, L2, etc.)
- `account` (optional): Account name to filter networks

**Example usage:**
```
List all networks
Show isolated networks
List networks in zone-1
```

**Response includes:**
- Network ID and name
- Network type and state
- CIDR, gateway, and netmask
- DNS servers
- VLAN information
- Associated services

### Volume Management

#### `list_volumes`
Lists storage volumes in your CloudStack environment.

**Parameters:**
- `zone` (optional): Zone ID or name to filter volumes
- `type` (optional): Volume type (ROOT, DATADISK)
- `virtualmachineid` (optional): VM ID to filter volumes

**Example usage:**
```
List all volumes
Show root volumes
List volumes for VM vm-12345
Show data disks
```

**Response includes:**
- Volume ID and name
- Volume type and size (in GB)
- Current state and storage type
- Associated VM information
- Creation date
- Disk offering details

#### `create_volume`
Create a new data volume.

**Parameters:**
- `name` (required): Name for the new volume
- `diskofferingid` (required): Disk offering ID for the volume
- `zoneid` (required): Zone ID where to create the volume
- `size` (optional): Size in GB (for custom disk offerings)
- `account` (optional): Account name

**Example usage:**
```
Create 100GB data volume in zone-1
Create volume for backup storage
```

#### `attach_volume`
Attach a volume to a virtual machine.

**Parameters:**
- `id` (required): Volume ID to attach
- `virtualmachineid` (required): Virtual machine ID to attach to
- `deviceid` (optional): Device ID

**Example usage:**
```
Attach volume vol-123 to VM vm-456
Attach storage volume to web server
```

#### `detach_volume`
Detach a volume from a virtual machine.

**Parameters:**
- `id` (required): Volume ID to detach

**Example usage:**
```
Detach volume vol-123
Remove storage volume from VM
```

#### `delete_volume`
Delete a volume.

**Parameters:**
- `id` (required): Volume ID to delete

**Example usage:**
```
Delete volume vol-123
Remove old backup volume
```

#### `resize_volume`
Resize a volume.

**Parameters:**
- `id` (required): Volume ID to resize
- `size` (required): New size in GB
- `shrinkok` (optional): Allow shrinking the volume (default: false)

**Example usage:**
```
Resize volume vol-123 to 200GB
Expand storage volume
```

### Snapshot Management

#### `list_snapshots`
Lists volume snapshots in your CloudStack environment.

**Parameters:**
- `volumeid` (optional): Volume ID to filter snapshots
- `account` (optional): Account name to filter snapshots
- `intervaltype` (optional): Snapshot interval type (MANUAL, HOURLY, DAILY, WEEKLY, MONTHLY)

**Example usage:**
```
List all snapshots
Show snapshots for volume vol-123
List manual snapshots
Show daily snapshots
```

**Response includes:**
- Snapshot ID and name
- Associated volume information
- Snapshot type and state
- Creation date
- Physical size

#### `create_snapshot`
Create a snapshot of a volume.

**Parameters:**
- `volumeid` (required): Volume ID to snapshot
- `name` (optional): Name for the snapshot
- `account` (optional): Account name

**Example usage:**
```
Create snapshot of volume vol-123
Backup data volume before maintenance
```

#### `delete_snapshot`
Delete a volume snapshot.

**Parameters:**
- `id` (required): Snapshot ID to delete

**Example usage:**
```
Delete snapshot snap-456
Remove old backup snapshot
```

#### `create_volume_from_snapshot`
Create a new volume from a snapshot.

**Parameters:**
- `snapshotid` (required): Snapshot ID to create volume from
- `name` (required): Name for the new volume
- `account` (optional): Account name

**Example usage:**
```
Restore volume from snapshot snap-123
Create new volume from backup
```

### Security Group Management

#### `create_security_group`
Create a security group.

**Parameters:**
- `name` (required): Name for the security group
- `description` (optional): Description for the security group
- `account` (optional): Account name

**Example usage:**
```
Create web-servers security group
Create security group for database tier
```

#### `delete_security_group`
Delete a security group.

**Parameters:**
- `id` (required): Security group ID to delete

**Example usage:**
```
Delete security group sg-123
Remove old firewall rules
```

#### `authorize_security_group_ingress`
Add ingress rule to security group.

**Parameters:**
- `securitygroupid` (required): Security group ID
- `protocol` (required): Protocol (TCP, UDP, ICMP)
- `startport` (optional): Start port
- `endport` (optional): End port
- `cidrlist` (optional): CIDR list (comma-separated)

**Example usage:**
```
Allow HTTP traffic on port 80
Open SSH access from specific IP range
Allow database access on port 3306
```

#### `revoke_security_group_ingress`
Remove ingress rule from security group.

**Parameters:**
- `id` (required): Rule ID to revoke

**Example usage:**
```
Remove HTTP rule from security group
Revoke SSH access rule
```

### Infrastructure

#### `list_zones`
Lists availability zones in your CloudStack environment.

**Parameters:**
- `available` (optional): Show only available zones (true/false)

**Example usage:**
```
List all zones
Show available zones
```

**Response includes:**
- Zone ID and name
- Network type (Basic, Advanced)
- Allocation state
- DNS configuration
- Local storage and security group settings

#### `list_hosts`
Lists hypervisor hosts in your CloudStack environment.

**Parameters:**
- `zone` (optional): Zone ID or name to filter hosts
- `type` (optional): Host type (Routing, Storage, ConsoleProxy, SecondaryStorage)
- `state` (optional): Host state (Up, Down, Disconnected, etc.)

**Example usage:**
```
List all hosts
Show routing hosts
List hosts in zone-1
Show disconnected hosts
```

**Response includes:**
- Host ID and name
- Host type and state
- IP address and hypervisor type
- Zone and cluster information
- Resource state

### Offerings

#### `list_service_offerings`
Lists compute service offerings available in your CloudStack environment.

**Parameters:**
- `virtualmachineid` (optional): VM ID to show compatible offerings

**Example usage:**
```
List all service offerings
Show service offerings for VM vm-123
```

**Response includes:**
- Offering ID and name
- CPU cores and speed
- Memory allocation
- Storage type
- Creation date

#### `list_templates`
Lists VM templates available in your CloudStack environment.

**Parameters:**
- `templatefilter` (optional): Template filter (featured, self, selfexecutable, executable, community) - defaults to 'executable'
- `zone` (optional): Zone ID or name to filter templates
- `hypervisor` (optional): Hypervisor type (KVM, VMware, XenServer, etc.)

**Example usage:**
```
List all templates
Show KVM templates
List public templates
Show templates in zone-1
```

**Response includes:**
- Template ID and name
- OS type and hypervisor
- Template format and size
- Ready status and creation date
- Public/private status

### System Information

#### `get_cloudstack_info`
Gets CloudStack environment information and connection status.

**Parameters:** None

**Example usage:**
```
Get CloudStack environment information
Show connection status
Check CloudStack configuration
```

**Response includes:**
- Environment name and API URL
- Connection status
- Timeout and retry settings
- Available environments

## Tool Usage Patterns

### Natural Language Examples

The MCP server responds to natural language queries. Here are examples:

**Virtual Machine Management:**
- "List all my virtual machines"
- "Show me running VMs"
- "Deploy a new Ubuntu server in zone-1"
- "Start VM vm-12345"
- "Stop the web server VM"
- "Destroy old test VMs"
- "Update VM display name to 'Production Web Server'"
- "Upgrade VM to larger service offering"

**Networks:**
- "Show me all networks"
- "List isolated networks"
- "What networks are in zone-1?"

**Volume and Storage Management:**
- "List all volumes"
- "Create a 100GB data volume in zone-1"
- "Attach volume vol-123 to VM vm-456"
- "Detach storage volume from web server"
- "Resize volume vol-789 to 200GB"
- "Create snapshot of data volume"
- "Restore volume from snapshot snap-123"
- "Delete old backup volumes"

**Infrastructure:**
- "Show me all zones"
- "List available zones"
- "What hosts are running?"
- "Show me disconnected hosts"

**Security Management:**
- "Create web-servers security group"
- "Allow HTTP traffic on port 80"
- "Open SSH access from 192.168.1.0/24"
- "Remove old firewall rules"
- "Delete unused security groups"

**Templates and Offerings:**
- "List all service offerings"
- "Show me VM templates"
- "What KVM templates are available?"

### Parameter Combinations

You can combine parameters for more specific queries:

```
List running VMs in zone-1
Show isolated networks for admin account
Deploy medium VM with Ubuntu template in production zone
Create 50GB volume and attach to web server
Create security group and allow HTTPS traffic
Resize volume to 200GB and create snapshot
```

## Response Formats

All responses are formatted for readability and include:

### Summary Information
- Total count of items found
- Quick overview of results

### Detailed Listings
- Key identifying information (ID, name)
- Current status and state
- Resource specifications
- Associated resources
- Timestamps

### Error Handling
- Clear error messages for connection issues
- Authentication failure explanations
- Parameter validation errors
- Timeout and network error descriptions

## CloudStack API Mapping

> **📊 For comprehensive API coverage analysis, see [API-COVERAGE-ANALYSIS.md](API-COVERAGE-ANALYSIS.md)**
> 
> **Current Status (v1.1.2)**:
> - **29 MCP Tools** available
> - **60+ CloudStack API methods** implemented  
> - **~35-40% CloudStack API coverage**
> - **Complete** VM, Volume, Network, and Infrastructure management

This table shows how MCP tools map to CloudStack API commands:

| MCP Tool | CloudStack API Command |
|----------|------------------------|
| **Virtual Machine Management** |
| `list_virtual_machines` | `listVirtualMachines` |
| `deploy_virtual_machine` | `deployVirtualMachine` |
| `start_virtual_machine` | `startVirtualMachine` |
| `stop_virtual_machine` | `stopVirtualMachine` |
| `reboot_virtual_machine` | `rebootVirtualMachine` |
| `destroy_virtual_machine` | `destroyVirtualMachine` |
| `update_virtual_machine` | `updateVirtualMachine` |
| `change_service_offering` | `changeServiceForVirtualMachine` |
| `migrate_virtual_machine` | `migrateVirtualMachine` |
| `scale_virtual_machine` | `scaleVirtualMachine` |
| `reset_vm_password` | `resetPasswordForVirtualMachine` |
| `get_vm_password` | `getVMPassword` |
| `add_nic_to_vm` | `addNicToVirtualMachine` |
| `remove_nic_from_vm` | `removeNicFromVirtualMachine` |
| `recover_virtual_machine` | `recoverVirtualMachine` |
| `expunge_virtual_machine` | `expungeVirtualMachine` |
| **Volume Management** |
| `list_volumes` | `listVolumes` |
| `create_volume` | `createVolume` |
| `attach_volume` | `attachVolume` |
| `detach_volume` | `detachVolume` |
| `delete_volume` | `deleteVolume` |
| `resize_volume` | `resizeVolume` |
| `migrate_volume` | `migrateVolume` |
| `extract_volume` | `extractVolume` |
| `upload_volume` | `uploadVolume` |
| `list_volume_metrics` | `listVolumeMetrics` |
| **Snapshot Management** |
| `list_snapshots` | `listSnapshots` |
| `create_snapshot` | `createSnapshot` |
| `delete_snapshot` | `deleteSnapshot` |
| `create_volume_from_snapshot` | `createVolumeFromSnapshot` |
| **Security Groups** |
| `create_security_group` | `createSecurityGroup` |
| `delete_security_group` | `deleteSecurityGroup` |
| `authorize_security_group_ingress` | `authorizeSecurityGroupIngress` |
| `revoke_security_group_ingress` | `revokeSecurityGroupIngress` |
| **Network Management** |
| `create_network` | `createNetwork` |
| `delete_network` | `deleteNetwork` |
| `update_network` | `updateNetwork` |
| `restart_network` | `restartNetwork` |
| `list_network_offerings` | `listNetworkOfferings` |
| `associate_ip_address` | `associateIpAddress` |
| `disassociate_ip_address` | `disassociateIpAddress` |
| `list_public_ip_addresses` | `listPublicIpAddresses` |
| `enable_static_nat` | `enableStaticNat` |
| `disable_static_nat` | `disableStaticNat` |
| `create_port_forwarding_rule` | `createPortForwardingRule` |
| `delete_port_forwarding_rule` | `deletePortForwardingRule` |
| `list_port_forwarding_rules` | `listPortForwardingRules` |
| **Infrastructure** |
| `list_networks` | `listNetworks` |
| `list_zones` | `listZones` |
| `list_hosts` | `listHosts` |
| `list_service_offerings` | `listServiceOfferings` |
| `list_templates` | `listTemplates` |
| `get_cloudstack_info` | `listCapabilities` (for connection test) |

## Error Responses

Common error scenarios and their messages:

### Authentication Errors
```
Authentication failed - check your API credentials
```

### Permission Errors
```
Access denied - insufficient permissions
```

### Network Errors
```
Request timeout after 30000ms
Connection failed to CloudStack server
```

### Parameter Errors
```
Invalid zone specified
Unknown VM state parameter
```

### CloudStack API Errors
```
CloudStack API Error (431): No permission to access resource
CloudStack API Error (401): Unable to verify user credentials
```

## Rate Limiting and Performance

- Default timeout: 30 seconds per request
- Automatic retries: 3 attempts for failed requests
- Connection pooling: Reuses HTTP connections for efficiency
- Concurrent requests: Each tool call is independent

## Security Considerations

- All API calls use HMAC-SHA1 signed requests
- Credentials are never logged or exposed in responses
- SSL/TLS verification for HTTPS endpoints
- API keys are masked in log output

## Extending Functionality

The MCP server is designed to be extensible. To add new CloudStack API support:

1. Add new method to `CloudStackClient`
2. Create new tool definition in `server.ts`
3. Implement response formatting
4. Add appropriate error handling
5. Write unit tests

For detailed development information, see the [Development Guide](DEVELOPMENT.md).