// =========================================================================
// URL DO BANCO DE DADOS OFICIAL (LAS VEGAS)
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbyurX1ehcrJs1jcc6rNEEAtcBWGY_MnT2J_9w6jpZe2x58hXqgtU0atW4S1LPleG4cD/exec";
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    
    let mediators = [];
    let transactions = [];

    // --- 1. SISTEMA DE LOGIN ---
    if (localStorage.getItem('sysIsLoggedIn') === 'true') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        loadData();
    }

    const btnLogin = document.getElementById('btnLogin');
    if(btnLogin) {
        btnLogin.onclick = () => {
            const u = document.getElementById('loginUser').value;
            const p = document.getElementById('loginPass').value;
            if (u === 'pedro' && p === 'mestre') {
                localStorage.setItem('sysIsLoggedIn', 'true');
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('appScreen').style.display = 'block';
                loadData();
            } else {
                document.getElementById('loginError').style.display = 'block';
            }
        };
    }

    document.getElementById('btnLogout').onclick = () => {
        if(confirm("Deseja sair do sistema?")) {
            localStorage.removeItem('sysIsLoggedIn');
            location.reload();
        }
    };

    // --- 2. CARREGAR DADOS DA NUVEM ---
    async function loadData() {
        try {
            const res = await fetch(URL_PLANILHA, { method: 'GET', redirect: 'follow' });
            const data = await res.json();
            mediators = data.equipe || [];
            transactions = data.financeiro || [];
            renderAll();
        } catch (e) {
            console.error("Erro ao carregar dados do Google", e);
        }
    }

    // --- 3. SALVAR MUDANÇAS NA NUVEM ---
    async function syncToCloud(type, extraData = null) {
        const body = type === "TRANSACTION" 
            ? { type, ...extraData } 
            : { type: "UPDATE_EQUIPE", data: mediators };

        try {
            await fetch(URL_PLANILHA, {
                method: 'POST',
                body: JSON.stringify(body)
            });
            loadData(); // Recarrega os dados fresquinhos da nuvem
        } catch(e) {
            alert("Erro ao salvar. Verifique sua internet.");
        }
    }

    function renderAll() {
        renderMediators();
        updateFinanceUI();
    }

    // --- 4. ATUALIZAR / SINCRONIZAR TELA ---
    document.getElementById('btnSyncDrive').onclick = async () => {
        const btn = document.getElementById('btnSyncDrive');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ATUALIZANDO...';
        await loadData();
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> ATUALIZAR DADOS';
    };

    // --- 5. FINANCEIRO ---
    document.getElementById('btnAddIncome').onclick = async () => {
        const val = parseFloat(document.getElementById('incValue').value);
        const desc = document.getElementById('incCategory').value;
        if(val > 0) {
            document.getElementById('incValue').value = '';
            await syncToCloud("TRANSACTION", { desc, value: val });
        }
    };

    document.getElementById('btnAddExpense').onclick = async () => {
        const val = parseFloat(document.getElementById('expValue').value);
        const desc = document.getElementById('expCategory').value;
        if(val > 0) {
            document.getElementById('expValue').value = '';
            await syncToCloud("TRANSACTION", { desc, value: -val });
        }
    };

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

    // --- 6. NAVEGAÇÃO ENTRE TELAS ---
    const views = ['viewMediators', 'viewDashboard', 'viewReports'];
    const navs = ['navMediators', 'navDashboard', 'navReports'];

    navs.forEach((navId, idx) => {
        const btn = document.getElementById(navId);
        if(btn) {
            btn.onclick = () => {
                views.forEach(v => document.getElementById(v).style.display = 'none');
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                
                document.getElementById(views[idx]).style.display = 'block';
                btn.classList.add('active');
                document.getElementById('pageTitle').innerText = navId.replace('nav', '').toUpperCase();
            };
        }
    });

    // --- 7. RENDERIZAÇÃO DA EQUIPE ---
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
                    <button class="action-btn text-green" onclick="renovar('${user.id}')">+7 DIAS</button>
                    <button class="action-btn text-yellow" onclick="mudarCargo('${user.id}')">CARGO</button>
                    <button class="action-btn text-red" onclick="excluir('${user.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            list.appendChild(row);
        });
        
        document.getElementById('totalCount').innerText = mediators.length;
        document.getElementById('alertCount').innerText = mediators.filter(m => m.daysLeft <= 0).length;
    }

    // --- FUNÇÕES DE AÇÃO DA EQUIPE ---
    window.renovar = async (id) => {
        const u = mediators.find(m => m.id == id);
        if(u) {
            u.daysLeft = parseInt(u.daysLeft || 0) + 7;
            await syncToCloud("UPDATE_EQUIPE");
        }
    };

    window.mudarCargo = async (id) => {
        const u = mediators.find(m => m.id == id);
        if(u) {
            const novo = prompt("Novo Cargo (Ex: ADM, SUP, AUX):", u.role);
            if(novo) { 
                u.role = novo.toUpperCase(); 
                await syncToCloud("UPDATE_EQUIPE"); 
            }
        }
    };

    window.excluir = async (id) => {
        if(confirm("Deseja realmente excluir este membro?")) {
            mediators = mediators.filter(m => m.id != id);
            await syncToCloud("UPDATE_EQUIPE");
        }
    };
});
