// admin.js

const ADMIN_API = 'admin_api.php';

document.addEventListener('DOMContentLoaded', () => {
    const currentUserId = parseInt(localStorage.getItem('currentUserId'));
    const currentUserRole = localStorage.getItem('currentUserRole');
    
    // Auth Check
    if (!currentUserId || currentUserRole !== 'Admin') {
        window.location.href = 'index.html';
        return;
    }

    // Set Welcome Name
    const firstName = localStorage.getItem('currentUserFirstName');
    const lastName = localStorage.getItem('currentUserLastName');
    document.getElementById('welcomeName').textContent = `${firstName} ${lastName}`;

    // Nav / Sections
    const showUsersBtn = document.getElementById('showUsersBtn');
    const createAdminBtn = document.getElementById('createAdminBtn');
    const usersSection = document.getElementById('usersSection');
    const createAdminSection = document.getElementById('createAdminSection');
    
    // UI Elements
    const adminError = document.getElementById('adminError');
    const usersTbody = document.getElementById('usersTbody');
    const adminSearchInput = document.getElementById('adminSearchInput');
    
    // Forms & Modals
    const createAdminForm = document.getElementById('createAdminForm');
    const createAdminError = document.getElementById('createAdminError');
    
    const passwordModal = document.getElementById('passwordModal');
    const passwordForm = document.getElementById('passwordForm');
    const closePasswordModal = document.getElementById('closePasswordModal');
    
    const userContactsModal = document.getElementById('userContactsModal');
    const userContactsTbody = document.getElementById('userContactsTbody');
    const closeContactsModal = document.getElementById('closeContactsModal');

    // -- NAV LOGIC --
    showUsersBtn.addEventListener('click', () => {
        showUsersBtn.style.background = 'var(--accent-color)';
        showUsersBtn.style.color = '#000';
        createAdminBtn.style.background = 'var(--bg-color)';
        createAdminBtn.style.color = 'var(--text-main)';
        usersSection.classList.remove('hidden');
        createAdminSection.classList.add('hidden');
        loadUsers();
    });

    createAdminBtn.addEventListener('click', () => {
        createAdminBtn.style.background = 'var(--accent-color)';
        createAdminBtn.style.color = '#000';
        showUsersBtn.style.background = 'var(--bg-color)';
        showUsersBtn.style.color = 'var(--text-main)';
        createAdminSection.classList.remove('hidden');
        usersSection.classList.add('hidden');
    });

    // -- LOAD USERS --
    const loadUsers = async (search = '') => {
        try {
            let url = ADMIN_API + '?action=users';
            if (search) url += '&q=' + encodeURIComponent(search);
            
            const req = await fetch(url, { headers: { 'Authorization': currentUserId } });
            const response = await req.json();
            
            if (response.error) {
                showError(response.error);
                return;
            }
            renderUsers(response.results);
        } catch (err) {
            showError('Failed to load users.');
        }
    };

    const renderUsers = (users) => {
        usersTbody.innerHTML = '';
        if (users.length === 0) {
            usersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No users found.</td></tr>';
            return;
        }

        users.forEach(user => {
            const tr = document.createElement('tr');
            
            const roleBadge = user.Role === 'Admin' ? 'badge-admin' : 'badge-user';
            const isDisabled = parseInt(user.IsDisabled) === 1;
            const statusBadge = isDisabled ? '<span class="badge badge-disabled">Disabled</span>' : '<span class="badge" style="background:#ccff00;color:#000;">Active</span>';
            const actionBtnText = isDisabled ? 'Enable' : 'Disable';
            const actionBtnColor = isDisabled ? 'var(--card-bg)' : 'var(--danger-color)';
            
            tr.innerHTML = `
                <td>${user.ID}</td>
                <td style="font-weight:700;">${escapeHTML(user.FirstName + ' ' + user.LastName)}</td>
                <td>${escapeHTML(user.Login)}</td>
                <td><span class="badge ${roleBadge}">${user.Role}</span></td>
                <td>${statusBadge}</td>
                <td class="admin-actions">
                    <button class="btn contacts-btn" style="background:var(--card-bg);color:var(--text-main);" data-id="${user.ID}" data-login="${escapeHTML(user.Login)}">Contacts</button>
                    <button class="btn pass-btn" style="background:var(--card-bg);color:var(--text-main);" data-id="${user.ID}" data-login="${escapeHTML(user.Login)}">Pass</button>
                    <button class="btn toggle-btn" style="background:${actionBtnColor};color:${isDisabled ? 'var(--text-main)' : '#fff'};" data-id="${user.ID}">${actionBtnText}</button>
                </td>
            `;
            usersTbody.appendChild(tr);
        });

        // Attach listeners
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const targetId = parseInt(e.target.getAttribute('data-id'));
                if (targetId === currentUserId) {
                    showError("You cannot disable yourself!");
                    return;
                }
                
                const req = await fetch(ADMIN_API + '?action=toggle_status', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': currentUserId },
                    body: JSON.stringify({ id: targetId })
                });
                const res = await req.json();
                
                if (!res.error) loadUsers(adminSearchInput.value);
                else showError(res.error);
            });
        });

        document.querySelectorAll('.pass-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = parseInt(e.target.getAttribute('data-id'));
                const login = e.target.getAttribute('data-login');
                document.getElementById('resetUserId').value = targetId;
                document.getElementById('resetUserLogin').textContent = login;
                passwordModal.classList.add('active');
            });
        });

        document.querySelectorAll('.contacts-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const targetId = parseInt(e.target.getAttribute('data-id'));
                const login = e.target.getAttribute('data-login');
                document.getElementById('contactsUserLogin').textContent = login;
                
                // Fetch their contacts
                const req = await fetch(ADMIN_API + '?action=user_contacts&id=' + targetId, {
                    headers: { 'Authorization': currentUserId }
                });
                const res = await req.json();
                
                userContactsTbody.innerHTML = '';
                
                if (res.results && res.results.length > 0) {
                    res.results.forEach(c => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${escapeHTML(c.FirstName + ' ' + c.LastName)}</td>
                            <td>${escapeHTML(c.Phone || 'N/A')}</td>
                            <td>${escapeHTML(c.Email || 'N/A')}</td>
                        `;
                        userContactsTbody.appendChild(row);
                    });
                } else {
                    userContactsTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No contacts found.</td></tr>';
                }
                
                userContactsModal.classList.add('active');
            });
        });
    };

    // -- SEARCH --
    let searchTimeout;
    adminSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadUsers(e.target.value), 300);
    });

    // -- MODAL LOGIC --
    closePasswordModal.addEventListener('click', () => passwordModal.classList.remove('active'));
    closeContactsModal.addEventListener('click', () => userContactsModal.classList.remove('active'));
    
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetId = parseInt(document.getElementById('resetUserId').value);
        const newPass = document.getElementById('newPasswordInput').value;
        const btn = passwordForm.querySelector('button');
        btn.disabled = true;
        
        const req = await fetch(ADMIN_API + '?action=reset_password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': currentUserId },
            body: JSON.stringify({ id: targetId, password: newPass })
        });
        const res = await req.json();
        
        if (!res.error) {
            passwordModal.classList.remove('active');
            passwordForm.reset();
        } else {
            document.getElementById('passwordModalError').textContent = res.error;
            document.getElementById('passwordModalError').classList.remove('hidden');
        }
        btn.disabled = false;
    });

    // -- CREATE ADMIN --
    createAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const first = document.getElementById('newAdminFirst').value;
        const last = document.getElementById('newAdminLast').value;
        const login = document.getElementById('newAdminLogin').value;
        const pass = document.getElementById('newAdminPassword').value;
        const btn = createAdminForm.querySelector('button');
        
        btn.disabled = true;
        
        const req = await fetch(ADMIN_API + '?action=create_admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': currentUserId },
            body: JSON.stringify({ first_name: first, last_name: last, login: login, password: pass })
        });
        const res = await req.json();
        
        if (!res.error) {
            createAdminForm.reset();
            createAdminError.classList.add('hidden');
            // Go back to users view to see them
            showUsersBtn.click();
        } else {
            createAdminError.textContent = res.error;
            createAdminError.classList.remove('hidden');
        }
        btn.disabled = false;
    });

    // -- UTILS --
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUserFirstName');
        localStorage.removeItem('currentUserLastName');
        localStorage.removeItem('currentUserRole');
        window.location.href = 'index.html';
    });

    const showError = (msg) => {
        adminError.textContent = msg;
        adminError.classList.remove('hidden');
        setTimeout(() => adminError.classList.add('hidden'), 3000);
    };

    const escapeHTML = (str) => {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    };

    // Init
    loadUsers();
});
