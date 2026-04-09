const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzbJJ7eTembJFbAaBxI7aFCo87lN_-RBIsb5HYgapo1YpEMCVcKSUlGza_tOGPzG9tAQw/exec";

document.addEventListener('DOMContentLoaded', () => {
    let mediators = [];
    let termoPesquisa = "";

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

    // --- CARREGAR DADOS ---
    async function loadData() {
        try {
            const res = await fetch(URL_PLANILHA, { method: 'GET', redirect: 'follow' });
            const data = await res.json();
            if (data.equipe) {
                const seen = new Set();
                mediators = data.equipe.filter(m => {
                    const nome = m.name.toLowerCase().trim();
                    return seen.has(nome) ? false : seen.add(nome);
                });
                renderMediators();
            }
        } catch (e) { console.error("Erro no banco."); }
    }

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
                    <h4 class="row-name" style="font-family:'Cinzel'">${user.name}</h4>
                    <span style="color:var(--primary-gold); font-size:0.7rem;">${user.role} | #${user.idForm || 'ID'}</span>
                </div>
                <div style="text-align: center;">
                    <span class="${timeColor}" style="font-weight:bold; font-family:'Cinzel';">${timeTxt}</span>
                </div>
                <div class="row-actions" style="display:flex; justify-content:flex-end; gap:10px;">
                    <button class="action-btn btn-renovar" data-id="${user.id}" style="color:var(--green-online); background:none; border:none; cursor:pointer;">+7</button>
                    <button class="action-btn btn-edit" data-id="${user.id}" style="color:var(--primary-gold); background:none; border:none; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
                </div>`;
            list.appendChild(row);
        });

        document.getElementById('totalCount').innerText = filtrados.length;
    }

    // Navegação de abas
    const navs = {'navMediators': 'viewMediators', 'navDashboard': 'viewDashboard', 'navReports': 'viewReports'};
    Object.keys(navs).forEach(id => {
        document.getElementById(id).onclick = () => {
            Object.values(navs).forEach(v => document.getElementById(v).style.display = 'none');
            document.getElementById(navs[id]).style.display = 'block';
        };
    });

    document.getElementById('searchInput').oninput = (e) => {
        termoPesquisa = e.target.value.toLowerCase();
        renderMediators();
    };
});
