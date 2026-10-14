'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kh-preview/node_modules/playwright');
const fs=require('fs'),out='qa-artifacts/ux-production';fs.mkdirSync(out,{recursive:true});
const url='https://kimse.suaveforge.com',v='20261014-mobile-vertical-28';
const routes='demo-capture start role auth onboarding-profile initial-check voice-check initial-result cognitive-recheck cognitive-recheck-result consent evidence-proof research-engine baseline brain-map monitoring-status collection-status brain-trends account switch home assessment-start assessment result training training-play medication medication-add health health-detail caregiver-home family-feedback care-schedule family family-add family-call call-room clinical-handoff medical-records clinical-context-event medical-record-add professional-outcome report emergency alert-add market market-detail partnership plan accessibility admin-partners settings'.split(' ');
const captures=new Set('home collection-status monitoring-status baseline assessment-start health training medication family medical-records report partnership settings accessibility caregiver-home'.split(' '));
const state={version:14,account:{name:'QA 사용자',email:'qa-preview@example.invalid'},intent:'both',self:true,care:true,mode:'self',onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},initial:{step:5,answers:{},voiceSamples:[]},baseline:{startedAt:new Date(Date.now()-1.73*86400000).toISOString()},consents:{service:true,privacy:true,health:true,location:true,motion:true,usage:true,microphone:true},permissions:{location:'granted',motion:'available'},a11y:{largeText:false,highContrast:false,largeTouchTargets:true}};
(async()=>{
 const browser=await chromium.launch({headless:true}),rows=[],errors=[];
 try{
  const ctx=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',locale:'ko-KR',extraHTTPHeaders:{'Cache-Control':'no-cache'},reducedMotion:'reduce'});
  const page=await ctx.newPage();await page.addInitScript(s=>localStorage.setItem('kimse.p0.state',JSON.stringify(s)),state);
  await page.route('https://api-kimse.suaveforge.com/**',r=>r.abort());
  let html='';
  for(let i=0;i<12;i++){
   let res=await ctx.request.get(url+'/?qa='+Date.now(),{timeout:30000});html=await res.text();
   if(res.ok()&&html.includes('senior-journey.css?v='+v)&&html.includes('app.js?v='+v))break;
   await new Promise(ok=>setTimeout(ok,10000));
  }
  if(!html.includes('senior-journey.css?v='+v)||!html.includes('app.js?v='+v))throw Error('Production release index not updated');
  for(const [p,needle] of [['senior-journey.css','mobile usability audit: keep a semantic h1'],['app.js','id="begin"'],['service-worker.js','kimse-pwa-'+v]]){
   const res=await ctx.request.get(url+'/'+p+'?qa='+v,{timeout:30000});
   const body=await res.text();
   if(!res.ok()||!body.includes(needle))throw Error('Production asset stale '+p);
   if(p==='app.js'){
    const i=body.indexOf('id="begin"'),j=body.indexOf("확인 항목",i);
    if(i<0||j<0||j-i>350)throw Error('Primary CTA not before explanatory research');
   }
   console.log('ASSET_OK '+p+' '+body.length);
  }
  for(const route of routes){
   try{
    await page.goto(url+'/?qa='+v+'#/'+route,{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('main').waitFor({timeout:13000});await page.waitForTimeout(100);
    const m=await page.evaluate(()=>({w:innerWidth,scrollW:document.documentElement.scrollWidth,screen:document.querySelector('main')?.className||'',cta:document.querySelector('#begin')?.getBoundingClientRect().top}));
    rows.push({route,...m});
    if(m.scrollW>m.w+2||!m.screen.split(/\s+/).includes('screen-'+route))errors.push({route,issue:'overflow or wrong screen',...m});
    if(route==='assessment-start'&&!(m.cta<550))errors.push({route,issue:'CTA not in first screen',...m});
    if(captures.has(route))await page.screenshot({path:out+'/'+route+'.png',fullPage:false,animations:'disabled'});
    console.log('LIVE_SCREEN '+route);
   }catch(e){errors.push({route,issue:String(e).slice(0,300)})}
  }
  fs.writeFileSync(out+'/report.json',JSON.stringify({url,release:v,screenCount:rows.length,results:rows,problems:errors},null,2));
  if(rows.length!==52||errors.length)throw Error('Live QA errors '+JSON.stringify(errors));
  console.log('KIMSE_LIVE_52_PASSED');
  await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});