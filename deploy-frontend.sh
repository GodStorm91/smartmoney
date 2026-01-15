#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}SmartMoney Frontend Deployment${NC}"
echo "================================="

# Get server from env or use default
SERVER="${1:-money.khanh.page}"
echo -e "${YELLOW}Deploying to: $SERVER${NC}"

# Build frontend
echo -e "${GREEN}Building frontend...${NC}"
cd frontend
npm ci
npm run build
cd ..

# Create deploy package
echo -e "${GREEN}Creating deploy package...${NC}"
rm -rf deploy/frontend-dist/*
cp -r frontend/dist/* deploy/frontend-dist/
cp -r frontend/public/locales deploy/frontend-dist/

# Fix permissions
echo -e "${GREEN}Fixing permissions...${NC}"
chmod -R 755 deploy/frontend-dist/
chmod -R 644 deploy/frontend-dist/locales/

# Deploy to server
echo -e "${GREEN}Deploying to server...${NC}"
tar -czf /tmp/frontend-deploy.tar.gz -C deploy/frontend-dist .
scp /tmp/frontend-deploy.tar.gz root@$SERVER:/tmp/

# Extract on server
ssh root@$SERVER "
  rm -rf /root/smartmoney/deploy/frontend-dist/*
  tar -xzf /tmp/frontend-deploy.tar.gz -C /root/smartmoney/deploy/frontend-dist/
  chmod -R 755 /root/smartmoney/deploy/frontend-dist/
  chmod -R 644 /root/smartmoney/deploy/frontend-dist/locales/
  docker restart smartmoney-nginx
"

echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo -e "${YELLOW}Verifying deployment...${NC}"

# Verify
ssh root@$SERVER "docker exec smartmoney-nginx ls -la /usr/share/nginx/html/locales/en/common.json"

echo ""
echo -e "${GREEN}All checks passed!${NC}"
echo "Access your app at: https://$SERVER"
