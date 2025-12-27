# Production Deployment Fix Guide

**NOTE:** This guide covers two production issues and their fixes.
See `DEPLOYMENT_GUIDE.md` for the latest deployment instructions.

---

## Issue #1 (RESOLVED): Backend Module Import Error
The backend container was failing to start with `ModuleNotFoundError: No module named 'src.lib'` due to:
1. Corrupted Docker build cache on production VPS
2. The `--reload` flag causing issues in production environment

**Fix Applied:**
1. Updated `docker/docker-compose.prod.yml` to explicitly run uvicorn **without** `--reload`
2. Created unified `deploy.sh` script that works for both dev and production
3. Simplified deployment process

---

## Issue #2 (NEW): Task Creation Fails - CORS Blocking

**Symptoms:**
- Task submission does nothing in production
- CORS error in browser console
- No POST requests reaching backend

**Root Cause:**
1. **Backend CORS misconfiguration**: Only allowed `localhost:3000`, blocked production server IPs
2. **Missing `.env.production`**: Frontend using wrong API URL

**Fix Applied:**
1. Updated `backend/src/api/__init__.py` with dynamic CORS based on environment
2. Added `ALLOWED_ORIGINS` env var to production config
3. Updated deployment guide with CORS troubleshooting

## Quick Fix for Issue #2 (CORS Blocking)

### 1. SSH into your production server

```bash
ssh user@your-vps-ip
cd /opt/task_master  # or wherever you deployed
```

### 2. Pull latest changes (includes CORS fix)

```bash
git pull origin main
```

### 3. Create `.env.production` file

```bash
cp .env.production.example .env.production
nano .env.production
```

**Update these lines** (replace `YOUR_VPS_IP` with your actual server IP):

```env
VITE_API_BASE_URL=http://YOUR_VPS_IP:8000/api/v1
ALLOWED_ORIGINS=*
```

Example (if your server IP is `203.0.113.45`):
```env
VITE_API_BASE_URL=http://203.0.113.45:8000/api/v1
ALLOWED_ORIGINS=*
```

Save and exit (Ctrl+X, Y, Enter).

### 4. Redeploy

```bash
bash deploy.sh production
```

This will rebuild with CORS fix and correct environment variables.

### 5. Verify

1. **Check backend logs:**
   ```bash
   sudo docker logs -f task_master-backend-prod
   ```

2. **Test from browser:**
   - Open `http://YOUR_VPS_IP:3000`
   - Open browser DevTools (F12) → Console tab
   - Try creating a task
   - Should see POST request to `http://YOUR_VPS_IP:8000/api/v1/tasks`

3. **Manual API test:**
   ```bash
   curl -X POST http://YOUR_VPS_IP:8000/api/v1/tasks \
     -H "Content-Type: application/json" \
     -d '{"user_input": "test task"}'
   ```

---

## Steps to Fix Issue #1 (Module Import Error)

### 1. SSH and navigate to project

```bash
ssh user@your-vps-ip
cd /path/to/task_master
```

### 2. Pull latest changes

```bash
git pull origin main
```

### 3. Clean Docker cache (IMPORTANT!)

```bash
sudo docker builder prune -af
sudo docker image prune -af
```

**Warning:** Removes all unused Docker images and cache.

### 4. Redeploy

```bash
bash deploy.sh production
```

### 5. Verify

```bash
sudo docker compose -f docker/docker-compose.prod.yml ps
sudo docker compose -f docker/docker-compose.prod.yml logs -f backend
```

You should see:
- ✅ No `ModuleNotFoundError`
- ✅ `INFO: Application startup complete.`

Test:
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

## What Changed

### Before (Problematic)
```yaml
# docker/backend.Dockerfile
CMD ["sh", "-c", "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload"]
```

The `--reload` flag caused:
- File watching overhead in production
- Subprocess restart issues
- Import errors when reload watcher tried to restart

### After (Fixed)
```yaml
# docker/docker-compose.prod.yml
backend:
  command: ["sh", "-c", "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000"]
```

Production explicitly runs **without** `--reload` for:
- ✅ Better stability (no subprocess crashes)
- ✅ Better performance (no file watching)
- ✅ Fewer import errors

Development still uses `--reload` for hot-reloading during development.

## Troubleshooting

### If build still fails after cache clean

1. Check disk space:
   ```bash
   df -h
   ```

2. Remove ALL Docker data (nuclear option):
   ```bash
   sudo docker system prune -af --volumes
   ```
   **Warning:** This removes everything including volumes!

3. Rebuild:
   ```bash
   bash deploy.sh
   ```

### If containers won't start

Check logs for each service:
```bash
sudo docker compose -f docker/docker-compose.prod.yml logs ollama
sudo docker compose -f docker/docker-compose.prod.yml logs backend
sudo docker compose -f docker/docker-compose.prod.yml logs frontend
```

### If Ollama model isn't loading

The first time, it takes ~5-10 minutes to download the llama3.2 model:
```bash
sudo docker compose -f docker/docker-compose.prod.yml logs -f ollama-init
```

## Rollback (if needed)

If something goes wrong, you can rollback to the previous commit:

```bash
# Stop services
sudo docker compose -f docker/docker-compose.prod.yml down

# Rollback code
git reset --hard HEAD~1

# Rebuild and restart
sudo docker compose -f docker/docker-compose.prod.yml build --no-cache
sudo docker compose -f docker/docker-compose.prod.yml up -d
```

## Success Criteria

✅ Backend starts without errors
✅ No `ModuleNotFoundError` in logs
✅ Health endpoint returns 200
✅ Frontend loads at http://your-vps-ip:3000
✅ Can create tasks via the UI
✅ Tasks get enriched by Ollama

---

## Summary of Changes

### Issue #1 Files Changed:
- `docker/docker-compose.prod.yml` - Removed `--reload` flag from production backend

### Issue #2 Files Changed:
- `backend/src/api/__init__.py` - Added dynamic CORS configuration
- `.env.production.example` - Added `ALLOWED_ORIGINS` variable
- `docker/docker-compose.prod.yml` - Pass `ALLOWED_ORIGINS` to backend
- `DEPLOYMENT_GUIDE.md` - Added CORS troubleshooting section

---

**Last Updated:** 2025-12-25
**Fix Deployed To:** main branch
**Related Docs:** DEPLOYMENT_GUIDE.md
