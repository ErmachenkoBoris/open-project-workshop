import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import { ideas, payments } from './ideas.js';
import { estimateAcquisition, estimateExpenses, forecast, monthForecast, number } from './economics.js';
import { Economy } from './Economy.jsx';
import { money, monthOutcome, numeric } from './Format.js';
import './style.css';

const storageKey = 'open-project-workshop:v1';
const previousStorageKey = 'yaroslavl-pet-project-workshop:v1';
const retiredIdeas = { borrow: 'Соседский прокат', team: 'Сыграем вечером' };
const featuredIdeas = ['open-slot', 'portfolio-review'];
const defaults = {
  name: '', source: 'bank', ideaId: '', customIdea: '', audience: '', channel: '',
  model: '', customModel: '', customBasis: 'users', acquisition: 'cpa', target: 'budget', expenseMode: 'total', expenses: {}, step: 1,
  numbers: { shared: { budget: '', targetUsers: '', monthlyPlan: '', cpa: '', cpc: '', registrationRate: '', launchCost: '0' } },
  month: { revenue: '', variable: '', ads: '', fixed: '', period: 'launch', revenueSource: 'forecast', guestImpressions: '' },
};
const modelDefaults = {
  price: '', rate: '', conversion: '', periods: '', forecastMonths: '', margin: '100', freeCost: '0',
  impressions: '', cpm: '', guestUsers: '', guestViews: '', firstMonthShare: '',
};

function migrateDraft(saved) {
  const { budget = '', cpc = '', fixed = '' } = saved.numbers?.shared ?? {};
  const numbers = { shared: { budget, cpc } };
  for (const model of ['sale', 'subscription', 'commission']) {
    const old = saved.numbers?.[model];
    if (!old) continue;
    const price = number(old.price);
    const unitCost = number(old.unitCost ?? 0);
    const proceeds = model === 'commission' ? price * number(old.rate) / 100 : price;
    const margin = proceeds > 0 && unitCost <= proceeds
      ? String(Math.round((1 - unitCost / proceeds) * 1000000) / 10000) : '';
    numbers[model] = { price: old.price ?? '', rate: old.rate ?? '', margin };
  }
  return {
    ...saved, numbers, acquisition: cpc ? 'clicks' : 'cpa', month: { fixed },
  };
}

function restoreMonth(saved, model) {
  const { revenueMode, ...month } = saved ?? {};
  let source = month.revenueSource ?? 'forecast';
  if (!month.revenueSource && revenueMode === 'model' && String(month['volume-' + model] ?? '').trim()) {
    source = 'volume';
  } else if (!month.revenueSource && revenueMode !== 'model' && String(month.revenue ?? '').trim()) {
    source = 'manual';
  }
  return { ...defaults.month, ...month, revenueSource: source };
}

function readDraft() {
  try {
    const current = JSON.parse(localStorage.getItem(storageKey));
    const previous = current ? null : JSON.parse(localStorage.getItem(previousStorageKey));
    const saved = current ?? (previous && migrateDraft(previous));
    if (!saved) return defaults;
    return {
      ...defaults, ...saved,
      model: Object.hasOwn(payments, saved.model) ? saved.model : (
        saved.model === 'free' && saved.source === 'bank'
          ? ideas.find(({ id }) => id === saved.ideaId)?.model ?? ''
          : ''
      ),
      numbers: { ...saved.numbers, shared: { ...defaults.numbers.shared, ...saved.numbers?.shared } },
      month: restoreMonth(saved.month, saved.model),
    };
  } catch {
    return defaults;
  }
}

function GrowingText({ value, onChange, rows = 1, singleLine = false, ...props }) {
  const field = useRef(null);

  useLayoutEffect(() => {
    const input = field.current;
    if (globalThis.CSS?.supports('field-sizing', 'content')) return;

    function resize() {
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + input.offsetHeight - input.clientHeight + 'px';
    }

    resize();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }

    let width = input.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === input.clientWidth) return;
      width = input.clientWidth;
      resize();
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [value]);

  function handleKeyDown(event) {
    if (singleLine && event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <textarea {...props} ref={field} rows={rows} className={rows === 1 ? 'growing-text' : 'growing-text two-rows'}
      value={value} onKeyDown={singleLine ? handleKeyDown : undefined}
      onChange={(event) => onChange(singleLine ? event.target.value.replace(/[\r\n]+/g, ' ') : event.target.value)} />
  );
}

