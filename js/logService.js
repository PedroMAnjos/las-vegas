const supabase = require('./supabase');

const LogService = {
    async logAction(tenant_id, operator_name, operator_hash, role, action, details) {
        try {
            await supabase.from('logs').insert([{
                tenant_id,
                operator_name: operator_name || 'Sistema',
                operator_hash: operator_hash || null,
                role,
                action,
                details
            }]);
        } catch (e) { console.error('[LOG ERROR] Falha ao salvar log:', e.message); }
    }
};

module.exports = LogService;