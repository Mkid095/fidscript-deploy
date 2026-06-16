#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         FIDScript Deploy - Firewall Configuration         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

configure_ufw() {
    log_info "Configuring UFW firewall..."

    # Check if UFW is installed
    if ! command -v ufw &> /dev/null; then
        log_info "Installing UFW..."
        apt-get update -qq
        apt-get install -y -qq ufw > /dev/null 2>&1
    fi

    # Reset to defaults
    ufw --force reset > /dev/null 2>&1

    # Set defaults
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH (prevent lockout)
    ufw allow 22/tcp comment 'SSH'

    # Allow HTTP and HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'

    # Enable firewall
    echo "y" | ufw enable > /dev/null 2>&1

    # Show status
    log_info "UFW firewall configured:"
    ufw status verbose | sed 's/^/  /'
}

configure_iptables() {
    log_info "Configuring iptables rules..."

    # Flush existing rules
    iptables -F
    iptables -X

    # Default policies
    iptables -P INPUT ACCEPT
    iptables -P FORWARD DROP
    iptables -P OUTPUT ACCEPT

    # Allow loopback
    iptables -A INPUT -i lo -j ACCEPT
    iptables -A OUTPUT -o lo -j ACCEPT

    # Allow established connections
    iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

    # Allow SSH
    iptables -A INPUT -p tcp --dport 22 -j ACCEPT

    # Allow HTTP/HTTPS
    iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    iptables -A INPUT -p tcp --dport 443 -j ACCEPT

    # Allow Docker traffic
    iptables -A INPUT -i docker0 -j ACCEPT 2>/dev/null || true

    # Save rules
    if [[ -d /etc/iptables ]]; then
        iptables-save > /etc/iptables/rules.v4
        log_info "iptables rules saved to /etc/iptables/rules.v4"
    fi

    log_info "iptables rules configured."
}

# Detect available firewall
if command -v ufw &> /dev/null; then
    configure_ufw
elif [[ -f /etc/debian_version ]]; then
    configure_iptables
else
    log_warn "No supported firewall found. Please configure manually."
    log_info "Required ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
fi

echo ""
log_info "Firewall configuration complete."
echo ""
echo "Required open ports:"
echo "  - 22/tcp (SSH)"
echo "  - 80/tcp (HTTP)"
echo "  - 443/tcp (HTTPS)"
echo ""
