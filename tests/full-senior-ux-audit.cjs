'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-ux-audit/node_modules/playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base='https://kimse.suaveforge.com/#/';
const js=fs.readFileSync('app.js','utf8');
const routes=[...js.matchAll(/page(?:\.([a-zA-Z_$][\w$-]*)|\[['"]([^'"]+)['"]\])\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_$]+)\s*=>/g)].map(m=>m[1]||m[2]);
const unique=[...new Set(routes)],states=[{width:320,mode:'normal'},{width:375,mode:'normal'},{width:768,mode:'normal'},{width:375,mode:'large'},{width:375,mode:'contrast'}];
const report=[];
const priority=new Set(['start','role','auth','onboarding-profile','consent','initial-check','voice-check','initial-result','home','assessment','cognitive-recheck','cognitive-recheck-result','training-play','health-detail','caregiver-home','family-feedback','care-schedule','family-call','family-add','medication-add','clinical-handoff','clinical-context-event','medical-record-add','professional-outcome','monitoring-status']);
function slug(x){return x.replace(/[^a-z0-9-]/ig,'_')}
async function run(browser,screen,display){
const context=await browser.newContext({viewport:{width:display.width,height:810},reducedMotion:'reduce'});
await context.addInitScript(({mode,screen})=>{
  const state={
    version:14,account:{name:'품질점검',email:'qa@example.invalid'},intent:'both',self:true,care:true,mode:'self',
    profile:{birthYear:'1956',sex:'female',education:'7to9',activity:'active',living:'partner_family',socialSupport:'both',socialActivity:'weekly',sleepHours:'7시간',sleepDisturbance:'rare',hearing:'no',subjectiveChange:'ABSENT',functionStatus:'INDEPENDENT'},
    onboarding:{profileDone:screen!=='onboarding-profile',initialDone:screen!=='initial-check',consentDone:true,completed:true,profileStep:screen==='onboarding-profile'?7:0},
    initial:{step:screen==='initial-check'?5:1,answers:{subtraction:'79',events:'no',finances:'no',travel:'no'},responseTimes:[850,930,720,1030],recall:'없음',voiceSamples:[],completedAt:'2026-10-01T12:00:00.000Z'},
    cognitiveRecheck:{step:5,answers:{subtraction:'79',events:'no',finances:'some',travel:'no'},recall:'',startedAt:Date.now(),responseMs:800,lastResult:null},
    consents:{service:true,privacy:true,health:true,location:false,motion:false,usage:false,microphone:false,notifications:false,caregiverShare:false},
    baseline:{startedAt:'2026-09-01T12:00:00.000Z'},
    medicines:[{id:'qa1',name:'혈압약',time:'08:00',note:'',taken:false}],
    health:{sleep:'7시간',steps:'4520',pressure:'120/80',memo:''},
    caregivers:[{id:'qa',name:'가족',relation:'자녀',email:'family@example.invalid'}],
    schedule:[],alertRecipients:[],
    a11y:{largeText:mode==='large',highContrast:mode==='contrast',voiceGuidance:false,soundEffects:false,largeTouchTargets:mode!=='normal'}
  };
  localStorage.setItem('kimse.p0.state',JSON.stringify(state));
},{mode:display.mode,screen});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>{const text=String(e);if(!text.includes('require is not defined'))errors.push(text.slice(0,500))});
let result={route:screen,mode:display.mode,width:display.width};
try{
 await page.goto(base+screen,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('main').waitFor({timeout:18000});
 await page.waitForTimeout(100);
 result=Object.assign(result,await page.evaluate(()=>{
   const main=document.querySelector('main'),text=(main?.innerText||'').replace(/\s+/g,' ').trim();
   const mainRect=main?.getBoundingClientRect();
   const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   const fields=[...main.querySelectorAll('input,textarea,select')].filter(visible);
   const buttons=[...main.querySelectorAll('button,a[href]')].filter(visible);
   const sizes=buttons.map(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return {t:el.innerText?.trim().replace(/\s+/g,' ').slice(0,80)||el.getAttribute('aria-label')||'',h:Math.round(r.height),w:Math.round(r.width),font:parseFloat(s.fontSize)||0,tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,85):''}});
   const control=fields.map(e=>({tag:e.tagName,type:e.type||'',id:e.id||'',label:(main.querySelector('label[for="'+e.id+'"]')?.textContent||e.closest('label')?.textContent||'').trim().replace(/\s+/g,' ').slice(0,95),placeholder:e.getAttribute('placeholder')||''}));
   const titles=[...main.querySelectorAll('h1,h2')].filter(visible).slice(0,12).map(e=>e.textContent?.trim().replace(/\s+/g,' ').slice(0,105));
   const jargon=text.match(/\b(?:baseline|cutoff|FAQ6|CAIDE|MCI|Speech biomarker|Clinical Context|FHIR|AuthHub|CareSubject|PWA|RNG|ANU-ADRI|LIBRA2|LBS|MoCA-K|CDR)\b/gi)||[];
   const routeCls=[...main.classList].find(c=>c.startsWith('screen-'))||'';
   return {renderedRoute:routeCls.replace(/^screen-/,''),h1:titles[0]||'',headings:titles,scrolly:document.documentElement.scrollHeight,scrollx:document.documentElement.scrollWidth,viewW:innerWidth,viewH:innerHeight,
    mainH:Math.round(mainRect.height),textLength:text.length,formCount:main.querySelectorAll('form').length,
    visibleFieldCount:fields.length,inputs:control,selectCount:control.filter(x=>x.tag==='SELECT').length,
    checkboxCount:control.filter(x=>x.type==='checkbox').length,
    textareaCount:control.filter(x=>x.tag==='TEXTAREA').length,
    buttonCount:buttons.length,smallTargets:sizes.filter(x=>x.h<64||x.w<44).slice(0,20),
    tinyTextButtons:sizes.filter(x=>x.font>0&&x.font<15).slice(0,12),
    actions:sizes.slice(0,22),jargon:[...new Set(jargon)],wordLeak:routeCls==='screen-cognitive-recheck'&&!![...main.querySelectorAll('input')].some(e=>(e.placeholder||'').includes('나무')),
    requiresAccess:/계정 확인|로그인이 필요|불러오는 중|먼저 연결/.test(text.slice(0,180)),
    textExcerpt:text.slice(0,400)};
 }));
 if(display.mode==='normal'&&display.width===375&&priority.has(screen))await page.screenshot({path:'qa-artifacts/screens/'+slug(screen)+'-375.png',fullPage:true});
}catch(e){result.error=String(e).slice(0,500)}
result.unexpectedJsErrors=errors;
report.push(result);
console.log('KIMSE_UX_AUDIT '+screen+' '+display.width+' '+display.mode+' fields='+String(result.visibleFieldCount)+' selects='+String(result.selectCount)+' tiny='+String(result.smallTargets?.length)+' scroll='+String(result.scrolly)+' '+(result.error||''));
await context.close();
}

