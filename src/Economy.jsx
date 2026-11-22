import React, { useRef, useState } from 'react';
import { payments } from './ideas.js';
import { groupMoneyInput, money, monthOutcome, numeric } from './Format.js';
import { expenseFields, lifetimeEconomics, moneyLimit, monthlyVolumeLabels, number } from './economics.js';
import { AcquisitionBenchmarks, MonetizationBenchmarks } from './AdBenchmarks.jsx';

function Amount({ name, label, unit, hint, value, onChange, example }) {
  const isMoney = unit.startsWith('₽');
  const overLimit = isMoney && number(value) > moneyLimit;
  const description = [hint && name + '-hint', overLimit && name + '-error'].filter(Boolean).join(' ');
  function change(event) {
    const input = event.currentTarget;
    if (!isMoney) {
      onChange(name, input.value);
      return;
    }

    const ungroup = (text) => text.replace(/\s+/g, '');
    let raw = ungroup(input.value);
    let cursor = ungroup(input.value.slice(0, input.selectionStart ?? input.value.length)).length;
    if (raw === ungroup(String(value ?? ''))) {
      const action = event.nativeEvent.inputType;
      if (action === 'deleteContentBackward' && cursor > 0) {
        raw = raw.slice(0, cursor - 1) + raw.slice(cursor);
        cursor -= 1;
      } else if (action === 'deleteContentForward' && cursor < raw.length) {
        raw = raw.slice(0, cursor) + raw.slice(cursor + 1);
      }
    }

    const display = groupMoneyInput(raw);
    if (input.value !== display) {
      input.value = display;
      let offset = 0;
      while (offset < display.length && cursor > 0) {
        if (!/\s/.test(display[offset])) cursor -= 1;
        offset += 1;
      }
      input.setSelectionRange(offset, offset);
    }
    onChange(name, raw);
  }

  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-with-unit">
        <input name={name} inputMode="decimal" value={isMoney ? groupMoneyInput(value) : value} placeholder={example}
          maxLength={24} aria-invalid={overLimit || undefined} aria-describedby={description || undefined}
          onChange={change} />
        <span aria-hidden="true">{unit}</span>
      </span>
      {hint && <small id={name + '-hint'}>{hint}</small>}
      {overLimit && <small id={name + '-error'} className="field-error">Максимум <span className="money-value">{money(moneyLimit)}</span>.</small>}
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
      ['Цена клика (CPC)', money(result.cpc)],
    ]),
    ['Новые зарегистрированные пользователи', numeric.format(result.users)],
    ...(model !== 'ads' ? [] : [
      ['Гости без регистрации, учтённые в прогнозе', numeric.format(result.guestCount)],
      ['Показы рекламы за весь срок', numeric.format(result.adImpressions)],
      ['Выручка на активного пользователя за месяц (ARPU)', money(result.adRevenuePerUserMonth)],
      ...(result.guestCount > 0 ? [['Выручка от показов гостям', money(result.guestRevenue)]] : []),
    ]),
    ...(result.customers === null ? [] : [['Платящие клиенты', numeric.format(result.customers)]]),
    ['Стоимость регистрации (CPA)', money(result.costPerRegistration)],
    ...(result.registeredBasis ? [] : [['Стоимость привлечения плательщика (CAC)', result.cac === null ? '—' : money(result.cac)]]),
    [result.registeredBasis ? 'Вклад пользователя за весь срок (LTV)' : 'Вклад плательщика за весь срок (LTV)', money(result.ltv)],
    ...(result.ltvToCac === null ? [] : [['LTV / CAC', numeric.format(result.ltvToCac) + '×']]),
    ['Выручка за всё время использования', money(result.revenue)],
    ['Вклад после рекламы, до расходов запуска', money(result.afterAds)],
    ...(result.maxCpa === null ? [] : [['Предельный CPA до расходов запуска', money(result.maxCpa)]]),
    ...(result.minPrice === null ? [] : [[costLabel + ' до расходов запуска', money(result.minPrice)]]),
    ...(result.payback === null ? [] : [[
      result.paybackWithinLifetime ? 'Окупаемость привлечения' : 'Окупаемость привлечения (дольше срока жизни)',
      numeric.format(result.payback) + ' мес.',
    ]]),
  ];
  return (
    <div className="results lifetime-result" aria-live="polite" aria-atomic="true">
      <h4>Прогноз за всё время использования</h4>
      <strong className="profit money-value">{money(result.profit)}</strong>
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
              : <>Бюджет для выхода в ноль — около <span className="money-value">{money(result.breakEvenBudget)}</span> при той же стоимости и структуре аудитории.</>}</p>
    </div>
  );
}

