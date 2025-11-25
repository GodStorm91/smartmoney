# Getting Started Guide - Landing Page Copy

## Section Header
```
From Zero to Dashboard in 30 Minutes
Step-by-step guide to self-hosting SmartMoney
```

## Complexity Meter
```
Technical Difficulty: ●●○○○ (2/5 - Basic command-line knowledge)
Time Required: 30-45 minutes (one-time setup)
```

---

## Setup Method Comparison

**Option A: VPS Hosting (Recommended)**
- **Pros:** Accessible anywhere, always-on, automatic backups
- **Cons:** Recurring cost (~¥5-10/month depending on provider)
- **Best For:** Non-technical users, families, remote access
- **Providers:** Hetzner (€4.5/mo), DigitalOcean ($6/mo), Vultr ($5/mo)

**Option B: Home Server / Raspberry Pi**
- **Pros:** Zero monthly cost (after hardware), complete control
- **Cons:** Requires port forwarding, dynamic DNS, home network setup
- **Best For:** Tech enthusiasts, privacy maximalists
- **Hardware:** Raspberry Pi 4 (¥8,000), old laptop, spare PC

---

## Quick Start (VPS Method)

### Step 1: Create VPS Account (5 minutes)
1. Sign up for Hetzner (hetzner.com)
2. Deploy Ubuntu 22.04 LTS server (CX11 plan, €4.5/mo)
3. Note your server IP address (e.g., 46.224.76.99)

[Screenshot: Hetzner dashboard with "Deploy Now" highlighted]

---

### Step 2: Connect to Server (2 minutes)
```bash
# On your local machine (Mac/Linux terminal, Windows PowerShell)
ssh root@YOUR_SERVER_IP

# Example:
ssh root@46.224.76.99
# Enter password from Hetzner email
```

**Troubleshooting:** If you get "connection refused", wait 2 minutes for server to boot.

---

### Step 3: Run Installation Script (10 minutes)
```bash
# Clone SmartMoney repository
git clone https://github.com/yourusername/smartmoney.git
cd smartmoney/deploy

# Copy environment variables template
cp .env.example .env

# Edit .env with your settings
nano .env
# Set: SECRET_KEY, DATABASE_PASSWORD, ANTHROPIC_API_KEY

# Deploy with Docker Compose
docker compose up -d

# Wait ~5 minutes for initial build
# Monitor progress: docker compose logs -f
```

**What This Does:**
- Installs PostgreSQL database
- Builds FastAPI backend
- Builds React frontend
- Configures Nginx reverse proxy
- Sets up SSL certificates (Let's Encrypt)

[Screenshot: Terminal showing docker compose up -d with green checkmarks]

---

### Step 4: Configure Domain & SSL (10 minutes)
```bash
# Point your domain to server IP
# In your domain registrar (Namecheap, GoDaddy):
# Add A record: money.yourdomain.com → YOUR_SERVER_IP

# Generate SSL certificate
cd /root/smartmoney/deploy
./scripts/setup-ssl.sh money.yourdomain.com
```

[Screenshot: Domain DNS settings page]

---

### Step 5: Create Account & Start Importing (5 minutes)
1. Visit https://money.yourdomain.com
2. Click "Sign Up" → Enter email + password
3. Go to Dashboard → Click "Upload CSV"
4. Drag-and-drop MoneyForward/Zaim export
5. Wait ~5 seconds → See dashboard populate with data

[Screenshot: Upload success modal showing "✅ 342 transactions imported, 5 duplicates skipped"]

---

## Maintenance Guide

### Monthly Tasks (5 minutes):
1. Upload new CSV exports from MoneyForward/Zaim
2. Review dashboard for spending insights
3. Update goals if income changes

### Quarterly Tasks (15 minutes):
1. Backup database: `docker compose exec postgres pg_dump > backup.sql`
2. Update SmartMoney: `git pull && docker compose up -d --build`
3. Review VPS security logs

### Automated Backups:
```bash
# Set up daily backups (cron job)
crontab -e
# Add: 0 2 * * * /root/smartmoney/scripts/backup.sh
```
