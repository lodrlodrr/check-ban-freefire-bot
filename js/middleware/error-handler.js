const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    
    // Handle MongoDB connection errors
    if (err.name === 'MongoError' || err.name === 'MongoNetworkError') {
        return res.status(503).json({
            error: 'Database connection error',
            message: 'Unable to connect to database'
        });
    }

    // Handle session errors
    if (err.name === 'SessionError') {
        return res.status(500).json({
            error: 'Session error',
            message: 'Session management failed'
        });
    }

    // Default error response
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
};

module.exports = errorHandler;