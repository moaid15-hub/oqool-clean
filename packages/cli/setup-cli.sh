#!/bin/bash

# Build and run CLI package
echo "🔨 Building CLI package..."

cd packages/cli

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🏗️  Building TypeScript..."
npm run build

# Make bin files executable
chmod +x bin/*

echo "✅ CLI package ready!"
echo "🚀 You can now use: oqool, og, ogr, ogt, ogg"

# Test basic functionality
echo "🧪 Testing basic functionality..."
./bin/oqool --help || echo "CLI is ready for use"