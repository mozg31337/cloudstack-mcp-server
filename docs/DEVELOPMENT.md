# Development Guide

This guide covers development practices, architecture details, and how to extend the CloudStack MCP Server.

## Architecture Overview

### Core Components

```
src/
├── server.ts              # MCP server entry point and tool handlers
├── cloudstack/
│   ├── client.ts          # CloudStack API client
│   ├── auth.ts            # API authentication and signing
│   └── types.ts           # TypeScript type definitions
├── utils/
│   ├── config.ts          # Configuration management
│   └── logger.ts          # Structured logging
└── tools/                 # Future: modular tool implementations
```

### Design Principles

1. **Modular Architecture**: Each component has a single responsibility
2. **Type Safety**: Full TypeScript implementation with strict typing
3. **Error Handling**: Comprehensive error handling at all levels
4. **Testability**: All components are unit testable
5. **Extensibility**: Easy to add new CloudStack API support
6. **Security**: Secure credential handling and API signing

## Development Setup

### Prerequisites

- Node.js 18+
- TypeScript 5.3+
- Git

### Installation

```bash
git clone https://github.com/mozg31337/cloudstack-mcp-server.git
cd cloudstack-mcp-server
npm install
```

### Development Commands

```bash
# Build the project
npm run build

# Development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

## Code Style and Standards

### TypeScript Configuration

- **Target**: ES2022
- **Module**: ESNext
- **Strict mode**: Enabled
- **Source maps**: Enabled for debugging

### ESLint Rules

- Prefer `const` over `let`
- No `var` declarations
- Explicit function return types recommended
- No unused variables

### File Naming

- **Kebab-case** for file names: `cloudstack-client.ts`
- **PascalCase** for classes: `CloudStackClient`
- **camelCase** for functions and variables: `listVirtualMachines`

## Testing Strategy

### Unit Tests

Located in `tests/unit/`, covering:

- **Authentication**: API signing and credential validation
- **Configuration**: Environment loading and validation
- **HTTP Client**: Request/response handling and error cases
- **Utilities**: Logger and helper functions

### Integration Tests

Located in `tests/integration/`, covering:

- **End-to-end workflows**: Complete MCP tool execution
- **Error scenarios**: Network failures, authentication errors
- **Response formatting**: Correct data transformation

### Test Fixtures

Located in `tests/fixtures/`, containing:

- **Mock API responses**: Realistic CloudStack API data
- **Configuration examples**: Valid and invalid configurations
- **Error responses**: Common error scenarios

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/cloudstack/auth.test.ts

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Adding New CloudStack APIs

### Step 1: Add Type Definitions

Add new types to `src/cloudstack/types.ts`:

```typescript
export interface LoadBalancer {
  id: string;
  name: string;
  publicip: string;
  publicport: string;
  privateport: string;
  algorithm: string;
  state: string;
  account: string;
  zoneid: string;
  zonename: string;
}
```

### Step 2: Extend CloudStack Client

Add method to `src/cloudstack/client.ts`:

```typescript
public async listLoadBalancers(params: Record<string, any> = {}): Promise<any> {
  return this.makeRequest('listLoadBalancers', params);
}
```

### Step 3: Add MCP Tool

Add tool definition to `src/server.ts`:

```typescript
// In ListToolsRequestSchema handler
{
  name: 'list_load_balancers',
  description: 'List load balancers in CloudStack',
  inputSchema: {
    type: 'object',
    properties: {
      zone: {
        type: 'string',
        description: 'Zone ID or name to filter load balancers'
      },
      account: {
        type: 'string',
        description: 'Account name to filter load balancers'
      }
    }
  }
}

// In CallToolRequestSchema handler
case 'list_load_balancers':
  return await this.handleListLoadBalancers(args);
```

### Step 4: Implement Handler

Add handler method to `src/server.ts`:

```typescript
private async handleListLoadBalancers(args: any): Promise<any> {
  const params = this.buildParams(args, ['zone', 'account']);
  const response = await this.client.listLoadBalancers(params);
  
  return {
    content: [
      {
        type: 'text',
        text: this.formatLoadBalancersResponse(response)
      }
    ]
  };
}

private formatLoadBalancersResponse(response: any): string {
  const loadBalancers = response.loadbalancer || [];
  
  if (loadBalancers.length === 0) {
    return 'No load balancers found.';
  }

  let result = `Found ${loadBalancers.length} load balancer(s):\n\n`;
  
  for (const lb of loadBalancers) {
    result += `Name: ${lb.name}\n`;
    result += `  ID: ${lb.id}\n`;
    result += `  Public IP: ${lb.publicip || 'N/A'}\n`;
    result += `  Algorithm: ${lb.algorithm || 'N/A'}\n`;
    result += `  State: ${lb.state || 'N/A'}\n`;
    result += `  Zone: ${lb.zonename || 'N/A'}\n`;
    result += `  Account: ${lb.account || 'N/A'}\n\n`;
  }

  return result;
}
```

### Step 5: Add Tests

Create test file `tests/unit/cloudstack/load-balancers.test.ts`:

```typescript
import { CloudStackClient } from '../../../src/cloudstack/client';

