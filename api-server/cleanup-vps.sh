#!/bin/bash
# VPS Cleanup and Organization Script
# Run this to clean up and organize files on your VPS

set -e

API_DIR="/opt/auth-api"
UPDATES_DIR="$API_DIR/updates"
LOGS_DIR="$API_DIR/logs"
BACKUPS_DIR="$API_DIR/backups"

echo "🧹 Starting VPS cleanup and organization..."

# Create organized directory structure
echo "📁 Creating organized directory structure..."
mkdir -p "$UPDATES_DIR"
mkdir -p "$LOGS_DIR"
mkdir -p "$BACKUPS_DIR"

# Navigate to API directory
cd "$API_DIR/api-server" || exit 1

# Handle git repo structure - if files are in api-server/ subfolder, move them up
if [ -d "api-server" ] && [ -f "api-server/server.js" ]; then
    echo "🔄 Moving files from nested api-server folder to root..."
    # Move all files from api-server/ to current directory
    mv api-server/* . 2>/dev/null || true
    mv api-server/.* . 2>/dev/null || true
    # Remove empty api-server folder
    rmdir api-server 2>/dev/null || true
    echo "✅ Files moved to correct location"
fi

# Clean up any remaining nested api-server folders
if [ -d "api-server" ] && [ ! -f "api-server/server.js" ]; then
    echo "🧹 Cleaning up empty nested api-server folder..."
    rm -rf api-server
fi

# Clean up old files
echo "🧹 Cleaning up old files..."
# Remove backup files
find . -maxdepth 2 -name "*.bak" -o -name "*.old" -o -name "*.tmp" | xargs rm -f 2>/dev/null || true

# Remove old log files (keep last 7 days)
find . -maxdepth 2 -name "*.log" -mtime +7 -delete 2>/dev/null || true

# Move old logs to logs directory
if [ -f "api.log" ]; then
    mv api.log "$LOGS_DIR/api-$(date +%Y%m%d).log" 2>/dev/null || true
fi

# Clean up node_modules if corrupted
if [ -d "node_modules" ] && [ ! -f "node_modules/.package-lock.json" ]; then
    echo "🔧 Reinstalling node_modules..."
    rm -rf node_modules
    npm install --production
fi

# Clean up old database backups (keep last 5)
if [ -d "$BACKUPS_DIR" ]; then
    ls -t "$BACKUPS_DIR"/*.db 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
fi

# Organize update files
echo "📦 Organizing update files..."
if [ -d "updates" ]; then
    mv updates/* "$UPDATES_DIR/" 2>/dev/null || true
    rmdir updates 2>/dev/null || true
fi

# Remove any duplicate or test files
echo "🗑️  Removing test and duplicate files..."
find . -maxdepth 1 -name "test*" -o -name "*test*" -o -name "*.test.js" | grep -v node_modules | xargs rm -f 2>/dev/null || true

# Clean up git files if not needed (optional - comment out if you want to keep git)
# echo "🗑️  Cleaning up .git files..."
# rm -rf .git 2>/dev/null || true

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod 644 server.js package.json 2>/dev/null || true
chmod 755 . 2>/dev/null || true

# Show disk usage
echo ""
echo "📊 Disk usage:"
du -sh "$API_DIR"/* 2>/dev/null | sort -h

echo ""
echo "✅ Cleanup complete!"
echo "📁 Organized structure:"
echo "   - API Server: $API_DIR/api-server"
echo "   - Updates: $UPDATES_DIR"
echo "   - Logs: $LOGS_DIR"
echo "   - Backups: $BACKUPS_DIR"

