/**
 * Custom operational error class untuk standarisasi respons kesalahan REST API.
 */
class AppError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware 404 untuk endpoint yang tidak terdaftar.
 */
function notFoundHandler(req, res, next) {
  next(new AppError(404, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`));
}

/**
 * Global Error Handler Middleware (Express 5).
 * Menjamin format respons konsisten (400, 401, 403, 404, 500) tanpa membocorkan
 * informasi sensitif (stack trace, kredensial, token, atau struktur internal server).
 */
function errorHandler(err, req, res, _next) {
  // Kesalahan parsing JSON (malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Format JSON pada request body tidak valid.'
    });
  }

  // Payload terlalu besar
  if (err && err.type === 'entity.too.large') {
    return res.status(400).json({
      success: false,
      message: 'Ukuran payload melebihi batas maksimum yang diperbolehkan.'
    });
  }

  // Kesalahan operasional terkelola (400, 401, 403, 404, dll.)
  if (err instanceof AppError || err.isOperational) {
    const payload = {
      success: false,
      message: err.message
    };

    if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      payload.errors = err.errors;
    }

    return res.status(err.statusCode).json(payload);
  }

  // Kesalahan tak terduga (500) - catat log minimal yang aman tanpa data sensitif
  if (process.env.NODE_ENV !== 'test') {
    console.error(
      `[ERROR] ${new Date().toISOString()} ${req.method} ${req.path} -> 500: ${err.name || 'InternalError'}`
    );
  }

  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.'
  });
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
