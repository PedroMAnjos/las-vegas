// =========================================================================
// SUA URL DE CONEXÃO DEFINITIVA
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzbJJ7eTembJFbAaBxI7aFCo87lN_-RBIsb5HYgapo1YpEMCVcKSUlGza_tOGPzG9tAQw/exec";
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    let mediators = [];
    let transactions = [];
    let termoPesquisa = "";

    // Elementos da Interface
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    const editModal = document.getElementById('editModal');
    const closeModalButtons = document.querySelectorAll('.close-modal');

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
            if ((u === 'admin' && p === 'admin') || (u === 'pedro' && p === 'mestre')) {
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
            if(confirm("Deseja encerrar a sessão?")) {
                localStorage.removeItem('sysIsLoggedIn');
                location.reload();
            }
        };
    }

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
            if (data && data.equipe) {
                mediators = data.equipe;
                transactions = data.financeiro || [];
                renderAll();
            }
        } catch (e) {
            console.log("Erro na conexão com o banco de dados.");
        }
    }

    // --- 4. RENDERIZAR EQUIPE (LÓGICA ILIMITADA E FILTRO) ---
    function renderMediators() {
        const list = document.getElementById('mediatorList');
        if(!list) return;
        list.innerHTML = '';
        
        // Filtro de pesquisa
        const filtrados = mediators.filter(m => 
            (m.name || "").toLowerCase().includes(termoPesquisa) || 
            (m.role || "").toLowerCase().includes(termoPesquisa)
        );

        filtrados.forEach(user => {
            const cargo = (user.role || "").toUpperCase();
            
            // REGRA: SUPORTE E AUXILIAR SÃO ILIMITADOS NO VISUAL
            const isIlimitado = cargo.includes("SUP") || cargo.includes("AUX");
            const isExp = !isIlimitado && (parseInt(user.daysLeft) <= 0);

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

        // Atualização de contadores (Stat Cards)
        if(document.getElementById('totalCount')) document.getElementById('totalCount').innerText = filtrados.length;
        if(document.getElementById('alertCount')) {
            const expCount = filtrados.filter(m => {
                const c = (m.role || "").toUpperCase();
                return !c.includes("SUP") && !c.includes("AUX") && m.daysLeft <= 0;
            }).length;
            document.getElementById('alertCount').innerText = expCount;
        }
    }

    // --- 5. EVENTOS DE CLIQUE (BOTÕES E MODAL) ---
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
                // Abre o Edit Modal do seu HTML
                document.getElementById('editUserId').value = u.id;
                document.getElementById('editName').value = u.name;
                document.getElementById('editRole').value = u.role;
                document.getElementById('editDays').value = u.daysLeft;
                editModal.style.display = 'flex';
            } 
            else if (btn.classList.contains('btn-excluir')) {
                if(confirm("Bloquear " + u.name + " e mover para lista negra?")) {
                    const nomeDeletado = u.name;
                    mediators = mediators.filter(m => m.id != id);
                    renderMediators();
                    await syncToCloud("DELETE_MEMBER", { name: nomeDeletado });
                }
            }
        };
    }

    // Salvar edições do Modal
    const btnSaveEdit = document.getElementById('btnSaveEdit');
    if(btnSaveEdit) {
        btnSaveEdit.onclick = async () => {
            const id = document.getElementById('editUserId').value;
            const u = mediators.find(m => m.id == id);
            if(u) {
                u.name = document.getElementById('editName').value;
                u.role = document.getElementById('editRole').value;
                u.daysLeft = document.getElementById('editDays').value;
                editModal.style.display = 'none';
                renderMediators();
                await syncToCloud("UPDATE_EQUIPE");
            }
        };
    }

    // Fechar modais
    closeModalButtons.forEach(btn => {
        btn.onclick = () => {
            if(editModal) editModal.style.display = 'none';
            if(document.getElementById('addModal')) document.getElementById('addModal').style.display = 'none';
            if(document.getElementById('idModal')) document.getElementById('idModal').style.display = 'none';
        }
    });

    // --- 6. SINCRONIZAR FORMS (BOTÃO AZUL) ---
    const btnSync = document.getElementById('btnSyncDrive');
    if(btnSync) {
        btnSync.onclick = async () => {
            btnSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AGUARDE...';
            await loadData();
            btnSync.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> SINCRONIZAR FORMS';
        };
    }

    // --- 7. COMUNICAÇÃO COM O GOOGLE ---
    async function syncToCloud(type, extraData = null) {
        // Proteção para não limpar o banco se a lista local falhar
        if (type === "UPDATE_EQUIPE" && mediators.length === 0) return;

        let body = { type, data: mediators };
        if (type === "DELETE_MEMBER") body = { type, deletedName: extraData.name, data: mediators };
        
        try {
            await fetch(URL_PLANILHA, { method: 'POST', body: JSON.stringify(body) });
        } catch(e) { console.log("Erro ao sincronizar."); }
    }

    // --- 8. NAVEGAÇÃO DE ABAS ---
    const menuLinks = {
        'navMediators': 'viewMediators',
        'navDashboard': 'viewDashboard',
        'navReports': 'viewReports'
    };

    Object.keys(menuLinks).forEach(id => {
        const btn = document.getElementById(id);
        if(btn) {
            btn.onclick = () => {
                // Esconde todas as views
                Object.values(menuLinks).forEach(v => {
                    const el = document.getElementById(v);
                    if(el) el.style.display = 'none';
                });
                // Remove active de todos os nav-items
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                
                // Ativa a view correta
                document.getElementById(menuLinks[id]).style.display = 'block';
                btn.classList.add('active');
                document.getElementById('pageTitle').innerText = btn.innerText.trim();
            };
        }
    });

    function updateFinanceUI() {
        const total = transactions.reduce((acc, t) => acc + t.value, 0);
        const display = document.getElementById('displayBalance');
        if(display) display.innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    }

    function renderAll() {
        renderMediators();
        updateFinanceUI();
    }

    // Auto-refresh a cada 20 segundos
    setInterval(() => {
        if (localStorage.getItem('sysIsLoggedIn') === 'true') loadData();
    }, 20000);
});
