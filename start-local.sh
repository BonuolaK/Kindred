#!/bin/bash
echo "Starting Kindred in local development mode for Unix/Linux/Mac..."
echo "Using dirname polyfill for compatibility..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in your PATH."
    echo "Please install Node.js v18 or later from https://nodejs.org/"
    exit 1
fi

# Check for required dependencies
echo "Checking for required dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies (this may take a few minutes)..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error installing dependencies. Please run npm install manually."
        exit 1
    fi
fi

# Start the application with proper error handling
echo "Starting the application..."
node start-local.js
if [ $? -ne 0 ]; then
    echo "Application failed to start. See error message above."
    exit 1
fi