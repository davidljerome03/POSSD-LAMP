// login.js

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to contacts
    if (localStorage.getItem('currentUserId')) {
        window.location.href = 'contacts.html';
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
            const response = await MockAPI.login(login, pass);
            if (response.id > 0) {
                // Save session
                localStorage.setItem('currentUserId', response.id);
                localStorage.setItem('currentUserFirstName', response.firstName);
                localStorage.setItem('currentUserLastName', response.lastName);
                
                window.location.href = 'contacts.html';
            } else {
                loginError.textContent = response.error;
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
            const response = await MockAPI.register(first, last, login, pass);
            if (!response.error) {
                // Automatically log them in or ask them to log in
                // Let's just switch back to the login screen and pre-fill the username
                registerCard.classList.add('hidden');
                loginCard.classList.remove('hidden');
                document.getElementById('loginUsername').value = login;
                document.getElementById('loginPassword').value = '';
                loginError.textContent = 'Registration successful! Please log in.';
                loginError.style.color = 'var(--success-color)';
                loginError.classList.remove('hidden');
            } else {
                registerError.textContent = response.error;
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
