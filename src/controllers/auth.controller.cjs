const authService = require('../services/auth.service.cjs');

/**
 * Controller autentikasi pengguna (POST /api/auth/login).
 */
async function login(req, res) {
  const result = await authService.login(req.validatedBody);

  return res.status(200).json({
    success: true,
    message: 'Login berhasil.',
    data: result
  });
}

module.exports = {
  login
};
