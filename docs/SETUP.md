# CloudStack MCP Server Setup Guide

This guide will walk you through setting up the CloudStack MCP Server to integrate with Claude Desktop.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed on your system
- **Claude Desktop** application installed
- **CloudStack API access** with valid API key and secret key
- **Git** for cloning the repository

## Step 1: Install and Build

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

## Step 2: Configure CloudStack Connection

1. Copy the example configuration:
```bash
cp config/cloudstack.example.json config/cloudstack.json
```

2. Edit `config/cloudstack.json` with your CloudStack details:
```json
{
  "environments": {
    "production": {
      "name": "Production CloudStack",
      "apiUrl": "https://your-cloudstack.example.com/client/api",
      "apiKey": "your-api-key-here",
      "secretKey": "your-secret-key-here",
      "timeout": 30000,
      "retries": 3
    }
  },
  "defaultEnvironment": "production",
  "logging": {
    "level": "info",
    "file": "logs/cloudstack-mcp.log"
  }
}
```

### Finding Your CloudStack API Credentials

1. Log into your CloudStack management UI
2. Navigate to **Accounts** → **Users**
3. Click on your username
4. Go to the **API Keys** tab
5. Generate new API keys if needed
6. Copy the **API Key** and **Secret Key**

### API URL Format

The API URL should follow this format:
```
https://<cloudstack-management-server>/client/api
```

For example:
- `https://cloudstack.example.com/client/api`
- `https://192.168.1.100:8080/client/api`

## Step 3: Test the Connection

Verify your CloudStack connection works:

```bash
npm run dev
```

Then test with a simple command to see if it connects properly.

## Step 4: Configure Claude Desktop

1. **Find Claude Desktop Config Location:**

   **macOS:**
   ```bash
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

   **Windows:**
   ```bash
   %APPDATA%\Claude\claude_desktop_config.json
   ```

   **Linux:**
   ```bash
   ~/.config/Claude/claude_desktop_config.json
   ```

2. **Edit the Configuration File:**

   Open the config file and add the CloudStack MCP server:

   ```json
   {
     "mcpServers": {
       "cloudstack": {
         "command": "node",
         "args": ["/full/path/to/cloudstack-mcp-server/dist/server.js"],
         "env": {
           "CLOUDSTACK_CONFIG": "/full/path/to/cloudstack-mcp-server/config/cloudstack.json"
         }
       }
     }
   }
   ```

   **Important:** Use absolute paths, not relative paths!

3. **Example Configuration:**

   ```json
   {
     "mcpServers": {
       "cloudstack": {
         "command": "node",
         "args": ["/Users/john/cloudstack-mcp-server/dist/server.js"],
         "env": {
           "CLOUDSTACK_CONFIG": "/Users/john/cloudstack-mcp-server/config/cloudstack.json"
         }
       }
     }
   }
   ```

## Step 5: Restart Claude Desktop

1. Completely quit Claude Desktop
2. Restart the application
3. The CloudStack tools should now be available

## Step 6: Verify Integration

In Claude Desktop, try asking:

- "List my virtual machines"
- "Show me all networks"
- "What zones are available?"
- "Get CloudStack environment information"

You should see formatted responses with your CloudStack data.

## Multiple Environments

You can configure multiple CloudStack environments:

```json
{
  "environments": {
    "production": {
      "name": "Production CloudStack",
      "apiUrl": "https://prod-cloudstack.example.com/client/api",
      "apiKey": "prod-api-key",
      "secretKey": "prod-secret-key",
      "timeout": 30000,
      "retries": 3
    },
    "development": {
      "name": "Development CloudStack",
      "apiUrl": "https://dev-cloudstack.example.com/client/api",
      "apiKey": "dev-api-key",
      "secretKey": "dev-secret-key",
      "timeout": 15000,
      "retries": 2
    }
  },
  "defaultEnvironment": "production"
}
```

The server will use the `defaultEnvironment` for all operations.

## Security Notes

- **Never commit** your `config/cloudstack.json` file to version control
- Store API credentials securely
- Use least-privilege API keys when possible
- Consider using environment variables for sensitive data in production

## Troubleshooting

### Connection Issues

1. **Check API URL format** - ensure it ends with `/client/api`
2. **Verify API credentials** - test them in CloudStack UI
3. **Check network connectivity** - ensure CloudStack is accessible
4. **Review logs** - check `logs/cloudstack-mcp.log` for errors

### Claude Desktop Issues

1. **Verify absolute paths** in Claude Desktop config
2. **Check file permissions** - ensure Claude can read the files  
3. **Restart Claude Desktop** after config changes
4. **Check Claude Desktop logs** for MCP server errors

### Common Error Messages

**"Authentication failed"**
- Verify API key and secret key are correct
- Check if API access is enabled for your user

**"Request timeout"**
- Increase timeout value in configuration
- Check CloudStack server performance

**"Environment not found"**
- Verify `defaultEnvironment` matches an environment name
- Check JSON syntax in configuration file

## Next Steps

Once everything is working:

1. Explore the available tools and commands
2. Try different CloudStack operations
3. Report any issues or feature requests on GitHub
4. Consider contributing additional CloudStack API support

For more advanced usage, see the [API Documentation](API.md) and [Development Guide](DEVELOPMENT.md).