# Google Gemini API Integration Research

## Executive Summary

This document provides comprehensive research on integrating Google Gemini 2.0/3.0 API to replace the existing Ollama LLM integration in the task_master backend. The research covers the official Python SDK, async support, structured outputs, authentication, model naming, rate limits, error handling, and best practices.

**Key Findings:**
- Official SDK: `google-genai` (new unified SDK, GA as of May 2025)
- Full async support via `client.aio` namespace
- Native structured output support with Pydantic schemas
- Simple API key authentication via environment variables
- Current models: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`
- Free tier: 10-15 RPM (significantly limited as of December 2025)
- Built-in retry with exponential backoff support

---

## 1. Official Python SDK

### Recommended SDK: `google-genai`

**Package:** `google-genai` (formerly `google-generativeai`)

**Installation:**
```bash
pip install google-genai
```

**Key Points:**
- Unified SDK launched with Gemini 2.0 (late 2024), reached GA in May 2025
- Replaces the deprecated `google-generativeai` package
- Supports both Gemini Developer API and Vertex AI
- Python 3.9+ required
- Official documentation: https://googleapis.github.io/python-genai/

**Alternative Options:**
- `google-generativeai` (deprecated, superseded by `google-genai`)
- OpenAI SDK with Gemini endpoint (not recommended for new projects)

**Recommendation:** Use `google-genai` for all new integrations.

---

## 2. Async Support

### Full Async Support via `.aio` Namespace

The `google-genai` SDK provides complete async support through a dedicated `.aio` namespace:

```python
from google import genai
import asyncio

async def main():
    client = genai.Client(api_key='YOUR_API_KEY')

    # Async content generation
    response = await client.aio.models.generate_content(
        model='gemini-2.5-flash',
        contents='Tell me a story in 300 words.'
    )
    print(response.text)

asyncio.run(main())
```

### Async Context Manager

```python
async with genai.Client(api_key='YOUR_API_KEY').aio as aclient:
    response = await aclient.models.generate_content(
        model='gemini-2.5-flash',
        contents='Hello'
    )
```

### Async Chat Sessions

```python
chat = client.aio.chats.create(model='gemini-2.5-flash')
response = await chat.send_message('tell me a story')
print(response.text)
```

### Concurrent Requests

```python
async def concurrent_requests():
    async with genai.Client(api_key='YOUR_API_KEY').aio as aclient:
        tasks = [
            aclient.models.generate_content(
                model='gemini-2.5-flash',
                contents='What is AI?'
            ),
            aclient.models.generate_content(
                model='gemini-2.5-flash',
                contents='What is ML?'
            ),
        ]
        results = await asyncio.gather(*tasks)
        for result in results:
            print(result.text)
```

**Key Points:**
- All sync methods have async equivalents via `.aio`
- Proper resource cleanup with async context managers
- Supports concurrent requests with `asyncio.gather()`
- Compatible with existing async FastAPI backend

---

## 3. Structured Outputs / JSON Mode

### Native Structured Output Support

Gemini models support structured outputs using Pydantic schemas or raw JSON schemas, ensuring predictable, validated, and automatically parsed responses.

### Using Pydantic Models (Recommended)

```python
from google import genai
from google.genai import types
from pydantic import BaseModel

class TaskMetadata(BaseModel):
    project: str | None
    persons: list[str]
    deadline: str | None
    task_type: str | None
    priority: str | None
    effort_estimate: int | None
    tags: list[str]

client = genai.Client(api_key='YOUR_API_KEY')

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents='Extract metadata from: Call Sarah about ProjectX quarterly review tomorrow at 3pm #urgent',
    config=types.GenerateContentConfig(
        response_mime_type='application/json',
        response_schema=TaskMetadata
    )
)

# Automatically parsed to Pydantic model
metadata = response.parsed  # Returns TaskMetadata instance
print(response.text)  # Raw JSON string
```

### Using Raw JSON Schema

```python
user_schema = {
    'type': 'object',
    'properties': {
        'project': {'type': 'string', 'description': "Project name"},
        'persons': {'type': 'array', 'items': {'type': 'string'}},
        'deadline': {'type': 'string'},
    },
    'required': ['project']
}

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents='Extract metadata from task description',
    config=types.GenerateContentConfig(
        response_mime_type='application/json',
        response_json_schema=user_schema
    )
)

