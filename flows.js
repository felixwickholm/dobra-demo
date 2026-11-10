/* Dobra AI-työpöytä, työnkulut: pikatilaukset, hakemukset, liidit, tarjoukset.
   Contract (see app.js header): window.DOBRA.screens[route] = { header(ctx) optional, render(body, ctx) required }.
   State lives under S.f1 (pikatilaus), S.f2 (valittu hakemus), S.f3 (liidi, kieli, myyntiputki), S.f4 (tarjous).
   Recorder ids: #f1-find #f1-list .cand #f1-send #f1-sms #f1-threads #f1-confirm .saved #f2-list .it #f2-detail
   (.ai .cv .score) #f3-table tbody tr #f3-detail h3 #f3-detail .tabs button[data-l] #f3-add #kan-new .k
   #f4-go #f4-quote td.price #f4-ok #f4-done. Everything here is esimerkkidata. */
(function(){
  'use strict';
  const D = window.DOBRA;
  if(!D || !D.screens) return;
  const {ui, icon, wait} = D;
  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
  const slugOf = n => { const w = WORKERS.find(x => x.n === n); return w ? w.s : ''; };
  const pad = html => `<div class="growth-card-pad growth-stack">${html}</div>`;
  const draft = t => `<div class="wf-inset growth-prewrap">${t}</div>`;
  const live = el => el && document.body.contains(el);
  function steps(labels, k){
    return `<ol class="wf-steps" aria-label="Vaiheet">${labels.map((l, i) => { const st = i < k ? 'complete' : (i === k ? 'current' : 'pending');
      return `<li class="wf-steps__item wf-steps__item--${st}"${i === k ? ' aria-current="step"' : ''}><span class="wf-steps__marker">${i < k ? icon('check') : i + 1}</span><span class="wf-steps__text"><span class="wf-steps__label">${l}</span><span class="wf-steps__state">${i < k ? 'Valmis' : (i === k ? 'Nyt' : 'Tulossa')}</span></span></li>`; }).join('')}</ol>`;
  }
  const mail = (from, time, subject, text) => `<details class="brain-mail-card" open><summary class="brain-mail-card__summary"><span class="brain-mail-card__head"><span class="brain-mail-card__from">${from}</span><span class="brain-mail-card__time">${time}</span></span><span class="brain-mail-card__subject">${subject}</span></summary><div class="brain-mail-card__body"><div class="brain-mail-card__text growth-prewrap">${text}</div></div></details>`;
  const progress = (label, v, cls) => `<div class="wf-progress wf-progress--accent"><div class="wf-progress__header"><span class="wf-progress__label">${label}</span><span class="wf-progress__value ${cls || ''}">${v} %</span></div><div class="wf-progress__track"><div class="wf-progress__fill" style="width:${v}%"></div></div></div>`;
  const TONE = {ok:'success', warn:'warning', bad:'danger'};

  /* AGENT RUN: you watch the agent work (steps tick, bar fills) before the result shows. done < 0 = idle with a start button. */
  function agentCard(name, title, text, list, done, action){
    const pct = done < 0 ? 0 : Math.round(done / list.length * 100);
    return `<div class="dobra-agent" role="status" aria-live="polite">
      <p class="dobra-agent__name"><span class="dobra-agent__spark${done >= 0 && done < list.length ? ' is-on' : ''}"></span>${name}</p>
      <h3 class="dobra-agent__title">${title}</h3><p class="dobra-agent__text">${text}</p>
      <div class="dobra-agent__bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
      ${done < 0 ? '' : `<ol class="dobra-agent__steps">${list.map((s, i) => `<li class="${i < done ? 'is-done' : i === done ? 'is-now' : ''}"><span class="dobra-agent__mark">${i < done ? icon('check') : i + 1}</span><span>${s}</span></li>`).join('')}</ol>`}
      ${action ? `<div class="wf-cluster">${action}</div>` : ''}
      </div>`;
  }
  async function runAgent(slot, name, title, text, list){
    for(let i = 0; i <= list.length; i++){
      if(!live(slot)) return false;
      slot.innerHTML = agentCard(name, title, text, list, i);
      await wait(i === list.length ? 400 : 560);
    }
    return live(slot);
  }
  /* SOURCES: a chip beside each field the AI read; a click highlights that spot in the mail or CV. */
  const src = (id, label) => id ? `<button type="button" class="dobra-srcchip" data-src-go="${id}">${label}</button>` : `<span class="dobra-srcchip dobra-srcchip--none">${label}</span>`;
  const mark = (id, t) => `<span class="dobra-src" data-src="${id}">${t}</span>`;
  function srcHit(body, e){
    const b = e.target.closest('[data-src-go]'); if(!b) return false;
    $$('.dobra-src.is-hit', body).forEach(x => x.classList.remove('is-hit'));
    $$('.dobra-srcchip.is-on', body).forEach(x => x.classList.remove('is-on'));
    const t = $(`.dobra-src[data-src="${b.dataset.srcGo}"]`, body);
    if(t){ t.classList.add('is-hit'); b.classList.add('is-on'); t.scrollIntoView({behavior:'smooth', block:'nearest'}); }
    return true;
  }
  /* RECOMMENDATION: one verdict with its reasons, like the construction demo's "Suositus". */
  const rec = (big, small, title, why) => `<div class="dobra-rec"><div class="dobra-rec__score"><b>${big}</b><span>${small}</span></div><div class="dobra-rec__body"><p class="dobra-rec__title">${title}</p><ul class="dobra-rec__why">${why.map(w => `<li class="is-${w[0]}">${w[1]}</li>`).join('')}</ul></div></div>`;

  /* 1 PIKATILAUKSET */
  const pool = [
    {n:'Jonas B.', loc:'Pietarsaari · 38 km', s:97, tags:[['MAG 135/136 voimassa 2027','ok'],['Työturvallisuuskortti','ok'],['Tulityökortti','ok'],['Vapaa 16.11.','ok']], note:'Ollut tällä asiakkaalla syyskuussa, palaute 5/5', lang:'fi', sel:true},
    {n:'Piotr K.', loc:'Kokkola · 4 km', s:93, tags:[['MAG 135/136 voimassa','ok'],['Työturvallisuuskortti','ok'],['Tulityökortti vanhenee 2.12.','warn'],['Vapaa 16.11.','ok']], note:'Kielet: puola, englanti', lang:'pl', sel:true},
    {n:'Mikko H.', loc:'Kruunupyy · 30 km', s:90, tags:[['MAG 135 voimassa','ok'],['Työturvallisuuskortti','ok'],['Tulityökortti','ok'],['Vapaa 16.11.','ok']], note:'5 vuoden kokemus teräsrakenteista', lang:'fi', sel:true},
    {n:'Andrei P.', loc:'Kokkola · 6 km', s:88, tags:[['MAG 136 voimassa','ok'],['Työturvallisuuskortti','ok'],['Tulityökortti','ok'],['Vapaa 16.11.','ok']], note:'Kielet: romania, englanti', lang:'en', sel:true},
    {n:'Erik S.', loc:'Luoto · 41 km', s:79, tags:[['MAG 135 voimassa','ok'],['Työturvallisuuskortti','ok'],['Nykyinen keikka päättyy 13.11.','warn']], note:'Ruotsinkielinen, saa viestin ruotsiksi', lang:'sv', sel:true},
    {n:'Tomasz W.', loc:'Vaasa · 118 km', s:71, tags:[['MAG 135 voimassa','ok'],['Tarvitsee majoituksen','warn']], note:'Dobran asunto Kokkolassa vapautuu 16.11.', lang:'pl', sel:false},
  ];
  const smsText = {
    fi: n => `Hei ${n}, hitsauskeikka Kokkolassa ma 16.11. alkaen, 2 vk, klo 7.00–15.30, MAG. Kiinnostaako? Vastaa K tai E. / Dobra`,
    sv: n => `Hej ${n}, svetsjobb i Karleby från mån 16.11, 2 veckor, kl. 7.00–15.30, MAG. Intresserad? Svara J eller N. / Dobra`,
    pl: n => `Cześć ${n}, praca dla spawacza w Kokkola od pon. 16.11., 2 tyg., 7.00–15.30, MAG. Jesteś zainteresowany? Odpowiedz T lub N. / Dobra`,
    en: n => `Hi ${n}, welding job in Kokkola from Mon 16.11, 2 weeks, 7.00–15.30, MAG. Interested? Reply Y or N. / Dobra`,
  };
  const langName = {fi:'Suomeksi', sv:'Ruotsiksi', pl:'Puolaksi', en:'Englanniksi'};
  const replies = {
    'Jonas B.':['K, käy hyvin','7.44','ok','Kyllä'],
    'Piotr K.':['Tak, pasuje','7.45','ok','Kyllä (käännetty puolasta)'],
    'Andrei P.':['Sorry, not this time, I have another job','7.46','bad','Ei pääse'],
    'Mikko H.':['Joo, mukana','7.47','ok','Kyllä'],
    'Erik S.':['Ja, från 16.11 går bra','7.48','ok','Kyllä (käännetty ruotsista)'],
    'Tomasz W.':['Tak, jeśli jest mieszkanie','7.49','warn','Kyllä, jos majoitus järjestyy (käännetty puolasta)'],
  };
  const f1 = S => (S.f1 = S.f1 && typeof S.f1 === 'object' ? S.f1 : {});
  function f1Outcome(sent){
    const order = sent.map(k => pool[k]).filter(Boolean).sort((a, b) => replies[a.n][1].localeCompare(replies[b.n][1]));
    const ok = order.filter(p => replies[p.n][2] === 'ok').map(p => p.n);
    return {order, conf: ok.slice(0, 3), reserve: ok.slice(3)};
  }
  function f1Status(p, out, shown){
    if(!shown) return ui.pill('Odottaa vastausta', 'neutral');
    if(replies[p.n][2] === 'warn') return ui.pill('Majoitus varmistettava', 'warning');
    if(replies[p.n][2] !== 'ok') return ui.pill('Ei pääse', 'danger');
    return out.conf.includes(p.n) ? ui.pill('Vahvistettu', 'success') : ui.pill('Varalla', 'info');
  }
  function f1Thread(p, k, out, shown){
    const r = replies[p.n];
    const items = [{title: smsText[p.lang](p.n.split(' ')[0]), meta:`Dobra · 7.43 · ${langName[p.lang]}`, tone:'accent'}];
    if(shown) items.push({title: r[0], meta:`${p.n} · ${r[1]} · Tulkinta: ${r[3]}`, tone: TONE[r[2]]});
    return `<div class="wf-inset growth-stack" id="th-${k}"><div class="wf-cluster"><strong>${p.n}</strong><span id="st-${k}">${f1Status(p, out, shown)}</span></div><div class="th-log">${ui.activity(items)}</div></div>`;
  }
  function f1Confirm(st){
    const out = f1Outcome(st.sent), n = out.conf;
    const list = n.length > 1 ? `${n.slice(0, -1).join(', ')} ja ${n[n.length - 1]}` : (n[0] || '');
    const text = n.length
      ? `Hei Kari,\n\n${n.length === 1 ? 'yksi hitsaaja on' : n.length + ' hitsaajaa on'} vahvistettu Kokkolaan ma 16.11. klo 7.00 alkaen: ${list.replace(/\.$/, '')}. Tarkistamme pätevyystodistukset ennen aloitusta.\n\n${n.includes('Piotr K.') ? 'Piotrin tulityökortti on voimassa koko toimeksiannon ajan. Sen uusiminen on sovittava ennen seuraavaa toimeksiantoa. ' : ''}Varmistamme vielä aloitusohjeet kanssanne.\n\nTerveisin\nJohanna / Dobra`
      : 'Yksikään valituista työntekijöistä ei ole vahvistanut saatavuuttaan.';
    return ui.card({title:'Vahvistusluonnos asiakkaalle', extra: ui.pill(`${n.length} / 3 työntekijää`, n.length >= 3 ? 'success' : 'warning'), body: pad(`
      ${draft(text)}
      <div class="wf-cluster">${st.mailed ? ui.button({label:'Vahvistus tallennettu', variant:'primary', attrs:'id="f1-mail" disabled'}) : ui.button({label:'Tallenna vahvistus', variant:'primary', attrs:`id="f1-mail"${n.length >= 3 ? '' : ' disabled'}`})}<span class="growth-muted">${n.length < 3 ? `Valitse vielä ${3 - n.length} ${n.length === 2 ? 'työntekijä' : 'työntekijää'} ja varmista saatavuus.` : 'Tarkista aloitusaika ennen lähettämistä.'}</span></div>
      ${ui.button({label:'Muuta työntekijävalintaa', attrs:'id="f1-edit"'})}
      ${out.reserve.length ? `<p class="growth-muted">${out.reserve.join(', ')} vastasi myös myöntävästi ja on varalla.</p>` : ''}
      <div class="growth-kpis saved"><div class="wf-kpi"><p class="wf-kpi__label">Käsin, arvio</p><p class="wf-kpi__value">45 min</p><p class="wf-kpi__footnote wf-kpi__footnote--neutral">Soitot, tekstiviestit ja vahvistus</p></div><div class="wf-kpi"><p class="wf-kpi__label">Tekoälyn avulla, arvio</p><p class="wf-kpi__value">4 min</p><p class="wf-kpi__footnote wf-kpi__footnote--success">Yksi tilaus, arvio</p></div></div>`)});
  }
  function f1Cands(st){
    const sel = st.sel || pool.map((p, k) => p.sel ? k : -1).filter(k => k >= 0);
    const rows = pool.map((p, k) => { const s = slugOf(p.n); return {cls:'cand', cells:[
      {cls:'wf-table__select', html:`<input type="checkbox" class="wf-checkbox__input" data-k="${k}" aria-label="Valitse ${p.n}"${sel.includes(k) ? ' checked' : ''}${st.sent ? ' disabled' : ''}>`},
      `<span class="wf-table__primary">${p.n}</span><span class="wf-table__secondary">${p.loc}${s ? ` · <a href="#tekijat/${s}">Profiili</a>` : ''}</span>`,
      `<div class="wf-cluster">${p.tags.map(t => ui.pill(t[0], TONE[t[1]])).join('')}</div>`,
      `<span class="growth-muted">${p.note}</span>`,
      `<span class="score">${p.s} %</span>`]}; });
    return ui.table({cols:[{label:'<span class="wf-visually-hidden">Valitse</span>'}, {label:'Tekijä'}, {label:'Pätevyydet ja saatavuus'}, {label:'Huomio'}, {label:'Sopivuus', num:1}], rows})
      + (st.sent ? '' : `<div class="growth-card-pad wf-cluster">${ui.button({label:`Näytä viestit ja vastaukset (${sel.length})`, variant:'primary', attrs:`id="f1-send"${sel.length ? '' : ' disabled'}`})}<span class="growth-muted">Viestiluonnokset työntekijöiden omilla kielillä</span></div>`);
  }
  const F1_RUN = ['Tilaus luettu: 3 MAG-hitsaajaa, Kokkola, 16.11. alkaen', 'Jonas B.: MAG voimassa 2027, vapaa 16.11., 38 km', 'Piotr K.: tulityökortti vanhenee 2.12., muuten kunnossa', 'Mikko H.: kortit voimassa, vapaa, 30 km', 'Andrei P.: kortit voimassa, vapaa, 6 km', 'Erik S.: nykyinen keikka päättyy 13.11., ehtii', 'Tomasz W.: tarvitsee majoituksen, varalle'];
  const f1Rec = () => rec('5', 'ehdokasta', 'Suositus: kysy saatavuus viideltä sopivimmalta', [
    ['ok', 'Kaikilla viidellä on MAG-pätevyys. Tarkista vielä pätevyyden soveltuvuus tehtävään.'],
    ['ok', 'Neljä asuu alle 40 km päässä Kokkolasta'],
    ['warn', 'Piotrin tulityökortti vanhenee 2.12. Toimeksianto päättyy 27.11.'],
    ['warn', 'Tomasz tarvitsee majoituksen. Hänet voi valita, jos majoitus järjestyy.']]);
  function f1Paint(body, ctx){
    const st = f1(ctx.S);
    const phase = st.mailed ? 4 : st.done ? 3 : st.sent ? 2 : st.found ? 1 : 0;
    const out = st.sent ? f1Outcome(st.sent) : null;
    body.innerHTML = `
      ${steps(['Tilaus', 'Työntekijöiden valinta', 'Viestit ja vastaukset', 'Vahvistusluonnos'], phase)}
      <div class="wf-split">
        ${mail('Kari L. · tuotantopäällikkö', 'ti 10.11. klo 7.42', 'Pohjan Teräsrakenne Oy · Hitsaajia ensi viikolle', `Moi,\n\ntarvittaisiin ${mark('q', '3 hitsaajaa')} ${mark('p', 'Kokkolan tehtaalle')} ${mark('a', 'maanantaista 16.11. alkaen, kaksi viikkoa')}. ${mark('v', 'Vuorot 7.00–15.30')}. ${mark('t', 'MAG-hitsausta')}, ${mark('r', 'pätevyys pitää olla')}.\n\nEhtisittekö järjestää?\n\nT. Kari`)}
        ${ui.card({title:'Tilauksen yhteenveto', meta:'Avaa lähde, niin näet tiedon alkuperäisessä viestissä.', body: pad(`${ui.kv([['Tehtävä',`Hitsaaja, MAG (135/136) ${src('t', 'Viesti')}`], ['Määrä',`3 tekijää ${src('q', 'Viesti')}`], ['Paikka',`Kokkola ${src('p', 'Viesti')}`], ['Alku ja kesto',`ma 16.11. klo 7.00 · 2 viikkoa ${src('a', 'Viesti')}`], ['Vuoro',`7.00–15.30 ${src('v', 'Viesti')}`], ['Vaaditaan',`Hitsauspätevyys EN ISO 9606-1, työturvallisuuskortti, tulityökortti ${src('r', 'Viesti')} ${src('', 'Asiakkaan aiemmat tilaukset')}`]])}
          <div class="wf-cluster">${ui.button({label:'Etsi sopivat työntekijät', variant:'primary', size:'md', attrs:`id="f1-find"${st.found ? ' disabled' : ''}`})}</div>
          <a class="growth-muted" href="#tekijat?rooli=Hitsaaja">Avaa työntekijäpankki ja rajaa hitsaajiin</a>`)})}
      </div>
      <div id="f1-run"></div>
      ${st.found ? f1Rec() : ''}
      ${ui.card({flush:1, title:'Sopivat työntekijät', extra:`<span id="f1-count">${ui.pill(st.found ? '6 ehdokasta' : 'Odottaa hakua', 'info')}</span>`, body:`<div id="f1-list">${st.found ? f1Cands(st) : pad('<p class="growth-muted">Paina "Etsi sopivat työntekijät". Näet ehdokkaiden pätevyydet, sijainnin ja saatavuuden.</p>')}</div>`})}
      <div id="f1-sms">${st.sent ? ui.card({title:'Viestit ja vastaukset', body: pad(`<div class="growth-stack" id="f1-threads">${out.order.map(p => f1Thread(p, pool.indexOf(p), out, st.done)).join('')}</div>`)}) : ''}</div>
      <div id="f1-confirm">${st.done ? f1Confirm(st) : ''}</div>`;
  }
  D.screens.pikatilaukset = {
    header: () => ({eyebrow:'Työt', title:'Täytä asiakkaan tilaus', subtitle:'Tarkista tarve, valitse työntekijät ja valmistele vahvistus asiakkaalle.'}),
    render(body, ctx){
      // A new render may interrupt the staged reply animation. Keep saved work usable.
      const saved = f1(ctx.S);
      if(saved.sent && !saved.done){ saved.done = 1; ctx.save(); }
      if(saved.mailed && (!saved.sent || f1Outcome(saved.sent).conf.length < 3)){ delete saved.mailed; ctx.save(); }
      f1Paint(body, ctx);
      const st = () => f1(ctx.S);
      body.onchange = e => {
        const c = e.target.closest('#f1-list input[data-k]'); if(!c) return;
        st().sel = $$('#f1-list input[data-k]:checked', body).map(x => +x.dataset.k); ctx.save();
        const b = $('#f1-send', body), n = st().sel.length; if(b){ b.textContent = `Näytä viestit ja vastaukset (${n})`; b.disabled = !n; }
      };
      body.onclick = async e => {
        if(srcHit(body, e)) return;
        const t = e.target.closest('#f1-find,#f1-send,#f1-mail,#f1-edit'); if(!t || t.disabled) return;
        if(t.id === 'f1-find'){
          t.disabled = true;
          $('#f1-count', body).innerHTML = ui.pill('Haetaan', 'info');
          $('#f1-list', body).innerHTML = pad('<p class="growth-muted">Verrataan työntekijöiden pätevyyksiä ja saatavuutta tilaukseen.</p>');
          const run = $('#f1-run', body); run.scrollIntoView({behavior:'smooth', block:'start'});
          if(!await runAgent(run, 'Tekoälyavustaja', 'Etsitään sopivia hitsaajia', 'Verrataan jokaista tekijää tilaukseen: pätevyys, korttien voimassaolo, matka ja vapaat päivät.', F1_RUN)) return;
          st().found = 1; ctx.save(); f1Paint(body, ctx);
          const r = $('.dobra-rec', body); if(r) r.scrollIntoView({behavior:'smooth', block:'start'});
        } else if(t.id === 'f1-send'){
          const s = st(); s.sent = (s.sel || pool.map((p, k) => p.sel ? k : -1).filter(k => k >= 0)).slice(); ctx.save();
          f1Paint(body, ctx);
          const sms = $('#f1-sms', body); sms.scrollIntoView({behavior:'smooth', block:'start'});
          const out = f1Outcome(s.sent);
          for(const p of out.order){
            await wait(900); if(!live(sms)) return;
            const k = pool.indexOf(p), th = $('#th-' + k, body);
            if(th){ $('.th-log', th).innerHTML = ui.activity([{title: smsText[p.lang](p.n.split(' ')[0]), meta:`Dobra · 7.43 · ${langName[p.lang]}`, tone:'accent'}, {title: replies[p.n][0], meta:`${p.n} · ${replies[p.n][1]} · Tulkinta: ${replies[p.n][3]}`, tone: TONE[replies[p.n][2]]}]); $('#st-' + k, body).innerHTML = f1Status(p, out, 1); }
          }
          await wait(700); if(!live(sms)) return;
          s.done = 1; ctx.save(); f1Paint(body, ctx);
          const c = $('#f1-confirm', body); if(c) c.scrollIntoView({behavior:'smooth', block:'start'});
        } else if(t.id === 'f1-edit'){
          const s = st(); delete s.sent; delete s.done; delete s.mailed;
          ctx.save(); f1Paint(body, ctx);
          $('#f1-list', body).scrollIntoView({behavior:'smooth', block:'center'});
        } else if(t.id === 'f1-mail'){
          if(!st().sent || f1Outcome(st().sent).conf.length < 3) return;
          st().mailed = 1; ctx.save(); f1Paint(body, ctx);
        }
      };
    },
  };

  /* 2 HAKEMUKSET */
  const apps = [
    {n:'Marek Z.', ln:[2,4,6,5,7], rec:'Kutsu haastatteluun: robottihitsaaja, Pohjanmaa', good:'EN ISO 9606-1 voimassa 06/2027 ja 6 vuotta robottihitsausta', i:'MZ', lang:'PL', role:'Avoin hakemus', time:'02.14',
     cv:`CV: Marek Z.\nDoświadczenie:\n2019–2025  Operator robota spawalniczego, zakład konstrukcji stalowych, Gdańsk\n2016–2019  Spawacz MAG, stocznia\nUprawnienia: EN ISO 9606-1 (135, 136) ważne do 06/2027\nPrawo jazdy: B\nJęzyki: polski, angielski (dobry), fiński (podstawy)\nDostępny: od 1.12.2026`,
     sum:[['Kokemus','6 vuotta robottihitsausta, 3 vuotta MAG-hitsausta telakalla'],['Pätevyydet','EN ISO 9606-1 (135, 136) voimassa 06/2027'],['Kielet','puola, hyvä englanti, suomen alkeet'],['Ajokortti','B'],['Saatavilla','1.12.2026 alkaen']],
     match:[['Robottihitsaaja, Pohjanmaa',94],['Hitsaaja, Kokkola',86],['CNC-koneistaja',22]],
     miss:'Työturvallisuuskorttia ei mainita. Tarkista kortin tarve ja sovi koulutuksesta ennen aloitusta.', ok:false,
     draft:{l:'Puolaksi', t:`Dzień dobry Marek,\n\ndziękujemy za aplikację do Dobra. Twoje doświadczenie z robotami spawalniczymi pasuje do naszego stanowiska w Ostrobotnii. Czy możemy porozmawiać w czwartek 12.11 o 10.00 (Teams)?\n\nPozdrawiam\nJohanna / Dobra`, fi:'Käännös: Kiitos hakemuksesta. Robottihitsauskokemuksesi sopii Pohjanmaan paikkaan. Sopisiko puhelu torstaina 12.11. klo 10 (Teams)?'}},
    {n:'Sara N.', ln:[2,4,5,6,'Hakulomake'], rec:'Kutsu haastatteluun: CNC-koneistaja, Pietarsaari', good:'3 vuotta CNC-työtä, puhuu ruotsia ja suomea', i:'SN', lang:'SV', role:'CNC-koneistaja', time:'23.40',
     cv:`Sara N.\nErfarenhet:\n2022–  CNC-operatör, verkstadsindustri, Vasa\nSvarvning och fräsning, Heidenhain-styrning\nUtbildning: Yrkesexamen inom maskin- och produktionsteknik\nSpråk: svenska, finska, engelska\nKörkort: B`,
     sum:[['Kokemus','3 vuotta CNC-sorvausta ja -jyrsintää, Heidenhain-ohjaus'],['Koulutus','Kone- ja tuotantotekniikan perustutkinto'],['Kielet','ruotsi, suomi, englanti'],['Ajokortti','B'],['Saatavilla','tammikuu 2027']],
     match:[['CNC-koneistaja, Pietarsaari',92],['Särmääjä',48]],
     miss:'Sopii myös Botnia Mekaniikan tarjouspyyntöön. Varmista pätevyydet ja saatavuus haastattelussa.', ok:true,
     draft:{l:'Ruotsiksi', t:`Hej Sara,\n\ntack för din ansökan till Dobra. Din CNC-erfarenhet passar bra för ett uppdrag i Jakobstad från januari. Passar det med ett samtal torsdag 12.11 kl. 13?\n\nHälsningar\nJohanna / Dobra`, fi:'Käännös: Kiitos hakemuksesta. CNC-kokemuksesi sopii Pietarsaaren tehtävään tammikuusta. Sopisiko puhelu torstaina 12.11. klo 13?'}},
    {n:'Juha M.', ln:[1,3,'CV:n kieli',5,'Hakulomake'], rec:'Kutsu haastatteluun ja tarkista SFS 6002 -koulutuksen voimassaolo', good:'S2-pätevyys ja 8 vuotta teollisuusasennuksia', i:'JM', lang:'FI', role:'Sähköasentaja', time:'21.05',
     cv:`Juha M.\nSähköasentaja, 8 vuotta\nTeollisuus- ja kiinteistösähköasennukset\nPätevyydet: S2-sähköpätevyys, SFS 6002 (suoritettu 2020)\nTyöturvallisuuskortti voimassa\nAjokortti B, C`,
     sum:[['Kokemus','8 vuotta teollisuus- ja kiinteistöasennuksia'],['Pätevyydet','S2, työturvallisuuskortti'],['Kielet','suomi'],['Ajokortti','B, C'],['Saatavilla','heti']],
     match:[['Sähköasentaja, Kokkola',89],['Asentaja, Vaasa',75]],
     miss:'SFS 6002 -koulutus on suoritettu vuonna 2020. Tarkista, onko koulutus uusittu.', ok:false,
     draft:{l:'Suomeksi', t:`Hei Juha,\n\nkiitos hakemuksesta. Sinulle olisi heti alkava sähköasennustyö Kokkolassa. CV:ssäsi SFS 6002 -koulutuksen vuosi on 2020. Oletko uusinut koulutuksen sen jälkeen? Sopisiko puhelu huomenna klo 9?\n\nTerveisin\nJohanna / Dobra`, fi:''}},
    {n:'Ioana D.', ln:[2,3,4,'Ei CV:ssä',5], rec:'Soita ja tarkista trukkilupa: logistiikka, Pietarsaari', good:'4 vuotta varastotyötä, vapaa heti', i:'ID', lang:'RO', role:'Avoin hakemus', time:'19.22',
     cv:`Ioana D.\nExperiență:\n2021–2025  Operator depozit, centru logistic, Cluj\nStivuitor (licență), scanare, inventar\nLimbi: română, engleză (bună)\nDisponibil: imediat`,
     sum:[['Kokemus','4 vuotta varastotyötä: trukkityö, keräily ja inventointi'],['Pätevyydet','Trukkikoulutus Romaniassa, osaaminen tarkistettava'],['Kielet','romania, hyvä englanti'],['Ajokortti','ei mainittu'],['Saatavilla','heti']],
     match:[['Logistiikkatyöntekijä, Pietarsaari',87],['Logistiikkatyöntekijä, Kokkola',85]],
     miss:'Tarkista trukkiosaaminen, työnantajan ajolupa ja työturvallisuuskortin tarve.', ok:false,
     draft:{l:'Englanniksi', t:`Hi Ioana,\n\nthank you for applying to Dobra. We have warehouse work in Pietarsaari that fits your experience. Could we have a short call on Thursday 12.11 at 11.00?\n\nBest regards\nJohanna / Dobra`, fi:'Käännös: Kiitos hakemuksesta. Pietarsaaressa olisi kokemukseesi sopivaa varastotyötä. Sopisiko lyhyt puhelu torstaina 12.11. klo 11?'}},
    {n:'Liam O.', ln:[1,3,4,'Ei CV:ssä',5], rec:'Kutsu haastatteluun: rakennusmaalari, Vaasa', good:'5 vuotta uudis- ja korjausmaalausta, vapaa 23.11.', i:'LO', lang:'EN', role:'Rakennusmaalari', time:'17.58',
     cv:`Liam O.\nPainter and decorator, 5 years\nNew build and renovation, spray and roller\nCSCS card (UK)\nLanguages: English\nAvailable from 23.11.2026`,
     sum:[['Kokemus','5 vuotta uudis- ja korjausmaalausta, ruisku- ja telamaalaus'],['Pätevyydet','CSCS-kortti (Iso-Britannia)'],['Kielet','englanti'],['Ajokortti','ei mainittu'],['Saatavilla','23.11. alkaen']],
     match:[['Rakennusmaalari, Vaasa',81]],
     miss:'Suomalaista työturvallisuuskorttia ei mainita. Tarkista tehtävän vaatimukset.', ok:false,
     draft:{l:'Englanniksi', t:`Hi Liam,\n\nthanks for applying. Our painting crew in Vaasa needs help from late November. Do you have time for a call on Friday 13.11 at 10.00?\n\nBest regards\nJohanna / Dobra`, fi:'Käännös: Kiitos hakemuksesta. Vaasan maalariporukka tarvitsee apua marraskuun lopusta. Sopisiko puhelu perjantaina 13.11. klo 10?'}},
    {n:'Anna-Leena K.', ln:[1,'Ei CV:ssä',3,'Ei CV:ssä','Ei CV:ssä'], rec:'Tekijäpankkiin, ei avointa sopivaa paikkaa nyt', good:'6 vuotta asiakaspalvelua, kolme kieltä', i:'AK', lang:'FI', role:'Avoin hakemus', time:'16.30',
     cv:`Anna-Leena K.\nAsiakaspalvelu, 6 vuotta\nKaupan ala ja puhelinpalvelu\nKielet: suomi, ruotsi, englanti`,
     sum:[['Kokemus','6 vuotta asiakaspalvelua kaupassa ja puhelinpalvelussa'],['Pätevyydet','ei mainittu'],['Kielet','suomi, ruotsi, englanti'],['Ajokortti','ei mainittu'],['Saatavilla','ei mainittu']],
     match:[['Ei avointa sopivaa paikkaa',0]],
     miss:'Säilytä hakemus tulevia tehtäviä varten hakijan suostumuksella.', ok:true,
     draft:{l:'Suomeksi', t:`Hei Anna-Leena,\n\nkiitos hakemuksesta. Juuri nyt meillä ei ole asiakaspalvelupaikkaa auki, mutta voimmeko säilyttää hakemuksesi ja ottaa yhteyttä sopivan tehtävän avautuessa?\n\nTerveisin\nJohanna / Dobra`, fi:''}},
  ];
  function f2Paint(body, ctx){
    const sel = apps[ctx.S.f2] ? ctx.S.f2 : 0, a = apps[sel], s = slugOf(a.n);
    const sent = (ctx.S.f2sent || []).includes(a.n);
    const list = apps.map((x, k) => `<button type="button" class="application-candidate it${k === sel ? ' is-selected' : ''}" data-k="${k}" aria-pressed="${k === sel}" aria-controls="f2-detail">
      ${ui.avatar(x.i)}<span class="application-candidate__body"><strong>${x.n}</strong><span>${x.role}</span><small>${x.lang} · klo ${x.time}${(ctx.S.f2sent || []).includes(x.n) ? ' · Luonnos tallennettu' : ''}</small></span><span class="application-candidate__mark" aria-hidden="true">${k === sel ? icon('check') : ''}</span>
    </button>`).join('');
    const fields = a.sum.map(([label, value], i) => { const n = a.ln[i]; return `<div class="application-field"><dt>${label}</dt><dd>${value}</dd><dd class="application-field__source">${typeof n === 'number' ? src('cv' + n, `Näytä CV:n kohta`) : src('', n)}</dd></div>`; }).join('');
    const detail = `<article class="application-workspace" aria-labelledby="application-name">
      <header class="application-workspace__header"><div><h2 id="application-name" tabindex="-1">${a.n}</h2><p>${a.role} · Saapunut klo ${a.time}</p></div><div class="wf-cluster">${ui.pill('Hakemuksen kieli: ' + a.lang, 'neutral')}${s ? `<a href="#tekijat/${s}">Avaa työntekijäprofiili</a>` : ''}</div></header>
      <div class="application-documents">
        <section class="application-panel application-original" aria-labelledby="application-cv-title">
          <header class="application-panel__header"><h3 id="application-cv-title">Alkuperäinen CV</h3><p>Hakijan tiedot alkuperäisellä kielellä.</p></header>
          <div class="application-original__body cv" lang="${a.lang.toLowerCase()}">${a.cv.split('\n').map((t, i) => `<div class="application-cv-line">${mark('cv' + i, t)}</div>`).join('')}</div>
        </section>
        <section class="application-panel application-summary ai" aria-labelledby="application-summary-title">
          <header class="application-panel__header"><h3 id="application-summary-title">Yhteenveto suomeksi</h3><p>Tarkista osaaminen. Lähdepainike näyttää vastaavan kohdan CV:ssä.</p></header>
          <dl class="application-fields">${fields}</dl>
        </section>
      </div>
      <section class="application-panel application-recommendation" aria-labelledby="application-recommendation-title">
        <header class="application-panel__header"><h3 id="application-recommendation-title">Suositeltu seuraava vaihe</h3></header>
        <div class="application-panel__body">
          <p class="application-recommendation__decision">${a.rec}</p>
          <p class="application-recommendation__reason">${a.good}.</p>
          <div class="application-check${a.ok ? ' application-check--neutral' : ''}"><strong>${a.ok ? 'Huomioi jatkossa' : 'Tarkista ennen aloitusta'}</strong><p>${a.miss}</p></div>
          <div class="application-matches"><h4>Sopivuus avoimiin tehtäviin</h4>${a.match.map(m => m[1] ? progress(m[0], m[1], 'score') : `<p class="growth-muted">${m[0]}. Säilytä hakemus hakijan suostumuksella.</p>`).join('')}</div>
        </div>
      </section>
      <section class="application-panel application-message" aria-labelledby="application-message-title">
        <header class="application-panel__header"><div><h3 id="application-message-title">Viestiluonnos hakijalle</h3><p>Tarkista sisältö ja ehdotettu ajankohta ennen lähettämistä.</p></div>${ui.pill(a.draft.l, 'info')}</header>
        <div class="application-panel__body">
          <div class="application-message__text growth-prewrap">${a.draft.t}</div>
          ${a.draft.fi ? `<div class="application-message__translation"><h4>Suomenkielinen käännös</h4><p>${a.draft.fi.replace(/^Käännös: /, '')}</p></div>` : ''}
          <div class="application-message__actions">${ui.button({label: sent ? 'Luonnos tallennettu' : 'Tallenna viestiluonnos', variant:'primary', attrs:`data-f2-send${sent ? ' disabled' : ''}`})}<span role="status">${sent ? 'Luonnos on tallessa. Viestiä ei ole lähetetty.' : 'Tallennus säilyttää luonnoksen myöhempää käyttöä varten.'}</span></div>
        </div>
      </section>
    </article>`;
    body.innerHTML = `<div class="applications-screen">
      <section class="application-picker" aria-labelledby="application-picker-title"><header><div><h2 id="application-picker-title">Valitse hakija</h2><p>6 hakemusta · 5 kieltä</p></div><span>${(ctx.S.f2sent || []).length} / 6 luonnosta tallennettu</span></header><div id="f2-list" class="application-candidates">${list}</div></section>
      <div id="f2-detail">${ctx.S.f2run ? detail : `<div id="f2-run">${agentCard('Tekoälyavustaja', '6 hakemusta odottaa käsittelyä', 'Saat jokaisesta hakemuksesta suomenkielisen yhteenvedon, sopivat tehtävät ja viestiluonnoksen. Valitse hakija tai käsittele kaikki hakemukset.', F2_RUN, -1, ui.button({label:'Käsittele hakemukset (6)', variant:'primary', size:'md', attrs:'id="f2-go"'}))}</div>`}</div>
    </div>`;
  }
  const F2_RUN = ['Marek Z. (puola): yhteenveto valmis, työturvallisuuskortti tarkistettava', 'Sara N. (ruotsi): yhteenveto valmis, sopiva CNC-koneistajan tehtävään', 'Juha M. (suomi): SFS 6002 -koulutuksen voimassaolo tarkistettava', 'Ioana D. (romania): käännetty, trukkilupa tarkistettava', 'Liam O. (englanti): yhteenveto valmis, työturvallisuuskortti tarkistettava', 'Anna-Leena K. (suomi): ei avointa paikkaa, tekijäpankkiin'];
  D.screens.hakemukset = {
    header: () => ({eyebrow:'Työt', title:'Hakemusten seulonta', subtitle:'Vertaa hakijoiden osaamista tehtäviin ja valmistele yhteydenotto.'}),
    render(body, ctx){
      f2Paint(body, ctx);
      const pick = k => { ctx.S.f2 = k; ctx.S.f2run = 1; ctx.save(); f2Paint(body, ctx); $('#application-name', body).focus({preventScroll:true}); $('#f2-detail', body).scrollIntoView({behavior:'instant', block:'start'}); };
      body.onclick = async e => {
        if(srcHit(body, e)) return;
        const go = e.target.closest('#f2-go');
        if(go){ go.disabled = true; if(!await runAgent($('#f2-run', body), 'Tekoälyavustaja', 'Käsitellään hakemuksia', 'Kuusi hakemusta, viisi kieltä. Jokaisesta yhteenveto suomeksi ja suositus.', F2_RUN)) return; ctx.S.f2run = 1; ctx.save(); return f2Paint(body, ctx); }
        const b = e.target.closest('[data-f2-send]');
        if(b && !b.disabled){ const n = apps[ctx.S.f2 || 0].n; ctx.S.f2sent = Array.from(new Set((ctx.S.f2sent || []).concat(n))); ctx.save(); return f2Paint(body, ctx); }
        const r = e.target.closest('#f2-list .it'); if(r && !e.target.closest('a')) pick(+r.dataset.k);
      };
      body.onkeydown = e => { const r = e.target.closest('#f2-list .it'); if(r && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')){ e.preventDefault(); const next = (+r.dataset.k + (e.key === 'ArrowRight' ? 1 : apps.length - 1)) % apps.length; $(`#f2-list [data-k="${next}"]`, body).focus(); } };
    },
  };

  /* 3 LIIDIT */
  const leads = [
    {n:'Vaasan Akselitekniikka Oy', city:'Vaasa', ind:'Metalliteollisuus', sig:'Hakee itse 4 hitsaajaa, ilmoitus auki 21 päivää', s:92,
     why:[['Työpaikkailmoitus','4 hitsaajaa, julkaistu 20.10. ja yhä auki'],['Uutinen','Uusi tilaus tuulivoimakomponenteista, toimitukset keväällä 2027'],['Tilinpäätös','Liikevaihto kasvoi 2025']], who:'Tuotantopäällikkö tai HR-päällikkö',
     fi:`Hei,\n\nhuomasin, että haette hitsaajia ja ilmoitus on ollut auki jo kolme viikkoa. Meillä Dobrassa on nyt vapaana MAG-pätevyyden omaavia hitsaajia Vaasan alueella, ja kaksi heistä voisi aloittaa jo ensi viikolla.\n\nSopisiko lyhyt puhelu tällä viikolla?\n\nAntti Flander\nDobra Finland`,
     sv:`Hej,\n\njag såg att ni söker svetsare och att annonsen har varit ute i tre veckor. Vi på Dobra har just nu svetsare med MAG-behörighet lediga i Vasaregionen, och två av dem kunde börja redan nästa vecka.\n\nPassar det med ett kort samtal den här veckan?\n\nAntti Flander\nDobra Finland`},
    {n:'Pedersöre Rör & Svets Ab', city:'Pedersöre', ind:'Putkiasennus', sig:'Hallilaajennus 2027, rekrytointi alkaa keväällä', s:88,
     why:[['Uutinen','Rakennuslupa uudelle hallille, valmis 2027'],['Työpaikkailmoitus','2 putkiasentajaa haussa'],['Verkosto','Kaksi Dobran tekijää on tehnyt samaa työtä lähellä']], who:'Toimitusjohtaja',
     fi:`Hei,\n\nonnittelut hallilaajennuksesta. Kun rekrytointi alkaa keväällä, voimme auttaa sekä vakituisten haussa että vuokratyössä kiirehuippuina.\n\nSopisiko, että soitan ensi viikolla?\n\nAntti Flander\nDobra Finland`,
     sv:`Hej,\n\ngrattis till hallutbyggnaden. När rekryteringen börjar i vår kan vi hjälpa till både med fasta anställningar och med inhyrd personal under toppar.\n\nPassar det att jag ringer nästa vecka?\n\nAntti Flander\nDobra Finland`},
    {n:'Kokkolan Prosessihuolto Oy', city:'Kokkola', ind:'Teollisuuspalvelut', sig:'Seisokki maaliskuussa, 20 tekijää 3 viikoksi', s:85,
     why:[['Uutinen','Suurseisokki suunniteltu maaliskuulle 2027'],['Aiempi kausi','Viime keväänä haettiin tekijöitä usealta toimijalta'],['Työpaikkailmoitus','Asentajia ja hitsaajia haussa']], who:'Kunnossapitopäällikkö',
     fi:`Hei,\n\nkuulin, että maaliskuulle on tulossa seisokki. Voimme koota teille valmiin porukan asentajia ja hitsaajia, majoitukset ja paperit hoidettuina.\n\nKatsotaanko tarve yhdessä jo nyt, niin ehdimme varata parhaat tekijät?\n\nAntti Flander\nDobra Finland`,
     sv:`Hej,\n\njag hörde att ni har ett driftstopp i mars. Vi kan sätta ihop ett färdigt team av montörer och svetsare, med boende och papper ordnade.\n\nSka vi titta på behovet redan nu, så hinner vi boka de bästa?\n\nAntti Flander\nDobra Finland`},
    {n:'Seinäjoen Ohutlevy Oy', city:'Seinäjoki', ind:'Ohutlevytyö', sig:'Liikevaihto +22 %, 6 avointa paikkaa', s:81,
     why:[['Tilinpäätös','Liikevaihto kasvoi 22 %'],['Työpaikkailmoitukset','6 avointa paikkaa, mm. särmääjä ja jauhemaalari']], who:'HR-päällikkö',
     fi:`Hei,\n\nteillä on kuusi paikkaa auki yhtä aikaa. Meillä on valmiiksi haastateltuja särmääjiä ja jauhemaalareita Etelä-Pohjanmaalla.\n\nSaisinko lähettää kolme profiilia katsottavaksi?\n\nAntti Flander\nDobra Finland`,
     sv:`Hej,\n\nni har sex lediga tjänster samtidigt. Vi har färdigt intervjuade kantpressoperatörer och pulverlackerare i Södra Österbotten.\n\nFår jag skicka tre profiler till er?\n\nAntti Flander\nDobra Finland`},
    {n:'Jeppo Trä Ab', city:'Uusikaarlepyy', ind:'Puutuoteteollisuus', sig:'Siirtyy kolmeen vuoroon tammikuussa', s:74,
     why:[['Uutinen','Kolmas vuoro alkaa tammikuussa'],['Työpaikkailmoitus','Koneenkäyttäjiä haussa']], who:'Tehtaanjohtaja',
     fi:`Hei,\n\nkolmannen vuoron käynnistys on iso urakka. Voimme hoitaa koneenkäyttäjien haun ja perehdytyksen alun, niin teidän ei tarvitse.\n\nSopisiko puhelu?\n\nAntti Flander\nDobra Finland`,
     sv:`Hej,\n\natt starta ett tredje skift är ett stort jobb. Vi kan sköta rekryteringen av maskinoperatörer och introduktionen, så ni slipper.\n\nPassar det med ett samtal?\n\nAntti Flander\nDobra Finland`},
  ];
  D.leads = leads;
  function f3Paint(body, ctx){
    const st = ctx.S.f3 = ctx.S.f3 && typeof ctx.S.f3 === 'object' ? ctx.S.f3 : {};
    if(!Array.isArray(st.pipe)) st.pipe = [];
    const sel = leads[st.sel] ? st.sel : 0, l = leads[sel], x = LEAD_EXTRA[sel], lang = st.lang === 'sv' ? 'sv' : 'fi';
    const inPipe = st.pipe.includes(l.n) || SALES_OPPORTUNITIES.some(o => CLIENTS.find(c => c.s === o.client)?.n === l.n);
    const table = ui.table({id:'f3-table', cols:[{label:'Yritys'}, {label:'Henkilöstötarve'}, {label:'Sopivuus', num:1}], rows: leads.map((r, k) => ({cls: k === sel ? 'wf-table__row--selected' : '', attrs:`data-k="${k}" tabindex="0"${k === sel ? ' aria-current="true"' : ''}`, cells:[
      `<span class="wf-table__primary">${r.n}</span><span class="wf-table__secondary">${r.city} · ${r.ind}</span>`, `<span class="growth-muted">${r.sig}</span>`, `<span class="score">${r.s}</span>`]}))});
    const checks = list => `<ul class="growth-checks">${list.map(([p, t]) => `<li class="growth-checks__item">${p}<span class="growth-checks__text">${t}</span></li>`).join('')}</ul>`;
    const detail = ui.card({title: l.n, extra: ui.pill(`${l.s} pistettä`, 'info'), body: pad(`
      <p class="growth-muted">${l.city} · ${l.ind}</p>
      <h3 class="brain-subheading">Miksi ottaa yhteyttä nyt</h3>
      ${ui.kv(l.why)}
      ${x ? `<div class="wf-inset growth-stack"><p class="growth-muted">Lähde: ${x.src[0]}, ${x.src[1]}.</p><p class="brain-inbox__excerpt">"${x.src[2]}"</p></div>
      <h3 class="brain-subheading">Miksi yritys sopii Dobralle</h3>
      ${checks(x.fit.map(f => [ui.pill(f[0] === 'ok' ? 'Sopii' : 'Huomio', f[0] === 'ok' ? 'success' : 'warning'), f[1]]))}` : ''}
      ${ui.kv([['Kenelle', l.who]])}
      <h3 class="brain-subheading">Yhteydenottoluonnos</h3>
      <nav class="wf-tabs tabs" aria-label="Viestin kieli"><ul class="wf-tabs__list">${[['fi', 'Suomeksi'], ['sv', 'Ruotsiksi']].map(([k, t]) => `<li class="wf-tabs__item"><button type="button" class="wf-tabs__tab" data-l="${k}"${lang === k ? ' aria-current="true"' : ''}>${t}</button></li>`).join('')}</ul></nav>
      ${draft(l[lang])}
      <div class="wf-cluster">${inPipe ? ui.button({label:'Avaa myyntimahdollisuus', variant:'primary', href:'#myynti', attrs:'id="f3-open"'}) : ui.button({label:'Lisää myyntiputkeen', variant:'primary', attrs:'id="f3-add"'})}${ui.button({label:'Kopioi viesti', attrs:'data-f3-copy'})}</div>`)});
    const prepared = st.pipe.filter(n => leads.some(l => l.n === n));
    const board = ui.card({title:'Myynnin seuranta', body: pad(`<p>Seuraa kaikkia myyntimahdollisuuksia ja seuraavia tehtäviä myynnin näkymässä.</p>${prepared.length ? `<div><h3 class="brain-subheading">Lisäämäsi yritykset</h3><ul>${prepared.map(n => `<li>${D.h(n)}</li>`).join('')}</ul></div>` : ''}<div class="wf-cluster">${ui.button({label:'Avaa myynnin näkymä', href:'#myynti'})}</div>`)});
    body.innerHTML = `<div class="wf-chip-group"><span class="wf-chip wf-chip--static">Pohjanmaa, Keski-Pohjanmaa, Etelä-Pohjanmaa</span><span class="wf-chip wf-chip--static">Metalli, rakennus, teollisuuspalvelut</span><span class="wf-chip wf-chip--static">14 havaintoa tällä viikolla</span></div>
      ${st.run ? `<div class="wf-split">${ui.card({flush:1, title:'Potentiaaliset asiakkaat', meta:`${leads.length} yritystä, sopivimmat ensin`, body: table})}<div id="f3-detail">${detail}</div></div>` : `<div id="f3-run">${agentCard('Tekoälyavustaja', 'Kuka tarvitsee tekijöitä juuri nyt?', 'Tekoäly kokoaa työpaikkailmoituksista ja uutisista yritykset, joilla voi olla henkilöstötarve. Saat perustelut ja yhteydenottoluonnoksen.', F3_RUN, -1, ui.button({label:'Etsi potentiaaliset asiakkaat', variant:'primary', size:'md', attrs:'id="f3-go"'}))}</div>`}
      ${board}`;
  }
  const F3_RUN = ['Vaasan Akselitekniikka: hakee 4 hitsaajaa, ilmoitus auki 21 päivää', 'Pedersöre Rör & Svets: rakennuslupa uudelle hallille', 'Kokkolan Prosessihuolto: seisokki maaliskuussa, 20 tekijää', 'Seinäjoen Ohutlevy: liikevaihto +22 %, 6 paikkaa auki', 'Jeppo Trä: kolmas vuoro alkaa tammikuussa', 'Ensimmäiset viestit kirjoitettu suomeksi ja ruotsiksi'];
  D.screens.liidit = {
    header: () => ({eyebrow:'Työt', title:'Uudet asiakasyritykset', subtitle:'Löydä yritykset, joilla on henkilöstötarve. Tarkista perustelut ja valmistele yhteydenotto.'}),
    render(body, ctx){
      f3Paint(body, ctx);
      const st = () => ctx.S.f3;
      const pick = k => { st().sel = k; ctx.save(); f3Paint(body, ctx); if(innerWidth < 1200) $('#f3-detail', body).scrollIntoView({behavior:'smooth', block:'start'}); };
      body.onclick = async e => {
        const go = e.target.closest('#f3-go');
        if(go){ go.disabled = true; if(!await runAgent($('#f3-run', body), 'Tekoälyavustaja', 'Etsitään potentiaalisia asiakkaita', 'Verrataan tämän viikon havaintoja Dobran toimialoihin ja alueisiin.', F3_RUN)) return; st().run = 1; ctx.save(); return f3Paint(body, ctx); }
        const tab = e.target.closest('#f3-detail .tabs button[data-l]');
        if(tab){ st().lang = tab.dataset.l; ctx.save(); return f3Paint(body, ctx); }
        const add = e.target.closest('#f3-add');
        if(add){ const n = leads[st().sel || 0].n; const exists = SALES_OPPORTUNITIES.some(o => CLIENTS.find(c => c.s === o.client)?.n === n); if(!exists && !st().pipe.includes(n)) st().pipe.push(n); ctx.save(); D.syncSalesLeads?.(); return f3Paint(body, ctx); }
        const cp = e.target.closest('[data-f3-copy]');
        if(cp){ const l = leads[st().sel || 0]; try { await navigator.clipboard.writeText(l[st().lang === 'sv' ? 'sv' : 'fi']); cp.textContent = 'Kopioitu'; } catch(x) { cp.textContent = 'Kopiointi ei onnistunut'; } return; }
        const r = e.target.closest('#f3-table tbody tr'); if(r) pick(+r.dataset.k);
      };
      body.onkeydown = e => { const r = e.target.closest('#f3-table tbody tr'); if(r && e.key === 'Enter') pick(+r.dataset.k); };
    },
  };

  /* 4 TARJOUKSET */
  const cand = (n, txt) => { const s = slugOf(n); return [`<span class="wf-table__primary">${s ? `<a href="#tekijat/${s}">${n}</a>` : n}</span><span class="wf-table__secondary">${txt}</span>`, ui.pill('Vapaa tammikuussa', 'success')]; };
  function f4Quote(st){
    if(!st.draft) return ui.card({title:'Tarjousluonnos', body: pad('<p class="growth-muted">Valitse "Laadi tarjousluonnos". Saat hinnat, ehdot ja sopivat työntekijät samaan näkymään tarkistettavaksi.</p>')});
    return ui.card({title:'Tarjousluonnos', extra: ui.pill('Hinnat tarkistettava', 'warning'), body: pad(`
      <p class="growth-muted">Botnia Mekaniikka Oy · Sanna V. · voimassa 30 päivää</p>
      ${ui.table({cols:[{label:'Tehtävä'}, {label:'Määrä', num:1}, {label:'Alkaa'}, {label:'Kesto'}, {label:'€/h', num:1}], rows:[
        ['CNC-koneistaja, kaksivuorotyö', String(BOTNIA_QUOTE.cncCount), '4.1.2027', `${BOTNIA_QUOTE.months} kk`, {cls:'price', html:BOTNIA_QUOTE.cncRate.toLocaleString('fi-FI',{minimumFractionDigits:2})}],
        ['Särmääjä, kaksivuorotyö', String(BOTNIA_QUOTE.pressCount), '4.1.2027', `${BOTNIA_QUOTE.months} kk`, {cls:'price', html:BOTNIA_QUOTE.pressRate.toLocaleString('fi-FI',{minimumFractionDigits:2})}]],
        foot:[{cells:[{attrs:'colspan="5"', html:'<span class="growth-muted">Iltavuorolisä laskutetaan työehtosopimuksen mukaan</span>'}]}]})}
      <div class="wf-inset"><p><strong>Arvioitu tilausarvo: ${((BOTNIA_QUOTE.cncCount * BOTNIA_QUOTE.cncRate + BOTNIA_QUOTE.pressCount * BOTNIA_QUOTE.pressRate) * BOTNIA_QUOTE.hoursPerMonth * BOTNIA_QUOTE.months).toLocaleString('fi-FI')} € (alv 0 %)</strong></p><p class="growth-muted">Laskentaoletus: ${BOTNIA_QUOTE.hoursPerMonth} tuntia tekijää kohden kuukaudessa, ${BOTNIA_QUOTE.months} kuukautta. Vuorolisät ja erikseen sovittavat kulut eivät sisälly arvioon. Varmista toteutuva työmäärä asiakkaan kanssa.</p></div>
      <h3 class="brain-subheading">Hintaan sisältyy</h3>
      <div class="wf-cluster">${['Haku ja haastattelut', 'Palkanmaksu ja sivukulut', 'Työterveys ja vakuutukset', 'Työsuhdeasiakirjat ja luvat', 'Majoitus erikseen sovittaessa'].map(t => ui.pill(t, 'neutral')).join('')}</div>
      <p><strong>Mahdollinen vakituinen työsuhde:</strong> sovi rekrytoinnin ehdot asiakkaan kanssa ennen tarjouksen lähettämistä.</p>
      <h3 class="brain-subheading">Ehdotetut työntekijät</h3>
      ${ui.table({cols:[{label:'Ehdokas'}, {label:'Saatavuus'}], rows:[cand('Sara N.', 'CNC, 3 v, ruotsi ja suomi'), cand('Daniel R.', 'CNC, 7 v, englanti'), cand('Ville T.', 'Särmäys, 4 v')]})}
      <div class="wf-cluster">${ui.button({label: st.sent ? 'Luonnos valmis tarkistettavaksi' : 'Merkitse valmiiksi tarkistettavaksi', variant:'primary', attrs:`id="f4-ok"${st.sent ? ' disabled' : ''}`})}</div>
      <div id="f4-done">${st.sent ? `<div class="growth-stack"><div class="growth-kpis saved"><div class="wf-kpi"><p class="wf-kpi__label">Pyynnöstä luonnokseen</p><p class="wf-kpi__value">2 min</p><p class="wf-kpi__footnote wf-kpi__footnote--neutral">arvio</p></div></div>${ui.notice({tone:'success', text:'Tarjousluonnos on tallennettu. Antti tarkistaa hinnat, ehdot ja saatavuuden ennen lähettämistä asiakkaalle.'})}</div>` : ''}</div>`)});
  }
  function f4Paint(body, ctx){
    const st = ctx.S.f4 = ctx.S.f4 && typeof ctx.S.f4 === 'object' ? ctx.S.f4 : {};
    body.innerHTML = `${steps(['Asiakkaan tarve', 'Tarjousluonnos', 'Valmis tarkistettavaksi'], st.sent ? 2 : st.draft ? 1 : 0)}
      <div class="wf-split">
        ${mail('Lomake: Pyydä ilmainen tarjous', 'ti 10.11. klo 8.15', 'Botnia Mekaniikka Oy, Pietarsaari', 'Yhteyshenkilö: Sanna V., HR-päällikkö\n\nTarve: Tarvitsemme 2 CNC-koneistajaa ja 1 särmääjän tammikuun alusta, noin 6 kk. Hyville tekijöille voisi löytyä vakituinen paikka.\n\nMuuta: Kaksivuorotyö. Yksi koneistaja saa olla englanninkielinen.')}
        ${ui.card({title:'Ehdotus työntekijöistä', body: pad(`${ui.kv([['CNC-koneistajat','Sara N. ja Daniel R.'], ['Särmääjä','Ville T.'], ['Kielitaito','Sara: ruotsi, suomi ja englanti. Daniel: englanti.'], ['Ennen vahvistusta','Tarkista saatavuus 4.1.2027 alkaen.']])}
          <div class="wf-cluster">${ui.button({label:'Laadi tarjousluonnos', variant:'primary', size:'md', attrs:`id="f4-go"${st.draft ? ' disabled' : ''}`})}</div>`)})}
      </div>
      <div id="f4-quote">${f4Quote(st)}</div>`;
  }
  D.screens.tarjoukset = {
    header: () => ({eyebrow:'Työt', title:'Tarjouspyynnöt', subtitle:'Kokoa asiakkaan tarpeesta tarjous. Tarkista hinnat, ehdot ja työntekijät ennen lähettämistä.'}),
    render(body, ctx){
      f4Paint(body, ctx);
      body.onclick = async e => {
        const t = e.target.closest('#f4-go,#f4-ok'); if(!t || t.disabled) return;
        if(t.id === 'f4-go'){
          t.disabled = true;
          $('#f4-quote', body).innerHTML = ui.card({title:'Tarjousluonnos', meta:'kootaan', body: pad('<p class="growth-muted">Kootaan tarjousta hinnastosta, sopimuspohjasta ja tekijäpankista</p>')});
          await wait(1200); if(!live(t)) return;
          ctx.S.f4.draft = 1; ctx.save(); f4Paint(body, ctx);
          $('#f4-quote', body).scrollIntoView({behavior:'smooth', block:'start'});
        } else {
          ctx.S.f4.sent = 1; ctx.save(); f4Paint(body, ctx);
          $('#f4-done', body).scrollIntoView({behavior:'smooth', block:'center'});
        }
      };
    },
  };
})();
