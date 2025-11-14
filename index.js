#!/usr/bin/env node

/**
 * Start script for Prime Bot Website
 */

// Load environment variables
require('dotenv').config();

// Import the Express app from server.js
const { app } = require('./js/server.js');

// Export the app for Vercel serverless functions
module.exports = app;

// Start the server if this file is run directly (for local development)
if (require.main === module) {
  const { startServer } = require('./js/server.js');
  try {
    console.log('🚀 Starting Prime Bot Website...');
    startServer();
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Error handling for uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
