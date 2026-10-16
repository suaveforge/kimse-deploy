import fs from 'node:fs';
import {chromium} from 'playwright';
import {setTimeout as sleep} from 'node:timers/promises';

const base='https://kimse.suaveforge.com/';
const dir='artifacts/filming-live';
fs.mkdirSync(dir,{recursive:true});
const result={checkedAt:new Date().toISOString(),source:'live published domain, no JavaScript overrides',checks:[],routes:[],monitoringFrames:[],errors:[]};
const assert=(ok,label,details={})=>{
 result.checks.push({label,pass:!!ok,details});
 console.log('KIMSE_FILM_CHECK '+JSON.stringify({label,pass:!!ok,details}));
 if(!ok)throw Error(label+' '+JSON.stringify(details));
};
const expected=Object.fromEntries(['app.js','service-worker.js','premium-ux.js','index.html'].map(k=>[k,fs.readFileSync(k)]));
let matched=false;
for(let attempt=1;attempt<=45;attempt++){
 const bad=[];
 for(const file of Object.keys(expected)){
  try{
   const url=base+file+'?filmingQA='+Date.now()+'-'+attempt;
   const r=await fetch(url,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
   if(!r.ok||!Buffer.from(await r.arrayBuffer()).equals(expected[file]))bad.push({file,status:r.status});
  }catch(e){bad.push({file,error:String(e)})}
 }
 if(!bad.length){matched=true;console.log('KIMSE_LIVE_EXACT_ASSETS=PASS attempt='+attempt);break}
 if(attempt===1||attempt%5===0)console.log('KIMSE_LIVE_EXACT_ASSETS_WAIT '+JSON.stringify({attempt,bad}));
 await sleep(4000);
}
assert(matched,'production root assets match exact GitHub deployment commit');
assert(expected['app.js'].toString().includes('const DEMO_DURATION_MS=75000;'),'75s capture timeline present');
assert(expected['app.js'].toString().includes('DEMO_DURATION_MS+15000'),'90s safety stop present');

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const context=await browser.newContext({viewport:{width:450,height:800},deviceScaleFactor:1,locale:'ko-KR',isMobile:true,hasTouch:true,serviceWorkers:'block',recordVideo:{dir,size:{width:450,height:800}}});
 const page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto(base+'?lang=ko#/demo-capture',{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('#demo-preview').waitFor({timeout:18000});
 await page.locator('#demo-preview').click();
 const video=page.video();
 const seen=new Set();
 let last='', lastMonitoring=0;
 const started=Date.now();
 while(Date.now()-started<100000){
   const state=await page.evaluate(()=>{
     const route=location.hash.replace(/^#\//,'');
     const screen=document.querySelector('.screen-monitoring-status .kimse-monitoring-one-screen');
     const action=screen?.querySelector('.kimse-one-screen-primary');
     const primary=action?.getBoundingClientRect();
     const detail=screen?.parentElement?.querySelector('.kimse-monitoring-details>summary')?.getBoundingClientRect();
     return {route,one:!!screen,old:!!document.querySelector('.monitoring-journey'),status:screen?.querySelector('.kimse-one-screen-badge')?.textContent||'',advice:screen?.querySelector('.kimse-one-screen-advice')?.textContent||'',count:screen?.querySelectorAll('.kimse-one-screen-signal').length||0,ctaBottom:primary?.bottom??null,detailsBottom:detail?.bottom??null,viewport:innerHeight,capture:document.documentElement.classList.contains('capture-frame-mode')};
   });
   seen.add(state.route);
   if(state.route!==last){
     result.routes.push({sec:Math.round((Date.now()-started)/1000),...state});
     if(state.route==='monitoring-status'){
       await page.locator('.screen-monitoring-status .kimse-monitoring-one-screen').waitFor({timeout:4000});
       const m=await page.evaluate(()=>{
         const s=document.querySelector('.kimse-monitoring-one-screen');
         const c=s?.querySelector('.kimse-one-screen-primary')?.getBoundingClientRect();
         const d=s?.parentElement?.querySelector('.kimse-monitoring-details>summary')?.getBoundingClientRect();
         return {ctaBottom:c?.bottom,detailsBottom:d?.bottom,signals:s?.querySelectorAll('.kimse-one-screen-signal')?.length,old:!!document.querySelector('.monitoring-journey'),advice:s?.querySelector('.kimse-one-screen-advice')?.textContent};
       });
       result.monitoringFrames.push({sec:Math.round((Date.now()-started)/1000),...m});
       await page.screenshot({path:dir+'/monitoring-'+(++lastMonitoring)+'.png',fullPage:false});
     }
     last=state.route;
   }
   if(state.route==='demo-capture'&&seen.has('caregiver-home'))break;
   await sleep(330);
 }
 result.durationSeconds=Math.round((Date.now()-started)/1000);
 result.uniqueRoutes=[...seen];
 assert(seen.has('consent')&&seen.has('baseline')&&seen.has('brain-map')&&seen.has('brain-trends')&&seen.has('caregiver-home'),'actual tour visits required real screens',{routes:result.uniqueRoutes});
 assert(result.monitoringFrames.length===2,'monitoring screen appears at beginning and end',{monitoringFrames:result.monitoringFrames});
 assert(result.monitoringFrames.every(s=>s.signals===3&&!s.old&&s.ctaBottom<=800&&s.detailsBottom<=800),'real monitoring summary, details and CTA remain in 450x800',result.monitoringFrames);
 assert(result.monitoringFrames.every(s=>/가족|상담|확인/.test(s.advice)&&!s.advice.startsWith('기록을 계속 쌓아')),'WATCH advice uses specific follow-up',result.monitoringFrames);
 assert(last==='demo-capture','autoplay restores capture menu after entire sequence',{last,elapsed:result.durationSeconds});
 assert(result.durationSeconds>=60&&result.durationSeconds<90,'full tour completes before 90s safety cutoff',{duration:result.durationSeconds});
 await context.close();
 await video.saveAs(dir+'/kimse-real-published-450x800.webm');
 assert(fs.statSync(dir+'/kimse-real-published-450x800.webm').size>150000,'browser recorded real video of published app',{bytes:fs.statSync(dir+'/kimse-real-published-450x800.webm').size});
}finally{
 await browser.close();
 fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2));
}
console.log('KIMSE_LIVE_FILMING_COMPLETE=yes');