async function verifySeniorJourneys(browser){
  const c=await browser.newContext({viewport:{width:375,height:810},reducedMotion:'reduce'});
  await c.addInitScript(()=>{
    localStorage.setItem('kimse.p0.state',JSON.stringify({
      version:14,account:{name:'사용성 점검',email:''},intent:'both',self:true,care:true,mode:'care',
      onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
      consents:{service:true,privacy:true,health:true,caregiverShare:true},
      remote:{accountId:'qa-account',activeCareSubjectId:'qa-subject',careSubjects:[{id:'qa-subject',displayName:'가족'}],token:''},
      careOverview:{subjectId:'qa-subject',stage:{observation_pattern:'KIMSE_TASK_CHANGE_OBSERVED'},summary:{changes:[]},alerts:[{id:'qa-alert',summary:'최근 생활에서 평소와 다른 변화가 관찰됐습니다.'}]},
      familyFeedback:[]
    }));
  });
  try{
    const p=await c.newPage();
    await p.goto(base+'family-feedback',{waitUntil:'domcontentloaded'});
    await p.locator('[data-feedback-stage="assessment"] .kimse-feedback-choice').first().waitFor({timeout:20000});
    assert(await p.locator('[data-feedback-stage="assessment"]').isVisible(),'family assessment must be visible');
    await p.locator('[data-feedback-value="CONFIRMED"]').click();
    assert(await p.locator('[data-feedback-stage="action"]').isVisible(),'family action must advance on selection');
    await p.locator('[data-feedback-back="assessment"]').click();
    assert(await p.locator('[data-feedback-stage="assessment"]').isVisible(),'family previous answer editable');
    await p.locator('[data-feedback-value="UNKNOWN"]').click();
    await p.locator('[data-feedback-value="NONE"]').click();
    assert(await p.locator('[data-feedback-stage="finish"]').isVisible(),'family finish must be visible');
    assert.equal(await p.locator('#family-feedback-assessment').inputValue(),'UNKNOWN');
    assert.equal(await p.locator('#family-feedback-action').inputValue(),'NONE');
    await p.screenshot({path:'qa-artifacts/screens/family-feedback-selected-375.png',fullPage:true});
    console.log('KIMSE_UX_JOURNEY_FAMILY=PASS assessment→action→back→action→finish');
  }finally{await c.close()}
  const s=await browser.newContext({viewport:{width:375,height:810},reducedMotion:'reduce'});
  await s.addInitScript(()=>{
    localStorage.setItem('kimse.p0.state',JSON.stringify({
      version:14,account:{name:'사용성 점검',email:''},intent:'self',self:true,mode:'self',
      consents:{service:true,privacy:true,health:true},
      profile:{birthYear:'1956',sex:'female',education:'7to9',activity:'active',living:'alone',socialSupport:'both',socialActivity:'weekly',sleepHours:'7시간'},
      onboarding:{profileDone:false,initialDone:false,consentDone:true,completed:false,profileStep:7}
    }));
  });
  try{
    const p=await s.newPage();
    await p.goto(base+'onboarding-profile',{waitUntil:'domcontentloaded'});
    await p.locator('[data-sleep-hour="7"]').waitFor({timeout:20000});
    assert.equal(await p.locator('[data-sleep-hour]').count(),9,'only nine common hours initially');
    await p.screenshot({path:'qa-artifacts/screens/sleep-hours-375.png',fullPage:true});
    await p.locator('[data-sleep-hour="7"]').click();
    assert.equal(await p.locator('[data-sleep-minute]').count(),12,'minute increments rendered');
    await p.screenshot({path:'qa-artifacts/screens/sleep-minutes-375.png',fullPage:true});
    await p.locator('[data-sleep-minute="30"]').click();
    const state=await p.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')||'{}'));
    assert.equal(state.profile.sleepHours,'7시간 30분','existing storage schema preserved');
    assert.equal(state.onboarding.profileStep,8,'minute selection advances directly');
    console.log('KIMSE_UX_JOURNEY_SLEEP=PASS hours→minutes→saved→next');
  }finally{await s.close()}
}


