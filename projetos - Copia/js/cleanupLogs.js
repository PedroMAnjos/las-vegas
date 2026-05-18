const cron = require('node-cron');
const supabase = require('../config/supabase');

// Roda todos os dias à meia-noite (00:00)
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Iniciando limpeza automática de logs antigos (3 dias)...');
    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const { data, error } = await supabase
            .from('logs')
            .delete()
            .lt('created_at', threeDaysAgo.toISOString());
            
        if (error) throw error;
        console.log('[CRON] Limpeza de logs concluída com sucesso.');
    } catch (e) { console.error('[CRON ERROR]', e.message); }
});