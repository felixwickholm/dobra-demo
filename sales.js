/* Myynnin näkymä. Summat lasketaan data.js:n mahdollisuuksista ja tilauksista. */
(function(){
  'use strict';
  const D = window.DOBRA;
  if(!D || !D.screens) return;
  D.syncSalesLeads = function(){
    const names = Array.isArray(D.S.f3?.pipe) ? D.S.f3.pipe : [];
    for(const name of names){
      const lead = (D.leads || []).find(l=>l.n===name); if(!lead) continue;
      let client = CLIENTS.find(c=>c.n===lead.n);
      if(!client){
        const slug = lead.n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
        client = {s:slug,n:lead.n,city:lead.city,ind:lead.ind,st:'Prospekti',since:null,who:'Ei nimettyä yhteyshenkilöä',last:['—','Yhteydenottoluonnos tallennettu'],ytd:[0,0,'0'],placed:[],open:[],notes:['Tarkista yhteydenottoluonnos ennen lähettämistä.']};
        CLIENTS.push(client);
      }
      const existing = SALES_OPPORTUNITIES.find(o=>o.client===client.s);
      if(existing){ existing.next='Tarkista yhteydenottoluonnos'; existing.due=DEMO_TODAY; }
      else SALES_OPPORTUNITIES.push({client:client.s,stage:'need',value:0,title:lead.sig,next:'Tarkista yhteydenottoluonnos',due:DEMO_TODAY});
    }
  };
  D.syncSalesLeads();
  const STAGES = [
    {id:'new', label:'Kohdeyritykset', short:'Kohdeyritys', color:'#2676bb'},
    {id:'need', label:'Tarve kartoituksessa', short:'Kartoitus', color:'#a87814'},
    {id:'offer', label:'Tarjous valmistelussa', short:'Tarjous', color:'#be5836'},
    {id:'decision', label:'Päätöstä odottavat', short:'Päätös', color:'#24775d'},
  ];
  const MONTHS = [6,7,8,9,10,11];
  const MONTH_NAMES = ['Kesä','Heinä','Elo','Syys','Loka','Marras'];
  const money = n => `${new Intl.NumberFormat('fi-FI', {maximumFractionDigits:0}).format(n)} €`;
  const sum = items => items.reduce((n, item) => n + item.value, 0);
  const company = slug => CLIENTS.find(c => c.s === slug);
  const companyLink = item => `<a href="#asiakkaat/${item.client}">${D.h(company(item.client)?.n || item.client)}</a>`;
  const stageData = () => STAGES.map(stage => ({...stage, items:SALES_OPPORTUNITIES.filter(o => o.stage === stage.id)}));
  const qs = (params, key, value) => {const p = new URLSearchParams(params); if(value) p.set(key,value); else p.delete(key); return '#myynti' + (p.toString() ? '?' + p.toString() : '');};
  const stageTag = stage => `<span class="sales-stage" style="--stage-color:${stage.color}"><i aria-hidden="true"></i>${stage.short}</span>`;
  const monthData = range => MONTHS.slice(-range).map(month => ({month, label:MONTH_NAMES[MONTHS.indexOf(month)], orders:SALES_ORDERS.filter(o => Number(o.date.slice(5,7)) === month)}));

  function pipeline(params){
    const stages = stageData(), max = Math.max(...stages.map(s => sum(s.items)),1);
    return `<div class="sales-pipeline" aria-label="Myyntimahdollisuuksien arvo vaiheittain">${stages.map(s => `<a class="sales-pipeline-row" href="${qs(params,'vaihe',s.id)}"${params.get('vaihe') === s.id ? ' aria-current="true"' : ''} style="--stage-color:${s.color}">
      <span class="sales-pipeline-row__label">${s.label}<small>${s.items.length} mahdollisuutta</small></span>
      <span class="sales-bar-track" aria-hidden="true"><span style="width:${sum(s.items)/max*100}%"></span></span>
      <strong>${money(sum(s.items))}</strong>
    </a>`).join('')}</div>`;
  }
  function trend(range){
    const data = monthData(range), max = Math.ceil(Math.max(...data.map(m=>sum(m.orders)),1)/20000)*20000;
    const w = 640, height = 225, left = 78, right = 20, top = 18, bottom = 40;
    const x = i => left+i*(w-left-right)/(data.length-1), y = value => height-bottom-(value/max)*(height-top-bottom);
    const points = data.map((m,i)=>`${x(i)},${y(sum(m.orders))}`).join(' ');
    const chartId = `sales-trend-${range}`;
    return `<div class="sales-trend-wrap"><svg class="sales-trend" viewBox="0 0 ${w} ${height}" role="img" aria-labelledby="${chartId}-title ${chartId}-desc">
      <title id="${chartId}-title">Tilausarvo kuukausittain</title><desc id="${chartId}-desc">${data.map(m=>`${m.label}kuu: ${money(sum(m.orders))}`).join('. ')}. Marraskuu on kesken, tiedot 10.11. asti.</desc>
      ${[0,.5,1].map(r=>`<line class="sales-chart-grid" x1="${left}" x2="${w-right}" y1="${y(max*r)}" y2="${y(max*r)}"/><text class="sales-axis" x="${left-10}" y="${y(max*r)+4}" text-anchor="end">${max*r/1000} t€</text>`).join('')}
      <polygon points="${left},${y(0)} ${points} ${x(data.length-1)},${y(0)}" fill="#2676bb" fill-opacity=".08"/>
      <polyline points="${points}" fill="none" stroke="#2676bb" stroke-width="3" stroke-linejoin="round"/>
      ${data.map((m,i)=>`<circle cx="${x(i)}" cy="${y(sum(m.orders))}" r="4.5" fill="#2676bb" stroke="white" stroke-width="2"><title>${m.label}: ${money(sum(m.orders))}</title></circle><text class="sales-axis" x="${x(i)}" y="${height-14}" text-anchor="${i===0?'start':i===data.length-1?'end':'middle'}">${m.label}${m.month===11?'*':''}</text>`).join('')}
    </svg></div><p class="sales-chart-caption">* Marraskuu 1.–10.11. Tilausarvo ei ole sama kuin laskutus.</p>
    <details class="sales-chart-data"><summary>Näytä luvut taulukkona</summary><table><caption>Tilausarvo, alv 0 %</caption><thead><tr><th>Kuukausi</th><th>Tilauksia</th><th>Arvo</th></tr></thead><tbody>${data.map(m=>`<tr><td>${m.label}kuu${m.month===11?' (1.–10.11.)':''}</td><td>${m.orders.length}</td><td>${money(sum(m.orders))}</td></tr>`).join('')}</tbody></table></details>`;
  }
  function opportunities(params){
    const current = params.get('vaihe'), list = SALES_OPPORTUNITIES.filter(o=>!current || o.stage===current);
    const tabs = `<nav class="sales-stage-filters" aria-label="Myynnin vaihe"><a href="${qs(params,'vaihe','')}"${!current?' aria-current="page"':''}>Kaikki <span>${SALES_OPPORTUNITIES.length}</span></a>${stageData().map(s=>`<a href="${qs(params,'vaihe',s.id)}"${current===s.id?' aria-current="page"':''} style="--stage-color:${s.color}"><i aria-hidden="true"></i>${s.short} <span>${s.items.length}</span></a>`).join('')}</nav>`;
    const rows = list.map(o => {const stage=STAGES.find(s=>s.id===o.stage);return [
      `<span class="wf-table__primary">${companyLink(o)}</span><span class="wf-table__secondary">${D.h(o.title)}</span>`,
      stageTag(stage), {cls:'wf-table__num',html:(o.value ? money(o.value) : '<span class="growth-muted">Arvo arvioimatta</span>')+(o.assumption ? `<span class="wf-table__secondary">${D.h(o.assumption)}</span>` : '')},
      `<span>${D.h(o.next)}</span><span class="wf-table__secondary">${D.fd(o.due)}</span>`,
    ];});
    return `<section class="wf-card sales-opportunities"><header class="wf-card__header"><div><h2 class="wf-card__title">Myyntimahdollisuudet</h2><p class="sales-card-sub">${list.length} mahdollisuutta · ${money(sum(list))}</p></div></header>${tabs}${list.length ? D.ui.table({id:'sales-table',cols:[{label:'Yritys ja tarve'},{label:'Vaihe'},{label:'Arvioitu arvo',num:1},{label:'Seuraava askel'}],rows}) : '<div class="growth-card-pad">Ei mahdollisuuksia tässä vaiheessa. Valitse toinen vaihe.</div>'}</section>`;
  }
  function nextActions(){
    const items = SALES_OPPORTUNITIES.filter(o=>D.days(o.due)<=3).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,5);
    if(!items.length) return '<p class="growth-card-pad growth-muted">Ei tehtäviä seuraaville päiville.</p>';
    return `<ol class="sales-actions">${items.map((o,i)=>`<li><span class="sales-action-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div><strong>${companyLink(o)}</strong><p>${D.h(o.next)}</p></div><span class="sales-due${D.days(o.due)<=0?' is-today':''}">${D.days(o.due)<=0?'Tänään':D.fds(o.due)}</span></li>`).join('')}</ol>`;
  }
  D.salesSummary = function(){
    D.syncSalesLeads();
    const offers = SALES_OPPORTUNITIES.filter(o=>o.stage==='offer'), decisions=SALES_OPPORTUNITIES.filter(o=>o.stage==='decision');
    const stages = stageData(), total=sum(SALES_OPPORTUNITIES);
    return `<section class="wf-card sales-home"><div class="sales-home__intro"><p class="sales-eyebrow">Myynnin tilanne</p><h2>${money(total)} <span>myyntimahdollisuuksia</span></h2><p>${offers.length} tarjousta valmistelussa. ${decisions.length} mahdollisuutta odottaa päätöstä.</p><a class="wf-button wf-button--secondary" href="#myynti">Avaa myynnin näkymä <span aria-hidden="true">→</span></a></div><div class="sales-home__chart"><div class="sales-segmented" role="img" aria-label="${stages.map(s=>`${s.label}: ${money(sum(s.items))}`).join('. ')}">${stages.map(s=>`<span style="width:${sum(s.items)/Math.max(total,1)*100}%;background:${s.color}"></span>`).join('')}</div><ul class="sales-mini-legend">${stages.map(s=>`<li><span><i style="background:${s.color}" aria-hidden="true"></i>${s.short}</span><strong>${money(sum(s.items))}</strong></li>`).join('')}</ul></div></section>`;
  };
  D.screens.myynti = {
    header(){return {eyebrow:'Myynti',title:'Seuraava kauppa alkaa tästä',subtitle:'Näe mahdollisuudet, seuraavat yhteydenotot ja tilausarvon kehitys yhdellä silmäyksellä.'};},
    render(body,ctx){
      D.syncSalesLeads();
      const range = ctx.params.get('jakso')==='3' ? 3 : 6, orders=monthData(range).flatMap(m=>m.orders), offers=SALES_OPPORTUNITIES.filter(o=>o.stage==='offer');
      body.innerHTML = `<div class="sales-dashboard">
        <div class="sales-overview">${[
          ['Myyntiputken arvo',money(sum(SALES_OPPORTUNITIES)),`${SALES_OPPORTUNITIES.length} mahdollisuutta`,'blue'],
          ['Tarjoukset valmistelussa',money(sum(offers)),`${offers.length} tarjousta`,'orange'],
          ['Tilausarvo yhteensä',money(sum(orders)),`${range} kuukautta · ${orders.length} tilausta`,'green'],
        ].map(([label,value,foot,color])=>`<div class="sales-stat sales-stat--${color}"><p>${label}</p><strong>${value}</strong><small>${foot}</small></div>`).join('')}</div>
        <div class="sales-chart-grid-layout"><section class="wf-card"><header class="wf-card__header"><div><h2 class="wf-card__title">Missä vaiheessa kaupat ovat?</h2><p class="sales-card-sub">Valitse vaihe nähdäksesi sen mahdollisuudet.</p></div></header>${pipeline(ctx.params)}</section>
        <section class="wf-card"><header class="wf-card__header"><div><h2 class="wf-card__title">Tilausarvon kehitys</h2><p class="sales-card-sub">Sovittujen tilausten arvo kuukausittain</p></div><nav class="sales-range" aria-label="Kaavion aikajakso">${[3,6].map(n=>`<a href="${qs(ctx.params,'jakso',String(n))}"${range===n?' aria-current="page"':''}>${n} kk</a>`).join('')}</nav></header>${trend(range)}</section></div>
        <div class="sales-work-grid">${opportunities(ctx.params)}<section class="wf-card sales-next"><header class="wf-card__header"><div><h2 class="wf-card__title">Tee nämä seuraavaksi</h2><p class="sales-card-sub">Lähimmät tehtävät ensin</p></div></header>${nextActions()}<a class="sales-all-clients" href="#asiakkaat">Kaikki ${CLIENTS.length} yritystä asiakasrekisterissä <span aria-hidden="true">→</span></a></section></div>
        <p class="sales-sample-note">Mahdollisuudet ja euroarvot havainnollistavat myynnin seurantaa. Arvot alv 0 %. Kohdeyritykset eivät tarkoita olemassa olevaa asiakkuutta.</p>
      </div>`;
    },
  };
})();
