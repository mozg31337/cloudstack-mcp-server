#!/bin/bash

# CloudStack MCP Server Startup Script
# Ensures proper working directory and environment

cd "$(dirname "$0")"
export CLOUDSTACK_CONFIG="${CLOUDSTACK_CONFIG:-$(pwd)/config/cloudstack.json}"

# Start the server
exec node dist/server.js