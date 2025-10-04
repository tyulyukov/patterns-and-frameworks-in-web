const Role = {
  USER: 'User',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
	SUPERADMIN: 'SuperAdmin'
};

class User {
  id;
  name;
  email;
  role;
  isDeleted;
  #password;
  #warnings;
  #mutedUntil;

  constructor(name, email, password) {
		this.id = globalThis.crypto.randomUUID();
    this.name = name;
    this.email = email;
    this.role = Role.USER;
    this.isDeleted = false;
    this.#password = String(password);
    this.#warnings = 0;
    this.#mutedUntil = 0;
  }

  getInfo() {
    return { id: this.id, name: this.name, email: this.email, role: this.role, isDeleted: this.isDeleted };
  }

  checkPassword(input) {
    return this.#password === String(input);
  }

  getRole() {
    return this.role;
  }

  setPasswordAs(requester, newPassword) {
    const requesterRole = requester?.getRole?.() || null;
    if (requesterRole === Role.ADMIN || requesterRole === Role.SUPERADMIN) {
      this.#password = String(newPassword);
      return true;
    }
    return false;
  }

  addWarning() {
    this.#warnings += 1;
    return this.#warnings;
  }

  mute(durationMs) {
    const until = Date.now() + Math.max(0, durationMs);
    this.#mutedUntil = until;
    return until;
  }

  getWarnings() {
    return this.#warnings;
  }

  isMuted() {
    return Date.now() < this.#mutedUntil;
  }

  getMuteRemainingMs() {
    const remaining = this.#mutedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }

	serialize() {
		return {
			id: this.id,
			name: this.name,
			email: this.email,
			role: this.role,
			isDeleted: this.isDeleted,
			password: this.#password,
			warnings: this.#warnings,
			mutedUntil: this.#mutedUntil
		};
	}

	hydrateFromSerialized(data) {
		this.id = data?.id || this.id;
		this.isDeleted = !!data?.isDeleted;
		this.#password = String(data?.password || '');
		this.#warnings = Number(data?.warnings || 0);
		this.#mutedUntil = Number(data?.mutedUntil || 0);
	}

	static deserialize(data) {
		const role = data?.role;
		const name = data?.name || '';
		const email = data?.email || '';
		const password = String(data?.password || '');
		let instance;
		if (role === Role.ADMIN) instance = new Admin(name, email, password);
		else if (role === Role.MODERATOR) instance = new Moderator(name, email, password);
		else if (role === Role.SUPERADMIN) instance = new SuperAdmin(name, email, password);
		else instance = new User(name, email, password);
		instance.hydrateFromSerialized({
			id: data?.id,
			isDeleted: data?.isDeleted,
			password,
			warnings: data?.warnings,
			mutedUntil: data?.mutedUntil
		});
		return instance;
	}
}

class Admin extends User {
  constructor(name, email, password) {
    super(name, email, password);
    this.role = Role.ADMIN;
  }

  deleteUser(user) {
    const wasDeleted = user.isDeleted;
    user.isDeleted = true;
    return !wasDeleted && user.isDeleted;
  }

  resetPassword(user, newPassword) {
    return user.setPasswordAs(this, newPassword);
  }
}

class Moderator extends User {
  constructor(name, email, password) {
    super(name, email, password);
    this.role = Role.MODERATOR;
  }

  warnUser(user) {
    return user.addWarning();
  }

  muteUser(user, durationMs) {
    return user.mute(durationMs);
  }
}

class SuperAdmin extends Admin {
  constructor(name, email, password) {
    super(name, email, password);
    this.role = Role.SUPERADMIN;
  }

  createAdmin(name, email, password) {
    return new Admin(name, email, password);
  }
}

const openUserDb = () => new Promise((resolve, reject) => {
	const request = indexedDB.open('users-db', 1);
	request.onupgradeneeded = () => {
		const db = request.result;
		if (!db.objectStoreNames.contains('users')) {
			const store = db.createObjectStore('users', { keyPath: 'id' });
			store.createIndex('name', 'name');
			store.createIndex('email', 'email');
			store.createIndex('role', 'role');
			store.createIndex('isDeleted', 'isDeleted');
		}
	};
	request.onsuccess = () => resolve(request.result);
	request.onerror = () => reject(request.error);
});

class UserDataBase {
	static #instance;
	#dbPromise;

