# CloudStack MCP Server

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/mozg31337/cloudstack-mcp-server)
[![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A comprehensive Model Context Protocol (MCP) server that provides complete CloudStack infrastructure management through natural language interactions with Claude Desktop. This implementation offers extensive coverage of CloudStack 4.20 APIs with 477+ MCP tools covering 735+ API methods across 32 categories.

## Overview

The CloudStack MCP Server enables seamless cloud infrastructure management by bridging CloudStack APIs with Claude's natural language interface. Users can perform complex infrastructure operations using conversational commands, eliminating the need to learn CloudStack's API syntax or command-line tools.

**Key Statistics:**
- **Extensive API Coverage**: 477+ MCP tools covering 735+ CloudStack API methods (93% coverage)
- **Comprehensive Categories**: 32 CloudStack API categories implemented including new infrastructure features
- **Enterprise Security**: 96 dangerous operations protected with confirmation system
- **Natural Language Interface**: Zero learning curve for infrastructure management
- **Production Ready**: Enterprise-grade reliability with comprehensive safety controls

## Features

### 🏗️ Infrastructure Management
- **Virtual Machine Operations**: Complete lifecycle management including deployment, scaling, migration, and monitoring
- **Storage Management**: Volume operations, snapshot management, backup and restore capabilities
- **Image Store Management**: Complete backend storage management with NFS, S3, and Swift support
- **Pod Management**: Infrastructure pod operations including creation, dedication, and IP range management
- **Network Administration**: VPC management, load balancing, firewall rules, and network ACLs
- **Security Groups**: Ingress/egress rule management and security policy enforcement

### 👥 Identity & Access Management
- **Account Administration**: User lifecycle management with role-based access control
- **Domain Management**: Hierarchical domain structures and resource organization
- **Project Management**: Multi-tenant collaboration spaces with user assignments
- **LDAP Integration**: Enterprise directory service synchronization

### 🌐 Advanced Networking
- **VPC & Networking**: Virtual Private Cloud configuration and management
- **VPN Services**: Site-to-site and remote access VPN connectivity
- **Load Balancing**: Application load balancer configuration with health checks
- **SSL Certificate Management**: Complete certificate lifecycle including issuance, upload, revocation, and CA provider management

### 📊 Monitoring & Analytics
- **Resource Metrics**: Infrastructure performance monitoring and capacity planning
- **Event Management**: System event tracking and alert configuration
- **Quota Management**: Resource limit enforcement and billing integration
- **AutoScale Management**: Automatic scaling policies and performance thresholds

### 🔧 Advanced Features
- **Template & ISO Management**: Image lifecycle with cross-zone replication
- **Kubernetes Integration**: Container orchestration platform management
- **Object Storage**: S3-compatible storage with lifecycle policies
- **Hardware Integration**: NetScaler, UCS, and bare metal server management
- **Tungsten Fabric SDN**: Software-defined networking with micro-segmentation

### 🛡️ Enterprise Security & Safety
- **Dangerous Action Confirmation**: Foolproof confirmation system protecting 96 destructive operations
- **Smart Operation Detection**: Automatic identification of delete, destroy, purge, scale, and restart operations
- **Rich Context Warnings**: Detailed operation descriptions with severity levels and impact assessment
- **Confirmation Requirements**: Mandatory typed confirmation for critical operations (e.g., "destroy permanently")
- **Infrastructure Protection**: Critical protections for image store deletion and pod management operations
- **Environment Controls**: Smart bypasses for development while enforcing production safety
- **Comprehensive Auditing**: Full security audit trails with correlation tracking and compliance reporting
- **Operation Categories**: Protection across VM, Storage, Network, VPC, Kubernetes, Infrastructure, and Certificate operations
- **Memory Management**: Efficient tracking with automatic cleanup and configurable timeout policies

## Test Coverage & Quality Assurance

**Enterprise-Grade Testing Framework** (v2.3.0+)
- **Complete Test Suite**: 12 integration test files covering all enterprise operations
- **350+ Test Cases**: Systematic testing across VM, Storage, Network, Account, Kubernetes, Load Balancer, VPN, Template/ISO, System Administration, Security/Compliance, Monitoring/Analytics, and Enterprise Integration operations
- **Advanced Mocking Framework**: Custom TestFramework class with 50+ CloudStack client method mocks
- **Complete Error Handling**: Tests for API errors, network timeouts, permission issues, and resource constraints
- **CRUD Operation Coverage**: Create, Read, Update, Delete patterns for all resource types
- **Edge Case Testing**: Comprehensive validation of error conditions and boundary scenarios

### Test Structure
```
tests/
├── helpers/TestFramework.ts             # Comprehensive mocking and utilities
├── integration/
│   ├── vm-operations.test.ts            # 25+ VM lifecycle tests
│   ├── storage-operations.test.ts       # 20+ Storage and snapshot tests
│   ├── network-operations.test.ts       # 25+ Network and security tests
│   ├── account-management.test.ts       # 20+ User and domain tests
│   ├── kubernetes-operations.test.ts    # 14+ K8s cluster tests
│   ├── load-balancer-operations.test.ts # 18+ Load balancer tests
│   ├── vpn-operations.test.ts           # 14+ VPN and gateway tests
│   ├── template-iso-operations.test.ts  # 16+ Template and ISO tests
│   ├── system-administration.test.ts    # 20+ System admin tests
│   ├── security-compliance.test.ts      # 18+ Security and compliance tests
│   ├── monitoring-analytics.test.ts     # 15+ Monitoring and analytics tests
│   └── enterprise-integration.test.ts   # 12+ Enterprise integration tests
└── unit/cloudstack/client.test.ts       # CloudStack client tests
```

### Quality Metrics
- **Test Coverage**: 350+ test cases across 12 major operation categories
- **Error Scenarios**: 80+ error handling and edge case tests
- **Mock Coverage**: All CloudStack API methods systematically mocked with 65+ Phase 3 client methods
- **Enterprise Operations**: Complete coverage of System Administration, Security/Compliance, Monitoring/Analytics, and Enterprise Integration
- **CI/CD Ready**: Full Jest integration with coverage reporting

## Installation

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **Claude Desktop**: Latest version with MCP support
- **CloudStack Access**: Valid API credentials with appropriate permissions

### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/mozg31337/cloudstack-mcp-server.git
cd cloudstack-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 2: Configure CloudStack Connection

**🔒 Secure Configuration with Environment Variables (Recommended)**

For security, use environment variables instead of hardcoded credentials:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your CloudStack credentials
# The .env file is automatically excluded from git
```

Edit `.env` with your actual credentials:

```bash
# Production CloudStack Environment
CLOUDSTACK_PROD_NAME="Production CloudStack"
CLOUDSTACK_PROD_API_URL="https://your-cloudstack.example.com/client/api"
CLOUDSTACK_PROD_API_KEY="your-production-api-key"
CLOUDSTACK_PROD_SECRET_KEY="your-production-secret-key"

# Development CloudStack Environment
CLOUDSTACK_DEV_NAME="Development CloudStack"
CLOUDSTACK_DEV_API_URL="https://dev-cloudstack.example.com/client/api"
CLOUDSTACK_DEV_API_KEY="your-dev-api-key"
CLOUDSTACK_DEV_SECRET_KEY="your-dev-secret-key"

# Default environment to use
CLOUDSTACK_DEFAULT_ENVIRONMENT="default"
```

**Alternative: File-based Configuration**

If you prefer file-based configuration (not recommended for production):

```bash
# Copy example configuration
cp config/cloudstack.example.json config/cloudstack.json
```

Edit `config/cloudstack.json` with placeholder values (actual credentials should be in environment variables):

```json
{
  "defaultEnvironment": "default",
  "environments": {
    "default": {
      "name": "Production CloudStack",
      "apiUrl": "https://your-cloudstack.example.com/client/api",
      "apiKey": "your-api-key-here",
      "secretKey": "your-secret-key-here",
      "timeout": 30000,
      "retries": 3
    }
  },
  "logging": {
    "level": "info",
    "file": "logs/cloudstack-mcp.log"
  }
}
```

### Step 3: Claude Desktop Integration

Add the MCP server to your Claude Desktop configuration:

**macOS/Linux:** `~/.config/claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\\Claude\\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cloudstack": {
      "command": "node",
      "args": ["/absolute/path/to/cloudstack-mcp-server/dist/server.js"],
      "env": {
        "CLOUDSTACK_CONFIG": "/absolute/path/to/config/cloudstack.json"
      }
    }
  }
}
```

### Step 4: Verify Installation

1. Restart Claude Desktop
2. Start a new conversation
3. Test the connection with: "List my CloudStack virtual machines"

## Configuration

### Environment Variables

The server supports comprehensive configuration through environment variables for secure credential management:

**Production Environment:**
```bash
CLOUDSTACK_PROD_NAME="Production CloudStack"
CLOUDSTACK_PROD_API_URL="https://cloudstack.example.com/client/api"
CLOUDSTACK_PROD_API_KEY="your-production-api-key"
CLOUDSTACK_PROD_SECRET_KEY="your-production-secret-key"
CLOUDSTACK_PROD_TIMEOUT=30000
CLOUDSTACK_PROD_RETRIES=3
```

**Development Environment:**
```bash
CLOUDSTACK_DEV_NAME="Development CloudStack"
CLOUDSTACK_DEV_API_URL="https://dev-cloudstack.example.com/client/api"
CLOUDSTACK_DEV_API_KEY="your-dev-api-key"
CLOUDSTACK_DEV_SECRET_KEY="your-dev-secret-key"
CLOUDSTACK_DEV_TIMEOUT=30000
CLOUDSTACK_DEV_RETRIES=3
```

**Configuration Control:**
```bash
# Default environment to use ("default" for production, "dev" for development)
CLOUDSTACK_DEFAULT_ENVIRONMENT="default"

