#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}SmartMoney Deployment Script${NC}"
echo "================================"

# Check if .env exists
if [ ! -f "deploy/.env" ]; then
    echo -e "${YELLOW}Creating .env from template...${NC}"
    cp deploy/.env.production deploy/.env
    echo -e "${RED}IMPORTANT: Edit deploy/.env with your credentials before continuing!${NC}"
    echo "Run: nano deploy/.env"
    exit 1
fi

# Load environment variables
source deploy/.env

# Check required variables
if [ "$POSTGRES_PASSWORD" = "CHANGE_ME_STRONG_PASSWORD" ]; then
    echo -e "${RED}ERROR: Please change POSTGRES_PASSWORD in deploy/.env${NC}"
    exit 1
fi

if [ "$SECRET_KEY" = "CHANGE_ME_GENERATE_WITH_openssl_rand_hex_32" ]; then
    echo -e "${RED}ERROR: Please set SECRET_KEY in deploy/.env${NC}"
    echo "Generate with: openssl rand -hex 32"
    exit 1
fi

# Build frontend
echo -e "${GREEN}Building frontend...${NC}"
cd frontend
npm ci
npm run build
cd ..

# Start services
echo -e "${GREEN}Starting Docker services...${NC}"
cd deploy
docker compose --env-file .env up -d --build

echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Services running:"
docker compose ps
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Point your domain DNS to this server's IP"
echo "2. Run SSL setup: ./setup-ssl.sh your-domain.com"
echo "3. Access your app at http://$(curl -s ifconfig.me)"