function MonthResult({ report, month }) {
  const label = (value) => Number.isFinite(value) ? money(value) : 'Нужно указать';
  const manual = report.source === 'manual';
  const rows = [
    ['Выручка', report.revenue, manual ? 'Введена вручную' : 'По модели дохода'],
    ['Себестоимость и комиссии', report.variable, manual ? '' : 'По маржинальности'],
    ['Реклама', report.ads, manual && month.ads.trim() ? 'Сохранённая сумма' : 'Из раздела привлечения'],
    ['Регулярные расходы', report.fixed, manual && month.fixed.trim() ? 'Сохранённая сумма' : 'Из сметы'],
    ...(month.period === 'launch' ? [['Разовые расходы', report.upfront, 'Из сметы']] : []),
    ['Всего расходов', report.expenses ?? NaN],
  ];
  const status = report.profit === null ? null : monthOutcome(report.profit);

  return (
    <div className="month-result" data-tone={status?.tone} aria-live="polite" aria-atomic="true">
      <div className="month-outcome">
        <p>{status?.label ?? 'Итог появится, когда будут заполнены вводные'}</p>
        {status && <strong className="money-value">{money(Math.abs(report.profit))}</strong>}
      </div>
      <dl className="month-breakdown">
        {rows.map(([name, value, source]) => (
          <div key={name}>
            <dt>{name}{source && <small>{source}</small>}</dt>
            <dd>{label(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const monthAssumptions = {
  sale: 'Новые регистрации × конверсия в оплату × средний чек. Считаем одну покупку на плательщика в этом месяце.',
  subscription: 'Новые регистрации × конверсия в оплату × выручка за первый месяц подписки.',
  commission: 'Новые регистрации × конверсия в оплату × комиссия с первой сделки в этом месяце.',
  ads: 'Новые регистрации × показы на пользователя за месяц × выручка за тысячу показов ÷ 1 000.',
  custom: 'Выручка за весь срок × доля выручки, ожидаемая в этом месяце, × число пользователей или плательщиков.',
};

function MonthForm({ month, model, updateMonth, report, traffic, values }) {
  const revenueSource = report.source;
  const savedVolume = month['volume-' + model] ?? '';
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
      <label className="field month-revenue-mode">
        <span>Откуда берётся выручка месяца?</span>
        <select value={revenueSource} onChange={(event) => updateMonth('revenueSource', event.target.value)}>
          <option value="forecast">Посчитать по модели дохода</option>
          <option value="manual">Ввести выручку за месяц вручную</option>
          {model !== 'custom' && (revenueSource === 'volume' || savedVolume.trim()) && <option value="volume">Использовать сохранённый объём</option>}
        </select>
      </label>
      {revenueSource === 'forecast' && <>
        <div className="month-formula">
          <p>{monthAssumptions[model]}</p>
          {traffic && <dl className="month-counts">
            <div><dt>Ожидаемые регистрации за месяц</dt><dd>{numeric.format(traffic.users)}</dd></div>
            {['sale', 'subscription', 'commission'].includes(model) && Number.isFinite(report.volume) && (
              <div>
                <dt>{model === 'sale' ? 'Ожидаемые продажи' : model === 'commission' ? 'Ожидаемые первые сделки' : 'Ожидаемые первые оплаты'}</dt>
                <dd>{numeric.format(report.volume)}</dd>
              </div>
            )}
          </dl>}
          <p>Прогноз учитывает новых пользователей этого месяца.</p>
        </div>
        {model === 'ads' && (number(values.guestUsers) > 0 || month.guestImpressions.trim()) && <details className="month-overrides">
          <summary>Добавить показы гостям в этом месяце</summary>
          <Amount name="month-guest-impressions" label="Показов гостям за месяц" unit="шт." example="0"
            value={month.guestImpressions} onChange={(_, value) => updateMonth('guestImpressions', value)} />
        </details>}
      </>}
      {revenueSource === 'volume' && <div className="columns amount-grid">
        <Amount name="month-volume" label={monthlyVolumeLabels[model]} unit="шт."
          value={savedVolume} example="0"
          hint="Подойдёт, если фактический объём отличается от прогноза. Цена берётся из модели дохода."
          onChange={(_, value) => updateMonth('volume-' + model, value)} />
      </div>}
      {revenueSource === 'manual' && <>
        <div className="columns amount-grid">
          {field('revenue', 'Выручка этого месяца', 'Укажи фактические поступления. Если выручки нет, введи 0.')}
        </div>
        <details className="month-overrides">
          <summary>Уточнить себестоимость и комиссии этого месяца</summary>
          <div className="columns amount-grid">
            {field('variable', 'Себестоимость и комиссии этого месяца', 'Например, расходы на изготовление заказов и приём платежей.')}
          </div>
        </details>
        {(month.ads.trim() || month.fixed.trim()) && <p className="month-intro">
          Для ручного режима используются суммы расходов, сохранённые в прежней версии.{' '}
          <button type="button" className="quiet" onClick={() => { updateMonth('ads', ''); updateMonth('fixed', ''); }}>
            Брать суммы из предыдущих шагов
          </button>
        </p>}
      </>}
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
        <div><dt>Разово</dt><dd className="money-value">{money(totals.upfront)}</dd></div>
        <div><dt>В месяц</dt><dd className="money-value">{money(totals.monthly)}</dd></div>
      </dl> : <p className="error">Проверь суммы. Максимум <span className="money-value">{money(moneyLimit)}</span> разово и столько же в месяц.</p>}
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
  costPlan, updateExpense, update, updateAmount, result, month, updateMonth, monthReport, traffic }) {
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
  const unit = lifetimeEconomics(values, model);
  const stage = (index, preview, children) => (
    <EconomySection index={index} preview={preview} active={active} onSelect={selectSection}>{children}</EconomySection>
  );
  const costSummary = Number.isFinite(costPlan.upfront) && Number.isFinite(costPlan.monthly)
    ? <><span className="money-value">{money(costPlan.upfront)}</span> разово · <span className="money-value">{money(costPlan.monthly)}</span> в месяц</>
    : 'Проверь суммы';
  const trafficSummary = traffic && <>
    {numeric.format(traffic.users)} новых регистраций · <span className="money-value">{money(traffic.budget)}</span> на рекламу
  </>;
  const monthSummary = monthReport.profit !== null && <>
    {monthOutcome(monthReport.profit).label}{' '}<span className="money-value">{money(Math.abs(monthReport.profit))}</span>
  </>;

  return (
    <div className="economy-flow" ref={flow}>
      {stage(0, costSummary, <CostPlan mode={expenseMode} expenses={expenses} totals={costPlan} update={update}
        updateExpense={updateExpense} amount={amount} />)}
      {stage(1, trafficSummary, <>
      <label className="field">
        <span>От чего считаем?</span>
        <select value={target} onChange={(event) => update('target', event.target.value)}>
          <option value="budget">От рекламного бюджета</option>
          <option value="users">От числа регистраций</option>
          <option value="organic">Без платной рекламы</option>
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
            {amount('registrationRate', 'Конверсия клика в регистрацию (CR)', '%', '20')}
          </>)}
      </div>
      {target === 'budget' && traffic && <p className="budget-estimate">
        При таком бюджете ожидается около <strong>{numeric.format(traffic.users)}</strong> новых регистраций
      </p>}
      {target === 'users' && traffic && <p className="budget-estimate">
        На рекламу понадобится примерно <strong className="money-value">{money(traffic.budget)}</strong>
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
          <option value="users">На одного пользователя</option>
          <option value="customers">На одного плательщика</option>
        </select>
      </label>}
      <div className="columns amount-grid">
        {paid && amount('conversion', 'Конверсия регистрации в первую оплату (CR)', '%', '5')}
        {model === 'sale' && amount('price', 'Средний чек (AOV)', '₽', '900')}
        {model === 'subscription' && <>
          {amount('price', 'Средняя выручка с плательщика за месяц (ARPPU)', '₽', '160', 'При одном тарифе укажи цену подписки за месяц.')}
          {amount('periods', 'Среднее число оплаченных месяцев', 'мес.', '3')}
        </>}
        {model === 'commission' && <>
          {amount('price', 'Средняя сумма сделки (AOV)', '₽', '1 500')}
          {amount('rate', 'Ставка комиссии (take rate)', '%', '15')}
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
        {model === 'custom' && <>
          {amount('price', 'Выручка за весь срок жизни', '₽', '700',
            'Средняя сумма по выбранной группе. Можно сложить все источники дохода.')}
          {amount('firstMonthShare', 'Доля выручки, которую ожидаешь в первый месяц', '%', '25',
            'Нужна для прогноза месяца. Например, введи 25, если ожидаешь получить четверть всей суммы сразу.')}
        </>}
        {amount('margin', 'Маржинальность по переменным расходам (Contribution Margin)', '%', '80',
          'Сколько остаётся после себестоимости и комиссий. Например, если из 100 ₽ остаётся 80 ₽, введи 80.')}
      </div>
      {paid && <details className="month-overrides">
        <summary>Учесть расходы на неплательщиков за весь срок</summary>
        <div className="columns amount-grid">
          {amount('freeCost', 'Расход на одного неплательщика', '₽', '0',
            'Входит в расчёт за всё время использования.')}
        </div>
      </details>}
      <aside className="ltv-preview" aria-live="polite">
        <div>
          <h4>Вклад {paid ? 'плательщика' : 'пользователя'} за весь срок (LTV)</h4>
          <p>Выручка с одного {paid ? 'плательщика' : 'пользователя'} за всё время × маржинальность.</p>
        </div>
        {unit && <strong className="money-value">{money(unit.ltv)}</strong>}
      </aside>
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
      {stage(3, monthSummary, <MonthForm month={month} model={model} updateMonth={updateMonth}
        report={monthReport} traffic={traffic} values={values} />)}
      <details className="lifetime-details">
        <summary>Прогноз за весь срок использования · LTV и окупаемость</summary>
        <p>Здесь считаем вклад новых пользователей за всё время, которое они пользуются продуктом. Для итога одного месяца используй раздел выше.</p>
        <Result result={result} model={model} target={target} />
      </details>
    </div>
  );
}
