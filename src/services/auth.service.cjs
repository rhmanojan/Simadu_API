const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository.cjs');
const { AppError } = require('../middleware/error.middleware.cjs');
const { getJwtSecret } = require('../middleware/auth.middleware.cjs');

// Dummy hash untuk mencegah timing attack enumerasi username
const DUMMY_BCRYPT_HASH = '$2b$10$SZE4Cgw4UZu7/K9hWiquEOgZzP5UbcEMr5otOkqmyCOMGcEXoQb0O';

/**
 * Memverifikasi kredensial pengguna dan menerbitkan JWT Bearer Token yang unik per sesi
 * serta memiliki masa kedaluwarsa (expiresIn).
 */
async function login({ username, password }) {
  const user = userRepository.findByUsername(username);
  const hashToCompare = user ? user.passwordHash : DUMMY_BCRYPT_HASH;
  const isPasswordValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isPasswordValid) {
    throw new AppError(401, 'Username atau password salah.');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    mahasiswaId: user.mahasiswaId,
    jti: crypto.randomUUID()
  };

  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn,
    algorithm: 'HS256'
  });

  return {
    token,
    tokenType: 'Bearer',
    expiresIn,
    user: {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      mahasiswaId: user.mahasiswaId
    }
  };
}

module.exports = {
  login
};
