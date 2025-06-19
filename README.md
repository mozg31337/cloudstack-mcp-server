# CloudStack MCP Server

[![Version](https://img.shields.io/badge/version-1.1.3-blue.svg)](https://github.com/mozg31337/cloudstack-mcp-server)
[![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A Model Context Protocol (MCP) server that integrates CloudStack with Claude Desktop, enabling seamless cloud infrastructure management through natural language interactions.

## Features

### 🔧 Complete Infrastructure Management
- **Virtual Machine Lifecycle**: Deploy, start, stop, reboot, destroy, and update VMs
- **Volume Operations**: Create, attach, detach, resize, and delete storage volumes
- **Snapshot Management**: Create, delete, and restore volumes from snapshots
- **Security Groups**: Create groups and manage ingress/egress firewall rules
- **Load Balancer Management**: Create, configure, and manage load balancing rules with health checks
- **SSL Certificate Management**: Upload, assign, and manage SSL certificates for load balancers
- **Firewall Rules**: Create and manage firewall rules for public IP addresses
- **Network ACL Management**: Comprehensive access control list management for VPC networks
- **Port Forwarding**: Complete port forwarding rule management including updates
- **Resource Discovery**: List VMs, networks, volumes, zones, hosts, and templates

### 🏗️ Enterprise-Ready Architecture
- **Modular Design**: Extensible architecture for adding new CloudStack APIs
- **Type-Safe**: Full TypeScript implementation with comprehensive type definitions
- **Multi-Environment**: Support for multiple CloudStack deployments
- **Async Job Handling**: Proper tracking of long-running CloudStack operations
- **Error Management**: Comprehensive error handling and user-friendly messages

## Installation

### Prerequisites

- Node.js 18+ 
- Claude Desktop application
- CloudStack API access

### Setup

1. Clone the repository:
```bash
git clone https://github.com/mozg31337/cloudstack-mcp-server.git
cd cloudstack-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Configure CloudStack connection:
```bash
cp config/cloudstack.example.json config/cloudstack.json
# Edit config/cloudstack.json with your CloudStack details
```

5. Add to Claude Desktop configuration:
Edit your `claude_desktop_config.json` file:
```json
{
  "mcpServers": {
    "cloudstack": {
      "command": "node",
      "args": ["/path/to/cloudstack-mcp-server/dist/server.js"],
      "env": {
        "CLOUDSTACK_CONFIG": "/path/to/config/cloudstack.json"
      }
    }
  }
}
```

## Development

```bash
# Development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type checking
npm run typecheck

```

## Project Structure

```
src/
├── server.ts              # MCP server entry point
├── cloudstack/
│   ├── client.ts          # CloudStack API client
│   ├── auth.ts            # Authentication handling
│   └── types.ts           # CloudStack API types
├── tools/
│   ├── compute.ts         # VM and compute tools
│   ├── networking.ts      # Network management tools
│   ├── storage.ts         # Storage management tools
│   └── infrastructure.ts  # Infrastructure tools
├── resources/             # MCP resource providers
└── utils/
    ├── config.ts          # Configuration management
    └── logger.ts          # Logging utilities
```

## Usage Examples

Try asking Claude:

**Infrastructure Discovery:**
- "List all my virtual machines"
- "Show me running VMs in zone-1"
- "What networks are available?"
- "List all volumes and their sizes"

**VM Management:**
- "Deploy a new Ubuntu server in zone-1"
- "Start VM vm-12345"
- "Stop the web server VM"
- "Update VM display name to 'Production Server'"

**Storage Operations:**
- "Create a 100GB data volume"
- "Attach volume vol-123 to VM vm-456" 
- "Create snapshot of my data volume"
- "Resize volume to 200GB"

**Security Management:**
- "Create web-servers security group"
- "Allow HTTP traffic on port 80"
- "Open SSH access from my IP range"
- "Create firewall rule for SSH access"
- "Set up Network ACL for web tier"

**Load Balancer Operations:**
- "Create load balancer for web servers"
- "Add VMs to load balancer pool"
- "Configure health check for load balancer"
- "Upload SSL certificate for HTTPS"
- "Set up stickiness policy for sessions"

**System Information:**
- "Get CloudStack environment information"
- "Show me available service offerings"

## API Coverage

The CloudStack MCP Server provides comprehensive coverage of CloudStack APIs:

- **📊 40-45% CloudStack API Coverage** across core infrastructure operations
- **85+ MCP Tools** for complete infrastructure management
- **127+ CloudStack API Methods** implemented with full parameter support

**📋 For detailed API coverage analysis, see [API Coverage Analysis](docs/API-COVERAGE-ANALYSIS.md)**

### Coverage Highlights
- ✅ **Complete VM Management** (90%+ coverage): Lifecycle, scaling, migration, networking
- ✅ **Comprehensive Volume Operations** (85%+ coverage): Storage, snapshots, backup/restore  
- ✅ **Full Network Management** (85%+ coverage): Networks, IPs, NAT, port forwarding
- ✅ **Complete Security Management** (90%+ coverage): Security groups, firewall rules, Network ACLs
- ✅ **Full Load Balancer Support** (95%+ coverage): Rules, policies, health checks, SSL certificates
- ✅ **Complete Infrastructure Discovery** (100% coverage): Zones, hosts, offerings, templates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run lint` and `npm test`
5. Submit a pull request

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. See the [LICENSE](LICENSE) file for details.

This license prohibits commercial use while allowing personal, educational, and non-profit usage.

## Important Notice

⚠️ **Vibe Coded Application**: This application has been developed using AI-assisted coding techniques and rapid prototyping methods. While functional and extensively tested, users should exercise caution when deploying in production environments. The codebase should be thoroughly reviewed and tested for your specific use case before deployment in critical infrastructure.