#!/usr/bin/env bash
# Start script for Prime Bot Website
# This script starts the Node.js server

# Ensure we're in the right directory
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