print(response.parsed)  # Automatically parsed JSON
```

### Async Structured Output

```python
response = await client.aio.models.generate_content(
    model='gemini-2.5-flash',
    contents='Generate structured data',
    config=types.GenerateContentConfig(
        response_mime_type='application/json',
        response_schema=TaskMetadata
    )
)
```

**Key Points:**
- Use `response_mime_type='application/json'` for JSON mode
- Use `response_schema` for Pydantic models
- Use `response_json_schema` for raw JSON schemas
- Automatically parsed via `response.parsed`
- No manual JSON parsing required
- Guarantees format and type-safety

**Comparison with Ollama:**
- Ollama: `response_format={"type": "json_object"}` + manual JSON parsing
- Gemini: Native Pydantic support + automatic parsing via `response.parsed`

---

## 4. Authentication Requirements

### API Key Authentication

**Environment Variable Setup (Recommended):**

```bash
# Option 1: GEMINI_API_KEY
export GEMINI_API_KEY='YOUR_API_KEY'

# Option 2: GOOGLE_API_KEY (takes precedence if both set)
export GOOGLE_API_KEY='YOUR_API_KEY'
```

**Python Client Initialization:**

```python
from google import genai

# Automatic pickup from environment variable
client = genai.Client()

# Explicit API key (not recommended for production)
client = genai.Client(api_key='YOUR_API_KEY')
```

**Docker Environment Configuration:**

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      # or
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
```

### Getting Your API Key

1. Visit Google AI Studio: https://aistudio.google.com/
2. Navigate to API Keys page
3. Create new API key
4. Store securely (never commit to version control)

**Security Best Practices:**
- Store API key in environment variables, not in code
- Use `.env` file for local development (add to `.gitignore`)
- Never commit API keys to version control
- Rotate keys periodically
- Use separate keys for development and production

**API Key Format:**
- Standard Google API key format
- Typically starts with `AIza...`
- 39 characters long

---

## 5. Model Names (December 2025)

### Current Production Models

| Model Name | Description | Best For | Status |
|------------|-------------|----------|--------|
| `gemini-2.5-flash` | Fast, cost-efficient | Production workloads, high-volume tasks | **Recommended** |
| `gemini-2.5-pro` | Most capable | Complex reasoning, coding tasks | GA |
| `gemini-2.0-flash` | Previous generation | Legacy support | GA |
| `gemini-2.0-flash-exp` | Experimental | Testing new features | Experimental (Free) |

### Model Selection Guidelines

**For Task Enrichment (Current Use Case):**
- **Primary:** `gemini-2.5-flash`
  - Fast response times (< 1 second)
  - Cost-efficient for high-volume
  - Excellent for structured metadata extraction
  - 10 RPM on free tier

**For Metadata Extraction:**
- **Primary:** `gemini-2.5-flash`
  - Reliable structured output support
  - Low latency critical for UX
  - Sufficient reasoning for metadata extraction

**Alternative Options:**
- `gemini-2.5-pro`: Only if complex reasoning needed (not typical for task metadata)
- `gemini-2.0-flash-exp`: Free tier testing, but limited (2 RPM, 50 RPD)

### Model Naming Convention

```python
# Stable release (recommended)
model = "gemini-2.5-flash"

# Specific version (for reproducibility)
model = "gemini-2.0-flash-001"

# Experimental (free, limited)
model = "gemini-2.0-flash-exp"
```

**Recommendation:** Use `gemini-2.5-flash` for production task_master integration.

---

## 6. Rate Limits and Cost Considerations

### Free Tier Rate Limits (December 2025)

**Important:** Google significantly reduced free tier limits on December 6-7, 2025.

