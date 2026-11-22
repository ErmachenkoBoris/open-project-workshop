export function number(value) {
  const normalized = String(value ?? '').replace(/\s+/g, '').replace(',', '.');
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(normalized)) return NaN;
  return Number(normalized);
}

export const moneyLimit = 100_000_000;

export function moneyInput(value) {
  const parsed = number(value);
  return parsed <= moneyLimit ? parsed : NaN;
}

function optionalMoney(value) {
  return String(value ?? '').trim() ? moneyInput(value) : 0;
}

function valid(...values) {
  return values.every((value) => Number.isFinite(value) && value >= 0);
}

export function estimateAcquisition(values, acquisition, target = 'budget') {
  const fromClicks = target !== 'organic' && acquisition === 'clicks';
  const cpc = moneyInput(values.cpc);
  const registrationRate = number(values.registrationRate) / 100;
  if (fromClicks && (!valid(cpc, registrationRate) || registrationRate > 1)) return null;
  const costPerRegistration = target === 'organic' ? 0 : fromClicks ? cpc / registrationRate : moneyInput(values.cpa);
  if (!valid(costPerRegistration) || (target !== 'organic' && costPerRegistration === 0)) return null;
  const budget = target === 'budget' ? moneyInput(values.budget) : number(values.targetUsers) * costPerRegistration;
  const users = target === 'budget' ? budget / costPerRegistration : number(values.targetUsers);
  if (!valid(budget, users) || (target !== 'budget' && !Number.isSafeInteger(users))) return null;
  const clicks = fromClicks ? budget / cpc : null;
  return {
    budget, users, clicks, costPerRegistration,
    cpc: fromClicks ? cpc : null,
    unregisteredClicks: fromClicks ? Math.max(0, clicks - users) : null,
  };
}

export const expenseFields = {
  upfront: [
    ['development', 'Разработка и работа программиста'],
    ['legal', 'Юрист и документы'],
    ['materials', 'Дизайн, проморолик или лендинг'],
    ['otherUpfront', 'Прочие разовые расходы'],
  ],
  monthly: [
    ['tools', 'Подписки на инструменты, например Codex или ChatGPT'],
    ['hosting', 'Хостинг или VPS'],
    ['backups', 'Бэкапы'],
    ['otherMonthly', 'Прочие ежемесячные расходы'],
  ],
};

export function estimateExpenses(expenses, mode, upfront, monthly) {
  if (mode !== 'detailed') return { upfront: optionalMoney(upfront), monthly: optionalMoney(monthly) };

  const total = (fields) => fields.reduce((sum, [name]) => sum + optionalMoney(expenses[name]), 0);
  const upfrontTotal = total(expenseFields.upfront);
  const monthlyTotal = total(expenseFields.monthly) + optionalMoney(expenses.domain) / 12;
  return {
    upfront: upfrontTotal <= moneyLimit ? upfrontTotal : NaN,
    monthly: monthlyTotal <= moneyLimit ? monthlyTotal : NaN,
  };
}