# Logging configuration
CLOUDSTACK_LOG_LEVEL=info
CLOUDSTACK_LOG_FILE=logs/cloudstack-mcp.log

# Legacy configuration file path (optional)
CLOUDSTACK_CONFIG=/path/to/cloudstack.json

# Network settings
CLOUDSTACK_TIMEOUT=30000
CLOUDSTACK_RETRIES=3
```

### Multiple Environments

Configure multiple CloudStack environments for different use cases:

```json
{
  "defaultEnvironment": "production",
  "environments": {
    "production": { "..." },
    "development": { "..." },
    "testing": { "..." }
  }
}
```

Switch environments in Claude by specifying: "List VMs in development environment"

## Usage Examples

### Infrastructure Discovery
```
"List all virtual machines in zone-east"
"Show me running VMs with their IP addresses"
"What storage volumes are available?"
"Display network configuration for my VPC"
"List all image store backends"
"Show pods in my zone"
```

### Virtual Machine Management
```
"Deploy a new Ubuntu 20.04 server with 4GB RAM"
"Start virtual machine vm-12345"
"Create a snapshot of my database server"
"Resize VM memory to 8GB"
```

### Network Operations
```
"Create a load balancer for web servers"
"Add firewall rule allowing HTTP traffic"
"Configure VPN access for remote users"
"Set up network ACL for database tier"
```

### Security Management
```
"Create security group for web applications"
"Allow SSH access from corporate network"
"Upload SSL certificate for HTTPS load balancer"
"Issue a Let's Encrypt certificate for my domain"
"List available certificate authorities"
"Configure two-factor authentication"
```

### Infrastructure Management
```
"Add a new NFS image store backend"
"Create a pod for my zone with IP range 192.168.1.10-100"
"Add S3 bucket as image store with my AWS credentials"
"Dedicate pod to specific domain"
"Update pod IP range configuration"
```

## Development

### Local Development Setup

```bash
# Development mode with hot reload
npm run dev