| Model | RPM | TPM | RPD | Notes |
|-------|-----|-----|-----|-------|
| `gemini-2.5-pro` | 5 | 250K | 100 | 1 request every 12 seconds |
| `gemini-2.5-flash` | 10 | 250K | 250 | **Recommended for task_master** |
| `gemini-2.5-flash-lite` | 15 | 250K | 1000 | Most lenient free tier |

**Key Constraints:**
- **RPM (Requests Per Minute):** Rolling 60-second window
- **TPM (Tokens Per Minute):** Rolling 60-second window
- **RPD (Requests Per Day):** Resets at midnight Pacific Time
- **Rate limits apply per project**, not per API key

### Pricing (Pay-as-You-Go)

**Gemini 2.5 Flash:**
- Input: $0.10 per 1M tokens
- Output: $0.40 per 1M tokens

**Cost Estimation for task_master:**
- Average task enrichment: ~200 tokens input, ~100 tokens output
- Cost per task: ~$0.00006 (0.006 cents)
- 10,000 tasks/month: ~$0.60/month

**Comparison:**
- Ollama: Free (self-hosted), requires infrastructure costs
- Gemini Free Tier: Free up to rate limits (10 RPM sufficient for development)
- Gemini Paid: ~$0.60/month for typical usage

### Rate Limit Error (429)

When rate limits are exceeded, the API returns:
- HTTP Status: `429 Too Many Requests`
- Error Code: `RESOURCE_EXHAUSTED`

**Best Practices:**
1. Implement exponential backoff (see Error Handling section)
2. Use request queuing for batch operations
3. Monitor rate limit consumption
4. Consider upgrading to paid tier for production

---

## 7. Error Codes and Exception Handling

### Exception Types

```python
from google.genai import errors

try:
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents='Hello'
    )
except errors.APIError as e:
    print(f"Error code: {e.code}")      # HTTP status code (e.g., 404, 429, 400)
    print(f"Error message: {e.message}") # Human-readable message
    print(f"Status: {e.status}")         # Status string
```

### Common Error Codes

| Code | Error Type | Description | Handling Strategy |
|------|------------|-------------|-------------------|
| 400 | Bad Request | Invalid request parameters | Validate inputs, check schema |
| 401 | Unauthorized | Invalid or missing API key | Check `GEMINI_API_KEY` env var |
| 403 | Forbidden | API key lacks permissions | Verify API key permissions |
| 404 | Not Found | Model not found | Check model name spelling |
| 429 | Rate Limited | Quota exceeded | Exponential backoff retry |
| 500 | Internal Error | Server error | Retry with backoff |
| 503 | Unavailable | Service temporarily unavailable | Retry with backoff |

### Error Handling Pattern

```python
from google import genai
from google.genai import errors
import time

async def generate_with_error_handling(prompt: str, max_retries: int = 3):
    """Generate content with comprehensive error handling."""
    client = genai.Client()

    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return response.text

        except errors.APIError as e:
            if e.code == 404:
                # Model not found - don't retry
                raise ValueError(f"Invalid model: {e.message}")

            elif e.code == 429:
                # Rate limited - exponential backoff
                if attempt < max_retries - 1:
                    delay = 2 ** attempt  # 1s, 2s, 4s
                    print(f"Rate limited. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    continue
                else:
                    raise Exception("Rate limit exceeded, max retries reached")

            elif e.code == 400:
                # Bad request - don't retry
                raise ValueError(f"Invalid request: {e.message}")

            elif e.code in [500, 503]:
                # Server error - retry with backoff
                if attempt < max_retries - 1:
                    delay = 2 ** attempt
                    print(f"Server error. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    continue
                else:
                    raise Exception(f"Server error persists: {e.message}")

            else:
                # Unknown error
                raise Exception(f"API error ({e.code}): {e.message}")

        except Exception as e:
            # Non-API errors
            raise Exception(f"Unexpected error: {str(e)}")
```

### Transient Errors (Should Retry)

- `429 Too Many Requests` (RESOURCE_EXHAUSTED)
- `500 Internal Server Error`
- `503 Service Unavailable`

### Permanent Errors (Should NOT Retry)

- `400 Bad Request` (Invalid input)
- `401 Unauthorized` (Invalid API key)
- `403 Forbidden` (Permission denied)
- `404 Not Found` (Invalid model)

