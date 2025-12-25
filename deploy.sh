#!/bin/bash

# Task Master - Unified Deployment Script
# Works for both development and production environments

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() { echo -e "${BLUE}$1${NC}"; }
print_success() { echo -e "${GREEN}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }

# Detect environment
ENVIRONMENT="${1:-development}"

if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    print_error "❌ Invalid environment: $ENVIRONMENT"
    echo ""
    echo "Usage: bash deploy.sh [development|production]"
    echo ""
    echo "Examples:"
    echo "  bash deploy.sh development  # Deploy locally for development"
    echo "  bash deploy.sh production   # Deploy to production"
    echo ""
    exit 1
fi

echo "========================================="
ENV_UPPER=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
print_info "Task Master Deployment - $ENV_UPPER"
echo "========================================="
echo ""

# Set environment-specific variables
if [ "$ENVIRONMENT" = "production" ]; then
    ENV_FILE=".env.production"
    COMPOSE_FILE="docker/docker-compose.prod.yml"
    USE_SUDO="sudo"
    BUILD_NO_CACHE="--no-cache"
else
    ENV_FILE=".env.development"
    COMPOSE_FILE="docker/docker-compose.yml"
    USE_SUDO=""
    BUILD_NO_CACHE=""
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error "❌ Error: $ENV_FILE not found!"
    echo ""
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Please create it from the template:"
        echo "  cp .env.production.example .env.production"
        echo "  nano .env.production  # Edit YOUR_VPS_IP"
    else
        print_info "Creating default development environment file..."
        cat > .env.development <<EOF
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT=120
DATABASE_URL=sqlite+aiosqlite:///./data/tasks.db
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_POLLING_INTERVAL=500
ENVIRONMENT=development
EOF
        print_success "✅ Created .env.development"
    fi
fi

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Display configuration
print_info "📦 Current deployment configuration:"
echo "  - Environment:     $ENVIRONMENT"
echo "  - Compose File:    $COMPOSE_FILE"
echo "  - Env File:        $ENV_FILE"
echo "  - Ollama Model:    ${OLLAMA_MODEL:-llama3.2}"
echo "  - API Base URL:    ${VITE_API_BASE_URL:-http://localhost:8000/api/v1}"
echo "  - Use sudo:        $([ -n "$USE_SUDO" ] && echo "Yes" || echo "No")"
echo ""

# Ask for confirmation
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "❌ Deployment cancelled"
    exit 1
fi

echo ""
print_info "🛑 Stopping existing containers..."
$USE_SUDO docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down || true

echo ""
print_info "🏗️  Building Docker images..."
$USE_SUDO docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build $BUILD_NO_CACHE

echo ""
print_info "🚀 Starting services..."
$USE_SUDO docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo ""
print_info "⏳ Waiting for services to be healthy..."
sleep 10

# Wait for backend health check
print_info "   Checking backend..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        print_success "   ✅ Backend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "   ❌ Backend health check failed"
        echo ""
        print_warning "Check logs with:"
        if [ "$ENVIRONMENT" = "production" ]; then
            echo "   $USE_SUDO docker compose -f $COMPOSE_FILE logs backend"
            echo "   $USE_SUDO docker logs taskmaster-backend-prod"
        else
            echo "   docker compose -f $COMPOSE_FILE logs backend"
            echo "   docker logs task_master-backend"
        fi
        exit 1
    fi
    sleep 2
done

# Check if Ollama model is loaded
print_info "   Checking Ollama..."
for i in {1..60}; do
    if $USE_SUDO docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T ollama ollama list 2>/dev/null | grep -q llama3.2; then
        print_success "   ✅ Ollama model loaded"
        break
    fi
    if [ $i -eq 60 ]; then
        print_warning "   ⚠️  Ollama model still loading (this is normal on first run)"
        print_warning "   Monitor with: $USE_SUDO docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f ollama-init"
    fi
    sleep 2
done

echo ""
print_info "📊 Container Status:"
$USE_SUDO docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "========================================="
print_success "✅ Deployment Complete!"
echo "========================================="
echo ""

# Environment-specific URLs
if [ "$ENVIRONMENT" = "production" ]; then
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    print_info "🌐 Access your application:"
    echo "   Frontend: http://${PUBLIC_IP}:3000"
    echo "   Backend:  http://${PUBLIC_IP}:8000"
    echo "   Health:   http://${PUBLIC_IP}:8000/health"
else
    print_info "🌐 Access your application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8000"
    echo "   Health:   http://localhost:8000/health"
fi

echo ""
print_info "📋 Useful Commands:"
echo "   View logs:        $USE_SUDO docker compose -f $COMPOSE_FILE logs -f"
echo "   View backend:     $USE_SUDO docker compose -f $COMPOSE_FILE logs -f backend"
echo "   View status:      $USE_SUDO docker compose -f $COMPOSE_FILE ps"
echo "   Stop services:    $USE_SUDO docker compose -f $COMPOSE_FILE down"
echo "   Restart:          bash deploy.sh $ENVIRONMENT"
echo ""
print_info "💾 Database location: Docker volume 'db_data'"
print_info "📁 Ollama models:     Docker volume 'ollama_data'"
echo ""

if [ "$ENVIRONMENT" = "development" ]; then
    print_warning "⚡ Development mode active:"
    echo "   - Hot reload enabled (code changes auto-restart)"
    echo "   - Source code mounted as volumes"
fi

print_warning "⚠️  First enrichment will be slow (~30s) while Ollama loads the model"
echo "    Subsequent enrichments will be faster (~3-5s)"
echo ""
