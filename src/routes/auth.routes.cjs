const express = require('express');
const authController = require('../controllers/auth.controller.cjs');
const { validateLogin } = require('../middleware/validate.middleware.cjs');

const router = express.Router();

// POST /api/auth/login - Autentikasi pengguna dan penerbitan Bearer Token
router.post('/login', validateLogin, authController.login);

module.exports = router;
