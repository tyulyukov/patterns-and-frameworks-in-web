class BaseNotifier {
	notify(message) {
		this.log('Email', message);
	}
	
	log(channel, message) {
		const logMessage = `[${channel}] ${message}`;
		console.log(logMessage);
		appendLog(logMessage);
	}
}

class NotifierDecorator extends BaseNotifier {
	constructor(next) {
		super();
		this.next = next;
	}
	
	notify(message) {
		if (this.next && typeof this.next.notify === 'function') {
			this.next.notify(message);
		}
	}
}

class TelegramNotifier extends NotifierDecorator {
	notify(message) {
		this.log('Telegram', message);
		super.notify(message);
	}
}

class WhatsAppNotifier extends NotifierDecorator {
	notify(message) {
		this.log('WhatsApp', message);
		super.notify(message);
	}
}

class PushNotifier extends NotifierDecorator {
	notify(message) {
		this.log('Push', message);
		super.notify(message);
	}
}

const logEl = document.getElementById('log');
const inputEl = document.getElementById('message');
const sendBtn = document.getElementById('send');
const tg = document.getElementById('tg');
const wa = document.getElementById('wa');
const push = document.getElementById('push');

function appendLog(line) {
	logEl.textContent += `${line}\n`;
}

sendBtn.addEventListener('click', () => {
	logEl.textContent = '';
	const message = inputEl.value || 'Приклад повідомлення';
	let notifier = new BaseNotifier();
	if (tg && tg.checked) notifier = new TelegramNotifier(notifier);
	if (wa && wa.checked) notifier = new WhatsAppNotifier(notifier);
	if (push && push.checked) notifier = new PushNotifier(notifier);
	notifier.notify(message);
});


