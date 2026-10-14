'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
async function run(){
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({locale:'en-GB',viewport:{width:390,height:844}});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:8765';
  await page.goto(base+'/evidence/?lang=en',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.querySelector('[data-kimse-locale-select]')?.value==='en');
  const destinations=['observation.html','clinical.html','rd.html','trust.html'];
  const violations=[];
  for(const dest of destinations){
    await page.goto(base+'/evidence/?lang=en',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.querySelector('.kimse-primary-choice'));
    const anchor=page.locator('a.kimse-primary-choice[href*="'+dest+'"]');
    await page.waitForFunction(path=>!![...document.querySelectorAll('.kimse-primary-choice')].find(a=>a.getAttribute('href').includes(path)&&a.getAttribute('href').includes('lang=en')),dest,{timeout:20000});
    await anchor.click();
    await page.waitForURL(u=>u.pathname.endsWith(dest),{timeout:20000});
    await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.querySelector('[data-kimse-locale-select]')?.value==='en');
    await page.waitForTimeout(700);
    const result=await page.evaluate(()=>{
      const visible=[...document.querySelectorAll('h1,h2,.page-pretitle,p')].filter(el=>el.getClientRects().length>0).slice(0,18).map(el=>el.textContent.trim());
      const hangul=visible.join(' ').match(/[가-힣]/g)||[];
      const t=document.querySelector('[data-kimse-locale-select]');
      return {url:location.href,lang:document.documentElement.lang,selector:t?.value,heading:document.querySelector('h1')?.innerText,hangulFirstElements:hangul.length,examples:visible.filter(x=>/[가-힣]/.test(x)).slice(0,6),overflow:document.documentElement.scrollWidth>window.innerWidth+12};
    });
    console.log('EVIDENCE_NAV_QA',JSON.stringify({dest,...result}));
    assert.equal(result.selector,'en');
    assert.equal(new URL(result.url).searchParams.get('lang'),'en');
    if(result.hangulFirstElements>0)violations.push(dest+': '+result.hangulFirstElements+' Korean heading/intro characters');
  }
  for(const route of ['start','role','auth','research-engine','assessment-start','training']){
    await page.goto(base+'/?lang=en#/'+route,{waitUntil:'domcontentloaded'}); // replace below to ensure actual route
    await page.waitForFunction(()=>document.documentElement.lang==='en',{timeout:20000});
    await page.waitForTimeout(500);
    const status=await page.evaluate(()=>{
      let body=(document.querySelector('#main')?.innerText||document.body.innerText||'');
      return {route:location.hash,lang:document.documentElement.lang,hangul:(body.match(/[가-힣]/g)||[]).length,examples:body.split('\n').map(x=>x.trim()).filter(x=>/[가-힣]/.test(x)).slice(0,15),overflow:document.documentElement.scrollWidth>window.innerWidth+12};
    });
    console.log('APP_ROUTE_QA',JSON.stringify(status));
    if(status.hangul>0)violations.push('App '+route+': '+status.hangul+' Korean characters');
  }
  console.log('NAV_QA_PAGE_ERRORS',JSON.stringify(errors.slice(0,12)));
  assert.deepEqual(violations,[], 'Remaining untranslated English-visible screens');
  await context.close();
 }finally{await browser.close()}
}
run().catch(e=>{console.error('DEEP_NAV_QA_FAILED',e);process.exit(1)});
