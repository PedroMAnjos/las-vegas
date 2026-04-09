const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzbJJ7eTembJFbAaBxI7aFCo87lN_-RBIsb5HYgapo1YpEMCVcKSUlGza_tOGPzG9tAQw/exec";

document.addEventListener('DOMContentLoaded', () => {
    let mediators = [];
    let termoPesquisa = "";

    // --- 1. LOGIN ---
    const checkLogin = () => {
        if (localStorage.getItem('sysIsLoggedIn') === 'true') {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            loadData();
        }
    };
    checkLogin();

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

    // --- 2. CARREGAR DADOS DO BANCO (GET) ---
    async function loadData() {
        try {
            const res = await fetch(URL_PLANILHA, { method: 'GET', redirect: 'follow' });
            const data = await res.json();
            if (data.equipe) {
                // TRAVA ANTI-DUPLICATA NO FRONT
                const seen = new Set();
                mediators = data.equipe.filter(m => {
                    const nome = m.name.toLowerCase().trim();
                    return seen.has(nome) ? false : seen.add(nome);
                });
                renderMediators();
            }
        } catch (e) { console.error("Erro ao conectar com a planilha."); }
    }

    // --- 3. RENDERIZAÇÃO (ILIMITADOS + FILTRO) ---
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
                    <h4 class="row-name" style="font-family:'Cinzel'">${user.name}</h4>
                    <span class="text-gold" style="font-size:0.7rem;">${user.role} | #${user.idForm || 'ID'}</span>
                </div>
                <div style="text-align: center;">
                    <span class="${timeColor}" style="font-weight:bold; font-family:'Cinzel'; font-size:1rem;">${timeTxt}</span>
                </div>
                <div class="row-actions" style="display:flex; justify-content:flex-end; gap:8px;">
                    <button class="action-btn green btn-renovar" data-id="${user.id}">+7</button>
                    <button class="action-btn gold btn-edit" data-id="${user.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn text-red btn-delete" data-id="${user.id}" style="background:none;"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            list.appendChild(row);
        });

        document.getElementById('totalCount').innerText = filtrados.length;
        document.getElementById('alertCount').innerText = filtrados.filter(m => {
            const r = m.role.toUpperCase();
            return !r.includes("SUP") && !r.includes("AUX") && m.daysLeft <= 0;
        }).length;
    }

    // --- 4. EVENTOS DE BANCO DE DADOS (POST) ---
    document.getElementById('mediatorList').onclick = async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;
        const u = mediators.find(m => m.id == id);

        if (btn.classList.contains('btn-renovar')) {
            u.daysLeft = (parseInt(u.daysLeft) || 0) + 7;
            renderMediators();
            await syncToCloud("UPDATE_EQUIPE");
        } else if (btn.classList.contains('btn-edit')) {
            document.getElementById('editUserId').value = u.id;
            document.getElementById('editName').value = u.name;
            document.getElementById('editRole').value = u.role;
            document.getElementById('editDays').value = u.daysLeft;
            document.getElementById('editModal').style.display = 'flex';
        } else if (btn.classList.contains('btn-delete')) {
            if(confirm(`Bloquear ${u.name}?`)) {
                mediators = mediators.filter(m => m.id != id);
                renderMediators();
                await syncToCloud("DELETE_MEMBER", { name: u.name });
            }
        }
    };

    // --- 5. SINCRONIA FINAL ---
    async function syncToCloud(type, extra = null) {
        let body = { type, data: mediators };
        if (type === "DELETE_MEMBER") body = { type, deletedName: extra.name, data: mediators };
        try {
            await fetch(URL_PLANILHA, { method: 'POST', body: JSON.stringify(body) });
        } catch(e) { console.error("Falha ao salvar no banco."); }
    }

    document.getElementById('btnSyncDrive').onclick = () => {
        document.getElementById('btnSyncDrive').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SYNC';
        loadData().finally(() => {
            document.getElementById('btnSyncDrive').innerHTML = '<i class="fa-solid fa-rotate"></i> SYNC';
        });
    };

    document.getElementById('searchInput').oninput = (e) => {
        termoPesquisa = e.target.value.toLowerCase();
        renderMediators();
    };

    document.querySelector('.close-modal').onclick = () => document.getElementById('editModal').style.display = 'none';
});
