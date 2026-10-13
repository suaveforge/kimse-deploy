/* KIMSE R&D Global Atlas browser integration: deterministic locally served D3/topology assets. */
'use strict';
const { chromium }=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8765/evidence/rd.html';
const root=path.resolve(__dirname,'../..');
const mod=f=>path.join(root,'node_modules',f);
const out=path.join(root,'evidence','test-results');
const verifiedRouteCount=JSON.parse(fs.readFileSync(path.join(root,'evidence','rd-world-map-data.json'),'utf8')).routeReview20261013.verifiedFirstEnquiryUnsent;
fs.mkdirSync(out,{recursive:true});

async function run(){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const viewport of [{width:1440,height:900,name:'desktop'},{width:390,height:844,name:'mobile'}]){
      const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      await page.route('**/*',route=>{
        const u=route.request().url();
        const provide=(file,ct='application/javascript')=>route.fulfill({status:200,contentType:ct,body:fs.readFileSync(mod(file))});
        if(u.includes('d3@7.9.0/dist/d3.min.js'))return provide('d3/dist/d3.min.js');
        if(u.includes('topojson-client@3.1.0/dist/topojson-client.min.js'))return provide('topojson-client/dist/topojson-client.min.js');
        if(u.includes('world-atlas@2/countries-50m.json'))return provide('world-atlas/countries-50m.json','application/json');
        if(u.includes('world-atlas@2/countries-110m.json'))return provide('world-atlas/countries-110m.json','application/json');
        if(u.includes('@tabler/core@1.5.1/dist/css/tabler.min.css'))return provide('@tabler/core/dist/css/tabler.min.css','text/css');
        if(u.includes('@tabler/core@1.5.1/dist/js/tabler.min.js'))return provide('@tabler/core/dist/js/tabler.min.js');
        if(u.startsWith('https://'))return route.abort('blockedbyclient');
        return route.continue();
      });
      const resp=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(resp.status(),200);
      await page.waitForFunction(()=>document.querySelectorAll('path.kimse-atlas-country').length>=150,{timeout:20000});
      const countries=await page.locator('path.kimse-atlas-country').count();
      assert.ok(countries>=150,'actual SVG country borders should render, got '+countries);
      assert.equal(await page.locator('#kimse-atlas-country-select option').count(),250);
      assert.equal(await page.locator('.kimse-atlas-institution').count(),39,'UK first-selected records');
      assert.match(await page.locator('#kimse-atlas-stats').innerText(),/249/);
      // Institution stage table: every record and official sending/receipt phase must be visible and filterable.
      assert.equal(await page.locator('#kimse-progress-rows tr').count(),92,'all 92 institutions appear by default');
      assert.equal(await page.locator('.kimse-progress-number').count(),3,'three numeric phase filters');
      assert.equal(await page.locator('#kimse-progress-rows .kimse-progress-bignum').count(),92,'numeric phase beside each institution');
      await page.selectOption('#kimse-progress-phase','1');
      assert.equal(await page.locator('#kimse-progress-rows tr').count(),30,'stage one institution count');
      await page.selectOption('#kimse-progress-phase','2');
      assert.equal(await page.locator('#kimse-progress-rows tr').count(),1,'stage two institution count');
      await page.selectOption('#kimse-progress-phase','0');
      assert.equal(await page.locator('#kimse-progress-rows tr').count(),61,'stage zero institution count');
      await page.selectOption('#kimse-progress-phase','');
      assert.match(await page.locator('#kimse-progress-total').innerText(),/92 \/ 92/,'institution table total');
      await page.selectOption('#kimse-progress-stage','FIRST_CONTACT_ROUTE_VERIFIED_UNSENT');
      assert.equal(await page.locator('#kimse-progress-rows tr').count(),verifiedRouteCount,'ready-for-review unsent official routes must match public data');
      assert.equal(await page.locator('#kimse-progress-rows a[href^="https://"]').count(),verifiedRouteCount,'all confirmed initial-enquiry channels link official institutions');
      assert.match(await page.locator('#kimse-progress-rows').innerText(),/0단계/,'route verified institutions remain P0');
      await page.selectOption('#kimse-progress-stage','FORMAL_FOI_REGISTERED');
      assert.equal(await page.locator('#kimse-progress-rows tr').count(),15,'fifteen formal FOI registrations');
      await page.selectOption('#kimse-progress-stage','FOI_FORM_APPROVED_NOT_SUBMITTED');
      assert.equal(await page.locator('#kimse-progress-rows tr').count(),4,'approved but unsubmitted forms');
      assert.equal(await page.locator('#kimse-progress-rows a[href^="https://"]').count(),4,'all unsubmitted forms link official portals');
      await page.selectOption('#kimse-progress-stage','RESEARCH_METHODS_RESPONSE_RECEIVED');
      assert.equal(await page.locator('#kimse-progress-rows tr').count(),1,'methodology-only research reply');
      await page.selectOption('#kimse-progress-stage','');
      await page.selectOption('#kimse-progress-country','826');
      assert.equal(await page.locator('#kimse-progress-rows tr').count(),39,'UK progress table country filter');
      await page.selectOption('#kimse-progress-country','');

      await page.selectOption('#kimse-atlas-country-select','840');
      await page.waitForTimeout(750);
      assert.equal(await page.locator('.kimse-atlas-institution').count(),10,'USA 10 institutions');
      await page.locator('#kimse-atlas-search').fill('Merck');
      assert.equal(await page.locator('.kimse-atlas-institution').count(),1,'Merck search');
      assert.match(await page.locator('#kimse-atlas-institutions').innerText(),/Merck/);
      await page.locator('#kimse-atlas-search').fill('');
      await page.selectOption('#kimse-atlas-country-select','392');
      await page.waitForTimeout(750);
      assert.equal(await page.locator('.kimse-atlas-institution').count(),5,'Japan 5 institutions');
      assert.equal(await page.locator('path.kimse-atlas-country[data-selected=true]').count(),1,'selected country highlighted');
      await page.selectOption('#kimse-atlas-country-select','020');
      assert.match(await page.locator('.kimse-atlas-empty').first().innerText(),/검토 예정/);
      await page.selectOption('#kimse-atlas-country-select','826');
      await page.waitForTimeout(750);
      assert.equal(await page.locator('.kimse-atlas-institution').count(),39);
      if(viewport.name==='mobile'){
        const metrics=await page.evaluate(()=>({vw:window.innerWidth,scrollW:document.documentElement.scrollWidth,
          atlasW:document.querySelector('.kimse-atlas-wrap').getBoundingClientRect().width,
          gridCols:getComputedStyle(document.querySelector('.kimse-atlas-grid')).gridTemplateColumns.split(' ').length,
          mapScrollable:document.getElementById('kimse-atlas-viewport').scrollWidth>document.getElementById('kimse-atlas-viewport').clientWidth
        }));
        if(metrics.scrollW>metrics.vw+12){
          const culprits=await page.evaluate(()=>{
            const vw=window.innerWidth;
            return [...document.querySelectorAll('body *')].map(el=>{const box=el.getBoundingClientRect(),cs=getComputedStyle(el);return {tag:el.tagName,id:el.id,cls:typeof el.className==='string'?el.className.slice(0,100):'',right:Math.round(box.right),left:Math.round(box.left),width:Math.round(box.width),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:cs.overflowX,display:cs.display};}).filter(x=>x.right>vw+15&&x.width>0&&x.display!=='none').slice(0,28);
          });
          console.error('MOBILE_OVERFLOW_ELEMENTS',JSON.stringify(culprits));
        }
        assert.ok(metrics.scrollW<=metrics.vw+12,'unexpected body horizontal overflow '+JSON.stringify(metrics));
        assert.equal(metrics.gridCols,1,'mobile map/sidebar should stack');
        assert.ok(metrics.mapScrollable,'mobile map viewport must scroll internally');
      }
      assert.deepEqual(errors,[],'JS uncaught exceptions');
      await page.screenshot({path:path.join(out,'atlas-'+viewport.name+'.png'),fullPage:true});
      console.log('PASS '+viewport.name+': '+countries+' SVG countries; 249 regions; USA/Japan/UK selection + search; screenshot captured');
      await context.close();
    }
  } finally {await browser.close();}
}
run().catch(err=>{console.error(err);process.exitCode=1;});
