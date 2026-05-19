const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./supabase');
const LogService = require('./logService');

const AuthController = {
    async login(req, res) {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Preencha usuário e senha.' });

        try {
            // 1. Busca usuário na base
            const { data: user, error } = await supabase.from('users').select('*').eq('username', username).eq('active', true).single();
            if (error || !user) return res.status(401).json({ error: 'Credenciais inválidas.' });

            // 2. Valida Senha (Bcrypt)
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) return res.status(401).json({ error: 'Credenciais inválidas.' });

            // 3. Regra do Professional (Requer validação de HASH)
            if (user.role === 'professional') {
                // Retorna um token temporário apenas válido para a etapa do HASH (15 min) - FALLBACK APLICADO
                const tempToken = jwt.sign({ userId: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id }, (process.env.JWT_SECRET || 'senha_secreta_padrao_123'), { expiresIn: '15m' });
                return res.json({ requireHash: true, tempToken, role: user.role });
            }

            // 4. Admin e Registrar (Acesso Direto sem Hash)
            const payload = { userId: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id, operator_name: user.username, operator_hash: null };
            
            // FALLBACK APLICADO AQUI
            const token = jwt.sign(payload, (process.env.JWT_SECRET || 'senha_secreta_padrao_123'), { expiresIn: '8h' });

            await LogService.logAction(user.tenant_id, user.username, null, user.role, 'LOGIN', 'Acesso direto realizado.');

            return res.json({ token, session: payload });

        } catch (err) {
            console.error('[AUTH ERROR]', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    async validateHash(req, res) {
        const { hash } = req.body;
        // As variáveis abaixo vêm do authMiddleware extraídas do "tempToken"
        const { tenant_id, userId, username, role } = req.user; 

        if (!hash) return res.status(400).json({ error: 'Código HASH obrigatório.' });

        try {
            // 1. Busca o hash para ESTE tenant e verifica se está ativo
            const { data: opData, error } = await supabase
                .from('operator_hashes')
                .select('*')
                .eq('operator_hash', hash)
                .eq('tenant_id', tenant_id)
                .eq('active', true)
                .single();

            if (error || !opData) {
                await LogService.logAction(tenant_id, username, hash, role, 'LOGIN_FAILED', 'Tentativa de acesso com HASH inválido.');
                return res.status(403).json({ error: 'Código HASH inválido ou inativo.' });
            }

            // 2. Sucesso: Gera o Token Definitivo de 8 horas com o Nome do Operador incluído
            const payload = { userId, username, role, tenant_id, operator_name: opData.operator_name, operator_hash: opData.operator_hash };
            
            // FALLBACK APLICADO AQUI
            const finalToken = jwt.sign(payload, (process.env.JWT_SECRET || 'senha_secreta_padrao_123'), { expiresIn: '8h' });

            await LogService.logAction(tenant_id, opData.operator_name, opData.operator_hash, role, 'LOGIN_HASH', 'Operador autenticado com sucesso.');

            return res.json({ token: finalToken, session: payload });

        } catch (err) {
            console.error('[HASH ERROR]', err);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    }
};

module.exports = AuthController;