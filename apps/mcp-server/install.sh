#!/bin/bash
# FIDScript MCP Server Installer
#
# This script adds FIDScript as an MCP server to Claude Code
# Run: ./install.sh

set -e

MCP_CONFIG_DIR="${HOME}/.claude"
MCP_CONFIG_FILE="${MCP_CONFIG_DIR}/mcp_servers.json"

echo "FIDScript MCP Server Installer"
echo "=============================="
echo ""

# Check if FIDSCRIPT_API_KEY is set
if [ -z "$FIDSCRIPT_API_KEY" ]; then
    echo "Error: FIDSCRIPT_API_KEY environment variable is not set"
    echo ""
    echo "Please set your API key:"
    echo "  export FIDSCRIPT_API_KEY=your-api-key-here"
    echo ""
    echo "Get your API key at: https://deploy.fidscript.com/settings/api"
    exit 1
fi

# Get API URL (default to hosted if not set)
FIDSCRIPT_API_URL="${FIDSCRIPT_API_URL:-https://api.fidscript.com}"

echo "API URL: $FIDSCRIPT_API_URL"
echo ""

# Create MCP config directory if needed
mkdir -p "$MCP_CONFIG_DIR"

# Create or update MCP config
if [ -f "$MCP_CONFIG_FILE" ]; then
    echo "Updating existing MCP config..."
    # Use jq if available, otherwise manual edit
    if command -v jq &> /dev/null; then
        jq --argjson cmd "$FIDSCRIPT_API_URL" \
           '.fidscript = {"command": "npx", "args": ["-y", "@fidscript/mcp-server"], "env": {"FIDSCRIPT_API_URL": $cmd, "FIDSCRIPT_API_KEY": env.FIDSCRIPT_API_KEY}}' \
           "$MCP_CONFIG_FILE" > /tmp/mcp_servers_new.json
        mv /tmp/mcp_servers_new.json "$MCP_CONFIG_FILE"
    else
        echo "Warning: jq not found. Please manually add FIDScript to your MCP config."
    fi
else
    echo "Creating new MCP config..."
    cat > "$MCP_CONFIG_FILE" << 'EOF'
{
  "mcpServers": {
    "fidscript": {
      "command": "npx",
      "args": ["-y", "@fidscript/mcp-server"],
      "env": {
        "FIDSCRIPT_API_URL": "https://api.fidscript.com",
        "FIDSCRIPT_API_KEY": "your-api-key-here"
      }
    }
  }
}
EOF
    echo "Please edit ${MCP_CONFIG_FILE} and set your FIDSCRIPT_API_KEY"
fi

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit ${MCP_CONFIG_FILE} to set your FIDSCRIPT_API_KEY"
echo "2. Restart Claude Code"
echo "3. Run '/mcp' to see available FIDScript tools"
echo ""
echo "Documentation: https://docs.fidscript.com"