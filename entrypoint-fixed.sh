#!/bin/bash
# Fixed entrypoint that solves permission denied issues
# Use this if the default entrypoint.sh doesn't work

# Ensure we're in the right directory
cd "$(dirname "$0")" || exit 1

echo "🚀 Starting Prime Bot Website..."

# ALWAYS use bash to execute scripts (avoids permission issues)
if [ -f start.sh ]; then
    echo "✅ Executing start.sh with bash..."
    exec bash start.sh
elif [ -f start ]; then
    echo "✅ Executing start wrapper with bash..."
    exec bash start
elif [ -f index.js ]; then
    echo "✅ Running node index.js directly..."
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo "⚠️  Warning: .env file not found."
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    exec node index.js
else
    echo "❌ Error: Could not find start.sh, start, or index.js"
    exit 1
fi

