/**
 * Particle System - Painel Admin SaaS
 * Engine reescrita 100% funcional, visível e de alta performance.
 */
(function renderParticles() {
    const canvas = document.getElementById('particles-bg');
    if (!canvas) {
        console.error("Canvas #particles-bg não encontrado no HTML!");
        return;
    }

    const ctx = canvas.getContext('2d');
    let particlesArray = [];
    let animFrame;
    let mouse = { x: null, y: null, radius: 100 };

    // ==========================================
    // SETUP E OTIMIZAÇÃO DE TELA (CORRIGE BLUR E INVISIBILIDADE)
    // ==========================================
    function setSize() {
        // DPR corrige o canvas ficando invisível em monitores 1080p+ ou telas de celular
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        
        // Trava o tamanho CSS
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        
        ctx.scale(dpr, dpr);
        createNodes();
    }

    window.addEventListener('resize', setSize);
    window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
    window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });

    // ==========================================
    // CLASSE DA PARTÍCULA
    // ==========================================
    class Node {
        constructor() {
            this.x = Math.random() * window.innerWidth;
            this.y = Math.random() * window.innerHeight;
            this.size = Math.random() * 2 + 1; // Entre 1px e 3px
            this.speedX = (Math.random() - 0.5) * 0.6;
            this.speedY = (Math.random() - 0.5) * 0.6 - 0.2; // Sobe levemente
            
            // MUITO mais visível (40% a 100% de opacidade)
            this.baseAlpha = Math.random() * 0.6 + 0.4; 
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            // Wrap Contínuo: Se sair da tela, volta pelo lado oposto
            if (this.x > window.innerWidth) this.x = 0;
            else if (this.x < 0) this.x = window.innerWidth;
            
            if (this.y > window.innerHeight) this.y = 0;
            else if (this.y < 0) this.y = window.innerHeight;

            // Interação Repulsiva do Mouse
            if (mouse.x != null && mouse.y != null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < mouse.radius) {
                    let forceDirX = dx / dist;
                    let forceDirY = dy / dist;
                    let force = (mouse.radius - dist) / mouse.radius;
                    
                    this.x -= forceDirX * force * 2;
                    this.y -= forceDirY * force * 2;
                }
            }
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(238, 188, 29, ${this.baseAlpha})`;
            
            // Glow dourado OBRIGATÓRIO
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(238, 188, 29, 0.8)';
            
            ctx.fill();
        }
    }

    // ==========================================
    // GERADOR DE PARTÍCULAS (RESPONSIVO)
    // ==========================================
    function createNodes() {
        particlesArray = [];
        const isMobile = window.innerWidth < 768;
        const total = isMobile ? 30 : 70; // 70 Desktop, 30 Mobile
        
        for (let i = 0; i < total; i++) {
            particlesArray.push(new Node());
        }
    }

    // ==========================================
    // LOOP DE ANIMAÇÃO 
    // ==========================================
    function animate() {
        // Limpa o frame anterior perfeitamente
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();
            
            // Conexões (Constelação)
            if (window.innerWidth >= 768) {
                for (let j = i; j < particlesArray.length; j++) {
                    let dx = particlesArray[i].x - particlesArray[j].x;
                    let dy = particlesArray[i].y - particlesArray[j].y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 110) {
                        ctx.beginPath();
                        let lineOpacity = 1 - (dist / 110);
                        // Linha mais visível e brilhante
                        ctx.strokeStyle = `rgba(238, 188, 29, ${lineOpacity * 0.5})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                        ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                        ctx.stroke();
                    }
                }
            }
        }
        animFrame = requestAnimationFrame(animate);
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    // Evita gastar bateria em abas em segundo plano
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(animFrame);
        else animate();
    });

    setSize(); // Configura, cria nós e ajusta DPR
    animate(); // Dispara o motor
})();