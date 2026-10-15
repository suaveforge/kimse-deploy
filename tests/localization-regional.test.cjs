'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');

function verifyRegionalFormatters(){
 const src=fs.readFileSync('app.js','utf8');
 const begin=src.indexOf('function kimseDisplayLocale(){');
 const fmtStart=src.indexOf('\nconst fmtDate=v=>',begin);
 const fmtEnd=src.indexOf('\nconst PARTNER_TYPE_LABEL',fmtStart);
 const monitorStart=src.indexOf('function formatMonitoringValue(metric,value){');
 const monitorEnd=src.indexOf('\nconst signalId=',monitorStart);
 assert.ok(begin>=0&&fmtStart>begin&&fmtEnd>fmtStart&&monitorStart>0&&monitorEnd>monitorStart,'Regional display functions must be present');
 const localeSource=src.slice(begin,fmtStart);
 const fmtSource=src.slice(fmtStart,fmtEnd);
 const monitorSource=src.slice(monitorStart,monitorEnd);
 const check=(browser,choice,expected)=>{
  const navigator={language:browser,languages:[browser]};
  const location={search:choice?'?lang='+encodeURIComponent(choice):''};
  const localStorage={getItem:()=>null};
  const run=new Function('navigator','location','localStorage','metric','value','date',localeSource+'\n'+fmtSource+'\n'+monitorSource+'\nreturn {locale:kimseDisplayLocale(),date:fmtDate(date),distance:formatMonitoringValue(metric,value),steps:formatMonitoringValue("steps",1234)}');
  const result=run(navigator,location,localStorage,'movement_distance_m',2500,'2026-10-15T12:30:00Z');
  assert.equal(result.locale,expected);
  return result;
 };
 const us=check('en-US','en','en-US'),gb=check('en-GB','en','en-GB'),ko=check('ko-KR','','ko-KR');
 assert.match(us.date,/10\/15\/2026/);
 assert.match(gb.date,/15\/10\/2026/);
 assert.equal(us.distance,'1.6 mi');
 assert.equal(gb.distance,'2.5 km');
 assert.equal(ko.distance,'2.5 km');
 assert.equal(us.steps,'1,234 steps');
 assert.equal(gb.steps,'1,234 steps');
 const override=check('en-GB','en-US','en-US');
 console.log('REGIONAL_FORMAT_QA',JSON.stringify({us,gb,ko,override}));
}

async function verifyBrowserLocales(){
 const browser=await chromium.launch({headless:true});
 const base='http://127.0.0.1:8765';
 const cases=[
  {name:'US',locale:'en-US',expected:'en',urls:['/#/start','/evidence/','/evidence/observation.html','/evidence/clinical.html','/evidence/rd.html','/evidence/trust.html','/evidence/competitors.html']},
  {name:'UK',locale:'en-GB',expected:'en',urls:['/#/start','/evidence/','/evidence/observation.html','/evidence/clinical.html','/evidence/rd.html','/evidence/trust.html','/evidence/competitors.html']},
  {name:'Korea',locale:'ko-KR',expected:'ko',urls:['/#/start','/evidence/']},
  {name:'URL override',locale:'ko-KR',expected:'en',saved:'ko',urls:['/evidence/?lang=en']},
  {name:'Saved English',locale:'ko-KR',expected:'en',saved:'en',urls:['/evidence/']}
 ];
 try{
  for(const test of cases){
   const context=await browser.newContext({locale:test.locale,viewport:{width:390,height:844}});
   if(test.saved)await context.addInitScript(v=>localStorage.setItem('localizehub:p45:locale',v),test.saved);
   const page=await context.newPage();const errors=[];
   page.on('pageerror',error=>errors.push(String(error)));
   for(const target of test.urls){
    await page.goto(base+target,{waitUntil:'domcontentloaded',timeout:35000});
    await page.waitForFunction(expected=>document.documentElement.lang===expected&&window.KIMSE_LOCALIZEHUB?.locale===expected&&document.querySelector('[data-kimse-locale-select]')?.value===expected,test.expected,{timeout:30000});
    await page.waitForTimeout(400);
    const state=await page.evaluate(()=>{
     const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n,count=0;
     while(n=w.nextNode()){
      const el=n.parentElement;
      if(!el||el.getClientRects().length===0||el.closest('script,style,noscript,localize-switcher,[hidden]'))continue;
      count+=(n.nodeValue?.match(/[가-힣]/g)||[]).length;
     }
     return {browserLocale:navigator.language,locale:window.KIMSE_LOCALIZEHUB?.locale,lang:document.documentElement.lang,selector:document.querySelector('[data-kimse-locale-select]')?.value,hangul:count,overflow:document.documentElement.scrollWidth>window.innerWidth+8,url:location.pathname};
    });
    assert.equal(state.browserLocale,test.locale);
    assert.equal(state.lang,test.expected);
    if(test.expected==='en')assert.equal(state.hangul,0,test.name+' '+target+' contains untranslated Korean characters');
    assert.equal(state.overflow,false,test.name+' '+target+' overflows mobile viewport');
    assert.deepEqual(errors,[],test.name+' '+target+' has page errors');
    console.log('REGIONAL_BROWSER_QA',JSON.stringify({case:test.name,target,...state}));
   }
   await context.close();
  }
 }finally{await browser.close()}
}
verifyRegionalFormatters();
verifyBrowserLocales().catch(err=>{console.error('REGIONAL_QA_FAILED',err);process.exit(1)});
