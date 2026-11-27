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

function optionalMoney(value, fallback = 0) {
  return String(value ?? '').trim() ? moneyInput(value) : fallback;
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

export function lifetimeEconomics(values, model) {
  const margin = number(values.margin);
  const periods = number(values.periods);
  const price = moneyInput(values.price);
  const rate = number(values.rate);
  const impressions = number(values.impressions);
  const cpm = moneyInput(values.cpm);
  if (!valid(margin) || margin > 100) return null;
  if (model !== 'ads' && !valid(price)) return null;
  if (['subscription', 'commission', 'ads'].includes(model) && !valid(periods)) return null;
  if (model === 'commission' && (!valid(rate) || rate > 100)) return null;
  if (model === 'ads' && !valid(impressions, cpm)) return null;

  let revenueMultiplier = 1;
  if (model === 'subscription') revenueMultiplier = periods;
  if (model === 'commission') revenueMultiplier = periods * rate / 100;
  if (model === 'ads') revenueMultiplier = impressions / 1000 * periods;
  const lifetimeRevenue = (model === 'ads' ? cpm : price) * revenueMultiplier;
  const ltv = lifetimeRevenue * margin / 100;
  return valid(lifetimeRevenue, ltv) ? { margin, periods, price, impressions, cpm, revenueMultiplier, lifetimeRevenue, ltv } : null;
}

export function forecast(values, model, acquisition, customBasis, target = 'budget') {
  const launchCost = moneyInput(values.launchCost);
  const traffic = estimateAcquisition(values, acquisition, target);
  const unit = lifetimeEconomics(values, model);
  if (!traffic || !unit || !valid(launchCost)) return null;
  const { budget, users, costPerRegistration } = traffic;
  const { margin, periods, price, impressions, cpm, revenueMultiplier, lifetimeRevenue, ltv } = unit;
  const registeredBasis = model === 'ads' || (model === 'custom' && customBasis === 'users');
  const payerShare = registeredBasis ? null : number(values.conversion) / 100;
  const freeCost = moneyInput(values.freeCost);
  if (!registeredBasis && (!valid(payerShare, freeCost) || payerShare > 1)) return null;
  const guestCount = model === 'ads' ? number(String(values.guestUsers ?? '').trim() || 0) : 0;
  const guestViews = number(values.guestViews);
  if (!Number.isSafeInteger(guestCount) || (guestCount > 0 && !valid(guestViews))) return null;

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
  const maxCpa = scalable && contributionPerRegistration >= 0 ? contributionPerRegistration : null;
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
    launchCost, incrementalContribution, contributionBeforeAds: users * registrationContribution + guestContribution,
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

function revenuePerEvent(values, model) {
  if (model === 'ads') return moneyInput(values.cpm) / 1000;

  const price = moneyInput(values.price);
  if (model !== 'commission') return price;
  const rate = number(values.rate);
  return rate <= 100 ? price * rate / 100 : NaN;
}

function campaignMonth(values, model, customBasis, traffic) {
  if (!traffic) return null;

  const { users } = traffic;
  const conversion = number(values.conversion);
  const payers = conversion <= 100 ? users * conversion / 100 : NaN;
  const firstPeriod = Math.min(1, number(values.periods));
  if (model === 'custom') {
    const share = number(values.firstMonthShare);
    const audience = customBasis === 'users' ? users : payers;
    const revenue = share <= 100 ? audience * moneyInput(values.price) * share / 100 : NaN;
    return { revenue, volume: null };
  }
  if (model === 'ads') {
    const volume = users * number(values.impressions) * firstPeriod;
    return { revenue: volume * revenuePerEvent(values, model), volume };
  }

  const volume = model === 'sale' ? payers : payers * firstPeriod;
  return { revenue: volume * revenuePerEvent(values, model), volume };
}

function cents(value) {
  const rounded = Math.round((value + Number.EPSILON) * 100);
  return Number.isSafeInteger(rounded) ? rounded : NaN;
}

export function monthForecast(values, model, customBasis, traffic, target, costPlan, month) {
  const source = model === 'custom' && month.revenueSource === 'volume' ? 'forecast' : month.revenueSource;
  const manual = source === 'manual';
  const campaign = source === 'forecast' ? campaignMonth(values, model, customBasis, traffic) : null;
  const savedVolume = number(month['volume-' + model]);
  const guests = model === 'ads' && source === 'forecast' ? number(month.guestImpressions || 0) : 0;
  const guestRevenue = guests === 0 ? 0
    : Number.isSafeInteger(guests) ? guests * revenuePerEvent(values, 'ads') : NaN;
  let revenue = moneyInput(month.revenue);
  if (source === 'forecast') revenue = (campaign?.revenue ?? NaN) + guestRevenue;
  if (source === 'volume') {
    revenue = Number.isSafeInteger(savedVolume) ? savedVolume * revenuePerEvent(values, model) : NaN;
  }

  const plannedAds = target === 'budget' ? moneyInput(values.budget)
    : target === 'organic' ? 0 : traffic?.budget ?? NaN;
  const margin = number(values.margin);
  const variable = manual ? optionalMoney(month.variable)
    : margin <= 100 ? revenue * (100 - margin) / 100 : NaN;
  const ads = manual ? optionalMoney(month.ads, plannedAds) : plannedAds;
  const fixed = manual ? optionalMoney(month.fixed, costPlan.monthly) : costPlan.monthly;
  const upfront = month.period === 'launch' ? costPlan.upfront : 0;

  const revenueCents = cents(revenue);
  const [variableCents, adsCents, fixedCents, upfrontCents] = [variable, ads, fixed, upfront].map(cents);
  const totalCents = variableCents + adsCents + fixedCents + upfrontCents;
  const expenses = Number.isSafeInteger(totalCents) ? totalCents / 100 : null;
  const profit = expenses !== null && Number.isSafeInteger(revenueCents) ? (revenueCents - totalCents) / 100 : null;
  return {
    source, volume: campaign?.volume ?? null, revenue: revenueCents / 100,
    variable: variableCents / 100, ads: adsCents / 100, fixed: fixedCents / 100, upfront: upfrontCents / 100,
    expenses, profit,
  };
}
