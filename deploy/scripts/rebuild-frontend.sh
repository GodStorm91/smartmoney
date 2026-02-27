#!/bin/bash
# Rebuild frontend on production server and copy to nginx serving directory
set -e

DEPLOY_DIR="/var/www/smartmoney"
FRONTEND_DIR="$DEPLOY_DIR/frontend"
SERVE_DIR="$DEPLOY_DIR/deploy/frontend-dist"

echo "Building frontend..."
cd "$FRONTEND_DIR"
npm run build 2>&1 | tail -8

echo "Copying to serve directory..."
rm -rf "$SERVE_DIR/assets"
cp -r "$FRONTEND_DIR/dist/"* "$SERVE_DIR/"

echo "Reloading nginx..."
nginx -s reload

echo "Deploy complete!"
