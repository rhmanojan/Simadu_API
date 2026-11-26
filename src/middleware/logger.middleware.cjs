/**
 * Middleware logging permintaan HTTP yang aman.
 * PENTING: Tidak pernah mencatat header Authorization, Bearer Token, API Key,
 * ataupun request body (seperti password) ke dalam log.
 */
function loggerMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const durationMs = Date.now() - startTime;
    const actor = req.user ? `${req.user.role}:${req.user.id}` : 'anonymous';
    const timestamp = new Date().toISOString();

    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms) [actor=${actor}]`
    );
  });

  next();
}

module.exports = {
  loggerMiddleware
};
