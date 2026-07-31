#!/bin/sh
# =============================================================================
# FIDScript CLI Bootstrap Installer
# Usage: curl -Ls https://whatsapp.fidscript.com/cli/install.sh | sh
# =============================================================================
set -e

# Step 1: Detect or install Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version 2>/dev/null || echo "")
    echo "FIDScript CLI Installer"
    echo "  Node.js found: $NODE_VERSION"
else
    echo "FIDScript CLI Installer"
    echo "  Node.js not found — installing..."
    if command -v brew >/dev/null 2>&1; then
        brew install node
    elif command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y nodejs npm
    elif command -v apk >/dev/null 2>&1; then
        apk add --no-cache nodejs npm
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S nodejs npm
    else
        echo "Could not auto-install Node.js."
        echo "Please install Node.js 18+ from https://nodejs.org, then re-run this installer."
        exit 1
    fi
    echo "  Node.js installed."
fi

# Step 2: Verify minimum version
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Node.js 18 or higher is required. Found: v$NODE_MAJOR."
    echo "Upgrade at https://nodejs.org"
    exit 1
fi

# Step 3: Install the CLI globally
echo "Installing FIDScript CLI..."
npm install -g @fidscript/cli 2>&1 | grep -v "^npm warn" || true

# Step 4: Verify
if command -v fidscript >/dev/null 2>&1; then
    echo ""
    echo "FIDScript CLI installed successfully!"
    echo ""
    fidscript --version
    echo ""
    echo "Get started:"
    echo "  FIDSCRIPT_API_KEY=fidscript_live_xxx fidscript whoami"
    echo "  fidscript --help"
    echo ""
    echo "Or skip the env var and use the official SDK (bundles the CLI):"
    echo "  npm install @fidscript/sdk"
    echo "  ls node_modules/.bin/fidscript"
    echo ""
    echo "For the full TypeScript SDK, see https://www.npmjs.com/package/@fidscript/sdk"
else
    echo "Installation complete but 'fidscript' command not found."
    echo "You may need to reload your PATH, or run: source ~/.bashrc"
fi