---

## 8. Timeout Configuration, Retry Logic, and Best Practices

### Timeout Configuration

**Default Timeout:**
- Default: 60 seconds (built-in SDK timeout)
- Can be customized via HTTP options

**Custom Timeout:**

```python
from google import genai
from google.genai import types

client = genai.Client(
    http_options=types.HttpOptions(
        timeout=30.0  # 30 seconds
    )
)
```

**Recommended Timeouts:**
- **Development:** 60 seconds (default)
- **Production:** 20-30 seconds (balance between completion and UX)
- **Task enrichment:** 15-20 seconds (user-facing, needs responsiveness)
- **Batch processing:** 60-120 seconds (background jobs)

### Retry Logic with Exponential Backoff

**Using Built-in Retry (Recommended):**

```python
from google import genai
from google.genai import types

# Configure HTTP retry options
retry_options = types.HttpRetryOptions(
    initial_delay=1.0,      # Start with 1 second delay
    multiplier=2.0,         # Double delay each retry
    max_delay=60.0,         # Cap at 60 seconds
    max_retries=5,          # Max 5 retry attempts
    timeout=300.0           # Total timeout 5 minutes
)

client = genai.Client(
    http_options=types.HttpOptions(
        retry_options=retry_options
    )
)

# Retries happen automatically on transient errors
response = await client.aio.models.generate_content(
    model='gemini-2.5-flash',
    contents='Generate content'
)
```

**Manual Retry Implementation:**

```python
import asyncio
from google import genai
from google.genai import errors

async def generate_with_retry(
    prompt: str,
    max_retries: int = 5,
    base_delay: float = 1.0
) -> str:
    """Generate content with exponential backoff retry."""
    client = genai.Client()

    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return response.text

        except errors.APIError as e:
            # Only retry on transient errors
            if e.code in [429, 500, 503]:
                if attempt < max_retries - 1:
                    # Exponential backoff with jitter
                    delay = base_delay * (2 ** attempt)
                    jitter = random.uniform(0, 0.1 * delay)
                    total_delay = delay + jitter

                    print(f"Retrying in {total_delay:.2f}s (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(total_delay)
                    continue

            # Don't retry permanent errors
            raise

    raise Exception(f"Max retries ({max_retries}) exceeded")
```

### Best Practices

#### 1. Exponential Backoff with Jitter

**Why:** Prevents "thundering herd" problem where multiple clients retry simultaneously.

```python
import random

delay = base_delay * (2 ** attempt)        # Exponential: 1s, 2s, 4s, 8s...
jitter = random.uniform(0, 0.1 * delay)    # Add 0-10% random jitter
total_delay = delay + jitter
```

#### 2. Rate Limit Handling

**Free Tier Strategy:**
```python
# For free tier (10 RPM), space requests by 6+ seconds
await asyncio.sleep(6)  # Ensure under 10 RPM
```

**Production Strategy:**
```python
# Use queue with rate limiting
from asyncio import Semaphore

rate_limiter = Semaphore(10)  # Max 10 concurrent requests

async def rate_limited_generate(prompt: str):
    async with rate_limiter:
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text
```

#### 3. Graceful Degradation

```python
async def enrich_task_with_fallback(task_text: str) -> str:
    """Enrich task with graceful degradation."""
    try:
        # Primary: Gemini API
        return await enrich_with_gemini(task_text)
    except errors.APIError as e:
        if e.code == 429:
            # Rate limited: return original text
            logger.warning(f"Rate limited, returning original: {task_text}")
            return task_text
        raise
    except Exception as e:
        # Unexpected error: return original text
        logger.error(f"Enrichment failed: {e}")
        return task_text
```

#### 4. Monitoring and Logging

```python
import logging

logger = logging.getLogger(__name__)

async def generate_with_monitoring(prompt: str):
    start_time = time.time()

    try:
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )

        latency = time.time() - start_time
        logger.info(f"Generation succeeded in {latency:.2f}s")

        return response.text

    except errors.APIError as e:
        latency = time.time() - start_time
        logger.error(f"API error after {latency:.2f}s: {e.code} - {e.message}")
        raise
```

