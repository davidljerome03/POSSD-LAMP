// mockApi.js
// Simulates the backend API and MySQL database using localStorage.

const DB_USERS_KEY = 'mock_db_users';
const DB_CONTACTS_KEY = 'mock_db_contacts';

// Initialize the mock database if it's empty
function initDB() {
    if (!localStorage.getItem(DB_USERS_KEY)) {
        // Match ContactManager.sql dummy data
        const initialUsers = [
            { ID: 1, FirstName: 'John', LastName: 'Smith', Login: 'jsmith', Password: 'password123', DateCreated: new Date().toISOString(), Role: 'Admin', IsDisabled: 0 },
            { ID: 2, FirstName: 'Jane', LastName: 'Doe', Login: 'jdoe', Password: 'test123', DateCreated: new Date().toISOString(), Role: 'User', IsDisabled: 0 }
        ];
        localStorage.setItem(DB_USERS_KEY, JSON.stringify(initialUsers));
    }
    
    if (!localStorage.getItem(DB_CONTACTS_KEY)) {
        // Match ContactManager.sql dummy data
        const initialContacts = [
            { ID: 1, FirstName: 'Bob', LastName: 'Johnson', Phone: '407-555-1111', Email: 'bob@email.com', UserID: 1, DateCreated: new Date().toISOString() },
            { ID: 2, FirstName: 'Sarah', LastName: 'Williams', Phone: '407-555-2222', Email: 'sarah@email.com', UserID: 1, DateCreated: new Date().toISOString() },
            { ID: 3, FirstName: 'Mike', LastName: 'Brown', Phone: '321-555-3333', Email: 'mike@email.com', UserID: 2, DateCreated: new Date().toISOString() }
        ];
        localStorage.setItem(DB_CONTACTS_KEY, JSON.stringify(initialContacts));
    }
}

initDB();

