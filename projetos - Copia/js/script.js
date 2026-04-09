const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzbJJ7eTembJFbAaBxI7aFCo87lN_-RBIsb5HYgapo1YpEMCVcKSUlGza_tOGPzG9tAQw/exec";

document.addEventListener('DOMContentLoaded', () => {
    let mediators = [];
    let transactions = [];
    let termoPesquisa = "";

    // --- 1. TRAVA ANTI-DUPLICATA ---
    function removerDuplicatas(lista) {
        const nomesVistos = new Set();
        return lista.filter(m => {
            const nome = (m.name || "").toLowerCase().trim();
            if (nomesVistos.has(nome)) return false;
            nomesVistos.add(nome);
            return true;
        });
    }

    // --- 2. LOGIN ---
    if (localStorage.getItem('sysIsLoggedIn') === 'true') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        loadData();
    }

    document.getElementById('btnLogin').onclick = () => {
        const u = document.getElementById('loginUser').value;
        const p = document.getElementById('loginPass').value;
        if ((u === 'admin' && p === 'admin') || (u === 'pedro' && p === 'mestre')) {
            localStorage.setItem('sysIsLoggedIn', 'true');
            location.reload();
        } else {
            document.getElementById('loginError').style.display = 'block';
        }
    };

    document.getElementById('btnLogout').onclick = () => {
        if(confirm("Sair do sistema?")) {
            localStorage.removeItem('sysIsLoggedIn');
            location.reload();
        }
    };

    // --- 3. CARREGAR DADOS ---
    async function loadData() {
        try {
            const res = await fetch(URL_PLANILHA, { method: 'GET', redirect: 'follow' });
            const data = await res.json();
            if (data.equipe) {
                mediators = removerDuplicatas(data.equipe);
                transactions = data.financeiro || [];
                renderAll();
            }
        } catch (e) { console.log("Erro ao carregar dados."); }
    }

    // --- 4. PESQUISA ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            termoPesquisa = e.target.value.toLowerCase();
            renderMediators();
        });
    }

    // --- 5. RENDERIZAÇÃO (ILIMITADOS + FILTRO) ---
    function renderMediators() {
        const list = document.getElementById('mediatorList');
        if(!list) return;
        list.innerHTML = '';
        
        const filtrados = mediators.filter(m => 
            (m.name || "").toLowerCase().includes(termoPesquisa) || 
            (m.role || "").toLowerCase().includes(termoPesquisa)
        );

        filtrados.forEach(user => {
            const cargo = (user.role || "").toUpperCase();
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
                    <span class="${corTempo} font-weight-bold">${textoTempo}</span>
                </div>
                <div class="row-actions">
                    <button class="action-btn text-green btn-renovar" data-id="${user.id}">+7</button>
                    <button class="action-btn text-yellow btn-cargo" data-id="${user.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn text-red btn-excluir" data-id="${user.id}"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            list.appendChild(row);
        });

        document.getElementById('totalCount').innerText = filtrados.length;
        document.getElementById('alertCount').innerText = filtrados.filter(m => {
            const c = (m.role || "").toUpperCase();
            return !c.includes("SUP") && !c.includes("AUX") && m.daysLeft <= 0;
        }).length;
    }

    // --- 6. EVENTOS DE CLIQUE ---
    document.getElementById('mediatorList').onclick = async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;
        const u = mediators.find(m => m.id == id);

        if (btn.classList.contains('btn-renovar')) {
            u.daysLeft = parseInt(u.daysLeft || 0) + 7;
            renderMediators();
            await syncToCloud("UPDATE_EQUIPE");
        } else if (btn.classList.contains('btn-cargo')) {
            document.getElementById('editUserId').value = u.id;
            document.getElementById('editName').value = u.name;
            document.getElementById('editRole').value = u.role;
            document.getElementById('editDays').value = u.daysLeft;
            document.getElementById('editModal').style.display = 'flex';
        } else if (btn.classList.contains('btn-excluir')) {
            if(confirm(`Excluir ${u.name}?`)) {
                const n = u.name;
                mediators = mediators.filter(m => m.id != id);
                renderMediators();
                await syncToCloud("DELETE_MEMBER", { name: n });
            }
        }
    };

    // Salvar do Modal
    document.getElementById('btnSaveEdit').onclick = async () => {
        const id = document.getElementById('editUserId').value;
        const u = mediators.find(m => m.id == id);
        if(u) {
            u.name = document.getElementById('editName').value;
            u.role = document.getElementById('editRole').value;
            u.daysLeft = document.getElementById('editDays').value;
            document.getElementById('editModal').style.display = 'none';
            renderMediators();
            await syncToCloud("UPDATE_EQUIPE");
        }
    };

    // Abrir modal novo
    document.getElementById('btnAddNewDesktop').onclick = () => document.getElementById('addModal').style.display = 'flex';
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => {
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('addModal').style.display = 'none';
    });

    // --- 7. COMUNICAÇÃO ---
    async function syncToCloud(type, extraData = null) {
        const listaLimpa = removerDuplicatas(mediators);
        let body = { type, data: listaLimpa };
        if (type === "DELETE_MEMBER") body = { type, deletedName: extraData.name, data: listaLimpa };
        try {
            await fetch(URL_PLANILHA, { method: 'POST', body: JSON.stringify(body) });
        } catch(e) { console.log("Erro ao sincronizar."); }
    }

    // Navegação de abas
    const navs = {'navMediators': 'viewMediators', 'navDashboard': 'viewDashboard', 'navReports': 'viewReports'};
    Object.keys(navs).forEach(id => {
        const b = document.getElementById(id);
        if(b) {
            b.onclick = () => {
                Object.values(navs).forEach(v => document.getElementById(v).style.display = 'none');
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.getElementById(navs[id]).style.display = 'block';
                b.classList.add('active');
                document.getElementById('pageTitle').innerText = b.innerText.trim();
            };
        }
    });

    function renderAll() { 
        renderMediators(); 
        const total = transactions.reduce((acc, t) => acc + t.value, 0);
        document.getElementById('displayBalance').innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    }

    document.getElementById('btnSyncDrive').onclick = async () => {
        document.getElementById('btnSyncDrive').innerText = "SINCRONIZANDO...";
        await loadData();
        document.getElementById('btnSyncDrive').innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> SINCRONIZAR';
    };

    setInterval(() => { if (localStorage.getItem('sysIsLoggedIn') === 'true') loadData(); }, 20000);
});
