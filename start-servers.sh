#!/bin/bash

# HouseHoppers - Performance Bootstrapper (Shell Version)
# Converted from start-servers.ps1

clear
echo "==============================================="
echo "   HouseHoppers - Performance Bootstrapper     "
echo "==============================================="

# Resolve script directory to handle running from anywhere
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -i :$port >/dev/null 2>&1
    elif command -v netstat >/dev/null 2>&1; then
        # Support both Windows netstat and Linux netstat
        netstat -ano 2>/dev/null | grep -q ":$port " || netstat -tuln 2>/dev/null | grep -q ":$port "
    else
        # If neither exists, assume it's free
        return 1
    fi
}

# Cleanup on exit
trap "echo -e '\nStopping all services...'; kill 0" EXIT

# 1. ML Recommendation Service
echo "[1/3] Initializing ML Discovery Engine..."
if check_port 5001; then
    echo "⚠️ Port 5001 already in use. Skipping start."
else
    # Support both Windows (Git Bash) and Linux (WSL) virtual env structures
    if [ -f "$DIR/ml/.venv/Scripts/python" ]; then
        VENV_PYTHON="$DIR/ml/.venv/Scripts/python"
    elif [ -f "$DIR/ml/.venv/bin/python" ]; then
        VENV_PYTHON="$DIR/ml/.venv/bin/python"
    else
        VENV_PYTHON="python"
        echo "⚠️ .venv not found in /ml, falling back to system python."
    fi
    
    (cd "$DIR/ml" && "$VENV_PYTHON" -m uvicorn app:app --port 5001) &
fi

# 2. Backend Server
echo "[2/3] Booting Optimized Backend (with Cache)..."
if check_port 3001; then
    echo "⚠️ Port 3001 already in use. Skipping start."
else
    (cd "$DIR/backend" && npm run dev) &
fi

# 3. Frontend Server
echo "[3/3] Launching Optimized Frontend..."
if check_port 5173; then
    echo "⚠️ Port 5173 already in use. Skipping start."
else
    (cd "$DIR/frontend" && npm run dev) &
fi

echo -e "\n🚀 ALL SERVICES INITIALIZED"
echo "-----------------------------------------------"
echo "ML Service:    http://localhost:5001"
echo "Backend API:   http://localhost:3001"
echo "Frontend UI:   http://localhost:5173"
echo "-----------------------------------------------"
echo "System is running in background."
echo "Press Ctrl+C to shutdown all processes."

# Wait for background processes to keep script alive
wait
