#!/usr/bin/env node

/**
 * Setup and Run Script for Prime Bot Website
 * This script helps you set up and run the website with full functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// Function to check if npm is available
function isNpmAvailable() {
  try {
    execSync('npm --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to check if dependencies are installed
function areDependenciesInstalled() {
  return fs.existsSync(path.join(__dirname, 'node_modules'));
}

// Function to create .env file if it doesn't exist
function createEnvFile() {
  const envExamplePath = path.join(__dirname, '.env.example');
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('Creating .env file from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created. Please update it with your Discord credentials.');
  }
}

// Function to install dependencies
function installDependencies() {
  console.log('Installing dependencies...');
  return new Promise((resolve, reject) => {
    const install = spawn('npm', ['install'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    install.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Dependencies installed successfully');
        resolve();
      } else {
        console.error('❌ Failed to install dependencies');
        reject(new Error(`npm install exited with code ${code}`));
      }
    });
    
    install.on('error', (error) => {
      console.error('❌ Failed to start npm install:', error.message);
      reject(error);
    });
  });
}

// Function to start the full server
function startFullServer() {
  console.log('Starting the full server...');
  const server = spawn('node', ['js/server.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
  server.on('error', (error) => {
    console.error('Failed to start server:', error.message);
  });
}

// Function to start the test server
function startTestServer() {
  console.log('Starting the test server...');
  const server = spawn('node', ['test-server.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  server.on('close', (code) => {
    console.log(`Test server process exited with code ${code}`);
  });
  
  server.on('error', (error) => {
    console.error('Failed to start test server:', error.message);
  });
}

// Main function
async function main() {
  console.log('🚀 Prime Bot Website Setup and Run Script');
  console.log('==========================================\n');
  
  // Check if we're running in the correct directory
  if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
    console.error('❌ This script must be run from the web directory');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  
  // Handle help command
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node setup-and-run.js [options]

Options:
  --test      Run the minimal test server (no auth, no database)
  --full      Run the full server (requires dependencies)
  --install   Install dependencies only
  --setup     Setup .env file only
  --help      Show this help message

If no options are provided, the script will attempt to run the full server,
installing dependencies if needed.
    `);
    process.exit(0);
  }
  
  // Handle test server
  if (args.includes('--test')) {
    console.log('🧪 Running test server (static files only)');
    createEnvFile();
    startTestServer();
    return;
  }
  
  // Handle install only
  if (args.includes('--install')) {
    if (isNpmAvailable()) {
      await installDependencies();
    } else {
      console.error('❌ npm is not available. Please install Node.js and npm.');
      process.exit(1);
    }
    return;
  }
  
  // Handle setup only
  if (args.includes('--setup')) {
    createEnvFile();
    return;
  }
  
  // Default behavior: try to run full server
  console.log('🔧 Setting up and running the full server...\n');
  
  // Create .env file if needed
  createEnvFile();
  
  // Check if npm is available
  if (!isNpmAvailable()) {
    console.error('❌ npm is not available. Please install Node.js and npm.');
    console.log('   You can still run the test server with: node setup-and-run.js --test');
    process.exit(1);
  }
  
  // Check if dependencies are installed
  if (!areDependenciesInstalled()) {
    console.log('📦 Dependencies not found. Installing...');
    try {
      await installDependencies();
    } catch (error) {
      console.error('❌ Failed to install dependencies.');
      console.log('   You can still run the test server with: node setup-and-run.js --test');
      process.exit(1);
    }
  } else {
    console.log('✅ Dependencies already installed');
  }
  
  // Start the full server
  startFullServer();
}

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}