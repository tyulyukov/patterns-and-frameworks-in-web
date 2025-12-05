class Subject {
  constructor() {
    this.observers = [];
  }

  attach(observer) {
    this.observers.push(observer);
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

class WeatherStation extends Subject {
  constructor() {
    super();
    this.temperature = 0;
    this.humidity = 0;
  }

  setMeasurements(temperature, humidity) {
    this.temperature = temperature;
    this.humidity = humidity;
    this.notify({ temperature, humidity });
  }
}

class PhoneDisplay {
  constructor(name) {
    this.name = name;
  }

  update(data) {
    console.log(`[${this.name}] Оновлення: Температура ${data.temperature}°C, Вологість ${data.humidity}%`);
  }
}

class DesktopDisplay {
  constructor(name) {
    this.name = name;
  }

  update(data) {
    console.log(`[${this.name}] Отримано дані погоди: ${data.temperature}°C / ${data.humidity}%`);
  }
}

class Logger {
  update(data) {
    console.log(`[LOGGER] ${new Date().toISOString()} - T:${data.temperature}°C H:${data.humidity}%`);
  }
}

const weatherStation = new WeatherStation();

const phoneDisplay1 = new PhoneDisplay('iPhone');
const phoneDisplay2 = new PhoneDisplay('Android');
const desktopDisplay = new DesktopDisplay('Desktop Widget');
const logger = new Logger();

weatherStation.attach(phoneDisplay1);
weatherStation.attach(phoneDisplay2);
weatherStation.attach(desktopDisplay);
weatherStation.attach(logger);

console.log('Перше оновлення погоди:');
weatherStation.setMeasurements(22, 65);

console.log('\nДруге оновлення погоди:');
weatherStation.setMeasurements(25, 70);

console.log('\nВідключення Android пристрою...');
weatherStation.detach(phoneDisplay2);

console.log('\nТретє оновлення погоди:');
weatherStation.setMeasurements(20, 60);

