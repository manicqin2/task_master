#!/bin/bash

# Task Master - VPS Setup Script
# This script prepares a fresh Ubuntu VPS for Task Master deployment
# Tested on: Ubuntu 22.04 LTS

set -e  # Exit on error

echo "========================================="
echo "Task Master VPS Setup"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use: sudo bash setup-vps.sh)"
    exit 1
fi

echo "📦 Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

echo ""
echo "🔧 Installing required packages..."
apt-get install -y -qq \
    curl \
    git \
    ufw \
    htop \
    ca-certificates \
    gnupg \
    lsb-release

echo ""
echo "🐳 Installing Docker..."

# Remove old Docker versions if they exist
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo ""
echo "✅ Docker installed successfully!"
docker --version
docker compose version

echo ""
echo "🔥 Configuring firewall (UFW)..."

# Reset UFW to defaults
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT: Don't lock yourself out!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS (for future nginx setup if needed)
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow Task Master ports
ufw allow 3000/tcp comment 'Task Master Frontend'
ufw allow 8000/tcp comment 'Task Master Backend'

# Enable firewall
ufw --force enable

echo ""
echo "✅ Firewall configured!"
ufw status

echo ""
echo "💾 Configuring swap space (2GB for VPS 1 memory buffer)..."

# Check if swap already exists
if [ -f /swapfile ]; then
    echo "⚠️  Swap file already exists, skipping..."
else
    # Create 2GB swap file
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make swap permanent
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Optimize swap usage (less aggressive)
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    
    echo "✅ Swap configured!"
fi

free -h

echo ""
echo "👤 Creating non-root user for deployment..."
read -p "Enter username for deployment (default: taskmaster): " DEPLOY_USER
DEPLOY_USER=${DEPLOY_USER:-taskmaster}

# Check if user exists
if id "$DEPLOY_USER" &>/dev/null; then
    echo "⚠️  User $DEPLOY_USER already exists, skipping creation..."
else
    # Create user
    adduser $DEPLOY_USER
    
    # Add to sudo group (wheel for AlmaLinux/CentOS, sudo for Debian/Ubuntu)
    if [ -f /etc/redhat-release ]; then
        usermod -aG wheel $DEPLOY_USER
    else
        usermod -aG sudo $DEPLOY_USER
    fi
    
    # Add to docker group
    usermod -aG docker $DEPLOY_USER
    
    echo "✅ User $DEPLOY_USER created and added to sudo/docker groups"
    echo "⚠️  Set password for $DEPLOY_USER:"
    passwd $DEPLOY_USER
fi

echo ""
echo "📁 Creating application directory..."
mkdir -p /opt/taskmaster
chown -R $DEPLOY_USER:$DEPLOY_USER /opt/taskmaster
cd /opt/taskmaster

echo ""
echo "========================================="
echo "✅ VPS Setup Complete!"
echo "========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Clone your repository:"
echo "   cd /opt/taskmaster"
echo "   git clone YOUR_REPO_URL ."
echo ""
echo "2. Copy and configure environment:"
echo "   cp .env.production.example .env.production"
echo "   nano .env.production  # Update YOUR_VPS_IP"
echo ""
echo "3. Run deployment:"
echo "   bash deploy.sh"
echo ""
echo "📊 System Status:"
echo "   - Docker: $(docker --version | cut -d' ' -f3)"
echo "   - Compose: $(docker compose version | cut -d' ' -f4)"
echo "   - Firewall: Active (ports 22, 80, 443, 3000, 8000 open)"
echo "   - Swap: 2GB configured"
echo ""
echo "🌐 Access your app at:"
echo "   http://$(curl -s ifconfig.me):3000"
echo ""
