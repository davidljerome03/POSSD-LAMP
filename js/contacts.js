// contacts.js

document.addEventListener('DOMContentLoaded', () => {
    const currentUserId = parseInt(localStorage.getItem('currentUserId'));
    
    // Auth Check
    if (!currentUserId) {
        window.location.href = 'index.html';
        return;
    }

    // Set Welcome Name
    const firstName = localStorage.getItem('currentUserFirstName');
    const lastName = localStorage.getItem('currentUserLastName');
    document.getElementById('welcomeName').textContent = `${firstName} ${lastName}`;

    // Elements
    const contactsGrid = document.getElementById('contactsGrid');
    const searchInput = document.getElementById('searchInput');
    const contactsError = document.getElementById('contactsError');
    
    const contactModal = document.getElementById('contactModal');
    const contactForm = document.getElementById('contactForm');
    const closeBtn = document.querySelector('.close-btn');
    const addContactBtn = document.getElementById('addContactBtn');
    const modalTitle = document.getElementById('modalTitle');
    const modalError = document.getElementById('modalError');

    const deleteModal = document.getElementById('deleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    let contactToDeleteId = null;

    // Load Contacts
    const loadContacts = async (search = '') => {
        try {
            const response = await MockAPI.getContacts(currentUserId, search);
            
            if (response.error) {
                showError(response.error);
                return;
            }

            renderContacts(response.results);
        } catch (err) {
            showError('Failed to load contacts.');
        }
    };

    // Render Contacts
    const renderContacts = (contacts) => {
        contactsGrid.innerHTML = '';
        
        if (contacts.length === 0) {
            contactsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No contacts found.</p>';
            return;
        }

        contacts.forEach((contact, index) => {
            const card = document.createElement('div');
            card.className = 'contact-card';
            
            // Safe rendering to prevent XSS
            const name = escapeHTML(`${contact.FirstName} ${contact.LastName}`);
            const phone = escapeHTML(contact.Phone || 'N/A');
            const email = escapeHTML(contact.Email || 'N/A');
            const initials = escapeHTML(`${contact.FirstName.charAt(0)}${contact.LastName.charAt(0)}`.toUpperCase());
            
            card.innerHTML = `
                <div class="contact-header">
                    <div class="contact-avatar">${initials}</div>
                    <span>${name}</span>
                </div>
                <div class="contact-detail">
                    <svg style="width:18px;height:18px;stroke-width:2.5px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    ${phone}
                </div>
                <div class="contact-detail">
                    <svg style="width:18px;height:18px;stroke-width:2.5px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    ${email}
                </div>
                <div class="contact-actions">
                    <button class="btn edit-btn" style="background:var(--card-bg); color:var(--text-main);" data-id="${contact.ID}">Edit</button>
                    <button class="btn btn-danger delete-btn" data-id="${contact.ID}">Delete</button>
                </div>
            `;
            
            contactsGrid.appendChild(card);
        });

        // Attach event listeners to newly created buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const contact = contacts.find(c => c.ID === id);
                if (contact) openModal(contact);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                contactToDeleteId = parseInt(e.target.getAttribute('data-id'));
                deleteModal.classList.add('active');
            });
        });
    };

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadContacts(e.target.value);
        }, 300); // debounce
    });

    // Modal Logic
    const openModal = (contact = null) => {
        modalError.classList.add('hidden');
        if (contact) {
            modalTitle.textContent = 'Edit Contact';
            document.getElementById('contactId').value = contact.ID;
            document.getElementById('contactFirstName').value = contact.FirstName;
            document.getElementById('contactLastName').value = contact.LastName;
            document.getElementById('contactPhone').value = contact.Phone || '';
            document.getElementById('contactEmail').value = contact.Email || '';
        } else {
            modalTitle.textContent = 'Add Contact';
            contactForm.reset();
            document.getElementById('contactId').value = '';
        }
        contactModal.classList.add('active');
    };

    const closeModal = () => {
        contactModal.classList.remove('active');
    };

    addContactBtn.addEventListener('click', () => openModal());
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === contactModal) closeModal();
        if (e.target === deleteModal) deleteModal.classList.remove('active');
    });

    // Save Contact
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('contactId').value;
        const firstName = document.getElementById('contactFirstName').value;
        const lastName = document.getElementById('contactLastName').value;
        const phone = document.getElementById('contactPhone').value;
        const email = document.getElementById('contactEmail').value;
        
        const submitBtn = contactForm.querySelector('button');
        submitBtn.disabled = true;
        
        try {
            let response;
            if (id) {
                response = await MockAPI.updateContact(currentUserId, parseInt(id), firstName, lastName, phone, email);
            } else {
                response = await MockAPI.addContact(currentUserId, firstName, lastName, phone, email);
            }

            if (response.error) {
                modalError.textContent = response.error;
                modalError.classList.remove('hidden');
            } else {
                closeModal();
                loadContacts(searchInput.value);
            }
        } catch (err) {
            modalError.textContent = 'An error occurred saving the contact.';
            modalError.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Delete Contact
    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.remove('active');
        contactToDeleteId = null;
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        if (!contactToDeleteId) return;
        
        confirmDeleteBtn.disabled = true;
        try {
            const response = await MockAPI.deleteContact(currentUserId, contactToDeleteId);
            if (!response.error) {
                deleteModal.classList.remove('active');
                loadContacts(searchInput.value);
            } else {
                showError(response.error);
            }
        } catch (err) {
            showError('Failed to delete contact.');
        } finally {
            confirmDeleteBtn.disabled = false;
            contactToDeleteId = null;
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUserFirstName');
        localStorage.removeItem('currentUserLastName');
        window.location.href = 'index.html';
    });

    // Utility
    const showError = (msg) => {
        contactsError.textContent = msg;
        contactsError.classList.remove('hidden');
        setTimeout(() => contactsError.classList.add('hidden'), 3000);
    };

    const escapeHTML = (str) => {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    };

    // Initial Load
    loadContacts();
});
