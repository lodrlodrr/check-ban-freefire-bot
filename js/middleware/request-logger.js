const requestLogger = (req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end;
    const originalWrite = res.write;
    let responseBody = '';

    // Capture response body
    res.write = function (chunk) {
        responseBody += chunk;
        originalWrite.apply(res, arguments);
    };

    // Log request and response
    res.end = function (chunk) {
        if (chunk) {
            responseBody += chunk;
        }
        
        const duration = Date.now() - start;
        console.log({
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            headers: req.headers,
            query: req.query,
            body: req.body,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            response: responseBody.substring(0, 1000) // Limit response logging
        });

        originalEnd.apply(res, arguments);
    };

    next();
};

module.exports = requestLogger;