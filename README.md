# CloudStack MCP Server

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/mozg31337/cloudstack-mcp-server)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A Model Context Protocol (MCP) server that integrates CloudStack with Claude Desktop, enabling seamless cloud infrastructure management through natural language interactions.

## Features

### 🔧 Complete Infrastructure Management
- **Virtual Machine Lifecycle**: Deploy, start, stop, reboot, destroy, and update VMs
- **Volume Operations**: Create, attach, detach, resize, and delete storage volumes
- **Snapshot Management**: Create, delete, and restore volumes from snapshots
- **Security Groups**: Create groups and manage ingress/egress firewall rules
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

# Version management
npm run version:patch   # Bug fixes and small improvements (Z++)
npm run version:minor   # New features and capabilities (Y++)
npm run version:major   # Breaking changes and major updates (X++)
npm run sync-version    # Sync version between package.json and server.ts
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/) (X.Y.Z):

- **X (Major)**: Breaking changes, complete rewrites, major architectural changes
- **Y (Minor)**: Major functions and milestones, significant new feature sets  
- **Z (Patch)**: Bug fixes, performance improvements, individual tool additions

**Current Version**: 1.1.0

### Version History
- **v1.1.0**: Complete VM, Volume, and Network management capabilities
- **v1.0.0**: Initial release with basic CloudStack integration

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

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

**System Information:**
- "Get CloudStack environment information"
- "Show me available service offerings"

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run lint` and `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.