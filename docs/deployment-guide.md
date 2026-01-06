# SmartMoney Deployment Guide
**Version:** 1.0
**Last Updated:** 2025-11-17

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Clone Repository
```bash
git clone <repository-url>
cd smartmoney
```

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Run development server
fastapi dev app/main.py
```

Backend runs at **http://localhost:8000**
API docs at **http://localhost:8000/docs**

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend runs at **http://localhost:5173**

### Verify Installation
1. Open http://localhost:5173
2. Navigate to Upload page
3. Upload sample CSV
4. Check dashboard for data

---

## Environment Configuration

### Backend (.env)

Create `backend/.env`:

```env
# Database
DATABASE_URL=sqlite:///./smartmoney.db

# Debug mode
DEBUG=True

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

**PostgreSQL (Production):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/smartmoney
DEBUG=False
CORS_ORIGINS=https://yourdomain.com
```

### Frontend (.env)

Create `frontend/.env`:

```env
# API base URL
VITE_API_BASE_URL=http://localhost:8000
```

**Production:**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

---

## Database Setup

### SQLite (Default - MVP)

**Automatic initialization:**
```bash
cd backend
fastapi dev app/main.py
# Database created automatically at backend/smartmoney.db
```

**Manual migrations:**
```bash
# Create migration after model changes
alembic revision --autogenerate -m "Add new field"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### PostgreSQL (Production)

**Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql@15
brew services start postgresql@15
```

**Create database:**
```bash
sudo -u postgres psql

postgres=# CREATE DATABASE smartmoney;
postgres=# CREATE USER smartmoney_user WITH PASSWORD 'secure_password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE smartmoney TO smartmoney_user;
postgres=# \q
```

**Update backend/.env:**
```env
DATABASE_URL=postgresql://smartmoney_user:secure_password@localhost:5432/smartmoney
```

**Run migrations:**
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

---

## Testing

### Backend Tests

```bash
cd backend
source venv/bin/activate

# Run all tests
pytest

# With coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_transaction_service.py

# Run specific test
pytest tests/test_transaction_service.py::test_create_transaction_success

# Verbose output
pytest -v

# Stop on first failure
pytest -x
```

**Expected output:**
```
89 passed in 2.34s
```

### Frontend Tests (Future)

```bash
cd frontend

# Run tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Production Deployment

### Option 1: VPS Deployment (Recommended)

**Recommended VPS Providers:**
- **Hetzner Cloud:** CX21 (€4.15/mo, GDPR-compliant, Germany)
- **Contabo:** VPS S (€5/mo, Europe)
- **DigitalOcean:** Basic Droplet ($6/mo, worldwide)

**Minimum Specs:**
- 2 vCPU
- 2GB RAM
- 40GB SSD
- Ubuntu 22.04 LTS

**Setup Steps:**

#### 1. Provision VPS
```bash
# SSH into VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y python3.11 python3-pip python3-venv nodejs npm postgresql nginx git
```

#### 2. Setup Application
```bash
# Create app user
adduser smartmoney
usermod -aG sudo smartmoney
su - smartmoney

# Clone repository
git clone <repository-url>
cd smartmoney
```

#### 3. Setup Backend
```bash
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -e "."

# Setup environment
cp .env.example .env
nano .env  # Edit with production values

# Run migrations
alembic upgrade head
```

#### 4. Setup Frontend
```bash
cd ../frontend

# Install dependencies
npm install

# Build for production
npm run build
# Output: dist/ directory
```

#### 5. Setup Systemd Services

**Backend service** (`/etc/systemd/system/smartmoney-backend.service`):
```ini
[Unit]
Description=SmartMoney Backend
After=network.target postgresql.service

[Service]
Type=simple
User=smartmoney
WorkingDirectory=/home/smartmoney/smartmoney/backend
Environment="PATH=/home/smartmoney/smartmoney/backend/venv/bin"
ExecStart=/home/smartmoney/smartmoney/backend/venv/bin/fastapi run app/main.py --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable smartmoney-backend
sudo systemctl start smartmoney-backend
sudo systemctl status smartmoney-backend
```

#### 6. Setup Nginx

