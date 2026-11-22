export const numeric = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const money = (value) => currency.format(value);

export function monthOutcome(value) {
  if (value < 0) return { label: 'Убыток за месяц', tone: 'loss' };
  if (value > 0) return { label: 'Прибыль за месяц', tone: 'gain' };
  return { label: 'Месяц закрыт в ноль', tone: 'even' };
}
