// =========================================================================
// SUA URL DE CONEXÃO ATUALIZADA
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzbJJ7eTembJFbAaBxI7aFCo87lN_-RBIsb5HYgapo1YpEMCVcKSUlGza_tOGPzG9tAQw/exec";
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

    // --- 2. CARREGAR DADOS ---
    async function loadData() {
        try {
            const res = await fetch(URL_PLANILHA, { method: 'GET', redirect: 'follow' });
            const data = await res.json();
            mediators = data.equipe || [];
            transactions = data.financeiro || [];
            renderAll();
        } catch (e) {
            console.log("Sincronizando com o Banco de Dados...");
        }
    }

    // --- 3. SALVAR MUDANÇAS (SUPORTE A EXCLUSÃO E FINANCEIRO) ---
    async function syncToCloud(type, extraData = null) {
        let body = {};
        
        if (type === "TRANSACTION") {
            body = { type, ...extraData };
        } else if (type === "UPDATE_EQUIPE") {
            body = { type: "UPDATE_EQUIPE", data: mediators };
        } else if (type === "DELETE_MEMBER") {
            // Envia o nome para a aba 'Excluidos' e a nova lista para 'EQUIPE'
            body = { type: "DELETE_MEMBER", deletedName: extraData.name, data: mediators };
        }

        try {
            await fetch(URL_PLANILHA, { method: 'POST', body: JSON.stringify(body) });
        } catch(e) {
            console.log("Erro ao salvar. Verifique a conexão.");
        }
    }

    function renderAll() {
        renderMediators();
        updateFinanceUI();
    }

    // --- 4. BOTÕES DE INTERFACE ---
    const btnSync = document.getElementById('btnSyncDrive');
    if(btnSync) {
        btnSync.onclick = async () => {
            btnSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ATUALIZANDO...';
            await loadData();
            btnSync.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> ATUALIZAR DADOS';
        };
    }

    function adicionarMembroManual() {
        const nome = prompt("Nome do novo membro:");
        if (!nome || nome.trim() === "") return;
        
        const cargo = prompt("Cargo (Ex: ADM, SUP, AUX):", "PENDENTE");
        
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
                        <span class="id-display">#${user.idForm || 'ID'}</span>
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
        
        if(document.getElementById('totalCount')) document.getElementById('totalCount').innerText = mediators.length;
        if(document.getElementById('alertCount')) document.getElementById('alertCount').innerText = mediators.filter(m => m.daysLeft <= 0).length;
    }

    // --- 8. EVENTOS DE CLIQUE (LIXEIRA E EDIÇÃO) ---
    const listContainer = document.getElementById('mediatorList');
    if (listContainer) {
        listContainer.addEventListener('click', async (e) => {
            const id = e.target.closest('button')?.dataset.id;
            if(!id) return;
            const u = mediators.find(m => m.id == id);

            if (e.target.closest('.btn-renovar')) {
                u.daysLeft = parseInt(u.daysLeft || 0) + 7;
                renderMediators();
                await syncToCloud("UPDATE_EQUIPE");
            } else if (e.target.closest('.btn-cargo')) {
                const novo = prompt("Novo Cargo:", u.role);
                if(novo) { u.role = novo.toUpperCase(); renderMediators(); await syncToCloud("UPDATE_EQUIPE"); }
            } else if (e.target.closest('.btn-excluir')) {
                if(confirm(`Deseja EXCLUIR e bloquear ${u.name}?`)) {
                    const deletedName = u.name;
                    mediators = mediators.filter(m => m.id != id);
                    renderMediators();
                    await syncToCloud("DELETE_MEMBER", { name: deletedName });
                }
            }
        });
    }

    // --- 9. ATUALIZAÇÃO AUTOMÁTICA (15s) ---
    setInterval(() => {
        if (localStorage.getItem('sysIsLoggedIn') === 'true') {
            loadData();
        }
    }, 15000);
});
