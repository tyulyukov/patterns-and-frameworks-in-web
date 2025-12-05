class Mediator {
  constructor() {
    this.colleagues = new Map();
  }

  register(colleague) {
    this.colleagues.set(colleague.name, colleague);
    colleague.setMediator(this);
  }

  send(message, sender, receiverName) {
    const receiver = this.colleagues.get(receiverName);
    if (receiver) {
      receiver.receive(message, sender.name);
    } else {
      console.log(`[Mediator] Учасник ${receiverName} не знайдено`);
    }
  }

  broadcast(message, sender) {
    this.colleagues.forEach(colleague => {
      if (colleague !== sender) {
        colleague.receive(message, sender.name);
      }
    });
  }
}

class Colleague {
  constructor(name) {
    this.name = name;
    this.mediator = null;
  }

  setMediator(mediator) {
    this.mediator = mediator;
  }

  send(message, receiverName) {
    console.log(`[${this.name}] Відправляє: "${message}" → ${receiverName}`);
    this.mediator.send(message, this, receiverName);
  }

  broadcast(message) {
    console.log(`[${this.name}] Broadcast: "${message}"`);
    this.mediator.broadcast(message, this);
  }

  receive(message, senderName) {
    console.log(`[${this.name}] Отримано від ${senderName}: "${message}"`);
  }
}

class Developer extends Colleague {
  receive(message, senderName) {
    console.log(`[${this.name} - Developer] Отримано від ${senderName}: "${message}"`);
  }
}

class Manager extends Colleague {
  receive(message, senderName) {
    console.log(`[${this.name} - Manager] Отримано від ${senderName}: "${message}"`);
  }
}

class Designer extends Colleague {
  receive(message, senderName) {
    console.log(`[${this.name} - Designer] Отримано від ${senderName}: "${message}"`);
  }
}

const mediator = new Mediator();

const john = new Developer('John');
const sarah = new Manager('Sarah');
const mike = new Designer('Mike');
const alice = new Developer('Alice');

mediator.register(john);
mediator.register(sarah);
mediator.register(mike);
mediator.register(alice);

console.log('--- Приватні повідомлення ---\n');
john.send('Потрібна допомога з API', 'Alice');
console.log();

sarah.send('Коли буде готовий макет?', 'Mike');
console.log();

mike.send('Макет готовий, перевірте', 'Sarah');
console.log();

console.log('--- Broadcast повідомлення ---\n');
sarah.broadcast('Збори о 15:00 в конференц-залі');
console.log();

john.broadcast('Деплой на прод завершено!!');

