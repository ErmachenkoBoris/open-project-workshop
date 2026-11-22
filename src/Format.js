export const numeric = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const money = (value) => currency.format(value);

export function groupMoneyInput(value) {
  const raw = String(value ?? '').replace(/\s+/g, '');
  const match = /^(\d*)([,.]\d*)?$/.exec(raw);
  if (!match) return raw;
  const [, whole, fraction = ''] = match;
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') + fraction;
}

export function monthOutcome(value) {
  if (value < 0) return { label: 'Убыток за месяц', tone: 'loss' };
  if (value > 0) return { label: 'Прибыль за месяц', tone: 'gain' };
  return { label: 'Месяц закрыт в ноль', tone: 'even' };
}
