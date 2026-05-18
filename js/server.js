require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Inicia o Cron Job de limpeza de Logs
require('./src/cron/cleanupLogs');

const authRoutes = require('./src/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Proteções de Segurança
app.use(helmet());
app.use(cors());
app.use(express.json());

// Limite de tentativas de login por IP (Prevenção de Brute Force)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máx de requisições
    message: { error: 'Muitas requisições deste IP, tente novamente mais tarde.' }
});
app.use('/api/', limiter);

// Inicialização de Rotas
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend SaaS iniciado na porta ${PORT}`);
});