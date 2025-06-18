# CloudStack MCP Server API Documentation

This document describes all available tools and their usage in the CloudStack MCP Server.

## Available Tools

### Virtual Machines

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

### Storage

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

**Virtual Machines:**
- "List all my virtual machines"
- "Show me running VMs"
- "Find VMs in the production zone"
- "What VMs does the admin account have?"

**Networks:**
- "Show me all networks"
- "List isolated networks"
- "What networks are in zone-1?"

**Storage:**
- "List all volumes"
- "Show me root disks"
- "What snapshots exist for volume vol-123?"
- "List all manual snapshots"

**Infrastructure:**
- "Show me all zones"
- "List available zones"
- "What hosts are running?"
- "Show me disconnected hosts"

**Templates and Offerings:**
- "List all service offerings"
- "Show me VM templates"
- "What KVM templates are available?"

### Parameter Combinations

You can combine parameters for more specific queries:

```
List running VMs in zone-1
Show isolated networks for admin account
List root volumes in the production zone
Show manual snapshots for volume vol-123
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

This table shows how MCP tools map to CloudStack API commands:

| MCP Tool | CloudStack API Command |
|----------|------------------------|
| `list_virtual_machines` | `listVirtualMachines` |
| `list_networks` | `listNetworks` |
| `list_volumes` | `listVolumes` |
| `list_snapshots` | `listSnapshots` |
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