async function verifyHealthScheduleJourneys(browser){
  const context=await browser.newContext({viewport:{width:375,height:810},reducedMotion:'reduce',locale:'ko-KR'});
  await context.addInitScript(()=>{
    localStorage.setItem('kimse.p0.state',JSON.stringify({
      version:14,account:{name:'사용성 점검',email:''},intent:'self',self:true,mode:'self',
      onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
      consents:{service:true,privacy:true,health:true},
      health:{sleep:'',steps:'',pressure:'',memo:''},schedule:[],
      monitoring:{liveSteps:null}
    }));
  });
  try{
    const p=await context.newPage();
    await p.goto(base+'health',{waitUntil:'domcontentloaded'});
    await p.locator('[data-health="steps"]').click();
    await p.locator('#health-value').fill('4321');
    await p.evaluate(()=>window.scrollTo(0,0));
    await p.screenshot({path:'qa-artifacts/screens/health-steps-entry-375.png',fullPage:false});
    await p.locator('#save-health').click();
    await p.locator('.screen-health').waitFor({timeout:15000});
    const stepsState=await p.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')||'{}'));
    assert.equal(stepsState.health.steps,'4321','steps must retain manual observation');
    assert((await p.locator('#main').innerText()).includes('4321'),'steps must display when live sensor is absent');
    await p.locator('[data-health="pressure"]').click();
    await p.locator('#health-pressure-sys').fill('121');
    await p.locator('#health-pressure-dia').fill('79');
    await p.evaluate(()=>window.scrollTo(0,0));
    await p.screenshot({path:'qa-artifacts/screens/health-pressure-entry-375.png',fullPage:false});
    await p.locator('#save-health').click();
    await p.locator('.screen-health').waitFor({timeout:15000});
    let state=await p.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')||'{}'));
    assert.equal(state.health.pressure,'121 / 79','pressure schema must remain backward-compatible');
    await p.locator('[data-health="pressure"]').click();
    assert.equal(await p.locator('#health-pressure-sys').inputValue(),'121','existing systolic value restored');
    assert.equal(await p.locator('#health-pressure-dia').inputValue(),'79','existing diastolic value restored');
    await p.goto(base+'care-schedule',{waitUntil:'domcontentloaded'});
    await p.locator('[data-schedule-name="병원 동행"]').click();
    assert.equal(await p.locator('#schedule-title').inputValue(),'병원 동행');
    await p.locator('#schedule-date').fill('2026-11-16');
    await p.locator('#schedule-time').fill('10:30');
    await p.evaluate(()=>window.scrollTo(0,0));
    await p.screenshot({path:'qa-artifacts/screens/care-schedule-entry-375.png',fullPage:false});
    await p.locator('#add-schedule').click();
    state=await p.evaluate(()=>JSON.parse(localStorage.getItem('kimse.p0.state')||'{}'));
    assert(state.schedule.some(x=>x.title==='병원 동행'&&x.date.includes('2026')),'family schedule must retain existing row schema');
    console.log('KIMSE_UX_JOURNEY_HEALTH_SCHEDULE=PASS steps→pressure→restore→date/time');
  }finally{await context.close()}
}


