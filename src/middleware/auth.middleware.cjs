const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository.cjs');
const { AppError } = require('./error.middleware.cjs');

/**
 * Mengambil secret JWT dari environment variable.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new AppError(500, 'Konfigurasi keamanan server belum lengkap.');
  }
  return secret;
}

/**
 * Middleware autentikasi Bearer Token (JWT).
 * Memeriksa header Authorization, memverifikasi tanda tangan dan kedaluwarsa token,
 * serta memastikan pengguna masih terdaftar di server.
 */
function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return next(new AppError(401, 'Akses ditolak. Header Authorization Bearer Token wajib disertakan.'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
    return next(
      new AppError(401, 'Format token autentikasi tidak valid. Gunakan format: Bearer <token>.')
    );
  }

  const token = parts[1].trim();

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const user = userRepository.findById(decoded.sub);

    if (!user) {
      return next(new AppError(401, 'Sesi tidak valid. Pengguna tidak ditemukan.'));
    }

    // Simpan identitas aman pada req.user (tanpa passwordHash)
    req.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      mahasiswaId: user.mahasiswaId
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'Token autentikasi telah kedaluwarsa. Silakan login kembali.'));
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return next(new AppError(401, 'Token autentikasi tidak valid.'));
    }
    return next(err);
  }
}

/**
 * Middleware opsional API Key (pengembangan tambahan sesuai Soal 3).
 * Hanya aktif jika REQUIRE_API_KEY=true. Tidak menggantikan autentikasi & otorisasi Bearer Token.
 */
function optionalApiKeyGuard(req, _res, next) {
  if (process.env.REQUIRE_API_KEY !== 'true') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return next(new AppError(401, 'API Key tidak valid atau tidak disertakan pada header x-api-key.'));
  }

  return next();
}

module.exports = {
  authenticate,
  optionalApiKeyGuard,
  getJwtSecret
};
