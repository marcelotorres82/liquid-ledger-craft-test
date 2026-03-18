const API_BASE = '/api';

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const login = document.getElementById('login').value.trim();
    const senha = document.getElementById('senha').value;
    const btnLogin = document.getElementById('btnLogin');
    const alert = document.getElementById('alert');
    
    btnLogin.textContent = 'Entrando...';
    btnLogin.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', login, senha })
        });

        const rawBody = await response.text();
        let data = null;
        try {
            data = rawBody ? JSON.parse(rawBody) : null;
        } catch (_) {
            data = null;
        }

        if (response.ok && data?.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            showAlert('Login realizado! Redirecionando...', 'success');
            setTimeout(() => window.location.href = 'app/', 1000);
        } else {
            const message = data?.message
                || (rawBody ? `Falha no login (${response.status}): ${rawBody.slice(0, 120)}` : `Falha no login (${response.status})`);
            showAlert(message, 'error');
            btnLogin.textContent = 'Entrar';
            btnLogin.disabled = false;
        }
    } catch (error) {
        showAlert(`Erro ao conectar ao servidor: ${error.message || 'verifique sua conexão'}`, 'error');
        btnLogin.textContent = 'Entrar';
        btnLogin.disabled = false;
    }
});

function showAlert(message, type) {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

async function checkAuth() {
    const user = localStorage.getItem('user');
    
    if (!user && !window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

function logout() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado'))
            .catch(err => console.log('Erro ao registrar Service Worker:', err));
    });
}