	constructor() {
		if (UserDataBase.#instance) return UserDataBase.#instance;
		this.#dbPromise = openUserDb();
		UserDataBase.#instance = this;
	}

	static async getInstance() {
		if (!UserDataBase.#instance) new UserDataBase();
		return UserDataBase.#instance;
	}

	async #withStore(mode, fn) {
		const db = await this.#dbPromise;
		return new Promise((resolve, reject) => {
			const tx = db.transaction('users', mode);
			const store = tx.objectStore('users');
			let done = false;
			const finish = (value) => { if (!done) { done = true; resolve(value); } };
			tx.oncomplete = () => finish(undefined);
			tx.onerror = () => reject(tx.error);
			const result = fn(store);
			if (result instanceof Promise) result.then(finish).catch(reject);
		});
	}

	async #put(user) {
		const payload = user instanceof User ? user.serialize() : user;
		await this.#withStore('readwrite', (store) => { store.put(payload); });
		return true;
	}

	async CreateUser(user) {
		return this.#put(user);
	}

	async saveUser(user) {
		return this.#put(user);
	}

	async DeleteUser(criteria) {
		const list = await this.SearchUser(typeof criteria === 'string' ? { id: criteria } : criteria);
		for (const u of list) {
			u.isDeleted = true;
			await this.#put(u);
		}
		return list.length;
	}

	async DeleteAllUsers(criteria) {
		const list = await this.SearchUser(criteria || {});
		for (const u of list) {
			u.isDeleted = true;
			await this.#put(u);
		}
		return list.length;
	}

