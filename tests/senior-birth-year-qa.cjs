'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-birth-qa/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url='https://kimse.suaveforge.com/#/onboarding-profile';
const report=[];
async function caseRun(browser,width,mode,which){
  const ctx=await browser.newContext({viewport:{width,height:790},reducedMotion:'reduce'});
  await ctx.addInitScript(mode=>{
    if(!localStorage.getItem('kimse.p0.state'))localStorage.setItem('kimse.p0.state',JSON.stringify({
      version:14,account:{name:'브라우저 검증',email:'qa@example.invalid'},intent:'self',self:true,care:false,
      profile:{birthYear:''},onboarding:{profileDone:false,consentDone:true,initialDone:false,profileStep:0},
      consents:{service:true,privacy:true,health:true},
      a11y:{largeText:mode==='large',highContrast:mode==='contrast',voiceGuidance:false,soundEffects:false,largeTouchTargets:mode!=='normal'}
    }));
  },mode);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',err=>{if(!String(err).includes('require is not defined'))errors.push(String(err))});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('[data-birth-phase="decade"]').waitFor({timeout:22000});
  assert.equal(await page.locator('#profile-wizard-input').count(),0,'Birth year keyboard still visible');
  assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'1 / 12');
  assert.equal(await page.locator('#profile-wizard-next').count(),0,'Next should not compete with selecting the decade');
  let expected,decade;
  if(which==='early'){await page.locator('[data-birth-range="earlier"]').click();decade=1900;expected=1906}
  else if(which==='late'){await page.locator('[data-birth-range="later"]').click();decade=2000;expected=2008}
  else{decade=1950;expected=1956}
  assert.equal(await page.locator('[data-birth-decade="'+decade+'"]').count(),1,'Missing valid decade');
  await page.locator('[data-birth-decade="'+decade+'"]').click();
  await page.locator('[data-birth-phase="year"]').waitFor();
  assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'1 / 12','Choosing decade must not skip profile question');
  assert.equal(await page.locator('#profile-wizard-input').count(),0,'No typing expected in year phase');
  assert.equal(await page.locator('#profile-wizard-next').isDisabled(),true,'Cannot proceed without specific year');
  assert.equal(await page.locator('[data-birth-year="'+expected+'"]').count(),1,'Exact eligible birth year missing');
  const measure=await page.evaluate(()=>{
    const controls=[...document.querySelectorAll('.kimse-birth-year')];
    const r=controls.map(e=>({h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,border:parseFloat(getComputedStyle(e).borderTopWidth)}));
    return {outer:document.documentElement.scrollWidth,inner:innerWidth,r};
  });
  assert(measure.outer<=measure.inner+2,'Horizontal overflow');
  for(const rect of measure.r){assert(rect.h>=74,'Touch target too small');assert(rect.x>=0&&rect.right<=measure.inner+2,'Clipped button');if(mode==='contrast')assert(rect.border>=2.5,'High-contrast border too weak')}
  if(which==='typical'&&mode==='normal'&&[320,375,1280].includes(width)){
    await page.screenshot({path:'qa-artifacts/birth-decade-'+width+'.png',fullPage:true});
  }
  await page.locator('[data-birth-year="'+expected+'"]').click();
  assert.equal(await page.locator('[data-birth-year="'+expected+'"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#profile-wizard-next').isDisabled(),false);
  let st=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
  assert.equal(st.profile.birthYear,String(expected));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-birth-year="'+expected+'"]').waitFor();
  assert.equal(await page.locator('[data-birth-year="'+expected+'"]').getAttribute('aria-pressed'),'true','Selection must survive reload');
  if(which==='typical'){
    await page.locator('[data-birth-back]').click();
    assert.equal(await page.locator('[data-birth-phase="decade"]').count(),1,'Change decade should work');
    await page.locator('[data-birth-decade="1960"]').click();
    assert.equal(await page.locator('#profile-wizard-next').isDisabled(),true,'Must not reuse old year from different decade');
    await page.locator('[data-birth-year="1965"]').click();
    expected=1965;
  }
  await page.locator('#profile-wizard-next').click();
  assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'2 / 12','Year choice should advance exactly one profile question');
  st=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
  assert.equal(st.profile.birthYear,String(expected),'Clinical birthYear changed encoding');
  assert.equal(errors.length,0,'Unexpected browser script errors: '+errors.join(';'));
  report.push({width,mode,which,year:expected,pass:true});
  console.log('KIMSE_BIRTH_PICKER_PASS '+which+' '+width+' '+mode+' birthYear='+expected);
  await ctx.close();
}
(async()=>{
  fs.mkdirSync('qa-artifacts',{recursive:true});
  const browser=await chromium.launch({headless:true});
  try{
    for(const mode of ['normal','large','contrast'])for(const width of [320,375,430,720,768,1280])for(const which of ['typical','early','late'])
      await caseRun(browser,width,mode,which);
    fs.writeFileSync('qa-artifacts/birth-year-qa.json',JSON.stringify({passes:report.length,report},null,2));
    console.log('KIMSE_BIRTH_PICKER_TOTAL='+report.length);
  }finally{await browser.close()}
})().catch(err=>{console.error('KIMSE_BIRTH_PICKER_FAIL',err.stack||err);process.exitCode=1});