#### 5. Configuration via Environment Variables

```python
import os

# Configurable settings
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_TIMEOUT = float(os.getenv("GEMINI_TIMEOUT", "20.0"))
GEMINI_MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "3"))
GEMINI_TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", "0.3"))
GEMINI_MAX_TOKENS = int(os.getenv("GEMINI_MAX_TOKENS", "500"))
```

---

## 9. Migration from Ollama: Code Comparison

### Current Ollama Implementation

**File:** `/backend/src/lib/ollama_client.py`

```python
from openai import AsyncOpenAI

class OllamaClient:
    def __init__(self, base_url=None, model=None, timeout=None):
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
        if not self.base_url.endswith("/v1"):
            self.base_url = f"{self.base_url}/v1"

        self.model = model or os.getenv("OLLAMA_MODEL", "llama3.2")
        self.timeout = timeout or float(os.getenv("OLLAMA_TIMEOUT", "60.0"))

        self.client = AsyncOpenAI(
            base_url=self.base_url,
            api_key="ollama",  # Ollama doesn't require real API key
            timeout=self.timeout,
        )

    async def enrich_task(self, user_input: str) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input},
            ],
            temperature=0.3,
            max_tokens=100,
        )

        enriched_text = response.choices[0].message.content
        return enriched_text.strip()
```

### Proposed Gemini Implementation

**File:** `/backend/src/lib/gemini_client.py` (new)

```python
import os
from typing import Optional
from google import genai
from google.genai import types, errors

class GeminiClient:
    """Client for interacting with Google Gemini API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ):
        """Initialize Gemini client.

        Args:
            api_key: Gemini API key. Defaults to GEMINI_API_KEY env var.
            model: Model name to use. Defaults to GEMINI_MODEL env var.
            timeout: Request timeout in seconds. Defaults to GEMINI_TIMEOUT env var or 20.0.
            temperature: Sampling temperature. Defaults to GEMINI_TEMPERATURE env var or 0.3.
            max_tokens: Max output tokens. Defaults to GEMINI_MAX_TOKENS env var or 500.
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.timeout = timeout or float(os.getenv("GEMINI_TIMEOUT", "20.0"))
        self.temperature = temperature or float(os.getenv("GEMINI_TEMPERATURE", "0.3"))
        self.max_tokens = max_tokens or int(os.getenv("GEMINI_MAX_TOKENS", "500"))

        # Initialize Gemini client
        self.client = genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(
                timeout=self.timeout,
                retry_options=types.HttpRetryOptions(
                    initial_delay=1.0,
                    multiplier=2.0,
                    max_delay=60.0,
                    max_retries=3,
                )
            )
        )

    async def enrich_task(self, user_input: str) -> str:
        """Enrich user input by correcting spelling and improving wording.

        Args:
            user_input: Raw user input text.

        Returns:
            Enriched text with corrected spelling and improved wording.

        Raises:
            Exception: If enrichment fails.
        """
        system_prompt = (
            "You are a task enrichment assistant. Your job is to take informal, "
            "possibly misspelled task descriptions and improve them by:\n"
            "1. Correcting spelling errors\n"
            "2. Making the language clearer and more action-oriented\n"
            "3. Using proper action verbs (e.g., 'Call', 'Send', 'Schedule')\n"
            "4. Expanding common abbreviations (e.g., 'tmrw' -> 'tomorrow')\n\n"
            "Keep the core meaning intact. Only return the improved task text, "
            "nothing else."
        )

        try:
            # Create config with temperature and max_tokens
            config = types.GenerateContentConfig(
                temperature=self.temperature,
                max_output_tokens=self.max_tokens,
                system_instruction=system_prompt,
            )

            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=user_input,
                config=config,
            )

            enriched_text = response.text
            if not enriched_text:
                raise ValueError("Gemini returned empty response")

            return enriched_text.strip()

        except errors.APIError as e:
            raise Exception(f"Enrichment failed: API error {e.code} - {e.message}") from e
        except Exception as e:
            raise Exception(f"Enrichment failed: {str(e)}") from e


# Global client instance
_gemini_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Get or create global Gemini client instance.

    Returns:
        GeminiClient: Shared Gemini client instance.
    """
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
```

