/**
 * ANJOW SS - OPERATIONAL CORE
 * Dev Sênior: Pedro Mestre dos Anjos
 */

const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbxQRnCtiPJ9vWwCou-R3NctG39vdN6yKRz_k7NFNkxJe9fC_z4r81o7WIOaQ37zqi4-/exec",
    REFRESH_RATE: 60000 // 1 minuto
};

document.addEventListener('DOMContentLoaded', () => {
    
    // ESTADO INTERNO DA APLICAÇÃO
    let state = {
        mediators: [],
        filteredMediators: [],
        transactions: [],
        searchTerm: "",
        currentView: "viewMediators"
    };

    // --- 1. SISTEMA DE LOGIN E SESSÃO ---
    const auth = {
        check: () => {
            if (localStorage.getItem('sysIsLoggedIn') === 'true') {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('appScreen').style.display = 'flex';
                app.init();
            }
        },
        login: () => {
            const user = document.getElementById('loginUser').value.toLowerCase();
            const pass = document.getElementById('loginPass').value;
            
            // Credenciais mestre
            if ((user === 'admin' && pass === 'admin') || (user === 'pedro' && pass === 'mestre')) {
                localStorage.setItem('sysIsLoggedIn', 'true');
                location.reload();
            } else {
                const err = document.getElementById('loginError');
                err.style.display = 'flex';
                setTimeout(() => err.style.display = 'none', 3000);
            }
        },
        logout: () => {
            if(confirm("Deseja encerrar a sessão administrativa?")) {
                localStorage.removeItem('sysIsLoggedIn');
                location.reload();
            }
        }
    };

    // --- 2. COMUNICAÇÃO COM O BANCO DE DADOS (API) ---
    const api = {
        fetchData: async () => {
            try {
                const response = await fetch(CONFIG.API_URL, { method: 'GET', redirect: 'follow' });
                const result = await response.json();
                
                if (result && result.equipe) {
                    // TRAVA DE UNICIDADE: Remove duplicatas por nome antes de salvar no estado
                    state.mediators = api.deduplicate(result.equipe);
                    state.transactions = result.financeiro || [];
                    ui.renderAll();
                    logger.add("Sincronização com nuvem concluída com sucesso.");
                }
            } catch (error) {
                logger.add("Erro crítico na comunicação com o banco de dados.", "error");
                console.error("Fetch Error:", error);
            }
        },
        
        deduplicate: (data) => {
            const seen = new Set();
            return data.filter(item => {
                const key = (item.name || "").toLowerCase().trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        },

        updateMember: async (updatedData) => {
            try {
                await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ type: "UPDATE_EQUIPE", data: state.mediators })
                });
                logger.add(`Membro ${updatedData.name} atualizado.`);
            } catch (e) { logger.add("Erro ao salvar alteração.", "error"); }
        }
    };

    // --- 3. MOTOR DE RENDERIZAÇÃO (UI) ---
    const ui = {
        renderMediators: () => {
            const container = document.getElementById('mediatorList');
            if(!container) return;
            container.innerHTML = '';

            // Aplicar Filtro de Pesquisa
            state.filteredMediators = state.mediators.filter(m => 
                m.name.toLowerCase().includes(state.searchTerm) || 
                m.role.toLowerCase().includes(state.searchTerm)
            );

            state.filteredMediators.forEach(user => {
                const role = (user.role || "").toUpperCase();
                
                // LÓGICA DE CARGOS ILIMITADOS
                const isUnlimited = role.includes("SUP") || role.includes("AUX");
                const isExpired = !isUnlimited && parseInt(user.daysLeft) <= 0;

                const timeText = isUnlimited ? "ILIMITADO" : (isExpired ? "EXPIRADO" : `${user.daysLeft} DIAS`);
                const colorClass = isUnlimited ? "text-green" : (isExpired ? "text-red" : "text-yellow");

                const row = document.createElement('div');
                row.className = 'table-row';
                row.innerHTML = `
                    <div class="row-info">
                        <h4 class="row-name">${user.name}</h4>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span class="role-badge">${user.role}</span>
                            <small class="text-muted">#${user.idForm || 'ID'}</small>
                        </div>
                    </div>
                    <div class="row-status-col" style="text-align: center;">
                        <span class="status-label" style="display:block; font-size:0.6rem; color:var(--text-muted)">TEMPO RESTANTE</span>
                        <span class="days-count ${colorClass}">${timeText}</span>
                    </div>
                    <div class="row-actions" style="display:flex; justify-content:flex-end; gap:10px;">
                        <button class="action-btn btn-plus" data-id="${user.id}" title="Adicionar 7 dias">+7</button>
                        <button class="action-btn btn-edit-user" data-id="${user.id}"><i class="fa-solid fa-user-gear"></i></button>
                        <button class="action-btn btn-del" data-id="${user.id}" style="color:var(--alert-red)"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                container.appendChild(row);
            });

            ui.updateCounters();
        },

        updateCounters: () => {
            document.getElementById('totalCount').innerText = state.mediators.length;
            const expired = state.mediators.filter(m => {
                const r = m.role.toUpperCase();
                return !r.includes("SUP") && !r.includes("AUX") && m.daysLeft <= 0;
            }).length;
            document.getElementById('alertCount').innerText = expired;
            document.getElementById('activeCount').innerText = state.mediators.length - expired;
        },

        renderAll: () => {
            ui.renderMediators();
            // Atualiza Balanço Financeiro
            const balance = state.transactions.reduce((acc, t) => acc + (t.value || 0), 0);
            document.getElementById('displayBalance').innerText = balance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        }
    };

    // --- 4. UTILITÁRIOS E EVENTOS ---
    const logger = {
        add: (msg, type = "info") => {
            const logBox = document.getElementById('activityLogs');
            if(!logBox) return;
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            entry.innerHTML = `<small>${new Date().toLocaleTimeString()}</small> <span>${msg}</span>`;
            logBox.prepend(entry);
        }
    };

    const app = {
        init: () => {
            api.fetchData();
            app.startClock();
            app.bindEvents();
            setInterval(api.fetchData, CONFIG.REFRESH_RATE);
        },

        startClock: () => {
            setInterval(() => {
                document.getElementById('clockDisplay').innerText = new Date().toLocaleTimeString();
            }, 1000);
        },

        bindEvents: () => {
            // Pesquisa
            document.getElementById('searchInput').addEventListener('input', (e) => {
                state.searchTerm = e.target.value.toLowerCase();
                ui.renderMediators();
            });

            // Navegação
            document.querySelectorAll('.nav-item').forEach(item => {
                item.onclick = () => {
                    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                    document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
                    item.classList.add('active');
                    const viewId = item.dataset.view;
                    document.getElementById(viewId).classList.add('active');
                    document.getElementById('viewTitle').innerText = item.innerText.toUpperCase();
                };
            });

            // Cliques na Lista (Delegation)
            document.getElementById('mediatorList').onclick = (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                
                const id = btn.dataset.id;
                const user = state.mediators.find(m => m.id == id);

                if (btn.classList.contains('btn-plus')) {
                    user.daysLeft = (parseInt(user.daysLeft) || 0) + 7;
                    ui.renderMediators();
                    api.updateMember(user);
                } else if (btn.classList.contains('btn-edit-user')) {
                    modals.openEdit(user);
                }
            };

            // Botão Sync
            document.getElementById('btnSyncDrive').onclick = api.fetchData;
            
            // Botão Logout
            document.getElementById('btnLogout').onclick = auth.logout;
        }
    };

    const modals = {
        openEdit: (user) => {
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editName').value = user.name;
            document.getElementById('editRole').value = user.role;
            document.getElementById('editDays').value = user.daysLeft;
            document.getElementById('editModal').style.display = 'flex';
        },
        close: () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
        }
    };

    // Vincular fechamento de modais
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = modals.close);
    
    // Início do Login
    document.getElementById('btnLogin').onclick = auth.login;
    auth.check();
});
