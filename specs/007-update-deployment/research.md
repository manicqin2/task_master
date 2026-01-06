# Research: Deployment Script Best Practices for API Key Validation

**Feature**: 007-update-deployment
**Date**: 2026-01-06
**Context**: Migrating deploy.sh from Ollama (local service) to Gemini API (cloud service)

## Research Questions

### 1. What are best practices for validating API keys in bash scripts?

**Decision**: Use multi-layered validation approach

**Validation Layers**:

1. **Presence Check**:
```bash
if [ -z "$GEMINI_API_KEY" ]; then
    print_error "❌ GEMINI_API_KEY environment variable is not set"
    print_info "Get your API key from: https://aistudio.google.com/"
    exit 1
fi
```

2. **Format Validation** (optional but recommended):
```bash
if [[ ! "$GEMINI_API_KEY" =~ ^AIza[A-Za-z0-9_-]{35}$ ]]; then
    print_warning "⚠️  GEMINI_API_KEY format appears invalid (should start with 'AIza')"
    print_info "Proceeding anyway - will fail on first API call if invalid"
fi
```

3. **Runtime Validation**:
   - Let backend health check validate API key by making actual API call
   - If health check fails, API key is invalid or quota exceeded
   - No need for separate API key test in deployment script

**Rationale**:
- Presence check prevents cryptic errors later
- Format check catches obvious typos but doesn't guarantee validity
- Runtime validation via backend health check is most reliable
- Over-validation in deployment script adds complexity without benefit

**Alternatives Considered**:
- ❌ Test API call in deployment script: Adds dependency on curl, requires knowledge of Gemini API endpoints, slows deployment
- ❌ No validation: Users get cryptic errors when backend fails to start
- ✅ **Selected approach**: Presence + optional format + backend health check (balanced)

---

### 2. How should deployment scripts provide actionable error messages for missing configuration?

**Decision**: Follow user-first error messaging pattern

**Error Message Template**:
```bash
print_error "❌ Error: GEMINI_API_KEY not found in $ENV_FILE"
echo ""
print_info "📝 To fix this:"
echo "  1. Visit: https://aistudio.google.com/app/apikey"
echo "  2. Create or copy your API key"
echo "  3. Add to $ENV_FILE:"
echo "     GEMINI_API_KEY=your_api_key_here"
echo ""
print_info "💡 Tip: Use .env.production.example as a template"
```