### Migration Checklist

- [ ] Install `google-genai` package
- [ ] Create `/backend/src/lib/gemini_client.py`
- [ ] Update `/backend/src/services/enrichment_service.py` to use `get_gemini_client()`
- [ ] Update `/backend/src/services/metadata_extraction.py` for structured outputs
- [ ] Add environment variables to `.env` and `docker-compose.yml`
- [ ] Update tests to mock Gemini client
- [ ] Update documentation (README, CLAUDE.md)
- [ ] Test rate limiting behavior
- [ ] Monitor latency and costs

---

## 10. Structured Metadata Extraction: Ollama vs Gemini

### Current Ollama Implementation

```python
# metadata_extraction.py
response = await self.llm_client.chat.completions.create(
    model="llama3.2",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Extract metadata from this task:\n\n{task_text}"},
    ],
    temperature=0.1,
    max_tokens=500,
    response_format={"type": "json_object"},  # Request JSON response
)

# Manual JSON parsing required
content = response.choices[0].message.content
extraction_data = json.loads(content)
```

### Proposed Gemini Implementation with Pydantic

```python
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

class MetadataExtraction(BaseModel):
    """Structured metadata extraction schema."""
    project: str | None = Field(None, description="Project or category name")
    project_confidence: float = Field(0.0, ge=0.0, le=1.0)
    persons: list[str] = Field(default_factory=list, description="Person names")
    persons_confidence: float = Field(0.0, ge=0.0, le=1.0)
    deadline: str | None = Field(None, description="Original deadline phrase")
    deadline_confidence: float = Field(0.0, ge=0.0, le=1.0)
    task_type: str | None = Field(None, description="Task type")
    task_type_confidence: float = Field(0.0, ge=0.0, le=1.0)
    priority: str | None = Field(None, description="Priority level")
    priority_confidence: float = Field(0.0, ge=0.0, le=1.0)
    effort_estimate: int | None = Field(None, description="Effort in minutes")
    effort_confidence: float = Field(0.0, ge=0.0, le=1.0)
    dependencies: list[str] = Field(default_factory=list)
    dependencies_confidence: float = Field(0.0, ge=0.0, le=1.0)
    tags: list[str] = Field(default_factory=list)
    tags_confidence: float = Field(0.0, ge=0.0, le=1.0)
    chain_of_thought: str | None = Field(None, description="Reasoning")

# In metadata extraction service
response = await self.gemini_client.aio.models.generate_content(
    model='gemini-2.5-flash',
    contents=f"Extract metadata from this task:\n\n{task_text}",
    config=types.GenerateContentConfig(
        temperature=0.1,
        max_output_tokens=500,
        response_mime_type='application/json',
        response_schema=MetadataExtraction,  # Pydantic schema
        system_instruction=system_prompt,
    )
)

# Automatic parsing - no manual JSON parsing needed!
metadata = response.parsed  # Returns MetadataExtraction instance
```

**Benefits of Gemini Approach:**
- ✅ No manual JSON parsing
- ✅ Automatic validation via Pydantic
- ✅ Type-safe access to fields
- ✅ Built-in error handling for schema violations
- ✅ Better developer experience

---

## 11. Performance Comparison

| Metric | Ollama (llama3.2) | Gemini 2.5 Flash |
|--------|-------------------|------------------|
| Latency (avg) | 1-3 seconds | 0.5-1.5 seconds |
| Infrastructure | Self-hosted (Docker) | Cloud API (Google) |
| Rate Limits | None (local) | 10 RPM (free tier) |
| Cost | Server costs | $0.60/month (typical) |
| Reliability | Local network | 99.9% SLA (paid) |
| Maintenance | Manual updates | Managed by Google |
| Scalability | Limited by hardware | Auto-scaling |

---

## 12. Recommended Implementation Plan

### Phase 1: Development Setup (Week 1)

