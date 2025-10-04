const ROLES = {
    USER: 'User',
    ADMIN: 'Admin',
    MODERATOR: 'Moderator',
    SUPERADMIN: 'SuperAdmin'
};

class User {
    constructor(name, email, password) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.type = ROLES.USER;
    }
}

class Admin extends User {
    constructor(name, email, password) {
        super(name, email, password);
        this.type = ROLES.ADMIN;
    }

    deleteUser(user) {
        Logger.getInstance().logAction(`видалив користувача ${user.name}`, this);
    }
}

class Moderator extends User {
    constructor(name, email, password) {
        super(name, email, password);
        this.type = ROLES.MODERATOR;
    }

    warnUser(user) {
        Logger.getInstance().logAction(`видав попередження користувачу ${user.name}`, this);
    }

    blockUser(user) {
        Logger.getInstance().logAction(`заблокував користувача ${user.name}`, this);
    }
}

class SuperAdmin extends Admin {
    constructor(name, email, password) {
        super(name, email, password);
        this.type = ROLES.SUPERADMIN;
    }

    createUser(type, name, email, password) {
        const user = UserFactory.createUser(type, name, email, password);
        Logger.getInstance().logAction(`створив користувача ${name} типу ${type}`, this);
        return user;
    }
}

class UserFactory {
    static userTypes = new Map([
        ['user', User],
        ['admin', Admin],
        ['moderator', Moderator],
        ['superadmin', SuperAdmin]
    ]);

    static createUser(type, name, email, password) {
        const UserClass = this.userTypes.get(type.toLowerCase());
        
        if (!UserClass) {
            throw new Error(`Невідомий тип користувача: ${type}`);
        }
        
        return new UserClass(name, email, password);
    }
}

class Logger {
    static instance = null;
    
    constructor() {
        if (Logger.instance) {
            return Logger.instance;
        }
        this.logs = [];
        Logger.instance = this;
    }

    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    logAction(action, user) {
        const timestamp = new Date().toLocaleString('uk-UA');
        const logEntry = `[${timestamp}] [${user.name}] виконав дію: ${action}`;
        this.logs.push(logEntry);
        this.renderLogs();
    }

    getLogs() {
        return this.logs;
    }

    renderLogs() {
        const logsList = document.getElementById('logsList');
        if (!logsList) return;
        
        if (this.logs.length === 0) {
            logsList.innerHTML = '<p class="empty-state">Журнал порожній</p>';
            return;
        }

        logsList.innerHTML = this.logs
            .slice()
            .reverse()
            .map(log => `<div class="log-entry">${log}</div>`)
            .join('');
    }
}

class UserManager {
    constructor() {
        this.users = [];
    }

    addUser(user) {
        this.users.push(user);
        this.renderUsers();
    }

    getUserByEmail(email) {
        return this.users.find(u => u.email === email);
    }

    removeUser(email) {
        const index = this.users.findIndex(u => u.email === email);
        if (index !== -1) {
            this.users.splice(index, 1);
            this.renderUsers();
            return true;
        }
        return false;
    }

    findAdmin() {
        return this.users.find(u => u instanceof Admin);
    }

    findModerator() {
        return this.users.find(u => u instanceof Moderator);
    }

    renderUsers() {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        if (this.users.length === 0) {
            usersList.innerHTML = '<p class="empty-state">Користувачі відсутні</p>';
            return;
        }

        usersList.innerHTML = this.users
            .map(user => `
                <div class="user-card">
                    <div class="user-info">
                        <span class="user-type ${user.type.toLowerCase()}">${user.type}</span>
                        <strong>${user.name}</strong>
                        <span class="user-email">${user.email}</span>
                    </div>
                    <div class="user-actions">
                        <button class="btn-small btn-warn" data-email="${user.email}">Попередження</button>
                        <button class="btn-small btn-block" data-email="${user.email}">Блокувати</button>
                        <button class="btn-small btn-danger" data-email="${user.email}">Видалити</button>
                    </div>
                </div>
            `)
            .join('');

        this.attachEventListeners();
    }

    attachEventListeners() {
        document.querySelectorAll('.btn-warn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const email = e.target.dataset.email;
                const user = this.getUserByEmail(email);
                const moderator = this.findModerator();
                
                if (user && moderator) {
                    moderator.warnUser(user);
                }
            });
        });

        document.querySelectorAll('.btn-block').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const email = e.target.dataset.email;
                const user = this.getUserByEmail(email);
                const moderator = this.findModerator();
                
                if (user && moderator) {
                    moderator.blockUser(user);
                }
            });
        });

        document.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const email = e.target.dataset.email;
                const user = this.getUserByEmail(email);
                const admin = this.findAdmin();
                
                if (user && admin) {
                    admin.deleteUser(user);
                    this.removeUser(email);
                }
            });
        });
    }
}

const userManager = new UserManager();

document.getElementById('userForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = document.getElementById('userType').value;
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;

    try {
        const user = UserFactory.createUser(type, name, email, password);
        userManager.addUser(user);
        Logger.getInstance().logAction(`створено користувача ${name} типу ${type}`, user);
        
        e.target.reset();
    } catch (error) {
        alert(error.message);
    }
});

document.getElementById('runTestScenario').addEventListener('click', () => {
    const superAdmin = new SuperAdmin('Олександр', 'superadmin@example.com', 'pass123');
    userManager.addUser(superAdmin);

    const user1 = superAdmin.createUser('user', 'Іван', 'ivan@example.com', 'pass123');
    userManager.addUser(user1);

    const user2 = superAdmin.createUser('user', 'Марія', 'maria@example.com', 'pass123');
    userManager.addUser(user2);

    const admin1 = superAdmin.createUser('admin', 'Петро', 'petro@example.com', 'pass123');
    userManager.addUser(admin1);

    const moderator1 = superAdmin.createUser('moderator', 'Ольга', 'olga@example.com', 'pass123');
    userManager.addUser(moderator1);

    setTimeout(() => {
        moderator1.warnUser(user1);
        moderator1.blockUser(user2);
    }, 500);

    setTimeout(() => {
        admin1.deleteUser(user1);
        userManager.removeUser(user1.email);
    }, 1000);
});

Logger.getInstance().renderLogs();
userManager.renderUsers();
