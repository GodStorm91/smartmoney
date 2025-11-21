#!/bin/bash
set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-ssl.sh your-domain.com"
    exit 1
fi

echo "Setting up SSL for $DOMAIN..."

# Get SSL certificate
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

echo "SSL certificate obtained!"
echo ""
echo "Now update nginx.conf:"
echo "1. Uncomment the HTTPS server block"
echo "2. Replace 'your-domain.com' with '$DOMAIN'"
echo "3. Uncomment the HTTP redirect"
echo "4. Restart nginx: docker compose restart nginx"
