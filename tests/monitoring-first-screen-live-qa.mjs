import {chromium} from 'playwright';
import fs from 'node:fs';
const BASE='https://kimse.suaveforge.com/';
const checks=[];
const assert=(condition,subject,extra=null)=>{checks.push({subject,ok:!!condition,extra});console.log((condition?'PASS ':'FAIL ')+subject,extra?JSON.stringify(extra):'');if(!condition)throw Error('MONITORING_LIVE_QA_FAIL '+subject+' '+JSON.stringify(extra))};
const originalState={
 version:14,account:{name:'QA fixture only',email:''},intent:'self',self:true,care:true,mode:'self',
 caregivers:[{name:'QA caregiver',relation:'자녀'}],
 onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
 initial:{step:5,answers:{},voiceSamples:[],voiceSkipped:true,completedAt:new Date().toISOString(),domains:{memory:86,executive:84,language:87,spatial:85,daily:88}},
 consents:{service:true,privacy:true,health:true,microphone:false,location:false,motion:false,usage:false,notifications:false,caregiverShare:true},
 baseline:{startedAt:new Date(Date.now()-15*86400000).toISOString()},
 monitoring:{pending:[],summary:{status:'READY',baseline_days:14,baseline_target_days:14,level:'WATCH',
 changes:[
 {metric:'sleep_minutes',baseline:425,recent:336,relative_change:-.2094,changed:true},
 {metric:'steps',baseline:5120,recent:3460,relative_change:-.3242,changed:true},
 {metric:'voice_pause_ratio',baseline:.18,recent:.23,relative_change:.2778,changed:true}
 ],metrics:[],interpretation:'진단이 아닌 변화 관찰'},alerts:[],lastFlushAt:null},
 brainHistory:[],a11y:{largeText:false,highContrast:false,voiceGuidance:false,soundEffects:false,largeTouchTargets:false,reduceMotion:true}
};
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:450,height:800},deviceScaleFactor:1,locale:'ko-KR',reducedMotion:'reduce'});
 await context.route('https://api-kimse.suaveforge.com/**',route=>route.abort());
 await context.addInitScript(state=>{localStorage.setItem('kimse.p0.state',JSON.stringify(state))},originalState);
 const page=await context.newPage();
 const response=await page.goto(BASE+'?lang=ko#/monitoring-status',{waitUntil:'domcontentloaded',timeout:45000});
 assert(response?.ok(),'production homepage HTTP OK',{code:response?.status()});
 await page.waitForSelector('.screen-monitoring-status .kimse-monitoring-one-screen',{timeout:18000});
 await page.waitForTimeout(400);
 await fs.promises.mkdir('artifacts/monitoring-first-screen',{recursive:true});
 for(const mode of ['mobile','capture']){
   await page.evaluate(mode=>{document.documentElement.classList.toggle('capture-frame-mode',mode==='capture')},mode);
   await page.waitForTimeout(220);
   const data=await page.evaluate(()=>{
      const g=sel=>document.querySelector(sel);
      const box=el=>{if(!el)return null;let r=el.getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height),width:Math.round(r.width)}};
      const section=g('.kimse-monitoring-one-screen'),details=g('.kimse-monitoring-details'),app=g('.kimse-app');
      return{
       viewport:{width:innerWidth,height:innerHeight},
       app:box(app),summary:box(section),details:box(details),
       signals:[...document.querySelectorAll('.kimse-one-screen-signal')].map(el=>({label:el.querySelector('.kimse-one-screen-name')?.textContent,delta:el.querySelector('.kimse-one-screen-delta')?.textContent,box:box(el)})),
       links:[...document.querySelectorAll('.kimse-one-screen-links a')].map(el=>({label:el.textContent,href:el.getAttribute('href'),box:box(el)})),
       detailsClosed:!details?.open,
       detailContainsOriginalNumbers:details?.textContent.includes('5,120')&&details?.textContent.includes('3,460'),
       sourceActionsKept:!!details?.querySelector('.monitoring-actions'),
       firstFoldBottom:details?box(details).bottom:null,
       horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
       legacyCards:document.querySelectorAll('.monitoring-journey,.monitoring-baseline-band,.monitoring-pattern-panel').length
      };
   });
   console.log('KIMSE_LIVE_450_800_'+mode.toUpperCase()+'='+JSON.stringify(data));
   assert(data.viewport.width===450&&data.viewport.height===800,mode+' viewport 450×800',data.viewport);
   assert(data.legacyCards===0,mode+' no legacy 01–04 cards',{legacyCards:data.legacyCards});
   assert(data.signals.length===3,mode+' three signal cards',data.signals);
   assert(data.signals.map(x=>x.delta).join('|')==='−21%|−32%|+28%',mode+' original percentages',data.signals);
   assert(data.links.length===2&&data.links.some(x=>x.href==='#/consultation-report')&&data.links.some(x=>x.href==='#/collection-status'),mode+' two real links',data.links);
   assert(data.detailsClosed&&data.sourceActionsKept&&data.detailContainsOriginalNumbers,mode+' expandable source untouched');
   assert(!data.horizontalOverflow,mode+' no horizontal clipping');
   assert(data.firstFoldBottom!==null&&data.firstFoldBottom<=800-8,mode+' all essential content visible within 800px',{detailBottom:data.firstFoldBottom});
   await page.screenshot({path:'artifacts/monitoring-first-screen/'+mode+'-450x800.png',fullPage:false,animations:'disabled'});
 }
 fs.writeFileSync('artifacts/monitoring-first-screen/results.json',JSON.stringify({checks},null,2));
 console.log('KIMSE_LIVE_MONITORING_ONE_SCREEN_450x800_PASS=yes');
 await context.close();
}finally{await browser.close()}
