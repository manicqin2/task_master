# Quickstart Guide: Gemini LLM Integration

**Feature**: Replace Ollama with Gemini 3 LLM | **Branch**: `006-gemini-llm` | **Date**: 2025-12-26

## Overview

This guide walks you through migrating from Ollama (local LLM) to Google's Gemini API for task enrichment. The migration requires minimal code changes and simplifies deployment by removing Docker volumes and model downloads.

**Time to Complete**: 30-45 minutes

---

## Prerequisites

### Required

- **Google AI Studio Account**: Free tier available at https://aistudio.google.com/
- **Gemini API Key**: Generated from Google AI Studio (format: `AIzaSy...`)
- **Python 3.11+**: Already installed if running current task_master backend
- **Existing task_master Deployment**: Working Ollama-based installation

### Recommended

- **Git Branch**: `006-gemini-llm` (feature branch)
- **Backup**: Database backup before migration (even though no schema changes occur)

---

## Step 1: Get Gemini API Key

1. **Visit Google AI Studio**: https://aistudio.google.com/
2. **Sign in** with your Google account
3. **Navigate to API Keys** (left sidebar)
4. **Create API Key** → Choose existing project or create new
5. **Copy API Key** (format: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

**Important**: Store your API key securely. It will only be shown once.

**Free Tier Limits**:
- **10 requests per minute (RPM)** for `gemini-2.5-flash`
- **2 million tokens per day**
- Perfect for personal task management (estimated: 500-1000 tasks/day)

**Paid Tier Costs** (if you exceed free tier):
- **Input**: $0.10 per 1M tokens
- **Output**: $0.40 per 1M tokens
- **Estimated monthly cost**: ~$0.60 for typical usage (100 tasks/day)

---

## Step 2: Install Gemini SDK

### Development Environment

```bash
# Navigate to backend directory
cd backend

# Install google-genai SDK (unified SDK, GA since May 2025)
pip install google-genai

# Update requirements.txt
echo "google-genai>=0.1.0" >> requirements.txt

# Remove Ollama dependency (no longer needed)
# Edit requirements.txt and remove: openai>=1.0.0
```

### Docker Environment

Update `backend/Dockerfile`:

```dockerfile
# Add to requirements installation step
RUN pip install --no-cache-dir \
    google-genai>=0.1.0 \
    # ... other dependencies ...
```

**No changes needed** to `docker-compose.yml` yet - we'll handle that in Step 4.

---

## Step 3: Configure Environment Variables

### Development (.env.development)

```bash
# Add Gemini API configuration
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT=15.0
GEMINI_MAX_RETRIES=3

# Remove old Ollama configuration (optional - will be ignored)
# OLLAMA_BASE_URL=http://ollama:11434
# OLLAMA_MODEL=llama3.2
# OLLAMA_TIMEOUT=120
```

### Production (.env.production)

```bash
# Add Gemini API configuration (use production API key)
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT=15.0
GEMINI_MAX_RETRIES=3

# Keep existing production settings
ENVIRONMENT=production
ALLOWED_ORIGINS=*
DATABASE_URL=sqlite:///./data/tasks.db
```

---

## Step 4: Implement Gemini Client

### Create `backend/src/lib/gemini_client.py`

This replaces `ollama_client.py`. See the full implementation in [architecture.md](./architecture.md).

**Key Methods**:
1. `enrich_task(text: str) -> str` - Enriches raw user input into clear task description
2. `extract_metadata(text: str, schema: Type[BaseModel]) -> BaseModel` - Extracts structured metadata with Pydantic schema

**Example Usage**:

```python
from lib.gemini_client import GeminiClient, GeminiClientConfig

# Initialize client
config = GeminiClientConfig(
    api_key=os.getenv("GEMINI_API_KEY"),
    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    timeout=float(os.getenv("GEMINI_TIMEOUT", "15.0")),
    max_retries=int(os.getenv("GEMINI_MAX_RETRIES", "3")),
)
client = GeminiClient(config)

# Enrich task
enriched = await client.enrich_task("call John tmrw")
# Result: "Call John tomorrow"

# Extract metadata (with Pydantic schema)
metadata = await client.extract_metadata(enriched, MetadataExtractionResponse)
# Result: MetadataExtractionResponse(persons=["John"], deadline="tomorrow", ...)
```

---

## Step 5: Update Services

### Update `backend/src/services/metadata_extraction.py`

Replace `OllamaClient` import with `GeminiClient`:

```python
# BEFORE
from lib.ollama_client import OllamaClient

# AFTER
from lib.gemini_client import GeminiClient
```

Update client initialization:

```python
# BEFORE
self.client = OllamaClient(base_url=..., model=..., timeout=...)

# AFTER
from lib.gemini_client import GeminiClientConfig
config = GeminiClientConfig(
    api_key=os.getenv("GEMINI_API_KEY"),
    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    timeout=float(os.getenv("GEMINI_TIMEOUT", "15.0")),
    max_retries=int(os.getenv("GEMINI_MAX_RETRIES", "3")),
)
self.client = GeminiClient(config)
```

### Update `backend/src/services/enrichment_service.py`

Same changes as above - replace Ollama client with Gemini client.

---

## Step 6: Update Docker Compose

### Remove Ollama Service

Edit `docker/docker-compose.yml`:

```yaml
# DELETE this entire service block
services:
  ollama:
    image: ollama/ollama:latest
    container_name: task_master-ollama
    # ... entire service definition ...

  ollama-init:
    image: ollama/ollama:latest
    container_name: task_master-ollama-init
    # ... entire service definition ...
```

### Remove Ollama Volume

```yaml
# DELETE this volume
volumes:
  ollama_data:  # No longer needed
  db_data:      # Keep this
```

### Update Backend Service

```yaml
services:
  backend:
    environment:
      # ADD Gemini configuration
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=${GEMINI_MODEL:-gemini-2.5-flash}
      - GEMINI_TIMEOUT=${GEMINI_TIMEOUT:-15.0}
      - GEMINI_MAX_RETRIES=${GEMINI_MAX_RETRIES:-3}

      # REMOVE Ollama configuration
      # - OLLAMA_BASE_URL=http://ollama:11434
      # - OLLAMA_MODEL=llama3.2
      # - OLLAMA_TIMEOUT=120
```

**Same changes** for `docker/docker-compose.prod.yml`.

---

## Step 7: Test Locally

### Start Services

```bash
# Development
docker compose up --build

# Production
./deploy.sh --production
```

### Verify Gemini Connection

```bash
# Check backend logs for Gemini initialization
docker compose logs backend | grep -i gemini

# Expected output:
# INFO: Gemini client initialized with model gemini-2.5-flash
# INFO: Gemini API connection test successful
```

### Test Task Enrichment

**Via Frontend**:
1. Open http://localhost:3000 (or your production URL)
2. Enter a task: "call John tomorrow at 3pm"
3. Wait 1-2 seconds (should be faster than Ollama's 2-4 seconds)
4. Verify task appears in "Pending" lane, then moves to "Ready" lane
5. Check metadata: persons = ["John"], deadline = "tomorrow at 3pm"

**Via API**:

```bash
# Create task
curl -X POST http://localhost:8000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"user_input": "call John tomorrow at 3pm"}'

# Expected response:
# {"id": "abc123", "enriched_text": "Call John tomorrow at 3pm", ...}
```

### Run Tests

```bash
# Unit tests
docker compose exec backend pytest tests/unit/test_gemini_client.py

# Integration tests
docker compose exec backend pytest tests/integration/test_enrichment_workflow.py

# Contract tests
docker compose exec backend pytest tests/contract/test_gemini_client.py

# All tests
docker compose exec backend pytest
```

---

## Step 8: Verify Migration Success

### Check 1: Existing Tasks Accessible

```bash
# Query database for old Ollama-enriched tasks
docker compose exec backend python -c "
from src.models.task import Task
from src.lib.database import get_db

db = next(get_db())
tasks = db.query(Task).filter(Task.enriched_text.isnot(None)).all()
print(f'Found {len(tasks)} existing enriched tasks')
"

# Expected: All tasks from before migration are still accessible
```

### Check 2: New Tasks Use Gemini

```bash
# Check backend logs for Gemini API calls
docker compose logs backend | grep "Gemini API"

# Expected output:
# INFO: Gemini API call: enrich_task (latency: 1.2s)
# INFO: Gemini API call: extract_metadata (latency: 0.8s)
```

### Check 3: Performance Metrics

```bash
# Average enrichment time should be <1.5s
docker compose logs backend | grep "Enrichment completed" | tail -10

# Expected output:
# INFO: Enrichment completed in 1.1s (task_id=abc123)
# INFO: Enrichment completed in 0.9s (task_id=def456)
```

### Check 4: Ollama Containers Removed

```bash
# Verify Ollama containers are gone
docker ps -a | grep ollama

# Expected output: (empty - no Ollama containers)

# Verify Ollama volume can be deleted
docker volume ls | grep ollama

# Expected output: (empty - no Ollama volumes)
```

---

## Step 9: Deploy to Production

### Backup Database (Recommended)

```bash
# On production server
cp data/tasks.db data/tasks.db.backup-$(date +%Y%m%d)
```

### Update Production Environment

1. **Push code changes** to repository (feature branch `006-gemini-llm`)
2. **SSH to production server**
3. **Pull latest code**: `git pull origin 006-gemini-llm`
4. **Update .env.production** with `GEMINI_API_KEY`
5. **Run deployment**: `./deploy.sh --production`

### Verify Production Deployment

```bash
# Test task creation via production API
curl -X POST http://YOUR_VPS_IP:8000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"user_input": "test gemini integration"}'

# Check production logs
sudo docker logs task_master-backend-prod | grep -i gemini

# Verify frontend works
# Open http://YOUR_VPS_IP:3000 and test task creation
```

---

## Troubleshooting

### Error: "GEMINI_API_KEY environment variable is required"

**Cause**: API key not set in environment.

**Fix**:
1. Check `.env.development` or `.env.production` has `GEMINI_API_KEY=AIzaSy...`
2. Restart backend: `docker compose restart backend`
3. Verify env var: `docker compose exec backend env | grep GEMINI`

### Error: "Invalid Gemini API key format"

**Cause**: API key doesn't start with `AIza`.

**Fix**:
1. Verify API key from Google AI Studio
2. Copy full key including `AIza` prefix
3. Update `.env.*` file with correct key

### Error: "401 Unauthorized" from Gemini API

**Cause**: API key is invalid or expired.

**Fix**:
1. Generate new API key from https://aistudio.google.com/
2. Update `.env.*` file with new key
3. Restart backend

### Error: "429 Rate Limit Exceeded"

**Cause**: Exceeded free tier limit (10 requests per minute).

**Fix**:
1. Wait 60 seconds for rate limit to reset
2. Task will automatically retry with exponential backoff
3. Consider upgrading to paid tier if frequent (very unlikely for personal use)

### Error: "Enrichment timeout after 15 seconds"

**Cause**: Gemini API is slow or unavailable.

**Fix**:
1. Increase timeout: `GEMINI_TIMEOUT=30.0` in `.env.*`
2. Check Gemini API status: https://status.cloud.google.com/
3. Task will retry automatically (up to 3 times)

### Error: "Tasks stuck in Pending lane"

**Cause**: Enrichment service may have crashed or Gemini API is failing.

**Fix**:
1. Check backend logs: `docker compose logs backend | tail -50`
2. Look for errors in enrichment workflow
3. Restart backend: `docker compose restart backend`
4. Retry failed tasks from "More Info" lane

### Migration Issue: Old Ollama tasks not showing

**Cause**: Database integrity issue (unlikely - no schema changes).

**Fix**:
1. Verify database: `docker compose exec backend python -c "from src.models.task import Task; ..."`
2. Check migration logs: `docker compose exec backend alembic history`
3. Restore from backup if needed: `cp data/tasks.db.backup-* data/tasks.db`

---

## Performance Benchmarks

### Expected Metrics (gemini-2.5-flash)

| Metric | Ollama (llama3.2) | Gemini 2.5-flash | Improvement |
|--------|-------------------|------------------|-------------|
| Enrichment Time | 1-3s avg (2s) | 0.5-1.5s avg (1s) | **50% faster** |
| Metadata Extraction | 1-3s avg (2s) | 0.5-1.5s avg (1s) | **50% faster** |
| Total Workflow | 2-6s avg (4s) | 1-3s avg (2s) | **50% faster** |
| P95 Latency | 8s | 4s | **50% faster** |

### Cost Analysis

**Free Tier** (sufficient for most users):
- **10 RPM** = 600 requests/hour = 14,400 requests/day
- Typical usage: 10-100 tasks/day
- **Cost**: $0/month

**Paid Tier** (if you exceed free tier):
- 100 tasks/day × 30 days = 3,000 tasks/month
- Avg tokens/task: 50 input + 100 output = 150 tokens
- Total tokens: 3,000 × 150 = 450,000 tokens = 0.45M tokens
- Cost: (0.45M × $0.10) + (0.45M × $0.40) = **$0.225/month**
- Realistic estimate with overhead: **~$0.60/month**

---

## Rollback Plan (If Needed)

If Gemini integration has issues, you can rollback to Ollama:

1. **Checkout previous commit**: `git checkout <commit-before-gemini>`
2. **Restore docker-compose**: Ollama service will be back
3. **Remove Gemini env vars**: Delete `GEMINI_API_KEY` from `.env.*`
4. **Restart services**: `docker compose down && docker compose up --build`

**Note**: All data remains intact (no schema changes), so rollback is safe.

---

## Next Steps

After successful migration:

1. **Monitor API Usage**: Check https://aistudio.google.com/ for usage metrics
2. **Tune Performance**: Adjust `GEMINI_TIMEOUT` and `GEMINI_MAX_RETRIES` as needed
3. **Cost Optimization**: If costs are high, consider reducing enrichment frequency
4. **Delete Ollama Resources**:
   ```bash
   # Delete Ollama volumes (frees ~4GB disk space)
   docker volume rm task_master_ollama_data

   # Remove Ollama client code (optional)
   rm backend/src/lib/ollama_client.py
   ```

5. **Merge Feature Branch**:
   ```bash
   git checkout main
   git merge 006-gemini-llm
   git push origin main
   ```

---

## Additional Resources

- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **google-genai SDK**: https://github.com/googleapis/python-genai
- **Google AI Studio**: https://aistudio.google.com/
- **Rate Limits**: https://ai.google.dev/gemini-api/docs/quota
- **Pricing**: https://ai.google.dev/pricing

---

## Support

If you encounter issues not covered in this guide:

1. **Check backend logs**: `docker compose logs backend | tail -100`
2. **Verify API key**: Test at https://aistudio.google.com/
3. **Review architecture**: See [architecture.md](./architecture.md) for detailed diagrams
4. **Check data model**: See [data-model.md](./data-model.md) for data flow
5. **Run research findings**: See [research.md](./research.md) for API details

**Estimated completion time**: Most migrations complete in 30-45 minutes with successful testing.
