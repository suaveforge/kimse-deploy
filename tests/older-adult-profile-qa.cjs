'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-profile-qa/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base='https://kimse.suaveforge.com/#/onboarding-profile';
const fields=[
 ['birthYear','1956'],['sex','female'],['education','7to9'],['activity','active'],
 ['living','partner_family'],['socialSupport','both'],['socialActivity','weekly'],
 ['sleepHours','7시간 30분'],['sleepDisturbance','sometimes'],
 ['hearing','some'],['subjectiveChange','ABSENT'],['functionStatus','INDEPENDENT']];
const report=[];
async function checkMode(browser,width,mode){
 const ctx=await browser.newContext({viewport:{width,height:770},reducedMotion:'reduce'});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>{if(!String(e).includes('ReferenceError: require is not defined'))errors.push(String(e))});
 await page.addInitScript(mode=>{
  if(!localStorage.getItem('kimse.p0.state'))localStorage.setItem('kimse.p0.state',JSON.stringify({
    version:14,account:{name:'전체 검사',email:'qa@example.invalid'},intent:'self',self:true,care:false,
    onboarding:{profileDone:false,initialDone:false,consentDone:true,completed:false,profileStep:0},
    consents:{service:true,privacy:true,health:true},
    a11y:{largeText:mode==='large',highContrast:mode==='contrast',largeTouchTargets:mode!=='normal',voiceGuidance:false,soundEffects:false}
  }));
 },mode);
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('.kimse-wizard-title').waitFor({timeout:24000});
 let editedSex=false;
 for(let i=0;i<fields.length;i++){
  const [field,value]=fields[i];
  assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),(i+1)+' / 12','Current progress '+i);
  const text=await page.locator('.kimse-profile-wizard').innerText();
  assert(!/CAIDE|ANU-ADRI|Evidence Registry|baseline/i.test(text),'Jargon '+field);
  const ui=await page.evaluate(()=>{
    const options=[...document.querySelectorAll('.kimse-wizard-choice,.kimse-sleep-option,.kimse-birth-option')];
    return {scroll:document.documentElement.scrollWidth,width:innerWidth,options:options.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))};
  });
  assert(ui.scroll<=ui.width+2,'Horizontal overflow');
  for(const option of ui.options){assert(option.h>=57,'Small option '+field+': '+option.h);assert(option.w>=70,'Narrow option '+field)}
  if(i===2&&(width===320||width===375)&&mode==='normal'){
    await page.locator('[data-profile-prev]').click();
    assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'2 / 12');
    await page.locator('[data-profile-choice="male"]').click();
    assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'3 / 12');
    editedSex=true;
  }
  if(field==='birthYear'){
    assert.equal(await page.locator('#profile-wizard-input').count(),0,'Must not type birth year');
    await page.locator('[data-birth-decade="1950"]').click();
    await page.locator('[data-birth-year="1956"]').click();
  }else if(field==='sleepHours'){
    assert.equal(await page.locator('#profile-wizard-input').count(),0,'Sleep should be offered as tap choices');
    await page.locator('[data-sleep-choice="7시간 30분"]').click();
  }else await page.locator('[data-profile-choice="'+value+'"]').click();
  if(i<fields.length-1){
    assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),(i+2)+' / 12','Choice must auto-advance exactly once');
    assert.equal(await page.locator('#profile-wizard-next').count(),0,'Redundant confirmation');
  }
  if(i===4&&width===375&&mode==='normal'){
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.kimse-wizard-title').waitFor();
    assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'6 / 12','Reload resume');
  }
  if(i===0&&mode==='normal'&&[320,375,1280].includes(width))await page.screenshot({path:'qa-artifacts/profile-after-birth-'+width+'.png',fullPage:true});
 }
 await page.waitForURL(/#\/initial-check/,{timeout:13000});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
 assert.equal(saved.onboarding.profileDone,true);
 for(const [key,value] of fields)assert.equal(saved.profile[key],key==='sex'&&editedSex?'male':value,'Unchanged data field '+key);
 assert.equal(errors.length,0,'Unexpected page errors '+errors.join(';'));
 console.log('KIMSE_PROFILE_QA_PASS '+width+' '+mode+' 12/12');
 report.push({width,mode,allFields:true,autoNext:true,stored:true});
 await ctx.close();
}
(async()=>{fs.mkdirSync('qa-artifacts',{recursive:true});const browser=await chromium.launch({headless:true});
 try{for(const mode of ['normal','large','contrast'])for(const width of [320,375,430,720,768,1280])await checkMode(browser,width,mode);
 fs.writeFileSync('qa-artifacts/report.json',JSON.stringify({passed:true,cases:report},null,2));
 console.log('KIMSE_PROFILE_QA_TOTAL='+report.length)}
 finally{await browser.close()}
})().catch(e=>{console.error('KIMSE_PROFILE_QA_FAIL',e.stack||e);process.exitCode=1});
