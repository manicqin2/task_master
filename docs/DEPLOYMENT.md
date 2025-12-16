# Task Master - Hostinger VPS Deployment Guide

Complete deployment guide for running Task Master on Hostinger VPS 1 (1-2GB RAM, 1 vCPU).

## Prerequisites

- Hostinger VPS 1 (or higher) with Ubuntu 22.04 LTS
- SSH access to your VPS
- Domain name (optional - for future HTTPS setup)

## Architecture

```
┌─────────────────────────────────┐
│      Hostinger VPS 1            │
│   (1-2GB RAM, 1 vCPU)           │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────────┐   │
│  │ Docker Compose           │   │
│  │                          │   │
│  │  Frontend (port 3000)    │   │
│  │  Backend (port 8000)     │   │
│  │  Ollama (port 11434)     │   │
│  │                          │   │
│  └──────────────────────────┘   │
│                                 │
│  Volumes:                       │
│  - ollama_data (models ~2GB)    │
│  - db_data (SQLite database)    │
│                                 │
│  Memory Limits:                 │
│  - Ollama: 1.5GB max            │
│  - Backend: 512MB max           │
│  - Frontend: 256MB max          │
│  - Swap: 2GB buffer             │
└─────────────────────────────────┘
```

## Deployment Steps

### Step 1: Initial VPS Setup

**Option A: Using hPanel Browser Terminal (Easiest)**

1. Login to hPanel: https://hpanel.hostinger.com
2. Go to: VPS → Your VPS → Overview
3. Click **Browser Terminal** (opens in your browser - no SSH client needed!)

**Option B: Using SSH (Traditional)**
```bash
ssh root@YOUR_VPS_IP
```

**Run the setup script:**
```bash
# Update system first (recommended by Hostinger)
dnf update -y && dnf upgrade -y
reboot

# After reboot, reconnect and run setup
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/task-master/main/setup-vps.sh
chmod +x setup-vps.sh
bash setup-vps.sh
```

This script will:
- ✅ Update system packages
- ✅ Install Docker & Docker Compose
- ✅ Configure firewall (Hostinger VPS Firewall or UFW)
- ✅ Create 2GB swap space (memory buffer for VPS 1)
- ✅ Create non-root deployment user
- ✅ Create application directory

**Important:** The script will ask you to create a deployment user. Don't use root for daily operations!

### Step 3: Configure Firewall (Optional but Recommended)

Hostinger provides a **built-in VPS Firewall** in hPanel (easier than iptables):

1. Go to: **hPanel → VPS → Security → Firewall**
2. Click **Create firewall configuration**
3. Name it: "taskmaster-firewall"
4. Add these incoming rules:
   - Port 22 (SSH) - TCP - Any IP
   - Port 80 (HTTP) - TCP - Any IP
   - Port 443 (HTTPS) - TCP - Any IP  
   - Port 3000 (Frontend) - TCP - Any IP
   - Port 8000 (Backend) - TCP - Any IP (optional, for API testing)
5. Click **Save**

Changes take effect immediately!

**Alternative:** The setup script also configures UFW if you prefer command-line firewall.

### Step 4: Deploy Application

**Switch to deployment user (created during setup):**
```bash
su - taskmaster  # or the username you chose
```

Clone your repository:
```bash
cd /opt/taskmaster
git clone YOUR_REPO_URL .
```

Configure environment:
```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit configuration
nano .env.production
```

Update `VITE_API_BASE_URL` in `.env.production`:
```bash
VITE_API_BASE_URL=http://YOUR_VPS_IP:8000/api/v1
```

Deploy:
```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
bash deploy.sh
```

### Step 5: Verify Deployment

Check if services are running:
```bash
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                            STATUS
task_master-backend-prod        Up (healthy)
task_master-frontend-prod       Up
task_master-ollama-prod         Up (healthy)
task_master-ollama-init-prod    Exited (0)
```

Test the application:
```bash
# Check backend health
curl http://localhost:8000/health

# Should return: {"status":"healthy"}
```

### Step 6: Access Application

