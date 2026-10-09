'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-polish-qa/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const sizes=[320,375,430,720,768,1280],modes=['normal','large','contrast'],results=[],base='https://kimse.suaveforge.com/#/';
async function check(browser,width,mode,screen){
 const context=await browser.newContext({viewport:{width,height:780},reducedMotion:'reduce'});
 await context.addInitScript(({mode,screen})=>{
 const profile={birthYear:'1956',sex:'female',education:'7to9',activity:'active',living:'partner_family',socialSupport:'both',socialActivity:'weekly',sleepHours:'7시간',sleepDisturbance:'rare',hearing:'no',subjectiveChange:'ABSENT',functionStatus:'INDEPENDENT'};
 localStorage.setItem('kimse.p0.state',JSON.stringify({version:14,account:{name:'화면점검',email:'qa@example.invalid'},intent:'self',self:true,care:false,profile,
 onboarding:{profileDone:screen==='initial-check',initialDone:false,consentDone:true,completed:false,profileStep:1},
 initial:{step:1,answers:{},responseTimes:[],recall:'',voiceSamples:[]},consents:{service:true,privacy:true,health:true},
 a11y:{largeText:mode==='large',highContrast:mode==='contrast',voiceGuidance:false,soundEffects:false}}));
 },{mode,screen});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>{if(!String(error).includes('require is not defined'))errors.push(String(error))});
 await page.goto(base+screen,{waitUntil:'domcontentloaded',timeout:50000});
 const initial=screen==='initial-check';
 await page.locator(initial?'.kimse-initial-journey':'.kimse-profile-wizard').waitFor({timeout:20000});
 const m=await page.evaluate(({initial})=>{
 const el=document.querySelector('main'),b=el.querySelector(initial?'.kimse-initial-answer':'.kimse-wizard-choice'),t=el.querySelector(initial?'.kimse-initial-title':'.kimse-wizard-title'),css=getComputedStyle(b);
 return {scroll:document.documentElement.scrollWidth,buttonHeight:b.getBoundingClientRect().height,border:parseFloat(css.borderTopWidth),radius:parseFloat(css.borderTopLeftRadius),title:parseFloat(getComputedStyle(t).fontSize),focus:getComputedStyle(el).outlineStyle};
 },{initial});
 assert(m.scroll<=width+2,'Overflow '+JSON.stringify({screen,width,mode,m}));
 assert(m.buttonHeight>=76,'Small target '+JSON.stringify(m));
 assert(m.radius>=16&&m.title>=27,'Design token mismatch '+JSON.stringify(m));
 assert.equal(m.focus,'none','Full page focus outline visible');
 if(mode==='normal')assert(m.border<2.5,'Heavy default border');
 if(mode==='contrast')assert(m.border>=2.5,'Contrast border too thin');
 if(mode==='normal'&&[320,375,1280].includes(width))await page.screenshot({path:'qa-artifacts/'+screen+'-'+width+'.png',fullPage:true});
 if(initial){
 await page.locator('[data-initial-answer="subtraction:79"]').click();
 await page.locator('.kimse-journey-count').getByText('3 / 6').waitFor({timeout:3000});
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
 assert.equal(state.initial.answers.subtraction,'79');
 assert(state.initial.responseTimes[0]>=100);
 }else{
 await page.locator('[data-profile-choice="male"]').click();
 assert.equal(await page.locator('[data-profile-choice="male"]').getAttribute('aria-pressed'),'true');
 await page.locator('#profile-wizard-next').click();
 assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'3 / 12');
 }
 assert.equal(errors.length,0,'Unexpected JS errors: '+errors.join(';'));
 results.push({screen,width,mode,result:'PASS'});
 console.log('KIMSE_POLISH_QA_PASS '+screen+' '+width+' '+mode);
 await context.close();
}
(async()=>{
 fs.mkdirSync('qa-artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
 for(const screen of ['onboarding-profile','initial-check'])for(const mode of modes)for(const width of sizes)await check(browser,width,mode,screen);
 const context=await browser.newContext({viewport:{width:375,height:780},reducedMotion:'no-preference'});
 await context.addInitScript(()=>localStorage.setItem('kimse.p0.state',JSON.stringify({version:14,self:true,intent:'self',account:{name:'검사',email:'qa@example.invalid'},onboarding:{profileDone:true,consentDone:true},consents:{service:true,privacy:true,health:true},initial:{step:1,answers:{},responseTimes:[]}})));
 const page=await context.newPage();await page.goto(base+'initial-check',{waitUntil:'domcontentloaded'});
 await page.locator('[data-initial-answer="subtraction:79"]').click();
 assert.equal(await page.locator('.kimse-initial-answer.is-confirming').count(),1,'Selection feedback missing');
 const content=await page.locator('main').innerText();
 assert(!/정답입니다|오답입니다|치매 위험 판정/.test(content),'Diagnostic feedback leaked');
 await page.locator('.kimse-journey-count').getByText('3 / 6').waitFor({timeout:2500});
 await context.close();
 fs.writeFileSync('qa-artifacts/design-results.json',JSON.stringify({pass:true,checks:results.length,results},null,2));
 console.log('KIMSE_POLISH_QA_TOTAL='+results.length);
 }finally{await browser.close()}
})().catch(err=>{console.error('KIMSE_POLISH_QA_FAIL',err);process.exit(1)});
