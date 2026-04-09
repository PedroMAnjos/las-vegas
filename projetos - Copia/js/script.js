// =========================================================================
// SUA URL DE CONEXÃO ATUALIZADA
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzbJJ7eTembJFbAaBxI7aFCo87lN_-RBIsb5HYgapo1YpEMCVcKSUlGza_tOGPzG9tAQw/exec";
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    
    let mediators = [];
    let transactions = [];
    let termoPesquisa = ""; // Armazena o que o usuário digita

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
                location.reload();
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

    // --- 2. BARRA DE PESQUISA (NOVO) ---
    // Procura o input dentro de uma div com classe 'search-bar' ou um input de pesquisa
    const searchInput = document.querySelector('.search-bar input') || document.querySelector('input[type="text"]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            termoPesquisa = e.target.value.toLowerCase();
            renderMediators(); // Re-renderiza a cada letra digitada
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
            console.log("Sincronizando com o Banco de Dados...");
        }
    }

    // --- 4. SALVAR MUDANÇAS ---
    async function syncToCloud(type, extraData = null) {
        let body = {};
        if (type === "TRANSACTION") {
            body = { type, ...extraData };
        } else if (type === "UPDATE_EQUIPE") {
            body = { type: "UPDATE_EQUIPE", data: mediators };
        } else if (type === "DELETE_MEMBER") {
            body = { type: "DELETE_MEMBER", deletedName: extraData.name, data: mediators };
        }

        try {
            await fetch(URL_PLANILHA, { method: 'POST', body: JSON.stringify(body) });
        } catch(e) {
            console.log("Erro ao salvar.");
        }
    }

    function renderAll() {
        renderMediators();
        updateFinanceUI();
    }

    // --- 5. RENDERIZAR EQUIPE (COM PESQUISA E CARGOS ILIMITADOS) ---
    function renderMediators() {
        const list = document.getElementById('mediatorList');
        if(!list) return;
        list.innerHTML = '';
        
        // Aplica o filtro da barra de pesquisa
        const membrosFiltrados = mediators.filter(m => 
            m.name.toLowerCase().includes(termoPesquisa) || 
            m.role.toLowerCase().includes(termoPesquisa)
        );

        membrosFiltrados.forEach(user => {
            const cargo = user.role.toUpperCase();
            
            // LÓGICA DE CARGOS ILIMITADOS DEFINIDA NO JS
            const isIlimitado = cargo.includes("SUPORTE") || cargo.includes("AUXILIAR");
            const isExp = !isIlimitado && user.daysLeft <= 0;

            const textoTempo = isIlimitado ? "ILIMITADO" : (isExp ? "EXPIRADO" : user.daysLeft + " dias");
            const corTempo = isExp ? "text-red" : "text-green";

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
                    <span class="${corTempo} font-weight-bold">${textoTempo}</span>
                </div>
                <div class="row-actions">
                    <button class="action-btn text-green btn-renovar" data-id="${user.id}">+7 DIAS</button>
                    <button class="action-btn text-yellow btn-cargo" data-id="${user.id}">CARGO</button>
                    <button class="action-btn text-red btn-excluir" data-id="${user.id}"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            list.appendChild(row);
        });
        
        if(document.getElementById('totalCount')) document.getElementById('totalCount').innerText = membrosFiltrados.length;
        if(document.getElementById('alertCount')) {
            const expirados = membrosFiltrados.filter(m => {
                const c = m.role.toUpperCase();
                return !c.includes("SUPORTE") && !c.includes("AUXILIAR") && m.daysLeft <= 0;
            }).length;
            document.getElementById('alertCount').innerText = expirados;
        }
    }

    // --- 6. EVENTOS DE CLIQUE (BOTÕES FUNCIONAIS) ---
    const listContainer = document.getElementById('mediatorList');
    if (listContainer) {
        listContainer.addEventListener('click', async (e) => {
            // Garante que pegamos o botão mesmo se clicar no ícone dentro dele
            const btn = e.target.closest('button');
            if(!btn) return;
            
            const id = btn.dataset.id;
            const u = mediators.find(m => m.id == id);
            if(!u) return;

            if (btn.classList.contains('btn-renovar')) {
                u.daysLeft = parseInt(u.daysLeft || 0) + 7;
                renderMediators();
                await syncToCloud("UPDATE_EQUIPE");
            } 
            else if (btn.classList.contains('btn-cargo')) {
                const novo = prompt("Novo Cargo:", u.role);
                if(novo) { 
                    u.role = novo.toUpperCase(); 
                    renderMediators(); 
                    await syncToCloud("UPDATE_EQUIPE"); 
                }
            } 
            else if (btn.classList.contains('btn-excluir')) {
                if(confirm(`Deseja EXCLUIR e bloquear ${u.name}?`)) {
                    const deletedName = u.name;
                    mediators = mediators.filter(m => m.id != id);
                    renderMediators();
                    await syncToCloud("DELETE_MEMBER", { name: deletedName });
                }
            }
        });
    }

    // --- 7. FINANCEIRO E NAVEGAÇÃO ---
    function updateFinanceUI() {
        const total = transactions.reduce((acc, t) => acc + t.value, 0);
        const display = document.getElementById('displayBalance');
        if(display) {
            display.innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
            display.className = `balance-value ${total >= 0 ? 'positive' : 'negative'}`;
        }
    }

    // --- 8. ATUALIZAÇÃO AUTOMÁTICA (15s) ---
    setInterval(() => {
        if (localStorage.getItem('sysIsLoggedIn') === 'true') {
            loadData();
        }
    }, 15000);
});