function QRDialog({ dialog }) {
  const [image, setImage] = useState('');
  const [failed, setFailed] = useState(false);
  const url = window.location.origin + window.location.pathname;
  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 4, errorCorrectionLevel: 'M' })
      .then(setImage)
      .catch(() => setFailed(true));
  }, [url]);

  return (
    <dialog ref={dialog} aria-labelledby="qr-heading">
      <div className="dialog-heading">
        <h2 id="qr-heading">QR для воркшопа</h2>
        <form method="dialog"><button className="quiet" aria-label="Закрыть">×</button></form>
      </div>
      {image && <img className="qr-image" src={image} alt="QR-код со ссылкой на практикум" />}
      {failed && <p>QR-код не сгенерировался. Можно открыть ссылку ниже.</p>}
      <a className="site-link" href={url}>{url}</a>
      {image && <a className="button secondary" href={image} download="workshop-qr.png">Скачать PNG</a>}
    </dialog>
  );
}

function App() {
  const [draft, setDraft] = useState(readDraft);
  const [error, setError] = useState('');
  const [storageFailed, setStorageFailed] = useState(false);
  const [filter, setFilter] = useState('Все');
  const [expanded, setExpanded] = useState(false);
  const stepHeading = useRef(null);
  const dialog = useRef(null);
  const idea = ideas.find(({ id }) => id === draft.ideaId);
  const title = draft.source === 'own' ? draft.customIdea : idea?.name ?? retiredIdeas[draft.ideaId];
  const complete = Boolean(draft.name.trim() && title?.trim() && draft.audience.trim() && draft.model);
  const step = complete && draft.step === 2 ? 2 : 1;
  const { model, acquisition, target, expenseMode, expenses, customBasis, month } = draft;
  const modelLabel = model === 'custom' ? draft.customModel.trim() || payments.custom.label : payments[model]?.label ?? '';
  const values = { ...modelDefaults, ...draft.numbers[model], ...draft.numbers.shared };
  const costPlan = estimateExpenses(expenses, expenseMode, values.launchCost, values.monthlyPlan);
  const result = model ? forecast({ ...values, launchCost: costPlan.upfront, monthlyPlan: costPlan.monthly }, model, acquisition, customBasis, target) : null;
  const traffic = estimateAcquisition(values, acquisition, target);
  const monthReport = monthForecast(values, model, customBasis, traffic, target, costPlan, month);
  const monthStatus = monthReport.profit === null ? null : monthOutcome(monthReport.profit);
  const possibleIdeas = filter === 'Все' ? ideas : ideas.filter(({ format }) => format === filter);
  const shownIdeas = expanded || filter !== 'Все' ? possibleIdeas : possibleIdeas.filter(({ id }) => featuredIdeas.includes(id));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      setStorageFailed(true);
    }
  }, [draft]);

  function update(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setError('');
  }

  function selectIdea(selected) {
    if (draft.ideaId === selected.id) return;
    setDraft((previous) => ({
      ...previous, ideaId: selected.id, audience: selected.audience,
      channel: selected.channel, model: selected.model,
    }));
    setError('');
  }

  function switchSource(source) {
    if (draft.source === source) return;
    setDraft((previous) => ({
      ...previous,
      source,
      audience: previous.profiles?.[source]?.audience ?? '',
      channel: previous.profiles?.[source]?.channel ?? '',
      model: Object.hasOwn(payments, previous.profiles?.[source]?.model)
        ? previous.profiles[source].model : source === 'bank' ? idea?.model ?? '' : '',
      profiles: { ...previous.profiles, [previous.source]: {
        audience: previous.audience, channel: previous.channel, model: previous.model,
      } },
    }));
    setError('');
  }

  function goTo(nextStep) {
    if (nextStep === 2 && !complete) {
      setError('Заполни имя, выбери идею, укажи аудиторию и модель дохода.');
      return;
    }
    update('step', nextStep);
    requestAnimationFrame(() => stepHeading.current?.focus());
  }

  function updateAmount(name, value) {
    const group = Object.hasOwn(defaults.numbers.shared, name) ? 'shared' : model;
    setDraft((previous) => ({
      ...previous,
      numbers: {
        ...previous.numbers,
        [group]: { ...previous.numbers[group], [name]: value },
      },
    }));
  }

  function updateExpense(name, value) {
    setDraft((previous) => ({ ...previous, expenses: { ...previous.expenses, [name]: value } }));
  }

  function updateMonth(name, value) {
    setDraft((previous) => ({ ...previous, month: { ...previous.month, [name]: value } }));
  }

  return (
    <>
      <header className="top">
        <div className="wrap top-inner">
          <span className="brand"><span className="brand-mark" aria-hidden="true">{'{ }'}</span> Open Project Workshop</span>
          <button type="button" className="quiet qr-toggle" onClick={() => dialog.current.showModal()}>QR для воркшопа</button>
        </div>
      </header>

      <main className="wrap">
        <div className="hero">
          <h1>Код есть.<br />А деньги?</h1>
          <p className="lede">Выбери пет-проект, обсуди его в паре и посчитай, может ли окупиться реклама.</p>
        </div>

        {draft.name.trim() && (
          <section className="participant" aria-label="Твой черновик">
            <div className="participant-heading">
              <h2>{draft.name.trim()}, это твоя страница</h2>
              <span>{storageFailed ? 'Сохранение недоступно' : 'Сохранено в этом браузере'}</span>
            </div>
            {title?.trim() && <p><strong>{title.trim()}</strong>{modelLabel && ' · ' + modelLabel}</p>}
            {draft.audience.trim() && <p>Аудитория — {draft.audience.trim()}</p>}
            {complete && result && !monthStatus && <p>Результат за {numeric.format(result.months)} мес. <strong className="money-value">{money(result.profit)}</strong></p>}
            {complete && monthStatus && (
              <p className="participant-month" data-tone={monthStatus.tone}>
                {month.period === 'launch' ? 'Месяц запуска' : 'Обычный месяц'} · {monthStatus.tone === 'even' ? 'в ноль' : monthStatus.label.split(' за месяц')[0].toLowerCase()}{' '}
                <strong className="money-value">{money(Math.abs(monthReport.profit))}</strong>
              </p>
            )}
          </section>
        )}

        <nav className="steps" aria-label="Блоки практики">
          <button type="button" aria-current={step === 1 ? 'step' : undefined} onClick={() => goTo(1)}><span>1</span> Знакомство и идея</button>
          <button type="button" aria-current={step === 2 ? 'step' : undefined} disabled={!complete} onClick={() => goTo(2)}><span>2</span> Экономика проекта</button>
        </nav>

        {step === 1 ? (
          <form className="panel" onSubmit={(event) => { event.preventDefault(); goTo(2); }}>
            <h2 tabIndex="-1" ref={stepHeading}>Знакомство и идея</h2>
            <label className="field compact">
              <span>Как тебя зовут?</span>
              <GrowingText value={draft.name} onChange={(value) => update('name', value)} singleLine autoComplete="given-name" placeholder="Например, Саша" maxLength={80} />
            </label>

            <div className="section">
              <h3>Что будем делать?</h3>
              <div className="segmented" role="group" aria-label="Источник идеи">
                <button type="button" aria-pressed={draft.source === 'bank'} onClick={() => switchSource('bank')}>Выбрать из банка</button>
                <button type="button" aria-pressed={draft.source === 'own'} onClick={() => switchSource('own')}>Своя идея</button>
              </div>
              {draft.source === 'own' ? (
                <label className="field">
                  <span>Опиши свою идею в одном предложении</span>
                  <GrowingText value={draft.customIdea} onChange={(value) => update('customIdea', value)} rows={2} maxLength={300} placeholder="Что сделает продукт и какую задачу решит?" />
                </label>
              ) : (
                <>
                  <div className="filters" role="group" aria-label="Формат идеи">
                    {['Все', 'Telegram-бот', 'Telegram-чат', 'Лендинг'].map((type) => (
                      <button type="button" key={type} aria-pressed={filter === type} onClick={() => setFilter(type)}>{type}</button>
                    ))}
                  </div>
                  <div className="idea-grid">
                    {shownIdeas.map((item) => (
                      <button type="button" className="idea" key={item.id} aria-pressed={idea?.id === item.id} onClick={() => selectIdea(item)}>
                        <span className="format">{item.format}</span><strong>{item.name}</strong><span>{item.description}</span><span className="monetization">{item.monetization}</span>
                      </button>
                    ))}
                  </div>
                  {filter === 'Все' && <button type="button" className="quiet more" onClick={() => setExpanded(!expanded)}>{expanded ? 'Свернуть список' : 'Показать все ' + ideas.length + ' идей'}</button>}
                  {title && <p className="selection">Выбрано: <strong>{title}</strong></p>}
                </>
              )}
            </div>

            <div className="section">
              <h3>Кому это нужно?</h3>
              <div className="columns">
                <label className="field">
                  <span>Целевая аудитория</span>
                  <GrowingText value={draft.audience} onChange={(value) => update('audience', value)} maxLength={200} placeholder="Кто столкнулся с этой задачей?" />
                </label>
                <label className="field">
                  <span>Где найти первых пользователей?</span>
                  <GrowingText value={draft.channel} onChange={(value) => update('channel', value)} maxLength={240} placeholder="Например, в локальном Telegram-чате" />
                </label>
              </div>
            </div>

            <fieldset className="section payment">
              <legend>Как проект будет зарабатывать?</legend>
              <div className="payment-grid">
                {Object.entries(payments).map(([key, option]) => (
                  <label className="payment-option" key={key}>
                    <input type="radio" name="payment" value={key} checked={model === key} onChange={() => update('model', key)} />
                    <span><strong>{option.label}</strong><small>{option.description}</small></span>
                  </label>
                ))}
              </div>
              {model === 'custom' && <label className="field custom-model">
                <span>Опиши свою модель дохода</span>
                <GrowingText value={draft.customModel} onChange={(value) => update('customModel', value)}
                  maxLength={160} placeholder="Например, донаты и спонсорские размещения" />
              </label>}
            </fieldset>

            <aside className="pair">
              <h3>Обсудите в паре</h3>
              <p>Покажите друг другу идеи. Кто столкнулся с этой задачей? Где найти таких людей? Кто заплатит и за что?</p>
            </aside>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="actions"><button className="button primary" type="submit">К расчёту экономики</button></div>
          </form>
        ) : (
          <section className="panel">
            <h2 tabIndex="-1" ref={stepHeading}>Экономика проекта</h2>
            <p className="context">{title} · {modelLabel}</p>
            <p className="intro">Начни со сметы, затем оцени привлечение и доход. Итог месяца соберёт расходы из предыдущих разделов.</p>
            <Economy model={model} acquisition={acquisition} target={target} customBasis={customBasis} values={values}
              expenseMode={expenseMode} expenses={expenses} costPlan={costPlan} updateExpense={updateExpense}
              update={update} updateAmount={updateAmount} result={result} month={month} updateMonth={updateMonth}
              monthReport={monthReport} traffic={traffic} />
            <aside className="pair">
              <h3>Сравните сценарии в паре</h3>
              <p>Поменяйте одно число. Сколько можно платить за нового пользователя? Какой бюджет готовы выделить на тест и что станет поводом его остановить?</p>
            </aside>
            <div className="actions"><button className="button secondary" onClick={() => goTo(1)}>Вернуться к идее</button></div>
          </section>
        )}

        <footer>{storageFailed ? 'Браузер не смог сохранить ответы.' : 'Ответы сохраняются в этом браузере.'}</footer>
      </main>
      <QRDialog dialog={dialog} />
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
