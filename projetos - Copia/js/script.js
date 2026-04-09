// =========================================================================
// URL DA SUA NOVA IMPLANTAÇÃO (ATUALIZADA)
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbx82Xc6fkbqyKF5WEE57InGPeTIVt8-xitOHNcp3QZ6VMVtkmmW5UT6iyuXTfSji6dT/exec";
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    let mediators = [];

    // --- Sistema de Login ---
    if (localStorage.getItem('sysIsLoggedIn') === 'true') showApp();

    const btnLogin = document.getElementById('btnLogin');
    if(btnLogin) {
        btnLogin.onclick = () => {
            const u = document.getElementById('loginUser').value;
            const p = document.getElementById('loginPass').value;
            if (u === 'pedro' && p === 'mestre') {
                localStorage.setItem('sysIsLoggedIn', 'true');
                showApp();
            } else {
                document.getElementById('loginError').style.display = 'block';
            }
        };
    }

    function showApp() {
        if(loginScreen) loginScreen.style.display = 'none';
        if(appScreen) appScreen.style.display = 'block';
        loadData();
    }

    // --- Carregar e Salvar Dados Locais ---
    function loadData() {
        const stored = localStorage.getItem('sysMediatorsV2');
        mediators = stored ? JSON.parse(stored) : [];
        renderMediators();
    }

    function saveData() {
        localStorage.setItem('sysMediatorsV2', JSON.stringify(mediators));
        renderMediators();
    }

    // --- Sincronização com o Google Forms ---
    async function sincronizar() {
        const btn = document.getElementById('btnSyncDrive');
        if(!btn) return;
        
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CARREGANDO...';
        
        try {
            // O "redirect: follow" é essencial para o Google Script
            const res = await fetch(URL_PLANILHA, { method: 'GET', redirect: 'follow' });
            const dados = await res.json();
            
            let novos = 0;
            dados.forEach(item => {
                const existe = mediators.find(m => m.name.toLowerCase() === item.name.toLowerCase());
                if (!existe) {
                    mediators.push({
                        id: Date.now() + Math.random(),
                        name: item.name,
                        role: "PENDENTE",
                        daysLeft: 0,
                        status: 'expired',
                        idForm: item.idForm
                    });
                    novos++;
                }
            });
            
            saveData();
            alert(novos > 0 ? `${novos} membros novos importados!` : "A equipe já está atualizada.");
            
        } catch (e) {
            console.error(e);
            alert("Erro de conexão. Verifique se a implantação está como 'Qualquer Pessoa'.");
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> SINCRONIZAR FORMS';
        }
    }

    const btnSync = document.getElementById('btnSyncDrive');
    if(btnSync) btnSync.onclick = sincronizar;

    // --- Renderização da Tabela ---
    function renderMediators() {
        const list = document.getElementById('mediatorList');
        if(!list) return;
        list.innerHTML = '';
        
        mediators.forEach(user => {
            const isExp = user.daysLeft === 0;
            const card = document.createElement('div');
            card.className = 'table-row';
            card.innerHTML = `
                <div class="row-info">
                    <div>
                        <h4 class="row-name">${user.name}</h4>
                        <span class="role-badge">${user.role}</span>
                        <span class="id-display"><i class="fa-solid fa-hashtag"></i> ${user.idForm}</span>
                    </div>
                </div>
                <div class="row-status-col">
                    <span class="status-label">TEMPO RESTANTE</span>
                    <span class="days-count ${isExp ? 'text-red' : 'text-green'}">${isExp ? 'EXPIRADO' : user.daysLeft + ' dias'}</span>
                </div>
                <div class="row-actions">
                    <button class="action-btn text-green" onclick="renovar(${user.id})">
                        <i class="fa-solid fa-plus-circle"></i> +7 DIAS
                    </button>
                    <button class="action-btn text-yellow" onclick="mudarCargo(${user.id})">
                        <i class="fa-solid fa-user-tag"></i> CARGO
                    </button>
                    <button class="action-btn text-red" onclick="excluir(${user.id})">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    }

    // --- Funções de Ação ---
    window.renovar = (id) => {
        const u = mediators.find(m => m.id === id);
        if(u) {
            u.daysLeft += 7;
            saveData();
        }
    };

    window.mudarCargo = (id) => {
        const u = mediators.find(m => m.id === id);
        const novo = prompt("Digite o novo cargo (ADM, SUP ou AUX):", u.role);
        if(novo) {
            u.role = novo.toUpperCase();
            saveData();
        }
    };

    window.excluir = (id) => {
        if(confirm("Deseja realmente excluir este membro?")) {
            mediators = mediators.filter(m => m.id !== id);
            saveData();
        }
    };
});
