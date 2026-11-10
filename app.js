/* Dobran työpöytä, demo v2 on the Company Brain shell.
   app.js owns the frame: router, page headers, state, intro, tour, the go-to bar and the screens
   Tänään, Kysy Dobralta, Arvoraportti, Liitännät and Tietoa demosta.
   flows.js and registers.js register the other screens through window.DOBRA.screens (see the contract below).

   Screen contract:
     DOBRA.screens[route] = {
       header(ctx) -> {eyebrow, title, subtitle, actions}   optional, HTML strings; default comes from DOBRA.routes
       render(body, ctx)                                      required, fills body (a div.wf-stack)
     }
     ctx = {route, sub, params, S, save, go, rerender, h, ui, icon, fd, fds, days}
       route: 'tekijat'; sub: 'piotr-k' for #tekijat/piotr-k; params: URLSearchParams for #tekijat?rooli=Hitsaaja
   Everything in data.js is global (WORKERS, CLIENTS, LEAD_EXTRA, ANSWERS, POOL_TOTAL, DEMO_TODAY).
   ui.* helpers return HTML strings. Pass trusted copy as HTML, escape anything a visitor typed with h(). */
(function(){
  'use strict';
  const SKEY = 'dobra-demo:v3';
  let S = {};
  try { S = JSON.parse(localStorage.getItem(SKEY)) || {}; } catch(e) { S = {}; }
  if(!S || typeof S !== 'object') S = {};
  if(!Array.isArray(S.hist)) S.hist = [];
  if(S.role !== 'a') S.role = 'j';
  function save(){ try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch(e) {} updateBadges(); }
  function updateBadges(){ for(const [route,count] of [['pikatilaukset',S.f1?.mailed ? 0 : 1],['hakemukset',Math.max(0,6-new Set(S.f2sent || []).size)],['tarjoukset',S.f4?.sent ? 0 : 1]]) { const badge=document.querySelector(`[data-nav="${route}"] .wf-nav__badge`); if(badge) badge.textContent=count; } }

  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const T0 = new Date((typeof DEMO_TODAY !== 'undefined' ? DEMO_TODAY : '2026-11-10') + 'T12:00:00');
  const days = iso => Math.round((new Date(iso + 'T12:00:00') - T0) / 864e5);
  const fd = iso => { const p = iso.split('-'); return `${+p[2]}.${+p[1]}.${p[0]}`; };
  const fds = iso => { const p = iso.split('-'); return `${+p[2]}.${+p[1]}.`; };
  const num = (n, d) => n.toLocaleString('fi-FI', {minimumFractionDigits: d || 0, maximumFractionDigits: d || 0});

  /* ICONS: 24px stroke icons. icon(name, cls) returns an svg string. */
  const P = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    euro: '<path d="M4 10h12M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    ask: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    plug: '<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><path d="M16 14h.01"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
  };
  const icon = (n, cls) => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[n] || P.info}</svg>`;
  function paintIcons(root){
    $$('[data-icon]', root).forEach(el => {
      const n = el.dataset.icon;
      if(el.classList.contains('wf-nav__icon')) { el.innerHTML = icon(n); el.removeAttribute('data-icon'); return; }
      const t = document.createElement('template'); t.innerHTML = icon(n, el.getAttribute('class'));
      el.replaceWith(t.content.firstChild);
    });
  }

  /* Team chip colours: the Brain's data-colour names. */
  const CHIP_COLOUR = {Vuorot:'blue', Pikatilaukset:'blue', Hakemukset:'purple', Liidit:'green', Tarjoukset:'orange', Asiakkaat:'teal', Tekijät:'pink'};
  /* UI helpers: Brain and shell markup, returned as strings. */
  const ui = {
    icon,
    button({label, href, variant, size, attrs, iconName}){
      const cls = `wf-button wf-button--${variant || 'secondary'} wf-button--${size || 'sm'}`;
      const ic = iconName ? `<span class="wf-button__icon">${icon(iconName)}</span>` : '';
      return href ? `<a class="${cls}" href="${href}" ${attrs || ''}>${ic}${label}</a>` : `<button class="${cls}" type="button" ${attrs || ''}>${ic}${label}</button>`;
    },
    pill: (text, tone) => `<span class="wf-pill wf-pill--${tone || 'neutral'}">${text}</span>`,
    avatar: initials => `<span class="brain-avatar" aria-hidden="true">${initials}</span>`,
    header({eyebrow, title, subtitle, actions}){
      return `<header class="wf-page-header"><div class="wf-page-header__text">${eyebrow ? `<p class="wf-page-header__eyebrow">${eyebrow}</p>` : ''}<h1 class="wf-page-header__title">${title}</h1>${subtitle ? `<p class="wf-page-header__subtitle">${subtitle}</p>` : ''}</div>${actions ? `<div class="wf-page-header__actions">${actions}</div>` : ''}</header>`;
    },
    card({title, meta, extra, body, cls, flush, tag}){
      const t = tag || 'section';
      const head = title ? `<header class="wf-card__header"><h2 class="wf-card__title">${title}</h2>${meta ? `<span class="wf-card__meta">${meta}</span>` : ''}${extra || ''}</header>` : '';
      return `<${t} class="wf-card${flush ? ' wf-card--flush' : ''}${cls ? ' ' + cls : ''}">${head}${body || ''}</${t}>`;
    },
    kpis: list => `<div class="growth-kpis">${list.map(k => `<div class="wf-kpi"><p class="wf-kpi__label">${k.label}</p><p class="wf-kpi__value">${k.value}</p>${k.foot ? `<p class="wf-kpi__footnote wf-kpi__footnote--${k.tone || 'neutral'}">${k.foot}</p>` : ''}</div>`).join('')}</div>`,
    notice({tone, title, text, actions, attrs}){
      return `<div class="wf-notice wf-notice--${tone || 'info'}" ${attrs || ''}><span class="wf-notice__icon">${icon('info')}</span><div class="wf-notice__body">${title ? `<p class="wf-notice__title">${title}</p>` : ''}<div class="wf-notice__text">${text || ''}</div>${actions ? `<div class="wf-notice__actions">${actions}</div>` : ''}</div></div>`;
    },
    /* rows: arrays of cells, or {cells, cls, attrs}; a cell is HTML or {html, cls, attrs}. id goes on the table. */
    table({cols, rows, foot, caption, id}){
      const th = cols.map(c => `<th scope="col"${c.num ? ' class="wf-table__num"' : ''}>${c.label}</th>`).join('');
      const td = (v, i) => {
        const o = v && typeof v === 'object' ? v : {html: v};
        const cls = [cols[i] && cols[i].num ? 'wf-table__num' : '', o.cls || ''].filter(Boolean).join(' ');
        return `<td data-label="${h(String(cols[i]?.label || '').replace(/<[^>]*>/g, ''))}"${cls ? ` class="${cls}"` : ''}${o.attrs ? ' ' + o.attrs : ''}>${o.html == null ? '' : o.html}</td>`;
      };
      const tr = r => { const o = Array.isArray(r) ? {cells: r} : r; return `<tr${o.cls ? ` class="${o.cls}"` : ''}${o.attrs ? ' ' + o.attrs : ''}>${o.cells.map(td).join('')}</tr>`; };
      return `<div class="wf-table-wrap"><table class="wf-table"${id ? ` id="${id}"` : ''}>${caption ? `<caption hidden>${caption}</caption>` : ''}<thead><tr>${th}</tr></thead><tbody>${rows.map(tr).join('')}</tbody>${foot ? `<tfoot>${foot.map(tr).join('')}</tfoot>` : ''}</table></div>`;
    },
    /* rows: {chip, num, title, href, when, owner:[initials, name], why, reason, actions:[html]} */
    items: rows => `<ol class="brain-items">${rows.map(r => `<li class="brain-item"><div class="brain-item__main"><div class="brain-item__head">${r.chip ? `<span class="brain-team-chip" data-colour="${CHIP_COLOUR[r.chip] || 'blue'}">${r.chip}</span>` : ''}${r.num ? `<span class="brain-work-row__number">#${r.num}</span>` : ''}<a class="brain-item__title" href="${r.href || '#'}" ${r.attrs || ''}>${r.title}</a>${r.when ? `<span class="growth-muted">${r.when}</span>` : ''}</div>${r.reason ? `<p class="brain-item__reason">${r.reason}</p>` : ''}${r.owner || r.why ? `<div class="brain-row-meta">${r.owner ? `<span class="brain-owner-tag">${ui.avatar(r.owner[0])}<span>${r.owner[1]}</span></span>` : ''}${r.why ? `<span class="growth-muted">${r.why}</span>` : ''}</div>` : ''}${r.actions && r.actions.length ? `<div class="brain-follow-up__actions">${r.actions.join('')}</div>` : ''}</div></li>`).join('')}</ol>`,
    /* entries: {title, meta, tone} */
    activity: list => `<ul class="wf-activity wf-activity--timeline">${list.map(e => `<li class="wf-activity__item"><span class="wf-activity__icon wf-activity__icon--${e.tone || 'neutral'}"><span class="wf-activity__dot"></span></span><div class="wf-activity__body"><p class="wf-activity__title">${e.title}</p>${e.meta ? `<p class="wf-activity__meta">${e.meta}</p>` : ''}</div></li>`).join('')}</ul>`,
    empty: ({title, text, actions}) => `<div class="wf-empty"><span class="wf-empty__icon">${icon('info')}</span><p class="wf-empty__title">${title}</p>${text ? `<p class="wf-empty__description">${text}</p>` : ''}${actions ? `<div class="wf-empty__actions">${actions}</div>` : ''}</div>`,
    kv: pairs => `<dl class="wf-kv">${pairs.map(([k, v]) => `<div class="wf-kv__row"><dt class="wf-kv__key">${k}</dt><dd class="wf-kv__value">${v}</dd></div>`).join('')}</dl>`,
  };

  /* ROUTES: title and go-to detail for every screen (part 2 screens included). */
  const routes = [
    {id:'tanaan', title:'Tänään', section:'Työt', icon:'sun', detail:'Aamun lista, yön loki ja tämän viikon luvut'},
    {id:'pikatilaukset', title:'Pikatilaukset', section:'Työt', icon:'zap', detail:'Asiakkaan tilauksesta vahvistettuihin vuoroihin', subtitle:'Tarkista tilaus, valitse sopivat tekijät ja valmistele vahvistus asiakkaalle.'},
    {id:'hakemukset', title:'Hakemukset', section:'Työt', icon:'file', detail:'Hakemukset luettuna suomeksi', subtitle:'Jokainen hakemus luetaan, käännetään ja verrataan avoimiin paikkoihin.'},
    {id:'myynti', title:'Myynnin näkymä', section:'Myynti', icon:'chart', detail:'Myyntiputki, kehitys ja seuraavat yhteydenotot'},
    {id:'liidit', title:'Uudet asiakkaat', section:'Työt', icon:'trend', detail:'Uudet asiakasyritykset ja signaalit', subtitle:'Löydä yritykset, joilla on rekrytointitarve, ja valmistele ensimmäinen yhteydenotto.'},
    {id:'tarjoukset', title:'Tarjoukset', section:'Työt', icon:'euro', detail:'Tarjouspyynnöstä tarjousluonnos', subtitle:'"Pyydä ilmainen tarjous" -lomakkeesta valmis luonnos minuuteissa.'},
    {id:'tekijat', title:'Tekijät', section:'Rekisterit', icon:'users', detail:'Tekijäpankki: kortit, keikat, kielet ja majoitus', subtitle:'Saatavuus, osaaminen ja pätevyydet samassa paikassa.'},
    {id:'asiakkaat', title:'Asiakkaat', section:'Rekisterit', icon:'building', detail:'Asiakasrekisteri ja keikalla olevat tekijät', subtitle:'Keikalla olevat tekijät, päättymispäivät, avoimet tilaukset ja viimeisin yhteydenotto.'},
    {id:'kysy', title:'Kysy Dobralta', section:'Tieto', icon:'ask', detail:'Saatavuus, pätevyydet ja asiakastiedot lähteineen'},
    {id:'arvoraportti', title:'Ajansäästö', section:'Tieto', icon:'chart', detail:'Säästetyt tunnit laskettuna auki'},
    {id:'liitannat', title:'Liitännät', section:'Tieto', icon:'plug', detail:'Mitä kytkettäisiin Dobran järjestelmiin'},
    {id:'keksittya', title:'Tietoa demosta', section:'Tieto', icon:'info', detail:'Mikä toimii, mikä on simuloitu'},
  ];
  const ALIAS = {'': 'tanaan', etusivu:'tanaan', vuorot:'pikatilaukset', aivot:'kysy', tila:'keksittya', integraatiot:'liitannat', asiakasrekisteri:'asiakkaat', asiakas:'asiakkaat', tekija:'tekijat'};
  const routeById = id => routes.find(r => r.id === id);

  const D = window.DOBRA = window.DOBRA || {};
  D.screens = D.screens || {};
  Object.assign(D, {routes, ui, icon, h, fd, fds, days, num, wait, save, get S(){ return S; }});

  function parseHash(){
    let raw = location.hash.replace(/^#/, '');
    let q = '';
    const qi = raw.indexOf('?'); if(qi >= 0){ q = raw.slice(qi + 1); raw = raw.slice(0, qi); }
    let [route, ...rest] = raw.split('/');
    route = ALIAS[route] !== undefined ? ALIAS[route] : route;
    if(!routeById(route)) route = 'tanaan';
    return {route, sub: rest.join('/'), params: new URLSearchParams(q)};
  }
  const go = hash => { hash = hash.replace(/^#?/, '#'); if(location.hash === hash) render(); else location.hash = hash; };
  D.go = go;

  function ctxFor(p){ return Object.assign({}, p, {S, save, go, rerender: render, h, ui, icon, fd, fds, days, num}); }

  function render(){
    const p = parseHash();
    const meta = routeById(p.route);
    const scr = D.screens[p.route];
    $$('main section[data-route]').forEach(s => { if(s.dataset.route !== p.route){ s.hidden = true; s.innerHTML = ''; } });
    const sec = $(`main section[data-route="${p.route}"]`);
    const ctx = ctxFor(p);
    const hd = Object.assign({eyebrow: meta.section, title: meta.title, subtitle: meta.subtitle || ''}, scr && scr.header ? scr.header(ctx) || {} : {});
    sec.innerHTML = `<div class="wf-stack">${scr && scr.hero ? scr.hero(ctx) : ui.header(hd)}<div class="wf-stack" data-body></div></div>`;
    const body = $('[data-body]', sec);
    try {
      if(scr && scr.render) scr.render(body, ctx);
      else body.innerHTML = ui.empty({title: 'Näkymää rakennetaan', text: 'Tämä näkymä lisätään demoon seuraavaksi.'});
    } catch(err) {
      console.error(err);
      body.innerHTML = ui.notice({tone: 'danger', title: 'Näkymää ei voitu näyttää', text: 'Palauta demo ja yritä uudelleen.'});
    }
    sec.hidden = false;
    paintIcons(sec);
    $$('.wf-nav__item').forEach(a => { if(a.dataset.nav === p.route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = `${meta.title} | Dobran työpöytä`;
    $('#active-person').value = S.role;
    const orderBadge = $('[data-nav="pikatilaukset"] .wf-nav__badge');
    orderBadge.textContent = S.f1?.mailed ? '0' : '1';
    const appBadge = $('[data-nav="hakemukset"] .wf-nav__badge');
    appBadge.textContent = Math.max(0, 6 - new Set(S.f2sent || []).size);
    $('[data-nav="tarjoukset"] .wf-nav__badge').textContent = S.f4?.sent ? '0' : '1';
    renderPath(p.route);
    renderTour();
  }
  D.rerender = render;

  function renderPath(){ $('#path-slot').innerHTML = ''; }

  /* TÄNÄÄN */
  const certSoon = () => WORKERS.reduce((list, w) => list.concat((w.certs || []).filter(c => c[1] && days(c[1]) >= 0 && days(c[1]) <= 30).map(c => [w, c])), []);
  function nightLog(){
    const soon = certSoon();
    const fire = soon.filter(([, c]) => /tulityö/i.test(c[0])).length;
    const endWeek = WORKERS.filter(w => w.a && days(w.a[2]) >= 0 && days(w.a[2]) <= 4).map(w => w.n);
    const rows = [
      ['5.30', 'Hakemukset', 'Luki <b>6 yön aikana tullutta hakemusta</b>, joista 4 muilla kielillä kuin suomeksi, ja kirjoitti yhteenvedot suomeksi.', '#hakemukset', 'Avaa hakemukset'],
      ['5.45', 'Tekijäpankki', `Tarkisti ${WORKERS.length} tekijän kortit. <b>${soon.length} korttia vanhenee 30 päivän sisällä</b>, niistä ${fire} tulityökorttia.`, '#tekijat?kortit=30', 'Näytä kortit'],
      ['5.55', 'Vuorolista', `Päivitti tämän viikon päättyvät keikat: <b>${endWeek.join(' ja ') || 'Piotr K. ja Erik S.'}</b> lopettavat Luodon Levytekniikalla pe 13.11.`, '#tekijat?rooli=Hitsaaja&tila=joulu', 'Vapautuvat hitsaajat'],
      ['6.05', 'Tekijäpankki', 'Merkitsi <b>Tomasz W.:n majoituksen</b> avoimeksi. Dobran asunto Kokkolassa vapautuu 16.11.', '#tekijat/tomasz-w', 'Avaa Tomasz W.'],
      ['6.15', 'Vuorolista', 'Poimi tilaukseen <b>6 ehdokasta</b>. Saatavuus, pätevyydet ja majoitus tarkistetaan ennen vahvistusta.', '#pikatilaukset', 'Avaa pikatilaus'],
      ['6.25', 'Työpaikkailmoitukset', 'Löysi kaksi signaalia: <b>Vaasan Akselitekniikan ilmoitus</b> on yhä auki 21 päivän jälkeen, ja Kokkolan Prosessihuolto suunnittelee kevään seisokkia.', '#liidit', 'Avaa liidit'],
      ['6.35', 'Asiakasrekisteri', 'Huomasi, että <b>Patrik Ö. ja Rodel M.</b> ovat olleet Luodon Levytekniikalla yli 6 kk.', '#asiakkaat/luodon-levytekniikka', 'Avaa asiakas'],
      ['6.40', 'Sähköposti', 'Kokosi aamun listan Johannalle ja Antille. <b>6 vastausluonnosta</b> hakijoille odottaa hyväksyntää, lähetetty 0.', '#hakemukset', 'Tarkista luonnokset'],
    ];
    return ui.activity(rows.map(r => ({title: r[2], meta: `klo ${r[0]} · Lähde: ${r[1]} · <a href="${r[3]}">${r[4]}</a>`})));
  }
  const JG = ['JG', 'Johanna G.'], AF = ['AF', 'Antti F.'];
  const btn = (label, href, primary) => ui.button({label, href, variant: primary ? 'primary' : 'secondary'});
  function todayLists(){
    const a = S.role === 'a';
    const pending = Math.max(0, 6 - new Set(S.f2sent || []).size);
    const order = S.f1?.mailed;
    const quote = S.f4?.sent;
    const todo = a ? [
      {chip:'Liidit', title:'Vaasan Akselitekniikka etsii neljää hitsaajaa', href:'#liidit', when:'Tänään', why:'Ilmoitus on ollut auki 21 päivää. Tarkista tarve ja ensimmäinen viesti.', actions:[btn('Avaa asiakasmahdollisuus', '#liidit', true)]},
      ...(!quote ? [{chip:'Tarjoukset', title:'Valmistele tarjous Botnia Mekaniikalle', href:'#tarjoukset', why:'Kaksi CNC-koneistajaa ja särmääjä tammikuusta alkaen, kuudeksi kuukaudeksi.', actions:[btn('Avaa tarjouspyyntö', '#tarjoukset')]}] : []),
      {chip:'Asiakkaat', title:'Sovi Luodon Levytekniikan jatkotarpeesta', href:'#asiakkaat/luodon-levytekniikka', why:'Patrik ja Rodel ovat työskennelleet asiakkaalla yli puoli vuotta.', actions:[btn('Avaa asiakas', '#asiakkaat/luodon-levytekniikka')]}
    ] : [
      ...(!order ? [{chip:'Pikatilaukset', title:'Kolme hitsaajaa Kokkolaan maanantaiksi', href:'#pikatilaukset', when:'Aloitus 16.11.', why:'Pohjan Teräsrakenteen tilaus. Vertaa osaamista, saatavuutta ja pätevyyksiä.', actions:[btn('Etsi tilaukseen tekijät', '#pikatilaukset', true)]}] : []),
      ...(pending ? [{chip:'Hakemukset', title:`Valmistele vastaukset ${pending} hakijalle`, href:'#hakemukset', why:'Lue yhteenvedot suomeksi ja valmistele seuraava yhteydenotto hakijan kielellä.', actions:[btn('Käsittele hakemukset', '#hakemukset')]}] : []),
      {chip:'Asiakkaat', title:'Kari kysyy Henrikin ja Kallen jatkosta', href:'#asiakkaat/pohjan-terasrakenne', why:'Nykyiset keikat päättyvät joulukuussa. Asiakas tarvitsee tekijöitä myös tammikuussa.', actions:[btn('Katso asiakkaan tilanne', '#asiakkaat/pohjan-terasrakenne')]}
    ];
    const needs = a ? [
      {title:'Kvarkenin Maalaustyön keikka päättyy 27.11.', href:'#asiakkaat/kvarkenin-maalaustyo', reason:'Jatkosta ei ole vielä sovittu. Tarkista asiakkaan kevään tarve.', actions:[btn('Avaa asiakas', '#asiakkaat/kvarkenin-maalaustyo')]},
      {title:'Botnia Mekaniikan hinnoittelu', href:'#tarjoukset', reason:quote ? 'Tarjousluonnos on valmis tarkistettavaksi. Varmista hinnat ennen lähettämistä.' : 'Tarkista tuntihinnat ja työntekijöiden saatavuus ennen tarjouksen hyväksyntää.', actions:[btn('Katso tarjous', '#tarjoukset')]}
    ] : [
      {title:`${certSoon().length} pätevyyttä vanhenee pian`, href:'#tekijat?kortit=30', reason:'Tarkista seuraavan 30 päivän aikana vanhenevat kortit ja sovi uusimisesta.', actions:[btn('Näytä vanhenevat kortit', '#tekijat?kortit=30')]},
      {title:'Tomasz tarvitsee majoituksen Kokkolasta', href:'#tekijat/tomasz-w', reason:'Asunto vapautuu 16.11. Varmista majoitus ennen keikan vahvistamista.', actions:[btn('Avaa tekijäkortti', '#tekijat/tomasz-w')]}
    ];
    return {todo, needs};
  }
  D.screens.tanaan = {
    hero(){
      const a = S.role === 'a';
      return `<header class="morning-header"><p class="morning-header__date">Tiistai 10. marraskuuta</p><h1>Hyvää huomenta, ${a ? 'Antti' : 'Johanna'}.</h1><p>${a ? 'Asiakastarpeet, tarjoukset ja seuraavat yhteydenotot yhdessä paikassa.' : 'Päivän henkilöstötarpeet ja hakemukset. Näet heti, mistä kannattaa aloittaa.'}</p></header>`;
    },
    render(body){
      const {todo, needs} = todayLists(), a = S.role === 'a';
      const n = Math.max(0, 6 - new Set(S.f2sent || []).size);
      const kpis = a ? [
        {label:'Tarjouspyyntöjä', value:'1', foot:S.f4?.sent ? 'luonnos valmis tarkistettavaksi' : 'luonnos valmistelematta'},
        {label:'Yrityksiä rekisterissä', value:String(CLIENTS.length), foot:'asiakkaat ja prospektit'},
        {label:'Tekijöitä asiakkailla', value:String(WORKERS.filter(w => w.a).length), foot:'voimassa olevat keikat'}
      ] : [
        {label:'Avoin henkilöstötarve', value:S.f1?.mailed ? '0' : '3 tekijää', foot:'Pohjan Teräsrakenne'},
        {label:'Hakemuksia käsiteltävänä', value:String(n), foot:'yön aikana saapuneet'},
        {label:'Kortteja vanhenee pian', value:String(certSoon().length), foot:'seuraavan 30 päivän aikana'}
      ];
      body.innerHTML = `${ui.kpis(kpis)}${a && D.salesSummary ? D.salesSummary() : ''}
        <div class="morning-columns">
          ${ui.card({title:'Aloita näistä', meta:`${todo.length} tehtävää`, body:ui.items(todo), cls:'morning-tasks'})}
          ${ui.card({title:'Tarkista vielä', body:ui.items(needs), cls:'morning-attention'})}
        </div>
        <details class="morning-log"><summary>Valmisteltu aamuksi <span>Hakemukset, pätevyydet ja asiakastarpeet</span></summary><div class="growth-card-pad">${nightLog()}</div></details>
        <section class="quick-workflows" aria-label="Työnkulut">
          <a href="#pikatilaukset"><span>Henkilöstötarve</span><strong>Tilauksesta sopiviin tekijöihin</strong>${icon('arrow')}</a>
          <a href="#hakemukset"><span>Rekrytointi</span><strong>Hakemuksesta haastatteluun</strong>${icon('arrow')}</a>
          <a href="#liidit"><span>Myynti</span><strong>Tarpeesta yhteydenottoon</strong>${icon('arrow')}</a>
        </section>`;
    }
  };

  /* KYSY DOBRALTA */
  const SRC_HREF = {'Tekijäpankki':'#tekijat', 'Vuorolista':'#pikatilaukset', 'Sähköposti':'#pikatilaukset', 'Asiakasrekisteri':'#asiakkaat', 'Työpaikkailmoitukset':'#liidit', 'Majoitukset':'#tekijat', 'Hakemus':'#hakemukset'};
  let askTok = 0, askState = null; // {q, id, phase:'loading'|'done'}
  function matchAns(q){
    q = q.toLowerCase(); let best = null, bs = 0;
    ANSWERS.forEach(a => { let sc = 0; a.kw.forEach(([k, w]) => { if(q.includes(k)) sc += w; }); if(sc > bs) { bs = sc; best = a; } });
    return bs >= 2 ? best : null;
  }
  const suggList = () => ui.items(ANSWERS.map(a => ({title: a.q, href: '#kysy', attrs: `data-ask-id="${a.id}"`})));
  function answerHtml(){
    if(!askState) return '';
    const qs = h(askState.q);
    if(askState.phase === 'loading') return ui.card({cls:'brain-ask-answer', title:'Vastaus', meta:'haetaan', body:`<div class="growth-card-pad growth-stack"><p class="brain-question">${qs}</p><p class="growth-muted">Haetaan tekijäpankista, vuorolistasta, sähköpostista ja asiakasrekisteristä.</p></div>`});
    const a = askState.id ? ANSWERS.find(x => x.id === askState.id) : null;
    if(!a) return ui.notice({tone:'development', title:'Vastausta ei löytynyt', attrs:'id="ask-fallback"', text:`<p class="brain-question">${qs}</p><p>Kokeile kysymystä tekijöiden saatavuudesta, pätevyyksistä tai asiakkaiden tilanteesta. Valmiit kysymykset löytyvät alta.</p><p>Kokeile jotakin näistä:</p>${suggList()}`});
    const n = a.src.length;
    return ui.card({cls:'brain-ask-answer', title:'Vastaus', meta:`${n} lähdettä`, body:`<div class="growth-card-pad growth-stack">
      <p class="brain-question">${qs}</p>
      <p class="growth-prewrap brain-answer">${a.text.join('\n\n')}</p>
      <div class="brain-answer__actions">${ui.button({label: a.next[0], href: a.next[1], variant:'primary'})}</div>
      <h3 class="brain-subheading">Lähteet</h3>
      <ol class="brain-sources">${a.src.map((s, k) => `<li value="${k + 1}">${ui.pill(s[0], 'info')} <a href="${SRC_HREF[s[0]] || '#kysy'}">${s[1]}</a><p class="growth-muted">"${s[2]}" · ${s[3]}</p></li>`).join('')}</ol>
    </div>`});
  }
  function recentHtml(){
    const body = S.hist.length
      ? ui.items(S.hist.map(x => ({title: h(x.q), href:'#kysy', attrs:`data-ask-q="${h(x.q)}"`, why: x.r})))
      : '<div class="growth-card-pad"><p class="growth-muted">Ei vielä kysymyksiä.</p></div>';
    return ui.card({cls:'brain-ask-recent', title:'Kysytyt', meta: S.hist.length ? `${S.hist.length}` : '', body});
  }
  function paintAsk(){
    const out = $('#ask-out'), rec = $('#ask-recent');
    if(out) out.innerHTML = answerHtml();
    if(rec) rec.innerHTML = recentHtml();
  }
  async function ask(q, id){
    q = String(q || '').trim(); if(!q) return;
    if(parseHash().route !== 'kysy') location.hash = 'kysy';
    const tok = ++askTok;
    askState = {q, id: null, phase: 'loading'};
    await wait(0);
    const inp = $('#ask-in'); if(inp) inp.value = q;
    paintAsk();
    await wait(900);
    if(tok !== askTok) return;
    const a = id ? ANSWERS.find(x => x.id === id) : matchAns(q);
    askState = {q, id: a ? a.id : null, phase: 'done'};
    S.hist = [{q, r: a ? `Vastaus, ${a.src.length} lähdettä` : 'Vastausta ei löytynyt'}].concat(S.hist.filter(x => x.q !== q)).slice(0, 8);
    save(); paintAsk();
  }
  D.ask = ask;
  D.screens.kysy = {
    header: () => ({eyebrow:'Tieto', title:'Kysy Dobralta', subtitle:'Yksi kysymys tekijäpankkiin, vuorolistaan, sähköpostiin, hakemuksiin ja asiakasrekisteriin. Vastaus kertoo lähteensä.'}),
    render(body){
      body.innerHTML = `
        <p class="growth-muted brain-ai-meter">Kokeile viittä esimerkkikysymystä tai niiden muunnelmia.</p>
        <div class="growth-stack">
          ${ui.card({cls:'brain-ask-question', title:'Kysymys', body:`<form class="growth-card-pad growth-stack" id="ask-f"><div class="wf-field"><label class="wf-field__label" for="ask-in">Kysy omin sanoin</label><textarea class="wf-textarea" id="ask-in" rows="3" placeholder="Esimerkiksi: kenen tulityökortti vanhenee tässä kuussa?"></textarea><p class="wf-field__hint">Enter hakee vastauksen. Shift + Enter lisää rivinvaihdon.</p></div><div>${ui.button({label:'Kysy', variant:'primary', size:'md', attrs:'data-ask-submit'})}</div></form>`})}
          <div id="ask-out"></div>
          ${ui.card({title:'Kokeile näitä', meta:'5 kysymystä', body: suggList()})}
          <div id="ask-recent"></div>
        </div>`;
      const f = $('#ask-f', body), ta = $('#ask-in', body);
      f.onsubmit = e => { e.preventDefault(); ask(ta.value); };
      $('[data-ask-submit]', body).onclick = () => ask(ta.value);
      ta.onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); ask(ta.value); } };
      if(askState) ta.value = askState.q;
      paintAsk();
    },
  };

  /* ARVORAPORTTI: count per week x minutes saved = hours. Every number is an invented estimate. */
  const VALUE = [
    ['Pikatilaukset', 'Tilauksen täyttö: haku, tekstiviestit ja vahvistus asiakkaalle', 13, 45, 4],
    ['Hakemukset', 'Hakemuksen luku ja yhteenveto suomeksi, myös käännös', 37, 15, 2],
    ['Hakemukset', 'Haastattelukutsu hakijan omalla kielellä', 9, 20, 3],
    ['Liidit', 'Signaalin taustatyö ja ensimmäinen viesti', 14, 15, 2],
    ['Tarjoukset', 'Tarjousluonnos pyynnöstä, ehdokkaat mukana', 3, 75, 15],
    ['Tekijäpankki', 'Vanhenevien korttien tarkistus', 1, 35, 5],
  ];
  D.screens.arvoraportti = {
    header: () => ({eyebrow:'Seuranta', title:'Ajansäästö', subtitle:'Muokkaa työmääriä ja käsittelyaikoja. Näet, missä arjen työ nopeutuisi eniten.'}),
    render(body){
      const values = VALUE.map((r,i) => {
        const saved = Array.isArray(S.valueInputs?.[i]) ? S.valueInputs[i] : r.slice(2);
        return saved.map((v,j) => Number.isFinite(+v) ? Math.min(j ? 1440 : 10000, Math.max(0,+v)) : r[j+2]);
      });
      const field = (i,j) => `<input class="value-input" type="number" min="0" max="${j ? 1440 : 10000}" step="1" value="${values[i][j]}" data-value-row="${i}" data-value-col="${j}" aria-label="${VALUE[i][1]}: ${['kertaa viikossa','minuuttia nyt','minuuttia työpöydällä'][j]}">`;
      body.innerHTML = `<div class="value-summary"><div><p>Arvioitu ajansäästö viikossa</p><output id="value-total" aria-live="polite"></output></div><p>Määrä × (nykyinen aika − uusi aika). Muuta lähtölukuja Dobran arkeen sopiviksi.</p></div>
        ${ui.card({flush:true,title:'Mistä ajansäästö syntyy',extra:ui.button({label:'Palauta lähtöluvut',attrs:'id="value-reset"'}),body:ui.table({cols:[{label:'Työtehtävä'},{label:'Kertaa / viikko',num:1},{label:'Nyt, min',num:1},{label:'Työpöydällä, min',num:1},{label:'Säästö / viikko',num:1}],rows:VALUE.map((r,i)=>[`${r[1]}<span class="wf-table__secondary">${r[0]}</span>`,field(i,0),field(i,1),field(i,2),`<output data-value-output="${i}"></output>`])})})}
        <p class="growth-muted">Lähtöluvut ovat arvioita. Tulos kuvaa vapautuvaa työaikaa, ei vielä mitattua säästöä.</p>`;
      const update = () => {
        let total = 0;
        values.forEach((v,i)=> { const mins=v[0]*(v[1]-v[2]); total+=mins; body.querySelector(`[data-value-output="${i}"]`).textContent=num(mins/60,1)+' h'; });
        $('#value-total',body).textContent=num(total/60,1)+' h';
      };
      body.oninput = e => { const el=e.target.closest('[data-value-row]'); if(!el) return; const i=+el.dataset.valueRow,j=+el.dataset.valueCol; const n=Number(el.value); if(el.value==='' || !el.validity.valid || !Number.isFinite(n)) { el.setAttribute('aria-invalid','true'); return; } el.removeAttribute('aria-invalid'); values[i][j]=n; S.valueInputs=values; save(); update(); };
      $('#value-reset',body).onclick = () => { delete S.valueInputs; save(); D.rerender(); };
      update();
    }
  };

  /* LIITÄNNÄT */
  const CONNECTORS = [
    ['Viestintä', [
      ['mail', 'Sähköposti', 'Tilaukset, hakemukset ja asiakkaiden viestit luetaan Dobran omasta postilaatikosta.', ['Asiakkaiden tilaukset', 'Hakemukset liitteineen', 'Kurssien ja kumppaneiden viestit'], ['Vastausluonnokset hyväksyttäviksi', 'Tilauksen tiedot pikatilaukseen'], 'Mitään ei lähetetä ilman ihmisen hyväksyntää.'],
      ['phone', 'Tekstiviesti ja WhatsApp', 'Keikkatarjoukset tekijöille heidän omalla kielellään, vastaukset takaisin tekijäpankkiin.', ['Tekijöiden vastaukset keikkatarjouksiin'], ['Keikkatarjous suomeksi, ruotsiksi, puolaksi tai englanniksi', 'Vastauksen kirjaus tekijäkortille'], 'Demon viestit ja vastaukset on simuloitu.'],
      ['calendar', 'Kalenteri', 'Haastattelut ja asiakastapaamiset Johannan ja Antin kalentereihin.', ['Vapaat ajat'], ['Haastattelukutsu ehdotetuilla ajoilla', 'Muistutus tapaamisesta'], 'Demossa ei kytketty.'],
    ]],
    ['Rekrytointi', [
      ['globe', 'Teamtailor (jobs.dobrafinland.fi)', 'Dobran nykyinen rekrytointijärjestelmä pysyy käytössä. Tekoäly lukee sinne tulevat hakemukset seulontaan ja tekijäpankkiin.', ['Uudet hakemukset', 'Avoimet paikat'], ['Yhteenveto suomeksi', 'Puuttuvat kortit näkyviin'], 'Demon hakemukset ovat keksittyjä.'],
      ['file', 'Duunitori-ilmoitukset', 'Ilmoitusten kautta tulleet hakijat samaan seulontaan kuin Teamtailorin hakemukset.', ['Ilmoitusten hakijat'], ['Hakijat samaan listaan', 'Vertailu avoimiin paikkoihin'], 'Demossa ei kytketty.'],
    ]],
    ['Talous ja tiedostot', [
      ['wallet', 'Palkanlaskenta', 'Vahvistetut vuorot ja tunnit siirtyvät palkkoihin ilman uutta näppäilyä.', ['Tekijöiden perustiedot'], ['Vahvistetut tunnit palkanlaskentaan'], 'Demossa ei kytketty. Järjestelmä valitaan Dobran nykyisen mukaan.'],
      ['table', 'Excel ja jaetut kansiot', 'Nykyiset listat luetaan sellaisenaan, niitä ei tarvitse ensin siirtää.', ['Tekijälistat', 'Vuorolistat', 'Asiakaslistat'], ['Tiedot tekijäpankkiin ja asiakasrekisteriin'], 'Demossa ei kytketty.'],
    ]],
  ];
  D.screens.liitannat = {
    header: () => ({eyebrow:'Tieto', title:'Liitännät', subtitle:'Näin sähköposti, rekrytointi ja muut järjestelmät liittyvät samaan työpöytään.'}),
    render(body){
      const all = CONNECTORS.reduce((s, g) => s + g[1].length, 0);
      body.innerHTML = `
        <div class="brain-connector-usage"><div class="wf-progress wf-progress--accent"><div class="wf-progress__header"><span class="wf-progress__label">Yhteydet käyttöönottovaiheessa</span><span class="wf-progress__value">0 / ${all}</span></div><div class="wf-progress__track"><div class="wf-progress__fill" style="width:0%"></div></div></div></div>
        ${CONNECTORS.map(([group, list]) => `<section class="brain-connector-group"><h2 class="brain-section-title">${group}</h2><div class="brain-connectors">${list.map(c => `
          <details class="wf-card wf-card--flush brain-connector">
            <summary class="brain-connector__summary"><span class="brain-connector__badge">${icon(c[0])}</span><span class="brain-connector__title"><h3 class="brain-connector__name">${c[1]}</h3>${ui.pill('Ei kytketty', 'neutral')}</span></summary>
            <div class="brain-connector__body"><p>${c[2]}</p><div class="brain-connector__lists"><div><h4 class="brain-subheading">Mitä Tekoäly lukisi</h4><ul class="brain-bullets">${c[3].map(x => `<li>${x}</li>`).join('')}</ul></div><div><h4 class="brain-subheading">Mitä Tekoäly tekisi</h4><ul class="brain-bullets">${c[4].map(x => `<li>${x}</li>`).join('')}</ul></div></div></div>
          </details>`).join('')}</div></section>`).join('')}`;
    },
  };

  /* MIKÄ ON KEKSITTYÄ */
  D.screens.keksittya = {
    header: () => ({eyebrow:'Ohje', title:'Tietoa demosta', subtitle:'Kokeile työpäivää Johannan tai Antin näkökulmasta.'}),
    render(body){
      body.innerHTML = ui.card({title:'Näin käytät demoa', body:`<div class="growth-card-pad growth-stack"><p>Vaihda henkilöä yläreunasta. Avaa tilaus, käsittele hakemuksia tai tutustu asiakastarpeisiin. Opastettu kierros näyttää työnkulut vaihe vaiheelta.</p><p>Demo käyttää esimerkkitietoja ja valmiita vastauksia. Viestit eivät lähde, eikä yhteyksiä Dobran järjestelmiin ole avattu. Valinnat tallentuvat vain tähän selaimeen.</p><p>Ajansäästölaskurin luvut ovat muokattavia arvioita. Varsinaiset hyödyt varmistetaan Dobran omilla työmäärillä.</p><div class="wf-cluster">${ui.button({label:'Aloita kierros', variant:'primary', attrs:'data-tour-start'})}${ui.button({label:'Aloita demo alusta', attrs:'data-reset'})}</div></div>`});
    }
  };

  /* The guide stays in the page, so the visitor can try every workflow. */
  const setRole = r => { S.role = r; save(); };
  const tour = [
    ['tanaan', 'Aloita päivä yhdestä näkymästä', 'Johanna näkee kiireelliset henkilöstötarpeet, uudet hakemukset ja tarkistettavat asiat heti aamulla.', 'Avaa päivän ensimmäinen henkilöstötarve. Näet asiakkaan tilauksen ja sopivat seuraavat toimet.', () => setRole('j'), 'Johannan työpäivä'],
    ['pikatilaukset', 'Löydä tilaukseen sopivat tekijät', 'Vertaa osaamista, saatavuutta ja pätevyyksiä. Tarkista myös majoitus ennen kuin vahvistat tekijän asiakkaalle.', 'Valitse ”Etsi sopivat työntekijät”. Vertaa ehdokkaita ja valmistele saatavuuskysely.', null, 'Johannan työpäivä'],
    ['tekijat?rooli=Hitsaaja', 'Rajaa tekijät asiakkaan tarpeeseen', 'Saatavuus, sijainti ja osaaminen kulkevat mukana samassa rekisterissä. Suodattimet auttavat löytämään oikeat ehdokkaat.', 'Valitse saatavuudeksi ”Vapautuu ennen joulua”. Avaa sitten Piotr K:n tekijäkortti.', null, 'Johannan työpäivä'],
    ['tekijat/piotr-k', 'Katso tekijän koko tilanne', 'Nykyinen keikka, pätevyydet, kielet ja majoitus löytyvät yhdeltä sivulta. Vanhenevat kortit erottuvat heti.', 'Tarkista Piotrin tulityökortin voimassaolo ja avaa nykyinen asiakas, Luodon Levytekniikka.', null, 'Johannan työpäivä'],
    ['hakemukset', 'Lue hakemus selkeänä yhteenvetona', 'Alkuperäinen CV ja suomenkielinen yhteenveto näkyvät rinnakkain. Jokaisen tiedon lähteen voi tarkistaa ennen päätöstä.', 'Käsittele hakemukset ja valitse Marek Z. Paina yhteenvedon lähdelinkkiä: oikea rivi korostuu CV:ssä.', null, 'Johannan työpäivä'],
    ['kysy', 'Kysy ja tarkista vastauksen lähde', 'Hae tietoa tekijöistä ja asiakkaista yhdellä kysymyksellä. Vastauksen yhteydessä näkyy, mihin tieto perustuu.', 'Valitse kysymys tässä kuussa vanhenevista tulityökorteista. Avaa vastauksesta tekijän tiedot.', null, 'Johannan työpäivä'],
    ['myynti', 'Näe myynnin suunta yhdellä silmäyksellä', 'Antin näkymä kokoaa myynnin kehityksen, avoimet mahdollisuudet ja seuraavat yhteydenotot. Värit erottavat myynnin vaiheet.', 'Vertaa ajanjaksoja ja avaa myyntiputkesta kiinnostava yritys.', () => setRole('a'), 'Antin myyntityö'],
    ['liidit', 'Muuta havaittu tarve yhteydenotoksi', 'Asiakasmahdollisuuden mukana kulkevat lähdeteksti, perustelut ja viestiluonnos. Tarkista tarve ennen yhteydenottoa.', 'Valitse ”Etsi potentiaaliset asiakkaat”. Avaa Vaasan Akselitekniikka ja tarkista viestiluonnos.', null, 'Antin myyntityö'],
    ['asiakkaat', 'Pidä asiakkaat ja mahdollisuudet järjestyksessä', 'Yrityskortti kokoaa yhteydenotot, avoimet asiat ja asiakkaalla työskentelevät tekijät. Rekisterissä on eri toimialojen yrityksiä.', 'Hae yritystä nimellä. Avaa sen kortti ja tarkista seuraava tehtävä.', null, 'Antin myyntityö'],
    ['tarjoukset', 'Valmistele tarjous tarkistettavaksi', 'Tarjouspyynnön tiedot, hinnat ja vapaat ehdokkaat muodostavat yhden luonnoksen. Antti tarkistaa ehdot ennen lähettämistä.', 'Valitse ”Laadi tarjousluonnos”. Tarkista työntekijät, tuntihinnat ja aloituspäivä.', null, 'Antin myyntityö'],
    ['tanaan', 'Vaihda näkökulmaa kesken demon', 'Johannalla ja Antilla on omat aamun tehtävänsä. Henkilövalinta pysyy näkyvissä jokaisella sivulla.', 'Vaihda yläreunan henkilövalinnasta Johannaan ja takaisin Anttiin. Aamun tehtävät vaihtuvat mukana.', () => setRole('a'), 'Yhteinen työpöytä'],
    ['arvoraportti', 'Arvioi hyöty omilla työmäärillä', 'Muokkaa tehtävien määriä ja käsittelyaikoja. Laskuri näyttää, kuinka paljon aikaa työviikosta voisi vapautua.', 'Muuta yhtä viikoittaista työmäärää ja katso, miten ajansäästö muuttuu.', null, 'Yhteinen työpöytä'],
    ['tanaan', 'Nyt voit kokeilla omaa työpäivää', 'Avaa tilaus, käsittele hakemus tai tutki myyntiputkea. Voit palata kierrokseen milloin tahansa yläreunan painikkeesta.', 'Valitse haluamasi henkilö ja aloita tehtävästä, joka vastaa omaa työtäsi.', null, 'Kierros valmis'],
  ];
  D.tour = tour;
  function renderTour(){
    const slot = $('#tour-slot'); if(!slot) return;
    const i = S.tour;
    $$('[data-tour-highlight]').forEach(el => el.removeAttribute('data-tour-highlight'));
    $$('[data-tour-start]').forEach(b => b.textContent = typeof i === 'number' ? 'Näytä kierros' : S.tourLast > 0 ? 'Jatka kierrosta' : 'Opastettu kierros');
    if(typeof i !== 'number' || !tour[i]) { slot.innerHTML = ''; return; }
    const t = tour[i], last = i === tour.length - 1, compact = !!S.tourCompact;
    const targets = ['.morning-tasks','#f1-find','.worker-filters','.wf-page-header','#f2-go','[data-ask-id]','.sales-overview','#f3-go','#client-search','#f4-go','#active-person','#value-total','.morning-tasks'];
    if(parseHash().route === t[0].split(/[/?]/)[0]) { const target = $(targets[i]) || $('section[data-route]:not([hidden]) [data-body]'); target?.setAttribute('data-tour-highlight',''); }
    let instruction = t[3];
    if(i === 4 && S.f2run) instruction = 'Valitse Marek Z. ja vertaa yhteenvetoa alkuperäiseen CV:hen. Lähdelinkki korostaa oikean rivin.';
    if(i === 1 && S.f1?.found) instruction = 'Ehdokkaat on jo haettu. Vertaa heidän saatavuuttaan ja tarkista tilauksen seuraava vaihe.';
    if(i === 7 && S.f3?.run) instruction = 'Avaa Vaasan Akselitekniikka. Tarkista lähdeteksti, viestiluonnos ja myyntiputken vaihe.';
    if(i === 9 && S.f4?.draft) instruction = 'Tarjousluonnos on jo valmisteltu. Tarkista työntekijät, tuntihinnat ja aloituspäivä.';
    slot.innerHTML = `<aside class="tour-guide${compact ? ' is-compact' : ''}" aria-labelledby="tour-title">
      <div class="tour-guide__top"><span class="tour-guide__eyebrow">Opastettu kierros <span>·</span> ${h(t[5])} <span class="tour-guide__person">${S.role === 'a' ? 'Antti' : 'Johanna'}</span></span><div class="tour-guide__tools"><button type="button" data-tour-toggle aria-expanded="${!compact}" aria-controls="tour-content">${compact ? 'Avaa opastus' : 'Pienennä'}</button><button type="button" data-tour-go="-1" aria-label="Sulje kierros">${icon('close')}</button></div></div>
      <div class="tour-guide__heading"><span class="tour-guide__number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><h2 id="tour-title" tabindex="-1">${h(t[1])}</h2><span class="tour-guide__count">${i+1} / ${tour.length}</span></div>
      <div id="tour-content"${compact ? ' hidden' : ''}><div class="tour-guide__body"><p>${h(t[2])}</p><div class="tour-guide__task"><strong>Kokeile itse</strong><p>${h(instruction)}</p><button type="button" class="tour-guide__open" data-tour-open>Näytä vaihe sivulla ${icon('arrow')}</button></div></div></div>
      <div class="tour-guide__footer"><label for="tour-step">Siirry vaiheeseen<select id="tour-step">${tour.map((step,n)=>`<option value="${n}"${n===i ? ' selected' : ''}>${n+1}. ${h(step[1])}</option>`).join('')}</select></label><div class="tour-guide__buttons">${ui.button({label:'Edellinen',attrs:`data-tour-go="${i-1}"${i===0 ? ' disabled' : ''}`})}${ui.button({label:last ? 'Päätä kierros' : 'Seuraava vaihe',variant:'primary',attrs:`data-tour-go="${last ? -1 : i+1}"`})}</div></div>
      <div class="tour-guide__progress" role="progressbar" aria-label="Kierroksen eteneminen" aria-valuemin="0" aria-valuemax="${tour.length}" aria-valuenow="${i+1}"><span style="width:${(i+1)/tour.length*100}%"></span></div>
    </aside>`;
    $('#tour-step').addEventListener('change', e => tourGo(Number(e.target.value)));
  }
  function tourGo(i){
    if(i < 0 || !tour[i]){
      if(typeof S.tour === 'number') S.tourLast = S.tour === tour.length-1 ? 0 : S.tour;
      delete S.tour; save(); renderTour(); $('[data-tour-start]')?.focus(); return;
    }
    S.tour = i; S.tourLast = i; S.tourCompact = false; save();
    const t = tour[i]; if(t[4]) t[4]();
    go(t[0]);
    requestAnimationFrame(() => { $('#tour-title')?.focus({preventScroll:true}); $('#tour-slot')?.scrollIntoView({block:'start'}); });
  }
  D.tourGo = tourGo;

  /* INTRO */
  function closeIntro(){ const d = $('#intro'); S.intro = 1; save(); if(d && d.open) d.close(); }
  function resetDemo(e){ if(e) e.preventDefault(); if(!confirm('Aloitetaanko demo alusta? Tähän selaimeen tallennetut valinnat tyhjennetään.')) return; try { localStorage.setItem(SKEY, JSON.stringify({role:S.role})); } catch(x) {} location.hash = 'tanaan'; location.reload(); }
  D.resetDemo = resetDemo;

  /* GO-TO BAR (Hae tai siirry): input#ask-top, routes plus "Kysy Dobralta". */
  let goActive = 0;
  function goRows(){
    const q = ($('#ask-top').value || '').trim(), ql = q.toLowerCase();
    const list = routes.filter(r => !ql || (r.title + ' ' + r.detail).toLowerCase().includes(ql));
    const rows = [];
    if(q) rows.push({ask: true, title:`Kysy Dobralta: ${h(q)}`, detail:'Hakee vastauksen esimerkkiaineistosta', icon:'ask'});
    list.forEach(r => rows.push({href:'#' + r.id, title: r.title, detail: r.detail, icon: r.icon}));
    return rows;
  }
  function paintGoTo(){
    const rows = goRows(); if(goActive >= rows.length) goActive = 0;
    $('#go-to-list').innerHTML = rows.map((r, i) => `<li role="presentation"><a class="growth-go-to__row" role="option" href="${r.href || '#kysy'}" data-go-i="${i}"${r.ask ? ' data-go-ask' : ''}${i === goActive ? ' data-active aria-selected="true"' : ''}><span class="growth-go-to__icon"${r.ask ? ' data-group="ask"' : ''}>${icon(r.icon)}</span><span class="growth-go-to__text"><span class="growth-go-to__title">${r.title}</span><span class="growth-go-to__detail">${r.detail}</span></span>${i === goActive ? '<span class="growth-go-to__enter">Enter</span>' : ''}</a></li>`).join('');
  }
  function openGoTo(){
    const d = $('#go-to'); if(!d || d.open) return;
    const p = $('#wf-sidebar-panel'); try { if(p && p.matches(':popover-open')) p.hidePopover(); } catch(e) {}
    $('#ask-top').value = ''; goActive = 0; paintGoTo();
    try { d.showModal(); } catch(e) { d.setAttribute('open', ''); }
    $('#ask-top').focus();
  }
  function closeGoTo(){ const d = $('#go-to'); if(d && d.open) d.close(); }
  function runGo(i){
    const r = goRows()[i]; if(!r) return;
    const q = ($('#ask-top').value || '').trim();
    closeGoTo();
    if(r.ask) ask(q); else go(r.href);
  }
  D.openGoTo = openGoTo;

  /* EVENTS */
  function bind(){
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-reset],[data-tour-start],[data-tour-go],[data-tour-toggle],[data-tour-open],[data-ask-id],[data-ask-q],[data-intro-close],[data-intro-tour],[data-go-i],#go-to-open,#go-to-close');
      if(!t) {
        const navA = e.target.closest('.wf-nav__item');
        if(navA){ const p = $('#wf-sidebar-panel'); try { if(p.matches(':popover-open')) p.hidePopover(); } catch(x) {} }
        return;
      }
      if(t.matches('[data-reset]')) return resetDemo(e);
      if(t.matches('[data-tour-start]')) { closeIntro(); return tourGo(typeof S.tour === 'number' ? S.tour : S.tourLast || 0); }
      if(t.matches('[data-tour-toggle]')) { S.tourCompact = !S.tourCompact; save(); renderTour(); $('[data-tour-toggle]')?.focus(); return; }
      if(t.matches('[data-tour-open]')) { S.tourCompact = true; save(); go(tour[S.tour][0]); requestAnimationFrame(() => { const sec = $('section[data-route]:not([hidden])'); const target = $('[data-tour-highlight]') || sec; target?.scrollIntoView({block:'center'}); const title = $('h1', sec); title?.setAttribute('tabindex','-1'); title?.focus({preventScroll:true}); }); return; }
      if(t.matches('[data-tour-go]')) return tourGo(+t.dataset.tourGo);
      if(t.matches('[data-ask-id]')) { e.preventDefault(); const a = ANSWERS.find(x => x.id === t.dataset.askId); return ask(a.q, a.id); }
      if(t.matches('[data-ask-q]')) { e.preventDefault(); return ask(t.dataset.askQ); }
      if(t.matches('[data-intro-close]')) return closeIntro();
      if(t.matches('[data-intro-tour]')) { closeIntro(); return tourGo(0); }
      if(t.matches('[data-go-i]')) { e.preventDefault(); return runGo(+t.dataset.goI); }
      if(t.matches('#go-to-open')) return openGoTo();
      if(t.matches('#go-to-close')) return closeGoTo();
    });
    $('#intro').addEventListener('close', () => { S.intro = 1; save(); });
    $('#go-to').addEventListener('click', e => { if(e.target === e.currentTarget) closeGoTo(); });
    $('#ask-top').addEventListener('input', () => { goActive = 0; paintGoTo(); });
    $('#ask-top').addEventListener('keydown', e => {
      const n = goRows().length;
      if(e.key === 'ArrowDown'){ e.preventDefault(); goActive = (goActive + 1) % Math.max(n, 1); paintGoTo(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); goActive = (goActive - 1 + n) % Math.max(n, 1); paintGoTo(); }
    });
    $('#go-to-form').addEventListener('submit', e => { e.preventDefault(); runGo(goActive); });
    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '');
      if(typeof S.tour === 'number' && !/INPUT|TEXTAREA|SELECT/.test(tag) && !e.target.isContentEditable && !document.querySelector('dialog[open]')) {
        if(e.key === 'Escape') { e.preventDefault(); tourGo(-1); return; }
        if(e.target.closest('.tour-guide') && ['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); tourGo(e.key === 'ArrowRight' ? (S.tour+1 < tour.length ? S.tour+1 : -1) : Math.max(0,S.tour-1)); return; }
      }
      if(e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(tag) && !e.target.isContentEditable && !document.querySelector('dialog[open]')){
        e.preventDefault(); openGoTo();
      }
    });
    window.addEventListener('hashchange', () => { render(); const m = $('#wf-main'); if(m) m.focus({preventScroll: true}); window.scrollTo(0, 0); });
  }

  function boot(){
    paintIcons(document);
    $('#active-person').onchange = e => { S.role = e.target.value === 'a' ? 'a' : 'j'; save(); render(); };
    bind();
    render();

  }
  // Deferred scripts run before DOMContentLoaded, so flows.js and registers.js have registered by then.
  if(document.readyState === 'complete') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
