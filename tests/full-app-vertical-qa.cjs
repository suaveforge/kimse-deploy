'use strict';
const { chromium }=require(process.env.RUNNER_TEMP+'/kh-preview/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const OUT='qa-artifacts/ux-vertical';fs.mkdirSync(OUT,{recursive:true});
const routes='demo-capture start role auth onboarding-profile initial-check voice-check initial-result cognitive-recheck cognitive-recheck-result consent evidence-proof research-engine baseline brain-map monitoring-status collection-status brain-trends account switch home assessment-start assessment result training training-play medication medication-add health health-detail caregiver-home family-feedback care-schedule family family-add family-call call-room clinical-handoff medical-records clinical-context-event medical-record-add professional-outcome report emergency alert-add market market-detail partnership plan accessibility admin-partners settings'.split(' ');
const devices=[{name:'mobile',w:375,h:812,mode:'normal',all:true},{name:'small',w:320,h:720,mode:'normal',all:true},{name:'wide',w:430,h:860,mode:'normal',all:false},{name:'desktop',w:1440,h:900,mode:'normal',all:false},{name:'large',w:375,h:812,mode:'large',all:false},{name:'contrast',w:375,h:812,mode:'contrast',all:false}];
const focus=new Set('home collection-status monitoring-status baseline health health-detail training training-play medication medication-add caregiver-home family-feedback brain-map brain-trends medical-records clinical-handoff report settings accessibility consent role auth market account'.split(' '));
const state=mode=>({version:14,account:{name:'QA 사용자',email:'qa-preview@example.invalid'},intent:'both',self:true,care:true,mode:'self',
onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
initial:{step:5,completedAt:'2026-10-01T12:00:00Z',answers:{},voiceSamples:[]},
baseline:{startedAt:new Date(Date.now()-1.73*86400000).toISOString()},caregivers:[],
consents:{service:true,privacy:true,health:true,caregiverShare:false,location:true,motion:true,usage:true,microphone:true},
permissions:{location:'granted',motion:'available'},a11y:{largeText:mode==='large',highContrast:mode==='contrast',largeTouchTargets:true}});
(async()=>{
const browser=await chromium.launch({headless:true}),rows=[],problems=[];
try{
for(const dev of devices){
 const page=await browser.newPage({viewport:{width:dev.w,height:dev.h},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(s=>localStorage.setItem('kimse.p0.state',JSON.stringify(s)),state(dev.mode));
 await page.route('https://api-kimse.suaveforge.com/**',route=>route.abort('blockedbyclient'));
 const targets=dev.all?routes:routes.filter(x=>focus.has(x));
 for(const route of targets){
   let key=dev.name+'-'+route;errors.length=0;
   try{
     await page.goto('http://127.0.0.1:4173/#/'+route,{waitUntil:'domcontentloaded',timeout:30000});
     await page.locator('main').waitFor({timeout:12000});
     await page.waitForTimeout(130);
     let m=await page.evaluate(()=>{
       const q=s=>document.querySelector(s),rect=e=>{const r=e.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)}},visible=e=>{const cs=getComputedStyle(e),b=e.getBoundingClientRect();return cs.visibility!=='hidden'&&cs.display!=='none'&&Number(cs.opacity)>0&&b.width>1&&b.height>1};
       const main=q('main')||q('.page'),nav=q('.bottom-nav'),header=q('.app-header');
       const interactive=[...main.querySelectorAll('button,a[href],input[type=submit],summary,[role=button]')].filter(visible);
       const actions=interactive.filter(e=>!e.closest('.bottom-nav,.app-header')&&!e.matches('.skip-link'));
       const headings=[...main.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>({text:e.textContent.trim().slice(0,100),box:rect(e)}));
       const small=[...main.querySelectorAll('p,small,label,button,a,span,li')].filter(visible).filter(e=>{const cs=getComputedStyle(e);return parseFloat(cs.fontSize)<14&&e.textContent.trim().length>5}).map(e=>({text:e.textContent.trim().slice(0,65),px:getComputedStyle(e).fontSize}));
       const tinyTargets=interactive.map(e=>({name:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,40),box:rect(e)})).filter(t=>t.box.h<40&&t.box.w<40).slice(0,15);
       const navbox=nav&&visible(nav)?rect(nav):null;
       const overlapped=navbox?actions.filter(e=>{const b=rect(e);return b.top<navbox.bottom&&b.bottom>navbox.top&&b.left<navbox.right&&b.right>navbox.left}).map(e=>e.textContent.trim().slice(0,45)): [];
       return {route:location.hash.slice(2),screen:main?.className||'',width:innerWidth,height:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,
         mainBox:main?rect(main):null,header:header?rect(header):null,nav:navbox,
         h1:headings.find(x=>x.text)?.text||'',headings:headings.slice(0,6),actions:actions.length,firstAction:actions[0]?{name:actions[0].textContent.trim().slice(0,80),box:rect(actions[0])}:null,
         firstFullButton:actions.find(e=>rect(e).h>=42)?{name:actions.find(e=>rect(e).h>=42).textContent.trim().slice(0,80),box:rect(actions.find(e=>rect(e).h>=42))}:null,
         aboveFoldActions:actions.filter(e=>{let b=rect(e);return b.top>=0&&b.bottom<=innerHeight-(navbox?navbox.h:0)}).length,
         smallText:small.slice(0,12),smallTextCount:small.length,tinyTargets,navOverlaps:overlapped,
         buttonLabels:actions.slice(0,12).map(e=>e.textContent.trim().slice(0,65)),visibleChars:(main?.innerText||'').slice(0,700).length,
         bodyBackground:getComputedStyle(document.body).backgroundColor
       };
     });
     const record={key,...m,jsErrors:errors.filter(e=>!e.includes('require is not defined')).slice(0,5)};
     rows.push(record);
     if(m.route!==route)problems.push({key,code:'wrong-route',actual:m.route});
     if(m.scrollW>dev.w+2)problems.push({key,code:'horizontal-overflow',width:m.scrollW});
     if(m.navOverlaps?.length)problems.push({key,code:'nav-overlap',labels:m.navOverlaps});
     if(m.firstFullButton&&m.firstFullButton.box.top>dev.h+120)problems.push({key,code:'first-button-below-viewport',top:m.firstFullButton.box.top});
     if(m.scrollH>dev.h*2.6)problems.push({key,code:'excessive-vertical-height',scrollH:m.scrollH});
     if(m.smallTextCount>12)problems.push({key,code:'many-small-text',count:m.smallTextCount});
     if(record.jsErrors.length)problems.push({key,code:'javascript-error',errors:record.jsErrors});
     if(dev.name==='mobile'){
       await page.screenshot({path:path.join(OUT,key+'.png'),fullPage:false,animations:'disabled'});
       await page.screenshot({path:path.join(OUT,key+'-full.png'),fullPage:true,animations:'disabled'});
     }else if(dev.name==='small'||dev.name==='desktop'||dev.name==='large'){
       await page.screenshot({path:path.join(OUT,key+'.png'),fullPage:false,animations:'disabled'});
     }
     console.log('VERTICAL_AUDIT '+key+' height='+m.scrollH+' firstAction='+JSON.stringify(m.firstFullButton?.name||null));
   }catch(err){problems.push({key,code:'load-failed',error:String(err).slice(0,350)});console.log('VERTICAL_FAIL '+key+' '+err)}
 }
 await page.close();
}
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({at:new Date().toISOString(),routeCount:routes.length,checks:rows.length,results:rows,problems},null,2));
console.log('KIMSE_VERTICAL_AUDIT checks='+rows.length+' problems='+problems.length);
}finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});