async function verifyMedicalMarketProgressive(browser){
  const c=await browser.newContext({viewport:{width:375,height:810},reducedMotion:'reduce',locale:'ko-KR'});
  await c.addInitScript(()=>{
    localStorage.setItem('kimse.p0.state',JSON.stringify({
      version:14,account:{name:'사용성 점검',email:''},intent:'self',self:true,mode:'self',
      onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
      consents:{service:true,privacy:true,health:true},marketCategory:'all',marketShowAll:false
    }));
  });
  try{
    const p=await c.newPage();
    await p.goto(base+'medical-record-add',{waitUntil:'domcontentloaded'});
    const optional=p.locator('.kimse-medical-extras');
    await optional.waitFor({timeout:15000});
    assert(!(await optional.evaluate(el=>el.open)),'optional institution/title should start collapsed');
    assert(await p.locator('#external-record-type').isVisible()&&await p.locator('#external-record-date').isVisible()&&await p.locator('#external-record-source').isVisible(),'required clinical record fields must remain visible');
    await p.evaluate(()=>window.scrollTo(0,0));
    await p.screenshot({path:'qa-artifacts/screens/medical-record-compact-375.png',fullPage:false});
    await optional.locator('summary').click();
    assert(await p.locator('#external-record-institution').isVisible()&&await p.locator('#external-record-title').isVisible(),'optional clinical fields must be expandable');
    await p.goto(base+'market',{waitUntil:'domcontentloaded'});
    await p.locator('.market-item').first().waitFor({timeout:15000});
    assert.equal(await p.locator('.market-item').count(),4,'show only four care items initially');
    await p.locator('[data-market-show-all]').click();
    assert((await p.locator('.market-item').count())>4,'remaining care items must stay accessible');
    console.log('KIMSE_UX_JOURNEY_MEDICAL_MARKET=PASS required-fields→optional-details→4-items→all-items');
  }finally{await c.close()}
}


