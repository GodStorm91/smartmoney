#!/bin/bash
# Fast deployment script using git push to production
# Run: ./deploy/fast-deploy.sh

set -e

echo "🚀 Deploying to production..."

# Push to production server
echo "📤 Pushing code to server..."
git push production main:main --force

echo "✅ Code pushed successfully!"

# Deploy via SSH with build
ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 root@money.khanh.page << 'DEPLOY_SCRIPT'
set -e

DEPLOY_DIR="/var/www/smartmoney"
NGINX_DIR="/root/smartmoney/deploy/frontend-dist"

echo "🔨 Building frontend..."
cd "$DEPLOY_DIR/frontend"

# Ensure config files exist
if [ ! -f "tsconfig.json" ]; then
    echo "Missing tsconfig.json, cannot build"
    exit 1
fi

npm run build

echo "📁 Deploying build files to nginx directory..."
# Remove old files in nginx directory
rm -rf "$NGINX_DIR/assets" "$NGINX_DIR/locales" "$NGINX_DIR/icons"
rm -f "$NGINX_DIR/index.html" "$NGINX_DIR/manifest.json" "$NGINX_DIR/registerSW.js" "$NGINX_DIR/sw.js" "$NGINX_DIR/workbox-58bd4dca.js"

# Copy new build from frontend/dist to nginx directory
cp -r dist/* "$NGINX_DIR/"

# Copy locales from frontend/locales (where git puts them)
mkdir -p "$NGINX_DIR/locales"
cp -r "$DEPLOY_DIR/frontend/public/locales"/* "$NGINX_DIR/locales/" 2>/dev/null || echo "No public locales to copy"

echo "🔄 Restarting nginx container to pick up changes..."
cd /root/smartmoney/deploy
docker compose down nginx
docker compose up -d nginx

# Wait for nginx to be ready
sleep 3

echo "✅ Deployment complete!"
ls -la "$NGINX_DIR/"
DEPLOY_SCRIPT

echo "🎉 Deployment finished successfully!"
echo "🌐 Visit: https://money.khanh.page"