**Best Practices Applied**:
- ✅ Clear problem statement (what's missing)
- ✅ Numbered steps to resolve
- ✅ Direct link to solution (API key creation)
- ✅ Example command/content
- ✅ Additional context (template file reference)

**Rationale**:
- Users should never need to search documentation to fix deployment errors
- Actionable steps > vague error messages
- Links directly to solution save time

**Alternatives Considered**:
- ❌ Generic "Missing config" error: Frustrating, requires googling
- ❌ Auto-create API key: Impossible (requires Google account auth)
- ✅ **Selected approach**: Step-by-step guidance with direct links

---

### 3. What health check patterns work best for cloud API dependencies (vs. local services)?

**Decision**: Simplify health checks - remove polling for cloud services

**Ollama Pattern (OLD - for local services)**:
```bash
# Wait up to 2 minutes for Ollama model to load
for i in {1..60}; do
    if docker exec ollama ollama list | grep -q llama3.2; then
        print_success "✅ Ollama model loaded"
        break
    fi
    sleep 2
done
```

**Gemini Pattern (NEW - for cloud APIs)**:
```bash
# Backend health check validates Gemini integration
# No separate API check needed - cloud services are assumed available
print_info "   Checking backend (includes Gemini validation)..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        print_success "   ✅ Backend healthy (Gemini configured correctly)"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "   ❌ Backend health check failed"
        print_warning "   Check GEMINI_API_KEY validity"
    fi
    sleep 2
done
```

**Key Differences**:
- Ollama: Poll for model loading (2min wait, model download time)
- Gemini: Trust cloud availability, validate via backend health endpoint
- Timeout: 60s (Ollama) → 30s (Gemini) due to faster startup

**Rationale**:
- Cloud APIs (Gemini) are externally managed - no need to wait for "readiness"
- If Gemini API is down, it's Google's problem (very rare, SLA-backed)
- Backend health check implicitly validates Gemini connectivity
- Removing Ollama polling reduces deployment time by ~90 seconds

**Alternatives Considered**:
- ❌ Test Gemini API directly from deploy.sh: Duplicates backend validation, adds script complexity
- ❌ Keep Ollama-style polling: Unnecessary for cloud APIs, wastes time
- ✅ **Selected approach**: Backend health check only (fast, reliable)

---

### 4. How to handle environment file auto-creation securely?

**Decision**: Auto-create development env with placeholder, require manual production setup

**Development (.env.development) - Auto-create**:
```bash
if [ ! -f ".env.development" ]; then
    print_info "Creating default .env.development..."
    cat > .env.development <<EOF
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT=15.0
GEMINI_MAX_RETRIES=3

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/tasks.db

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_POLLING_INTERVAL=500

# Environment
ENVIRONMENT=development
EOF
    print_success "✅ Created .env.development with default values"
    print_warning "⚠️  IMPORTANT: Update GEMINI_API_KEY with your actual API key"
fi
```

**Production (.env.production) - Manual required**:
```bash
if [ ! -f ".env.production" ]; then
    print_error "❌ Error: .env.production not found!"
    echo ""
    print_info "📝 Create it from the template:"
    echo "  cp .env.production.example .env.production"
    echo "  nano .env.production  # Update GEMINI_API_KEY and VPS IP"
    exit 1
fi
```

**Security Considerations**:

| Environment | Auto-create? | Reason |
|-------------|--------------|--------|
| **Development** | ✅ Yes (with placeholder) | Low risk - local only, placeholder forces user to set real key |
| **Production** | ❌ No (error + instructions) | High risk - prevents accidental deployment with defaults, forces deliberate setup |

**Rationale**:
- Development: Convenience > security (localhost only, no production data)
- Production: Security > convenience (explicit setup prevents accidental misconfiguration)
- Placeholder API key (`your_gemini_api_key_here`) is obviously invalid, forces user action
- Production requires manual file creation to ensure administrator reviews all settings

**Alternatives Considered**:
- ❌ Auto-create both: Dangerous - could deploy production with insecure defaults
- ❌ Never auto-create: Frustrating developer experience for local testing
- ✅ **Selected approach**: Auto-create dev only, block production (balanced security/UX)

---

## Summary of Decisions

### Changes to deploy.sh

**Add** (new validations):
- GEMINI_API_KEY presence check with helpful error message
- Optional GEMINI_API_KEY format validation (warning only)
- Update .env.development auto-creation template with Gemini variables

**Remove** (Ollama-specific):
- OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT references
- Ollama model loading health check loop (lines 142-154)
- ollama-init container references in troubleshooting output
- ollama_data volume references in deployment summary

**Update** (messaging):
- Configuration display: Show GEMINI_MODEL instead of OLLAMA_MODEL
- Health check messages: Reference backend validation instead of Ollama loading
- Post-deployment tips: Mention Gemini latency (~1-2s) instead of model loading wait
- Error guidance: Point to https://aistudio.google.com/ for API keys

### Implementation Notes

**Complexity**: LOW
- All changes are find/replace + message updates
- No new infrastructure or dependencies
- No breaking changes to existing deployments

**Testing Strategy**:
1. Test development deployment with missing GEMINI_API_KEY (expect clear error)
2. Test development deployment with valid GEMINI_API_KEY (expect success)
3. Test production deployment validation (expect error if .env.production missing)
4. Verify all Ollama references removed from script output
5. Confirm deployment time <3 minutes (vs. 5+ with Ollama)

**Risk Mitigation**:
- Keep original deploy.sh as deploy.sh.bak before changes
- Test in development environment first
- Verify existing production .env.production files work unchanged
- Deployment script changes are isolated from application code

---

## References

- Feature 006 spec: Gemini migration architecture decisions
- docker-compose.yml: Current service configuration (Ollama removed)
- CLAUDE.md: Project environment variable standards
