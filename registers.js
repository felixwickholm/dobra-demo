/* Dobra AI-työpöytä, rekisterit: tekijät (#tekijat, #tekijat/<slug>) ja asiakkaat (#asiakkaat, #asiakkaat/<slug>).
   ctx.sub is the slug, ctx.params the query (#tekijat?rooli=Hitsaaja&tila=joulu, ?kortit=30, ?kaupunki=, ?kieli=).
   Filters live in the URL only. Data: WORKERS and CLIENTS in data.js. */
(function(){
  'use strict';
  const D = window.DOBRA;
  if(!D || !D.screens) return;
  const {ui, fd, fds, days} = D;
  const pad = html => `<div class="growth-card-pad growth-stack">${html}</div>`;
  const client = s => CLIENTS.find(c => c.s === s);
  const worker = s => WORKERS.find(w => w.s === s);
  const cLink = s => { const c = client(s); return c ? `<a href="#asiakkaat/${c.s}">${c.n}</a>` : s; };
  const workerHref = (w, p) => `#tekijat/${w.s}${p && p.toString() ? "?" + p.toString() : ""}`;
  const wLink = (w, p) => `<a href="${workerHref(w, p)}">${w.n}</a>`;
  const backHref = ctx => `#tekijat${ctx.params.toString() ? "?" + ctx.params.toString() : ""}`;
  const ST = {vapaa:['Vapaana / vapautumassa', 'success'], keikalla:['Keikalla', 'info'], hakija:['Hakija', 'neutral']};
  const stPill = w => ui.pill(...(ST[w.st] || ['Tuntematon', 'neutral']));
  const freeTxt = f => !f ? 'ei tiedossa' : (f === 'heti' ? 'heti' : f);

  function certSt(iso){
    if(iso === null) return ['bad', 'Puuttuu'];
    if(iso === '') return ['ok', 'Ei vanhene'];
    const d = days(iso);
    if(d < 0) return ['bad', `Vanhentunut ${fd(iso)}`];
    if(d <= 30) return ['warn', `Vanhenee ${fd(iso)}`];
    return ['ok', `Voimassa ${fd(iso)}`];
  }
  const TONE = {ok:'success', warn:'warning', bad:'danger'};
  const worst = w => { const st = (w.certs || []).map(c => certSt(c[1])); return st.find(s => s[0] === 'bad') || st.find(s => s[0] === 'warn') || null; };

  /* filters */
  const uniq = a => Array.from(new Set(a)).sort((x, y) => x.localeCompare(y, 'fi'));
  const FIL = {
    kaupunki: {label:'Sijainti', opts: () => uniq(WORKERS.map(w => w.city)).map(c => [c, c])},
    tila: {label:'Saatavuus', opts: () => [['vapaa', 'Vapaana / vapautumassa'], ['keikalla', 'Keikalla'], ['joulu', 'Vapautuu ennen joulua'], ['hakija', 'Hakija']]},
    kieli: {label:'Kieli', opts: () => uniq(WORKERS.flatMap(w => w.langs || [])).map(l => [l, l])},
    kortit: {label:'Kortit', opts: () => [['30', 'Vanhenee 30 päivän sisällä'], ['puuttuu', 'Puuttuu tai vanhentunut']]},
  };
  function wMatch(w, p){
    const query = (p.get('haku') || '').trim().toLocaleLowerCase('fi');
    const haystack = [w.n, w.role, w.city].join(' ').toLocaleLowerCase('fi');
    if(query && !query.split(/\s+/).every(term => haystack.includes(term))) return false;
    if(p.get('rooli') && w.role !== p.get('rooli')) return false;
    if(p.get('kaupunki') && w.city !== p.get('kaupunki')) return false;
    if(p.get('kieli') && !(w.langs || []).includes(p.get('kieli'))) return false;
    const t = p.get('tila');
    if(t === 'joulu'){ if(!(w.a && w.a[2] < '2026-12-24')) return false; }
    else if(t && w.st !== t) return false;
    const k = p.get('kortit'), sts = (w.certs || []).map(c => certSt(c[1])[0]);
    if(k === '30' && !sts.includes('warn')) return false;
    if(k === 'puuttuu' && !sts.includes('bad')) return false;
    return true;
  }
  const qs = (p, key, val) => { const n = new URLSearchParams(p); if(val) n.set(key, val); else n.delete(key); const s = n.toString(); return '#tekijat' + (s ? '?' + s : ''); };
  const select = (key, p) => { const f = FIL[key], id = 'fl-' + key;
    return `<div class="wf-field"><label class="wf-field__label" for="${id}">${f.label}</label><div class="wf-select"><select class="wf-select__control" id="${id}" data-fil="${key}"><option value="">Kaikki</option>${f.opts().map(([v, t]) => `<option value="${v}"${p.get(key) === v ? ' selected' : ''}>${t}</option>`).join('')}</select><span class="wf-select__icon" data-icon="chevron" aria-hidden="true"></span></div></div>`; };

  function workerList(body, ctx){
    const p = ctx.params, list = WORKERS.filter(w => wMatch(w, p));
    const roles = uniq(WORKERS.map(w => w.role));
    const busy = list.filter(w => w.a), expiring = list.filter(w => (w.certs || []).some(c => certSt(c[1])[0] === 'warn')).length;
    const activeFilters = ['rooli', 'kaupunki', 'tila', 'kieli', 'kortit'].filter(k => p.get(k)).length;
    const any = Boolean(p.get('haku') || activeFilters);
    const filtersOpen = activeFilters > 0 || window.matchMedia('(min-width: 601px)').matches;
    const rows = list.map(w => { const c = worst(w); return [
      `<span class="wf-table__primary">${wLink(w, p)}</span><span class="wf-table__secondary">${w.role} · ${w.city}</span>`,
      stPill(w),
      w.a ? `${cLink(w.a[0])}<span class="wf-table__secondary">päättyy ${fds(w.a[2])}</span>` : `<span class="growth-muted">${w.st === 'hakija' ? 'Aloitus' : 'Vapaana'} ${freeTxt(w.free)}</span>`,
      c ? ui.pill(c[1], TONE[c[0]]) : ui.pill('Kunnossa', 'success'),
      `<span class="growth-muted">${(w.langs || []).join(', ')}</span>`]; });
    body.innerHTML = `
      ${ui.kpis([{label:'Hakutuloksia', value:`${list.length} / ${WORKERS.length}`, foot:'tekijää'}, {label:'Vapaana / vapautumassa', value: String(list.filter(w => w.st === 'vapaa').length), foot:'tekijää hakutuloksissa'}, {label:'Keikalla', value: String(busy.length), foot:`hakutuloksissa, ${new Set(busy.map(w => w.a[0])).size} asiakkaalla`}, {label:'Kortti vanhenee 30 päivän sisällä', value: String(expiring), foot:'tekijällä hakutuloksissa', tone: expiring ? 'warning' : 'neutral'}])}
      <div class="wf-field worker-search-field"><label class="wf-field__label" for="worker-search">Etsi tekijää</label><input class="wf-input" id="worker-search" type="search" placeholder="Nimi, ammatti tai paikkakunta" value="${ctx.h(p.get('haku') || '')}" autocomplete="off"></div>
      <details class="worker-filters"${filtersOpen ? ' open' : ''}>
        <summary>Rajaa hakua${activeFilters ? ` (${activeFilters})` : ''}</summary>
        <nav class="growth-filters" aria-label="Rooli"><a class="growth-filter" href="${qs(p, 'rooli', '')}"${p.get('rooli') ? '' : ' aria-current="page"'}>Kaikki</a>${roles.map(r => `<a class="growth-filter" href="${qs(p, 'rooli', r)}"${p.get('rooli') === r ? ' aria-current="page"' : ''}>${r}</a>`).join('')}</nav>
        <div class="brain-board-bar"><div class="brain-board-bar__filter wf-cluster">${Object.keys(FIL).map(k => select(k, p)).join('')}</div></div>
      </details>
      ${ui.card({flush:1, title:'Tekijät', meta:`${list.length} tekijää · yhteensä ${WORKERS.length}`, extra:any ? ui.button({label:'Tyhjennä suodattimet', href:'#tekijat'}) : '', body: list.length
        ? ui.table({id:'tk-table', cols:[{label:'Tekijä'}, {label:'Tila'}, {label:'Keikka ja saatavuus'}, {label:'Kortit'}, {label:'Kielet'}], rows})
        : pad(ui.empty({title:'Ei tekijöitä näillä ehdoilla', text:'Vaihda tai tyhjennä suodattimet.', actions: ui.button({label:'Tyhjennä suodattimet', href:'#tekijat'})}))})}`;
    body.oninput = e => {
      if(e.target.id !== 'worker-search' || e.isComposing) return;
      const input = e.target, cursor = input.selectionStart;
      history.replaceState(null, '', qs(p, 'haku', input.value));
      D.rerender();
      const next = document.getElementById('worker-search');
      if(next){ next.focus({preventScroll:true}); if(cursor !== null) next.setSelectionRange(cursor, cursor); }
    };
    body.onchange = e => {
      const s = e.target.closest('select[data-fil]'); if(!s) return;
      history.replaceState(null, '', qs(p, s.dataset.fil, s.value));
      D.rerender();
      const n = document.getElementById(s.id); if(n) n.focus();
    };
  }

  function docs(w){
    const base = ['Työsopimus', 'Verokortti', 'Henkilöllisyystodistus', 'Pankkitili Suomessa'];
    if(w.intl === 'eu') base.push('EU-rekisteröinti', 'Suomalainen henkilötunnus');
    if(w.intl === 'non-eu') base.push('Oleskelulupa', 'Suomalainen henkilötunnus');
    (w.miss || []).forEach(m => { if(!base.includes(m)) base.push(m); });
    return base.map(d => [d, (w.miss || []).includes(d)]);
  }
  function workerPage(body, ctx, w){
    const stars = n => `${n} / 5`;
    const tilanne = [['Tila', stPill(w)]];
    if(w.a) tilanne.push(['Nykyinen keikka', `${cLink(w.a[0])}, ${w.a[3]}`], ['Keikan ajankohta', `${fd(w.a[1])} – ${fd(w.a[2])}`]);
    tilanne.push(['Vapaana alkaen', freeTxt(w.free)], ['Kokemus', w.exp != null ? `${w.exp} vuotta` : 'ei tiedossa'], ['Kielet', (w.langs || []).join(', ')], ['Ajokortti', w.lic || 'ei tiedossa']);
    if(w.prev) tilanne.push(['Aiempi keikka', w.prev]);
    const certs = ui.table({cols:[{label:'Kortti tai pätevyys'}, {label:'Tila'}], rows:(w.certs || []).map(c => { const s = certSt(c[1]); return [c[0], ui.pill(s[1], TONE[s[0]])]; })});
    const fb = (w.fb || []).length ? ui.activity(w.fb.map(f => ({title:`"${f[3]}"`, meta:`${client(f[0]) ? client(f[0]).n : f[0]} · ${f[1]} · ${stars(f[2])}`, tone: f[2] >= 4 ? 'success' : 'warning'}))) : '<p class="growth-muted">Ei palautetta vielä.</p>';
    const d = docs(w);
    body.innerHTML = `
      ${w.note ? ui.notice({tone:'info', text: w.note}) : ''}
      <div class="wf-split">
        <div class="growth-stack">
          ${ui.card({title:'Tilanne', body: pad(ui.kv(tilanne))})}
          ${ui.card({flush:1, title:'Kortit ja pätevyydet', body: certs})}
          ${ui.card({title:'Palaute asiakkailta', body: pad(fb)})}
        </div>
        <div class="growth-stack">
          ${ui.card({title:'Majoitus', body: pad(w.house ? (w.houseWarn ? ui.notice({tone:'warning', text: w.house}) : `<p>${w.house}</p>`) : '<p class="growth-muted">Ei Dobran majoitusta.</p>')})}
          ${ui.card({flush:1, title:'Asiakirjat', extra: ui.pill(d.some(x => x[1]) ? `${d.filter(x => x[1]).length} puuttuu` : 'Kunnossa', d.some(x => x[1]) ? 'warning' : 'success'), body: ui.table({cols:[{label:'Asiakirja'}, {label:'Tila'}], rows: d.map(([n, m]) => [n, m ? ui.pill('Puuttuu', 'danger') : ui.pill('Kunnossa', 'success')])})})}
        </div>
      </div>`;
  }

  D.screens.tekijat = {
    header(ctx){
      if(ctx.sub){
        const w = worker(ctx.sub); if(!w) return {eyebrow:`<a href="${backHref(ctx)}">Takaisin tekijäpankkiin</a>`, title:'Tekijää ei löytynyt'};
        return {eyebrow:`<a href="${backHref(ctx)}">Takaisin tekijäpankkiin</a>`, title: w.n, subtitle:`${w.role} · ${w.city}`, actions:stPill(w)};
      }
      return {eyebrow:'Rekisterit', title:'Tekijäpankki', subtitle:'Löydä sopiva tekijä. Tarkista saatavuus, osaaminen ja pätevyydet.'};
    },
    render(body, ctx){
      body.onchange = null;
      body.oninput = null;
      if(!ctx.sub) return workerList(body, ctx);
      const w = worker(ctx.sub);
      if(!w){ body.innerHTML = ui.empty({title:'Tekijää ei löytynyt', text:'Tarkista linkki tai etsi henkilö tekijäpankista.', actions: ui.button({label:'Takaisin tekijäpankkiin', href:backHref(ctx)})}); return; }
      workerPage(body, ctx, w);
    },
  };

  /* ASIAKKAAT */
  const onGig = c => WORKERS.filter(w => w.a && w.a[0] === c.s);
  const cPill = c => ui.pill(c.st, /uusi/i.test(c.st) ? 'warning' : 'success');
  // Saved workflow progress changes display status only; no message is sent here.
  const clientOrders = c => (c.open || []).map(([title, status, href]) => {
    const route = (href || '').split('?')[0];
    const confirmed = (route === '#pikatilaukset' || route === '#vuorot') && Boolean(D.S.f1?.mailed);
    const reviewReady = route === '#tarjoukset' && Boolean(D.S.f4?.sent);
    return {title, href, status: confirmed ? 'Vahvistus valmis' : reviewReady ? 'Valmis tarkistettavaksi' : status, completed: confirmed};
  });
  const openOrderCount = c => clientOrders(c).filter(o => !o.completed).length;
  function clientList(body){
    const gig = WORKERS.filter(w => w.a).length;
    const rows = CLIENTS.map(c => { const g = onGig(c), next = g.map(w => w.a[2]).sort()[0]; return [
      `<span class="wf-table__primary"><a href="#asiakkaat/${c.s}">${c.n}</a></span><span class="wf-table__secondary">${c.city} · ${c.ind}</span>`,
      cPill(c), {cls:'wf-table__num', html: String(g.length)},
      next ? (days(next) <= 21 ? ui.pill(fd(next), 'warning') : fd(next)) : '<span class="growth-muted">ei keikkoja</span>',
      `${c.last[0]}<span class="wf-table__secondary">${c.last[1]}</span>`,
      {cls:'wf-table__num', html: String(openOrderCount(c))}]; });
    body.innerHTML = `
      ${ui.kpis([{label:'Asiakkaita', value: String(CLIENTS.length), foot:'asiakasrekisterissä'}, {label:'Keikalla nyt', value: String(gig), foot:'tekijää asiakkailla'}, {label:'Sijoitettu tänä vuonna', value: String(CLIENTS.reduce((n, c) => n + (c.ytd ? +c.ytd[1] : 0), 0)), foot:'tekijää'}, {label:'Avoimia tilauksia', value: String(CLIENTS.reduce((n, c) => n + openOrderCount(c), 0))}])}
      ${ui.card({flush:1, title:'Asiakkaat', meta:`${CLIENTS.length} asiakasta`, body: ui.table({id:'as-table', cols:[{label:'Asiakas'}, {label:'Tila'}, {label:'Keikalla', num:1}, {label:'Seuraava keikka päättyy'}, {label:'Viimeisin yhteys'}, {label:'Avoimia tilauksia', num:1}], rows})})}`;
  }
  function clientPage(body, c){
    const g = onGig(c);
    const ev = [];
    g.forEach(w => { if(days(w.a[1]) <= 0) ev.push([w.a[1], `${w.n} aloitti: ${w.a[3]}`, 'success']); ev.push([w.a[2], `${w.n}: keikka päättyy`, days(w.a[2]) <= 21 ? 'warning' : 'neutral']); });
    const m = /(\d+)\.(\d+)\./.exec(c.last[0] || '');
    if(m) ev.push([`2026-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`, c.last[1], 'accent']);
    ev.sort((a, b) => b[0].localeCompare(a[0]));
    const gigT = g.length ? ui.table({cols:[{label:'Tekijä'}, {label:'Tehtävä'}, {label:'Päättyy'}], rows: g.map(w => [wLink(w), w.a[3], days(w.a[2]) <= 21 ? ui.pill(fd(w.a[2]), 'warning') : fd(w.a[2])])}) : pad('<p class="growth-muted">Ei tekijöitä keikalla juuri nyt.</p>');
    const orders = clientOrders(c);
    const open = orders.length ? ui.table({cols:[{label:'Tilaus'}, {label:'Tila'}], rows: orders.map(o => [o.href ? `<a href="${o.href}">${o.title}</a>` : o.title, ui.pill(o.status, o.completed ? 'success' : 'info')])}) : pad('<p class="growth-muted">Ei avoimia tilauksia.</p>');
    const placed = (c.placed || []).map(worker).filter(Boolean);
    body.innerHTML = `
      ${ui.kpis([{label:'Keikalla nyt', value: String(g.length)}, {label:'Tilauksia tänä vuonna', value: String(c.ytd ? c.ytd[0] : 0)}, {label:'Tekijöitä tänä vuonna', value: String(c.ytd ? c.ytd[1] : 0)}, {label:'Tunteja tänä vuonna', value: String(c.ytd ? c.ytd[2] : 0)}])}
      ${g.some(w => days(w.a[2]) <= 21) ? ui.notice({tone:'warning', title:'Keikka päättyy pian', text:'Kysy asiakkaalta jatkosta ennen päättymispäivää.'}) : ''}
      <div class="wf-split">
        <div class="growth-stack">
          ${ui.card({flush:1, title:'Keikalla nyt', body: gigT})}
          ${ui.card({flush:1, title:'Tilaukset', meta:`${openOrderCount(c)} avointa`, body: open})}
          ${ui.card({title:'Vuoden aikana sijoitetut tekijät', body: pad(placed.length ? `<div class="wf-cluster">${placed.map(w => `<a class="wf-chip" href="#tekijat/${w.s}">${w.n}</a>`).join('')}</div>` : '<p class="growth-muted">Ei vielä sijoituksia.</p>')})}
        </div>
        <div class="growth-stack">
          ${ui.card({title:'Yhteystiedot ja viimeisin yhteys', body: pad(ui.kv([['Yhteyshenkilö', c.who], ['Paikkakunta', c.city], ['Toimiala', c.ind], ['Asiakkaana', c.since ? `vuodesta ${c.since}` : 'uusi'], ['Viimeisin yhteys', `${c.last[0]}, ${c.last[1]}`]]))})}
          ${ui.card({title:'Muistiinpanot', body: pad((c.notes || []).length ? `<ul class="brain-bullets">${c.notes.map(n => `<li>${n}</li>`).join('')}</ul>` : '<p class="growth-muted">Ei muistiinpanoja.</p>')})}
          <section class="wf-card brain-company-timeline"><header class="wf-card__header"><h2 class="wf-card__title">Tapahtumat</h2></header>${pad(ui.activity(ev.map(e => ({title: e[1], meta: fd(e[0]) + (days(e[0]) > 0 ? ', tulossa' : ''), tone: e[2]}))))}</section>
        </div>
      </div>`;
  }
  D.screens.asiakkaat = {
    header(ctx){
      if(ctx.sub){
        const c = client(ctx.sub); if(!c) return {eyebrow:'<a href="#asiakkaat">Asiakkaat</a>', title:'Asiakasta ei löytynyt'};
        return {eyebrow:'<a href="#asiakkaat">Asiakkaat</a>', title: c.n, subtitle:`${c.city} · ${c.ind}`, actions:cPill(c)};
      }
      return {eyebrow:'Rekisterit', title:'Asiakkaat', subtitle:'Tarkista asiakkuuden tilanne, tekijät ja avoimet tilaukset.'};
    },
    render(body, ctx){
      body.onchange = null;
      body.oninput = null;
      if(!ctx.sub) return clientList(body);
      const c = client(ctx.sub);
      if(!c){ body.innerHTML = ui.empty({title:'Asiakasta ei löytynyt', text:'Linkki voi olla vanha.', actions: ui.button({label:'Takaisin asiakkaisiin', href:'#asiakkaat'})}); return; }
      clientPage(body, c);
    },
  };
})();