# Run test suite
npm test

# Test with coverage report
npm run test:coverage

# Code linting
npm run lint

# Type checking
npm run typecheck
```

### Project Structure

```
src/
├── server.ts              # MCP server implementation with 477+ tools
├── cloudstack/
│   ├── client.ts          # CloudStack API client with 735+ methods
│   ├── auth.ts            # HMAC signature authentication
│   └── types.ts           # TypeScript type definitions
├── utils/
│   ├── config.ts          # Configuration management
│   └── logger.ts          # Structured logging
├── security/              # Enterprise security framework
├── tests/                 # Comprehensive test suite
└── config/                # Configuration templates
```

## API Coverage

### Complete Implementation Status

| Category | API Methods | MCP Tools | Coverage |
|----------|------------|-----------|----------|
| Virtual Machine | 72 | 80 | 100% |
| Storage & Volumes | 105 | 28 | 100% |
| Networking | 85 | 59 | 100% |
| Load Balancer | 34 | 30 | 100% |
| Security | 22 | 19 | 100% |
| Account Management | 16 | 17 | 100% |
| Templates & ISOs | 35 | 25 | 100% |
| AutoScale | 21 | 21 | 100% |
| **Image Store** | **20** | **6** | **100%** |
| **Pod Management** | **9** | **5** | **100%** |
| **Certificate Management** | **10** | **4** | **100%** |
| **Total** | **735+** | **477+** | **93%** |

For detailed API coverage analysis, see [API Coverage Documentation](docs/API-COVERAGE-COMPARISON-v2.0.0.md).

## Future Roadmap

### High Priority Improvements
- **Architecture**: Modular tool organization and lazy loading implementation
- **Performance**: Connection pooling and intelligent caching strategies
- **Testing**: Enhanced test coverage and integration test suite
- **Security**: API key rotation and role-based access control

### Medium Priority Features
- **Monitoring**: Health checks, metrics collection, and audit logging
- **Enterprise**: Multi-tenant isolation and backup automation
- **Development**: Comprehensive TypeScript types and documentation

### Future Enhancements
- **CloudStack 5.x**: API compatibility when available
- **User Interface**: Web dashboard and CLI tools
- **AI Integration**: Resource optimization and cost management
- **Real-time**: Event streaming and live updates

View the complete roadmap in our [development todo list](https://github.com/mozg31337/cloudstack-mcp-server/issues).

## Contributing

We welcome contributions to improve the CloudStack MCP Server:

1. **Fork the repository** and create a feature branch
2. **Implement changes** with appropriate tests
3. **Run quality checks**: `npm run lint && npm test`
4. **Submit a pull request** with detailed description

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage above 90%
- Include documentation for new features
- Use conventional commit messages

## Security Considerations

- **API Credentials**: Store securely and rotate regularly
- **Network Access**: Use HTTPS for all CloudStack communications
- **Permissions**: Follow principle of least privilege
- **Audit Logging**: Enable for production environments

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. See [LICENSE](LICENSE) for details.

**Commercial Use**: Contact the maintainers for commercial licensing options.

## Support

- **Issues**: Report bugs via [GitHub Issues](https://github.com/mozg31337/cloudstack-mcp-server/issues)
- **Documentation**: See [docs/](docs/) directory for detailed guides
- **Community**: Join discussions in our repository

---

**Note**: This application uses AI-assisted development techniques. While extensively tested, please review and validate functionality for your specific environment before production deployment.