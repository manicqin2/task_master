# Task Master - Unified Deployment Guide

## ✅ Quick Start

The unified `deploy.sh` script now works for **both development and production** environments!

### Development (Local)
```bash
bash deploy.sh development
```

### Production (VPS)
```bash
bash deploy.sh production
```

---

## 📋 Prerequisites

### Development
- Docker and Docker Compose installed
- Ports 3000, 8000, and 11434 available

### Production
- VPS with Docker and Docker Compose
- `.env.production` file configured (see below)
- Ports 3000 and 8000 open in firewall

---

## 🚀 Development Deployment

### First Time Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd task_master
   ```

2. **Run deployment**
   ```bash
   bash deploy.sh development
   ```

   This automatically creates `.env.development` with default values.

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - Health: http://localhost:8000/health

### Features in Development Mode
- ✅ Hot reload enabled (code changes auto-restart)
- ✅ Source code mounted as volumes
- ✅ Faster health checks
- ✅ No memory limits
- ✅ No sudo required

---

## 🌐 Production Deployment

### First Time Setup on VPS

1. **SSH into your VPS**
   ```bash
   ssh user@your-vps-ip
   ```

2. **Clone the repository**
   ```bash
   cd /opt
   git clone <repository-url>
   cd task_master
   ```

3. **Create production environment file**
   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```

   Update the `VITE_API_BASE_URL` with your VPS IP:
   ```env
   VITE_API_BASE_URL=http://YOUR_VPS_IP:8000/api/v1
   ```

4. **Run deployment**
   ```bash
   bash deploy.sh production
   ```

5. **Access the application**
   - Frontend: http://your-vps-ip:3000
   - Backend: http://your-vps-ip:8000
   - Health: http://your-vps-ip:8000/health

### Features in Production Mode
- ✅ Optimized for stability (no hot reload)
- ✅ Containers restart automatically
- ✅ Memory limits enforced
- ✅ Build cache disabled (`--no-cache`)
- ✅ Uses `sudo` for Docker commands

---

## 🔧 Environment Files

### `.env.development` (Auto-created)
```env
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT=120
DATABASE_URL=sqlite+aiosqlite:///./data/tasks.db
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_POLLING_INTERVAL=500
ENVIRONMENT=development
```

### `.env.production` (Must be created manually)
```env
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT=120
DATABASE_URL=sqlite+aiosqlite:///./data/tasks.db
VITE_API_BASE_URL=http://YOUR_VPS_IP:8000/api/v1  # ← CHANGE THIS!
VITE_POLLING_INTERVAL=500
ALLOWED_ORIGINS=*  # ← Allow all origins (or specify your domain)
ENVIRONMENT=production
```

---

## 🐳 Docker Compose Files

The deploy script automatically selects the correct file:

| Environment | Docker Compose File | Key Features |
|------------|-------------------|-------------|
| Development | `docker/docker-compose.yml` | Volume mounts, hot reload, fast health checks |
| Production | `docker/docker-compose.prod.yml` | No reload, memory limits, restart policies |

---

## 📊 Useful Commands

### View Logs
```bash
# Development
docker compose -f docker/docker-compose.yml logs -f

# Production
sudo docker compose -f docker/docker-compose.prod.yml logs -f
```

### View Backend Logs Only
```bash
# Development
docker compose -f docker/docker-compose.yml logs -f backend

# Production
sudo docker compose -f docker/docker-compose.prod.yml logs -f backend
```

### Check Container Status
```bash
# Development
docker compose -f docker/docker-compose.yml ps

# Production
sudo docker compose -f docker/docker-compose.prod.yml ps
```

### Stop Services
```bash
# Development
docker compose -f docker/docker-compose.yml down

# Production
sudo docker compose -f docker/docker-compose.prod.yml down
```

### Restart Services
```bash
# Development
bash deploy.sh development

# Production
bash deploy.sh production
```

---

## 🔥 Troubleshooting

### Backend Container Failing to Start

