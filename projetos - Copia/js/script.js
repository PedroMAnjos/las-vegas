document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema Iniciado: Carregando módulos...");

    // ==========================================
    // 1. SISTEMA DE LOGIN (BLINDADO)
    // ==========================================
    const loginScreen = document.getElementById('loginScreen');
    const appScreen = document.getElementById('appScreen');
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const loginUser = document.getElementById('loginUser');
    const loginPass = document.getElementById('loginPass');
    const loginError = document.getElementById('loginError');

    // Verifica se já está logado
    if (localStorage.getItem('sysIsLoggedIn') === 'true') {
        showApp();
    }

    function showApp() {
        if(loginScreen) loginScreen.style.display = 'none';
        if(appScreen) appScreen.style.display = 'block';
        loadData(); // Só carrega dados após login
    }

    function attemptLogin() {
        const u = loginUser ? loginUser.value : '';
        const p = loginPass ? loginPass.value : '';
        
        if (u === 'pedro' && p === 'mestre') {
            localStorage.setItem('sysIsLoggedIn', 'true');
            showApp();
        } else {
            if(loginError) {
                loginError.style.display = 'block';
                // Efeito de tremor no erro
                loginError.style.animation = 'none';
                setTimeout(() => loginError.style.animation = 'shake 0.5s', 10);
            }
            if(loginPass) loginPass.value = '';
        }
    }

    if(btnLogin) btnLogin.addEventListener('click', attemptLogin);
    
    // Suporte para tecla ENTER no login
    if(loginPass) {
        loginPass.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    }

    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Deseja sair do sistema?")) {
                localStorage.removeItem('sysIsLoggedIn');
                location.reload();
            }
        });
    }

    // ==========================================
    // 2. DADOS E VARIÁVEIS GLOBAIS
    // ==========================================
    const initialMediators = [
        { id: 1, name: "Ricardo Mendes", entryDate: "12/10/2023", daysLeft: 15, status: "active", avatar: "https://i.pravatar.cc/150?img=12", online: true, docs: { front: null, back: null } }
    ];

    let mediators = [];
    let transactions = [];

    // Elementos DOM (Com verificação de existência)
    const listContainer = document.getElementById('mediatorList');
    const totalCountEl = document.getElementById('totalCount');
    const alertCountEl = document.getElementById('alertCount');

    // --- CARREGAMENTO ---
    function loadData() {
        try {
            const storedMed = localStorage.getItem('sysMediators');
            mediators = storedMed ? JSON.parse(storedMed) : JSON.parse(JSON.stringify(initialMediators));

            const storedFin = localStorage.getItem('sysFinance');
            transactions = storedFin ? JSON.parse(storedFin) : [];

            checkDailyCountdown(); // Verifica se virou o dia
            updateApp();
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
            alert("Erro ao carregar dados locais. O armazenamento pode estar corrompido.");
        }
    }

    function saveData() {
        try {
            localStorage.setItem('sysMediators', JSON.stringify(mediators));
            localStorage.setItem('sysFinance', JSON.stringify(transactions));
            updateApp();
        } catch (e) {
            alert("Memória cheia! Tente remover algumas imagens de documentos.");
        }
    }

    function updateApp() {
        renderMediators(mediators);
        renderFinance();
        if(totalCountEl) totalCountEl.innerText = mediators.length;
        if(alertCountEl) alertCountEl.innerText = mediators.filter(m => m.status === 'expired' || m.status === 'expiring').length;
    }

    // --- CONTAGEM AUTOMÁTICA (00:00) ---
    function checkDailyCountdown() {
        const lastDate = localStorage.getItem('sysLastCheck');
        const today = new Date().toDateString();

        if (lastDate && lastDate !== today) {
            const d1 = new Date(lastDate);
            const d2 = new Date();
            const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                let changed = false;
                mediators.forEach(user => {
                    if (user.daysLeft > 0) {
                        user.daysLeft = Math.max(0, user.daysLeft - diffDays);
                        // Atualiza status
                        if (user.daysLeft === 0) user.status = 'expired';
                        else if (user.daysLeft <= 5) user.status = 'expiring';
                        changed = true;
                    }
                });
                if(changed) saveData();
            }
        }
        localStorage.setItem('sysLastCheck', today);
    }

    // ==========================================
    // 3. MEDIADORES (Lista e Ações)
    // ==========================================
    function renderMediators(data) {
        if(!listContainer) return;
        listContainer.innerHTML = '';
        
        if (data.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">Nenhum mediador encontrado.</p>';
            return;
        }

        // Ordenar: Expirados primeiro, depois acabando, depois ativos
        data.sort((a, b) => a.daysLeft - b.daysLeft);

        data.forEach(user => {
            let statusHtml, btnAction;

            if (user.status === 'expired') {
                statusHtml = `<span class="status-label text-red">STATUS</span><span class="days-count text-red big-alert">EXPIRADO</span>`;
                btnAction = `<button class="action-btn text-yellow btn-renew" data-id="${user.id}"><i class="fa-solid fa-rotate-right"></i> RENOVAR (+7d)</button>`;
            } else {
                let color = user.daysLeft <= 5 ? 'text-red' : 'text-yellow';
                statusHtml = `<span class="status-label">DIAS RESTANTES</span><span class="days-count ${color}">${user.daysLeft} d</span>`;
                btnAction = `<button class="action-btn text-yellow btn-edit" data-id="${user.id}"><i class="fa-solid fa-pen"></i> EDITAR</button>`;
            }

            const hasDocs = user.docs && (user.docs.front || user.docs.back);
            
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <div class="card-header">
                    <div class="user-info">
                        <div class="avatar-wrapper">
                            <img src="${user.avatar}" onerror="this.src='https://via.placeholder.com/50'">
                            <span class="status-dot ${user.online?'online':'offline'}"></span>
                        </div>
                        <div class="text-details"><h3>${user.name}</h3><p>${user.entryDate}</p></div>
                    </div>
                    <div class="card-status">${statusHtml}</div>
                </div>
                <div class="card-actions">
                    <button class="action-btn ${hasDocs?'text-green':'text-white'} btn-docs" data-id="${user.id}">
                        <i class="${hasDocs?'fa-solid fa-check-circle':'fa-solid fa-file-image'}"></i> DOCS
                    </button>
                    ${btnAction}
                    <button class="action-btn text-red btn-rm" data-id="${user.id}">
                        <i class="fa-regular fa-trash-can"></i> REMOVER
                    </button>
                </div>
            `;
            listContainer.appendChild(div);
        });

        // Event Listeners Dinâmicos (Delegação de Eventos seria melhor, mas mantendo simples)
        document.querySelectorAll('.btn-docs').forEach(b => b.onclick = () => openDocs(parseInt(b.dataset.id)));
        document.querySelectorAll('.btn-edit').forEach(b => b.onclick = () => openEdit(parseInt(b.dataset.id)));
        document.querySelectorAll('.btn-rm').forEach(b => b.onclick = () => {
            if(confirm('Tem certeza que deseja remover este usuário permanentemente?')) {
                mediators = mediators.filter(m => m.id !== parseInt(b.dataset.id));
                saveData();
            }
        });
        document.querySelectorAll('.btn-renew').forEach(b => b.onclick = () => {
            const u = mediators.find(m => m.id === parseInt(b.dataset.id));
            if(u) { 
                u.daysLeft += 7; 
                u.status = u.daysLeft <= 5 ? 'expiring' : 'active'; 
                saveData(); 
                alert(`Renovado! ${u.name} agora tem ${u.daysLeft} dias.`); 
            }
        });
    }

    // ==========================================
    // 4. FINANCEIRO (Calculadora)
    // ==========================================
    const displayBalance = document.getElementById('displayBalance');
    const transListEl = document.getElementById('transactionList');
    const transCount = document.getElementById('transCount');
    
    // Inputs
    const incCategory = document.getElementById('incCategory');
    const incValue = document.getElementById('incValue');
    const btnIncome = document.getElementById('btnAddIncome');
    
    const expCategory = document.getElementById('expCategory');
    const expValue = document.getElementById('expValue');
    const btnExpense = document.getElementById('btnAddExpense');

    function addTransaction(type) {
        let desc, val, inputEl;
        if (type === 'income') {
            desc = incCategory ? incCategory.value : 'Entrada';
            val = parseFloat(incValue ? incValue.value : 0);
            inputEl = incValue;
        } else {
            desc = expCategory ? expCategory.value : 'Saída';
            val = parseFloat(expValue ? expValue.value : 0);
            inputEl = expValue;
        }

        if (isNaN(val) || val <= 0) return alert("Por favor, digite um valor válido.");

        transactions.unshift({
            id: Date.now(),
            desc: desc,
            value: type === 'income' ? val : -val,
            date: new Date().toLocaleDateString('pt-BR'),
            time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
        });
        saveData();
        if(inputEl) inputEl.value = '';
    }

    function removeTransaction(id) {
        if(confirm('Apagar este registro financeiro?')) {
            transactions = transactions.filter(t => t.id !== id);
            saveData();
        }
    }

    function renderFinance() {
        if(!transListEl) return;
        transListEl.innerHTML = '';
        
        const total = transactions.reduce((acc, item) => acc + item.value, 0);
        const fmt = (v) => v.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        
        if(displayBalance) {
            displayBalance.innerText = fmt(total);
            displayBalance.className = `balance-value ${total >= 0 ? 'positive' : 'negative'}`;
        }
        if(transCount) transCount.innerText = `${transactions.length} registros`;

        if (transactions.length === 0) {
            transListEl.innerHTML = '<p style="text-align:center; color:#555; padding:20px; font-size:0.8rem;">Nenhuma movimentação.</p>';
            return;
        }

        transactions.forEach(t => {
            const isInc = t.value >= 0;
            const item = document.createElement('div');
            item.className = 'trans-item';
            item.innerHTML = `
                <div class="trans-left">
                    <div class="trans-icon ${isInc?'green':'red'}"><i class="fa-solid ${isInc?'fa-arrow-up':'fa-arrow-down'}"></i></div>
                    <div class="trans-details"><h4>${t.desc}</h4><p>${t.date} às ${t.time}</p></div>
                </div>
                <div class="trans-right">
                    <div class="trans-val ${isInc?'text-green':'text-red'}">${isInc?'+':''} ${fmt(t.value)}</div>
                    <button class="btn-del-trans" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            transListEl.appendChild(item);
        });

        document.querySelectorAll('.btn-del-trans').forEach(b => b.onclick = () => removeTransaction(parseInt(b.dataset.id)));
    }

    if(btnIncome) btnIncome.onclick = () => addTransaction('income');
    if(btnExpense) btnExpense.onclick = () => addTransaction('expense');

    // ==========================================
    // 5. RELATÓRIOS (Semanal)
    // ==========================================
    const reportsList = document.getElementById('reportsList');

    function renderReports() {
        if(!reportsList) return;
        reportsList.innerHTML = '';
        
        if (transactions.length === 0) {
            reportsList.innerHTML = '<p style="text-align:center; color:#555; margin-top:20px;">Sem dados para relatório.</p>';
            return;
        }

        const weeklyGroups = {};
        transactions.forEach(t => {
            const parts = t.date.split('/');
            const dateObj = new Date(parts[2], parts[1]-1, parts[0]);
            
            const sunDate = new Date(dateObj); 
            sunDate.setDate(dateObj.getDate() - dateObj.getDay());
            
            const satDate = new Date(sunDate); 
            satDate.setDate(sunDate.getDate() + 6);

            const weekKey = `${formatDateShort(sunDate)} - ${formatDateShort(satDate)}`;
            const sortKey = sunDate.getTime();

            if(!weeklyGroups[weekKey]) weeklyGroups[weekKey] = { sort: sortKey, income: 0, expense: 0, balance: 0 };
            
            if(t.value >= 0) weeklyGroups[weekKey].income += t.value;
            else weeklyGroups[weekKey].expense += Math.abs(t.value);
            weeklyGroups[weekKey].balance += t.value;
        });

        Object.entries(weeklyGroups)
            .sort((a, b) => b[1].sort - a[1].sort)
            .forEach(([key, data]) => {
                const fmt = (v) => v.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
                const isProfit = data.balance >= 0;
                
                const card = document.createElement('div'); 
                card.className = 'report-card';
                card.innerHTML = `
                    <div class="rep-header">
                        <div class="rep-date"><h3>Semana</h3><span>${key}</span></div>
                        <div class="rep-status ${isProfit?'profit':'loss'}">${isProfit?'LUCRO':'PREJUÍZO'}</div>
                    </div>
                    <div class="rep-body">
                        <div class="rep-col"><span class="rep-label">ENTRADAS</span><span class="rep-val text-green">${fmt(data.income)}</span></div>
                        <div class="rep-col"><span class="rep-label">SAÍDAS</span><span class="rep-val text-red">${fmt(data.expense)}</span></div>
                        <div class="rep-col"><span class="rep-label">SALDO</span><span class="rep-val ${isProfit?'text-green':'text-red'}">${fmt(data.balance)}</span></div>
                    </div>
                `;
                reportsList.appendChild(card);
            });
    }

    function formatDateShort(date) { return date.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}); }

    // ==========================================
    // 6. NAVEGAÇÃO ENTRE TELAS
    // ==========================================
    const viewMediators = document.getElementById('viewMediators');
    const viewDashboard = document.getElementById('viewDashboard');
    const viewReports = document.getElementById('viewReports');
    
    const navDashboard = document.getElementById('navDashboard');
    const navMediators = document.getElementById('navMediators');
    const navReports = document.getElementById('navReports');
    
    const fabAddUser = document.getElementById('fabAddUser');
    const pageTitle = document.getElementById('pageTitle');

    function hideAll() {
        if(viewMediators) viewMediators.style.display='none';
        if(viewDashboard) viewDashboard.style.display='none';
        if(viewReports) viewReports.style.display='none';
        if(fabAddUser) fabAddUser.style.display='none';
        if(navDashboard) navDashboard.classList.remove('active');
        if(navMediators) navMediators.classList.remove('active');
        if(navReports) navReports.classList.remove('active');
    }

    if(navMediators) navMediators.onclick = () => { 
        hideAll(); 
        if(viewMediators) viewMediators.style.display='block'; 
        if(fabAddUser) fabAddUser.style.display='flex'; 
        if(pageTitle) pageTitle.innerText="PAINEL ADMIN"; 
        navMediators.classList.add('active'); 
    };

    if(navDashboard) navDashboard.onclick = () => { 
        hideAll(); 
        if(viewDashboard) viewDashboard.style.display='block'; 
        if(pageTitle) pageTitle.innerText="FINANCEIRO"; 
        navDashboard.classList.add('active'); 
    };

    if(navReports) navReports.onclick = () => { 
        hideAll(); 
        if(viewReports) viewReports.style.display='block'; 
        if(pageTitle) pageTitle.innerText="RELATÓRIOS"; 
        navReports.classList.add('active'); 
        renderReports(); 
    };

    // ==========================================
    // 7. MODAIS E LÓGICA DE UPLOAD
    // ==========================================
    const docsModal = document.getElementById('docsModal');
    const editModal = document.getElementById('editModal');
    const addModal = document.getElementById('addModal');
    const currentIdInput = document.getElementById('currentUserId');
    const modalTitle = document.getElementById('modalUserTitle');

    // Elementos de Preview
    const imgFront = document.getElementById('prevFront'); const phFront = document.getElementById('phFront');
    const imgBack = document.getElementById('prevBack'); const phBack = document.getElementById('phBack');
    const fileFront = document.getElementById('fileRgFront'); const fileBack = document.getElementById('fileRgBack');

    function openDocs(id) {
        const u = mediators.find(m => m.id === id);
        if(!u || !docsModal) return;
        currentIdInput.value = id;
        if(modalTitle) modalTitle.innerText = `Docs: ${u.name}`;
        updatePreview(imgFront, phFront, u.docs.front); if(fileFront) fileFront.value='';
        updatePreview(imgBack, phBack, u.docs.back); if(fileBack) fileBack.value='';
        docsModal.style.display = 'flex';
    }

    function openEdit(id) {
        const u = mediators.find(m => m.id === id);
        if(!u || !editModal) return;
        document.getElementById('editUserId').value = id;
        document.getElementById('editName').value = u.name;
        document.getElementById('editDate').value = u.entryDate;
        document.getElementById('editDays').value = u.daysLeft;
        editModal.style.display = 'flex';
    }

    function updatePreview(img, ph, src) {
        if(src) { if(img) {img.src=src; img.style.display='block';} if(ph) ph.style.display='none'; }
        else { if(img) {img.src=''; img.style.display='none';} if(ph) ph.style.display='flex'; }
    }

    // Compressão de imagem
    function compress(file, cb) {
        const r = new FileReader(); r.readAsDataURL(file);
        r.onload = e => { 
            const i = new Image(); i.src = e.target.result; 
            i.onload = () => { 
                const c = document.createElement('canvas'); const max=800; 
                let w=i.width, h=i.height; if(w>max){h*=max/w;w=max;} 
                c.width=w; c.height=h; c.getContext('2d').drawImage(i,0,0,w,h); 
                cb(c.toDataURL('image/jpeg', 0.8)); 
            }
        }
    }

    // Listeners de arquivo
    if(fileFront) fileFront.onchange = function(){ if(this.files[0]) compress(this.files[0], d=> { const u = mediators.find(m=>m.id==parseInt(currentIdInput.value)); u.docs.front = d; updatePreview(imgFront, phFront, d); })};
    if(fileBack) fileBack.onchange = function(){ if(this.files[0]) compress(this.files[0], d=> { const u = mediators.find(m=>m.id==parseInt(currentIdInput.value)); u.docs.back = d; updatePreview(imgBack, phBack, d); })};

    // Botões Salvar Modais
    const btnSaveDocs = document.getElementById('btnSaveDocs');
    if(btnSaveDocs) btnSaveDocs.onclick = () => { saveData(); docsModal.style.display='none'; };

    const btnResetDocs = document.getElementById('btnResetDocs');
    if(btnResetDocs) btnResetDocs.onclick = () => { 
        if(confirm('Apagar docs?')){ 
            const u = mediators.find(m=>m.id==parseInt(currentIdInput.value)); 
            u.docs.front=null; u.docs.back=null; 
            saveData(); 
            updatePreview(imgFront, phFront, null); updatePreview(imgBack, phBack, null); 
        }
    };

    const btnSaveEdit = document.getElementById('btnSaveEdit');
    if(btnSaveEdit) btnSaveEdit.onclick = () => {
        const u = mediators.find(m => m.id === parseInt(document.getElementById('editUserId').value));
        if(u) {
            u.name = document.getElementById('editName').value;
            u.entryDate = document.getElementById('editDate').value;
            u.daysLeft = parseInt(document.getElementById('editDays').value);
            u.status = u.daysLeft <= 0 ? 'expired' : (u.daysLeft <= 5 ? 'expiring' : 'active');
            saveData(); editModal.style.display='none';
        }
    }

    const btnSaveNew = document.getElementById('btnSaveNew');
    if(btnSaveNew) btnSaveNew.onclick = () => {
        const name = document.getElementById('addName').value;
        const days = parseInt(document.getElementById('addDays').value);
        if(!name) return alert("Nome obrigatório");
        
        mediators.push({
            id: Date.now(), 
            name: name, 
            entryDate: document.getElementById('addDate').value, 
            daysLeft: days, 
            status: (days<=0?'expired':(days<=5?'expiring':'active')), 
            avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random()*70)}`, 
            online: true, 
            docs: {front:null, back:null}
        });
        saveData(); 
        if(addModal) addModal.style.display='none';
    }

    if(fabAddUser) fabAddUser.onclick = () => { 
        document.getElementById('addName').value=''; 
        document.getElementById('addDate').value=''; 
        document.getElementById('addDays').value=''; 
        if(addModal) addModal.style.display='flex'; 
    };

    // Fechar Modais (X) e Clicar Fora
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = function() { 
        this.closest('.modal').style.display='none'; 
    });
    window.onclick = e => { if(e.target.classList.contains('modal')) e.target.style.display='none'; };

    // Lightbox
    const lightbox = document.getElementById('imageViewer');
    const fullImage = document.getElementById('fullImage');
    const closeLightbox = document.querySelector('.close-lightbox');

    if(lightbox && fullImage) {
        [imgFront, imgBack].forEach(i => {
            if(i) i.onclick = (e) => { e.preventDefault(); e.stopPropagation(); fullImage.src=i.src; lightbox.style.display='flex'; }
        });
        if(closeLightbox) closeLightbox.onclick = () => lightbox.style.display='none';
        lightbox.onclick = (e) => { if(e.target==lightbox) lightbox.style.display='none'; }
    }

    // Filtros e Busca
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
        document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
        const f = t.dataset.filter; renderMediators(f=='all'?mediators : mediators.filter(m=>m.status==f));
    });
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.oninput = e => renderMediators(mediators.filter(m=>m.name.toLowerCase().includes(e.target.value.toLowerCase())));

    // Check periódico (1 min)
    setInterval(checkDailyCountdown, 60000);
});
