# Task Master - Deployment Checklist

## Pre-Deployment

- [ ] Purchase Hostinger VPS 1 (or higher)
- [ ] Note down VPS IP address: `___________________`
- [ ] Ensure SSH access works: `ssh root@YOUR_VPS_IP`
- [ ] (Optional) Purchase domain name

## VPS Setup

- [ ] SSH into VPS: `ssh root@YOUR_VPS_IP`
- [ ] Run setup script: `sudo bash setup-vps.sh`
- [ ] Verify Docker installed: `docker --version`
- [ ] Verify swap configured: `free -h` (should show 2GB swap)
- [ ] Verify firewall active: `ufw status`

## Application Deployment

- [ ] Create app directory: `cd /opt/taskmaster`
- [ ] Clone repository: `git clone YOUR_REPO .`
- [ ] Copy environment file: `cp .env.production.example .env.production`
- [ ] Edit environment: `nano .env.production`
- [ ] Update `VITE_API_BASE_URL` with your VPS IP
- [ ] Make scripts executable: `chmod +x *.sh`
- [ ] Run deployment: `bash deploy.sh`

## Verification

- [ ] Check containers running: `docker compose -f docker-compose.prod.yml ps`
- [ ] All containers show "Up" or "healthy" status
- [ ] Test backend health: `curl http://localhost:8000/health`
- [ ] Open in browser: `http://YOUR_VPS_IP:3000`
- [ ] Create a test task: "buy milk"
- [ ] Wait for enrichment to complete (~30s first time, then 3-5s)
- [ ] Verify task appears enriched

## Post-Deployment

- [ ] Set up database backups: Add cron job
- [ ] Document VPS IP address in your password manager
- [ ] Bookmark application URL
- [ ] Test from mobile device
- [ ] Monitor resource usage: `docker stats`

## Optional Enhancements

- [ ] Configure domain name (if purchased)
- [ ] Set up HTTPS with Let's Encrypt
- [ ] Add monitoring (Prometheus/Grafana)
- [ ] Configure automatic updates
- [ ] Set up health check alerts

## Notes

**VPS IP Address**: ___________________
**Domain Name**: ___________________
**Deployment Date**: ___________________
**Backup Location**: `/opt/taskmaster/backups/`

## Quick Commands Reference

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Backup database
bash backup.sh

# Restart application
docker compose -f docker-compose.prod.yml restart

# Update application
git pull && bash deploy.sh

# Check system resources
free -h
docker stats
```
