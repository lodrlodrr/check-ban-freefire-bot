// Debug endpoint for server issues
module.exports = async (req, res) => {
  try {
    // Check environment variables
    const envVars = {
      DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET: !!process.env.DISCORD_CLIENT_SECRET,
      MONGODB_URI: !!process.env.MONGODB_URI,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      NODE_ENV: process.env.NODE_ENV
    };
    
    // Try to import the main app
    let appStatus = 'unknown';
    try {
      const serverModule = require('../js/server.js');
      appStatus = serverModule && serverModule.app ? 'loaded' : 'failed';
    } catch (err) {
      appStatus = `error: ${err.message}`;
    }
    
    res.status(200).json({
      success: true,
      message: 'Debug information',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV
      },
      environmentVariables: envVars,
      appStatus: appStatus,
      request: {
        method: req.method,
        url: req.url,
        headers: Object.keys(req.headers)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};