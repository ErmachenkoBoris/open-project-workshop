import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import { ideas, payments } from './ideas.js';
import { forecast } from './economics.js';
import './style.css';

const storageKey = 'yaroslavl-pet-project-workshop:v1';
const defaults = {
  name: '', source: 'bank', ideaId: '', customIdea: '', audience: '', channel: '',
  model: 'sale', numbers: { shared: { budget: '', cpc: '', conversion: '', fixed: '0' } },
};

function readDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return defaults;
    return { ...defaults, ...saved, numbers: {
      ...saved.numbers, shared: { ...defaults.numbers.shared, ...saved.numbers?.shared },
    } };
  } catch {
    return defaults;
  }
}

const numeric = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = (value) => currency.format(value);

function Amount({ name, label, unit, hint, value, onChange, example }) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-with-unit">
        <input
          name={name}
          inputMode="decimal"
          value={value}
          placeholder={example}
          aria-describedby={hint ? name + '-hint' : undefined}
          onChange={(event) => onChange(name, event.target.value)}
        />
        <span aria-hidden="true">{unit}</span>
      </span>
      {hint && <small id={name + '-hint'}>{hint}</small>}
    </label>
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
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [storageFailed, setStorageFailed] = useState(false);
  const [filter, setFilter] = useState('Все');
  const [expanded, setExpanded] = useState(false);
  const stepHeading = useRef(null);
  const dialog = useRef(null);
  const idea = ideas.find(({ id }) => id === draft.ideaId);
  const title = draft.source === 'own' ? draft.customIdea : idea?.name;
  const complete = Boolean(draft.name.trim() && title?.trim() && draft.audience.trim());
  const model = draft.model;
  const values = {
    price: '', rate: '', unitCost: '0', ...draft.numbers[model], ...draft.numbers.shared,
  };
  const result = forecast(values, model);
  const possibleIdeas = filter === 'Все' ? ideas : ideas.filter(({ format }) => format === filter);
  const shownIdeas = expanded || filter !== 'Все' ? possibleIdeas : possibleIdeas.slice(0, 4);

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
      model: previous.profiles?.[source]?.model ?? 'sale',
      profiles: { ...previous.profiles, [previous.source]: {
        audience: previous.audience, channel: previous.channel, model: previous.model,
      } },
    }));
    setError('');
  }

  function goTo(nextStep) {
    if (nextStep === 2 && !complete) {
      setError('Заполни имя, выбери идею и укажи аудиторию.');
      return;
    }
    setStep(nextStep);
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

  const amount = (name, label, unit, example, hint) => (
    <Amount name={name} label={label} unit={unit} example={example} hint={hint} value={values[name]} onChange={updateAmount} />
  );

  return (
    <>
      <header className="top">
        <div className="wrap top-inner">
          <span className="brand"><span className="brand-mark" aria-hidden="true">{'{ }'}</span> Практикум</span>
          <button type="button" className="quiet qr-toggle" onClick={() => dialog.current.showModal()}>QR для воркшопа</button>
        </div>
      </header>

      <main className="wrap">
        <div className="hero">
          <p className="place">Воркшоп · Ярославль</p>
          <h1>Код есть.<br />А деньги?</h1>
          <p className="lede">Выбери пет-проект, обсуди его в паре и посчитай, может ли окупиться реклама.</p>
        </div>

        <nav className="steps" aria-label="Блоки практики">
          <button type="button" aria-current={step === 1 ? 'step' : undefined} onClick={() => goTo(1)}><span>1</span> Знакомство и идея</button>
          <button type="button" aria-current={step === 2 ? 'step' : undefined} disabled={!complete} onClick={() => goTo(2)}><span>2</span> Экономика проекта</button>
        </nav>

        {step === 1 ? (
          <form className="panel" onSubmit={(event) => { event.preventDefault(); goTo(2); }}>
            <h2 tabIndex="-1" ref={stepHeading}>Знакомство и идея</h2>
            <label className="field compact">
              <span>Как тебя зовут?</span>
              <input value={draft.name} onChange={(event) => update('name', event.target.value)} autoComplete="given-name" placeholder="Например, Саша" maxLength={80} />
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
                  <textarea value={draft.customIdea} onChange={(event) => update('customIdea', event.target.value)} rows={2} maxLength={300} placeholder="Что сделает продукт и какую задачу решит?" />
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
                        <span className="format">{item.format}</span><strong>{item.name}</strong><span>{item.description}</span>
                      </button>
                    ))}
                  </div>
                  {filter === 'Все' && <button type="button" className="quiet more" onClick={() => setExpanded(!expanded)}>{expanded ? 'Свернуть список' : 'Показать все 10 идей'}</button>}
                  {idea && <p className="selection">Выбрано: <strong>{idea.name}</strong></p>}
                </>
              )}
            </div>

            <div className="section">
              <h3>Кому это нужно?</h3>
              <div className="columns">
                <label className="field">
                  <span>Целевая аудитория</span>
                  <input value={draft.audience} onChange={(event) => update('audience', event.target.value)} maxLength={200} placeholder="Кто столкнулся с этой задачей?" />
                </label>
                <label className="field">
                  <span>Где найти первых пользователей?</span>
                  <input value={draft.channel} onChange={(event) => update('channel', event.target.value)} maxLength={240} placeholder="Например, в локальном Telegram-чате" />
                </label>
              </div>
            </div>

            <fieldset className="section payment">
              <legend>За что будут платить?</legend>
              <div className="payment-grid">
                {Object.entries(payments).map(([key, option]) => (
                  <label className="payment-option" key={key}>
                    <input type="radio" name="payment" value={key} checked={model === key} onChange={() => update('model', key)} />
                    <span><strong>{option.label}</strong><small>{option.description}</small></span>
                  </label>
                ))}
              </div>
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
            <p className="context">{title} · {payments[model].label}</p>
            <p className="intro">Возьмём один месяц и оценим результат при заданной цене клика и конверсии.</p>
            <div className="calc">
              <div>
                <h3>Реклама и расходы</h3>
                <div className="columns amount-grid">
                  {amount('budget', 'Рекламный бюджет', '₽', '10 000')}
                  {amount('cpc', 'Цена клика', '₽', '25')}
                  {amount('conversion', model === 'free' ? 'Конверсия в целевое действие' : 'Конверсия в первую оплату', '%', '5', 'Доля кликов, которые приводят к целевому действию.')}
                  {amount('fixed', 'Постоянные расходы за месяц', '₽', '2 000')}
                </div>
                {model !== 'free' && (
                  <div className="section">
                    <h3>Доход с клиента</h3>
                    <div className="columns amount-grid">
                      {amount('price', { sale: 'Цена продажи', subscription: 'Цена первого месяца', commission: 'Средняя сумма сделки' }[model], '₽', '900')}
                      {model === 'commission' && amount('rate', 'Комиссия со сделки', '%', '15')}
                      {amount('unitCost', 'Расход на клиента', '₽', '0', 'Например, себестоимость или комиссия платёжной системы.')}
                    </div>
                  </div>
                )}
              </div>
              <div className="results" aria-live="polite" aria-atomic="true">
                <h3>Прогноз на месяц</h3>
                {result ? (
                  <>
                    <strong className="profit">{money(result.profit)}</strong>
                    <p className="profit-caption">{result.profit > 0 ? 'Ожидаемая прибыль' : result.profit < 0 ? 'Ожидаемый убыток' : 'Доходы покрывают расходы'}</p>
                    <dl>
                      <div><dt>Клики</dt><dd>{numeric.format(result.clicks)}</dd></div>
                      <div><dt>{model === 'free' ? 'Целевые действия' : 'Платящие клиенты'}</dt><dd>{numeric.format(result.customers)}</dd></div>
                      <div><dt>Выручка</dt><dd>{money(result.revenue)}</dd></div>
                      <div><dt>Всего расходов</dt><dd>{money(result.costs)}</dd></div>
                      <div><dt>Стоимость привлечения</dt><dd>{result.costToAcquire === null ? '—' : money(result.costToAcquire)}</dd></div>
                      {model !== 'free' && <div><dt>Маржа с клиента до рекламы</dt><dd>{money(result.margin)}</dd></div>}
                    </dl>
                    <p className="breakeven">{model === 'free'
                      ? 'В бесплатной модели реклама увеличивает расходы. Сравнивай сценарии по стоимости целевого действия.'
                      : result.breakEven === null
                        ? 'Рост бюджета при этих параметрах не даст прибыли. Попробуй изменить цену, стоимость клика или конверсию.'
                        : result.breakEven === 0
                          ? 'При этих параметрах положительный бюджет уже даёт прибыль.'
                          : 'Бюджет для выхода в ноль — около ' + money(result.breakEven) + '. При большем бюджете ожидается прибыль.'}</p>
                  </>
                ) : <p className="result-empty">Введи числа, чтобы увидеть прибыль и окупаемость. Цена клика должна быть больше нуля, проценты — от 0 до 100.</p>}
              </div>
            </div>
            <aside className="pair">
              <h3>Сравните сценарии в паре</h3>
              <p>Поменяйте одно число. Что сильнее влияет на результат: цена, конверсия или стоимость клика? Какие данные нужны, чтобы проверить расчёт?</p>
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
