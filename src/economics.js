export function number(value) {
  const normalized = String(value ?? '').replace(/\s+/g, '').replace(',', '.');
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(normalized)) return NaN;
  return Number(normalized);
}

function valid(...values) {
  return values.every((value) => Number.isFinite(value) && value >= 0);
}

export function forecast(values, model, acquisition, customBasis) {
  const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, number(value)]));
  const { budget, cpc, registrationRate, cpa, conversion, margin, price, periods, rate,
    freeCost, launchCost, impressions, cpm } = fields;
  const fromClicks = acquisition === 'clicks';
  const registeredBasis = model === 'ads' || (model === 'custom' && customBasis === 'users') || model === 'free';
  const costPerRegistration = fromClicks ? cpc / (registrationRate / 100) : cpa;
  if (!valid(budget, launchCost, costPerRegistration) || costPerRegistration === 0 || (fromClicks && registrationRate > 100)) return null;

  const payerShare = registeredBasis ? null : conversion / 100;
  if (!registeredBasis && (!valid(payerShare, freeCost) || payerShare > 1)) return null;
  if (model !== 'free' && (!valid(margin) || margin > 100)) return null;
  if (model !== 'free' && model !== 'ads' && !valid(price)) return null;
  if (['subscription', 'commission', 'ads'].includes(model) && !valid(periods)) return null;
  if (model === 'commission' && (!valid(rate) || rate > 100)) return null;
  if (model === 'ads' && !valid(impressions, cpm)) return null;
  if (model === 'free' && !valid(freeCost)) return null;

  let revenueMultiplier = 1;
  if (model === 'subscription') revenueMultiplier = periods;
  if (model === 'commission') revenueMultiplier = periods * rate / 100;
  if (model === 'ads') revenueMultiplier = impressions / 1000 * periods;
  const lifetimeRevenue = model === 'free' ? 0 : (model === 'ads' ? cpm : price) * revenueMultiplier;
  const ltv = model === 'free' ? -freeCost : lifetimeRevenue * margin / 100;
  const registrationContribution = registeredBasis ? ltv : payerShare * ltv - (1 - payerShare) * freeCost;
  const users = budget / costPerRegistration;
  const customers = registeredBasis ? null : users * payerShare;
  const cac = payerShare > 0 ? costPerRegistration / payerShare : null;
  const revenue = (registeredBasis ? users : customers) * lifetimeRevenue;
  const afterAds = users * registrationContribution - budget;
  const incrementalContribution = registrationContribution - costPerRegistration;
  const breakEvenBudget = incrementalContribution > 0
    ? launchCost / incrementalContribution * costPerRegistration : null;
  const maxCpa = Math.max(0, registrationContribution);
  const monetizedShare = registeredBasis ? 1 : payerShare;
  const costOfNonPayers = registeredBasis ? 0 : (1 - payerShare) * freeCost;
  const priceContribution = monetizedShare * margin / 100 * revenueMultiplier;
  const minPrice = model !== 'free' && priceContribution > 0
    ? (costPerRegistration + costOfNonPayers) / priceContribution : null;
  const ltvToCac = cac === null ? null : ltv / cac;
  const monthlyContribution = model === 'subscription' ? price * margin / 100
    : model === 'ads' ? impressions * cpm / 1000 * margin / 100 : 0;
  const payback = periods > 0 && monthlyContribution > 0 && (model === 'ads' || cac !== null)
    ? (model === 'ads' ? costPerRegistration : cac) / monthlyContribution : null;
  const results = {
    clicks: fromClicks ? budget / cpc : null, cpc: fromClicks ? cpc : null, costPerRegistration, users, customers,
    ltv, registeredBasis, cac, revenue, maxCpa, minPrice, ltvToCac, afterAds,
    profit: afterAds - launchCost, breakEvenBudget, payback,
    paybackWithinLifetime: payback !== null && payback <= periods,
  };
  if (Object.values(results).some((value) => typeof value === 'number' && !Number.isFinite(value))) return null;
  return results;
}

export function monthlyResult(values) {
  const [revenue, variable, ads, fixed] = ['revenue', 'variable', 'ads', 'fixed']
    .map((field) => number(values[field]));
  return valid(revenue, variable, ads, fixed) ? revenue - variable - ads - fixed : null;
}
