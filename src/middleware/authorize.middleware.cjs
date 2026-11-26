const { AppError } = require('./error.middleware.cjs');

/**
 * Middleware otorisasi berbasis peran (Role-Based Access Control / RBAC).
 * Harus dijalankan setelah middleware `authenticate`.
 *
 * @param  {...string} allowedRoles - Daftar role yang diperbolehkan ('mahasiswa', 'admin')
 */
function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Pengguna belum terautentikasi.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          `Akses ditolak. Peran '${req.user.role}' tidak memiliki izin untuk melakukan operasi ini.`
        )
      );
    }

    return next();
  };
}

module.exports = {
  authorizeRoles
};
