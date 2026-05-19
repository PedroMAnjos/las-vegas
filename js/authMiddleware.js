const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Injeta { userId, username, role, tenant_id } no request
        next();
    } catch (error) {
        console.error('[AUTH] Token JWT inválido ou expirado.');
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};

module.exports = authMiddleware;