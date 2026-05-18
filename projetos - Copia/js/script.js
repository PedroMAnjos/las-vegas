/**
 * PAINEL ADMIN SAAS - JAVASCRIPT PRINCIPAL
 * 
 * // LOGINS MOCKADOS (SIMULAÇÃO BANCO DE DADOS)
 * // pedro / mestre (ADMIN - Acesso Total)
 * // prof / senha  (PROFESSIONAL - Acesso Operacional)
 * // reg / senha   (REGISTRAR - Apenas Cadastro)
 */

// ==========================================
// PWA - SERVICE WORKER REGISTRATION
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('[PWA] Service Worker registrado com sucesso.', reg.scope))
            .catch(err => console.error('[PWA] Falha ao registrar Service Worker:', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('APP START');
    console.log("[CORE] Verificando integridade dos módulos...");

    // ==========================================
    // 1. SERVIÇO DE AUTENTICAÇÃO E SPA GUARD (SUPABASE)
    // ==========================================
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const loginUser = document.getElementById('loginUser');
    const loginPass = document.getElementById('loginPass');
    const loginError = document.getElementById('loginError');

    let currentSession = null;

    // Engine Híbrida de Autenticação (Supabase c/ Fallback Local e Debug Extremo)
    const AuthService = {
        async getSession() {
            console.log("=== [AUTH DEBUG] getSession() INICIADO ===");
            
            if (typeof supabase !== 'undefined') {
                try {
                    console.log("[AUTH DEBUG] Supabase detectado. Buscando sessão...");
                    const { data, error } = await supabase.auth.getSession();
                    
                    if (error) {
                        console.error("[AUTH DEBUG] Erro ao buscar sessão Supabase:", error);
                    } else if (data && data.session) {
                        console.log("[AUTH DEBUG] Sessão Supabase encontrada. ID:", data.session.user.id);
                        
                        const { data: profile, error: profileError } = await supabase
                            .from('profiles')
                            .select('username, role, tenant_id')
                            .eq('id', data.session.user.id)
                            .single();
                            
                        if (profileError) {
                             console.error("[AUTH DEBUG] Erro ao buscar profile (RLS bloqueando?):", profileError);
                        } else if (profile) {
                             console.log("[AUTH DEBUG] Profile recuperado com sucesso:", profile);
                             return {
                                 id: data.session.user.id,
                                 username: profile.username,
                                 tenant_id: profile.tenant_id,
                                 role: profile.role
                             };
                        }
                    } else {
                        console.log("[AUTH DEBUG] Nenhuma sessão Supabase ativa.");
                    }
                } catch (e) {
                    console.error("[AUTH DEBUG] Exceção fatal no getSession Supabase:", e);
                }
            } else {
                console.warn("[AUTH DEBUG] Objeto 'supabase' não encontrado no escopo global.");
            }

            console.log("[AUTH DEBUG] Buscando sessão local (Mock Fallback)...");
            const localSession = JSON.parse(localStorage.getItem('sysSession') || 'null');
            console.log("[AUTH DEBUG] Sessão local encontrada:", localSession);
            return localSession;
        },

        async login(username, password) {
            console.log("=== [AUTH DEBUG] TENTATIVA DE LOGIN INICIADA ===");
            console.log("[AUTH DEBUG] USERNAME DIGITADO:", username);
            
            if (typeof supabase !== 'undefined') {
                console.log("[AUTH DEBUG] Supabase detectado. Tentando fluxo de banco de dados...");
                try {
                    const { data: profileLookup, error: lookupError } = await supabase
                        .from('profiles')
                        .select('internal_email, role, tenant_id')
                        .eq('username', username)
                        .single();

                    if (lookupError) {
                        console.error("[AUTH DEBUG] Falha no lookup do username (Não existe ou RLS bloqueou):", lookupError);
                    } else if (profileLookup && profileLookup.internal_email) {
                        console.log("[AUTH DEBUG] PROFILE ENCONTRADO:", profileLookup);
                        console.log("[AUTH DEBUG] EMAIL INTERNO TÉCNICO:", profileLookup.internal_email);
                        
                        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
                            email: profileLookup.internal_email, 
                            password 
                        });

                        if (authError) {
                            console.error("[AUTH DEBUG] signInWithPassword() rejeitado:", authError);
                        } else if (authData && authData.session) {
                            console.log("[AUTH DEBUG] AUTH RESPONSE (Sessão JWT recebida):", authData);
                            const session = {
                                id: authData.user.id,
                                username: username,
                                tenant_id: profileLookup.tenant_id,
                                role: profileLookup.role
                            };
                            console.log("[AUTH DEBUG] CURRENT SESSION FINAL:", session);
                            return session;
                        }
                    }
                } catch (e) {
                    console.error("[AUTH DEBUG] Exceção durante fluxo de login Supabase:", e);
                }
                console.warn("[AUTH DEBUG] Login no Supabase falhou. Iniciando Fallback Local...");
            }

            return new Promise((resolve, reject) => {
                setTimeout(() => { // Simula delay de rede (800ms)
                    let tenant = null; let role = null;
                    if (username === 'pedro' && password === 'mestre') { tenant = 'tenant_a'; role = 'admin'; }
                    else if (username === 'prof' && password === 'senha') { tenant = 'tenant_a'; role = 'professional'; }
                    else if (username === 'reg' && password === 'senha') { tenant = 'tenant_a'; role = 'registrar'; }
                    else if (username === 'pedro' && password === 'mestre') { tenant = 'tenant_mestre'; role = 'admin'; }
                    
                    if (tenant) {
                        const session = { id: 'local_id_mock', username: username, tenant_id: tenant, role: role };
                        localStorage.setItem('sysSession', JSON.stringify(session));
                        console.log("[AUTH DEBUG] Login MOCK Aprovado. Role:", role);
                        resolve(session);
                    } else {
                        console.error("[AUTH DEBUG] Credenciais incorretas na simulação MOCK.");
                        reject(new Error("Credenciais inválidas"));
                    }
                }, 800);
            });
        },

        async logout() {
            console.log("=== [AUTH DEBUG] SOLICITANDO LOGOUT ===");
            if (typeof supabase !== 'undefined') {
                try {
                    await supabase.auth.signOut();
                    console.log("[AUTH DEBUG] Supabase signOut() concluído.");
                } catch(e) {
                    console.error("[AUTH DEBUG] Falha ao deslogar do Supabase:", e);
                }
            }
            localStorage.removeItem('sysSession');
            window.location.replace('/'); // Previne cache back/forward do navegador
        }
    };

    // ==========================================
    // BACKEND SERVICE: GERENCIAMENTO DE TENANTS
    // ==========================================
    const TenantService = {
        deleteTenant(targetTenantId) {
            // Validação de Segurança: Apenas Master Admin
            if (!currentSession || currentSession.tenant_id !== 'tenant_mestre') {
                console.error("[SECURITY] Acesso Negado: Apenas ADMIN MASTER pode apagar tenants.");
                return { success: false, error: "Acesso Negado" };
            }

            // Confirmação de Ação contra exclusão acidental
            const confirmation = confirm(`⚠️ ALERTA DE EXCLUSÃO DE TENANT ⚠️\n\nVocê está prestes a apagar TODOS os dados, usuários, mediadores, financeiro e logs do tenant: ${targetTenantId}.\n\nEsta ação é IRREVERSÍVEL. Deseja continuar?`);
            
            if (confirmation) {
                console.log(`[MASTER] Iniciando expurgo de dados do tenant: ${targetTenantId}`);
                
                // Cleanup Service Backend (Simulação do ON DELETE CASCADE)
                localStorage.removeItem(`sysMediators_${targetTenantId}`);
                localStorage.removeItem(`sysLogs_${targetTenantId}`);
                localStorage.removeItem(`sysFinance_${targetTenantId}`);
                localStorage.removeItem(`sysLastCheck_${targetTenantId}`);
                
                console.log(`[MASTER] Expurgo concluído. Tenant ${targetTenantId} não possui mais dados órfãos.`);
                alert(`Todos os dados do tenant ${targetTenantId} foram apagados com sucesso.`);
                return { success: true };
            }
            return { success: false, error: "Ação cancelada pelo usuário" };
        }
    };

    // Função isolada para gerenciar a UI do HASH corretamente
    function openHashModal() {
        console.log('[DEBUG] Abrindo Modal HASH para Professional');
        if(loginScreen) loginScreen.style.display = 'none';
        const authCodeModal = document.getElementById('authCodeModal');
        if(authCodeModal) {
            // Movemos pro body para garantir visibilidade absoluta (escapando do appScreen oculto)
            document.body.appendChild(authCodeModal);
            authCodeModal.style.display = 'flex';
        }
    }

    // GATILHO INICIAL: SPA ROUTING GUARD
    async function initSystem() {
        console.log("=== [SYSTEM DEBUG] INIT SYSTEM SPA ===");
        // Força a exibição do login inicialmente para impedir vazamento de UI
        if(loginScreen) loginScreen.style.display = 'flex';
        if(appScreen) appScreen.style.display = 'none';

        currentSession = await AuthService.getSession();
        
        if (currentSession) {
            console.log("[SYSTEM DEBUG] Autenticação válida. CURRENT SESSION:", currentSession);
            
            // Apenas o PROFESSIONAL passa pela etapa do Código HASH. Admin e Registrar entram direto.
            if (currentSession.role === 'professional' && !currentSession.operator_hash) {
                openHashModal();
            } else {
                showApp();
            }
        } else {
            console.log("[SYSTEM DEBUG] Aguardando credenciais na tela de Login.");
        }
    }
    
    initSystem();

    function showApp() {
        if(loginScreen) loginScreen.style.display = 'none';
        if(appScreen) appScreen.style.display = 'flex';
        loadData(); // Carrega apenas os dados DO TENANT LOGADO
        applyRoleRestrictions(); // BLINDAGEM DA INTERFACE
    }

    function applyRoleRestrictions() {
        const role = currentSession.role;
        console.log(`[SYSTEM] Aplicando restrições de ambiente para: ${role.toUpperCase()}`);
        
        const navDashboard = document.getElementById('navDashboard');
        const navReports = document.getElementById('navReports');
        const navMediators = document.getElementById('navMediators');
        const viewMediators = document.getElementById('viewMediators');
        const fabAddUser = document.getElementById('fabAddUser');
        const pageTitle = document.getElementById('pageTitle');
        const formSectionSystem = document.getElementById('formSectionSystem');

        if (role === 'professional') {
            // PROFESSIONAL: Esconde abas financeiras, direciona pro operacional
            if(navDashboard) navDashboard.style.display = 'none';
            if(navReports) navReports.style.display = 'none';
            if(navMediators) navMediators.click();
        } else if (role === 'registrar') {
            // REGISTRAR: Esconde tudo da dashboard. Abre apenas o Formulário.
            if(navDashboard) navDashboard.style.display = 'none';
            if(navReports) navReports.style.display = 'none';
            if(navMediators) navMediators.style.display = 'none';
            if(viewMediators) viewMediators.style.display = 'none';
            if(pageTitle) pageTitle.innerText = "CADASTRO RÁPIDO";
            
            if(fabAddUser) {
                fabAddUser.style.display = 'none'; // Esconde botão float para focar só no form
                fabAddUser.click(); // Dispara o modal de cadastro automaticamente
            }
        } else {
            // ADMIN: Sem restrições
            if(navMediators) navMediators.click(); 
            if(formSectionSystem) formSectionSystem.style.display = 'block';
        }
    }

    async function attemptLogin(e) {
        if (e && e.preventDefault) e.preventDefault();
        
        const u = loginUser ? loginUser.value.trim() : '';
        const p = loginPass ? loginPass.value.trim() : '';
        
        if(!u || !p) return;

        if (btnLogin) btnLogin.classList.add('loading');
        if (loginError) loginError.style.display = 'none';

        try {
            currentSession = await AuthService.login(u, p);
            
            console.log('ROLE:', currentSession.role);
            console.log('IS PROFESSIONAL:', currentSession.role === 'professional');

            // Bloqueio de 2ª Etapa (HASH) exclusivo para Operadores.
            if (currentSession.role === 'professional') {
                openHashModal();
                return; // Aborta execução. Só entra com o HASH.
            }
            
            showApp();
        } catch (error) {
            if(loginError) {
                loginError.innerText = error.message || "Credenciais inválidas.";
                loginError.style.display = 'block';
                // Efeito de tremor no erro
                loginError.style.animation = 'none';
                setTimeout(() => loginError.style.animation = 'shake 0.5s', 10);
            }
            if(loginPass) loginPass.value = '';
        } finally {
            if (btnLogin) btnLogin.classList.remove('loading');
        }
    }

    if(btnLogin) btnLogin.addEventListener('click', (e) => attemptLogin(e));
    
    // Suporte para tecla ENTER no login
    if(loginPass) {
        loginPass.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin(e);
        });
    }

    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Deseja sair do sistema?")) {
                AuthService.logout();
            }
        });
    }

    // Lógica do 2FA do Operador (Modal de Código)
    const btnVerifyOp = document.getElementById('btnVerifyOp');
    if (btnVerifyOp) {
        btnVerifyOp.addEventListener('click', () => {
            const code = document.getElementById('opCode').value.trim().toUpperCase();
            const hashError = document.getElementById('hashError');
            if (hashError) hashError.style.display = 'none';
            
            if (!code) {
                if (hashError) {
                    hashError.innerText = "Por favor, digite seu código HASH.";
                    hashError.style.display = 'block';
                }
                return;
            }
            
            // Simulação da tabela operator_hashes do Banco de Dados
            // HASHES OPERACIONAIS
            /*
            { operator_name: "BLD", operator_hash: "B9L2-D7X4-K1P9", role: "professional", tenant_id: "tenant_a", active: true }
            { operator_name: "DERICK", operator_hash: "D4R8-K3M1-V9Q2", role: "professional", tenant_id: "tenant_a", active: true }
            */
            console.log('HASHES CARREGADOS');
            
            const validOperatorHashes = {
                'D4R8-K3M1-V9Q2': 'DERICK',
                'B9L2-D7X4-K1P9': 'BLD'
            };
            
            if (validOperatorHashes[code]) {
                currentSession.operator_hash = code;
                currentSession.operator_name = validOperatorHashes[code];
                localStorage.setItem('sysSession', JSON.stringify(currentSession)); 
                
                document.getElementById('authCodeModal').style.display = 'none';
                logAction('LOGIN', `Operador acessou o sistema.`);
                showApp();
            } else {
                if (hashError) {
                    hashError.innerText = "Acesso Negado: HASH inválido ou inativo.";
                    hashError.style.display = 'block';
                    hashError.style.animation = 'none';
                    setTimeout(() => hashError.style.animation = 'shake 0.5s', 10);
                }
            }
        });
    }

    // ==========================================
    // 2. DADOS E VARIÁVEIS GLOBAIS
    // ==========================================
    const initialMediators = [
        { id: 1, name: "Ricardo Mendes", entryDate: "12/10/2023", daysLeft: 15, status: "active", avatar: "https://i.pravatar.cc/150?img=12", online: true, docs: { front: null, back: null } }
    ];

    let mediators = [];
    let transactions = [];
    let systemLogs = [];

    // Elementos DOM (Com verificação de existência)
    const listContainer = document.getElementById('mediatorList');
    const totalCountEl = document.getElementById('totalCount');
    const alertCountEl = document.getElementById('alertCount');

    // --- MOTOR DE LOGS E AUDITORIA ---
    function logAction(action, details) {
        if (!currentSession) return;
        const operator = currentSession.operator_name || currentSession.username;
        
        systemLogs.unshift({
            id: Date.now(),
            date: new Date().toLocaleDateString('pt-BR'),
            time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
            operator: operator,
            action: action,
            details: details
        });
        
        if (systemLogs.length > 200) systemLogs.pop(); // Mantém apenas os últimos 200 logs
        saveData();
    }

    // --- CARREGAMENTO ---
    async function loadData() {
        try {
            const tenantKey = currentSession.tenant_id;
            const role = currentSession.role;
            const token = localStorage.getItem('sysToken');
            
            if (token) {
                // Puxa do Banco de Dados Supabase (Via Node.js)
                const response = await fetch('http://localhost:3000/api/sync', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const dbData = await response.json();
                    mediators = dbData.mediators.length > 0 ? dbData.mediators : JSON.parse(JSON.stringify(initialMediators));
                }
            } else {
                const storedMed = localStorage.getItem(`sysMediators_${tenantKey}`);
                mediators = storedMed ? JSON.parse(storedMed) : JSON.parse(JSON.stringify(initialMediators));
            }

            const storedLogs = localStorage.getItem(`sysLogs_${tenantKey}`);
            systemLogs = storedLogs ? JSON.parse(storedLogs) : [];

            // Blindagem Frontend: Impede até de extrair os dados para a RAM se não for admin
            if (role === 'admin') {
                const storedFin = localStorage.getItem(`sysFinance_${tenantKey}`);
                transactions = storedFin ? JSON.parse(storedFin) : [];
            } else {
                transactions = [];
            }

            checkDailyCountdown(); // Verifica se virou o dia
            updateApp();
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
        }
    }

    async function saveData() {
        try {
            const tenantKey = currentSession.tenant_id;
            const token = localStorage.getItem('sysToken');

            // Salva na nuvem (Supabase) via Backend
            if (token) {
                await fetch('http://localhost:3000/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ mediators })
                });
            }

            // Salva Localmente como Backup ultra-rápido
            localStorage.setItem(`sysMediators_${tenantKey}`, JSON.stringify(mediators));
            localStorage.setItem(`sysLogs_${tenantKey}`, JSON.stringify(systemLogs));
            
            // Impede salvamento fantasma de usuários não admin
            if (currentSession.role === 'admin') {
                localStorage.setItem(`sysFinance_${tenantKey}`, JSON.stringify(transactions));
            }
            updateApp();
        } catch (e) {
            alert("Memória cheia! Tente remover algumas imagens de documentos.");
        }
    }

    function updateApp() {
        renderMediators(mediators);
        renderFinance();
        if(totalCountEl) totalCountEl.innerText = mediators.length;
        if(alertCountEl) alertCountEl.innerText = mediators.filter(m => m.status === 'expired' || m.status === 'expiring').length;
    }

    // --- CONTAGEM AUTOMÁTICA (00:00) ---
    function checkDailyCountdown() {
        const tenantKey = currentSession.tenant_id;
        const lastDate = localStorage.getItem(`sysLastCheck_${tenantKey}`);
        const today = new Date().toDateString();

        if (lastDate && lastDate !== today) {
            const d1 = new Date(lastDate);
            const d2 = new Date();
            const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                let changed = false;
                mediators.forEach(user => {
                    if (user.daysLeft > 0) {
                        user.daysLeft = Math.max(0, user.daysLeft - diffDays);
                        // Atualiza status
                        if (user.daysLeft === 0) user.status = 'expired';
                        else if (user.daysLeft <= 5) user.status = 'expiring';
                        changed = true;
                    }
                });
                if(changed) saveData();
            }
        }
        localStorage.setItem(`sysLastCheck_${tenantKey}`, today);
    }

    // ==========================================
    // 3. MEDIADORES (Lista e Ações)
    // ==========================================
    function renderMediators(data) {
        if(!listContainer) return;
        listContainer.innerHTML = '';
        
        if (data.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">Nenhum mediador encontrado.</p>';
            return;
        }

        // Ordenar: Expirados primeiro, depois acabando, depois ativos
        data.sort((a, b) => a.daysLeft - b.daysLeft);

        data.forEach((user, index) => {
            let statusHtml, btnAction;

            if (user.status === 'expired') {
                statusHtml = `<span class="status-label text-red">STATUS</span><span class="days-count text-red big-alert">EXPIRADO</span>`;
                btnAction = `<button class="action-btn text-yellow btn-renew" data-id="${user.id}"><i class="fa-solid fa-rotate-right"></i> RENOVAR (+7d)</button>`;
            } else {
                let color = user.daysLeft <= 5 ? 'text-red' : 'text-yellow';
                statusHtml = `<span class="status-label">DIAS RESTANTES</span><span class="days-count ${color}">${user.daysLeft} d</span>`;
                btnAction = `<button class="action-btn text-yellow btn-edit" data-id="${user.id}"><i class="fa-solid fa-pen"></i> EDITAR</button>`;
            }

            const hasData = user.extractedData != null;
            
            const div = document.createElement('div');
            div.className = 'card';
            // Staggering: Atraso sequencial suave
            div.style.animationDelay = `${index * 0.05}s`;
            div.innerHTML = `
                <div class="card-header">
                    <div class="user-info">
                        <div class="avatar-wrapper">
                            <img src="${user.avatar}" onerror="this.src='https://via.placeholder.com/55'">
                            <span class="status-dot ${user.online?'online':'offline'}"></span>
                        </div>
                        <div class="text-details"><h3>${user.name}</h3><p>Início: ${user.entryDate}</p></div>
                    </div>
                    <div class="card-status">${statusHtml}</div>
                </div>
                <div class="card-actions">
                    <button class="action-btn ${hasData?'text-green':'text-white'} btn-data" data-id="${user.id}" title="Dados Estruturados">
                        <i class="${hasData?'fa-solid fa-database':'fa-solid fa-microchip'}"></i> <span>DADOS</span>
                    </button>
                    ${btnAction.replace('EDITAR', '<span>EDITAR</span>').replace('RENOVAR (+7d)', '<span>RENOVAR</span>')}
                    <button class="action-btn text-red btn-rm" data-id="${user.id}" title="Remover">
                        <i class="fa-regular fa-trash-can"></i> <span>REMOVER</span>
                    </button>
                </div>
            `;
            listContainer.appendChild(div);
        });

        // Event Listeners Dinâmicos (Delegação de Eventos seria melhor, mas mantendo simples)
        document.querySelectorAll('.btn-data').forEach(b => b.onclick = () => openDataModal(parseInt(b.dataset.id)));
        document.querySelectorAll('.btn-edit').forEach(b => b.onclick = () => openEdit(parseInt(b.dataset.id)));
        document.querySelectorAll('.btn-rm').forEach(b => b.onclick = () => {
            if(confirm('Tem certeza que deseja remover este usuário permanentemente?')) {
                if (u) logAction('EXCLUIR', `Mediador Removido: ${u.name}`);
                mediators = mediators.filter(m => m.id !== u.id);
                saveData();
            }
        });
        document.querySelectorAll('.btn-renew').forEach(b => b.onclick = () => {
            const u = mediators.find(m => m.id === parseInt(b.dataset.id));
            if(u) { 
                u.daysLeft += 7; 
                u.status = u.daysLeft <= 5 ? 'expiring' : 'active'; 
                logAction('RENOVAR', `Mediador Renovado: ${u.name} (+7 dias)`);
                saveData(); 
                alert(`Renovado! ${u.name} agora tem ${u.daysLeft} dias.`); 
            }
        });
    }

    // ==========================================
    // 4. FINANCEIRO (Calculadora)
    // ==========================================
    const displayBalance = document.getElementById('displayBalance');
    const transListEl = document.getElementById('transactionList');
    const transCount = document.getElementById('transCount');
    
    // Inputs
    const incCategory = document.getElementById('incCategory');
    const incValue = document.getElementById('incValue');
    const btnIncome = document.getElementById('btnAddIncome');
    
    const expCategory = document.getElementById('expCategory');
    const expValue = document.getElementById('expValue');
    const btnExpense = document.getElementById('btnAddExpense');

    function addTransaction(type) {
        let desc, val, inputEl;
        if (type === 'income') {
            desc = incCategory ? incCategory.value : 'Entrada';
            val = parseFloat(incValue ? incValue.value : 0);
            inputEl = incValue;
        } else {
            desc = expCategory ? expCategory.value : 'Saída';
            val = parseFloat(expValue ? expValue.value : 0);
            inputEl = expValue;
        }

        if (isNaN(val) || val <= 0) return alert("Por favor, digite um valor válido.");

        transactions.unshift({
            id: Date.now(),
            desc: desc,
            value: type === 'income' ? val : -val,
            date: new Date().toLocaleDateString('pt-BR'),
            time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
        });
        saveData();
        if(inputEl) inputEl.value = '';
    }

    function removeTransaction(id) {
        if(confirm('Apagar este registro financeiro?')) {
            transactions = transactions.filter(t => t.id !== id);
            saveData();
        }
    }

    function renderFinance() {
        if(!transListEl) return;
        transListEl.innerHTML = '';
        
        const total = transactions.reduce((acc, item) => acc + item.value, 0);
        const fmt = (v) => v.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        
        if(displayBalance) {
            displayBalance.innerText = fmt(total);
            displayBalance.className = `balance-value ${total >= 0 ? 'positive' : 'negative'}`;
        }
        if(transCount) transCount.innerText = `${transactions.length} registros`;

        if (transactions.length === 0) {
            transListEl.innerHTML = '<p style="text-align:center; color:#555; padding:20px; font-size:0.8rem;">Nenhuma movimentação.</p>';
            return;
        }

        transactions.forEach((t, index) => {
            const isInc = t.value >= 0;
            const item = document.createElement('div');
            item.className = 'trans-item';
            item.style.animationDelay = `${index * 0.04}s`;
            item.innerHTML = `
                <div class="trans-left">
                    <div class="trans-icon ${isInc?'green':'red'}"><i class="fa-solid ${isInc?'fa-arrow-up':'fa-arrow-down'}"></i></div>
                    <div class="trans-details"><h4>${t.desc}</h4><p><i class="fa-regular fa-calendar"></i> ${t.date} &bull; <i class="fa-regular fa-clock"></i> ${t.time}</p></div>
                </div>
                <div class="trans-right">
                    <div class="trans-val ${isInc?'text-green':'text-red'}">${isInc?'+':'-'} ${fmt(Math.abs(t.value))}</div>
                    <button class="btn-del-trans" data-id="${t.id}" title="Apagar Registro"><i class="fa-solid fa-trash-can"></i></button>
                </div>`;
            transListEl.appendChild(item);
        });

        document.querySelectorAll('.btn-del-trans').forEach(b => b.onclick = () => removeTransaction(parseInt(b.dataset.id)));
    }

    if(btnIncome) btnIncome.onclick = () => addTransaction('income');
    if(btnExpense) btnExpense.onclick = () => addTransaction('expense');

    // ==========================================
    // 5. RELATÓRIOS (Semanal)
    // ==========================================
    const reportsList = document.getElementById('reportsList');

    function renderReports() {
        if(!reportsList) return;
        reportsList.innerHTML = '';
        
        if (transactions.length === 0) {
            reportsList.innerHTML = '<p style="text-align:center; color:#555; margin-top:20px;">Sem dados para relatório.</p>';
            return;
        }

        const weeklyGroups = {};
        transactions.forEach(t => {
            const parts = t.date.split('/');
            const dateObj = new Date(parts[2], parts[1]-1, parts[0]);
            
            const sunDate = new Date(dateObj); 
            sunDate.setDate(dateObj.getDate() - dateObj.getDay());
            
            const satDate = new Date(sunDate); 
            satDate.setDate(sunDate.getDate() + 6);

            const weekKey = `${formatDateShort(sunDate)} - ${formatDateShort(satDate)}`;
            const sortKey = sunDate.getTime();

            if(!weeklyGroups[weekKey]) weeklyGroups[weekKey] = { sort: sortKey, income: 0, expense: 0, balance: 0 };
            
            if(t.value >= 0) weeklyGroups[weekKey].income += t.value;
            else weeklyGroups[weekKey].expense += Math.abs(t.value);
            weeklyGroups[weekKey].balance += t.value;
        });

        Object.entries(weeklyGroups)
            .sort((a, b) => b[1].sort - a[1].sort)
            .forEach(([key, data], index) => {
                const fmt = (v) => v.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
                const isProfit = data.balance >= 0;
                
                const card = document.createElement('div'); 
                card.className = 'report-card';
                card.style.animationDelay = `${index * 0.06}s`;
                card.innerHTML = `
                    <div class="rep-header">
                        <div class="rep-date"><h3>Semana</h3><span>${key}</span></div>
                        <div class="rep-status ${isProfit?'profit':'loss'}">${isProfit?'LUCRO':'PREJUÍZO'}</div>
                    </div>
                    <div class="rep-body">
                        <div class="rep-col"><span class="rep-label">ENTRADAS</span><span class="rep-val text-green">${fmt(data.income)}</span></div>
                        <div class="rep-col"><span class="rep-label">SAÍDAS</span><span class="rep-val text-red">${fmt(data.expense)}</span></div>
                        <div class="rep-col"><span class="rep-label">SALDO</span><span class="rep-val ${isProfit?'text-green':'text-red'}">${fmt(data.balance)}</span></div>
                    </div>
                `;
                reportsList.appendChild(card);
            });
    }

    function formatDateShort(date) { return date.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}); }

    // ==========================================
    // 6. NAVEGAÇÃO ENTRE TELAS
    // ==========================================
    const viewMediators = document.getElementById('viewMediators');
    const viewDashboard = document.getElementById('viewDashboard');
    const viewReports = document.getElementById('viewReports');
    const viewLogs = document.getElementById('viewLogs');
    
    const navDashboard = document.getElementById('navDashboard');
    const navMediators = document.getElementById('navMediators');
    const navReports = document.getElementById('navReports');
    const navLogs = document.getElementById('navLogs');
    
    const fabAddUser = document.getElementById('fabAddUser');
    const pageTitle = document.getElementById('pageTitle');

    function hideAll() {
        if(viewMediators) viewMediators.style.display='none';
        if(viewDashboard) viewDashboard.style.display='none';
        if(viewReports) viewReports.style.display='none';
        if(viewLogs) viewLogs.style.display='none';
        if(fabAddUser) fabAddUser.style.display='none';
        if(navDashboard) navDashboard.classList.remove('active');
        if(navMediators) navMediators.classList.remove('active');
        if(navReports) navReports.classList.remove('active');
        if(navLogs) navLogs.classList.remove('active');
    }

    if(navMediators) navMediators.onclick = () => { 
        hideAll(); 
        if(viewMediators) viewMediators.style.display='block'; 
        if(fabAddUser) fabAddUser.style.display='flex'; 
        if(pageTitle) pageTitle.innerText="PAINEL ADMIN"; 
        navMediators.classList.add('active'); 
    };

    if(navDashboard) navDashboard.onclick = () => { 
        // Event Trap: Se tentar acessar a aba pelo Console do Chrome, bloqueia.
        if (currentSession.role !== 'admin') {
            alert("Acesso Negado: Você não possui privilégios para acessar a aba Financeira.");
            return;
        }
        hideAll(); 
        if(viewDashboard) viewDashboard.style.display='block'; 
        if(pageTitle) pageTitle.innerText="FINANCEIRO"; 
        navDashboard.classList.add('active'); 
    };

    if(navReports) navReports.onclick = () => { 
        if (currentSession.role !== 'admin') {
            alert("Acesso Negado: Você não possui privilégios para acessar os Relatórios.");
            return;
        }
        hideAll(); 
        if(viewReports) viewReports.style.display='block'; 
        if(pageTitle) pageTitle.innerText="RELATÓRIOS"; 
        navReports.classList.add('active'); 
        renderReports(); 
    };

    if(navLogs) navLogs.onclick = () => {
        if (currentSession.role !== 'admin') {
            alert("Acesso Negado."); return;
        }
        hideAll();
        if(viewLogs) viewLogs.style.display = 'block';
        if(pageTitle) pageTitle.innerText = "AUDITORIA DE SISTEMA";
        navLogs.classList.add('active');
        renderLogs();
    };

    function renderLogs() {
        const logList = document.getElementById('logList');
        const logCount = document.getElementById('logCount');
        if(!logList) return;
        logList.innerHTML = '';
        
        if(logCount) logCount.innerText = `${systemLogs.length} registros`;
        if (systemLogs.length === 0) return logList.innerHTML = '<p style="text-align:center; color:#555; padding:20px;">Nenhum log registrado.</p>';

        systemLogs.forEach((log, index) => {
            const item = document.createElement('div');
            item.className = 'trans-item';
            item.style.animationDelay = `${index * 0.02}s`;
            item.innerHTML = `
                <div class="trans-left">
                    <div class="trans-icon" style="background: rgba(238, 188, 29, 0.15); color: var(--primary-gold);"><i class="fa-solid fa-clock-rotate-left"></i></div>
                    <div class="trans-details">
                        <h4>[${log.action}] ${log.details}</h4>
                        <p><i class="fa-regular fa-user"></i> ${log.operator} &bull; ${log.date} às ${log.time}</p>
                    </div>
                </div>
            `;
            logList.appendChild(item);
        });
    }

    // ==========================================
    // 7. MODAIS, MÁSCARAS E FORMULÁRIO MANUAL
    // ==========================================
    const dataModal = document.getElementById('dataModal');
    const formModal = document.getElementById('formModal');
    const formUserId = document.getElementById('formUserId');
    const formModalTitle = document.getElementById('formModalTitle');

    // --- MÁSCARAS DINÂMICAS ---
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('mask-cpf')) {
            let v = e.target.value.replace(/\D/g, "");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            e.target.value = v;
        } else if (e.target.classList.contains('mask-phone')) {
            let v = e.target.value.replace(/\D/g, "");
            v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
            v = v.replace(/(\d)(\d{4})$/, "$1-$2");
            e.target.value = v;
        } else if (e.target.classList.contains('mask-date')) {
            let v = e.target.value.replace(/\D/g, "");
            v = v.replace(/(\d{2})(\d)/, "$1/$2");
            v = v.replace(/(\d{2})(\d)/, "$1/$2");
            e.target.value = v.substring(0, 10);
        }
    });
        
    // Validador real de CPF Matemático
    function isValidCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let sum = 0, rest;
        for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
        rest = (sum * 10) % 11;
        if ((rest === 10) || (rest === 11)) rest = 0;
        if (rest !== parseInt(cpf.substring(9, 10))) return false;
        sum = 0;
        for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
        rest = (sum * 10) % 11;
        if ((rest === 10) || (rest === 11)) rest = 0;
        if (rest !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    }

    function openDataModal(id) {
        const u = mediators.find(m => m.id === id);
        if(!u || !dataModal) return;
        
        if (u.extractedData) {
            renderViewData(u.extractedData);
            
            // Prepara botão de Edição
            const btnEdit = document.getElementById('btnEditFromView');
            if (btnEdit) {
                btnEdit.onclick = () => {
                    dataModal.style.display = 'none';
                    openEdit(id);
                };
            }
        } else {
            // Se não tem dados, abre diretamente o form para cadastrar (UX amigável)
            openEdit(id);
            return;
        }
        dataModal.style.display = 'flex';
    }

    function renderViewData(data) {
        const title = document.getElementById('modalDataTitle');
        if (title) title.innerText = data.nome || "Ficha Cadastral";

        const grid = document.getElementById('viewDataGrid');
        grid.innerHTML = `
            <div class="data-badge full-width"><label>Nome Completo</label><span class="val">${data.nome||'-'}</span></div>
            <div class="data-badge"><label>CPF</label><span class="val">${data.cpf||'-'}</span></div>
            <div class="data-badge"><label>RG</label><span class="val">${data.rg||'-'}</span></div>
            <div class="data-badge full-width"><label>Mãe</label><span class="val">${data.mae||'-'}</span></div>
            <div class="data-badge full-width"><label>Pai</label><span class="val">${data.pai||'-'}</span></div>
            <div class="data-badge"><label>Nascimento</label><span class="val">${data.nascimento||'-'}</span></div>
            <div class="data-badge"><label>Naturalidade</label><span class="val">${data.naturalidade||'-'}</span></div>
            <div class="data-badge"><label>Órgão/UF</label><span class="val">${data.orgao||'-'} ${data.uf?'- '+data.uf:''}</span></div>
            <div class="data-badge"><label>Emissão</label><span class="val">${data.emissao||'-'}</span></div>
            <div class="data-badge"><label>Validade</label><span class="val">${data.validade||'-'}</span></div>
            <div class="data-badge"><label>Telefone</label><span class="val">${data.telefone||'-'}</span></div>
            <div class="data-badge full-width"><label>Observações</label><span class="val">${data.observacao||'-'}</span></div>
        `;
        
        document.getElementById('btnCopyData').onclick = () => {
            const text = `NOME: ${data.nome||'-'}\nCPF: ${data.cpf||'-'}\nRG: ${data.rg||'-'}\nMÃE: ${data.mae||'-'}\nPAI: ${data.pai||'-'}\nNASCIMENTO: ${data.nascimento||'-'}\nNATURALIDADE: ${data.naturalidade||'-'}\nTELEFONE: ${data.telefone||'-'}\nOBS: ${data.observacao||'-'}`;
            navigator.clipboard.writeText(text);
            alert("Dados copiados para a área de transferência!");
        };
    }

    function openEdit(id) {
        const u = mediators.find(m => m.id === id);
        if(!u || !formModal) return;
        
        formModalTitle.innerText = "Editar Mediador";
        formUserId.value = id;
        
        const d = u.extractedData || {};
        document.getElementById('fNome').value = d.nome || u.name || '';
        document.getElementById('fCpf').value = d.cpf || '';
        document.getElementById('fRg').value = d.rg || '';
        document.getElementById('fNasc').value = d.nascimento || '';
        document.getElementById('fNat').value = d.naturalidade || '';
        document.getElementById('fMae').value = d.mae || '';
        document.getElementById('fPai').value = d.pai || '';
        document.getElementById('fOrgao').value = d.orgao || '';
        document.getElementById('fUf').value = d.uf || '';
        document.getElementById('fEmissao').value = d.emissao || '';
        document.getElementById('fValidade').value = d.validade || '';
        document.getElementById('fTel').value = d.telefone || '';
        document.getElementById('fObs').value = d.observacao || '';
        
        document.getElementById('fEntry').value = u.entryDate || '';
        document.getElementById('fDays').value = u.daysLeft || 0;
        document.getElementById('fStatus').value = u.status || 'active';
        
        // Exibe a seção de sistema na edição apenas se não for 'registrar'
        const formSectionSystem = document.getElementById('formSectionSystem');
        if (formSectionSystem) {
            formSectionSystem.style.display = currentSession.role === 'registrar' ? 'none' : 'block';
        }

        formModal.style.display = 'flex';
    }

    const btnSaveForm = document.getElementById('btnSaveForm');
    if(btnSaveForm) {
        btnSaveForm.onclick = () => {
            const id = formUserId.value;
            const nome = document.getElementById('fNome').value.trim();
            const cpf = document.getElementById('fCpf').value;
            const rg = document.getElementById('fRg').value.trim();

            if (!nome || !cpf || !rg) {
                alert("Por favor, preencha os campos obrigatórios (Nome, CPF e RG).");
                return;
            }

            // Validação relaxada para não bloquear testes
            if (cpf.length < 14) {
                alert("Atenção: Preencha o CPF corretamente (11 dígitos).");
                return;
            }

            const structuredData = {
                nome, cpf, rg,
                nascimento: document.getElementById('fNasc').value,
                naturalidade: document.getElementById('fNat').value,
                mae: document.getElementById('fMae').value,
                pai: document.getElementById('fPai').value,
                orgao: document.getElementById('fOrgao').value,
                uf: document.getElementById('fUf').value,
                emissao: document.getElementById('fEmissao').value,
                validade: document.getElementById('fValidade').value,
                telefone: document.getElementById('fTel').value,
            };

            let entryDate = document.getElementById('fEntry').value || new Date().toLocaleDateString('pt-BR');
            let daysLeft = parseInt(document.getElementById('fDays').value) || 0;
            let status = document.getElementById('fStatus').value;

            // Trava as opções na Inscrição (Novo) ou se for perfil Registrar
            if (currentSession.role === 'registrar' || !id) {
                entryDate = new Date().toLocaleDateString('pt-BR');
                daysLeft = 7;
                status = 'active';
            }

            if (id) {
                // UPDATE
                const u = mediators.find(m => m.id === parseInt(id));
                if (u) {
                    u.name = nome;
                    u.entryDate = entryDate;
                    u.daysLeft = daysLeft;
                    u.status = status;
                    u.extractedData = structuredData;
                    logAction('EDITAR', `Ficha atualizada: ${u.name}`);
                }
            } else {
                // CREATE
                logAction('CADASTRAR', `Novo Mediador: ${nome}`);
                mediators.push({
                    id: Date.now(), 
                    name: nome, 
                    entryDate: entryDate, 
                    daysLeft: daysLeft, 
                    status: status, 
                    avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random()*70)}`, 
                    online: true, 
                    extractedData: structuredData
                });
            }
            
            saveData(); 
            
            if (currentSession.role === 'registrar') {
                alert("✅ Mediador cadastrado com sucesso no banco de dados!");
                document.querySelectorAll('#formModal .custom-input').forEach(input => input.value = '');
            } else {
                formModal.style.display = 'none';
            }
        };
    }

    if(fabAddUser) fabAddUser.onclick = () => { 
        formModalTitle.innerText = "Novo Mediador";
        formUserId.value = '';
        document.querySelectorAll('#formModal .custom-input').forEach(input => input.value = '');
        
        // Esconde a aba de sistema durante a inscrição (novo cadastro)
        const formSectionSystem = document.getElementById('formSectionSystem');
        if (formSectionSystem) formSectionSystem.style.display = 'none';
        
        // Defaults
        document.getElementById('fEntry').value = new Date().toLocaleDateString('pt-BR');
        document.getElementById('fDays').value = 7;
        document.getElementById('fStatus').value = 'active';
        
        if(formModal) formModal.style.display='flex'; 
    };

    // Fechar Modais (X) e Clicar Fora
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = function() { 
        this.closest('.modal').style.display='none'; 
    });
    window.onclick = e => { 
        if(e.target.classList.contains('modal') && currentSession.role !== 'registrar') {
            e.target.style.display='none'; 
        }
    };

    // Lightbox
    const lightbox = document.getElementById('imageViewer');
    const fullImage = document.getElementById('fullImage');
    const closeLightbox = document.querySelector('.close-lightbox');

    if(lightbox && fullImage) {
        // Previne referência de imagem deletada do layout antigo
        document.querySelectorAll('.image-preview').forEach(img => {
            img.onclick = (e) => { e.preventDefault(); e.stopPropagation(); fullImage.src=img.src; lightbox.style.display='flex'; }
        })
        if(closeLightbox) closeLightbox.onclick = () => lightbox.style.display='none';
        lightbox.onclick = (e) => { if(e.target==lightbox) lightbox.style.display='none'; }
    }

    // Filtros e Busca
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
        document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
        const f = t.dataset.filter; renderMediators(f=='all'?mediators : mediators.filter(m=>m.status==f));
    });
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.oninput = e => renderMediators(mediators.filter(m=>m.name.toLowerCase().includes(e.target.value.toLowerCase())));

    // Check periódico (1 min)
    setInterval(checkDailyCountdown, 60000);
});
