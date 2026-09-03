#!/usr/bin/env bash

# AVXTUBE API installer for the private avxtube/platform repository.
# See scripts/README.md for the authenticated command used to download this script.

set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

UNINSTALL=false
DATABASE_URL=""
ENV_FILE=""
PORT="4000"

APP_NAME="avxtube-service"
APP_DIR="/opt/$APP_NAME"
SERVICE_NAME="avxtube-service"
LEGACY_APP_DIR="/opt/vdohide-service"
LEGACY_SERVICE_NAME="vdohide-service"
GITHUB_REPO="avxtube/platform"
GITHUB_API_URL="https://api.github.com/repos/$GITHUB_REPO"
GITHUB_API_VERSION="2022-11-28"
NODE_MAJOR_MIN=20
NODE_SETUP_VERSION=22

print_status()  { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }

require_option_value() {
    if [ "$#" -lt 2 ] || [ -z "${2:-}" ]; then
        print_error "Option $1 requires a value"
        exit 1
    fi
}

show_help() {
    echo "AVXTUBE API Installer (Node.js, no nginx)"
    echo
    echo "The private repository requires GITHUB_TOKEN or GH_TOKEN."
    echo "See scripts/README.md for the authenticated download command."
    echo
    echo "Options:"
    echo "  --uninstall          Uninstall completely"
    echo "  --env-file FILE      Install a complete production environment file"
    echo "  --database-url URI   MongoDB connection string (DATABASE_URL)"
    echo "  --mongodb-uri URI    Alias for --database-url"
    echo "  --port PORT          HTTP port (default: 4000)"
    echo "  -h, --help           Show this help"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --uninstall)
            UNINSTALL=true
            shift
            ;;
        --env-file)
            require_option_value "$@"
            ENV_FILE="$2"
            shift 2
            ;;
        --database-url|--mongodb-uri)
            require_option_value "$@"
            DATABASE_URL="$2"
            shift 2
            ;;
        --port)
            require_option_value "$@"
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ "$(id -u)" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

