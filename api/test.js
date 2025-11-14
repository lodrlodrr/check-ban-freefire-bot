// Simple test endpoint for server verification
module.exports = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is working correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
};