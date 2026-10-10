'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-second-qa/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const urls=['consent','professional-outcome','brain-trends','brain-map','monitoring-status','medical-records'];
const widths=[320,375,768],modes=['normal','large','contrast'],passed=[];
async function run(browser,route,width,mode){
 const ctx=await browser.newContext({viewport:{width,height:790},reducedMotion:'reduce'}),page=await ctx.newPage();
 const seed={version:14,account:{name:'점검',email:'qa@example.invalid'},intent:'self',self:true,care:false,mode:'self',
 consents:{service:false,privacy:false,health:false,microphone:false,location:false,motion:false,usage:false,notifications:false,caregiverShare:false},
 profile:{birthYear:'1956'},onboarding:{profileDone:true,initialDone:true,consentDone:false,completed:false},
 initial:{step:5,recall:'나무',answers:{subtraction:'79',events:'no',finances:'no',travel:'no'},responseTimes:[1300,1100,1200,900],voiceSamples:[],completedAt:'2026-10-01T00:00:00.000Z'},
 baseline:{startedAt:'2026-09-01T00:00:00.000Z'},a11y:{largeText:mode==='large',highContrast:mode==='contrast',voiceGuidance:false,soundEffects:false}};
 await page.addInitScript(s=>{localStorage.setItem('kimse.p0.state',JSON.stringify(s))},seed);
 const errors=[];page.on('pageerror',e=>{if(!String(e).includes('require is not defined'))errors.push(String(e))});
 await page.goto('https://kimse.suaveforge.com/#/'+route,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('main').waitFor({timeout:10000});
 if(route==='consent'){
  const accordion=page.locator('.kimse-consent-options');
  assert.equal(await accordion.count(),1,'Missing consent optional section');
  assert.equal(await accordion.getAttribute('open'),null,'Optional consent must not be pre-opened');
  assert.equal(await page.locator('.consent-row input[type="checkbox"]').count(),9,'Consent granularity lost');
  assert.equal(await page.locator('#consent-location').isVisible(),false,'Optional consent still crowded at first view');
  await accordion.locator('summary').click();
  assert.equal(await page.locator('#consent-location').isVisible(),true);
  await page.locator('#consent-location').check();
  assert.equal(await page.locator('#consent-location').isChecked(),true);
  assert.equal(await page.locator('#consent-service').isChecked(),false,'Must not auto-consent');
 }
 if(route==='professional-outcome'){
  assert.equal(await page.locator('.kimse-optional-section').count(),2,'Missing progressive details');
  assert.equal(await page.locator('#professional-result').isVisible(),true);
  assert.equal(await page.locator('#professional-biomarkers').isVisible(),false,'Optional detail visible by default');
  assert.equal(await page.locator('#professional-source-note').count(),1,'Original source field lost');
  await page.locator('.kimse-optional-section').last().locator('summary').click();
  await page.locator('#professional-biomarkers').fill('MRI : 검사 기록');
  assert.equal(await page.locator('#professional-biomarkers').inputValue(),'MRI : 검사 기록');
 }
 const ui=await page.evaluate(()=>{
  const main=document.querySelector('main');
  const visible=e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0};
  const buttons=[...main.querySelectorAll('.btn-kimse,.brain-domain-tabs button,.trend-domain-tabs button,.compact-range button,.brain-view-switch button,.monitoring-detail-link')].filter(visible);
  return {width:innerWidth,scroll:document.documentElement.scrollWidth,small:buttons.filter(b=>b.getBoundingClientRect().height<63).map(b=>({text:b.textContent.trim().slice(0,25),height:b.getBoundingClientRect().height}))};
 });
 assert(ui.scroll<=width+2,'Horizontal overflow '+JSON.stringify({route,ui}));
 assert(ui.small.length===0,'Small control '+JSON.stringify({route,width,mode,small:ui.small.slice(0,8)}));
 assert.equal(errors.length,0,'Page errors '+errors.join(';'));
 if(width===375&&mode==='normal')await page.screenshot({path:'qa-artifacts/'+route+'.png',fullPage:true});
 passed.push({route,width,mode,ok:true});
 console.log('KIMSE_UX_SECOND_PASS '+route+' '+width+' '+mode);
 await ctx.close();
}
(async()=>{
 fs.mkdirSync('qa-artifacts',{recursive:true});const browser=await chromium.launch({headless:true});
 try{for(const mode of modes)for(const width of widths)for(const route of urls)await run(browser,route,width,mode);
 fs.writeFileSync('qa-artifacts/second-wave.json',JSON.stringify({pass:true,tests:passed},null,2));
 console.log('KIMSE_UX_SECOND_TOTAL='+passed.length);
 }finally{await browser.close()}
})().catch(e=>{console.error('KIMSE_UX_SECOND_FAILED',e.stack||e);process.exitCode=1});