if [ "$UNINSTALL" = true ]; then
    print_warning "Starting uninstallation..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
        rm -f -- "/etc/systemd/system/${SERVICE_NAME}.service"
    fi
    systemctl daemon-reload
    if [ -d "$APP_DIR" ] && [[ "$APP_DIR" == /opt/* ]]; then
        rm -rf -- "$APP_DIR"
    fi
    print_status "Uninstalled successfully"
    exit 0
fi

ACCESS_TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
if [ -z "$ACCESS_TOKEN" ]; then
    print_error "GITHUB_TOKEN or GH_TOKEN is required for this private repository"
    print_error "Use a fine-grained token with Contents: Read access to $GITHUB_REPO"
    exit 1
fi

if [ -n "$ENV_FILE" ] && [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file does not exist: $ENV_FILE"
    exit 1
fi

if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    print_error "Invalid port: $PORT"
    exit 1
fi

print_status "Starting installation..."

print_status "Installing system dependencies..."
if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq
    apt-get install -y -qq curl ca-certificates tar coreutils
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y curl ca-certificates tar coreutils
elif command -v yum >/dev/null 2>&1; then
    yum install -y curl ca-certificates tar coreutils
else
    print_error "No supported package manager (apt/dnf/yum)"
    exit 1
fi

NEED_NODE=true
if command -v node >/dev/null 2>&1; then
    NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge "$NODE_MAJOR_MIN" ]; then
        NEED_NODE=false
        print_status "Node.js $(node -v) already installed"
    else
        print_warning "Node.js $(node -v) is too old; upgrading"
    fi
fi

if [ "$NEED_NODE" = true ]; then
    print_status "Installing Node.js $NODE_SETUP_VERSION..."
    if command -v apt-get >/dev/null 2>&1; then
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_SETUP_VERSION}.x" | bash -
        apt-get install -y -qq nodejs
    elif command -v dnf >/dev/null 2>&1; then
        curl -fsSL "https://rpm.nodesource.com/setup_${NODE_SETUP_VERSION}.x" | bash -
        dnf install -y nodejs
    else
        curl -fsSL "https://rpm.nodesource.com/setup_${NODE_SETUP_VERSION}.x" | bash -
        yum install -y nodejs
    fi
    print_status "Node.js $(node -v) installed"
fi

DOWNLOAD_DIR=$(mktemp -d -t "${APP_NAME}.XXXXXX")
cleanup_download() {
    if [ -n "${DOWNLOAD_DIR:-}" ] && [ -d "$DOWNLOAD_DIR" ]; then
        case "$DOWNLOAD_DIR" in
            /tmp/${APP_NAME}.*) rm -rf -- "$DOWNLOAD_DIR" ;;
        esac
    fi
}
trap cleanup_download EXIT

JSON_HEADERS=(
    -H "Accept: application/vnd.github+json"
    -H "Authorization: Bearer $ACCESS_TOKEN"
    -H "X-GitHub-Api-Version: $GITHUB_API_VERSION"
)
CURL_RETRY_ARGS=(--retry 5 --retry-delay 3)
if curl --retry-all-errors --version >/dev/null 2>&1; then
    CURL_RETRY_ARGS+=(--retry-all-errors)
else
    print_warning "curl does not support --retry-all-errors; using compatible retry options"
fi
RELEASE_JSON="$DOWNLOAD_DIR/release.json"

print_status "Reading latest release from $GITHUB_REPO..."
curl -fsSL "${CURL_RETRY_ARGS[@]}" \
    "${JSON_HEADERS[@]}" \
    "$GITHUB_API_URL/releases/latest" \
    -o "$RELEASE_JSON"

RELEASE_TAG=$(node -e '
const fs = require("fs");
const release = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (!release.tag_name) process.exit(1);
process.stdout.write(release.tag_name);
' "$RELEASE_JSON")

ASSET_NAME="api-${RELEASE_TAG}.tar.gz"
CHECKSUM_NAME="${ASSET_NAME}.sha256"

find_asset_url() {
    node -e '
const fs = require("fs");
const release = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const asset = (release.assets || []).find(({ name }) => name === process.argv[2]);
if (!asset || !asset.url) process.exit(1);
process.stdout.write(asset.url);
' "$RELEASE_JSON" "$1"
}

if ! ASSET_URL=$(find_asset_url "$ASSET_NAME"); then
    print_error "Release asset not found: $ASSET_NAME"
    exit 1
fi
if ! CHECKSUM_URL=$(find_asset_url "$CHECKSUM_NAME"); then
    print_error "Release checksum not found: $CHECKSUM_NAME"
    exit 1
fi

ASSET_HEADERS=(
    -H "Accept: application/octet-stream"
    -H "Authorization: Bearer $ACCESS_TOKEN"
    -H "X-GitHub-Api-Version: $GITHUB_API_VERSION"
)
TARBALL_PATH="$DOWNLOAD_DIR/$ASSET_NAME"
CHECKSUM_PATH="$DOWNLOAD_DIR/$CHECKSUM_NAME"

print_status "Downloading API release $RELEASE_TAG..."
curl -fsSL "${CURL_RETRY_ARGS[@]}" \
    "${ASSET_HEADERS[@]}" "$ASSET_URL" -o "$TARBALL_PATH"
curl -fsSL "${CURL_RETRY_ARGS[@]}" \
    "${ASSET_HEADERS[@]}" "$CHECKSUM_URL" -o "$CHECKSUM_PATH"

EXPECTED_SHA256=$(awk 'NR == 1 { print $1 }' "$CHECKSUM_PATH")
ACTUAL_SHA256=$(sha256sum "$TARBALL_PATH" | awk '{ print $1 }')
if [ -z "$EXPECTED_SHA256" ] || [ "$EXPECTED_SHA256" != "$ACTUAL_SHA256" ]; then
    print_error "Release checksum verification failed"
    exit 1
fi
print_status "Release checksum verified"

systemctl stop "$SERVICE_NAME" 2>/dev/null || true
if [ "$LEGACY_SERVICE_NAME" != "$SERVICE_NAME" ] && systemctl list-unit-files "${LEGACY_SERVICE_NAME}.service" --no-legend 2>/dev/null | grep -q "${LEGACY_SERVICE_NAME}.service"; then
    print_warning "Stopping legacy service $LEGACY_SERVICE_NAME to free port $PORT..."
    systemctl stop "$LEGACY_SERVICE_NAME"
fi
mkdir -p "$APP_DIR"
if [[ "$APP_DIR" == /opt/* ]]; then
    rm -rf -- "$APP_DIR/dist" "$APP_DIR/node_modules"
fi
tar -xzf "$TARBALL_PATH" -C "$APP_DIR"

if [ -n "$ENV_FILE" ]; then
    print_status "Installing environment file from $ENV_FILE..."
    install -m 600 "$ENV_FILE" "$APP_DIR/.env"
elif [ -n "$DATABASE_URL" ]; then
    print_status "Creating minimal environment file..."
    umask 077
    {
        echo "NODE_ENV=production"
        echo "HTTP_PORT=$PORT"
        echo "DATABASE_URL=$DATABASE_URL"
    } > "$APP_DIR/.env"
elif [ -f "$APP_DIR/.env" ]; then
    print_status "Keeping the existing environment file"
elif [ -f "$LEGACY_APP_DIR/.env" ]; then
    print_status "Migrating the environment file from $LEGACY_APP_DIR..."
    install -m 600 "$LEGACY_APP_DIR/.env" "$APP_DIR/.env"
else
    print_error "No environment configuration was provided"
    print_error "Use --env-file FILE or --database-url URI"
    exit 1
fi

NODE_BIN=$(command -v node)
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=AVXTUBE API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
ExecStart=$NODE_BIN dist/server.js
Restart=always
RestartSec=5
EnvironmentFile=$APP_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

HEALTH_URL="http://127.0.0.1:$PORT/v1/health"
HEALTHY=false
for _ in {1..15}; do
    if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    sleep 1
done

echo
echo "============================================"
if [ "$HEALTHY" = true ] && systemctl is-active --quiet "$SERVICE_NAME"; then
    print_status "Installation completed successfully"
    if [ "$LEGACY_SERVICE_NAME" != "$SERVICE_NAME" ]; then
        systemctl disable "$LEGACY_SERVICE_NAME" 2>/dev/null || true
    fi
else
    print_error "Service failed its health check: $HEALTH_URL"
    journalctl -u "$SERVICE_NAME" -n 30 --no-pager
    exit 1
fi
echo "============================================"
echo "  Release:    $RELEASE_TAG"
echo "  Port:       $PORT"
echo
echo "  View logs:  journalctl -u $SERVICE_NAME -f"
echo "  Restart:    systemctl restart $SERVICE_NAME"
echo "  Health:     curl $HEALTH_URL"
echo "============================================"
