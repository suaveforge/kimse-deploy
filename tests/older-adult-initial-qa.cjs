'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-initial-qa/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='https://kimse.suaveforge.com/#/initial-check';
const report=[];
async function visit(browser,width,mode){
 const context=await browser.newContext({viewport:{width,height:740},deviceScaleFactor:1,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||String(e)));
 await page.addInitScript(mode=>{
   if(!localStorage.getItem('kimse.p0.state'))localStorage.setItem('kimse.p0.state',JSON.stringify({
     version:14,account:{name:'검사',email:'test@example.invalid'},intent:'self',self:true,care:false,
     onboarding:{profileDone:true,initialDone:false,consentDone:true,completed:false},
     initial:{step:0,answers:{},responseTimes:[],recall:'',voiceSamples:[],voiceSkipped:false},
     consents:{service:true,privacy:true,health:true},
     a11y:{largeText:mode==='large',highContrast:mode==='contrast',voiceGuidance:false,soundEffects:false,largeTouchTargets:mode!=='normal'}
   }));
 },mode);
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('.kimse-initial-title').waitFor({timeout:25000});
 const checkStep=async(n)=>{
   const caption=(await page.locator('.kimse-initial-progress-label strong').innerText()).trim();
   assert.equal(caption,n+' / 6','wrong step index');
   const ui=await page.evaluate(()=>{
     const el=document.querySelector('.screen-initial-check'),title=el.querySelector('.kimse-initial-title');
     const choices=[...el.querySelectorAll('.kimse-initial-answer')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e.firstElementChild).fontSize)}));
     const recalled=el.querySelector('#recall-input');
     return {width:document.documentElement.scrollWidth,viewport:innerWidth,titleFont:parseFloat(getComputedStyle(title).fontSize),choices,
       wordsVisible:!!el.querySelector('.kimse-initial-memory'),recallPlaceholder:recalled?.getAttribute('placeholder')||''};
   });
   assert(ui.width<=ui.viewport+2,JSON.stringify({width,mode,n,error:'horizontal overflow',ui}));
   assert(ui.titleFont>=26,'title too small '+ui.titleFont);
   for(const c of ui.choices){assert(c.h>=76,'small touch target '+c.h);assert(c.w>=Math.min(120,width-70),'narrow target '+c.w);assert(c.font>=18,'small answer text '+c.font)}
   if(n!==1)assert(!ui.wordsVisible,'memory words repeated after first exposure');
   if(n===6)assert(!ui.recallPlaceholder.includes('나무'),'memory answer exposed in placeholder');
   return ui;
 };
 await checkStep(1);
 assert.equal(await page.locator('.kimse-initial-memory strong').count(),3);
 if((width===320||width===375||width===1280)&&mode==='normal')await page.screenshot({path:'qa-artifacts/initial-step1-'+width+'.png',fullPage:true});
 await page.locator('[data-initial-next]').click();
 await checkStep(2);
 assert.equal(await page.locator('.kimse-initial-answer').count(),4);
 if(width===320&&mode==='normal')await page.screenshot({path:'qa-artifacts/initial-step2-'+width+'.png',fullPage:true});
 await page.locator('[data-initial-answer="subtraction:79"]').click();
 await checkStep(3);
 const stateAfterFirst=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
 assert.equal(stateAfterFirst.initial.answers.subtraction,'79');
 assert(Number(stateAfterFirst.initial.responseTimes[0])>=100,'subtraction reaction time missing');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.kimse-initial-title').waitFor();
 await checkStep(3);
 await page.locator('[data-initial-back]').click();
 await checkStep(2);
 assert.equal(await page.locator('[data-initial-answer="subtraction:79"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-initial-answer="subtraction:81"]').click();
 await checkStep(3);
 await page.locator('[data-initial-answer="events:no"]').click();
 await checkStep(4);
 await page.locator('[data-initial-answer="finances:some"]').click();
 await checkStep(5);
 await page.locator('[data-initial-answer="travel:often"]').click();
 await checkStep(6);
 if(width===375&&mode==='normal')await page.screenshot({path:'qa-artifacts/initial-step6-'+width+'.png',fullPage:true});
 await page.locator('#recall-input').fill('없음');
 await page.locator('#save-recall').click();
 await page.waitForURL(/#\/voice-check/,{timeout:15000});
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
 assert.equal(state.initial.recall,'없음');
 assert.equal(state.initial.answers.subtraction,'81');
 assert.equal(state.initial.answers.events,'no');
 assert.equal(state.initial.answers.finances,'some');
 assert.equal(state.initial.answers.travel,'often');
 assert.equal(state.initial.responseTimes.length,4,'revisit should replace reaction time rather than append');
 assert(state.initial.responseTimes.every(x=>Number(x)>=100),'reaction time values missing');
 const unexpected=errors.filter(e=>!e.includes('ReferenceError: require is not defined'));
 if(unexpected.length)console.log('KIMSE_INITIAL_JS_ERRORS '+JSON.stringify(unexpected).slice(0,1400));
 assert.equal(unexpected.length,0,'unexpected page errors');
 report.push({width,mode,steps:6,answers:'preserved',returnFlow:'passed',reload:'passed',wordLeak:'none',overflow:'none',unexpectedErrors:0});
 console.log('KIMSE_INITIAL_QA_PASS '+width+' '+mode+' 6/6');
 await context.close();
}
(async()=>{
 fs.mkdirSync('qa-artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
   for(const mode of ['normal','large','contrast'])for(const width of [320,375,430,720,768,1280])await visit(browser,width,mode);
   fs.writeFileSync('qa-artifacts/initial-qa.json',JSON.stringify({passed:true,cases:report},null,2));
   console.log('KIMSE_INITIAL_QA_TOTAL='+report.length);
 }finally{await browser.close()}
})().catch(err=>{console.error('KIMSE_INITIAL_QA_FAIL',err);process.exitCode=1});
