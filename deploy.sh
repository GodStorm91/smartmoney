#!/bin/bash
# SmartMoney Deployment Script
# Usage: ./deploy.sh [--skip-tests] [--restart-only]

set -e

# Configuration
SERVER="root@money.khanh.page"
LOCAL_DIR="/home/godstorm91/project/smartmoney"
REMOTE_DIR="/var/www/smartmoney"
CONTAINER_NAME="smartmoney-backend"
SKIP_TESTS=false
RESTART_ONLY=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --restart-only)
            RESTART_ONLY=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

log_info "Starting SmartMoney deployment..."

# Step 1: Run linting and type checks
if [ "$RESTART_ONLY" = false ]; then
    log_info "Running linting checks..."

    # Backend checks
    if command -v ruff &> /dev/null; then
        log_info "Running ruff on backend..."
        cd "$LOCAL_DIR/backend"
        ruff check . || log_warn "Ruff found issues"
    else
        log_warn "Ruff not found, skipping backend lint"
    fi

    # Frontend checks
    if [ -f "$LOCAL_DIR/frontend/package.json" ]; then
        log_info "Running frontend checks..."
        cd "$LOCAL_DIR/frontend"

        if command -v eslint &> /dev/null; then
            eslint src --ext .ts,.tsx --max-warnings 0 || log_warn "ESLint found issues"
        else
            log_warn "ESLint not found, skipping"
        fi

        if command -v tsc &> /dev/null; then
            npx tsc --noEmit || log_warn "TypeScript found issues"
        else
            log_warn "TypeScript not found, skipping"
        fi
    fi
fi

# Step 2: Sync backend code
if [ "$RESTART_ONLY" = false ]; then
    log_info "Syncing backend code to server..."

    # Sync only changed files using rsync (much faster than scp for full dirs)
    if command -v rsync &> /dev/null; then
        rsync -avz --delete \
            --exclude='__pycache__' \
            --exclude='.pyc' \
            --exclude='*.pyo' \
            --exclude='node_modules' \
            "$LOCAL_DIR/backend/" \
            "$SERVER:$REMOTE_DIR/backend/"
    else
        log_warn "rsync not found, falling back to scp"
        scp -r "$LOCAL_DIR/backend/"* "$SERVER:$REMOTE_DIR/backend/"
    fi

    # Sync frontend if needed
    if [ -d "$LOCAL_DIR/frontend/src" ]; then
        log_info "Syncing frontend code..."
        if command -v rsync &> /dev/null; then
            rsync -avz --delete \
                --exclude='node_modules' \
                --exclude='.next' \
                --exclude='.cache' \
                "$LOCAL_DIR/frontend/" \
                "$SERVER:$REMOTE_DIR/frontend/"
        else
            scp -r "$LOCAL_DIR/frontend/"* "$SERVER:$REMOTE_DIR/frontend/"
        fi
    fi
fi

# Step 3: Copy files to Docker container
log_info "Copying files to Docker container..."

ssh "$SERVER" "
    # Stop container first to avoid file locks
    docker stop $CONTAINER_NAME 2>/dev/null || true

    # Sync app directory
    docker cp $REMOTE_DIR/backend/app/. $CONTAINER_NAME:/app/app/

    # If frontend changed, sync that too
    if [ -d '$REMOTE_DIR/frontend' ]; then
        docker cp $REMOTE_DIR/frontend/. $CONTAINER_NAME:/app/frontend/ 2>/dev/null || true
    fi
"

# Step 4: Restart the container
log_info "Restarting backend container..."
ssh "$SERVER" "
    docker start $CONTAINER_NAME
    sleep 5

    # Check if container is running
    if docker ps --format '{{.Names}}' | grep -q '$CONTAINER_NAME'; then
        echo '--- Container logs ---'
        docker logs --tail 30 $CONTAINER_NAME 2>&1 | tail -30

        # Check for startup errors
        if docker logs $CONTAINER_NAME 2>&1 | grep -qi 'error\|exception\|failed'; then
            log_error 'Container started with errors. Check logs above.'
            exit 1
        fi

        log_info 'Container started successfully!'
    else
        log_error 'Container failed to start!'
        docker logs --tail 50 $CONTAINER_NAME
        exit 1
    fi
"

# Step 5: Verify deployment
log_info "Verifying deployment..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://money.khanh.page/api/health 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    log_info "Deployment successful! API is healthy."
else
    log_warn "API health check returned: $HEALTH_CHECK"
    log_warn "Container may need more time to start or check logs manually."
fi

log_info "Deployment complete!"
