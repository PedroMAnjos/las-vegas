// =========================================================================
// URL DA SUA IMPLANTAÇÃO GOOGLE
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbx82Xc6fkbqyKF5WEE57InGPeTIVt8-xitOHNcp3QZ6VMVtkmmW5UT6iyuXTfSji6dT/exec";
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    
    let mediators = [];
    let transactions = [];

    // --- 1. SISTEMA DE LOGIN ---
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

    document.getElementById('btnLogout').onclick = () => {
        if(confirm("Deseja sair?")) {
            localStorage.removeItem('sysIsLoggedIn');
            location.reload();
        }
    };

    // --- 2. GERENCIAMENTO DE DADOS ---
    function loadData() {
        const storedMed = localStorage.getItem('sysMediatorsV2');
        mediators = storedMed ? JSON.parse(storedMed) : [];
        
        const storedFin = localStorage.getItem('sysFinance');
        transactions = storedFin ? JSON.parse(storedFin) : [];
        
        renderMediators();
        updateFinanceUI();
    }

    function saveData() {
        localStorage.setItem('sysMediatorsV2', JSON.stringify(mediators));
        localStorage.setItem('sysFinance', JSON.stringify(transactions));
        renderMediators();
        updateFinanceUI();
    }

    // --- 3. SINCRONIZAÇÃO FORMS ---
    async function sincronizar() {
        const btn = document.getElementById('btnSyncDrive');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CARREGANDO...';
        try {
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
                        idForm: item.idForm
                    });
                    novos++;
                }
            });
            saveData();
            alert(novos + " novos importados!");
        } catch (e) {
            alert("Erro de conexão com o Google.");
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> SINCRONIZAR FORMS';
        }
    }
    document.getElementById('btnSyncDrive').onclick = sincronizar;

    // --- 4. FINANCEIRO (Ações) ---
    function addTransaction(type) {
        const catId = type === 'income' ? 'incCategory' : 'expCategory';
        const valId = type === 'income' ? 'incValue' : 'expValue';
        
        const cat = document.getElementById(catId).value;
        const val = parseFloat(document.getElementById(valId).value);

        if (isNaN(val) || val <= 0) return alert("Insira um valor válido.");

        transactions.unshift({
            id: Date.now(),
            desc: cat,
            value: type === 'income' ? val : -val,
            date: new Date().toLocaleDateString('pt-BR')
        });

        document.getElementById(valId).value = ''; // Limpa campo
        saveData();
    }

    document.getElementById('btnAddIncome').onclick = () => addTransaction('income');
    document.getElementById('btnAddExpense').onclick = () => addTransaction('expense');

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

        const repList = document.getElementById('reportsList');
        if(repList) {
            repList.innerHTML = `<div class="report-card"><h3>Resumo Geral</h3><p>Movimentações: ${transactions.length}</p><p>Saldo: ${total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div>`;
        }
    }

    // --- 5. NAVEGAÇÃO ENTRE TELAS ---
    const views = ['viewMediators', 'viewDashboard', 'viewReports'];
    const navs = ['navMediators', 'navDashboard', 'navReports'];

    navs.forEach((navId, idx) => {
        document.getElementById(navId).onclick = () => {
            views.forEach(v => document.getElementById(v).style.display = 'none');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            
            document.getElementById(views[idx]).style.display = 'block';
            document.getElementById(navId).classList.add('active');
            document.getElementById('pageTitle').innerText = navId.replace('nav', '').toUpperCase();
        };
    });

    // --- 6. RENDERIZAÇÃO DA EQUIPE ---
    function renderMediators() {
        const list = document.getElementById('mediatorList');
        list.innerHTML = '';
        mediators.forEach(user => {
            const isExp = user.daysLeft === 0;
            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <div class="row-info">
                    <div>
                        <h4 class="row-name">${user.name}</h4>
                        <span class="role-badge">${user.role}</span>
                        <span class="id-display">#${user.idForm}</span>
                    </div>
                </div>
                <div class="row-status-col">
                    <span class="${isExp ? 'text-red' : 'text-green'}">${isExp ? 'EXPIRADO' : user.daysLeft + ' dias'}</span>
                </div>
                <div class="row-actions">
                    <button class="action-btn text-green" onclick="renovar(${user.id})">+7d</button>
                    <button class="action-btn text-yellow" onclick="mudarCargo(${user.id})">Cargo</button>
                    <button class="action-btn text-red" onclick="excluir(${user.id})"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            list.appendChild(row);
        });
        
        document.getElementById('totalCount').innerText = mediators.length;
        document.getElementById('alertCount').innerText = mediators.filter(m => m.daysLeft === 0).length;
    }

    // Funções Globais
    window.renovar = (id) => {
        const u = mediators.find(m => m.id === id);
        u.daysLeft += 7;
        saveData();
    };

    window.mudarCargo = (id) => {
        const u = mediators.find(m => m.id === id);
        const novo = prompt("Cargo (ADM, SUP, AUX):", u.role);
        if(novo) { u.role = novo.toUpperCase(); saveData(); }
    };

    window.excluir = (id) => {
        if(confirm("Excluir?")) { mediators = mediators.filter(m => m.id !== id); saveData(); }
    };

    document.getElementById('btnExportCSV').onclick = () => {
        let csv = "Data,Categoria,Valor\n";
        transactions.forEach(t => csv += `${t.date},${t.desc},${t.value}\n`);
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'financeiro.csv';
        a.click();
    };
});
