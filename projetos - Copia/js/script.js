const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzbJJ7eTembJFbAaBxI7aFCo87lN_-RBIsb5HYgapo1YpEMCVcKSUlGza_tOGPzG9tAQw/exec";

document.addEventListener('DOMContentLoaded', () => {
    let mediators = [];
    let transactions = [];
    let termoPesquisa = "";

    // --- TRAVA ANTI-REPETIÇÃO ---
    function deduplicate(data) {
        const seen = new Set();
        return data.filter(item => {
            const val = (item.name || "").toLowerCase().trim();
            return seen.has(val) ? false : seen.add(val);
        });
    }

    // --- LOGIN ---
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
        if(confirm("Deseja sair?")) {
            localStorage.removeItem('sysIsLoggedIn');
            location.reload();
        }
    };

    // --- CARREGAR DADOS ---
    async function loadData() {
        try {
            const res = await fetch(URL_PLANILHA, { method: 'GET', redirect: 'follow' });
            const data = await res.json();
            if (data.equipe) {
                mediators = deduplicate(data.equipe);
                transactions = data.financeiro || [];
                renderAll();
            }
        } catch (e) { console.error("Falha na carga."); }
    }

    // --- PESQUISA ---
    document.getElementById('searchInput').oninput = (e) => {
        termoPesquisa = e.target.value.toLowerCase();
        renderMediators();
    };

    // --- RENDERIZAÇÃO ---
    function renderMediators() {
        const list = document.getElementById('mediatorList');
        if(!list) return;
        list.innerHTML = '';

        const filtrados = mediators.filter(m => 
            m.name.toLowerCase().includes(termoPesquisa) || 
            m.role.toLowerCase().includes(termoPesquisa)
        );

        filtrados.forEach(user => {
            const role = (user.role || "").toUpperCase();
            const isUnlimited = role.includes("SUP") || role.includes("AUX");
            const isExp = !isUnlimited && parseInt(user.daysLeft) <= 0;

            const timeTxt = isUnlimited ? "ILIMITADO" : (isExp ? "EXPIRADO" : `${user.daysLeft} dias`);
            const timeColor = isExp ? "text-red" : "text-green";

            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <div class="row-info">
                    <div>
                        <h4 class="row-name">${user.name}</h4>
                        <span class="role-badge">${user.role}</span>
                        <span class="id-display">#${user.idForm || 'Manual'}</span>
                    </div>
                </div>
                <div class="row-status-col" style="text-align: center;">
                    <span class="${timeColor} font-weight-bold" style="font-family: 'Cinzel';">${timeTxt}</span>
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
            const r = (m.role || "").toUpperCase();
            return !r.includes("SUP") && !r.includes("AUX") && m.daysLeft <= 0;
        }).length;
    }

    // --- EVENTOS ---
    document.getElementById('mediatorList').onclick = (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;
        const u = mediators.find(m => m.id == id);

        if (btn.classList.contains('btn-renovar')) {
            u.daysLeft = (parseInt(u.daysLeft) || 0) + 7;
            renderMediators();
            syncToCloud("UPDATE_EQUIPE");
        } else if (btn.classList.contains('btn-cargo')) {
            document.getElementById('editUserId').value = u.id;
            document.getElementById('editName').value = u.name;
            document.getElementById('editRole').value = u.role;
            document.getElementById('editDays').value = u.daysLeft;
            document.getElementById('editModal').style.display = 'flex';
        } else if (btn.classList.contains('btn-excluir')) {
            if(confirm(`Excluir ${u.name}?`)) {
                mediators = mediators.filter(m => m.id != id);
                renderMediators();
                syncToCloud("DELETE_MEMBER", { name: u.name });
            }
        }
    };

    document.getElementById('btnSaveEdit').onclick = () => {
        const id = document.getElementById('editUserId').value;
        const u = mediators.find(m => m.id == id);
        u.name = document.getElementById('editName').value;
        u.role = document.getElementById('editRole').value;
        u.daysLeft = document.getElementById('editDays').value;
        document.getElementById('editModal').style.display = 'none';
        renderMediators();
        syncToCloud("UPDATE_EQUIPE");
    };

    const navs = {'navMediators': 'viewMediators', 'navDashboard': 'viewDashboard', 'navReports': 'viewReports'};
    Object.keys(navs).forEach(id => {
        document.getElementById(id).onclick = () => {
            Object.values(navs).forEach(v => document.getElementById(v).style.display = 'none');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById(navs[id]).style.display = 'block';
            document.getElementById(id).classList.add('active');
            document.getElementById('pageTitle').innerText = document.getElementById(id).innerText.trim();
        };
    });

    async function syncToCloud(type, extra = null) {
        let body = { type, data: deduplicate(mediators) };
        if (type === "DELETE_MEMBER") body = { type, deletedName: extra.name, data: body.data };
        await fetch(URL_PLANILHA, { method: 'POST', body: JSON.stringify(body) });
    }

    document.getElementById('btnSyncDrive').onclick = async () => {
        document.getElementById('btnSyncDrive').innerText = "Sincronizando...";
        await loadData();
        document.getElementById('btnSyncDrive').innerHTML = '<i class="fa-solid fa-rotate"></i> SINCRONIZAR FORMS';
    };

    document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => {
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('addModal').style.display = 'none';
    });

    document.getElementById('btnAddNewDesktop').onclick = () => document.getElementById('addModal').style.display = 'flex';
    document.getElementById('fabAddUser').onclick = () => document.getElementById('addModal').style.display = 'flex';

    function renderAll() {
        renderMediators();
        const total = transactions.reduce((acc, t) => acc + (parseFloat(t.value) || 0), 0);
        document.getElementById('displayBalance').innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    }
});
