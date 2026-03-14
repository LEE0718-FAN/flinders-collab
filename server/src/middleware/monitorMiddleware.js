const monitor = require('../utils/monitor');

/**
 * Express middleware that records every request to the server monitor.
 * Must be added before route handlers to capture all requests.
 */
function monitorMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    monitor.recordRequest(req, res, duration);
  });

  next();
}

module.exports = monitorMiddleware;
