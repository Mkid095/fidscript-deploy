#!/bin/bash
# FIDScript MCP Server Installer
#
# This script adds FIDScript as an MCP server to Claude Code and Claude Desktop.
# Run: ./install.sh
#
# Requirements:
#   - Node.js 18+ installed
#   - FIDScript API key (get from https://deploy.fidscript.com/settings/api)
#
# For Claude Code, add to ~/.claude/settings.json:
#   "mcpServers": { "fidscript": { "command": "node", "args": ["/ABS/PATH/TO/dist/server.js"], "env": { "FIDSCRIPT_API_KEY": "..." } } }
#
# For Claude Desktop (Mac): ~/Library/Application Support/Claude/claude_desktop_config.json
# For Claude Desktop (Linux): ~/.config/Claude/claude_desktop_config.json

set -e

MCP_CONFIG_DIR="${HOME}/.claude"
MCP_CONFIG_FILE="${MCP_CONFIG_DIR}/settings.json"

# Detect platform
PLATFORM="$(uname -s)"
if [ "$PLATFORM" = "Darwin" ]; then
    MCP_CONFIG_DIR="${HOME}/Library/Application Support/Claude"
    MCP_CONFIG_FILE="${MCP_CONFIG_DIR}/claude_desktop_config.json"
elif [ "$PLATFORM" = "Linux" ]; then
    XDG_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}"
    MCP_CONFIG_DIR="${XDG_CONFIG}/Claude"
    MCP_CONFIG_FILE="${MCP_CONFIG_DIR}/claude_desktop_config.json"
fi

# Resolve the absolute path to the MCP server
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_PATH="${SCRIPT_DIR}/dist/server.js"

echo "FIDScript MCP Server Installer"
echo "=============================="
echo ""

# Check Node.js version
NODE_VERSION="$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)"
if [ -z "$NODE_VERSION" ]; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18+ required (found: $(node --version)"
    exit 1
fi
echo "Node.js: $(node --version) OK"

# Check for FIDSCRIPT_API_KEY
if [ -z "$FIDSCRIPT_API_KEY" ]; then
    echo "Error: FIDSCRIPT_API_KEY environment variable is not set"
    echo ""
    echo "Please set your API key:"
    echo "  export FIDSCRIPT_API_KEY=your-api-key-here"
    echo ""
    echo "Get your API key at: https://deploy.fidscript.com/settings/api"
    exit 1
fi

# API URL
FIDSCRIPT_API_URL="${FIDSCRIPT_API_URL:-https://api.fidscript.com}"
echo "API URL:  $FIDSCRIPT_API_URL"
echo "Server:   $SERVER_PATH"
echo ""

# Verify server exists
if [ ! -f "$SERVER_PATH" ]; then
    echo "Error: MCP server not found at $SERVER_PATH"
    echo "Run 'pnpm build --filter @fidscript/mcp-server' first."
    exit 1
fi

# Create config directory
mkdir -p "$MCP_CONFIG_DIR"

# Build the MCP server config entry
NEW_ENTRY="\"fidscript\": {
  \"command\": \"node\",
  \"args\": [\"${SERVER_PATH}\"],
  \"env\": {
    \"FIDSCRIPT_API_URL\": \"${FIDSCRIPT_API_URL}\",
    \"FIDSCRIPT_API_KEY\": \"${FIDSCRIPT_API_KEY}\"
  }
}"

if [ -f "$MCP_CONFIG_FILE" ]; then
    echo "Updating existing Claude config at $MCP_CONFIG_FILE..."

    # Use node to update the JSON file (avoids jq dependency)
    node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('$MCP_CONFIG_FILE', 'utf8'));
cfg.mcpServers = cfg.mcpServers || {};
cfg.mcpServers.fidscript = $NEW_ENTRY;
fs.writeFileSync('$MCP_CONFIG_FILE', JSON.stringify(cfg, null, 2));
console.log('Config updated.');
"
else
    echo "Creating new Claude config at $MCP_CONFIG_FILE..."
    mkdir -p "$(dirname "$MCP_CONFIG_FILE")"
    node -e "
const fs = require('fs');
const cfg = { mcpServers: { $NEW_ENTRY } };
fs.writeFileSync('$MCP_CONFIG_FILE', JSON.stringify(cfg, null, 2));
"
    echo "Config created."
fi

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Code / Claude Desktop"
echo "2. Ask: 'list my FIDScript projects'"
echo "3. Run '/mcp' to see available FIDScript tools"
echo ""
echo "Docs: https://docs.fidscript.com/mcp"
