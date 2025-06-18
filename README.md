# CloudStack MCP Server

A Model Context Protocol (MCP) server that integrates CloudStack with Claude Desktop, enabling seamless cloud infrastructure management through natural language interactions.

## Features

- **Compute Management**: List and manage virtual machines, system VMs, and Kubernetes clusters
- **Network Operations**: Control networks, load balancers, VPN, and firewall configurations  
- **Storage Management**: Handle volumes, snapshots, and image repositories
- **Infrastructure Control**: Manage zones, pods, clusters, and hosts
- **Modular Architecture**: Extensible design for adding new CloudStack capabilities
- **Type-Safe**: Full TypeScript implementation with comprehensive type definitions
- **Multi-Environment**: Support for multiple CloudStack deployments

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run lint` and `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.