'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kh-preview/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out='qa-artifacts/remaining-mobile';fs.mkdirSync(out,{recursive:true});
const routes='demo-capture start role auth onboarding-profile initial-check voice-check initial-result cognitive-recheck cognitive-recheck-result consent evidence-proof research-engine baseline brain-map monitoring-status collection-status brain-trends account switch home assessment-start assessment result training training-play medication medication-add health health-detail caregiver-home family-feedback care-schedule family family-add family-call call-room clinical-handoff consultation-report medical-records clinical-context-event medical-record-add professional-outcome report emergency alert-add market market-detail partnership plan accessibility admin-partners settings'.split(' ');
const variants=[{width:320,height:720,mode:'normal'},{width:375,height:812,mode:'normal'},{width:375,height:812,mode:'large'}];
const state=mode=>({version:14,account:{name:'김노인',email:'preview@example.invalid'},intent:'both',self:true,care:true,mode:'self',
 onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
 initial:{step:5,completedAt:'2026-10-01T12:00:00Z',answers:{},voiceSamples:[]},
 baseline:{startedAt:new Date(Date.now()-1.73*86400000).toISOString()},
 caregivers:[],caregiverInvites:[],medicines:[],alertRecipients:[],plan:'FREE',
 consents:{service:true,privacy:true,health:true,location:true,motion:true,usage:true,microphone:true,caregiverShare:false},
 permissions:{location:'granted',motion:'available'},
 a11y:{largeText:mode==='large',highContrast:false,largeTouchTargets:true}});
const audited=async(page,route,variant)=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4173/#/'+route,{waitUntil:'domcontentloaded',timeout:25000});
 await page.locator('#main').waitFor({timeout:15000});
 await page.waitForTimeout(220);
 const data=await page.evaluate(()=>{
  const visible=e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'};
  const pos=e=>{const r=e.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height),width:Math.round(r.width)}};
  const main=document.querySelector('#main'),header=document.querySelector('.app-header'),
   footer=main?.querySelector('.app-footer'),content=[...main.querySelectorAll('h1,h2,h3,section,.list-row,.summary-card,.notice,.btn-kimse,button,a,.field,.form-stack')].filter(visible),
   actions=content.filter(e=>(e.matches('button,.btn-kimse,a[href^="#/"],input[type="submit"]')&&(!e.closest('header,nav,.app-footer'))&&e.getAttribute('type')!=='hidden'));
  const highActions=actions.map(e=>({label:e.innerText.trim().replace(/\s+/g,' ').slice(0,70),...pos(e)}));
  const headings=[...main.querySelectorAll('h1,h2,h3')].filter(visible).slice(0,12).map(e=>({text:e.innerText.trim().replace(/\s+/g,' ').slice(0,80),...pos(e)}));
  const cardRows=[...main.querySelectorAll('.list-row,.summary-card,.action-card,.notice,.field,.consent-row')].filter(visible);
  const nav=document.querySelector('.bottom-nav');const navTop=nav?Math.round(nav.getBoundingClientRect().top):null;
  const firstAction=highActions[0]||null;
  return {route:location.hash.slice(2),viewportWidth:innerWidth,viewportHeight:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
   headerBottom:header?Math.round(header.getBoundingClientRect().bottom):0,main:pos(main),navTop,headingCount:headings.length,headings,
   cards:cardRows.length,firstAction,actions:highActions.slice(0,8),
   actionBeyondViewport:firstAction?firstAction.bottom>Math.min(navTop||innerHeight,innerHeight):null,
   footerTop:footer?Math.round(footer.getBoundingClientRect().top):null,
   scrollScreens:Math.round(100*(document.documentElement.scrollHeight/innerHeight))/100,
   bodyTextChars:main.innerText.length};
 });
 return {...data,requestedRoute:route,mode:variant.mode,errors:errors.filter(s=>!s.includes('require is not defined'))};
};
(async()=>{
 const browser=await chromium.launch({headless:true});const records=[],fatal=[];
 try{
  for(const sc of variants){
   const page=await browser.newPage({viewport:{width:sc.width,height:sc.height},reducedMotion:'reduce'});
   await page.addInitScript(st=>localStorage.setItem('kimse.p0.state',JSON.stringify(st)),state(sc.mode));
   for(const route of routes){
    const tag=route+'-'+sc.width+'-'+sc.mode;
    try{
     const x=await audited(page,route,sc);
     records.push(x);
     if(x.scrollWidth>x.viewportWidth+2)fatal.push({tag,issue:'horizontal overflow',width:x.scrollWidth});
     if(x.route!==route)fatal.push({tag,issue:'route unexpected',actual:x.route});
     if(x.errors.length)fatal.push({tag,issue:'JavaScript runtime errors',errors:x.errors.slice(0,2)});
     if(sc.mode==='normal'&&route==='medical-records'&&(x.firstAction?.bottom??9999)>sc.height)
       fatal.push({tag,issue:'Primary medical record entry button below first screen',bottom:x.firstAction?.bottom});
     if(sc.mode==='normal'&&route==='voice-check'&&(x.firstAction?.bottom??9999)>sc.height)
       fatal.push({tag,issue:'Voice recording button below first screen',bottom:x.firstAction?.bottom});
     if(route==='consultation-report'){
       const noData=await page.evaluate(()=>document.querySelector('#main')?.innerText||'');
       if(noData.includes('현재 큰 변화가 확인되지 않았습니다.')||noData.includes('14/14일'))
         fatal.push({tag,issue:'Unsupported clinical comparison presented as observed evidence'});
     }
     await page.screenshot({path:out+'/'+tag+'.png',fullPage:false,animations:'disabled'});
     console.log('AUDITED '+tag+' screens='+x.scrollScreens+' actionBelow='+x.actionBeyondViewport);
    }catch(e){fatal.push({tag,issue:String(e).slice(0,260)});}
   }
   await page.close();
  }
  fs.writeFileSync(out+'/report.json',JSON.stringify({recordCount:records.length,records,fatal},null,2));
  console.log('AUDIT_SUMMARY '+JSON.stringify({total:records.length,problems:fatal.length,offscreen:records.filter(x=>x.actionBeyondViewport).map(x=>x.requestedRoute+'-'+x.viewportWidth+'-'+x.mode),long:records.filter(x=>x.scrollScreens>1.5).length}));
  assert(!fatal.length,'Unresolved hard errors: '+JSON.stringify(fatal).slice(0,2000));
 }finally{await browser.close()}
})().catch(e=>{console.error('ALL_SCREEN_AUDIT_FAILED '+(e.stack||e));process.exitCode=1});
