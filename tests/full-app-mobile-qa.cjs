'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kh-preview/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='qa-artifacts/ux-mobile';fs.mkdirSync(out,{recursive:true});
const sizes=[{w:320,h:720,mode:'normal'},{w:375,h:812,mode:'normal'},{w:430,h:860,mode:'normal'},{w:1440,h:900,mode:'normal'},{w:375,h:812,mode:'large'},{w:375,h:812,mode:'contrast'}];
const critical=['home','collection-status','monitoring-status','baseline','health','training','medication','settings','report'];
const routes='demo-capture start role auth onboarding-profile initial-check voice-check initial-result cognitive-recheck cognitive-recheck-result consent evidence-proof research-engine baseline brain-map monitoring-status collection-status brain-trends account switch home assessment-start assessment result training training-play medication medication-add health health-detail caregiver-home family-feedback care-schedule family family-add family-call call-room clinical-handoff medical-records clinical-context-event medical-record-add professional-outcome report emergency alert-add market market-detail partnership plan accessibility admin-partners settings'.split(' ');
const mkState=mode=>({version:14,account:{name:'김노인',email:'preview@example.invalid'},intent:'both',self:true,care:true,mode:'self',
 onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
 initial:{step:5,completedAt:'2026-10-01T12:00:00Z',answers:{},voiceSamples:[]},
 baseline:{startedAt:new Date(Date.now()-1.73*86400000).toISOString()},caregivers:[],
 consents:{service:true,privacy:true,health:true,caregiverShare:false,location:true,motion:true,usage:true,microphone:true},
 permissions:{location:'granted',motion:'available'},
 a11y:{largeText:mode==='large',highContrast:mode==='contrast',largeTouchTargets:mode!=='normal'}});
(async()=>{
 const browser=await chromium.launch({headless:true}),results=[],problems=[];
 try{
  for(const sc of sizes){
   const page=await browser.newPage({viewport:{width:sc.w,height:sc.h},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.addInitScript(state=>localStorage.setItem('kimse.p0.state',JSON.stringify(state)),mkState(sc.mode));
   for(const route of critical){
    await page.goto('http://127.0.0.1:4173/#/'+route,{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('.screen-'+route).waitFor({timeout:15000});
    await page.waitForTimeout(140);
    const m=await page.evaluate(()=>{
     const q=s=>document.querySelector(s),box=s=>q(s)?.getBoundingClientRect();
     return {doc:document.documentElement.scrollWidth,w:innerWidth,h:innerHeight,
      tiles:[...document.querySelectorAll('.kimse-collection-tile')].map(x=>({label:x.querySelector('.kimse-collection-label strong')?.textContent,value:x.querySelector('b')?.textContent})),
      lastTile:box('.kimse-collection-tile:last-child')?.bottom,actionsBottom:box('.kimse-collection-actions')?.bottom,
      icons:[...document.querySelectorAll('.screen-home .kh2-action .icon')].map(x=>x.textContent),
      nav:document.querySelectorAll('.bottom-nav .nav-item').length,
      note:q('.monitoring-stable-note')?.textContent,pending:q('.kimse-monitoring-insufficient')?.textContent,decorativeJourney:!!q('.monitoring-journey'),baseline:q('.screen-baseline h1')?.textContent,
      details:q('.kimse-collection-more')?.open
     };
    });
    const key=route+'-'+sc.w+'-'+sc.mode;
    await page.screenshot({path:out+'/'+key+'.png',fullPage:false,animations:'disabled'});
    assert(m.doc<=m.w+2,'overflow '+key);
    if(route==='collection-status'){
     assert.equal(m.tiles.length,6,'six real signal groups '+key);
     assert.equal(m.details,false,'collapsed detail default '+key);
     if(sc.w<=375&&sc.mode==='normal'){
      assert(m.lastTile<=m.h,'all six cards visible '+key+' '+JSON.stringify(m));
      assert(m.actionsBottom<=m.h,'action visible '+key+' '+JSON.stringify(m));
     }
     await page.locator('.kimse-collection-more summary').click();
     assert(await page.locator('.kimse-collection-more').evaluate(e=>e.open),'details expand '+key);
    }
    if(route==='monitoring-status'){assert(String(m.pending||'').includes('자료 수집 중'),'no-data screen must display pending evidence');assert.equal(m.decorativeJourney,false,'no fabricated decorative comparison before sufficient data');assert(!String(m.note||'').includes('큰 변화가 확인되지 않았습니다'),'no unsupported stable result');}
    if(route==='baseline')assert(String(m.baseline).includes('14일 관찰'),'elapsed time label');
    if(route==='home'){assert.deepEqual(m.icons,['🧠','🧩','💊','💚']);assert.equal(m.nav,5);}
    assert.equal(errors.filter(e=>!e.includes('require is not defined')).length,0,'unexpected errors '+key+' '+errors);
    results.push({key,...m});
    console.log('KIMSE_UI_PASS '+key);
   }
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:375,height:812},reducedMotion:'reduce'});
  await page.addInitScript(state=>localStorage.setItem('kimse.p0.state',JSON.stringify(state)),mkState('normal'));
  for(const route of routes){
   try{
    await page.goto('http://127.0.0.1:4173/#/'+route,{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForTimeout(120);
    const m=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,w:innerWidth,screen:document.querySelector('main')?.className,headline:document.querySelector('main h1')?.textContent?.trim().slice(0,70)}));
    if(m.doc>m.w+2)problems.push({route,issue:'horizontal-overflow',...m});
    results.push({smoke:route,...m});
    await page.screenshot({path:out+'/audit-'+route+'.png',fullPage:false,animations:'disabled'});
   }catch(e){problems.push({route,issue:String(e).slice(0,220)})}
  }
  await page.close();
  fs.writeFileSync(out+'/report.json',JSON.stringify({results,problems},null,2));
  assert.deepEqual(problems,[],'all 52 routes must avoid horizontal overflow');
  console.log('KIMSE_ALL_MOBILE_QA_PASS '+results.length);
 }finally{await browser.close()}
})().catch(e=>{console.error('KIMSE_ALL_MOBILE_QA_FAILED '+(e.stack||e));process.exitCode=1});
