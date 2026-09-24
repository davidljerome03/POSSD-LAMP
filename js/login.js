// login.js

const API_URL = 'index.php';

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to contacts or admin
    if (localStorage.getItem('currentUserId')) {
        if (localStorage.getItem('currentUserRole') === 'Admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'contacts.html';
        }
    }

    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');

    // Toggle forms
    showRegisterBtn.addEventListener('click', () => {
        loginCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
        loginError.classList.add('hidden');
        loginForm.reset();
    });

    showLoginBtn.addEventListener('click', () => {
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
        registerError.classList.add('hidden');
        registerForm.reset();
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const login = document.getElementById('loginUsername').value;
        const pass = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('button');
        
        btn.disabled = true;
        btn.textContent = 'Logging in...';
        
        try {
            const req = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: login, password: pass })
            });
            const response = await req.json();
            
            if (response.id > 0) {
                // Save session
                localStorage.setItem('currentUserId', response.id);
                localStorage.setItem('currentUserFirstName', response.firstName);
                localStorage.setItem('currentUserLastName', response.lastName);
                localStorage.setItem('currentUserRole', response.role || 'User');
                
                if (response.role === 'Admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'contacts.html';
                }
            } else {
                loginError.textContent = response.error || 'Login failed';
                loginError.classList.remove('hidden');
            }
        } catch (err) {
            loginError.textContent = 'An error occurred connecting to the API.';
            loginError.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Login';
        }
    });

    // Handle Registration
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const first = document.getElementById('regFirstName').value;
        const last = document.getElementById('regLastName').value;
        const login = document.getElementById('regUsername').value;
        const pass = document.getElementById('regPassword').value;
        const btn = registerForm.querySelector('button');
        
        btn.disabled = true;
        btn.textContent = 'Registering...';
        
        try {
            const req = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ first_name: first, last_name: last, login: login, password: pass })
            });
            
            let response;
            try {
                response = await req.json();
            } catch(e) {
                response = { error: "Failed to parse API response" };
            }
            
            if (req.ok && !response.error) {
                registerCard.classList.add('hidden');
                loginCard.classList.remove('hidden');
                document.getElementById('loginUsername').value = login;
                document.getElementById('loginPassword').value = '';
                loginError.textContent = 'Registration successful! Please log in.';
                loginError.style.color = 'var(--success-color)';
                loginError.classList.remove('hidden');
            } else {
                registerError.textContent = response.error || 'Registration failed';
                registerError.classList.remove('hidden');
            }
        } catch (err) {
            registerError.textContent = 'An error occurred during registration.';
            registerError.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Register';
        }
    });
});
