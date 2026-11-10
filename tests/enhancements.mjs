import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.DEMO_URL || 'http://127.0.0.1:8793/';
const goto=async route=>{await page.goto(base+'#'+route);await page.locator(`section[data-route="${route.split(/[/?]/)[0]}"]:not([hidden]) h1`).waitFor();};
const step=async n=>{await page.locator('#tour-step').selectOption(String(n));await page.waitForFunction(n=>document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')===String(n+1),n);};
try {
 await goto('tanaan');await page.locator('[data-tour-start]').click();
 assert.equal(await page.locator('#tour-step').inputValue(),'0');
 await step(4);await page.locator('[data-tour-open]').click();
 await page.locator('.tour-guide.is-compact').waitFor();
 await page.keyboard.press('Escape');assert.equal(await page.locator('.tour-guide').count(),0);
 await page.locator('[data-tour-start]').click();assert.equal(await page.locator('#tour-step').inputValue(),'4');
 await page.reload();assert.equal(await page.locator('#tour-step').inputValue(),'4');
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:950});
  for(let i=0;i<13;i++){
   await step(i);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`tour ${i+1} at ${width}`);
   const title=await page.locator('#tour-title').innerText();assert.ok(title.length>5);
  }
 }
 await page.getByRole('button',{name:'Päätä kierros',exact:true}).click();
 await page.setViewportSize({width:1440,height:1000});await goto('hakemukset');
 await page.locator('.application-candidate').first().click();
 assert.equal(await page.locator('.application-field').count(),5);
 await page.locator('.application-fields button.dobra-srcchip').first().click();
 assert.ok(await page.locator('.dobra-src.is-hit').count());
 await page.locator('[data-f2-send]').click();await page.reload();
 assert.match(await page.locator('.application-picker').innerText(),/1 \/ 6/);
 for(let i=0;i<6;i++){await page.locator('.application-candidate').nth(i).click();assert.equal(await page.locator('.application-documents').count(),1);}
 await goto('myynti');
 assert.equal(await page.locator('#sales-table tbody tr').count(),13);
 const count6=await page.locator('.sales-stat').nth(2).innerText();
 await page.getByRole('link',{name:'3 kk',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.sales-stat:last-child')?.textContent.includes('3 kuukautta'));
 assert.notEqual(await page.locator('.sales-stat').nth(2).innerText(),count6);
 await page.locator('.sales-pipeline-row').nth(2).click();
 await page.waitForFunction(()=>document.querySelectorAll('#sales-table tbody tr').length===4);
 await page.locator('#sales-table a').first().click();await page.locator('[data-route="asiakkaat"]:not([hidden]) h1').waitFor();
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['myynti','asiakkaat','asiakkaat/wartsila','hakemukset']){
   await goto(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} at ${width}`);
  }
 }
 await page.setViewportSize({width:1440,height:1080});await goto('myynti');await page.screenshot({path:'/tmp/dobra-sales-integrated.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/dobra-sales-mobile-integrated.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await goto('liidit');
 await page.evaluate(()=>{DOBRA.S.f3={run:1,pipe:[],sel:1};DOBRA.save();DOBRA.rerender();});
 await page.locator('#f3-add').click();
 const added=await page.evaluate(()=>({deals:SALES_OPPORTUNITIES.length,companies:CLIENTS.length}));
 assert.equal(added.deals,14);assert.equal(added.companies,21);
 await goto('myynti');assert.equal(await page.locator('#sales-table tbody tr').count(),14);
 await page.reload();assert.equal(await page.locator('#sales-table tbody tr').count(),14);
 await goto('tarjoukset');await page.evaluate(()=>{DOBRA.S.f4={draft:1};DOBRA.save();DOBRA.rerender();});
 assert.match(await page.locator('#f4-quote').innerText(),/108\s*000/);
 assert.equal(await page.evaluate(()=>SALES_OPPORTUNITIES.find(o=>o.client==='botnia-mekaniikka').value),108000);
 assert.deepEqual(errors,[]);console.log('PASS: tour13 steps x4 widths, resume, collapse, application sources/saving, sales filters/ranges/links, integrated responsive views.');
} finally {await browser.close();}