async function verifyRemainingSeniorP2(browser){
  const c=await browser.newContext({viewport:{width:375,height:810},reducedMotion:'reduce',locale:'ko-KR'});
  await c.addInitScript(()=>{
    localStorage.setItem('kimse.p0.state',JSON.stringify({
      version:14,account:{name:'사용성 점검',email:'qa@example.invalid'},
      intent:'both',self:true,care:true,mode:'self',
      onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
      consents:{service:true,privacy:true,health:true},caregivers:[],
      monitoring:{liveSteps:null},medicalRecords:[]
    }));
  });
  try{
    const p=await c.newPage();
    await p.goto(base+'home',{waitUntil:'domcontentloaded'});
    await p.locator('.kimse-home-actions').waitFor({timeout:15000});
    assert(await p.locator('.kimse-home-primary-heading').first().isVisible(),'priority heading shown on home');
    assert.equal(await p.locator('.kimse-home-actions .action-card').count(),4,'four primary home actions preserved');
    assert(!(await p.locator('.kimse-home-secondary').evaluate(el=>el.open)),'secondary home details collapsed initially');
    await p.screenshot({path:'qa-artifacts/screens/home-priority-375.png',fullPage:false});
    await p.locator('.kimse-home-secondary>summary').click();
    assert(await p.locator('.kimse-home-secondary [data-go="medical-records"]').isVisible(),'medical records remain reachable');
    await p.goto(base+'professional-outcome',{waitUntil:'domcontentloaded'});
    await p.locator('#professional-date').waitFor({timeout:15000});
    assert(await p.locator('#professional-source-route').isVisible(),'clinical source remains required');
    assert(await p.locator('#professional-result').isVisible(),'clinical result code remains required');
    const details=p.locator('.kimse-professional-institution');
    assert(!(await details.evaluate(el=>el.open)),'optional institute and source note initially collapsed');
    await details.locator('summary').click();
    assert(await p.locator('#professional-institution').isVisible(),'original institution field preserved');
    assert(await p.locator('#professional-source-note').isVisible(),'original provenance memo preserved');
    await p.locator('#professional-source-route').selectOption('PAPER_OR_PDF');
    await p.locator('#professional-result').selectOption('MCI');
    assert.equal(await p.locator('#professional-result').inputValue(),'MCI','clinical enum must be unchanged');
    await p.screenshot({path:'qa-artifacts/screens/professional-optional-open-375.png',fullPage:false});
    await p.goto(base+'clinical-context-event',{waitUntil:'domcontentloaded'});
    await p.locator('#context-event-type').waitFor({timeout:15000});
    const notes=p.locator('.kimse-context-notes');
    assert(!(await notes.evaluate(el=>el.open)),'narrative fields initially collapsed');
    await notes.locator('summary').click();
    assert(await p.locator('#context-event-summary').isVisible(),'original event summary preserved');
    assert(await p.locator('#context-event-detail').isVisible(),'original event detail preserved');
    await p.screenshot({path:'qa-artifacts/screens/context-optional-open-375.png',fullPage:false});
    console.log('KIMSE_UX_JOURNEY_HOME_CLINICAL=PASS home→details→professional codes→context fields');
  }finally{await c.close()}
}

(async()=>{
fs.mkdirSync('qa-artifacts/screens',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
for(const d of states)for(const screen of unique)await run(browser,screen,d);
await verifySeniorJourneys(browser);
await verifyHealthScheduleJourneys(browser);
await verifyMedicalMarketProgressive(browser);
await verifyRemainingSeniorP2(browser);
const summary={routes:unique.length,observations:report.length,
 byRoute:unique.map(name=>{const subset=report.filter(x=>x.route===name),a=subset.find(x=>x.width===375&&x.mode==='normal')||subset[0];return {route:name,fields:a.visibleFieldCount,selects:a.selectCount,checkboxes:a.checkboxCount,buttons:a.buttonCount,scrollH:a.scrolly,jargon:a.jargon,wordLeak:a.wordLeak,smallTargets:a.smallTargets,headline:a.h1,uiErrors:a.unexpectedJsErrors,error:a.error,acrossViews:subset.map(x=>({w:x.width,mode:x.mode,h:x.scrolly,overflow:x.scrollx>x.viewW+2,buttons:x.buttonCount,fields:x.visibleFieldCount,small:x.smallTargets?.length||0}))}})};
fs.writeFileSync('qa-artifacts/full-ux-audit.json',JSON.stringify({summary,report},null,2));
fs.writeFileSync('qa-artifacts/summary.json',JSON.stringify(summary,null,2));
console.log('KIMSE_UX_AUDIT_RELEASE=20261010-uxaudit-03');
console.log('KIMSE_UX_AUDIT_TOTAL routes='+unique.length+' observations='+report.length);
console.log('KIMSE_UX_AUDIT_SMALL_ROUTES='+summary.byRoute.filter(x=>x.smallTargets?.length).length);
const undersized=summary.byRoute.filter(x=>x.smallTargets?.length);
if(undersized.length)throw Error('Senior touch target under 64px: '+JSON.stringify(undersized.map(x=>({route:x.route,buttons:x.smallTargets}))));
console.log('KIMSE_UX_AUDIT_OVERFLOW_ROUTES='+summary.byRoute.filter(x=>x.acrossViews.some(v=>v.overflow)).length);
console.log('KIMSE_UX_AUDIT_ISSUES '+JSON.stringify(summary.byRoute.filter(x=>x.error||x.wordLeak||x.selects>0||x.checkboxes>3||x.fields>3||x.smallTargets?.length).map(x=>({route:x.route,selects:x.selects,checkboxes:x.checkboxes,fields:x.fields,small:x.smallTargets?.length,wordLeak:x.wordLeak}))).slice(0,3500));
}finally{await browser.close()}
})().catch(e=>{console.error('KIMSE_UX_AUDIT_FAILED',e.stack||e);process.exitCode=1});
