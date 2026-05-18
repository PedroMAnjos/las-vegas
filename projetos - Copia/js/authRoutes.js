const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', AuthController.login);
router.post('/validate-hash', authMiddleware, AuthController.validateHash);

module.exports = router;