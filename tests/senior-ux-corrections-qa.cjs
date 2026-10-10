'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-ux-fix/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const profile={birthYear:'1956',sex:'female',education:'7to9',activity:'active',living:'partner_family',socialSupport:'both',socialActivity:'weekly',sleepHours:'7시간',sleepDisturbance:'rare',hearing:'no',subjectiveChange:'ABSENT',functionStatus:'INDEPENDENT'};
function seed(screen,mode){
 const i=screen==='profile-choice'?1:screen==='sleep-choice'?7:screen==='last-choice'?11:0;
 return {version:14,account:{name:'점검',email:'qa@example.invalid'},intent:'self',self:true,care:false,mode:'self',
  profile:{...profile,sex:screen==='profile-choice'?'':profile.sex,sleepHours:screen==='sleep-choice'?'':profile.sleepHours,functionStatus:screen==='last-choice'?'':profile.functionStatus},
  onboarding:{profileStep:i,profileDone:false,initialDone:false,consentDone:true,completed:false},
  consents:{service:true,privacy:true,health:true},a11y:{largeText:mode==='large',highContrast:mode==='contrast',voiceGuidance:false,soundEffects:false},
  initial:{step:0,answers:{},responseTimes:[],recall:'',voiceSamples:[]},
  cognitiveRecheck:{step:5,answers:{subtraction:'79',events:'no',finances:'no',travel:'often'},responseMs:1200,recall:'',startedAt:Date.now()},
  careOverview:{subjectId:'qa-subject',alerts:[{id:'test-alert',summary:'생활에 변화가 관찰됐어요'}],summary:{changes:[]},stage:{}},
  remote:{accountId:'qa-account',subjectId:'qa-subject',careSubjects:[]},
  familyFeedback:[],schedule:[],answers:[],q:0};
}
const cases=['profile-choice','sleep-choice','last-choice','cognitive-recheck','assessment','family-feedback','care-schedule'],results=[];
async function check(browser,screen,width,mode){
 const context=await browser.newContext({viewport:{width,height:810},reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(state=>{if(!localStorage.getItem('kimse.p0.state'))localStorage.setItem('kimse.p0.state',JSON.stringify(state))},seed(screen,mode));
 const errors=[];page.on('pageerror',e=>{if(!String(e).includes('require is not defined'))errors.push(String(e))});
 const route=screen.includes('choice')?'onboarding-profile':screen;
 await page.goto('https://kimse.suaveforge.com/#/'+route,{waitUntil:'domcontentloaded',timeout:40000});
 await page.locator('main').waitFor();
 if(screen==='profile-choice'){
   await page.locator('[data-profile-choice="male"]').click();
   assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'3 / 12');
   assert.equal(await page.locator('#profile-wizard-next').count(),0);
   assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')))).profile.sex,'male');
 }
 if(screen==='sleep-choice'){
   await page.locator('[data-sleep-choice="7시간 30분"]').click();
   assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'9 / 12');
   assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')))).profile.sleepHours,'7시간 30분');
 }
 if(screen==='last-choice'){
   await page.locator('[data-profile-choice="INDEPENDENT"]').click();
   await page.waitForURL(/#\/initial-check/,{timeout:6000});
   assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')))).onboarding.profileDone,true);
 }
 if(screen==='cognitive-recheck'){
   const input=page.locator('#recheck-recall-input');await input.waitFor();
   const ph=await input.getAttribute('placeholder');
   assert(!/나무|기차|우산/.test(ph),'Recall answer leaked');
   assert(!/baseline|cutoff|FAQ6|원자료/.test(await page.locator('main').innerText()),'Internal terminology in recheck');
   await page.locator('[data-recheck-prev]').click();
   await page.locator('[data-recheck-answer="travel:no"]').click();
   await input.waitFor();
 }
 if(screen==='assessment'){
   await page.locator('[data-answer]').first().waitFor({timeout:20000});
   assert(!/\d+점/.test(await page.locator('main').innerText()),'Scoring shown before answer');
   assert.equal(await page.locator('#next').count(),0);
   await page.locator('[data-answer]').first().click();
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
   assert.equal(state.answers[0],0);
   assert(state.q>=1||page.url().includes('#/result'),'Assessment did not advance');
 }
 if(screen==='family-feedback'){
   await page.locator('[data-feedback-value="CONFIRMED"]').waitFor({timeout:10000});
   await page.locator('[data-feedback-value="CONFIRMED"]').click();
   await page.locator('[data-feedback-value="VISIT"]').click();
   assert.equal(await page.locator('#family-feedback-assessment').inputValue(),'CONFIRMED');
   assert.equal(await page.locator('#family-feedback-action').inputValue(),'VISIT');
   assert.equal(await page.locator('[data-feedback-value="VISIT"]').getAttribute('aria-pressed'),'true');
 }
 if(screen==='care-schedule'){
   assert.equal(await page.locator('#schedule-date').getAttribute('type'),'datetime-local');
   await page.locator('#schedule-title').fill('병원 동행');
   await page.locator('#schedule-date').fill('2026-10-12T14:30');
   await page.locator('#add-schedule').click();
   assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')))).schedule.length,1);
 }
 const m=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 assert(m.scroll<=m.width+2,'Horizontal overflow '+JSON.stringify({screen,width,mode,m}));
 assert.equal(errors.length,0,'JS error '+errors.join(', '));
 results.push({screen,width,mode,pass:true});console.log('KIMSE_UX_FIX_PASS '+screen+' '+width+' '+mode);
 if(width===375&&mode==='normal')await page.screenshot({path:'qa-artifacts/'+screen+'.png',fullPage:true});
 await context.close();
}
async function voice(browser){
 const ctx=await browser.newContext({viewport:{width:375,height:800},reducedMotion:'reduce'}),page=await ctx.newPage();
 await page.addInitScript(state=>{
   localStorage.setItem('kimse.p0.state',JSON.stringify(state));
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
   window.MediaRecorder=class{
     constructor(){this.state='inactive';this.mimeType='audio/webm'}
     start(){this.state='recording'}
     stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['fake audio'],{type:'audio/webm'})});this.onstop?.()}
   };
 },seed('voice-check','normal'));
 await page.goto('https://kimse.suaveforge.com/#/voice-check',{waitUntil:'domcontentloaded'});
 await page.locator('[data-voice-task="0"]').click();
 await page.locator('.kimse-voice-state.is-recording').waitFor({timeout:10000});
 await page.locator('[data-voice-task="0"]').click();
 assert.equal(await page.locator('.kimse-voice-state.is-recording').count(),1,'Short voice sample accepted');
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')))).initial.voiceSamples.filter(Boolean).length,0);
 await page.evaluate(()=>{const n=Date.now.bind(Date);Date.now=()=>n()+40000});
 await page.locator('[data-voice-task="0"]').click();
 await page.locator('.kimse-voice-state.is-complete').waitFor({timeout:12000});
 assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')))).initial.voiceSamples[0].durationSec>=30);
 console.log('KIMSE_UX_FIX_PASS voice-minimum');await ctx.close();
}
(async()=>{
 fs.mkdirSync('qa-artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const mode of ['normal','large','contrast'])for(const width of [320,375,768])for(const c of cases)await check(browser,c,width,mode);
  await voice(browser);
  fs.writeFileSync('qa-artifacts/report.json',JSON.stringify({success:true,cases:results.length,voiceGuard:true,results},null,2));
  console.log('KIMSE_UX_FIX_TOTAL='+results.length);
 }finally{await browser.close()}
})().catch(e=>{console.error('KIMSE_UX_FIX_FAILED',e.stack||e);process.exitCode=1});
