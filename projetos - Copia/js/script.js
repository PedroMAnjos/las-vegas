let state = {
    mediators: [
        {id:1, name:"Pedro", role:"ADM", daysLeft:10},
        {id:2, name:"João", role:"SUP", daysLeft:5},
        {id:3, name:"Maria", role:"AUX", daysLeft:2}
    ]
};

// LOGIN
document.getElementById("btnLogin").onclick = () => {
    let user = document.getElementById("loginUser").value;
    let pass = document.getElementById("loginPass").value;

    if(user === "admin" && pass === "admin"){
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("appScreen").style.display = "flex";
        render();
    } else {
        alert("Login inválido");
    }
};

// LOGOUT
document.getElementById("btnLogout").onclick = () => location.reload();

// CLOCK
setInterval(()=>{
    let el = document.getElementById("clock");
    if(el) el.innerText = new Date().toLocaleTimeString();
},1000);

// RENDER
function render(){
    let container = document.getElementById("mediatorList");
    container.innerHTML = "";

    state.mediators.forEach(user=>{
        let role = user.role.toLowerCase();

        let row = document.createElement("div");
        row.className = "table-row";

        row.innerHTML = `
            <div class="row-info">
                <img class="row-avatar" src="https://i.pravatar.cc/150?img=${user.id}">
                <div>
                    <div class="row-name">${user.name}</div>
                    <span class="role-badge badge-${role}">${user.role}</span>
                </div>
            </div>

            <div class="days-count">${user.daysLeft}</div>

            <div>
                <button class="action-btn text-yellow">Editar</button>
                <button class="action-btn text-red">Excluir</button>
            </div>
        `;

        container.appendChild(row);
    });

    document.getElementById("totalCount").innerText = state.mediators.length;
}
