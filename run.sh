#!/usr/bin/env bash
# Alternative start script that can be used if start.sh has permission issues
# This script can be executed directly: bash run.sh

cd "$(dirname "$0")" || exit 1

echo "🚀 Starting Prime Bot Website..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Make sure to set your environment variables."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "✅ Starting server..."
exec node index.js


