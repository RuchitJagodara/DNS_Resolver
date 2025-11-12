#!/bin/bash

# DNS Simulator - Clean Rebuild Script
# This script ensures a completely fresh build without any Docker cache

echo "🔄 Starting clean rebuild process..."
echo ""

# Step 1: Stop all running containers
echo "📦 Stopping running containers..."
sudo docker-compose down
echo "✅ Containers stopped"
echo ""

# Step 2: Build with no cache
echo "🏗️  Building Docker images (no cache)..."
sudo docker-compose build --no-cache
echo "✅ Build complete"
echo ""

# Step 3: Start containers
echo "🚀 Starting fresh containers..."
sudo docker-compose up -d
echo "✅ Containers started"
echo ""

# Step 4: Show running containers
echo "📊 Running containers:"
sudo docker-compose ps
echo ""

# Step 5: Show logs
echo "📋 Container logs (last 20 lines):"
echo "--- Backend ---"
sudo docker-compose logs --tail=20 backend
echo ""
echo "--- Frontend ---"
sudo docker-compose logs --tail=20 frontend
echo ""

echo "✅ Rebuild complete!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:5001"
echo ""
echo "💡 Tip: Clear your browser cache (Ctrl+Shift+Delete) to see the latest changes"
echo "💡 Or use incognito/private mode for a fresh view"
