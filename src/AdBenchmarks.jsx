import React from 'react';

const sources = {
  seeding: 'https://elama.ru/blog/kak-podgotovitsya-k-prodvizheniyu-sezonnogo-biznesa-v-telegram-kanalah-sovety-elama/',
  it: 'https://itrend.ru/news/4m1om80zl1-itrend-stoimost-reklami-v-telegram-dlya',
  course: 'https://elama.ru/blog/534-registracii-po-420-rub-iz-telegram-ads-keys-kursov-programmirovaniya-dlya-detey/',
  cdek: 'https://b2b.yandex.ru/adv/solutions/cases/cdek-forward-uderzhal-auditoriyu-i-sokratil-cpa-v-13-ras-s-pomoshchyu-promostrani',
  explorer: 'https://elama.ru/analitika_rynka_telegram/',
  baby: 'https://b2b.yandex.ru/adv/solutions/cases/bebi-ru-eksperiment-na-baze-varioqub',
  report: 'https://www.yandex.ru/support/adfox/ru/statistics/reports/revenue-reports',
  games: 'https://mores.toponad.com/reports/TopOn%20Global%20Mobile%20Games%20Monetization%20Report%20_%202025%20H1.pdf#page=26',
};

function SourceLink({ source, children }) {
  return <a href={sources[source]} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export function AcquisitionBenchmarks() {
  return (
    <details className="benchmark">
      <summary>Сколько стоят показы, клики и регистрации?</summary>
      <div className="benchmark-body">
        <p><strong>CPM</strong> — цена 1 000 показов, <strong>CPC</strong> — цена клика, <strong>CPA</strong> — цена выбранного действия. В этом расчёте действие — регистрация, например первый запуск бота.</p>
        <ul className="benchmark-list">
          <li><strong>1 700 ₽ CPM · 52 ₽ CPC</strong> — посевы для детских товаров и услуг. Курсы и образование в той же подборке — 1 800 ₽ CPM и 50 ₽ CPC. <SourceLink source="seeding">eLama, 2024</SourceLink></li>
          <li><strong>16 187 ₽ CPM</strong> — прямые посевы у администраторов B2B IT-каналов. <SourceLink source="it">Исследование iTrend, данные за 2025</SourceLink></li>
          <li><strong>420 ₽ за регистрацию</strong> — запись на пробный урок в кампании курсов программирования для детей. В кейсе получено 534 регистрации через лендинг из Telegram Ads. <SourceLink source="course">BrainStat и eLama, кампания 2024</SourceLink></li>
          <li><strong>Около 300 ₽ за регистрацию</strong> — у CDEK Forward после перехода на статьи-инструкции в ПромоСтраницах. На старте той же кампании стоимость доходила до 3–4 тыс. ₽. <SourceLink source="cdek">Кейс Яндекса, старт в 2023</SourceLink></li>
        </ul>
        <p>Для первого расчёта возьми похожий канал, аудиторию и целевое действие. При клике за 52 ₽ и предполагаемой конверсии в регистрацию 20% получится <strong>260 ₽ за регистрацию</strong>. Сравни это число с предельным CPA в своём расчёте и уточни его по тесту.</p>
        <p><SourceLink source="explorer">Посмотреть данные Telegram Ads по своей тематике</SourceLink></p>
      </div>
    </details>
  );
}

export function MonetizationBenchmarks() {
  return (
    <details className="benchmark">
      <summary>Где взять выручку за 1 000 показов?</summary>
      <div className="benchmark-body">
        <p><strong>eCPM</strong> здесь — твой доход ÷ фактические показы рекламы у тебя в продукте × 1 000. Бери доход и показы из одного отчёта за один период. <SourceLink source="report">Отчёт Adfox о монетизации</SourceLink></p>
        <p>На сайте для родителей «Бэби.ру» в 2024 тестировали пороги <strong>50–200 ₽ за 1 000 показов</strong> полноэкранной рекламы. Это настройки эксперимента. Блок без порога принёс больше дохода, потому что показов стало больше. <SourceLink source="baby">Кейс Рекламной сети Яндекса</SourceLink></p>
        <p>В выборке российских iOS-игр eCPM баннеров был около <strong>0,15–0,20 $</strong>, а видео с наградой — около <strong>5–7 $</strong> в первом полугодии 2025. Это разные рекламные форматы в играх. <SourceLink source="games">Отчёт TopOn, с. 26</SourceLink></p>
        <p>Для прямых размещений оцени eCPM по цене конкретного размещения и его фактическим показам. Если только планируешь продажу, используй ожидаемые показы и проверяй расчёт на первом размещении.</p>
      </div>
    </details>
  );
}
