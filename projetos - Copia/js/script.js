// =========================================================================
// SUA URL DE CONEXÃO DEFINITIVA
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxyMFcjAtjdQ8oIUQWXbx4cFkOmjXpl2rVjPvZ2djd1sDNO47dhh-ivJKrNAlwbULv8Lg/exec";
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    
    let mediators = [];
    let transactions = [];

    // --- 1. SISTEMA DE LOGIN ---
    if (localStorage.getItem('sysIsLoggedIn') === 'true') {
        if(loginScreen) loginScreen.style.display = 'none';
        if(appScreen) appScreen.style.display = 'block';
        loadData();
    }

    const btnLogin = document.getElementById('btnLogin');
    if(btnLogin) {
        btnLogin.onclick = () => {
            const u = document.getElementById('loginUser').value;
            const p = document.getElementById('loginPass').value;
            if (u === 'pedro' && p === 'mestre') {
                localStorage.setItem('sysIsLoggedIn', 'true');
                if(loginScreen) loginScreen.style.display = 'none';
                if(appScreen) appScreen.style.display = 'block';
                loadData();
            } else {
                document.getElementById('loginError').style.display = 'block';
            }
        };
    }

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.onclick = () => {
            if(confirm("Deseja sair do sistema?")) {
                localStorage.removeItem('sysIsLoggedIn');
                location.reload();
            }
        };
    }

    // --- 2. CARREGAR DADOS (AGORA SILENCIOSO) ---
    async function loadData() {
        try {
            const res = await fetch(URL_PLANILHA, { method: 'GET', redirect: 'follow' });
            const data = await res.json();
            mediators = data.equipe || [];
            transactions = data.financeiro || [];
            renderAll();
        } catch (e) {
            console.log("Aguardando conexão..."); // Esconde o erro pra não poluir caso a internet pisque
        }
    }

    // --- 3. SALVAR MUDANÇAS ---
    async function syncToCloud(type, extraData = null) {
        const body = type === "TRANSACTION" 
            ? { type, ...extraData } 
            : { type: "UPDATE_EQUIPE", data: mediators };

        try {
            await fetch(URL_PLANILHA, { method: 'POST', body: JSON.stringify(body) });
        } catch(e) {
            alert("Erro ao salvar no Google. Verifique a internet.");
        }
    }

    function renderAll() {
        renderMediators();
        updateFinanceUI();
    }

    // --- 4. BOTÕES DE ATUALIZAR E ADICIONAR ---
    const btnSync = document.getElementById('btnSyncDrive');
    if(btnSync) {
        btnSync.onclick = async () => {
            btnSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ATUALIZANDO...';
            await loadData();
            btnSync.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> ATUALIZAR DADOS';
        };
    }

    function adicionarMembroManual() {
        const nome = prompt("Digite o nome do novo membro:");
        if (!nome || nome.trim() === "") return;
        
        const cargo = prompt("Qual o cargo? (Ex: ADM, SUP, AUX):", "PENDENTE");
        
        mediators.unshift({
            id: new Date().getTime(),
            name: nome.toUpperCase(),
            role: cargo ? cargo.toUpperCase() : "PENDENTE",
            daysLeft: 0,
            idForm: "Manual"
        });
        
        renderMediators();
        syncToCloud("UPDATE_EQUIPE");
    }

    const btnNovoAmarelo = document.getElementById('btnNovoMembro');
    const btnNovoFlutuante = document.getElementById('btnNovoFlutuante');
    if(btnNovoAmarelo) btnNovoAmarelo.onclick = adicionarMembroManual;
    if(btnNovoFlutuante) btnNovoFlutuante.onclick = adicionarMembroManual;

    // --- 5. FINANCEIRO ---
    const btnAddInc = document.getElementById('btnAddIncome');
    if(btnAddInc) {
        btnAddInc.onclick = async () => {
            const val = parseFloat(document.getElementById('incValue').value);
            const desc = document.getElementById('incCategory').value;
            if(val > 0) {
                document.getElementById('incValue').value = '';
                transactions.unshift({ date: new Date().toLocaleDateString('pt-BR'), desc, value: val });
                updateFinanceUI();
                await syncToCloud("TRANSACTION", { desc, value: val });
            }
        };
    }

    const btnAddExp = document.getElementById('btnAddExpense');
    if(btnAddExp) {
        btnAddExp.onclick = async () => {
            const val = parseFloat(document.getElementById('expValue').value);
            const desc = document.getElementById('expCategory').value;
            if(val > 0) {
                document.getElementById('expValue').value = '';
                transactions.unshift({ date: new Date().toLocaleDateString('pt-BR'), desc, value: -val });
                updateFinanceUI();
                await syncToCloud("TRANSACTION", { desc, value: -val });
            }
        };
    }

    function updateFinanceUI() {
        const total = transactions.reduce((acc, t) => acc + t.value, 0);
        const display = document.getElementById('displayBalance');
        if(display) {
            display.innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
            display.className = `balance-value ${total >= 0 ? 'positive' : 'negative'}`;
        }

        const list = document.getElementById('transactionList');
        if(list) {
            list.innerHTML = '';
            transactions.forEach(t => {
                const isInc = t.value >= 0;
                list.innerHTML += `
                    <div class="trans-item">
                        <div class="trans-left">
                            <div class="trans-icon ${isInc?'green':'red'}"><i class="fa-solid ${isInc?'fa-arrow-up':'fa-arrow-down'}"></i></div>
                            <div><h4>${t.desc}</h4><p style="font-size:0.7rem; color:#888;">${t.date}</p></div>
                        </div>
                        <div class="${isInc?'text-green':'text-red'} font-weight-bold">${Math.abs(t.value).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
                    </div>`;
            });
        }
    }

    // --- 6. NAVEGAÇÃO ---
    const views = ['viewMediators', 'viewDashboard', 'viewReports'];
    const navs = ['navMediators', 'navDashboard', 'navReports'];

    navs.forEach((navId, idx) => {
        const btn = document.getElementById(navId);
        if(btn) {
            btn.onclick = () => {
                views.forEach(v => {
                    const el = document.getElementById(v);
                    if(el) el.style.display = 'none';
                });
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                
                const targetView = document.getElementById(views[idx]);
                if(targetView) targetView.style.display = 'block';
                
                btn.classList.add('active');
                
                const titleEl = document.getElementById('pageTitle');
                if(titleEl) titleEl.innerText = navId.replace('nav', '').toUpperCase();
            };
        }
    });

    // --- 7. RENDERIZAR EQUIPE ---
    function renderMediators() {
        const list = document.getElementById('mediatorList');
        if(!list) return;
        list.innerHTML = '';
        
        mediators.forEach(user => {
            const isExp = user.daysLeft <= 0;
            const row = document.createElement('div');
            row.className = 'table-row';
            
            row.innerHTML = `
                <div class="row-info">
                    <div>
                        <h4 class="row-name">${user.name}</h4>
                        <span class="role-badge">${user.role}</span>
                        <span class="id-display">#${user.idForm || 'Sem ID'}</span>
                    </div>
                </div>
                <div class="row-status-col">
                    <span class="status-label">TEMPO RESTANTE</span>
                    <span class="${isExp ? 'text-red' : 'text-green'} font-weight-bold">${isExp ? 'EXPIRADO' : user.daysLeft + ' dias'}</span>
                </div>
                <div class="row-actions">
                    <button class="action-btn text-green btn-renovar" data-id="${user.id}">+7 DIAS</button>
                    <button class="action-btn text-yellow btn-cargo" data-id="${user.id}">CARGO</button>
                    <button class="action-btn text-red btn-excluir" data-id="${user.id}"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            list.appendChild(row);
        });
        
        const countEl = document.getElementById('totalCount');
        if(countEl) countEl.innerText = mediators.length;
        
        const alertEl = document.getElementById('alertCount');
        if(alertEl) alertEl.innerText = mediators.filter(m => m.daysLeft <= 0).length;
    }

    // --- 8. EVENTOS DE CLIQUE ---
    const listContainer = document.getElementById('mediatorList');
    if (listContainer) {
        listContainer.addEventListener('click', async (e) => {
            
            const btnRenovar = e.target.closest('.btn-renovar');
            if (btnRenovar) {
                const u = mediators.find(m => m.id == btnRenovar.dataset.id);
                if(u) { u.daysLeft = parseInt(u.daysLeft || 0) + 7; renderMediators(); await syncToCloud("UPDATE_EQUIPE"); }
                return;
            }

            const btnCargo = e.target.closest('.btn-cargo');
            if (btnCargo) {
                const u = mediators.find(m => m.id == btnCargo.dataset.id);
                if(u) {
                    const novo = prompt("Novo Cargo:", u.role);
                    if(novo) { u.role = novo.toUpperCase(); renderMediators(); await syncToCloud("UPDATE_EQUIPE"); }
                }
                return;
            }

            const btnExcluir = e.target.closest('.btn-excluir');
            if (btnExcluir) {
                if(confirm("Deseja realmente excluir este membro?")) {
                    mediators = mediators.filter(m => m.id != btnExcluir.dataset.id);
                    renderMediators(); await syncToCloud("UPDATE_EQUIPE");
                }
                return;
            }
        });
    }

    // =========================================================
    // 9. MOTOR AUTOMÁTICO (ATUALIZAÇÃO EM TEMPO REAL)
    // =========================================================
    // O site vai ao Google buscar novidades a cada 15 segundos
    setInterval(() => {
        if (localStorage.getItem('sysIsLoggedIn') === 'true') {
            loadData();
        }
    }, 15000); 
    // Nota: Deixamos em 15000 (15 segundos) para o Google não bloquear a sua planilha por "excesso de acessos".
});
