/**
 * CORE SISTEMA - ANJOW SS
 * @author Pedro Mestre dos Anjos
 * @version 4.0 (Senior Production)
 */

const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbzbJJ7eTembJFbAaBxI7aFCo87lN_-RBIsb5HYgapo1YpEMCVcKSUlGza_tOGPzG9tAQw/exec",
    RELOAD_INTERVAL: 40000 // 40s para economizar cota da planilha
};

document.addEventListener('DOMContentLoaded', () => {
    let state = {
        mediators: [],
        searchTerm: "",
        currentView: "viewMediators"
    };

    // --- 1. BOOTSTRAP (INICIALIZAÇÃO) ---
    const init = () => {
        if (localStorage.getItem('sysIsLoggedIn') === 'true') {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            fetchData();
        }
        setupEventListeners();
    };

    // --- 2. COMUNICAÇÃO COM API ---
    async function fetchData() {
        try {
            const response = await fetch(CONFIG.API_URL, { method: 'GET', redirect: 'follow' });
            const result = await response.json();
            if (result.equipe) {
                state.mediators = deduplicate(result.equipe);
                renderAll();
            }
        } catch (err) { console.error("Erro de sincronia de dados."); }
    }

    async function pushData(type, extra = {}) {
        const body = { type, data: deduplicate(state.mediators), ...extra };
        try {
            await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(body) });
        } catch (err) { console.error("Erro ao salvar no Banco."); }
    }

    // --- 3. TRAVAS E FILTROS ---
    const deduplicate = (data) => {
        const seen = new Set();
        return data.filter(item => {
            const key = (item.name || "").toLowerCase().trim();
            return seen.has(key) ? false : seen.add(key);
        });
    };

    // --- 4. RENDERIZAÇÃO DE UI ---
    function renderMediators() {
        const list = document.getElementById('mediatorList');
        if (!list) return;
        list.innerHTML = '';

        const filtrados = state.mediators.filter(m => 
            m.name.toLowerCase().includes(state.searchTerm) || 
            m.role.toLowerCase().includes(state.searchTerm)
        );

        filtrados.forEach(user => {
            const role = (user.role || "").toUpperCase();
            // REGRA: SUPORTE E AUXILIAR SÃO ILIMITADOS
            const isUnlimited = role.includes("SUP") || role.includes("AUX");
            const isExp = !isUnlimited && parseInt(user.daysLeft) <= 0;

            const displayTime = isUnlimited ? "ILIMITADO" : (isExp ? "EXPIRADO" : `${user.daysLeft} Dias`);
            const statusClass = isExp ? "text-red" : "text-green";

            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <div class="row-info">
                    <h4 class="row-name">${user.name}</h4>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span class="role-badge badge-adm">${user.role}</span>
                        <small class="text-muted">#${user.idForm || 'Manual'}</small>
                    </div>
                </div>
                <div class="row-status-col">
                    <span class="${statusClass} days-count">${displayTime}</span>
                </div>
                <div class="row-actions">
                    <button class="action-btn text-white btn-renovar" data-id="${user.id}">+7 DIAS</button>
                    <button class="action-btn text-yellow btn-edit" data-id="${user.id}"><i class="fa-solid fa-user-gear"></i></button>
                    <button class="action-btn text-red btn-delete" data-id="${user.id}"><i class="fa-solid fa-trash-can"></i></button>
                </div>`;
            list.appendChild(row);
        });

        document.getElementById('totalCount').innerText = filtrados.length;
        document.getElementById('alertCount').innerText = filtrados.filter(m => {
            const r = m.role.toUpperCase();
            return !r.includes("SUP") && !r.includes("AUX") && m.daysLeft <= 0;
        }).length;
    }

    // --- 5. EVENT LISTENERS (SENIOR APPROACH) ---
    function setupEventListeners() {
        // Login
        document.getElementById('btnLogin').onclick = () => {
            const u = document.getElementById('loginUser').value;
            const p = document.getElementById('loginPass').value;
            if ((u === 'admin' && p === 'admin') || (u === 'pedro' && p === 'mestre')) {
                localStorage.setItem('sysIsLoggedIn', 'true');
                location.reload();
            } else { document.getElementById('loginError').style.display = 'block'; }
        };

        // Logout
        document.getElementById('btnLogout').onclick = () => {
            if(confirm("Deseja encerrar a sessão?")) {
                localStorage.removeItem('sysIsLoggedIn');
                location.reload();
            }
        };

        // Pesquisa
        document.getElementById('searchInput').oninput = (e) => {
            state.searchTerm = e.target.value.toLowerCase();
            renderMediators();
        };

        // Navegação (View Switcher)
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
                
                btn.classList.add('active');
                const target = btn.getAttribute('data-view');
                document.getElementById(target).style.display = 'block';
                document.getElementById('pageTitle').innerText = btn.innerText;
            };
        });

        // Event Delegation na Tabela
        document.getElementById('mediatorList').onclick = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = btn.dataset.id;
            const user = state.mediators.find(m => m.id == id);

            if (btn.classList.contains('btn-renovar')) {
                user.daysLeft = (parseInt(user.daysLeft) || 0) + 7;
                renderMediators();
                pushData("UPDATE_EQUIPE");
            } else if (btn.classList.contains('btn-edit')) {
                openEditModal(user);
            } else if (btn.classList.contains('btn-delete')) {
                if(confirm(`Bloquear ${user.name}?`)) {
                    state.mediators = state.mediators.filter(m => m.id != id);
                    renderMediators();
                    pushData("DELETE_MEMBER", { deletedName: user.name });
                }
            }
        };

        // Sincronizar
        document.getElementById('btnSyncDrive').onclick = async () => {
            document.getElementById('btnSyncDrive').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando';
            await fetchData();
            document.getElementById('btnSyncDrive').innerHTML = '<i class="fa-solid fa-rotate"></i> Sincronizar';
        };

        // Modais
        document.querySelector('.close-modal').onclick = () => document.getElementById('editModal').style.display = 'none';
        
        document.getElementById('btnSaveEdit').onclick = () => {
            const id = document.getElementById('editUserId').value;
            const u = state.mediators.find(m => m.id == id);
            u.name = document.getElementById('editName').value;
            u.role = document.getElementById('editRole').value;
            u.daysLeft = document.getElementById('editDays').value;
            document.getElementById('editModal').style.display = 'none';
            renderMediators();
            pushData("UPDATE_EQUIPE");
        };
    }

    function openEditModal(u) {
        document.getElementById('editUserId').value = u.id;
        document.getElementById('editName').value = u.name;
        document.getElementById('editRole').value = u.role;
        document.getElementById('editDays').value = u.daysLeft;
        document.getElementById('editModal').style.display = 'flex';
    }

    function renderAll() { renderMediators(); }

    init();
});