Open in your browser:
```
http://YOUR_VPS_IP:3000
```

## Post-Deployment

### Monitoring

View all logs:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

View specific service:
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f ollama
```

Check resource usage:
```bash
docker stats
htop
```

### Database Backups

Manual backup:
```bash
chmod +x backup.sh
bash backup.sh
```

Automated daily backups (2 AM):
```bash
crontab -e

# Add this line:
0 2 * * * /opt/taskmaster/backup.sh
```

Backups location: `/opt/taskmaster/backups/`

### Updates

Pull latest code and redeploy:
```bash
cd /opt/taskmaster
git pull
bash deploy.sh
```

### Restart Services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop Services

```bash
docker compose -f docker-compose.prod.yml down
```

### View Database

Access database directly:
```bash
docker compose -f docker-compose.prod.yml exec backend sh
cd /app/data
sqlite3 tasks.db
.tables
SELECT * FROM tasks;
.quit
```

## Troubleshooting

### Service Won't Start

Check logs:
```bash
docker compose -f docker-compose.prod.yml logs backend
```

Common issues:
- Ollama model still downloading (wait 2-5 minutes)
- Out of memory (check with `free -h`)
- Port already in use (check with `netstat -tulpn`)

### Slow Performance

Check memory:
```bash
free -h
```

If using swap heavily:
```bash
# Check swap usage
free -h | grep Swap

# Monitor in real-time
watch -n 1 free -h
```

### Ollama Model Not Found

Re-pull model:
```bash
docker compose -f docker-compose.prod.yml exec ollama ollama pull llama3.2
```

### Reset Everything

⚠️ **WARNING: This deletes all data!**
```bash
docker compose -f docker-compose.prod.yml down -v
bash deploy.sh
```

## Performance Tuning (VPS 1)

### If Memory is Tight

Reduce Ollama memory limit in `docker-compose.prod.yml`:
```yaml
ollama:
  mem_limit: 1g  # Reduce from 1.5g
```

Use smaller model:
```bash
# In .env.production
OLLAMA_MODEL=llama3.2:1b  # Faster, uses less memory
```

### If Enrichment is Slow

First request is always slow (model loading). Subsequent requests should be 3-5 seconds.

If still slow:
- Check swap usage: `free -h`
- Reduce timeout: `OLLAMA_TIMEOUT=60` in `.env.production`
- Consider upgrading to VPS 2 (4GB RAM)

## Security Recommendations

Current setup is basic. For production use:

1. **Change SSH port** (from 22 to custom):
   ```bash
   nano /etc/ssh/sshd_config
   # Change: Port 2222
   systemctl restart sshd
   ufw allow 2222/tcp
   ufw delete allow 22/tcp
   ```

2. **Add fail2ban** (brute force protection):
   ```bash
   apt-get install fail2ban
   systemctl enable fail2ban
   ```

3. **Regular updates**:
   ```bash
   apt-get update && apt-get upgrade -y
   ```

## Future Enhancements

### Add HTTPS with Let's Encrypt

Install Certbot:
```bash
apt-get install certbot
```

Get certificate:
```bash
certbot certonly --standalone -d taskmaster.yourdomain.com
```

### Add Nginx (Optional)

See `docs/nginx-setup.md` for reverse proxy configuration.

### Add Monitoring

Install monitoring stack:
- Prometheus (metrics)
- Grafana (dashboards)
- AlertManager (alerts)

## Cost Estimate

**Monthly Costs:**
- VPS 1 hosting: ~$4/month
- Domain (optional): ~$1/month
- Total: **$4-5/month**

## Support

- GitHub Issues: YOUR_REPO/issues
- Documentation: YOUR_REPO/docs
- Email: your@email.com

## Quick Reference

```bash
# Deploy/Update
bash deploy.sh

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Backup database
bash backup.sh

# Restart
docker compose -f docker-compose.prod.yml restart

# Stop
docker compose -f docker-compose.prod.yml down

# Check status
docker compose -f docker-compose.prod.yml ps

# Check resources
docker stats
free -h
```