1. Install `google-genai` package
2. Create `gemini_client.py` with basic async support
3. Add `GEMINI_API_KEY` to `.env` (local development)
4. Test basic content generation
5. Test structured output with Pydantic

### Phase 2: Integration (Week 2)

1. Update `enrichment_service.py` to use Gemini
2. Update `metadata_extraction.py` with Pydantic schemas
3. Add error handling and retry logic
4. Update unit tests with Gemini mocks
5. Update integration tests

### Phase 3: Testing & Validation (Week 3)

1. Test rate limiting behavior (free tier)
2. Measure latency vs. Ollama
3. Validate structured output quality
4. Test error scenarios (429, 500, etc.)
5. Load testing with concurrent requests

### Phase 4: Production Deployment (Week 4)

1. Add `GEMINI_API_KEY` to production environment
2. Update `docker-compose.yml` for production
3. Monitor API usage and costs
4. Set up logging and alerting
5. Document migration in CLAUDE.md

---

## 13. Environment Variables Summary

### Required

```bash
# API Authentication
GEMINI_API_KEY=your-api-key-here  # Get from https://aistudio.google.com/
```

### Optional (with defaults)

```bash
# Model Configuration
GEMINI_MODEL=gemini-2.5-flash          # Model to use
GEMINI_TIMEOUT=20.0                    # Request timeout (seconds)
GEMINI_TEMPERATURE=0.3                 # Sampling temperature (0.0-1.0)
GEMINI_MAX_TOKENS=500                  # Max output tokens

# Retry Configuration
GEMINI_MAX_RETRIES=3                   # Max retry attempts
GEMINI_INITIAL_DELAY=1.0               # Initial retry delay (seconds)
GEMINI_MAX_DELAY=60.0                  # Max retry delay (seconds)
```

### Docker Compose Example

```yaml
services:
  backend:
    environment:
      # Required
      - GEMINI_API_KEY=${GEMINI_API_KEY}

      # Optional (override defaults)
      - GEMINI_MODEL=gemini-2.5-flash
      - GEMINI_TIMEOUT=20.0
      - GEMINI_TEMPERATURE=0.3
      - GEMINI_MAX_TOKENS=500
```

---

## 14. Additional Resources

### Official Documentation

- **Google Gen AI SDK:** https://googleapis.github.io/python-genai/
- **Gemini API Docs:** https://ai.google.dev/gemini-api/docs
- **API Key Management:** https://aistudio.google.com/app/apikey
- **Rate Limits:** https://ai.google.dev/gemini-api/docs/rate-limits
- **Pricing:** https://ai.google.dev/gemini-api/docs/pricing

### Code Examples

- **GitHub Repository:** https://github.com/googleapis/python-genai
- **Cookbook:** https://github.com/google-gemini/cookbook

### Community

- **Stack Overflow:** Tag `google-gemini`
- **Google AI Forum:** https://discuss.ai.google.dev/

---

## 15. Conclusion

### Recommendation: Proceed with Gemini Integration

**Pros:**
- ✅ Faster response times (0.5-1.5s vs 1-3s)
- ✅ Native structured output with Pydantic
- ✅ No infrastructure maintenance
- ✅ Auto-scaling and high availability
- ✅ Cost-effective ($0.60/month typical usage)
- ✅ Full async support
- ✅ Built-in retry with exponential backoff

**Cons:**
- ⚠️ Rate limits on free tier (10 RPM for gemini-2.5-flash)
- ⚠️ Requires internet connectivity
- ⚠️ API key management required
- ⚠️ Vendor lock-in to Google

### Next Steps

1. **Approve migration plan** (review with team)
2. **Obtain API key** from Google AI Studio
3. **Create `gemini_client.py`** following reference implementation
4. **Update services** to use Gemini client
5. **Test thoroughly** with rate limiting scenarios
6. **Deploy to production** with monitoring

**Estimated Timeline:** 3-4 weeks for complete migration

**Estimated Cost:** ~$0.60-$5/month depending on usage (free tier may suffice for development)

---

**Document Version:** 1.0
**Last Updated:** December 26, 2025
**Author:** Research conducted for task_master project
