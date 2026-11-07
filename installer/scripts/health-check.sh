#!/bin/bash
set -e

INSTALL_DIR="${INSTALL_DIR:-/opt/fidscript}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         FIDScript Deploy - Health Check                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

check_docker() {
    log_info "Checking Docker..."

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        return 1
    fi

    local running=$(docker ps --filter "name=fidscript_" --format "{{.Names}}" 2>/dev/null | wc -l)
    log_info "Running FIDScript containers: $running"
}

check_service() {
    local name="$1"
    local container="$2"
    local health_url="$3"

    echo -n "  $name... "

    if ! docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo -e "${RED}NOT RUNNING${NC}"
        return 1
    fi

    local status=$(docker inspect --format="{{.State.Health.Status}}" "$container" 2>/dev/null || echo "none")

    case "$status" in
        "healthy")
            echo -e "${GREEN}HEALTHY${NC}"
            ;;
        "unhealthy")
            echo -e "${RED}UNHEALTHY${NC}"
            return 1
            ;;
        "starting")
            echo -e "${YELLOW}STARTING${NC}"
            ;;
        "none")
            local state=$(docker inspect --format="{{.State.Status}}" "$container" 2>/dev/null || echo "unknown")
            if [[ "$state" == "running" ]]; then
                echo -e "${GREEN}RUNNING${NC}"
            else
                echo -e "${RED}$state${NC}"
                return 1
            fi
            ;;
        *)
            echo -e "${YELLOW}$status${NC}"
            ;;
    esac
}

check_services() {
    log_info "Checking services..."

    echo ""
    check_service "Traefik" "fidscript_traefik"
    check_service "PostgreSQL" "fidscript_postgres"
    check_service "Redis" "fidscript_redis"
    check_service "NATS" "fidscript_nats"
    check_service "MinIO" "fidscript_minio"
    check_service "Stalwart" "fidscript_stalwart"
    check_service "API" "fidscript_api"
    check_service "Dashboard" "fidscript_dashboard"
    echo ""
}

check_endpoints() {
    log_info "Checking endpoints..."

    if [[ ! -f "$INSTALL_DIR/.env" ]]; then
        log_warn "No .env file found. Skipping endpoint checks."
        return
    fi

    source "$INSTALL_DIR/.env"

    echo ""

    # Check dashboard
    echo -n "  Dashboard (https://$DOMAIN)... "
    if curl -sf --max-time 5 "https://$DOMAIN" > /dev/null 2>&1; then
        echo -e "${GREEN}REACHABLE${NC}"
    else
        echo -e "${YELLOW}NOT REACHABLE${NC}"
    fi

    # Check API
    echo -n "  API (https://api.$DOMAIN)... "
    if curl -sf --max-time 5 "https://api.$DOMAIN/health" > /dev/null 2>&1; then
        echo -e "${GREEN}REACHABLE${NC}"
    else
        echo -e "${YELLOW}NOT REACHABLE${NC}"
    fi

    # Check storage console
    echo -n "  Storage Console (https://storage.$DOMAIN)... "
    if curl -sf --max-time 5 "https://storage.$DOMAIN" > /dev/null 2>&1; then
        echo -e "${GREEN}REACHABLE${NC}"
    else
        echo -e "${YELLOW}NOT REACHABLE${NC}"
    fi

    echo ""
}

check_ports() {
    log_info "Checking ports..."

    echo ""

    for port in 80 443; do
        echo -n "  Port $port... "
        if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e "${GREEN}OPEN${NC}"
        else
            echo -e "${YELLOW}CLOSED${NC}"
        fi
    done

    echo ""
}

check_logs() {
    local service="$1"
    local lines="${2:-10}"

    echo "=== $service logs (last $lines lines) ==="
    docker logs --tail "$lines" "$service" 2>&1 | sed 's/^/  /'
    echo ""
}

show_status() {
    log_info "Container status:"

    docker ps --filter "name=fidscript_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | sed 's/^/  /'
    echo ""
}

# Main
check_docker
check_services
check_endpoints
check_ports
show_status

log_info "Health check complete."
