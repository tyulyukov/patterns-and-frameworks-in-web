class Subject {
  constructor() {
    this.observers = [];
  }

  attach(observer) {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  detach(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notify(data) {
    this.observers.forEach(observer => observer.update(data));
  }
}

class ChatMediator {
  constructor() {
    this.rooms = new Map();
    this.users = new Map();
  }

  registerUser(user) {
    this.users.set(user.name, user);
    user.setMediator(this);
  }

  createRoom(roomName) {
    if (!this.rooms.has(roomName)) {
      const room = new Room(roomName);
      this.rooms.set(roomName, room);
      console.log(`[ChatMediator] Кімнату "${roomName}" створено`);
      return room;
    }
    return this.rooms.get(roomName);
  }

  getRoom(roomName) {
    return this.rooms.get(roomName);
  }

  joinRoom(user, roomName) {
    const room = this.rooms.get(roomName);
    if (room) {
      room.attach(user);
      console.log(`[ChatMediator] ${user.name} приєднався до кімнати "${roomName}"`);
    } else {
      console.log(`[ChatMediator] Кімната "${roomName}" не існує`);
    }
  }

  leaveRoom(user, roomName) {
    const room = this.rooms.get(roomName);
    if (room) {
      room.detach(user);
      console.log(`[ChatMediator] ${user.name} покинув кімнату "${roomName}"`);
    }
  }

  sendMessage(message, senderName, roomName) {
    const room = this.rooms.get(roomName);
    if (room) {
      room.notify({ message, sender: senderName, room: roomName });
    } else {
      console.log(`[ChatMediator] Кімната "${roomName}" не існує`);
    }
  }
}

class Room extends Subject {
  constructor(name) {
    super();
    this.name = name;
  }
}

class User {
  constructor(name) {
    this.name = name;
    this.mediator = null;
  }

  setMediator(mediator) {
    this.mediator = mediator;
  }

  joinRoom(roomName) {
    this.mediator.joinRoom(this, roomName);
  }

  leaveRoom(roomName) {
    this.mediator.leaveRoom(this, roomName);
  }

  sendMessage(message, roomName) {
    console.log(`[${this.name}] Відправляє в "${roomName}": "${message}"`);
    this.mediator.sendMessage(message, this.name, roomName);
  }

  update(data) {
    if (data.sender !== this.name) {
      console.log(`[${this.name}] Отримано в "${data.room}" від ${data.sender}: "${data.message}"`);
    }
  }
}

const chatMediator = new ChatMediator();

const alex = new User('Alex');
const bob = new User('Bob');
const charlie = new User('Charlie');
const diana = new User('Diana');

chatMediator.registerUser(alex);
chatMediator.registerUser(bob);
chatMediator.registerUser(charlie);
chatMediator.registerUser(diana);

console.log('\n--- Створення кімнат ---\n');
chatMediator.createRoom('General');
chatMediator.createRoom('Development');
chatMediator.createRoom('Design');

console.log('\n--- Користувачі приєднуються до кімнат ---\n');
alex.joinRoom('General');
bob.joinRoom('General');
charlie.joinRoom('General');

alex.joinRoom('Development');
bob.joinRoom('Development');

charlie.joinRoom('Design');
diana.joinRoom('Design');

console.log('\n--- Повідомлення в кімнаті General ---\n');
alex.sendMessage('Привіт всім!', 'General');
console.log();
bob.sendMessage('Привіт, Alex!', 'General');
console.log();
charlie.sendMessage('Доброго дня!', 'General');

console.log('\n--- Повідомлення в кімнаті Development ---\n');
alex.sendMessage('Потрібна допомога з кодом', 'Development');
console.log();
bob.sendMessage('Зараз подивлюсь', 'Development');

console.log('\n--- Повідомлення в кімнаті Design ---\n');
charlie.sendMessage('Новий макет готовий', 'Design');
console.log();
diana.sendMessage('Супер! Зараз перегляну', 'Design');

console.log('\n--- Bob покидає кімнату General ---\n');
bob.leaveRoom('General');

console.log('\n--- Нове повідомлення в General (Bob його не отримає) ---\n');
alex.sendMessage('Bob пішов, продовжуємо обговорення', 'General');

console.log('\n--- Diana приєднується до General ---\n');
diana.joinRoom('General');

console.log('\n--- Нове повідомлення в General ---\n');
charlie.sendMessage('Вітаю Diana в кімнаті!', 'General');