**Configuration** (`/etc/nginx/sites-available/smartmoney`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    location / {
        root /home/smartmoney/smartmoney/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API docs
    location /docs {
        proxy_pass http://localhost:8000;
    }

    # Max upload size
    client_max_body_size 50M;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/smartmoney /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. Setup HTTPS (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (test)
sudo certbot renew --dry-run
```

**Certbot auto-updates nginx config for HTTPS**

---

### Option 2: Docker Deployment (Future)

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://smartmoney:password@db:5432/smartmoney
    depends_on:
      - db
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=smartmoney
      - POSTGRES_USER=smartmoney
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

volumes:
  postgres_data:
```

**Deploy:**
```bash
docker-compose up -d
```

---

## Backup & Restore

### Docker PostgreSQL Backup (Production)

SmartMoney includes automated backup scripts for the Docker deployment.

**Backup location:** `/root/smartmoney/backups/`
**Retention:** 7 days
**Schedule:** Daily at 3:00 AM (UTC)

#### Manual Backup

```bash
# Run backup script
cd /root/smartmoney
bash deploy/scripts/backup.sh

# Output example:
# [2026-01-06 12:47:50] Starting backup...
# [2026-01-06 12:47:50] Backup successful: smartmoney_20260106_124750.sql.gz (532K)
```

#### List Available Backups

```bash
bash deploy/scripts/restore.sh
# Shows all available backups with sizes
```

#### Restore from Backup

```bash
# Interactive restore (creates pre-restore backup automatically)
bash deploy/scripts/restore.sh smartmoney_20260106_124750.sql.gz

# Manual restore (advanced)
gunzip -c /root/smartmoney/backups/smartmoney_20260106_124750.sql.gz | \
  docker exec -i smartmoney-db psql -U smartmoney -d smartmoney
```

#### Verify Backup

```bash
# Check backup content
zcat /root/smartmoney/backups/smartmoney_*.sql.gz | head -30

# Check tables in backup
zcat /root/smartmoney/backups/smartmoney_*.sql.gz | grep -c "COPY public"
```

#### Cron Configuration

The backup cron job runs daily at 3:00 AM:
```bash
# View current cron
crontab -l | grep smartmoney

# Output:
# 0 3 * * * /root/smartmoney/deploy/scripts/backup.sh >> /var/log/smartmoney-backup.log 2>&1
```

#### Backup Logs

```bash
# View backup logs
tail -50 /var/log/smartmoney-backup.log
```

### SQLite Backup (Development)

**Manual backup:**
```bash
cp backend/smartmoney.db backend/smartmoney-backup-$(date +%Y%m%d).db
```

**Restore:**
```bash
cp backend/smartmoney-backup-20251117.db backend/smartmoney.db
```

---

## Monitoring

### Application Logs

**Backend logs:**
```bash
# Systemd journal
sudo journalctl -u smartmoney-backend -f

# Filter by date
sudo journalctl -u smartmoney-backend --since "2025-11-17"

# Last 100 lines
sudo journalctl -u smartmoney-backend -n 100
```

**Nginx logs:**
```bash
# Access log
tail -f /var/log/nginx/access.log

# Error log
tail -f /var/log/nginx/error.log
```

### System Monitoring

**Disk usage:**
```bash
df -h
du -sh /home/smartmoney/smartmoney/backend/smartmoney.db
```

**Memory usage:**
```bash
free -h
```

**Database size:**
```bash
# SQLite
ls -lh backend/smartmoney.db

# PostgreSQL
sudo -u postgres psql
\l+  # List databases with sizes
\q
```

### Health Checks

**Backend health:**
```bash
curl http://localhost:8000/docs
# Should return Swagger UI HTML
```

**Database connection:**
```bash
# PostgreSQL
sudo -u postgres psql -U smartmoney_user -d smartmoney -c "SELECT COUNT(*) FROM transactions;"
```

---

## Security Hardening

### Firewall (UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### SSH Hardening

**Disable password auth** (`/etc/ssh/sshd_config`):
```
PasswordAuthentication no
PermitRootLogin no
```

```bash
sudo systemctl restart sshd
```

**Use SSH keys only**

### Fail2Ban (Brute-force protection)

```bash
# Install
sudo apt install fail2ban

# Enable
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### PostgreSQL Security

```bash
# PostgreSQL config (/etc/postgresql/15/main/pg_hba.conf)
# Allow local connections only
local   all   all   peer
host    smartmoney   smartmoney_user   127.0.0.1/32   md5
```

```bash
sudo systemctl restart postgresql
```

---

## Performance Tuning

### PostgreSQL Tuning

**Configuration** (`/etc/postgresql/15/main/postgresql.conf`):
```ini
# Memory settings (for 2GB RAM VPS)
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
work_mem = 4MB

# Query planner
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000  # Log slow queries (>1s)
```

```bash
sudo systemctl restart postgresql
```

### Nginx Tuning

**Configuration** (`/etc/nginx/nginx.conf`):
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

# Client body buffer
client_body_buffer_size 10K;
client_header_buffer_size 1k;
client_max_body_size 50M;

# Timeouts
client_body_timeout 12;
client_header_timeout 12;
keepalive_timeout 15;
send_timeout 10;
```

### FastAPI Optimization

**Production settings** (backend/.env):
```env
# Disable debug mode
DEBUG=False

# Logging level
LOG_LEVEL=INFO

# Workers (2 x CPU cores + 1)
WORKERS=5
```

**Run with Gunicorn** (alternative to fastapi run):
```bash
pip install gunicorn

gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

---

## Troubleshooting

### Backend Won't Start

**Check logs:**
```bash
sudo journalctl -u smartmoney-backend -n 50
```

**Common issues:**
- Database connection failed → Check DATABASE_URL
- Port already in use → Check `sudo netstat -tlnp | grep 8000`
- Permission denied → Check file permissions

**Manual test:**
```bash
cd backend
source venv/bin/activate
fastapi dev app/main.py
# Check error messages
```

### Frontend Build Fails

**Check Node version:**
```bash
node --version  # Should be 18+
```

**Clear cache:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Migration Errors

**Check current version:**
```bash
alembic current
```

**Reset to head:**
```bash
alembic downgrade base
alembic upgrade head
```

**Conflict resolution:**
```bash
# Check migration history
alembic history

# Manually edit migration file if needed
nano alembic/versions/<migration-file>.py
```

### CSV Upload Fails

**Check file size limit:**
- Nginx: `client_max_body_size 50M;`
- FastAPI: Default 50MB

**Check encoding:**
- Supported: Shift-JIS, UTF-8, UTF-8-BOM
- Use chardet for detection

**Check logs:**
```bash
sudo journalctl -u smartmoney-backend -f
# Upload CSV and watch logs
```

### Performance Issues

**Database slow queries:**
```bash
# Enable PostgreSQL slow query log
# Check /var/log/postgresql/postgresql-15-main.log
```

**Check indexes:**
```sql
-- List indexes
SELECT * FROM pg_indexes WHERE tablename = 'transactions';

-- Missing index example
CREATE INDEX ix_custom ON transactions(field1, field2);
```

**Frontend slow:**
- Check Network tab in browser DevTools
- Verify API response times
- Check bundle size: `npm run build` → check dist/ size

---

## Updating Application

### Update Backend

```bash
cd backend
source venv/bin/activate

# Pull latest code
git pull origin main

# Update dependencies
pip install -e "."

# Run migrations
alembic upgrade head

# Restart service
sudo systemctl restart smartmoney-backend
```

### Update Frontend

```bash
cd frontend

# Pull latest code
git pull origin main

# Update dependencies
npm install

# Rebuild
npm run build

# Nginx serves new dist/ automatically
```

### Zero-Downtime Updates (Future)

**Blue-green deployment:**
1. Setup duplicate environment
2. Test new version
3. Switch Nginx proxy
4. Keep old version for rollback

---

## Migration: SQLite → PostgreSQL

**Export SQLite data:**
```bash
# Install sqlite3
sudo apt install sqlite3

# Export to SQL
sqlite3 backend/smartmoney.db .dump > sqlite_dump.sql
```

**Import to PostgreSQL:**
```bash
# Create PostgreSQL database (see above)

# Convert SQLite dump (remove incompatible syntax)
sed 's/AUTOINCREMENT/SERIAL/g' sqlite_dump.sql > postgres_dump.sql

# Import
psql -U smartmoney_user smartmoney < postgres_dump.sql
```

**Update configuration:**
```env
# backend/.env
DATABASE_URL=postgresql://smartmoney_user:password@localhost:5432/smartmoney
```

**Restart backend:**
```bash
sudo systemctl restart smartmoney-backend
```

**Verify data:**
```bash
psql -U smartmoney_user smartmoney
SELECT COUNT(*) FROM transactions;
\q
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (89/89)
- [ ] Code review complete
- [ ] .env files configured
- [ ] Database migrations created
- [ ] Backup current database
- [ ] Update documentation

### VPS Setup
- [ ] Provision VPS (2GB RAM minimum)
- [ ] Install dependencies (Python, Node, PostgreSQL)
- [ ] Clone repository
- [ ] Setup PostgreSQL database
- [ ] Configure environment variables

### Application Setup
- [ ] Install backend dependencies
- [ ] Run database migrations
- [ ] Build frontend production bundle
- [ ] Setup systemd service
- [ ] Configure Nginx
- [ ] Setup HTTPS (Let's Encrypt)

### Post-Deployment
- [ ] Test CSV upload
- [ ] Test dashboard load
- [ ] Test goal creation
- [ ] Check logs for errors
- [ ] Setup monitoring
- [ ] Configure automated backups

### Security
- [ ] Firewall enabled (UFW)
- [ ] SSH key-only auth
- [ ] Fail2Ban configured
- [ ] HTTPS enabled
- [ ] Strong PostgreSQL password

---

**END OF DEPLOYMENT GUIDE**
