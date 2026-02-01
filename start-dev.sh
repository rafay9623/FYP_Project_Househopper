#!/bin/bash

# Function to start a process in a new Terminal tab
start_in_new_tab() {
    local cmd="$1"
    local title="$2"
    osascript -e "tell application \"Terminal\" to do script \"cd $(pwd); $cmd\""
}

echo "Starting HouseHopper Development Servers..."
echo "---------------------"

# Start Backend
echo "Starting Backend Server..."
echo "---------------------"
cd backend
if [ -f "package.json" ]; then
    start_in_new_tab "cd backend && npm run dev" "HouseHopper Backend"
else
    echo "Error: backend/package.json not found!"
fi
cd ..
echo "---------------------"

# Start Frontend
echo "Starting Frontend Server..."
echo "---------------------"
cd frontend
if [ -f "package.json" ]; then
    start_in_new_tab "cd frontend && npm run dev" "HouseHopper Frontend"
else
    echo "Error: frontend/package.json not found!"
fi
cd ..
echo "---------------------"

echo "commands sent to new tabs!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
