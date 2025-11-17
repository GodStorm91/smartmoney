# SmartMoney Deployment Guide
**Date:** 2025-11-17

---

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

### Without Docker

```bash
# Clone repo
git clone https://github.com/you/smartmoney.git
cd smartmoney

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e ".[dev]"

# Initialize database
alembic upgrade head

# Run backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend setup (new terminal)
cd ../frontend
npm install
npm run dev
```

**Access:**
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

---

### With Docker (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Run migrations
docker-compose exec backend alembic upgrade head

# Access
# Frontend: http://localhost:80
# Backend: http://localhost:80/api
# API Docs: http://localhost:80/api/docs
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    volumes:
      - ./backend:/app
      - ./data:/app/data  # SQLite storage
    environment:
      - DATABASE_URL=sqlite:///./data/smartmoney.db
    ports:
      - "8000:8000"
    depends_on:
      - db

  frontend:
    build: ./frontend
    volumes:
      - ./frontend/src:/app/src
    ports:
      - "5173:5173"
    depends_on:
      - backend

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=smartmoney
      - POSTGRES_PASSWORD=changeme
      - POSTGRES_DB=smartmoney
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

---

## Production VPS Deployment

### VPS Provider Recommendations

**Hetzner Cloud (Germany) - Recommended**
- Plan: CX21 (€4.15/mo)
- Specs: 2 vCPU, 4GB RAM, 40GB SSD
- Bandwidth: 20TB
- Data center: Falkenstein (GDPR-compliant)
- Uptime: 99.9% SLA

**Contabo VPS S (Germany) - Budget Option**
- Plan: VPS S (€3.99/mo)
- Specs: 4 vCPU, 8GB RAM, 50GB NVMe
- Bandwidth: 32TB
- Note: Lower SLA, occasional downtime reports

**Minimum Requirements:**
- 2GB RAM (1GB app + 1GB PostgreSQL)
- 20GB disk (10GB DB + 10GB backups)
- Ubuntu 22.04 LTS

---

### Initial Server Setup

```bash
# SSH into VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install utilities
apt install git ufw fail2ban htop -y

# Create application user
useradd -m -s /bin/bash smartmoney
usermod -aG docker smartmoney
```

---

### Firewall Configuration

```bash
# Configure UFW
ufw default deny incoming
ufw default allow outgoing

ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

# Enable firewall
ufw enable

# Check status
ufw status verbose
```

---

### Application Deployment

```bash
# Switch to app user
su - smartmoney

# Clone repository
git clone https://github.com/you/smartmoney.git /opt/smartmoney
cd /opt/smartmoney

# Create environment file
cat > .env <<EOF
# Database
DATABASE_URL=postgresql://smartmoney:CHANGE_ME_STRONG_PASSWORD@db:5432/smartmoney

# Security
SECRET_KEY=$(openssl rand -hex 32)
ADMIN_PASSWORD_HASH=\$2b\$12\$...  # Generate with: python -c "from passlib.hash import bcrypt; print(bcrypt.hash('YOUR_PASSWORD'))"

# Domain
DOMAIN=finance.yourdomain.com

# Email (for backups, optional)
BACKUP_EMAIL=your@email.com
EOF

# Set permissions
chmod 600 .env

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Check logs
docker-compose logs -f
```

---

