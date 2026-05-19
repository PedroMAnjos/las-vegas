const express = require('express');
const router = express.Router();
const AuthController = require('./authController');
const authMiddleware = require('./authMiddleware');

router.post('/login', AuthController.login);
router.post('/validate-hash', authMiddleware, AuthController.validateHash);

module.exports = router;