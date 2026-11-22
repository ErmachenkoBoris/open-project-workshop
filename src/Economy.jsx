import React from 'react';
import { payments } from './ideas.js';
import { money, numeric } from './Format.js';

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

function Result({ result, model }) {
  if (!result) return (
    <div className="results">
      <h3>Прогноз по когорте</h3>
      <p>Заполни поля, чтобы увидеть прогноз. Стоимость привлечения должна быть больше нуля, проценты — от 0 до 100.</p>
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
    ...(result.clicks === null ? [] : [['Клики', numeric.format(result.clicks)], ['CPC · клик', money(result.cpc)]]),
    ['Привлечённые пользователи', numeric.format(result.users)],
    ...(result.customers === null ? [] : [['Платящие клиенты', numeric.format(result.customers)]]),
    ['CPA · регистрация', money(result.costPerRegistration)],
    ...(result.registeredBasis ? [] : [['CAC · платящий клиент', result.cac === null ? '—' : money(result.cac)]]),
    ...(model === 'free' ? [] : [[result.registeredBasis ? 'LTV вклада пользователя' : 'LTV вклада плательщика', money(result.ltv)]]),
    ...(result.ltvToCac === null ? [] : [['LTV / CAC', numeric.format(result.ltvToCac) + '×']]),
    ['Выручка за срок жизни когорты', money(result.revenue)],
    ['Вклад после рекламы, до расходов запуска', money(result.afterAds)],
    ...(model === 'free' ? [] : [['Предельный CPA до расходов запуска', money(result.maxCpa)]]),
    ...(result.minPrice === null ? [] : [[costLabel + ' до расходов запуска', money(result.minPrice)]]),
    ...(result.payback === null ? [] : [['Окупаемость привлечения', numeric.format(result.payback) + ' мес.' +
      (result.paybackWithinLifetime ? '' : ' · дольше срока жизни')]]),
  ];
  return (
    <div className="results" aria-live="polite" aria-atomic="true">
      <h3>Прогноз по когорте</h3>
      <strong className="profit">{money(result.profit)}</strong>
      <p className="profit-caption">Вклад за срок жизни после рекламы и расходов запуска</p>
      <dl>{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="breakeven">{model === 'free'
        ? 'В этой модели есть расходы на привлечение и обслуживание. Сравнивай сценарии по CPA.'
        : result.breakEvenBudget === null
          ? 'При этих вводных увеличение рекламного бюджета не принесёт прибыль.'
          : result.breakEvenBudget === 0
            ? 'Вклад с пользователя покрывает его привлечение. Расходы запуска равны нулю.'
            : 'Бюджет для выхода в ноль — около ' + money(result.breakEvenBudget) + ' при том же CPA и той же конверсии.'}</p>
    </div>
  );
}

export function Economy({ model, acquisition, customBasis, values, update, updateAmount, result, month, updateMonth, monthly }) {
  const amount = (name, label, unit, example, hint) => (
    <Amount name={name} label={label} unit={unit} example={example} hint={hint}
      value={values[name]} onChange={updateAmount} />
  );
  const paid = model !== 'ads' && model !== 'free' && !(model === 'custom' && customBasis === 'users');

  return (
    <>
      <div className="calc">
        <div>
          <h3>Привлечение пользователей</h3>
          <label className="field">
            <span>Что известно о цене привлечения?</span>
            <select value={acquisition} onChange={(event) => update('acquisition', event.target.value)}>
              <option value="cpa">Цена регистрации (CPA)</option>
              <option value="clicks">Цена клика (CPC) и конверсия в регистрацию</option>
            </select>
          </label>
          <div className="columns amount-grid">
            {amount('budget', 'Рекламный бюджет', '₽', '10 000')}
            {acquisition === 'cpa'
              ? amount('cpa', 'Цена регистрации (CPA)', '₽', '103')
              : <>
                {amount('cpc', 'Цена клика (CPC)', '₽', '25')}
                {amount('registrationRate', 'Конверсия клика в регистрацию', '%', '20')}
              </>}
            {amount('launchCost', 'Разовые расходы на запуск', '₽', '0')}
          </div>

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
                {amount('impressions', 'Показов рекламы на пользователя в месяц', 'шт.', '30')}
                {amount('cpm', 'Выручка за 1 000 показов', '₽', '280')}
                {amount('periods', 'Средний срок активности', 'мес.', '3')}
              </>}
              {model === 'custom' && amount('price', 'Выручка за весь срок жизни', '₽', '700',
                'Средняя сумма по выбранной группе. Можно сложить все источники дохода.')}
              {model !== 'free' && amount('margin', 'Доля выручки после переменных расходов', '%', '80',
                'Например, если из 100 ₽ остаётся 80 ₽, введи 80.')}
              {(paid || model === 'free') && amount('freeCost', paid ? 'Расход на неплатящего пользователя' : 'Расход на пользователя', '₽', '0',
                'Сумма за весь срок использования.')}
            </div>
          </div>
        </div>
        <Result result={result} model={model} />
      </div>

      <details className="month">
        <summary>Результат бизнеса за месяц</summary>
        <p>Введи поступления и расходы этого месяца по всем клиентам. Прогноз LTV когорты сюда не входит.</p>
        <div className="columns amount-grid">
          {[
            ['revenue', 'Выручка за месяц'],
            ['variable', 'Переменные расходы'],
            ['ads', 'Расходы на рекламу'],
            ['fixed', 'Постоянные расходы'],
          ].map(([name, label]) => <Amount key={name} name={'month-' + name} label={label} unit="₽" example="0"
            value={month[name]} onChange={(_, value) => updateMonth(name, value)} />)}
        </div>
        <p className="monthly-result">{monthly === null ? 'Заполни все четыре суммы. Если расходов не было, поставь 0.' : 'Результат месяца — ' + money(monthly)}</p>
      </details>
    </>
  );
}