	async SearchUser(criteria) {
		const all = await new Promise(async (resolve, reject) => {
			try {
				const db = await this.#dbPromise;
				const tx = db.transaction('users', 'readonly');
				const store = tx.objectStore('users');
				const req = store.getAll();
				req.onsuccess = () => resolve(req.result || []);
				req.onerror = () => reject(req.error);
			} catch (e) { reject(e); }
		});
		const users = all.map(d => User.deserialize(d));
		if (!criteria || Object.keys(criteria).length === 0) return users;
		const q = String(criteria.q || '').toLowerCase();
		const id = criteria.id || null;
		const name = criteria.name ? String(criteria.name).toLowerCase() : '';
		const email = criteria.email ? String(criteria.email).toLowerCase() : '';
		const role = criteria.role || null;
		const isDeleted = typeof criteria.isDeleted === 'boolean' ? criteria.isDeleted : null;
		return users.filter(u => {
			if (id && u.id !== id) return false;
			if (q && !(u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
			if (name && !u.name.toLowerCase().includes(name)) return false;
			if (email && !u.email.toLowerCase().includes(email)) return false;
			if (role && u.getRole() !== role) return false;
			if (isDeleted !== null && u.isDeleted !== isDeleted) return false;
			return true;
		});
	}
}

const usersEl = document.getElementById('users');
const activeSelect = document.getElementById('active-user');
const selectedInfoEl = document.getElementById('selected');
const activeInfoEl = document.getElementById('active-info');
const logEl = document.getElementById('log');
const searchEl = document.getElementById('search');

const form = document.getElementById('create-form');
const inputName = document.getElementById('name');
const inputEmail = document.getElementById('email');
const inputPassword = document.getElementById('password');
const inputRole = document.getElementById('role');

const btnWarn = document.getElementById('action-warn');
const inputMuteMin = document.getElementById('mute-min');
const btnMute = document.getElementById('action-mute');
const inputCheckPass = document.getElementById('check-pass');
const btnCheck = document.getElementById('action-check');
const inputNewPass = document.getElementById('new-pass');
const btnReset = document.getElementById('action-reset');
const btnDelete = document.getElementById('action-delete');
const btnClearLog = document.getElementById('clear-log');

let users = [];
let selectedUserId = null;
let activeUserId = null;
let db = null;

const byId = (id) => users.find(u => u.id === id) || null;

const canModerate = (actor) => !!actor && actor.getRole() === Role.MODERATOR;
const canAdmin = (actor) => !!actor && (actor.getRole() === Role.ADMIN || actor.getRole() === Role.SUPERADMIN);

const log = (msg) => {
	const time = new Date().toLocaleTimeString();
	logEl.textContent += `[${time}] ${msg}\n`;
	logEl.scrollTop = logEl.scrollHeight;
};

const fmtMs = (ms) => {
	if (ms >= 60000) return `${Math.ceil(ms / 60000)} хв`;
	if (ms >= 1000) return `${Math.ceil(ms / 1000)} с`;
	return `${ms} мс`;
};

const renderActiveSelect = () => {
	const current = activeUserId;
	activeSelect.innerHTML = users.map(u => `<option value="${u.id}" ${u.id === current ? 'selected' : ''}>${u.name} — ${u.getRole()}</option>`).join('');
	const actor = byId(activeSelect.value);
	activeUserId = actor ? actor.id : null;
	activeInfoEl.textContent = actor ? `${actor.name} (${actor.email}), роль: ${actor.getRole()}` : '';
	if (selectedUserId === activeUserId) {
		selectedUserId = null;
		renderSelectedInfo();
	}
	renderUsers();
	updateActionAvailability();
};

const renderUsers = () => {
	const q = (searchEl.value || '').toLowerCase();
	const list = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
	usersEl.innerHTML = list.map(u => {
		const selected = u.id === selectedUserId;
		const muted = u.isMuted();
		const warn = u.getWarnings();
		const isActive = u.id === activeUserId;
		const parts = [];
		parts.push(`<div class="item" data-id="${u.id}" ${selected ? 'data-selected="1"' : ''}>
      <div>
        <div>${u.name} <span class="muted">${u.email}</span></div>
        <div class="row">
          <span class="badge">${u.getRole()}</span>
          <span class="pill">Попередження: ${warn}</span>
          ${muted ? `<span class="pill">Заблоковано: ${fmtMs(u.getMuteRemainingMs())}</span>` : ''}
          ${u.isDeleted ? `<span class="pill">Видалено</span>` : ''}
        </div>
      </div>
	      <button class="btn" data-select="${u.id}" ${isActive ? 'disabled' : ''}>${isActive ? 'Активний' : (selected ? 'Вибрано' : 'Вибрати')}</button>
    </div>`);
		return parts.join('');
	}).join('');
};

const renderSelectedInfo = () => {
	const u = byId(selectedUserId);
	if (!u) {
		selectedInfoEl.textContent = 'Немає вибраного користувача';
		return;
	}
	const muted = u.isMuted();
	selectedInfoEl.textContent = `${u.name} (${u.email}), роль: ${u.getRole()} | Попередження: ${u.getWarnings()} | ${muted ? `М'ют ще ${fmtMs(u.getMuteRemainingMs())}` : 'Не м\'ют'} ${u.isDeleted ? ' | Видалено' : ''}`;
	updateActionAvailability();
};

const updateActionAvailability = () => {
	const actor = byId(activeUserId);
	const target = byId(selectedUserId);
	const canWarnMute = !!actor && canModerate(actor) && !!target && !target.isDeleted;
	const canResDel = !!actor && canAdmin(actor) && !!target && !target.isDeleted;
	const canSelf = !!actor && !!target && actor.id === target.id;
	btnWarn.disabled = !canWarnMute;
	btnMute.disabled = !canWarnMute;
	btnReset.disabled = !canResDel || !inputNewPass.value;
	btnDelete.disabled = !canResDel;
	btnCheck.disabled = !target || !inputCheckPass.value || !(canResDel || canSelf);
};

usersEl.addEventListener('click', (e) => {
	const btn = e.target.closest('button[data-select]');
	if (btn) {
		const targetId = btn.getAttribute('data-select');
		if (targetId === activeUserId) {
			log('Не можна вибрати активного користувача');
			return;
		}
		selectedUserId = targetId;
		renderUsers();
		renderSelectedInfo();
		return;
	}
	const holder = e.target.closest('[data-id]');
	if (holder) {
		const targetId = holder.getAttribute('data-id');
		if (targetId === activeUserId) {
			log('Не можна вибрати активного користувача');
			return;
		}
		selectedUserId = targetId;
		renderUsers();
		renderSelectedInfo();
	}
});

activeSelect.addEventListener('change', () => {
	activeUserId = activeSelect.value;
	renderActiveSelect();
});

searchEl.addEventListener('input', () => {
	renderUsers();
});

form.addEventListener('submit', async (e) => {
	e.preventDefault();
	const n = inputName.value.trim();
	const em = inputEmail.value.trim();
	const pw = inputPassword.value;
	const r = inputRole.value;
	let u;
	if (r === Role.MODERATOR) u = new Moderator(n, em, pw);
	else if (r === Role.ADMIN) u = new Admin(n, em, pw);
	else if (r === Role.SUPERADMIN) u = new SuperAdmin(n, em, pw);
	else u = new User(n, em, pw);
	users.push(u);
	await db.CreateUser(u);
	if (!activeUserId) activeUserId = u.id;
	log(`Створено: ${u.name} як ${u.getRole()}`);
	inputName.value = '';
	inputEmail.value = '';
	inputPassword.value = '';
	renderUsers();
	renderActiveSelect();
});

btnWarn.addEventListener('click', async () => {
	const actor = byId(activeUserId);
	const target = byId(selectedUserId);
	if (!actor || !target) return;
	if (!canModerate(actor) || target.isDeleted) {
		log('Немає прав для попередження');
		return;
	}
	const num = actor.warnUser(target);
	log(`${actor.name} попередив(ла) ${target.name}. Всього: ${num}`);
	await db.saveUser(target);
	renderUsers();
	renderSelectedInfo();
});

btnMute.addEventListener('click', async () => {
	const actor = byId(activeUserId);
	const target = byId(selectedUserId);
	if (!actor || !target) return;
	if (!canModerate(actor) || target.isDeleted) {
		log('Немає прав для м\'юту');
		return;
	}
	const minutes = Math.max(0, Number(inputMuteMin.value || 0));
	const until = actor.muteUser(target, minutes * 60 * 1000);
	log(`${actor.name} зам'ютив(ла) ${target.name} до ${new Date(until).toLocaleTimeString()}`);
	await db.saveUser(target);
	renderUsers();
	renderSelectedInfo();
});

btnReset.addEventListener('click', async () => {
	const actor = byId(activeUserId);
	const target = byId(selectedUserId);
	if (!actor || !target) return;
	if (!canAdmin(actor) || target.isDeleted) {
		log('Немає прав для скидання пароля');
		return;
	}
	const np = inputNewPass.value;
	if (!np) {
		updateActionAvailability();
		return;
	}
	const ok = actor.resetPassword(target, np);
	log(ok ? `${actor.name} змінив(ла) пароль ${target.name}` : 'Не вдалося змінити пароль');
	inputNewPass.value = '';
	if (ok) await db.saveUser(target);
	updateActionAvailability();
});

btnDelete.addEventListener('click', async () => {
	const actor = byId(activeUserId);
	const target = byId(selectedUserId);
	if (!actor || !target) return;
	if (!canAdmin(actor) || target.isDeleted) {
		log('Немає прав для видалення');
		return;
	}
	const ok = actor.deleteUser(target);
	log(ok ? `${actor.name} видалив(ла) ${target.name}` : 'Не вдалося видалити користувача');
	if (ok) await db.saveUser(target);
	renderUsers();
	renderSelectedInfo();
	renderActiveSelect();
});

btnCheck.addEventListener('click', () => {
	const actor = byId(activeUserId);
	const target = byId(selectedUserId);
	if (!target) return;
	const canSelf = !!actor && actor.id === target.id;
	if (!(canAdmin(actor) || canSelf)) {
		log('Немає прав для перевірки пароля');
		return;
	}
	const input = inputCheckPass.value;
	const ok = target.checkPassword(input);
	log(`Перевірка пароля для ${target.name}: ${ok ? 'вірно' : 'невірно'}`);
	updateActionAvailability();
});

inputNewPass.addEventListener('input', updateActionAvailability);
inputCheckPass.addEventListener('input', updateActionAvailability);
inputMuteMin.addEventListener('input', updateActionAvailability);

btnClearLog.addEventListener('click', () => { logEl.textContent = ''; });

const boot = async () => {
	db = await UserDataBase.getInstance();
	users = await db.SearchUser({});
	renderUsers();
	renderActiveSelect();
	renderSelectedInfo();
	setInterval(async () => {
		const before = selectedUserId;
		users = await db.SearchUser({});
		renderUsers();
		selectedUserId = before;
		renderSelectedInfo();
	}, 500);
};

boot();
