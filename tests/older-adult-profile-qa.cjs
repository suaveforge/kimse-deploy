'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-profile-qa/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='https://kimse.suaveforge.com/#/onboarding-profile';
const fields=[
 ['birthYear','1956'],['sex','female'],['education','7to9'],['activity','active'],
 ['living','partner_family'],['socialSupport','both'],['socialActivity','weekly'],
 ['sleepHours','7시간 30분'],['sleepDisturbance','sometimes'],
 ['hearing','some'],['subjectiveChange','ABSENT'],['functionStatus','INDEPENDENT']
];
const report=[];
async function checkMode(browser,width,mode){
 const ctx=await browser.newContext({viewport:{width,height:740},reducedMotion:'reduce'});
 const page=await ctx.newPage(),errs=[];
 page.on('pageerror',error=>errs.push(error.stack||String(error)));
 await page.addInitScript(({mode})=>{
   if(!localStorage.getItem('kimse.p0.state'))localStorage.setItem('kimse.p0.state',JSON.stringify({
     version:14,account:{name:'사용성점검',email:'qa@example.invalid'},intent:'self',self:true,care:false,
     onboarding:{profileDone:false,initialDone:false,consentDone:true,completed:false,profileStep:0},
     consents:{service:true,privacy:true,health:true},
     a11y:{largeText:mode==='large',highContrast:mode==='contrast',largeTouchTargets:mode!=='normal',voiceGuidance:false,soundEffects:false}
   }));
 },{mode});
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('.kimse-wizard-title').waitFor({timeout:30000});
 for(let i=0;i<fields.length;i++){
   const [field,value]=fields[i];
   const progress=page.locator('.kimse-journey-count');
   assert.equal((await progress.innerText()).trim(),(i+1)+' / 12','step '+i+' count');
   const title=await page.locator('.kimse-wizard-title').innerText();
   const text=await page.locator('.kimse-profile-wizard').innerText();
   assert(!/CAIDE|ANU-ADRI|Evidence Registry|baseline/i.test(text),'No internal terminology in '+title);
   const measures=await page.evaluate(()=>{
     const main=document.querySelector('.screen-onboarding-profile');
     const choice=[...main.querySelectorAll('.kimse-wizard-choice')];
     return {
       scrollWidth:document.documentElement.scrollWidth,
       innerWidth:innerWidth,
       titleSize:parseFloat(getComputedStyle(main.querySelector('.kimse-wizard-title')).fontSize),
       choices:choice.map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,fontSize:parseFloat(getComputedStyle(el.querySelector('.kimse-wizard-choice-label')).fontSize)}))
     };
   });
   assert(measures.scrollWidth<=measures.innerWidth+2,'Horizontal overflow '+width+' '+mode+' step '+i+': '+JSON.stringify(measures));
   assert(measures.titleSize>=26,'Small title at '+width+' '+mode);
   for(const c of measures.choices){
     assert(c.height>=72,'Touch target height '+c.height+' step '+i);
     assert(c.width>=Math.min(260,width-60),'Touch target width '+c.width);
     assert(c.fontSize>=18,'Option text is too small '+c.fontSize);
   }
   if(field==='birthYear'||field==='sleepHours'){
     await page.locator('#profile-wizard-input').fill(value);
   }else{
     const button=page.locator('.kimse-wizard-choice[data-profile-choice="'+value+'"]');
     await button.click();
     assert.equal(await button.getAttribute('aria-pressed'),'true');
   }
   if(width===375&&mode==='normal'&&i===4){
     await page.reload({waitUntil:'domcontentloaded'});
     await page.locator('.kimse-wizard-title').waitFor();
     assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'5 / 12','Resume current question after reload');
     assert.equal(await page.locator('.kimse-wizard-choice[data-profile-choice="partner_family"]').getAttribute('aria-pressed'),'true');
   }
   if((width===320||width===375)&&mode==='normal'&&i===2){
     await page.locator('[data-profile-prev]').click();
     assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'2 / 12','Previous step');
     await page.locator('.kimse-wizard-choice[data-profile-choice="male"]').click();
     await page.locator('#profile-wizard-next').click();
     assert.equal((await page.locator('.kimse-journey-count').innerText()).trim(),'3 / 12','Forward after correction');
   }
   if(i===0&&(width===320||width===375||width===1280)){await page.screenshot({path:'qa-artifacts/kimse-wizard-'+width+'-'+mode+'.png',fullPage:true})}
   const next=page.locator('#profile-wizard-next');
   assert.equal(await next.isDisabled(),false,'Next must become active once answered');
   await next.click();
 }
 await page.waitForURL(/#\/initial-check/,{timeout:20000});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')));
 assert.equal(saved.onboarding.profileDone,true,'Profile completion state');
 for(const [key,value] of fields){
   assert.equal(saved.profile[key],((key==='sex'&&(width===320||width===375)&&mode==='normal')?'male':value),'Preserved clinical data key/value '+key);
 }
 const unexpected=errs.filter(e=>!e.includes('ReferenceError: require is not defined'));
 if(errs.length)console.log('KIMSE_PROFILE_JS_WARNING '+JSON.stringify(errs).slice(0,2500));
 assert.equal(unexpected.length,0,'Unexpected browser JS errors: '+unexpected.join(' / '));
 report.push({width,mode,steps:fields.length,completion:true,overflow:false,unexpectedErrors:unexpected.length,preexistingRequireError:errs.length-unexpected.length});
 await ctx.close();
}
(async()=>{
 fs.mkdirSync('qa-artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
   for(const mode of ['normal','large','contrast'])for(const width of [320,375,430,720,768,1280]){
     await checkMode(browser,width,mode);
     console.log('KIMSE_PROFILE_QA_PASS '+width+' '+mode+' 12/12');
   }
   fs.writeFileSync('qa-artifacts/report.json',JSON.stringify({passed:true,cases:report},null,2));
   console.log('KIMSE_PROFILE_QA_TOTAL='+report.length+' MODE_WIDTH_COMBINATIONS');
 }finally{await browser.close()}
})().catch(err=>{console.error('KIMSE_PROFILE_QA_FAIL',err);process.exit(1)});
