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
  await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.querySelector('[data-kimse-locale-select]')?.value==='en'&&window.KIMSE_LOCALIZEHUB?.locale==='en');
  const destinations=['observation.html','clinical.html','rd.html','trust.html','competitors.html'];
  const violations=[];
  for(const dest of destinations){
    await page.goto(base+'/evidence/?lang=en',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.querySelector('.kimse-primary-choice'));
    const anchor=page.locator('a.kimse-primary-choice[href*="'+dest+'"]');
    await page.waitForFunction(path=>!![...document.querySelectorAll('.kimse-primary-choice')].find(a=>a.getAttribute('href').includes(path)&&a.getAttribute('href').includes('lang=en')),dest,{timeout:20000});
    await anchor.click();
    await page.waitForURL(u=>u.pathname.endsWith(dest),{timeout:20000});
    await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.querySelector('[data-kimse-locale-select]')?.value==='en'&&window.KIMSE_LOCALIZEHUB?.locale==='en');
    await page.waitForTimeout(700);
    const result=await page.evaluate(()=>{
      const visible=[...document.querySelectorAll('h1,h2,.page-pretitle,p')].filter(el=>el.getClientRects().length>0).slice(0,18).map(el=>el.textContent.trim());
      const hangul=visible.join(' ').match(/[가-힣]/g)||[];
      const t=document.querySelector('[data-kimse-locale-select]');
      return {url:location.href,lang:document.documentElement.lang,selector:t?.value,heading:document.querySelector('h1')?.innerText,hangulFirstElements:hangul.length,examples:visible.filter(x=>/[가-힣]/.test(x)).slice(0,6),overflow:document.documentElement.scrollWidth>window.innerWidth+12};
    });
    if(dest==='observation.html'&&result.overflow){
      const diag=await page.evaluate(()=>{
        const vw=window.innerWidth;
        const list=[];
        for(const el of document.querySelectorAll('body *')){
          const b=el.getBoundingClientRect();
          if(b.right<=vw+10||!b.width)continue;
          let clipped=false;
          for(let parent=el.parentElement;parent&&parent!==document.body;parent=parent.parentElement){
            if(['auto','hidden','scroll','clip'].includes(getComputedStyle(parent).overflowX)){clipped=true;break}
          }
          if(clipped)continue;
          list.push({tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,80):'',id:el.id,right:Math.round(b.right),width:Math.round(b.width),text:el.textContent?.trim().slice(0,90)});
          if(list.length>=16)break;
        }
        const bigger=[...document.querySelectorAll('body *')].filter(el=>el.scrollWidth>el.clientWidth+7&&el.clientWidth>0&&getComputedStyle(el).overflowX==='visible').map(el=>({tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,80):'',id:el.id,width:el.clientWidth,scrollWidth:el.scrollWidth,right:Math.round(el.getBoundingClientRect().right),directChildren:el.children.length,content:el.innerText?.slice(0,85)})).slice(0,25);
        return {viewport:vw,body:document.documentElement.scrollWidth,list,bigger};
      });
      console.log('OBSERVATION_MOBILE_OVERFLOW',JSON.stringify(diag));
    }
    console.log('EVIDENCE_NAV_QA',JSON.stringify({dest,...result}));
    assert.equal(result.selector,'en');
    assert.equal(new URL(result.url).searchParams.get('lang'),'en');
    if(result.hangulFirstElements>0)violations.push(dest+': '+result.hangulFirstElements+' Korean heading/intro characters');
    if(result.overflow)violations.push(dest+': mobile horizontal page overflow');
  }
  for(const route of ['start','role','auth','research-engine','evidence-proof','assessment-start','assessment','result','training','training-play','onboarding-profile','initial-check','health','settings','medical-records','monitoring-status','collection-status','brain-map','brain-trends','family','consent','baseline','account','switch','home','medication','report','emergency','market','partnership','plan','accessibility','demo-capture','voice-check','initial-result','cognitive-recheck','cognitive-recheck-result','medication-add','health-detail','caregiver-home','family-feedback','care-schedule','family-add','clinical-handoff','clinical-context-event','medical-record-add','professional-outcome','alert-add','market-detail','admin-partners']){
    await page.goto(base+'/?lang=en#/'+route,{waitUntil:'domcontentloaded'}); // replace below to ensure actual route
    await page.waitForFunction(()=>document.documentElement.lang==='en'&&window.KIMSE_LOCALIZEHUB?.locale==='en',{timeout:30000});
    await page.waitForTimeout(350);
    const status=await page.evaluate(()=>{
      let body=(document.querySelector('#main')?.innerText||document.body.innerText||'');
      return {route:location.hash,lang:document.documentElement.lang,heading:document.querySelector('#main h1')?.innerText||'',authRequired:/로그인이 필요|login required|sign in required|account required/i.test(body),bodyChars:body.length,hangul:(body.match(/[가-힣]/g)||[]).length,examples:body.split('\n').map(x=>x.trim()).filter(x=>/[가-힣]/.test(x)).slice(0,15),overflow:document.documentElement.scrollWidth>window.innerWidth+12};
    });
    if(status.route!=='#/'+route)console.log('APP_ROUTE_UNAVAILABLE_WITHOUT_SIGNIN',JSON.stringify({requested:route,actual:status.route}));
    if(status.authRequired){console.log('APP_ROUTE_AUTH_REQUIRED_NOT_VERIFIED',JSON.stringify({requested:route,actual:status.route,heading:status.heading}));continue;}
    console.log('APP_ROUTE_QA',JSON.stringify(status));
    if(status.hangul>0)violations.push('App '+route+': '+status.hangul+' Korean characters');
    if(status.overflow){
      const overflow=await page.evaluate(()=>({
        viewport:window.innerWidth,body:document.documentElement.scrollWidth,
        bigger:[...document.querySelectorAll('#app *')].filter(el=>el.clientWidth>0&&el.scrollWidth>el.clientWidth+7&&getComputedStyle(el).overflowX==='visible').slice(0,20).map(el=>({tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,90):'',cw:el.clientWidth,sw:el.scrollWidth,right:Math.round(el.getBoundingClientRect().right),text:el.innerText?.slice(0,90)})),
        offenders:[...document.querySelectorAll('#app *')].filter(el=>{
          const b=el.getBoundingClientRect();
          if(b.right<=window.innerWidth+8||!b.width)return false;
          for(let p=el.parentElement;p;p=p.parentElement)if(['auto','hidden','scroll','clip'].includes(getComputedStyle(p).overflowX))return false;
          return true;
        }).slice(0,14).map(el=>({tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,80):'',right:Math.round(el.getBoundingClientRect().right),text:el.textContent?.slice(0,65)}))
      }));
      console.log('APP_MOBILE_OVERFLOW',JSON.stringify({route,...overflow}));
      violations.push('App '+route+': mobile horizontal page overflow');
    }
  }
  console.log('NAV_QA_PAGE_ERRORS',JSON.stringify(errors.slice(0,12)));
  if(errors.some(e=>/require is not defined|JSSIP_UNAVAILABLE/.test(e)))violations.push('App library: JsSIP browser execution error');
  assert.deepEqual(violations,[], 'Remaining untranslated English-visible screens');
  await context.close();
 }finally{await browser.close()}
}
run().catch(e=>{console.error('DEEP_NAV_QA_FAILED',e);process.exit(1)});
