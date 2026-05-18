require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Inicia o Cron Job de limpeza de Logs
require('./src/cron/cleanupLogs');

const authRoutes = require('./src/routes/authRoutes');
const supabase = require('./src/config/supabase');
const authMiddleware = require('./src/middleware/authMiddleware');

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

// ==========================================
// ROTAS DE SINCRONIZAÇÃO DE DADOS (BANCO DE DADOS)
// ==========================================
app.get('/api/sync', authMiddleware, async (req, res) => {
    try {
        const { data } = await supabase.from('mediators').select('extracted_data').eq('tenant_id', req.user.tenant_id);
        const mediators = data ? data.map(d => d.extracted_data) : [];
        res.json({ mediators });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/sync', authMiddleware, async (req, res) => {
    try {
        const { mediators } = req.body;
        // Sincronização Bulk: Limpa os antigos e atualiza com a lista nova
        await supabase.from('mediators').delete().eq('tenant_id', req.user.tenant_id);
        if (mediators && mediators.length > 0) {
            const inserts = mediators.map(m => ({ tenant_id: req.user.tenant_id, extracted_data: m }));
            await supabase.from('mediators').insert(inserts);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend SaaS iniciado na porta ${PORT}`);
});
