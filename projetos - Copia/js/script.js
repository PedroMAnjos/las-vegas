// =========================================================================
// SUA URL DE CONEXÃO DEFINITIVA
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzbJJ7eTembJFbAaBxI7aFCo87lN_-RBIsb5HYgapo1YpEMCVcKSUlGza_tOGPzG9tAQw/exec";
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    let mediators = [];
    let transactions = [];
    let termoPesquisa = "";

    // --- 1. CONTROLE DE ACESSO (LOGIN) ---
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');

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
            // Credenciais conforme seu HTML
            if (u === 'admin' && p === 'admin' || u === 'pedro' && p === 'mestre') {
                localStorage.setItem('sysIsLoggedIn', 'true');
                location.reload();
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

    // --- 2. BARRA DE PESQUISA FUNCIONAL ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            termoPesquisa = e.target.value.toLowerCase();
            renderMediators();
        });
    }

    // --- 3. CARREGAR DADOS ---
    async function loadData() {
        try {
            const res = await fetch(URL_PLANILHA, { method: 'GET', redirect: 'follow' });
            const data = await res.json();
            mediators = data.equipe || [];
            transactions = data.financeiro || [];
            renderAll();
        } catch (e) {
            console.error("Erro ao conectar com a planilha.");
        }
    }

    // --- 4. RENDERIZAR EQUIPE (LÓGICA ILIMITADA E PESQUISA) ---
    function renderMediators() {
        const list = document.getElementById('mediatorList');
        if(!list) return;
        list.innerHTML = '';
        
        // Filtra a lista com base no que foi digitado na busca
        const filtrados = mediators.filter(m => 
            (m.name || "").toLowerCase().includes(termoPesquisa) || 
            (m.role || "").toLowerCase().includes(termoPesquisa)
        );

        filtrados.forEach(user => {
            const cargo = (user.role || "").toUpperCase();
            
            // REGRA: SUPORTE E AUXILIAR SÃO ILIMITADOS
            const isIlimitado = cargo.includes("SUPORTE") || cargo.includes("AUXILIAR") || cargo.includes("SUP") || cargo.includes("AUX");
            const isExp = !isIlimitado && (parseInt(user.daysLeft) <= 0);

            const textoTempo = isIlimitado ? "ILIMITADO" : (isExp ? "EXPIRADO" : user.daysLeft + " dias");
            const corTempo = isExp ? "text-red" : "text-green";

            const row = document.createElement('div');
            row.className = 'table-row'; // Mantendo sua classe do CSS
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
                    <span class="${corTempo} font-weight-bold">${textoTempo}</span>
                </div>
                <div class="row-actions">
                    <button class="action-btn text-green btn-renovar" data-id="${user.id}">+7 DIAS</button>
                    <button class="action-btn text-yellow btn-cargo" data-id="${user.id}">CARGO</button>
                    <button class="action-btn text-red btn-excluir" data-id="${user.id}"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            list.appendChild(row);
        });

        // Atualiza os números nos seus Stat Cards
        if(document.getElementById('totalCount')) document.getElementById('totalCount').innerText = filtrados.length;
        if(document.getElementById('alertCount')) {
            const expCount = filtrados.filter(m => {
                const c = (m.role || "").toUpperCase();
                const ilim = c.includes("SUPORTE") || c.includes("AUXILIAR") || c.includes("SUP") || c.includes("AUX");
                return !ilim && m.daysLeft <= 0;
            }).length;
            document.getElementById('alertCount').innerText = expCount;
        }
    }

    // --- 5. EVENTOS DE CLIQUE NOS BOTÕES (RENOVAR, CARGO, EXCLUIR) ---
    const listContainer = document.getElementById('mediatorList');
    if (listContainer) {
        listContainer.onclick = async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            const id = btn.dataset.id;
            const u = mediators.find(m => m.id == id);
            if (!u) return;

            if (btn.classList.contains('btn-renovar')) {
                u.daysLeft = parseInt(u.daysLeft || 0) + 7;
                renderMediators();
                await syncToCloud("UPDATE_EQUIPE");
            } 
            else if (btn.classList.contains('btn-cargo')) {
                const novo = prompt("Novo Cargo para " + u.name + ":", u.role);
                if(novo) { 
                    u.role = novo.toUpperCase(); 
                    renderMediators(); 
                    await syncToCloud("UPDATE_EQUIPE"); 
                }
            } 
            else if (btn.classList.contains('btn-excluir')) {
                if(confirm("Bloquear " + u.name + " e enviar para lista negra?")) {
                    const nomeDeletado = u.name;
                    mediators = mediators.filter(m => m.id != id);
                    renderMediators();
                    await syncToCloud("DELETE_MEMBER", { name: nomeDeletado });
                }
            }
        };
    }

    // --- 6. SINCRONIZAR FORMS (BOTÃO AZUL) ---
    const btnSync = document.getElementById('btnSyncDrive');
    if(btnSync) {
        btnSync.onclick = async () => {
            btnSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SINCRONIZANDO...';
            await loadData();
            btnSync.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> SINCRONIZAR FORMS';
        };
    }

    // --- 7. COMUNICAÇÃO COM O GOOGLE ---
    async function syncToCloud(type, extraData = null) {
        let body = { type, data: mediators };
        if (type === "DELETE_MEMBER") body = { type, deletedName: extraData.name, data: mediators };
        
        try {
            await fetch(URL_PLANILHA, { method: 'POST', body: JSON.stringify(body) });
        } catch(e) { console.error("Erro ao sincronizar com o Google Sheets."); }
    }

    // --- 8. NAVEGAÇÃO E FINANCEIRO ---
    function renderAll() {
        renderMediators();
        updateFinanceUI();
    }

    function updateFinanceUI() {
        const total = transactions.reduce((acc, t) => acc + t.value, 0);
        const display = document.getElementById('displayBalance');
        if(display) display.innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    }

    const navs = {
        'navMediators': 'viewMediators',
        'navDashboard': 'viewDashboard',
        'navReports': 'viewReports'
    };

    Object.keys(navs).forEach(navId => {
        const btn = document.getElementById(navId);
        if(btn) {
            btn.onclick = () => {
                Object.values(navs).forEach(v => document.getElementById(v).style.display = 'none');
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                
                document.getElementById(navs[navId]).style.display = 'block';
                btn.classList.add('active');
                document.getElementById('pageTitle').innerText = btn.innerText.trim();
            };
        }
    });

    // --- 9. AUTO-REFRESH (15s) ---
    setInterval(() => {
        if (localStorage.getItem('sysIsLoggedIn') === 'true') loadData();
    }, 15000);
});
