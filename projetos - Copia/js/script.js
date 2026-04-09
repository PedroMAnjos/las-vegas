/**
 * ANJOW SS - OPERATIONAL CORE (FIXED VERSION)
 */

const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbyJCGLo6eMHyn0PPlFXdpC0A-3RIZEIFYGmDnnUi9PNieiXZm7wsklX22ZEyRIV6mDLrA/exec",
    REFRESH_RATE: 60000
};

document.addEventListener('DOMContentLoaded', () => {

    let state = {
        mediators: [],
        transactions: [],
        searchTerm: ""
    };

    // ================= LOGIN =================
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

            if ((user === 'admin' && pass === 'admin') || (user === 'pedro' && pass === 'mestre')) {
                localStorage.setItem('sysIsLoggedIn', 'true');
                location.reload();
            } else {
                const err = document.getElementById('loginError');
                err.style.display = 'block';
                setTimeout(() => err.style.display = 'none', 3000);
            }
        },
        logout: () => {
            localStorage.removeItem('sysIsLoggedIn');
            location.reload();
        }
    };

    // ================= API =================
    const api = {
        fetchData: async () => {
            try {
                const res = await fetch(CONFIG.API_URL);

                if (!res.ok) throw new Error("Erro na requisição");

                const data = await res.json();

                console.log("API DATA:", data);

                state.mediators = data.equipe || [];
                state.transactions = data.financeiro || [];

                ui.renderAll();

            } catch (e) {
                console.error("Erro API:", e);
                alert("Erro ao conectar com servidor.");
            }
        }
    };

    // ================= UI =================
    const ui = {

        renderMediators: () => {
            const container = document.getElementById('mediatorList');
            if (!container) return;

            container.innerHTML = '';

            const list = state.mediators.filter(m =>
                m.name.toLowerCase().includes(state.searchTerm)
            );

            list.forEach(user => {

                const role = (user.role || "").toLowerCase();

                let roleClass = '';
                if (role.includes('adm')) roleClass = 'adm';
                else if (role.includes('sup')) roleClass = 'sup';
                else if (role.includes('aux')) roleClass = 'aux';

                const row = document.createElement('div');
                row.className = 'table-row';

                row.innerHTML = `
                    <div>
                        <div class="row-name">${user.name}</div>
                        <span class="role-badge ${roleClass}">${user.role}</span>
                    </div>

                    <div class="days-count">
                        ${user.daysLeft || 0}
                    </div>

                    <div>
                        <button class="action-btn btn-edit" data-id="${user.id}">Editar</button>
                    </div>
                `;

                container.appendChild(row);
            });

            document.getElementById('totalCount').innerText = list.length;
        },

        renderAll: () => {
            ui.renderMediators();

            const balance = state.transactions.reduce((acc, t) => acc + (t.value || 0), 0);

            const el = document.getElementById('displayBalance');
            if (el) {
                el.innerText = balance.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });
            }
        }
    };

    // ================= APP =================
    const app = {
        init: () => {
            api.fetchData();
            app.clock();
            app.events();
            setInterval(api.fetchData, CONFIG.REFRESH_RATE);
        },

        clock: () => {
            setInterval(() => {
                const now = new Date();
                document.getElementById('clock').innerText = now.toLocaleTimeString();
            }, 1000);
        },

        events: () => {

            const search = document.getElementById('searchInput');
            if (search) {
                search.addEventListener('input', e => {
                    state.searchTerm = e.target.value.toLowerCase();
                    ui.renderMediators();
                });
            }

            document.querySelectorAll('.nav-item').forEach(item => {
                item.onclick = () => {
                    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                };
            });

            const logoutBtn = document.getElementById('btnLogout');
            if (logoutBtn) logoutBtn.onclick = auth.logout;
        }
    };

    document.getElementById('btnLogin').onclick = auth.login;
    auth.check();
});
