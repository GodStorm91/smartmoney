#!/bin/bash
# SmartMoney Deployment Script
# Usage: ./deploy.sh [--skip-tests] [--restart-only]
#
# Canonical prod tree: /var/www/smartmoney/  (/root/smartmoney is a symlink to it).
# REMOTE_DIR below is the only path to reference — never hard-code /root/smartmoney/.

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
            --exclude='.venv' \
            --exclude='venv' \
            --exclude='.pytest_cache' \
            --exclude='.ruff_cache' \
            --exclude='*.db' \
            --exclude='.coverage' \
            --exclude='test_*.log' \
            --exclude='.env' \
            --exclude='uploads' \
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

    # Sync deploy scripts and config.
    # CRITICAL: --exclude='.env' — prod's .env holds real secrets
    # (ANTHROPIC_API_KEY etc.); local copy is just a placeholder template.
    # Same exclude on backend/.env (rsync above already excludes other state).
    if [ -d "$LOCAL_DIR/deploy" ]; then
        log_info "Syncing deploy scripts..."
        if command -v rsync &> /dev/null; then
            rsync -avz \
                --exclude='.env' \
                --exclude='.env.production' \
                --exclude='frontend-dist' \
                --exclude='certbot' \
                "$LOCAL_DIR/deploy/" \
                "$SERVER:$REMOTE_DIR/deploy/"
        else
            scp -r "$LOCAL_DIR/deploy/"* "$SERVER:$REMOTE_DIR/deploy/"
        fi
    fi

    # Sync MCP server source (build context for the mcp-server compose service)
    if [ -d "$LOCAL_DIR/mcp-server" ]; then
        log_info "Syncing MCP server code..."
        if command -v rsync &> /dev/null; then
            rsync -avz --delete \
                --exclude='.venv' \
                --exclude='__pycache__' \
                --exclude='*.pyc' \
                --exclude='.env' \
                "$LOCAL_DIR/mcp-server/" \
                "$SERVER:$REMOTE_DIR/mcp-server/"
        else
            scp -r "$LOCAL_DIR/mcp-server/"* "$SERVER:$REMOTE_DIR/mcp-server/"
        fi
    fi
fi

# Step 2.5: Create a pre-deploy backup
if [ "$RESTART_ONLY" = false ]; then
    log_info "Creating pre-deploy backup on server..."
    if ! ssh "$SERVER" "cd $REMOTE_DIR && bash deploy/scripts/backup.sh"; then
        log_warn "Pre-deploy backup failed, continuing deploy"
    fi
fi

# Step 3: Copy files to Docker container
log_info "Copying files to Docker container..."

ssh "$SERVER" "
    # Stop container first to avoid file locks
    docker stop $CONTAINER_NAME 2>/dev/null || true

    # Sync app directory
    docker cp $REMOTE_DIR/backend/app/. $CONTAINER_NAME:/app/app/

    # Sync alembic migrations
    docker cp $REMOTE_DIR/backend/alembic/. $CONTAINER_NAME:/app/alembic/

    # Run pending migrations
    docker start $CONTAINER_NAME 2>/dev/null || true
    docker exec $CONTAINER_NAME alembic upgrade head 2>/dev/null || true
    docker stop $CONTAINER_NAME 2>/dev/null || true

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

        # Positive-proof health: uvicorn prints 'Application startup complete'
        # once it's ready. Heuristic error-grep was false-positive on sqlalchemy
        # debug logs (column names like 'error_message'). Note: log_info /
        # log_error are parent-shell functions, not available inside ssh heredoc
        # — use inline echo here so we don't bash-fail on 'command not found'.
        if ! docker logs $CONTAINER_NAME 2>&1 | grep -q 'Application startup complete'; then
            echo '[ERROR] Backend did not reach Application startup complete state.'
            exit 1
        fi

        echo '[INFO] Container started successfully!'
    else
        echo '[ERROR] Container failed to start!'
        docker logs --tail 50 $CONTAINER_NAME
        exit 1
    fi
"

# Step 4.5: Build/restart the MCP server + reload nginx (new /mcp route)
if [ "$RESTART_ONLY" = false ]; then
    log_info "Building and (re)starting MCP server..."
    ssh "$SERVER" "
        cd $REMOTE_DIR/deploy
        docker compose up -d --build mcp-server
        # nginx.conf is mounted read-only; reload to pick up the /mcp location
        docker exec smartmoney-nginx nginx -t && docker exec smartmoney-nginx nginx -s reload || \
            docker compose restart nginx
    "
fi

# Step 4.6: Re-cp backend code in case compose recreated the backend container.
# Background: docker compose up -d --build mcp-server can re-evaluate every
# service in the project. If .env or docker-compose.yml has changed since the
# backend was last started, compose recreates backend from the prebuilt image,
# blowing away the docker-cp'd code from Step 3. Re-cp here as a safety net.
# Long-term: switch backend to image-baked deploys or bind-mount the app dir.
if [ "$RESTART_ONLY" = false ]; then
    log_info "Re-syncing backend code post-compose (safety net)..."
    ssh "$SERVER" "
        docker cp $REMOTE_DIR/backend/app/. $CONTAINER_NAME:/app/app/
        docker cp $REMOTE_DIR/backend/alembic/. $CONTAINER_NAME:/app/alembic/
        docker restart $CONTAINER_NAME >/dev/null
        docker exec $CONTAINER_NAME python -m app.scripts.backfill_position_cost_basis
        echo '[INFO] backend code re-cp + restart complete'
    "
fi

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