describe('LoadBalancers', () => {
  it('should list load balancers correctly', async () => {
    // Test implementation
  });
});
```

### Step 6: Update Documentation

- Add tool description to `docs/API.md`
- Update README if needed
- Add usage examples

## Configuration Management

### Environment Configuration

The `ConfigManager` class handles:

- **Loading**: JSON configuration from file
- **Validation**: Required fields and format validation
- **Environment switching**: Support for multiple CloudStack instances
- **Reloading**: Dynamic configuration updates

### Adding Configuration Options

1. Update `CloudStackConfig` interface in `types.ts`
2. Add validation in `ConfigManager.validateConfig()`
3. Update example configuration file
4. Document new options

### Environment Variables

Supported environment variables:

- `CLOUDSTACK_CONFIG`: Path to configuration file
- `NODE_ENV`: Environment name (development, production)

## Error Handling

### Error Types

1. **Configuration Errors**: Invalid config, missing files
2. **Authentication Errors**: Invalid credentials, expired keys
3. **Network Errors**: Timeouts, connection failures
4. **API Errors**: CloudStack-specific errors
5. **Validation Errors**: Invalid parameters

### Error Response Format

```typescript
{
  content: [
    {
      type: 'text',
      text: `Error executing ${toolName}: ${errorMessage}`
    }
  ]
}
```

### Logging Strategy

- **Debug**: Request/response details, parameter values
- **Info**: Operation completion, connection status
- **Warn**: Recoverable errors, deprecated usage
- **Error**: Failures, exceptions, critical issues

## Security Best Practices

### API Credentials

- Never log API keys or secrets
- Use environment variables in production
- Implement credential rotation support
- Validate API permissions

### Request Signing

- Use HMAC-SHA1 for all requests
- Include timestamp to prevent replay attacks
- Validate SSL certificates
- Use secure random number generation

### Input Validation

- Sanitize all user inputs
- Validate parameter types and ranges
- Prevent injection attacks
- Use allow-lists for enum values

## Performance Optimization

### HTTP Client

- Connection pooling enabled
- Automatic retries for failed requests
- Configurable timeouts
- Request/response compression

### Memory Management

- Stream large responses when possible
- Clean up resources after use
- Avoid memory leaks in long-running processes
- Monitor memory usage in production

### Caching Strategy

Currently no caching is implemented, but consider:

- Response caching for immutable data
- Connection caching for multiple requests
- Configuration caching with TTL

## Debugging

### Development Debugging

```bash
# Enable debug logging
export CLOUDSTACK_LOG_LEVEL=debug

# Run in development mode
npm run dev
```

### Production Debugging

1. Check log files in `logs/` directory
2. Verify CloudStack connectivity
3. Test API credentials separately
4. Monitor resource usage

### Common Issues

**Connection timeouts:**
- Increase timeout in configuration
- Check network connectivity
- Verify CloudStack server status

**Authentication failures:**
- Verify API key and secret
- Check user permissions
- Ensure API access is enabled

**Missing tools in Claude:**
- Restart Claude Desktop
- Check absolute paths in configuration
- Verify file permissions

## Contributing

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-api`
3. Make changes with tests
4. Run linting and tests: `npm run lint && npm test`
5. Commit with conventional format
6. Push and create pull request

### Commit Messages

Use conventional commit format:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `test:` test additions/changes
- `refactor:` code refactoring
- `chore:` maintenance tasks

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance impact considered

## Release Process

### Version Management

- Use semantic versioning (MAJOR.MINOR.PATCH)
- Update CHANGELOG.md with changes
- Tag releases in git
- Publish to npm if applicable

### Deployment

1. Build production version: `npm run build`
2. Test in staging environment
3. Update documentation
4. Create GitHub release
5. Notify users of breaking changes

## Future Roadmap

### Planned Features

- **Resource Management**: Create, modify, delete operations
- **Template Tools**: VM deployment and template management
- **Security Groups**: Firewall rule management
- **Load Balancers**: LB configuration and monitoring
- **VPN Management**: Site-to-site and remote access VPN
- **Monitoring**: Resource usage and performance metrics
- **Automation**: Scripted deployments and workflows

### Architecture Improvements

- **Plugin System**: Modular tool loading
- **Caching Layer**: Response and connection caching
- **Async Operations**: Long-running task support
- **Multi-Cloud**: Support for other cloud platforms
- **Web Interface**: Optional web UI for management

For questions or contributions, please open an issue on GitHub or submit a pull request.