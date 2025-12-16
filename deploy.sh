#!/bin/bash

# Task Master - Deployment Script
# Deploys Task Master to production VPS

set -e  # Exit on error

echo "========================================="
echo "Task Master Deployment"
echo "========================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production not found!"
    echo ""
    echo "Please create it from the template:"
    echo "  cp .env.production.example .env.production"
    echo "  nano .env.production  # Edit YOUR_VPS_IP"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.production | xargs)

echo "📦 Current deployment configuration:"
echo "  - Ollama Model: $OLLAMA_MODEL"
echo "  - API Base URL: $VITE_API_BASE_URL"
echo "  - Timeout: $OLLAMA_TIMEOUT seconds"
echo ""

# Ask for confirmation
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🛑 Stopping existing containers..."
sudo docker compose -f docker-compose.prod.yml --env-file .env.production down || true

echo ""
echo "🏗️  Building Docker images..."
sudo docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

echo ""
echo "🚀 Starting services..."
sudo docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Wait for backend health check
echo "   Checking backend..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "   ✅ Backend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ Backend health check failed"
        echo ""
        echo "Check logs with: sudo docker compose -f docker-compose.prod.yml logs backend"
        exit 1
    fi
    sleep 2
done

# Check if Ollama model is loaded
echo "   Checking Ollama..."
for i in {1..60}; do
    if sudo docker compose -f docker-compose.prod.yml exec -T ollama ollama list 2>/dev/null | grep -q llama3.2; then
        echo "   ✅ Ollama model loaded"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "   ⚠️  Ollama model still loading (this is normal on first run)"
        echo "   Monitor with: sudo docker compose -f docker-compose.prod.yml logs -f ollama-init"
    fi
    sleep 2
done

echo ""
echo "📊 Container Status:"
sudo docker compose -f docker-compose.prod.yml ps

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://$(curl -s ifconfig.me):3000"
echo "   Backend:  http://$(curl -s ifconfig.me):8000"
echo "   Health:   http://$(curl -s ifconfig.me):8000/health"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:        sudo docker compose -f docker-compose.prod.yml logs -f"
echo "   View backend:     sudo docker compose -f docker-compose.prod.yml logs -f backend"
echo "   View status:      sudo docker compose -f docker-compose.prod.yml ps"
echo "   Stop services:    sudo docker compose -f docker-compose.prod.yml down"
echo "   Restart:          bash deploy.sh"
echo ""
echo "💾 Database location: Docker volume 'db_data'"
echo "📁 Ollama models:     Docker volume 'ollama_data'"
echo ""
echo "⚠️  First enrichment will be slow (~30s) while Ollama loads the model"
echo "    Subsequent enrichments will be faster (~3-5s)"
echo ""
