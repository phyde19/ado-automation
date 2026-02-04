#!/bin/bash
cd "$(dirname "$0")/backend"

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

echo "Starting backend on http://localhost:3001"
npm run dev
