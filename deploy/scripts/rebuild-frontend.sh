#!/bin/bash
# Rebuild frontend on production server and copy to nginx serving directory
set -e

DEPLOY_DIR="/var/www/smartmoney"
FRONTEND_DIR="$DEPLOY_DIR/frontend"
# Nginx Docker container mounts from /root/smartmoney, not /var/www/smartmoney
SERVE_DIR="/root/smartmoney/deploy/frontend-dist"

echo "Building frontend..."
cd "$FRONTEND_DIR"
npm run build 2>&1 | tail -8

echo "Copying to serve directory..."
# Clean everything and copy fresh to avoid stale index.html / assets
rm -rf "$SERVE_DIR"/*
cp -r "$FRONTEND_DIR/dist/"* "$SERVE_DIR/"

echo "Reloading nginx..."
docker exec smartmoney-nginx nginx -s reload

echo "Deploy complete!"
