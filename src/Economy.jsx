import React from 'react';
import { payments } from './ideas.js';
import { money, monthOutcome, numeric } from './Format.js';
import { estimateAcquisition, expenseFields, number } from './economics.js';
import { AcquisitionBenchmarks, MonetizationBenchmarks } from './AdBenchmarks.jsx';

function Amount({ name, label, unit, hint, value, onChange, example }) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-with-unit">
        <input name={name} inputMode="decimal" value={value} placeholder={example}
          aria-describedby={hint ? name + '-hint' : undefined}
          onChange={(event) => onChange(name, event.target.value)} />
        <span aria-hidden="true">{unit}</span>
      </span>
      {hint && <small id={name + '-hint'}>{hint}</small>}
    </label>
  );
}

function Result({ result, model, target }) {
  const organic = target === 'organic';
  if (!result) return (
    <div className="results">
      <h3>Прогноз по новым пользователям</h3>
      <p>Заполни поля, чтобы увидеть прогноз. Для платной рекламы цена и доля регистраций должны быть больше нуля.</p>
    </div>
  );
  const costLabel = {
    sale: 'Минимальная цена продажи',
    subscription: 'Минимальная цена подписки в месяц',
    commission: 'Минимальная сумма сделки',
    ads: 'Минимальная выручка за 1 000 показов',
    custom: 'Минимальная выручка за срок жизни',
  }[model];
  const metrics = [
    ...(result.clicks === null ? [] : [
      ['Клики', numeric.format(result.clicks)], ['Клики без регистрации', numeric.format(result.unregisteredClicks)],
      ['CPC · цена клика', money(result.cpc)],
    ]),
    ['Новые зарегистрированные пользователи', numeric.format(result.users)],
    ...(model !== 'ads' ? [] : [
      ['Гости без регистрации, учтённые в прогнозе', numeric.format(result.guestCount)],
      ['Показы рекламы за весь срок', numeric.format(result.adImpressions)],
      ['Выручка на зарегистрированного за месяц активности', money(result.adRevenuePerUserMonth)],
      ...(result.guestCount > 0 ? [['Выручка от показов гостям', money(result.guestRevenue)]] : []),
    ]),
    ...(result.customers === null ? [] : [['Платящие клиенты', numeric.format(result.customers)]]),
    ['CPA · регистрация', money(result.costPerRegistration)],
    ...(result.registeredBasis ? [] : [['CAC · платящий клиент', result.cac === null ? '—' : money(result.cac)]]),
    [result.registeredBasis ? 'LTV вклада пользователя' : 'LTV вклада плательщика', money(result.ltv)],
    ...(result.ltvToCac === null ? [] : [['LTV / CAC', numeric.format(result.ltvToCac) + '×']]),
    ['Выручка за всё время использования', money(result.revenue)],
    ['Вклад после рекламы, до расходов запуска', money(result.afterAds)],
    ...(result.maxCpa === null ? [] : [['Предельный CPA до расходов запуска', money(result.maxCpa)]]),
    ...(result.minPrice === null ? [] : [[costLabel + ' до расходов запуска', money(result.minPrice)]]),
    ...(result.payback === null ? [] : [['Окупаемость привлечения', numeric.format(result.payback) + ' мес.' +
      (result.paybackWithinLifetime ? '' : ' · дольше срока жизни')]]),
  ];
  return (
    <div className="results" aria-live="polite" aria-atomic="true">
      <h3>Прогноз по новым пользователям</h3>
      <strong className="profit">{money(result.profit)}</strong>
      <p className="profit-caption">Вклад за срок жизни после рекламы и расходов запуска</p>
      <dl>{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="breakeven">{!result.scalable
        ? 'Для оценки порога по регистрациям укажи хотя бы одного зарегистрированного пользователя.'
        : result.breakEvenUsers === null
          ? 'При этих вводных рост числа пользователей не принесёт прибыль.'
          : result.breakEvenUsers === 0
            ? 'Вклад с пользователя покрывает его привлечение. Разовые расходы равны нулю.'
            : organic
              ? 'Для выхода в ноль нужно привлечь ' + numeric.format(Math.ceil(result.breakEvenUsers)) + ' новых пользователей при тех же вводных.'
              : 'Бюджет для выхода в ноль — около ' + money(result.breakEvenBudget) + ' при той же стоимости и структуре аудитории.'}</p>
    </div>
  );
}

const monthFields = [
  ['revenue', 'Выручка за месяц'],
  ['variable', 'Переменные расходы'],
  ['ads', 'Расходы на рекламу'],
  ['fixed', 'Постоянные расходы'],
];

function MonthResult({ month, monthly }) {
  if (monthly === null) return null;

  const { label, tone } = monthOutcome(monthly);
  const revenue = number(month.revenue);
  const totalCosts = monthFields.slice(1).reduce((sum, [key]) => sum + number(month[key]), 0);

  return (
    <div className="month-result" data-tone={tone}>
      <div className="month-outcome">
        <p>{label}</p>
        <strong>{money(Math.abs(monthly))}</strong>
      </div>
      <dl className="month-breakdown">
        <div><dt>Выручка</dt><dd>{money(revenue)}</dd></div>
        <div><dt>Расходы</dt><dd>{money(totalCosts)}</dd></div>
      </dl>
    </div>
  );
}

function CostPlan({ mode, expenses, totals, update, updateExpense, amount }) {
  const item = ([name, label], unit = '₽') => (
    <Amount key={name} name={'expense-' + name} label={label} unit={unit} example="0"
      value={expenses[name] ?? ''} onChange={(_, value) => updateExpense(name, value)} />
  );
  const valid = Number.isFinite(totals.upfront) && Number.isFinite(totals.monthly);

  return (
    <details className="project-costs">
      <summary>Смета проекта</summary>
      <label className="field">
        <span>Как ввести расходы?</span>
        <select value={mode} onChange={(event) => update('expenseMode', event.target.value)}>
          <option value="total">Указать суммы сразу</option>
          <option value="detailed">Посчитать по статьям</option>
        </select>
      </label>
      {mode === 'detailed' ? (
        <div className="cost-groups">
          <fieldset>
            <legend>Разовые расходы</legend>
            <div className="columns amount-grid">{expenseFields.upfront.map((field) => item(field))}</div>
          </fieldset>
          <fieldset>
            <legend>Регулярные расходы</legend>
            <div className="columns amount-grid">
              {expenseFields.monthly.map((field) => item(field))}
              {item(['domain', 'Домен за год'], '₽/год')}
            </div>
          </fieldset>
        </div>
      ) : (
        <div className="columns amount-grid">
          {amount('launchCost', 'Разовые расходы (например, разработка, проморолик)', '₽', '0')}
          {amount('monthlyPlan', 'Расходы в месяц (например, подписки, хостинг)', '₽', '0')}
        </div>
      )}
      <p className="cost-note">Пустые поля считаются нулём. Разовые расходы вычитаются из прогноза. Ежемесячную сумму можно перенести в расчёт месяца.</p>
      {valid ? <dl className="cost-totals">
        <div><dt>Разово</dt><dd>{money(totals.upfront)}</dd></div>
        <div><dt>В месяц</dt><dd>{money(totals.monthly)}</dd></div>
      </dl> : <p className="error">Проверь суммы в смете.</p>}
    </details>
  );
}

export function Economy({ model, acquisition, target, customBasis, values, expenseMode, expenses,
  costPlan, updateExpense, update, updateAmount, result, month, updateMonth, monthly }) {
  const amount = (name, label, unit, example, hint) => (
    <Amount name={name} label={label} unit={unit} example={example} hint={hint}
      value={values[name]} onChange={updateAmount} />
  );
  const paid = model !== 'ads' && !(model === 'custom' && customBasis === 'users');
  const traffic = estimateAcquisition(values, acquisition, target);

  return (
    <>
      <div className="calc">
        <div>
          <h3>Привлечение пользователей</h3>
          <label className="field">
            <span>От чего считаем?</span>
            <select value={target} onChange={(event) => update('target', event.target.value)}>
              <option value="budget">Знаю рекламный бюджет</option>
              <option value="users">Знаю, сколько пользователей хочу привлечь</option>
              <option value="organic">Хочу привлечь пользователей без платной рекламы</option>
            </select>
          </label>
          {target !== 'organic' && <label className="field acquisition-method">
            <span>Что известно о цене привлечения?</span>
            <select value={acquisition} onChange={(event) => update('acquisition', event.target.value)}>
              <option value="cpa">Цена регистрации (CPA)</option>
              <option value="clicks">Цена клика и доля регистраций</option>
            </select>
          </label>}
          <div className="columns amount-grid">
            {target === 'budget' ? amount('budget', 'Рекламный бюджет', '₽', '10 000')
              : amount('targetUsers', 'Сколько новых регистраций нужно?', 'чел.', '1000',
                'Для бота это могут быть люди, которые впервые нажали «Старт».')}
            {target !== 'organic' && (acquisition === 'cpa'
              ? amount('cpa', 'Цена регистрации (CPA)', '₽', '103')
              : <>
                {amount('cpc', 'Цена клика (CPC)', '₽', '25')}
                {amount('registrationRate', 'Доля кликов, которые приводят к регистрации', '%', '20')}
              </>)}
          </div>
          {target === 'budget' && traffic && <p className="budget-estimate">
            При таком бюджете ожидается около <strong>{numeric.format(traffic.users)}</strong> новых регистраций
          </p>}
          {target === 'users' && traffic && <p className="budget-estimate">
            На рекламу понадобится примерно <strong>{money(traffic.budget)}</strong>
          </p>}
          <AcquisitionBenchmarks />
          <CostPlan mode={expenseMode} expenses={expenses} totals={costPlan} update={update}
            updateExpense={updateExpense} amount={amount} />

          <div className="section">
            <h3>{payments[model].label}</h3>
            {model === 'custom' && <label className="field">
              <span>По кому считаем доход?</span>
              <select value={customBasis} onChange={(event) => update('customBasis', event.target.value)}>
                <option value="users">В среднем на каждого привлечённого пользователя</option>
                <option value="customers">В среднем на платящего клиента</option>
              </select>
            </label>}
            <div className="columns amount-grid">
              {paid && amount('conversion', 'Конверсия регистрации в первую оплату', '%', '5')}
              {model === 'sale' && amount('price', 'Средняя цена продажи', '₽', '900')}
              {model === 'subscription' && <>
                {amount('price', 'Цена подписки в месяц', '₽', '160')}
                {amount('periods', 'Среднее число оплаченных месяцев', 'мес.', '3')}
              </>}
              {model === 'commission' && <>
                {amount('price', 'Средняя сумма сделки', '₽', '1 500')}
                {amount('rate', 'Комиссия со сделки', '%', '15')}
                {amount('periods', 'Сделок за срок жизни клиента', 'шт.', '2')}
              </>}
              {model === 'ads' && <>
                {amount('impressions', 'Показов рекламы на человека в месяц', 'шт.', '30',
                  'Сколько рекламных объявлений в среднем видит зарегистрированный пользователь за месяц.')}
                {amount('cpm', 'Выручка за 1 000 показов (eCPM)', '₽', '280',
                  'Сколько получает твой проект за тысячу показов рекламы.')}
                {amount('periods', 'Сколько месяцев человек пользуется продуктом', 'мес.', '3',
                  'Если люди в среднем перестают заходить через три месяца, введи 3.')}
              </>}
              {model === 'custom' && amount('price', 'Выручка за весь срок жизни', '₽', '700',
                'Средняя сумма по выбранной группе. Можно сложить все источники дохода.')}
              {amount('margin', 'Доля выручки после переменных расходов', '%', '80',
                'Например, если из 100 ₽ остаётся 80 ₽, введи 80.')}
              {paid && amount('freeCost', 'Расход на неплатящего пользователя', '₽', '0',
                'Сумма за весь срок использования.')}
            </div>
            {model === 'ads' && <>
              <details className="benchmark ad-guests">
                <summary>Учесть показы гостям без регистрации</summary>
                <div className="benchmark-body">
                  <p>Возьми число уникальных гостей из аналитики. Если оценки пока нет, оставь поля пустыми.</p>
                  <div className="columns amount-grid">
                    {amount('guestUsers', 'Уникальных гостей без регистрации', 'чел.', '0')}
                    {amount('guestViews', 'Сколько показов видит один гость за весь период', 'шт.', '2')}
                  </div>
                </div>
              </details>
              <MonetizationBenchmarks />
            </>}
          </div>
        </div>
        <Result result={result} model={model} target={target} />
      </div>

      <section className="month" aria-labelledby="month-title">
        <h3 id="month-title">Результат бизнеса за месяц</h3>
        <details>
          <summary>Выручка и расходы</summary>
          <p className="month-intro">Укажи четыре суммы за один и тот же месяц. Если статьи расходов не было, поставь 0.</p>
          <div className="columns amount-grid">
            {monthFields.map(([name, label]) => <Amount key={name} name={'month-' + name} label={label} unit="₽"
              example="0" value={month[name]} onChange={(_, value) => updateMonth(name, value)} />)}
          </div>
          {Number.isFinite(costPlan.monthly) && costPlan.monthly > 0 && (
            <button type="button" className="quiet apply-cost-plan"
              onClick={() => updateMonth('fixed', String(Math.round(costPlan.monthly * 100) / 100))}>
              Подставить ежемесячную смету ({money(costPlan.monthly)})
            </button>
          )}
        </details>
        <div aria-live="polite" aria-atomic="true">
          <MonthResult month={month} monthly={monthly} />
        </div>
      </section>
    </>
  );
}
