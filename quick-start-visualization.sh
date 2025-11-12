#!/bin/bash

# Quick Start Script for Live DNS Resolution Visualization
# This script helps you quickly test the new visualization feature

echo "=================================================="
echo "🚀 Live DNS Resolution Visualization - Quick Start"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Step 1: Installing dependencies..."
echo ""

# Install backend dependencies
echo "🔧 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "🔧 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

echo "=================================================="
echo "🎉 Setup Complete! Now you can start the app:"
echo "=================================================="
echo ""
echo "Option 1: Use Docker Compose (Recommended)"
echo "  docker-compose up"
echo ""
echo "Option 2: Start services manually"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend"
echo "    npm start"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "=================================================="
echo "📖 How to Use the Visualization:"
echo "=================================================="
echo ""
echo "1. Open browser: http://localhost:5173"
echo "2. Toggle 'Live DNS Mode' in config panel"
echo "3. Enter a domain (e.g., google.com)"
echo "4. Click 'Resolve'"
echo "5. See the visualization appear!"
echo ""
echo "🎓 Try These Domains:"
echo "  - example.com (simple, fast)"
echo "  - google.com (usually clean)"
echo "  - github.com (may show DNSSEC)"
echo "  - cloudflare.com (DNSSEC enabled)"
echo ""
echo "🔍 Features to Try:"
echo "  - Click 'Expand All' to see everything"
echo "  - Use filters: All, Failures, Success, DNSSEC"
echo "  - Toggle explanations ON/OFF"
echo "  - Click individual steps to expand"
echo ""
echo "📚 Documentation:"
echo "  - COMPLETE_IMPLEMENTATION.md - Full overview"
echo "  - QUICK_USER_GUIDE_LIVE_VIZ.md - User guide"
echo "  - LIVE_RESOLUTION_VISUALIZATION.md - Technical docs"
echo ""
echo "=================================================="
echo "Happy DNS Learning! 🌐📚"
echo "=================================================="
