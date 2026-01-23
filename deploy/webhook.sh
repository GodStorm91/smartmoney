#!/bin/bash
# Deploy webhook script - copy this to the server at /home/godstorm91/project/smartmoney/deploy/webhook.sh

set -e

cd /home/godstorm91/project/smartmoney

# Pull latest code
git pull origin main

# Build frontend
cd frontend
npm ci
npm run build
cd ..

# Copy build to nginx serving directory
cp -r frontend/dist/* /var/www/smartmoney/

# Or if using docker
# cd deploy
# docker compose restart frontend

echo "Deployment completed at $(date)"
