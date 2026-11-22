import React, { useRef, useState } from 'react';
import { payments } from './ideas.js';
import { money, monthOutcome, numeric } from './Format.js';
import { expenseFields, moneyLimit, monthlyVolumeLabels, number } from './economics.js';
import { AcquisitionBenchmarks, MonetizationBenchmarks } from './AdBenchmarks.jsx';

function Amount({ name, label, unit, hint, value, onChange, example }) {
  const overLimit = unit.startsWith('₽') && number(value) > moneyLimit;
  const description = [hint && name + '-hint', overLimit && name + '-error'].filter(Boolean).join(' ');
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-with-unit">
        <input name={name} inputMode="decimal" value={value} placeholder={example}
          maxLength={24} aria-invalid={overLimit || undefined} aria-describedby={description || undefined}
          onChange={(event) => onChange(name, event.target.value)} />
        <span aria-hidden="true">{unit}</span>
      </span>
      {hint && <small id={name + '-hint'}>{hint}</small>}
      {overLimit && <small id={name + '-error'} className="field-error">Максимум {money(moneyLimit)}.</small>}
    </label>
  );
}

function Result({ result, model, target }) {
  const organic = target === 'organic';
  if (!result) return (
    <div className="results lifetime-result">
      <h4>Прогноз за всё время использования</h4>
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
    <div className="results lifetime-result" aria-live="polite" aria-atomic="true">
      <h4>Прогноз за всё время использования</h4>
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

function MonthResult({ report, month }) {
  const label = (value) => Number.isFinite(value) ? money(value) : 'Нужно указать';
  const rows = [
    ['Выручка месяца', report.revenue],
    ['Переменные расходы месяца', report.variable],
    [month.ads.trim() ? 'Реклама · своя сумма' : 'Реклама · из раздела привлечения', report.ads],
    [month.fixed.trim() ? 'Регулярные расходы · своя сумма' : 'Регулярные расходы · из сметы', report.fixed],
    ...(month.period === 'launch' ? [['Разовые расходы · из сметы', report.upfront]] : []),
    ['Всего расходов', report.expenses ?? NaN],
  ];
  const status = report.profit === null ? null : monthOutcome(report.profit);

  return (
    <div className="month-result" data-tone={status?.tone} aria-live="polite" aria-atomic="true">
      <div className="month-outcome">
        <p>{status?.label ?? 'Итог появится после ввода выручки и расходов'}</p>
        {status && <strong>{money(Math.abs(report.profit))}</strong>}
      </div>
      <dl className="month-breakdown">
        {rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{label(value)}</dd></div>)}
      </dl>
    </div>
  );
}

function MonthForm({ month, model, modeledRevenue, updateMonth, report, costPlan, plannedAds }) {
  const field = (name, label, hint) => <Amount name={'month-' + name} label={label} unit="₽" example="0"
    value={month[name]} hint={hint} onChange={(_, value) => updateMonth(name, value)} />;
  return (
    <>
      <div className="segmented month-switch" role="group" aria-label="Какой месяц считаем?">
        <button type="button" aria-pressed={month.period === 'launch'} onClick={() => updateMonth('period', 'launch')}>Месяц запуска</button>
        <button type="button" aria-pressed={month.period === 'regular'} onClick={() => updateMonth('period', 'regular')}>Обычный месяц</button>
      </div>
      <p className="month-intro">{month.period === 'launch'
        ? 'В месяц запуска разовые расходы из сметы входят в итог.'
        : 'В обычный месяц учитываются текущие расходы. Расходы на запуск относятся к первому месяцу.'}</p>
      {model !== 'custom' && <label className="field month-revenue-mode">
        <span>Как указать выручку месяца?</span>
        <select value={month.revenueMode} onChange={(event) => updateMonth('revenueMode', event.target.value)}>
          <option value="manual">Ввести выручку за месяц</option>
          <option value="model">Посчитать по модели дохода</option>
        </select>
      </label>}
      <div className="columns amount-grid">
        {modeledRevenue ? <Amount name="month-volume" label={monthlyVolumeLabels[model]} unit="шт."
          value={month['volume-' + model] ?? ''} example="0"
          hint="Выручка считается по цене из раздела «Модель дохода»."
          onChange={(_, value) => updateMonth('volume-' + model, value)} />
          : field('revenue', 'Выручка этого месяца', 'Укажи ожидаемые или фактические поступления. Если выручки нет, введи 0.')}
        {field('variable', 'Переменные расходы этого месяца', 'Например, себестоимость заказов или комиссия за платежи.')}
      </div>
      <details className="month-overrides">
        <summary>Указать свои суммы рекламы и регулярных расходов</summary>
        <div className="columns amount-grid">
          {field('ads', 'Реклама за месяц', Number.isFinite(plannedAds)
            ? 'Пустое поле подставит ' + money(plannedAds) + ' из раздела привлечения.'
            : 'Укажи сумму здесь или задай бюджет в разделе привлечения.')}
          {field('fixed', 'Регулярные расходы за месяц', Number.isFinite(costPlan.monthly)
            ? 'Пустое поле подставит ' + money(costPlan.monthly) + ' из сметы.'
            : 'Проверь сумму регулярных расходов в смете.')}
        </div>
      </details>
      <MonthResult report={report} month={month} />
    </>
  );
}

function CostPlan({ mode, expenses, totals, update, updateExpense, amount }) {
  const item = ([name, label], unit = '₽') => (
    <Amount key={name} name={'expense-' + name} label={label} unit={unit} example="0"
      value={expenses[name] ?? ''} onChange={(_, value) => updateExpense(name, value)} />
  );
  const valid = Number.isFinite(totals.upfront) && Number.isFinite(totals.monthly);

  return (
    <div className="project-costs">
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
      <p className="cost-note">Пустые поля считаются нулём. Итог месяца автоматически берёт расходы из этой сметы.</p>
      {valid ? <dl className="cost-totals">
        <div><dt>Разово</dt><dd>{money(totals.upfront)}</dd></div>
        <div><dt>В месяц</dt><dd>{money(totals.monthly)}</dd></div>
      </dl> : <p className="error">Проверь суммы. Максимум {money(moneyLimit)} разово и столько же в месяц.</p>}
    </div>
  );
}

const sections = ['Смета проекта', 'Привлечение пользователей', 'Модель дохода', 'Результат бизнеса за месяц'];

function EconomySection({ index, active, onSelect, preview, children }) {
  const title = sections[index];
  const open = active === index;
  return (
    <section className="economy-section" data-open={open}>
      <h3>
        <button type="button" className="economy-section-toggle" aria-expanded={open}
          aria-controls={'economy-panel-' + index} id={'economy-step-' + index}
          onClick={() => onSelect(open ? -1 : index)}>
          <span className="economy-index">{index + 1}</span>
          <span className="economy-step-text"><strong>{title}</strong>{preview && <small>{preview}</small>}</span>
        </button>
      </h3>
      <div id={'economy-panel-' + index} className="economy-section-body" hidden={!open}>
        {children}
        {index < sections.length - 1 && (
          <button type="button" className="button secondary economy-next"
            onClick={() => onSelect(index + 1, true)}>Далее · {sections[index + 1].toLowerCase()}</button>
        )}
      </div>
    </section>
  );
}

export function Economy({ model, acquisition, target, customBasis, values, expenseMode, expenses,
  costPlan, updateExpense, update, updateAmount, result, month, updateMonth, monthReport, modeledRevenue, traffic, plannedAds }) {
  const [active, setActive] = useState(0);
  const flow = useRef(null);
  function selectSection(index, focus) {
    setActive(index);
    if (focus) flow.current.querySelector('#economy-step-' + index)?.focus();
  }
  const amount = (name, label, unit, example, hint) => (
    <Amount name={name} label={label} unit={unit} example={example} hint={hint}
      value={values[name]} onChange={updateAmount} />
  );
  const paid = model !== 'ads' && !(model === 'custom' && customBasis === 'users');
  const stage = (index, preview, children) => (
    <EconomySection index={index} preview={preview} active={active} onSelect={selectSection}>{children}</EconomySection>
  );
  const costSummary = Number.isFinite(costPlan.upfront) && Number.isFinite(costPlan.monthly)
    ? money(costPlan.upfront) + ' разово · ' + money(costPlan.monthly) + ' в месяц' : 'Проверь суммы';
  const trafficSummary = traffic ? numeric.format(traffic.users) + ' новых регистраций · ' + money(traffic.budget) + ' на рекламу' : '';
  const monthSummary = monthReport.profit === null ? '' : monthOutcome(monthReport.profit).label + ' ' + money(Math.abs(monthReport.profit));

  return (
    <div className="economy-flow" ref={flow}>
      {stage(0, costSummary, <CostPlan mode={expenseMode} expenses={expenses} totals={costPlan} update={update}
        updateExpense={updateExpense} amount={amount} />)}
      {stage(1, trafficSummary, <>
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
      </>)}
      {stage(2, payments[model].label, <>
        <label className="field">
          <span>Как проект зарабатывает?</span>
          <select className="economy-model-select" value={model} onChange={(event) => update('model', event.target.value)}>
            {Object.entries(payments).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
          </select>
        </label>
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
          {amount('rate', 'Доля проекта с каждой сделки', '%', '15')}
          {amount('periods', 'Сделок на покупателя за всё время', 'шт.', '2', 'Например, если человек в среднем бронирует дважды, введи 2.')}
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
      </>)}
      {stage(3, monthSummary, <MonthForm month={month} model={model} modeledRevenue={modeledRevenue} updateMonth={updateMonth}
        report={monthReport} costPlan={costPlan} plannedAds={plannedAds} />)}
      <details className="lifetime-details">
        <summary>Прогноз за весь срок использования · LTV и окупаемость</summary>
        <p>Здесь считаем вклад новых пользователей за всё время, которое они пользуются продуктом. Для итога одного месяца используй раздел выше.</p>
        <Result result={result} model={model} target={target} />
      </details>
    </div>
  );
}