### Production Docker Compose

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: ./frontend
      args:
        - VITE_API_URL=https://${DOMAIN}/api
    restart: unless-stopped
    depends_on:
      - backend

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=smartmoney
      - POSTGRES_PASSWORD=${DATABASE_URL#*:*@}  # Extract from URL
      - POSTGRES_DB=smartmoney
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups
    shm_size: 256mb  # Improve performance

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - frontend

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

---

### Caddy Configuration (Reverse Proxy + HTTPS)

**Caddyfile:**
```caddy
{
    email {$BACKUP_EMAIL}
}

{$DOMAIN} {
    # Frontend
    handle {
        reverse_proxy frontend:3000
    }

    # Backend API
    handle_path /api/* {
        reverse_proxy backend:8000
    }

    # Enable basic auth (VPS only)
    basicauth /* {
        admin {$ADMIN_PASSWORD_HASH}
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "no-referrer-when-downgrade"
    }

    # Compression
    encode gzip

    # Logging
    log {
        output file /var/log/caddy/access.log
        format json
        level INFO
    }
}
```

**Generate password hash:**
```bash
docker run -it caddy caddy hash-password --plaintext 'your-strong-password'
```

---

### SSL Certificate (Let's Encrypt)

Caddy auto-provisions Let's Encrypt certificates. Requirements:
1. Domain DNS points to VPS IP
2. Ports 80/443 open
3. Email configured in Caddyfile

**Verify HTTPS:**
```bash
curl -I https://finance.yourdomain.com
# Should return HTTP/2 200 with HSTS header
```

---

## Backup Strategy

### Automated Daily Backups

**Create backup script:**
```bash
sudo nano /etc/cron.daily/smartmoney-backup
```

**Content:**
```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/smartmoney/backups"
DATE=$(date +%Y%m%d)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Dump database
docker exec smartmoney_db_1 pg_dump -U smartmoney smartmoney > "$BACKUP_DIR/db_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/db_$DATE.sql"

# Encrypt (optional, requires GPG key setup)
# gpg -e -r your@email.com "$BACKUP_DIR/db_$DATE.sql.gz"

# Delete old backups
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log
echo "$(date): Backup completed - db_$DATE.sql.gz" >> /var/log/smartmoney-backup.log
```

**Make executable:**
```bash
sudo chmod +x /etc/cron.daily/smartmoney-backup
```

**Test:**
```bash
sudo /etc/cron.daily/smartmoney-backup
ls -lh /opt/smartmoney/backups/
```

---

### Manual Backup

```bash
# Full backup
cd /opt/smartmoney
docker-compose exec db pg_dump -U smartmoney smartmoney | gzip > backup_$(date +%Y%m%d).sql.gz

# Copy to local machine
scp smartmoney@vps-ip:/opt/smartmoney/backups/*.sql.gz ./
```

---

### Restore from Backup

```bash
# Stop application
docker-compose down

# Restore database
gunzip < backup_20251117.sql.gz | docker-compose exec -T db psql -U smartmoney smartmoney

# Restart
docker-compose up -d
```

---

## Monitoring & Maintenance

### Log Management

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f caddy --tail=100

# Disk usage
df -h
docker system df

# Database size
docker-compose exec db psql -U smartmoney -c "\l+"
```

---

### Performance Monitoring

**Install monitoring tools:**
```bash
# Install htop (system monitor)
apt install htop

# Monitor in real-time
htop

# Check Docker stats
docker stats
```

**Database performance:**
```sql
-- Slow queries (PostgreSQL)
SELECT
    pid,
    now() - query_start AS duration,
    query
FROM pg_stat_activity
WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;
```

---

### Updates & Upgrades

```bash
# Pull latest code
cd /opt/smartmoney
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d

# Run migrations (if any)
docker-compose exec backend alembic upgrade head

# Check health
docker-compose ps
curl https://finance.yourdomain.com/api/health
```

---

### Security Hardening

**Fail2Ban (prevent brute-force SSH):**
```bash
# Install
apt install fail2ban

# Configure
cat > /etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

# Restart
systemctl restart fail2ban
systemctl status fail2ban
```

**Automatic security updates:**
```bash
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

---

## Disaster Recovery

### Full System Failure

1. **Provision new VPS** (same specs)
2. **Restore backups:**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com | sh

   # Clone repo
   git clone https://github.com/you/smartmoney.git /opt/smartmoney
   cd /opt/smartmoney

   # Restore .env file (from secure storage)
   nano .env

   # Start services
   docker-compose -f docker-compose.prod.yml up -d

   # Restore database
   gunzip < latest_backup.sql.gz | docker-compose exec -T db psql -U smartmoney smartmoney
   ```

**RTO (Recovery Time Objective):** ~30 minutes
**RPO (Recovery Point Objective):** 24 hours (daily backups)

---

## Scaling Considerations (Future)

### When to Scale

**Triggers:**
- >10 concurrent users
- Database >500k transactions
- Response time >1s
- VPS CPU >80% sustained

### Vertical Scaling (Easier)

Upgrade VPS plan:
- Hetzner CX31: €9.48/mo (4 vCPU, 8GB RAM)
- Hetzner CX41: €18.96/mo (8 vCPU, 16GB RAM)

**Migration:** Zero downtime with resize

---

### Horizontal Scaling (Complex)

**Architecture changes:**
```
           Load Balancer
                |
      +---------+---------+
      |                   |
   API Server 1      API Server 2
      |                   |
      +---------+---------+
                |
           PostgreSQL (Primary)
                |
           PostgreSQL (Replica) - Read-only
```

**Required:**
- Redis for session storage
- Separate file storage (S3/R2)
- Background workers (Celery)

**Not needed for single-user MVP**

---

**Related Docs:**
- [Overview](./tech-stack-overview.md)
- [Dependencies](./tech-stack-dependencies.md)
- [Database Schema](./tech-stack-database.md)

---

**END OF DEPLOYMENT GUIDE**
