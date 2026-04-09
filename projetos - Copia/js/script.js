// =========================================================================
// URL OFICIAL DO SEU GOOGLE APPS SCRIPT
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxQRnCtiPJ9vWwCou-R3NctG39vdN6yKRz_k7NFNkxJe9fC_z4r81o7WIOaQ37zqi4-/exec";
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    
    let mediators = [];
    let transactions = [];

    // --- Configuração de Avatares por Cargo ---
    const roleConfig = {
        'ADM': { bg: 'eebc1d', color: '000' },  // Dourado
        'SUP': { bg: '8e44ad', color: 'fff' },  // Roxo
        'AUX': { bg: '3498db', color: 'fff' }   // Azul
    };

    function getAvatarUrl(name, role) {
        const config = roleConfig[role] || { bg: '555', color: 'fff' };
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${config.bg}&color=${config.color}&bold=true`;
    }

    // --- 1. Sistema de Login ---
    if (localStorage.getItem('sysIsLoggedIn') === 'true') showApp();

    function showApp() {
        if(loginScreen) loginScreen.style.display = 'none';
        if(appScreen) appScreen.style.display = 'block';
        loadData();
    }

    document.getElementById('btnLogin').addEventListener('click', () => {
        const u = document.getElementById('loginUser').value;
        const p = document.getElementById('loginPass').value;
        if (u === 'pedro' && p === 'mestre') {
            localStorage.setItem('sysIsLoggedIn', 'true');
            showApp();
        } else {
            document.getElementById('loginError').style.display = 'block';
        }
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
        if(confirm("Deseja sair do sistema?")) {
            localStorage.removeItem('sysIsLoggedIn');
            location.reload();
        }
    });

    // --- 2. Gerenciador de Dados ---
    function loadData() {
        const storedMed = localStorage.getItem('sysMediatorsV2');
        mediators = storedMed ? JSON.parse(storedMed) : [];
        const storedFin = localStorage.getItem('sysFinance');
        transactions = storedFin ? JSON.parse(storedFin) : [];
        
        checkDailyCountdown();
        
        const activeTab = document.querySelector('.tab.active');
        const filterValue = activeTab ? activeTab.dataset.filter : 'all';
        applyFilterAndRender(filterValue);
        
        updateStatsAndFinance();
    }

    function saveData() {
        localStorage.setItem('sysMediatorsV2', JSON.stringify(mediators));
        localStorage.setItem('sysFinance', JSON.stringify(transactions));
        
        const activeTab = document.querySelector('.tab.active');
        applyFilterAndRender(activeTab ? activeTab.dataset.filter : 'all');
        
        updateStatsAndFinance();
    }

    function updateStatsAndFinance() {
        renderFinance();
        document.getElementById('totalCount').innerText = mediators.length;
        document.getElementById('alertCount').innerText = mediators.filter(m => m.daysLeft !== -1 && (m.status === 'expired' || m.status === 'expiring')).length;
    }

    // --- 3. Cronômetro Diário ---
    function checkDailyCountdown() {
        const lastDate = localStorage.getItem('sysLastCheck');
        const today = new Date().toDateString();
        if (lastDate && lastDate !== today) {
            mediators.forEach(user => {
                if (user.daysLeft > 0 && user.daysLeft !== -1) {
                    user.daysLeft--;
                    if (user.daysLeft === 0) user.status = 'expired';
                    else if (user.daysLeft <= 5) user.status = 'expiring';
                }
            });
            saveData();
        }
        localStorage.setItem('sysLastCheck', today);
    }

    // --- 4. Renderizar Tela de Mediadores ---
    function applyFilterAndRender(filterValue) {
        let filteredData = mediators;
        if (filterValue !== 'all') {
            filteredData = mediators.filter(m => m.status === filterValue);
        }
        renderMediators(filteredData);
    }

    function renderMediators(data) {
        const listContainer = document.getElementById('mediatorList');
        listContainer.innerHTML = '';

        if (data.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px; width:100%;">Nenhum membro encontrado.</p>';
            return;
        }

        const roleOrder = ['ADM', 'SUP', 'AUX'];
        const groupedData = { 'ADM': [], 'SUP': [], 'AUX': [] };
        
        data.forEach(user => {
            const role = user.role || 'ADM';
            if(!groupedData[role]) groupedData[role] = [];
            groupedData[role].push(user);
        });

        roleOrder.forEach(role => {
            if (groupedData[role].length === 0) return;

            groupedData[role].sort((a, b) => {
                if(a.daysLeft === -1) return 1;
                if(b.daysLeft === -1) return -1;
                return a.daysLeft - b.daysLeft;
            });

            let titleColor = 'var(--primary-gold)';
            let badgeClass = 'badge-adm';
            if(role === 'SUP') { titleColor = '#8e44ad'; badgeClass = 'badge-sup'; }
            if(role === 'AUX') { titleColor = '#3498db'; badgeClass = 'badge-aux'; }

            const section = document.createElement('div');
            section.className = 'role-section';
            section.innerHTML = `<h3 class="role-title" style="color: ${titleColor}; border-bottom-color: ${titleColor}60"><i class="fa-solid fa-users"></i> ${role} (${groupedData[role].length})</h3>`;
            
            const table = document.createElement('div');
            table.className = 'custom-table';

            groupedData[role].forEach(user => {
                const isIndeterminate = user.daysLeft === -1;
                const isExp = user.status === 'expired' && !isIndeterminate;
                
                let color = 'text-green'; 
                let daysText = 'VITALÍCIO (∞)';
                let statusLabel = 'STATUS DO ACESSO';

                if (!isIndeterminate) {
                    color = isExp ? 'text-red' : (user.daysLeft <= 5 ? 'text-red' : 'text-yellow');
                    daysText = isExp ? 'EXPIRADO' : user.daysLeft + ' dias';
                    statusLabel = isExp ? 'STATUS DO ACESSO' : 'TEMPO RESTANTE';
                }
                
                const hasIdForm = user.idForm && user.idForm.trim() !== '';
                const idHtml = hasIdForm ? `<span class="id-display"><i class="fa-solid fa-hashtag"></i>${user.idForm}</span>` : '';
                
                const row = document.createElement('div');
                row.className = 'table-row';
                row.innerHTML = `
                    <div class="row-info">
                        <img src="${user.avatar}" class="row-avatar">
                        <div>
                            <h4 class="row-name">${user.name}</h4>
                            <span class="role-badge ${badgeClass}">${user.role}</span>
                            ${idHtml}
                        </div>
                    </div>
                    <div class="row-status-col">
                        <span class="status-label">${statusLabel}</span>
                        <span class="days-count ${color}">${daysText}</span>
                    </div>
                    <div class="row-actions">
                        <button class="action-btn ${hasIdForm ? 'text-green' : 'text-white'} btn-idform" data-id="${user.id}">
                            <i class="fa-solid fa-id-card"></i> ${hasIdForm ? 'EDITAR ID' : 'ADD ID'}
                        </button>
                        <button class="action-btn text-yellow btn-edit" data-id="${user.id}">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                        <button class="action-btn text-red btn-rm" data-id="${user.id}">
                            <i class="fa-regular fa-trash-can"></i> Del
                        </button>
                    </div>
                `;
                table.appendChild(row);
            });

            section.appendChild(table);
            listContainer.appendChild(section);
        });

        document.querySelectorAll('.btn-edit').forEach(b => b.onclick = () => openEdit(parseInt(b.dataset.id)));
        document.querySelectorAll('.btn-idform').forEach(b => b.onclick = () => openIdForm(parseInt(b.dataset.id)));
        document.querySelectorAll('.btn-rm').forEach(b => b.onclick = () => {
            if(confirm('Tem certeza que deseja excluir este membro?')) { 
                mediators = mediators.filter(m => m.id !== parseInt(b.dataset.id)); 
                saveData(); 
            }
        });
    }

    // --- Lógica das Abas de Filtro ---
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            applyFilterAndRender(tab.dataset.filter);
        });
    });

    // --- Sincronização Automática com Google Forms/Sheets ---
    async function importarDadosDaNuvem() {
        if (!URL_PLANILHA || URL_PLANILHA.includes("COLE_AQUI")) {
            return alert("Configure a URL do Google Apps Script no código primeiro!");
        }

        try {
            const btn = document.getElementById('btnSyncDrive');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> BUSCANDO FORMS...';
            
            const response = await fetch(URL_PLANILHA);
            const dadosPlanilha = await response.json();
            
            if(dadosPlanilha && dadosPlanilha.length > 0) {
                let novosAdicionados = 0;

                dadosPlanilha.forEach(itemForm => {
                    const nomeFormatado = itemForm.name ? itemForm.name.trim() : '';
                    if (!nomeFormatado) return;

                    const jaExisteNome = mediators.find(m => m.name.trim().toLowerCase() === nomeFormatado.toLowerCase());
                    
                    if (!jaExisteNome) {
                        mediators.push({
                            id: Date.now() + Math.random(),
                            name: nomeFormatado,
                            role: itemForm.role || 'AUX', 
                            daysLeft: itemForm.daysLeft, 
                            status: 'active',
                            idForm: String(itemForm.idForm), 
                            avatar: getAvatarUrl(nomeFormatado, itemForm.role || 'AUX')
                        });
                        novosAdicionados++;
                    }
                });

                saveData(); 
                
                if (novosAdicionados > 0) {
                    alert(`Sincronização concluída! ${novosAdicionados} novos membros foram importados do Forms.`);
                } else {
                    alert("A equipe já está atualizada. Os formulários repetidos foram ignorados.");
                }

            } else {
                alert("Nenhuma resposta encontrada no Formulário ainda.");
            }
        } catch (error) {
            console.error("Erro ao sincronizar:", error);
            alert("Erro ao conectar com a planilha do Forms. Verifique a URL e sua conexão.");
        } finally {
            document.getElementById('btnSyncDrive').innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> SINCRONIZAR FORMS';
        }
    }

    const btnSyncDrive = document.getElementById('btnSyncDrive');
    if(btnSyncDrive) btnSyncDrive.onclick = importarDadosDaNuvem;

    function enviarParaPlanilha(nome, cargo, dias, idForm) {
        if (!URL_PLANILHA || URL_PLANILHA.includes("COLE_AQUI")) return;
        
        fetch(URL_PLANILHA, {
            method: 'POST',
            body: JSON.stringify({ nome: nome, cargo: cargo, dias: dias, idForm: idForm })
        }).catch(err => console.error("Erro no envio silenciado:", err));
    }


    // --- Exportar Equipe para Excel ---
    const btnExportTeam = document.getElementById('btnExportTeamCSV');
    if(btnExportTeam) {
        btnExportTeam.onclick = () => {
            if(mediators.length === 0) return alert("Nenhuma equipe para exportar.");
            
            let csv = "Nome,Cargo,Dias Restantes,Status,ID do Formulario\n";
            mediators.forEach(m => { 
                const diasText = m.daysLeft === -1 ? 'Vitalicio' : m.daysLeft;
                const statusText = m.status === 'active' ? 'Ativo' : (m.status === 'expiring' ? 'Vencendo' : 'Expirado');
                const idText = m.idForm ? m.idForm : 'Sem ID';
                csv += `${m.name},${m.role},${diasText},${statusText},${idText}\n`; 
            });
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', 'planilha_equipe.csv');
            a.click();
        };
    }

    // --- Lógica Modais de Usuário ---
    document.getElementById('addIndeterminate').addEventListener('change', (e) => {
        document.getElementById('addDays').disabled = e.target.checked;
        if(e.target.checked) document.getElementById('addDays').value = '';
    });
    
    document.getElementById('editIndeterminate').addEventListener('change', (e) => {
        document.getElementById('editDays').disabled = e.target.checked;
        if(e.target.checked) document.getElementById('editDays').value = '';
    });

    function showAddModal() {
        document.getElementById('addName').value = ''; 
        document.getElementById('addRole').value = 'ADM'; 
        document.getElementById('addDays').value = '';
        document.getElementById('addDays').disabled = false;
        document.getElementById('addIndeterminate').checked = false;
        document.getElementById('addModal').style.display = 'flex';
    }

    document.getElementById('fabAddUser').onclick = showAddModal;
    const btnAddNewDesktop = document.getElementById('btnAddNewDesktop');
    if(btnAddNewDesktop) btnAddNewDesktop.onclick = showAddModal;

    document.getElementById('btnSaveNew').onclick = () => {
        const name = document.getElementById('addName').value;
        const role = document.getElementById('addRole').value;
        const isVitalicio = document.getElementById('addIndeterminate').checked;
        let days = parseInt(document.getElementById('addDays').value);
        
        if(!name) return alert("Nome é obrigatório.");
        if(!isVitalicio && (isNaN(days) || days <= 0)) return alert("Insira os dias ou marque Tempo Indeterminado.");

        const finalDays = isVitalicio ? -1 : days;
        
        mediators.push({
            id: Date.now(), 
            name: name, 
            role: role,
            daysLeft: finalDays,
            status: finalDays === -1 ? 'active' : (finalDays <= 5 ? 'expiring' : 'active'), 
            avatar: getAvatarUrl(name, role),
            idForm: ''
        });
        
        enviarParaPlanilha(name, role, finalDays, ''); // Tenta enviar para o Drive
        
        saveData(); 
        document.getElementById('addModal').style.display='none';
    }

    function openEdit(id) {
        const u = mediators.find(m => m.id === id);
        if(!u) return;
        document.getElementById('editUserId').value = id;
        document.getElementById('editName').value = u.name;
        document.getElementById('editRole').value = u.role || 'ADM';
        
        const isVitalicio = u.daysLeft === -1;
        document.getElementById('editIndeterminate').checked = isVitalicio;
        document.getElementById('editDays').disabled = isVitalicio;
        document.getElementById('editDays').value = isVitalicio ? '' : u.daysLeft;
        
        document.getElementById('editModal').style.display = 'flex';
    }

    document.getElementById('btnSaveEdit').onclick = () => {
        const id = parseInt(document.getElementById('editUserId').value);
        const u = mediators.find(m => m.id === id);
        if(u) {
            u.name = document.getElementById('editName').value;
            u.role = document.getElementById('editRole').value;
            u.avatar = getAvatarUrl(u.name, u.role);
            
            const isVitalicio = document.getElementById('editIndeterminate').checked;
            let days = parseInt(document.getElementById('editDays').value);
            
            u.daysLeft = isVitalicio ? -1 : (isNaN(days) ? 0 : days);
            u.status = u.daysLeft === -1 ? 'active' : (u.daysLeft <= 0 ? 'expired' : (u.daysLeft <= 5 ? 'expiring' : 'active'));
            
            saveData(); 
            document.getElementById('editModal').style.display = 'none';
        }
    }

    function openIdForm(id) {
        const u = mediators.find(m => m.id === id);
        if(!u) return;
        document.getElementById('idUserId').value = id;
        document.getElementById('modalIdTitle').innerText = `ID FORM: ${u.name}`;
        document.getElementById('inputIdForm').value = u.idForm || '';
        document.getElementById('idModal').style.display = 'flex';
    }

    document.getElementById('btnSaveIdForm').onclick = () => {
        const id = parseInt(document.getElementById('idUserId').value);
        const u = mediators.find(m => m.id === id);
        if(u) {
            u.idForm = document.getElementById('inputIdForm').value;
            
            enviarParaPlanilha(u.name, u.role, u.daysLeft, u.idForm);
            
            saveData();
            document.getElementById('idModal').style.display = 'none';
        }
    }

    document.querySelectorAll('.close-modal').forEach(b => b.onclick = function() { 
        this.closest('.modal').style.display='none'; 
    });
    window.onclick = e => { 
        if(e.target.classList.contains('modal')) e.target.style.display='none'; 
    };

    // --- Funções do Financeiro e Relatórios ---
    function addTransaction(type) {
        const cat = document.getElementById(type === 'income' ? 'incCategory' : 'expCategory').value;
        const val = parseFloat(document.getElementById(type === 'income' ? 'incValue' : 'expValue').value);
        if (isNaN(val) || val <= 0) return;
        transactions.unshift({
            id: Date.now(), desc: cat, value: type === 'income' ? val : -val,
            date: new Date().toLocaleDateString('pt-BR')
        });
        saveData();
    }
    
    document.getElementById('btnAddIncome').onclick = () => addTransaction('income');
    document.getElementById('btnAddExpense').onclick = () => addTransaction('expense');

    function renderFinance() {
        const total = transactions.reduce((acc, item) => acc + item.value, 0);
        const displayBalance = document.getElementById('displayBalance');
        if(displayBalance) {
            displayBalance.innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
            displayBalance.className = `balance-value ${total >= 0 ? 'positive' : 'negative'}`;
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
                        <div class="${isInc?'text-green':'text-red'} font-weight-bold">${t.value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
                    </div>`;
            });
        }
        
        const repList = document.getElementById('reportsList');
        if(repList) {
            repList.innerHTML = `<div class="report-card"><h3 style="color:var(--primary-gold)">Status Atual</h3><p style="margin-top:10px;">Total de Movimentações: <b>${transactions.length}</b></p></div>`;
        }
    }

    document.getElementById('btnExportCSV').onclick = () => {
        if(transactions.length === 0) return alert("Nenhum dado para exportar.");
        let csv = "Data,Categoria,Valor\n";
        transactions.forEach(t => { csv += `${t.date},${t.desc},${t.value}\n`; });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', 'relatorio_financeiro.csv');
        a.click();
    };

    // Navegação Multiplataforma
    const views = ['viewMediators', 'viewDashboard', 'viewReports'];
    ['navMediators', 'navDashboard', 'navReports'].forEach((nav, idx) => {
        const el = document.getElementById(nav);
        if(el) {
            el.onclick = () => {
                views.forEach(v => {
                    const viewEl = document.getElementById(v);
                    if(viewEl) viewEl.style.display = 'none';
                });
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                const targetView = document.getElementById(views[idx]);
                if(targetView) targetView.style.display = 'block';
                el.classList.add('active');
                document.getElementById('pageTitle').innerText = nav.replace('nav', '').toUpperCase();
            }
        }
    });

    // Busca de Membros
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.oninput = e => {
            const val = e.target.value.toLowerCase();
            const activeTab = document.querySelector('.tab.active');
            const filterValue = activeTab ? activeTab.dataset.filter : 'all';
            
            let dataToSearch = filterValue === 'all' ? mediators : mediators.filter(m => m.status === filterValue);
            renderMediators(dataToSearch.filter(m => m.name.toLowerCase().includes(val) || (m.role && m.role.toLowerCase().includes(val))));
        };
    }
});