// Helper to simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MockAPI = {
    // ---- AUTHENTICATION ----
    
    login: async (login, password) => {
        await delay(300);
        const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
        const user = users.find(u => u.Login === login && u.Password === password);
        
        if (user) {
            if (user.IsDisabled) {
                return { error: "Account disabled. Please contact administrator.", id: 0 };
            }
            return { error: "", id: user.ID, firstName: user.FirstName, lastName: user.LastName, role: user.Role };
        } else {
            return { error: "No Records Found", id: 0, firstName: "", lastName: "" };
        }
    },
    
    register: async (firstName, lastName, login, password) => {
        await delay(300);
        const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
        
        if (users.find(u => u.Login === login)) {
            return { error: "The requested Login is already in use" };
        }
        
        const newUser = {
            ID: users.length > 0 ? Math.max(...users.map(u => u.ID)) + 1 : 1,
            FirstName: firstName,
            LastName: lastName,
            Login: login,
            Password: password,
            DateCreated: new Date().toISOString(),
            Role: 'User',
            IsDisabled: 0
        };
        
        users.push(newUser);
        localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
        
        return { error: "", message: "User successfully created", login: login };
    },

    // ---- CONTACTS ----

    getContacts: async (userId, search = "") => {
        await delay(300);
        const contacts = JSON.parse(localStorage.getItem(DB_CONTACTS_KEY));
        let userContacts = contacts.filter(c => c.UserID === userId);
        
        if (search) {
            const s = search.toLowerCase();
            userContacts = userContacts.filter(c => 
                c.FirstName.toLowerCase().includes(s) || 
                c.LastName.toLowerCase().includes(s) ||
                (c.Phone && c.Phone.includes(s)) ||
                (c.Email && c.Email.toLowerCase().includes(s))
            );
        }
        
        return { error: "", results: userContacts };
    },

    addContact: async (userId, firstName, lastName, phone, email) => {
        await delay(300);
        const contacts = JSON.parse(localStorage.getItem(DB_CONTACTS_KEY));
        
        const newContact = {
            ID: contacts.length > 0 ? Math.max(...contacts.map(c => c.ID)) + 1 : 1,
            FirstName: firstName,
            LastName: lastName,
            Phone: phone,
            Email: email,
            UserID: userId,
            DateCreated: new Date().toISOString()
        };
        
        contacts.push(newContact);
        localStorage.setItem(DB_CONTACTS_KEY, JSON.stringify(contacts));
        
        return { error: "", message: "Contact created", id: newContact.ID };
    },

    updateContact: async (userId, contactId, firstName, lastName, phone, email) => {
        await delay(300);
        const contacts = JSON.parse(localStorage.getItem(DB_CONTACTS_KEY));
        const index = contacts.findIndex(c => c.ID === contactId && c.UserID === userId);
        
        if (index === -1) {
            return { error: "Contact not found" };
        }
        
        contacts[index] = {
            ...contacts[index],
            FirstName: firstName,
            LastName: lastName,
            Phone: phone,
            Email: email,
            DateUpdated: new Date().toISOString()
        };
        
        localStorage.setItem(DB_CONTACTS_KEY, JSON.stringify(contacts));
        return { error: "", message: "Contact updated" };
    },

    deleteContact: async (userId, contactId) => {
        await delay(300);
        let contacts = JSON.parse(localStorage.getItem(DB_CONTACTS_KEY));
        const initialLength = contacts.length;
        
        contacts = contacts.filter(c => !(c.ID === contactId && c.UserID === userId));
        
        if (contacts.length === initialLength) {
            return { error: "Contact not found" };
        }
        
        localStorage.setItem(DB_CONTACTS_KEY, JSON.stringify(contacts));
        return { error: "", message: "Contact deleted" };
    },

    // ---- ADMIN ----

    getAllUsers: async (adminId, search = "") => {
        await delay(300);
        const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
        
        // Very basic mock validation
        const admin = users.find(u => u.ID === adminId && u.Role === 'Admin');
        if (!admin) return { error: "Unauthorized" };

        let results = users;
        if (search) {
            const s = search.toLowerCase();
            results = results.filter(u => 
                u.FirstName.toLowerCase().includes(s) || 
                u.LastName.toLowerCase().includes(s) ||
                u.Login.toLowerCase().includes(s)
            );
        }
        // Exclude passwords
        results = results.map(u => ({ ...u, Password: undefined }));
        return { error: "", results };
    },

    toggleUserStatus: async (adminId, targetUserId) => {
        await delay(300);
        const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
        const admin = users.find(u => u.ID === adminId && u.Role === 'Admin');
        if (!admin) return { error: "Unauthorized" };

        const target = users.find(u => u.ID === targetUserId);
        if (!target) return { error: "User not found" };

        target.IsDisabled = target.IsDisabled ? 0 : 1;
        localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
        return { error: "", message: "User status updated", isDisabled: target.IsDisabled };
    },

    resetUserPassword: async (adminId, targetUserId, newPassword) => {
        await delay(300);
        const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
        const admin = users.find(u => u.ID === adminId && u.Role === 'Admin');
        if (!admin) return { error: "Unauthorized" };

        const target = users.find(u => u.ID === targetUserId);
        if (!target) return { error: "User not found" };

        target.Password = newPassword;
        localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
        return { error: "", message: "Password updated successfully" };
    },

    createAdmin: async (adminId, firstName, lastName, login, password) => {
        await delay(300);
        const users = JSON.parse(localStorage.getItem(DB_USERS_KEY));
        const admin = users.find(u => u.ID === adminId && u.Role === 'Admin');
        if (!admin) return { error: "Unauthorized" };

        if (users.find(u => u.Login === login)) {
            return { error: "The requested Login is already in use" };
        }
        
        const newUser = {
            ID: users.length > 0 ? Math.max(...users.map(u => u.ID)) + 1 : 1,
            FirstName: firstName,
            LastName: lastName,
            Login: login,
            Password: password,
            DateCreated: new Date().toISOString(),
            Role: 'Admin',
            IsDisabled: 0
        };
        
        users.push(newUser);
        localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
        
        return { error: "", message: "Admin successfully created" };
    }
};
