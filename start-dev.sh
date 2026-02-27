#!/bin/bash

# Function to start a process in a new Terminal tab
start_in_new_tab() {
    local cmd="$1"
    # Escape backslashes and double quotes for AppleScript string
    local escaped_cmd="${cmd//\\/\\\\}"
    escaped_cmd="${escaped_cmd//\"/\\\"}"
    osascript -e "tell application \"Terminal\" to do script \"$escaped_cmd\""
}

# Resolve script directory to handle running from anywhere
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Starting HouseHopper Development Servers..."
echo "Project Root: $DIR"
echo "---------------------"

# Start Backend
echo "Starting Backend Server..."
if [ -f "$DIR/backend/package.json" ]; then
    start_in_new_tab "cd \"$DIR/backend\" && echo 'Starting Backend...' && npm run dev"
else
    echo "Error: backend/package.json not found in $DIR/backend"
fi
echo "---------------------"

# Start Frontend
echo "Starting Frontend Server..."
if [ -f "$DIR/frontend/package.json" ]; then
    start_in_new_tab "cd \"$DIR/frontend\" && echo 'Starting Frontend...' && npm run dev"
else
    echo "Error: frontend/package.json not found in $DIR/frontend"
fi
echo "---------------------"

echo "Sent start commands to new tabs!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