**Check logs:**
```bash
# Development
docker logs task_master-backend

# Production
sudo docker logs taskmaster-backend-prod
```

**Common issues:**
1. **ModuleNotFoundError**: Clean Docker cache and rebuild
   ```bash
   docker builder prune -af
   docker image prune -af
   bash deploy.sh development  # or production
   ```

2. **Port already in use**: Stop conflicting containers
   ```bash
   # Find what's using port 8000
   sudo lsof -i :8000

   # Stop old containers
   docker ps -a | grep backend | awk '{print $1}' | xargs docker rm -f
   ```

3. **Database migration failed**: Check migration logs
   ```bash
   docker logs task_master-backend 2>&1 | grep -i alembic
   ```

### Ollama Model Not Loading

**Monitor download progress:**
```bash
# Development
docker compose -f docker/docker-compose.yml logs -f ollama-init

# Production
sudo docker compose -f docker/docker-compose.prod.yml logs -f ollama-init
```

**Note:** First download takes 5-10 minutes (~4GB model).

### Health Check Failing

**Test manually:**
```bash
curl http://localhost:8000/health
```

**If it times out:**
- Backend container may be crash-looping
- Check logs for Python errors
- Verify database is accessible

### CORS Errors in Production

**Symptom:** Task submission fails with CORS error in browser console

**Cause:** Backend is blocking requests from your server's IP address

**Fix:**
1. Ensure `.env.production` exists and has `ALLOWED_ORIGINS=*`
2. Rebuild and restart:
   ```bash
   sudo docker compose -f docker/docker-compose.prod.yml down
   bash deploy.sh production
   ```

**For specific origins only:**
Edit `.env.production`:
```env
ALLOWED_ORIGINS=http://1.2.3.4:3000,http://yourdomain.com
```

---

## 🔄 Updating Production

```bash
# SSH into VPS
ssh user@your-vps-ip
cd /opt/task_master

# Pull latest changes
git pull origin main

# Clean Docker cache (if needed)
sudo docker builder prune -af
sudo docker image prune -af

# Redeploy
bash deploy.sh production
```

---

## 📦 What Gets Deployed

### Backend Container
- Python 3.11 + FastAPI
- SQLAlchemy + Alembic migrations
- Ollama client for LLM enrichment
- SQLite database (persisted in Docker volume)

### Frontend Container
- Node.js 20 + React 18 + Vite
- TypeScript + shadcn/ui components
- Connects to backend API

### Ollama Container
- llama3.2 model (~4GB)
- Serves LLM requests for task enrichment
- Model stored in Docker volume (persists between restarts)

---

## 📈 Performance Notes

- **First enrichment**: ~30 seconds (Ollama loads model into memory)
- **Subsequent enrichments**: ~3-5 seconds
- **Frontend build**: ~15 seconds
- **Backend build**: ~10 seconds (with cache)

---

## 🛡️ Security Notes

### Production Recommendations

1. **Use a reverse proxy** (Nginx/Caddy) with HTTPS
2. **Set up firewall rules** to restrict port access
3. **Don't commit `.env.production`** (already in `.gitignore`)
4. **Regularly update** Docker images and dependencies
5. **Monitor logs** for errors and unusual activity

---

## 📝 Changelog

- **2025-12-20**: Created unified deployment script for dev & prod
- **2025-12-20**: Fixed `--reload` flag in production (removed)
- **2025-12-20**: Added automatic `.env.development` creation
- **2025-12-20**: Improved error messages and logging

---

## 💡 Tips

- Use `bash deploy.sh development` for local testing
- Use `bash deploy.sh production` on VPS only
- The script auto-detects environment and adjusts:
  - Docker Compose file
  - Sudo usage
  - Build cache strategy
  - Container restart policies
  - Health check intervals

---

**For more help, see:**
- `PRODUCTION_FIX.md` - Troubleshooting production issues
- `CLAUDE.md` - Development guidelines
- GitHub Issues - Report bugs

---

**Last Updated:** 2025-12-20
**Version:** 1.0.0