export function forecast(values, model, acquisition, customBasis, target = 'budget') {
  const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, number(value)]));
  const { conversion, margin, price, periods, rate, freeCost, launchCost, impressions, cpm,
    guestViews } = fields;
  const traffic = estimateAcquisition(values, acquisition, target);
  if (!traffic || !valid(launchCost) || launchCost > moneyLimit) return null;
  const { budget, users, costPerRegistration } = traffic;
  const registeredBasis = model === 'ads' || (model === 'custom' && customBasis === 'users');

  const payerShare = registeredBasis ? null : conversion / 100;
  if (!registeredBasis && (!valid(payerShare, freeCost) || payerShare > 1 || freeCost > moneyLimit)) return null;
  if (!valid(margin) || margin > 100) return null;
  if (model !== 'ads' && (!valid(price) || price > moneyLimit)) return null;
  if (['subscription', 'commission', 'ads'].includes(model) && !valid(periods)) return null;
  if (model === 'commission' && (!valid(rate) || rate > 100)) return null;
  const guestCount = model === 'ads' ? number(String(values.guestUsers ?? '').trim() || 0) : 0;
  if (model === 'ads' && (!valid(impressions, cpm) || cpm > moneyLimit || !Number.isSafeInteger(guestCount)
    || guestCount < 0 || (guestCount > 0 && !valid(guestViews)))) return null;

  let revenueMultiplier = 1;
  if (model === 'subscription') revenueMultiplier = periods;
  if (model === 'commission') revenueMultiplier = periods * rate / 100;
  if (model === 'ads') revenueMultiplier = impressions / 1000 * periods;
  const lifetimeRevenue = (model === 'ads' ? cpm : price) * revenueMultiplier;
  const ltv = lifetimeRevenue * margin / 100;
  const registrationContribution = registeredBasis ? ltv : payerShare * ltv - (1 - payerShare) * freeCost;
  const customers = registeredBasis ? null : users * payerShare;
  const cac = payerShare > 0 ? costPerRegistration / payerShare : null;
  const guestImpressions = guestCount > 0 ? guestCount * guestViews : 0;
  const guestRevenue = guestCount > 0 ? guestImpressions / 1000 * cpm : 0;
  const guestContribution = guestCount > 0 ? guestRevenue * margin / 100 : 0;
  const revenue = (registeredBasis ? users : customers) * lifetimeRevenue + guestRevenue;
  const afterAds = users * registrationContribution + guestContribution - budget;
  const scalable = users > 0 || guestCount === 0;
  const contributionPerRegistration = registrationContribution + (users > 0 ? guestContribution / users : 0);
  const incrementalContribution = contributionPerRegistration - costPerRegistration;
  const breakEvenUsers = scalable && incrementalContribution > 0 ? launchCost / incrementalContribution : null;
  const breakEvenBudget = breakEvenUsers === null ? null : breakEvenUsers * costPerRegistration;
  const maxCpa = scalable ? Math.max(0, contributionPerRegistration) : null;
  const monetizedShare = registeredBasis ? 1 : payerShare;
  const costOfNonPayers = registeredBasis ? 0 : (1 - payerShare) * freeCost;
  const guestMultiplier = users > 0 ? guestImpressions / users / 1000 : 0;
  const priceContribution = monetizedShare * margin / 100 * (revenueMultiplier + guestMultiplier);
  const minPrice = scalable && priceContribution > 0
    ? (costPerRegistration + costOfNonPayers) / priceContribution : null;
  const ltvToCac = cac > 0 ? ltv / cac : null;
  const monthlyContribution = model === 'subscription' ? price * margin / 100
    : model === 'ads' ? impressions * cpm / 1000 * margin / 100 : 0;
  const payback = target !== 'organic' && periods > 0 && monthlyContribution > 0 && (model === 'ads' || cac !== null)
    ? (model === 'ads' ? costPerRegistration : cac) / monthlyContribution : null;
  const results = {
    ...traffic, customers, ltv, registeredBasis, cac, revenue, maxCpa, minPrice, ltvToCac, afterAds,
    profit: afterAds - launchCost, breakEvenBudget, breakEvenUsers, payback,
    guestCount, guestRevenue, scalable,
    adImpressions: model === 'ads' ? users * impressions * periods + guestImpressions : null,
    adRevenuePerUserMonth: model === 'ads' ? impressions / 1000 * cpm : null,
    paybackWithinLifetime: payback !== null && payback <= periods,
  };
  if (Object.values(results).some((value) => typeof value === 'number' && !Number.isFinite(value))) return null;
  return results;
}

export const monthlyVolumeLabels = {
  sale: 'Продаж за месяц',
  subscription: 'Оплат подписки за месяц',
  commission: 'Сделок за месяц',
  ads: 'Показов рекламы за месяц',
};

export function estimateMonthlyRevenue(model, values, volume) {
  const count = number(volume);
  if (!Number.isSafeInteger(count) || !Number.isFinite(count)) return NaN;
  if (model === 'ads') return moneyInput(values.cpm) * count / 1000;
  const price = moneyInput(values.price);
  if (model !== 'commission') return price * count;
  const rate = number(values.rate);
  return rate <= 100 ? price * count * rate / 100 : NaN;
}

export function monthlyResult(values, costPlan, plannedAds, period, revenue = moneyInput(values.revenue)) {
  const has = (field) => String(values[field] ?? '').trim() !== '';
  const variable = optionalMoney(values.variable);
  const ads = has('ads') ? moneyInput(values.ads) : plannedAds;
  const fixed = has('fixed') ? moneyInput(values.fixed) : costPlan.monthly;
  const upfront = period === 'launch' ? costPlan.upfront : 0;
  const expenses = valid(variable, ads, fixed, upfront) ? variable + ads + fixed + upfront : null;
  const profit = valid(revenue) && expenses !== null ? Math.round((revenue - expenses) * 100) / 100 : null;
  return { revenue, variable, ads, fixed, upfront, expenses, profit };
}
