#!/bin/bash

# Parse command line arguments
HOST_MODE=false
if [ "$1" == "--host" ]; then
    HOST_MODE=true
fi

echo "🚀 Starting DNS Resolution Simulator..."

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Start backend
echo "📡 Starting backend server on port 5001..."
if [ "$HOST_MODE" = true ]; then
    HOST=0.0.0.0 node backend/src/server.js &
else
    node backend/src/server.js &
fi
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🌐 Starting frontend on port 3001..."
if [ "$HOST_MODE" = true ]; then
    cd frontend && npm run dev -- --host &
else
    cd frontend && npm run dev &
fi
FRONTEND_PID=$!

echo ""
echo "✅ DNS Resolution Simulator is running!"
echo ""
if [ "$HOST_MODE" = true ]; then
    echo "📊 Frontend: http://localhost:3001 or http://$LOCAL_IP:3001"
    echo "🔧 Backend API: http://localhost:5001 or http://$LOCAL_IP:5001"
    echo "🌍 Network mode enabled - accessible from other devices on the network"
else
    echo "📊 Frontend: http://localhost:3001"
    echo "🔧 Backend API: http://localhost:5001"
fi
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

wait

