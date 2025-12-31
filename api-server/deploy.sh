#!/bin/bash
# Auto-deployment script for VPS
# This script pulls latest code and restarts the API server

set -e  # Exit on error

# Configuration - CHANGE THESE PATHS
API_DIR="/path/to/your/api-server"  # ← CHANGE THIS to your VPS API path
BRANCH="main"  # Your git branch name

echo "🚀 Starting deployment..."

# Navigate to API directory
cd "$API_DIR" || exit 1

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git fetch origin
git reset --hard origin/$BRANCH
git pull origin $BRANCH

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install --production

# Restart API server
echo "🔄 Restarting API server..."

# Option 1: Using PM2 (recommended)
if command -v pm2 &> /dev/null; then
    pm2 restart auth-api || pm2 start server.js --name auth-api
    echo "✅ API server restarted using PM2"
    
# Option 2: Using systemd
elif systemctl is-active --quiet auth-api; then
    sudo systemctl restart auth-api
    echo "✅ API server restarted using systemd"
    
# Option 3: Using screen
elif screen -list | grep -q "api"; then
    screen -S api -X stuff "npm start$(printf \\r)"
    echo "✅ API server restarted using screen"
    
# Option 4: Kill and restart manually
else
    # Kill existing process if running
    pkill -f "node.*server.js" || true
    sleep 2
    
    # Start new process in background
    nohup node server.js > api.log 2>&1 &
    echo "✅ API server restarted manually"
fi

echo "✅ Deployment complete!"
echo "📊 Server status:"
pm2 list 2>/dev/null || systemctl status auth-api 2>/dev/null || echo "Check logs manually"

