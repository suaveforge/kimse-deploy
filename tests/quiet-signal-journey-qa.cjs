'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-quiet-signal-qa/node_modules/playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const screens=['onboarding-profile','initial-check','voice-check','initial-result'];
const modes=['normal','large','contrast'],widths=[320,375,430,720,768,1280],report=[];
const base='https://kimse.suaveforge.com/#/';
async function run(browser,screen,mode,width){
 const ctx=await browser.newContext({viewport:{width,height:790},deviceScaleFactor:1,reducedMotion:'reduce'});
 await ctx.addInitScript(({screen,mode})=>{
  const state={
   version:14,account:{name:'점검',email:'qa@example.invalid'},intent:'self',self:true,care:false,
   profile:{birthYear:'1956',sex:'female',education:'7to9',activity:'active',living:'partner_family',socialSupport:'both',socialActivity:'weekly',sleepHours:'7시간',sleepDisturbance:'rare',hearing:'no',subjectiveChange:'ABSENT',functionStatus:'INDEPENDENT'},
   onboarding:{profileDone:screen!=='onboarding-profile',consentDone:true,initialDone:screen==='initial-result',completed:false,profileStep:1},
   initial:{step:1,answers:screen==='initial-result'?{subtraction:'79',events:'some',finances:'no',travel:'often'}:{},responseTimes:screen==='initial-result'?[1500,1200,1900,2100]:[],recall:screen==='initial-result'?'나무 기차':'',voiceSamples:[{id:'qa-one',durationSec:35,prompt:'첫 이야기',storedLocal:true},{id:'qa-two',durationSec:40,prompt:'두번째 이야기',storedLocal:true},null],voiceStep:0,completedAt:screen==='initial-result'?new Date().toISOString():null},
   consents:{service:true,privacy:true,health:true},
   a11y:{largeText:mode==='large',highContrast:mode==='contrast',voiceGuidance:false,soundEffects:false,largeTouchTargets:mode!=='normal'}
  };
  localStorage.setItem('kimse.p0.state',JSON.stringify(state));
 },{screen,mode});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>{if(!String(e).includes('require is not defined'))errors.push(String(e))});
 await page.goto(base+screen,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('main .kimse-journey').waitFor({timeout:20000});
 const x=await page.evaluate(screen=>{
  const main=document.querySelector('main'),scope=main.querySelector('.kimse-journey');
  const title=scope.querySelector('.kimse-wizard-title,.kimse-initial-title,.kimse-flow-title');
  const controls=[...scope.querySelectorAll('.kimse-wizard-choice,.kimse-initial-answer,.kimse-flow-primary,.kimse-wizard-next,.kimse-initial-cta')];
  const box=main.getBoundingClientRect(),footer=main.querySelector('.app-footer');
  const styles=controls.map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {height:r.height,width:r.width,x:r.x,right:r.right,font:parseFloat(s.fontSize),border:parseFloat(s.borderTopWidth),radius:parseFloat(s.borderTopLeftRadius)}});
  return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,titleSize:parseFloat(getComputedStyle(title).fontSize),mainOutline:getComputedStyle(main).outlineStyle,buttons:styles,footer:footer?.textContent?.trim()||'',sheetLoaded:[...document.styleSheets].some(s=>s.href?.includes('senior-journey.css'))};
 },screen);
 assert(x.sheetLoaded,'design CSS missing');
 assert(x.pageWidth<=width+2,'horizontal overflow '+JSON.stringify({screen,mode,width,x}));
 assert(x.titleSize>=27,'headline too small '+JSON.stringify({screen,mode,width,x}));
 assert.equal(x.mainOutline,'none','unwanted full page focus border '+screen);
 assert(x.buttons.length>0,'no buttons on '+screen);
 for(const b of x.buttons){
  assert(b.height>=70,'touch target too short '+JSON.stringify({screen,mode,width,b}));
  assert(b.x>=-1&&b.right<=width+2,'clipped control '+JSON.stringify({screen,mode,width,b}));
 }
 if(screen!=='initial-result'){
  const step=await page.locator('.kimse-journey-count').innerText();
  assert(step.includes(screen==='initial-check'?'2':'1'),'missing progress count: '+screen+' '+step);
  assert.equal(await page.locator('.kimse-journey-track[role="progressbar"]').count(),1);
 }
 const mainCopy=await page.locator('main').innerText();
 assert(!/baseline|cutoff|Yamada|FAQ6|Speech biomarker|자체 연구 점수|임상 진단 정확도/.test(mainCopy),'research jargon appeared on senior screen');
 if(mode==='normal'&&[320,375,1280].includes(width))await page.screenshot({path:'qa-artifacts/'+screen+'-'+width+'-normal.png',fullPage:true});
 if(width===375&&mode!=='normal')await page.screenshot({path:'qa-artifacts/'+screen+'-375-'+mode+'.png',fullPage:true});
 if(screen==='onboarding-profile'){
  await page.locator('[data-profile-choice="male"]').click();
  assert.equal(await page.locator('#profile-wizard-next').count(),0,'No double confirmation after one answer');
  assert((await page.locator('.kimse-journey-count').innerText()).includes('3'),'profile next failed');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
  assert.equal(state.profile.sex,'male');
 }
 if(screen==='initial-check'){
  await page.locator('[data-initial-answer="subtraction:81"]').click();
  assert((await page.locator('.kimse-journey-count').innerText()).includes('3'),'initial advance failed');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
  assert.equal(state.initial.answers.subtraction,'81');
  assert.equal(state.initial.responseTimes.length,1,'first-time initial check should not inherit any prior response times');
  assert(Number(state.initial.responseTimes[0])>=100);
  assert(!await page.locator('main').innerText().then(v=>v.includes('나무 기차 우산')),'memory words leaked on later step');
 }
 if(screen==='voice-check'){
  assert.equal(await page.locator('[data-voice-task="0"]').count(),1,'missing redo recording action');
  await page.locator('[data-voice-next]').click();
  assert((await page.locator('.kimse-journey-count').innerText()).includes('2'),'voice second step missing');
  await page.locator('[data-voice-next]').click();
  assert((await page.locator('.kimse-journey-count').innerText()).includes('3'),'voice third step missing');
  assert.equal(await page.locator('[data-voice-task="2"]').count(),1,'missing third recording task');
  await page.locator('[data-voice-back]').click();
  assert((await page.locator('.kimse-journey-count').innerText()).includes('2'),'voice back failed');
  await page.locator('#skip-voice').click();
  await page.waitForURL(/#\/initial-result/,{timeout:15000});
  const st=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
  assert(st.onboarding.initialDone&&st.initial.voiceSkipped,'voice skip did not complete');
  assert.equal(st.initial.voiceSamples.filter(Boolean).length,2,'existing voice recordings lost');
 }
 if(screen==='initial-result'){
  assert.equal(await page.locator('.kimse-summary-row').count(),6,'result rows lost');
  assert((await page.locator('.kimse-summary-row').allInnerTexts()).some(v=>v.includes('숫자 계산')&&v.includes('응답 기록')),'non-diagnostic response label missing');
  assert(!((await page.locator('main').innerText()).includes('정답')),'answer correctness should not be presented as a diagnosis');
  assert.equal(await page.locator('#start-monitoring-after-initial').count(),1,'primary CTA missing');
  assert.equal(await page.locator('[data-go="brain-map"]').count(),1,'secondary action missing');
 }
 assert.equal(errors.length,0,'unhandled JS errors '+errors.join('; '));
 report.push({screen,mode,width,status:'PASS'});
 console.log('KIMSE_QUIET_SIGNAL_PASS '+screen+' '+mode+' '+width);
 await ctx.close();
}
(async()=>{
 fs.mkdirSync('qa-artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
 for(const screen of screens)for(const mode of modes)for(const width of widths)await run(browser,screen,mode,width);
 fs.writeFileSync('qa-artifacts/quiet-signal-report.json',JSON.stringify({passes:report.length,checks:report},null,2));
 console.log('KIMSE_QUIET_SIGNAL_TOTAL='+report.length);
 }finally{await browser.close()}
})().catch(err=>{console.error('KIMSE_QUIET_SIGNAL_FAIL',err.stack||err);process.exitCode=1});
