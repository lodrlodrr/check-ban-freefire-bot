#!/bin/bash
# Entrypoint script for Pterodactyl and other containerized environments
# This script handles permission issues and starts the application

# Ensure we're in the right directory
cd "$(dirname "$0")" || exit 1

echo "🚀 Starting Prime Bot Website..."
echo "📁 Working directory: $(pwd)"

# Method 1: Try to use bash start.sh directly (doesn't require execute permissions)
if [ -f start.sh ]; then
    echo "✅ Found start.sh, executing with bash..."
    exec bash start.sh
fi

# Method 2: If start.sh doesn't exist, try start (the wrapper script)
if [ -f start ]; then
    echo "✅ Found start wrapper, executing with bash..."
    exec bash start
fi

# Method 3: Fallback - run node directly
if [ -f index.js ]; then
    echo "⚠️  start.sh not found, running node directly..."
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo "⚠️  Warning: .env file not found. Make sure to set your environment variables."
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    echo "✅ Starting server..."
    exec node index.js
fi

# If nothing works, show error
echo "❌ Error: Could not find start.sh, start, or index.js"
echo "📁 Current directory contents:"
ls -la
exit 1

