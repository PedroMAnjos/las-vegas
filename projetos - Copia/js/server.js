require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./authRoutes');
const supabase = require('./supabase');
const authMiddleware = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Proteções de Segurança
app.use(helmet());
app.use(cors());
app.use(express.json());

// Servir os ficheiros estáticos do frontend (HTML, CSS, JS) na mesma porta
app.use(express.static(path.join(__dirname, '../')));

// Limite de tentativas de login por IP (Prevenção de Brute Force)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo de requisições
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
        const { data, error } = await supabase.from('mediators').select('extracted_data').eq('tenant_id', req.user.tenant_id);
        if (error) throw error;
        
        const mediators = data ? data.map(d => d.extracted_data) : [];
        res.json({ mediators });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/sync', authMiddleware, async (req, res) => {
    try {
        const { mediators } = req.body;
        // Estratégia de sincronização mais segura. 
        // Idealmente, o frontend deve enviar apenas os itens alterados (CRUD individual).
        // Como o frontend envia o array completo, executamos a eliminação e inserção em passos controlados.
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

// ==========================================
// ROTAS DE SINCRONIZAÇÃO FINANCEIRA
// ==========================================
app.get('/api/finance', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem aceder a dados financeiros.' });
        }
        
        const { data, error } = await supabase.from('transactions').select('*').eq('tenant_id', req.user.tenant_id).order('created_at', { ascending: false });
        if (error) throw error;
        
        const transactions = data.map(t => ({
            id: t.id,
            desc: t.description,
            value: t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount),
            date: t.transaction_date,
            time: t.transaction_time
        }));
        res.json({ transactions });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/finance', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
        
        const { transactions } = req.body;
        await supabase.from('transactions').delete().eq('tenant_id', req.user.tenant_id);
        
        if (transactions && transactions.length > 0) {
            const inserts = transactions.map(t => ({ 
                tenant_id: req.user.tenant_id, 
                description: t.desc, 
                amount: Math.abs(t.value), 
                type: t.value >= 0 ? 'income' : 'expense', 
                transaction_date: t.date, 
                transaction_time: t.time 
            }));
            await supabase.from('transactions').insert(inserts);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// ROTAS DE AUDITORIA (LOGS)
// ==========================================
app.get('/api/logs', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase.from('logs')
            .select('*')
            .eq('tenant_id', req.user.tenant_id)
            .order('created_at', { ascending: false })
            .limit(200);
            
        if (error) throw error;
        res.json({ logs: data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/logs', authMiddleware, async (req, res) => {
    try {
        const { action, details } = req.body;
        const LogService = require('./logService');
        await LogService.logAction(req.user.tenant_id, req.user.operator_name, req.user.operator_hash, req.user.role, action, details);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// ROTA SERVERLESS PARA O CRON DO VERCEL
// ==========================================
app.get('/api/cron/cleanup', async (req, res) => {
    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const { error } = await supabase.from('logs').delete().lt('created_at', threeDaysAgo.toISOString());
        if (error) throw error;
        res.json({ success: true, message: 'Logs antigos limpos com sucesso.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Servidor a correr localmente na porta ${PORT}`));
}

module.exports = app;