'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-health-qa/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({headless:true});fs.mkdirSync('qa-artifacts',{recursive:true});let pass=0;
try{
for(const width of [320,375,430,768,1280])for(const mode of ['normal','large','contrast']){
const context=await browser.newContext({viewport:{width,height:820},reducedMotion:'reduce'});
await context.addInitScript(mode=>{
 if(!localStorage.getItem('kimse.p0.state'))localStorage.setItem('kimse.p0.state',JSON.stringify({
 version:14,account:{name:'검수',email:'qa@example.invalid'},self:true,intent:'self',mode:'self',
 selectedHealth:'sleep',health:{sleep:'',steps:'',pressure:'',memo:''},onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
 a11y:{largeText:mode==='large',highContrast:mode==='contrast',largeTouchTargets:mode!=='normal'},
 consents:{service:true,privacy:true,health:true}
 }));
},mode);
const page=await context.newPage();const errors=[];page.on('pageerror',e=>{if(!String(e).includes('require is not defined'))errors.push(String(e))});
await page.goto('https://kimse.suaveforge.com/#/health-detail',{waitUntil:'domcontentloaded',timeout:45000});
await page.locator('.kimse-health-sleep-option').first().waitFor({timeout:20000});
assert.equal(await page.locator('.kimse-health-sleep-option').count(),12,'expected 12 simple duration choices');
assert.equal(await page.locator('#save-health:visible').count(),0,'no competing confirm button visible');
const metrics=await page.evaluate(()=>({outer:document.documentElement.scrollWidth,viewport:innerWidth,rects:[...document.querySelectorAll('.kimse-health-sleep-option')].map(x=>{const r=x.getBoundingClientRect();return {height:r.height,left:r.left,right:r.right}})}));
assert(metrics.outer<=width+2,'horizontal overflow');
for(const r of metrics.rects){assert(r.height>=70,'too-small senior button');assert(r.left>=-1&&r.right<=width+2,'off-screen button')}
if(width===375&&mode==='normal')await page.screenshot({path:'qa-artifacts/senior-health-sleep-375.png',fullPage:true});
await page.locator('[data-health-sleep="7시간 30분"]').click();
await page.waitForURL(/#\/health$/,{timeout:8000});
const st=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
assert.equal(st.health.sleep,'7시간 30분','did not save source-compatible sleep value');
assert.equal(errors.length,0,'unexpected JS error '+errors.join('|'));
console.log('KIMSE_HEALTH_ONE_TAP_PASS '+width+' '+mode);pass++;await context.close();
}
fs.writeFileSync('qa-artifacts/report.json',JSON.stringify({passed:pass},null,2));console.log('KIMSE_HEALTH_ONE_TAP_TOTAL='+pass);
}finally{await browser.close()}
})().catch(err=>{console.error('KIMSE_HEALTH_ONE_TAP_FAIL',err);process.exitCode=1});
