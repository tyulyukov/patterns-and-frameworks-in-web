class Money {
    constructor(amount, currency = "UAH") {
        if (amount < 0) {
            throw new Error("Amount cannot be negative");
        }
        this._amount = amount;
        this._currency = currency;
    }

    static zero(currency = "UAH") {
        return new Money(0, currency);
    }

    get amount() {
        return this._amount;
    }

    get currency() {
        return this._currency;
    }

    add(other) {
        if (this._currency !== other._currency) {
            throw new Error("Cannot add money with different currencies");
        }

        return new Money(this._amount + other._amount, this._currency);
    }

    multiply(multiplier) {
        return new Money(this._amount * multiplier, this._currency);
    }

    toString() {
        return `${this._amount} ${this._currency}`;
    }

    equals(other) {
        return this._amount === other._amount && this._currency === other._currency;
    }
}

class Item {
    constructor(name, basePrice) {
        if (!(basePrice instanceof Money)) {
            throw new Error('basePrice must be an instance of Money');
        }
        this._name = name;
        this._basePrice = basePrice;
    }

    get name() {
        return this._name;
    }

    get basePrice() {
        return this._basePrice;
    }

    calculateFinalPrice() {
        throw new Error('Method calculateFinalPrice() must be implemented');
    }
}

class FoodItem extends Item {
    static DISCOUNT_RATE = 0.9;

    calculateFinalPrice() {
        return this._basePrice.multiply(FoodItem.DISCOUNT_RATE);
    }
}

class ElectronicsItem extends Item {
    static TAX_RATE = 1.2;

    calculateFinalPrice() {
        return this._basePrice.multiply(ElectronicsItem.TAX_RATE);
    }
}

class RegularItem extends Item {
    calculateFinalPrice() {
        return this._basePrice;
    }
}

class ItemFactory {
    static itemTypeMap = new Map([
        ["food", FoodItem],
        ["electronics", ElectronicsItem]
    ]);

    static createItem(itemData) {
        const { name, price, type } = itemData;
        const moneyPrice = new Money(price);
        const ItemClass = this.itemTypeMap.get(type) || RegularItem;
        return new ItemClass(name, moneyPrice);
    }
}

class Order {
    constructor(items, customerName) {
        this._items = items;
        this._customerName = customerName;
    }

    get items() {
        return [...this._items];
    }

    get customerName() {
        return this._customerName;
    }

    calculateTotal() {
        return this._items.reduce((total, item) => {
            return total.add(item.calculateFinalPrice());
        }, Money.zero());
    }
}

class ReceiptPrinter {
    constructor(outputCallback = console.log) {
        this._outputCallback = outputCallback;
    }

    printCustomerName(customerName) {
        this._outputCallback(`Замовлення для: ${customerName}`);
    }

    printItem(item) {
        this._outputCallback(`${item.name} - ${item.basePrice.amount} грн`);
    }

    printTotal(total) {
        this._outputCallback(`Загальна сума: ${total.amount} грн`);
    }

    printReceipt(order) {
        this.printCustomerName(order.customerName);
        order.items.forEach(item => this.printItem(item));
        this.printTotal(order.calculateTotal());
    }
}

const itemsData = [
    { name: "Хліб", price: 20, type: "food" },
    { name: "Телефон", price: 5000, type: "electronics" },
    { name: "Книга", price: 200, type: "other" }
];

const items = itemsData.map(itemData => ItemFactory.createItem(itemData));
const order = new Order(items, "Олексій");

const printer = new ReceiptPrinter();
printer.printReceipt(order);
