export function forecast(values, model) {
  const { budget, cpc, conversion, fixed, unitCost, price, rate } = Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      String(value).trim() === '' ? NaN : Number(String(value).replace(/\s+/g, '').replace(',', '.')),
    ]),
  );
  const required = [budget, cpc, conversion, fixed];
  if (model !== 'free') required.push(unitCost, price);
  if (model === 'commission') required.push(rate);
  if (required.some((value) => !Number.isFinite(value) || value < 0)) return null;
  if (cpc <= 0 || conversion > 100 || (model === 'commission' && rate > 100)) return null;

  const clicks = budget / cpc;
  const customers = clicks * conversion / 100;
  const grossPerCustomer = model === 'free' ? 0 : model === 'commission' ? price * rate / 100 : price;
  const costPerCustomer = model === 'free' ? 0 : unitCost;
  const revenue = customers * grossPerCustomer;
  const costs = budget + fixed + customers * costPerCustomer;
  const margin = grossPerCustomer - costPerCustomer;
  const costToAcquire = conversion > 0 ? cpc / (conversion / 100) : null;
  const surplus = costToAcquire === null ? null : margin - costToAcquire;
  const breakEven = surplus > 0 ? fixed / surplus * costToAcquire : null;

  return { clicks, customers, revenue, costs, profit: revenue - costs, costToAcquire, margin, breakEven };
}
