export const numeric = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const money = (value) => currency.format(value);
