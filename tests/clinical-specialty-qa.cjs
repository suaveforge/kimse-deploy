const fs=require('node:fs');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const {PDFDocument}=require('pdf-lib');
const BASE='https://kimse.suaveforge.com/';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const check=(ok,label)=>{assert.ok(ok,label);console.log('KIMSE_SPECIALTY_PASS='+label)};
const order=[
 {id:'NEUROLOGY',name:'신경과',keys:['trajectory','cognition','family','external'],needle:'처음 관찰한 변화'},
 {id:'GERIATRICS',name:'노인의학과',keys:['function','family','safety','medication'],needle:'일상기능·독립성'},
 {id:'PSYCHIATRY',name:'정신건강의학과',keys:['mood','family','function','medication'],needle:'기분·행동 맥락'},
 {id:'PRIMARY_CARE',name:'가정의학과',keys:['trajectory','medication','acute','external'],needle:'급성질환·감염·입원'}
];
const countries=['KR','GB','US','CA','AU','JP'];
async function awaitExactAssets(){
 const expected=['app.js','app.css','index.html'].map(name=>({
   name,sha:hash(fs.readFileSync(name))
 }));
 for(let n=0;n<65;n++){
   const matches=await Promise.all(expected.map(async asset=>{
     try{
       const res=await fetch(BASE+asset.name+'?clinicalFocus='+asset.sha.slice(0,16)+'&attempt='+n,{cache:'no-store'});
       return res.ok&&hash(Buffer.from(await res.arrayBuffer()))===asset.sha;
     }catch{return false;}
   }));
   if(matches.every(Boolean)){
     console.log('KIMSE_SPECIALTY_LIVE_ASSET_SHA_VERIFIED='+
        expected.map(asset=>asset.name+':'+asset.sha).join(' '));return;
   }
   if(n%10===0)console.log('KIMSE_SPECIALTY_WAIT_PAGES_SHA attempt='+n+' match='+JSON.stringify(matches));
   await new Promise(r=>setTimeout(r,5000));
 }
 throw Error('CLINICAL_FOCUS_LIVE_JS_CSS_HTML_SHA_NOT_MATCHED');
}
async function main(){
 await awaitExactAssets();
 const report=JSON.parse(fs.readFileSync('clinical-template-demo-data.json','utf8'));
 check(report.demo_marker==='SYNTHETIC_ONLY_NOT_A_REAL_PATIENT','synthetic-only');
 const original=JSON.stringify(report);
 const state={version:13,account:{name:'CLINICAL_SYNTHETIC',email:'qa@example.com'},
   intent:'self',self:true,care:false,mode:'self',caregivers:[],
   onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
   consents:{service:false,privacy:false,health:false,microphone:false,location:false,
      motion:false,usage:false,notifications:false,caregiverShare:false},
   remote:{accountId:'',subjectId:'',selfSubjectId:'',careSubjects:[],activeCareSubjectId:'',token:''},
   monitoring:{pending:[],summary:null,alerts:[],lastObserved:{},daily:{}},
   clinicalReport:report,professionalOutcomes:report.professional_outcomes,
   a11y:{largeText:false,highContrast:false,voiceGuidance:false,soundEffects:false,
     captions:true,largeTouchTargets:true,colorIcons:true,screenReader:true,reduceMotion:false}};
 const browser=await chromium.launch({headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width:1440,height:950},locale:'ko-KR',serviceWorkers:'block'});
  await ctx.addInitScript(s=>localStorage.setItem('kimse.p0.state',JSON.stringify(s)),state);
  await ctx.route('https://api-kimse.suaveforge.com/**',route=>route.abort('failed'));
  const page=await ctx.newPage();
  await page.goto(BASE+'#/clinical-handoff',{waitUntil:'domcontentloaded',timeout:50000});
  await page.waitForSelector('.clinical-explorer',{timeout:25000});
  check(await page.locator('.clinical-specialty-review').count()===0,'generic-has-no-specialty-section');
  const toId=async(row,country)=>{
    await page.locator('#clinical-target-country').selectOption(country);
    await page.locator('#clinical-target-country').dispatchEvent('change');
    await page.locator('#clinical-target-department').fill(row.name);
    await page.locator('#clinical-target-department').dispatchEvent('change');
    await page.waitForFunction(f=>{
      const panel=document.querySelector('.clinical-specialty-review');
      return panel?.dataset.specialtyFocus===f&&panel.querySelectorAll('[data-specialty-field]').length===4;
    },row.id,{timeout:12000});
  };
  for(const country of countries){
   for(const item of order){
    await toId(item,country);
    const sel=page.locator('.clinical-specialty-review');
    const ids=await sel.locator('[data-specialty-field]').evaluateAll(nodes=>nodes.map(x=>x.dataset.specialtyField));
    check(JSON.stringify(ids)===JSON.stringify(item.keys),'order-'+country+'-'+item.id);
    // Each recorded summary must be traceable to specific Canonical Dataset
    // array rows/fields; never fabricate a link for an uncollected field.
    const sourceCards=sel.locator('[data-specialty-field]');
    for(let n=0;n<4;n++){
      const card=sourceCards.nth(n);
      const recorded=(await card.getAttribute('data-recorded'))==='true';
      const trace=card.locator('details.clinical-specialty-trace');
      if(recorded){
        check(await trace.count()===1,'trace-details-'+country+'-'+item.id+'-'+n);
        await trace.locator('summary').click();
        check(await trace.getAttribute('open')!==null,'trace-keyboard-native-disclosure-'+country+'-'+item.id+'-'+n);
        const rows=trace.locator('[data-clinical-source-path]');
        check(await rows.count()>=1,'trace-concrete-source-rows-'+country+'-'+item.id+'-'+n);
        const paths=await rows.evaluateAll(nodes=>nodes.map(node=>node.dataset.clinicalSourcePath));
        check(paths.every(path=>/^(previsit_summary|clinical_domains|family_feedback|external_clinical_records|risk_confounders)[.[]/.test(path)),
          'trace-canonical-path-'+country+'-'+item.id+'-'+n);
        const getSource=(path)=>path.replace(/\[(\d+)\]/g,'.$1').split('.')
          .reduce((value,key)=>value?.[key],report);
        check(paths.every(path=>getSource(path)!==undefined),
          'trace-resolves-to-real-canonical-field-'+country+'-'+item.id+'-'+n);
        check((await card.innerText()).includes('출처'),'trace-origin-'+country+'-'+item.id+'-'+n);
        await trace.locator('summary').click();
      }else{
        check(await trace.count()===0,'missing-record-no-fake-trace-'+country+'-'+item.id+'-'+n);
        check((await card.innerText()).includes('원자료 미수집'),'missing-record-visible-'+country+'-'+item.id+'-'+n);
      }
    }
    const body=await sel.innerText();
    check(body.includes(item.needle)&&body.includes('자료 없음 · 정상 소견으로 해석하지 않음'),
      'record-and-missing-'+country+'-'+item.id);
    check(body.includes('병원·의료진의 승인 서식이나 필수 검사 목록이 아닙니다'),
      'unapproved-guidance-'+country+'-'+item.id);
    check((await page.locator('.clinical-visit-brief').getAttribute('data-provider-approved'))==='false',
      'no-provider-approval-'+country+'-'+item.id);
   }
  }
  for(const item of order){
   await toId(item,'KR');
   await page.emulateMedia({media:'print'});
   check(await page.locator('.skip-link').evaluate(el=>getComputedStyle(el).display)==='none',
     'printed-navigation-is-hidden-by-css-'+item.id);
   const pdf=await page.pdf({format:'A4',printBackground:true,
     margin:{top:'11mm',right:'11mm',bottom:'11mm',left:'11mm'}});
   const pages=(await PDFDocument.load(pdf)).getPageCount();
   check(pages>=1&&pages<=4,'a4-pages-'+item.id+'-'+pages);
   const file='clinical-specialty-'+item.id+'.pdf';
   fs.writeFileSync('clinical-specialty-qa/'+file,pdf);
   const extracted=execFileSync('pdftotext',['-layout','clinical-specialty-qa/'+file,'-'],{encoding:'utf8'});
   const compact=extracted.replace(/\s+/g,'');
   check(compact.includes(item.needle.replace(/\s+/g,'')),'pdf-specialty-heading-'+item.id);
   check(compact.includes('원자료위치:')&&compact.includes('원자료'),'pdf-source-path-identifiers-'+item.id);
   check(compact.includes('정상소견으로해석하지않음'),'pdf-missing-does-not-become-normal-'+item.id);
   check(!extracted.includes('Skip to content')&&!extracted.includes('본문으로 바로가기'),
     'pdf-never-prints-accessibility-navigation-'+item.id);
   check(!extracted.includes('Family View')&&!extracted.includes('Recent changes'),
     'korean-pdf-does-not-contain-partially-translated-ui-'+item.id);
   await page.emulateMedia({media:'screen'});
  }
  await page.locator('#clinical-target-department').fill('');
  await page.locator('#clinical-target-department').dispatchEvent('change');
  await page.waitForFunction(()=>!document.querySelector('.clinical-specialty-review'));
  check(await page.locator('.clinical-specialty-review').count()===0,'clear-specialty-restores-basic');
  check(JSON.stringify(report)===original,'fixture-never-mutated');
  await page.setViewportSize({width:430,height:932});
  const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  check(dimensions.scroll<=dimensions.width+2,'mobile-no-overflow');
  await ctx.close();
  // A user reporting *absence* of an event must not be printed as having
  // experienced that event; conflicting or unverified records also remain
  // clearly distinguished. Run through the actual production DOM and A4 PDF.
  for(const [status,safetyText,medicineText,acuteText,moodText] of [
    ['PRESENT','안전/지원 사건 보고 1건','복약 변경 보고 1건','급성질환/감염/입원 관련 보고 1건','기분·행동 변화 보고 1건'],
    ['ABSENT','안전/지원 사건 없다고 보고 1건','복약 변경 없다고 보고 1건','급성질환/감염/입원 없다고 보고 1건','기분·행동 변화 없다고 보고 1건'],
    ['UNKNOWN','상태 미확인 기록 1건','상태 미확인 기록 1건','상태 미확인 기록 1건','상태 미확인 기록 1건']
  ]){
    const contextReport=JSON.parse(JSON.stringify(report));
    contextReport.clinical_domains.safety_support={context_events:[{status}]};
    contextReport.clinical_domains.mood_behavior={context_events:[{status}]};
    contextReport.risk_confounders.medication_change={events:[{status}]};
    contextReport.risk_confounders.current_medications=[];
    contextReport.risk_confounders.acute_illness_context={events:[{status}]};
    const contextState={...state,clinicalReport:contextReport,professionalOutcomes:[]};
    const testContext=await browser.newContext({viewport:{width:1440,height:950},locale:'ko-KR',serviceWorkers:'block'});
    await testContext.addInitScript(initial=>localStorage.setItem('kimse.p0.state',JSON.stringify(initial)),contextState);
    await testContext.route('https://api-kimse.suaveforge.com/**',req=>req.abort('failed'));
    const p=await testContext.newPage();
    await p.goto(BASE+'#/clinical-handoff',{waitUntil:'domcontentloaded',timeout:50000});
    await p.waitForSelector('#clinical-target-department',{timeout:25000});
    const verify=async(name,expected,label,field)=>{
      await p.locator('#clinical-target-department').fill(name);
      await p.locator('#clinical-target-department').dispatchEvent('change');
      await p.waitForFunction(f=>!!document.querySelector('.clinical-specialty-review[data-specialty-focus="'+f+'"]'),
        field==='safety'||field==='medication'?'GERIATRICS':field==='acute'?'PRIMARY_CARE':'PSYCHIATRY',
        {timeout:12000});
      const card=p.locator('[data-specialty-field="'+field+'"]');
      check((await card.innerText()).includes(expected),'live-'+status+'-'+label);
      check(await card.getAttribute('data-recorded')==='true','live-'+status+'-record-not-missing-'+label);
    };
    await verify('노인의학과',safetyText,'safety','safety');
    await verify('노인의학과',medicineText,'medication','medication');
    await verify('가정의학과',acuteText,'acute','acute');
    await verify('정신건강의학과',moodText,'mood','mood');
    if(status==='ABSENT'){
      await p.locator('#clinical-target-department').fill('노인의학과');
      await p.locator('#clinical-target-department').dispatchEvent('change');
      await p.waitForFunction(()=>document.querySelector('.clinical-specialty-review')?.dataset.specialtyFocus==='GERIATRICS');
      await p.emulateMedia({media:'print'});
      const pdf=await p.pdf({format:'A4',printBackground:true,
        margin:{top:'11mm',right:'11mm',bottom:'11mm',left:'11mm'}});
      const file='clinical-specialty-explicit-absence.pdf';
      fs.writeFileSync('clinical-specialty-qa/'+file,pdf);
      const pdfText=execFileSync('pdftotext',['-layout','clinical-specialty-qa/'+file,'-'],{encoding:'utf8'})
        .replace(/\s+/g,'');
      check(pdfText.includes(safetyText.replace(/\s+/g,'')),'pdf-explicit-absence-not-event');
      check(!pdfText.includes('안전/지원사건보고1건'),'pdf-absence-not-promoted-to-incident');
      await p.emulateMedia({media:'screen'});
    }
    await testContext.close();
  }

  // Mixed evidence must preserve UNKNOWN beside PRESENT/ABSENT on the real
  // production screen and in the patient-carried A4 PDF. Synthetic records only.
  for(const sample of [
    {name:'present-and-unknown',statuses:['PRESENT','UNKNOWN'],fragments:['보고 1건','상태 미확인 1건 병존']},
    {name:'absent-and-unknown',statuses:['ABSENT','UNKNOWN'],fragments:['없다고 보고 1건','상태 미확인 1건 병존']},
    {name:'three-way-conflict',statuses:['PRESENT','ABSENT','UNKNOWN'],fragments:['보고 1건','부재 보고 1건 병존','상태 미확인 1건 병존']}
  ]){
    const mixed=JSON.parse(JSON.stringify(report));
    const events=sample.statuses.map(status=>({status}));
    mixed.clinical_domains.safety_support={context_events:events};
    mixed.clinical_domains.mood_behavior={context_events:events};
    mixed.risk_confounders.medication_change={events};
    mixed.risk_confounders.current_medications=[];
    mixed.risk_confounders.acute_illness_context={events};
    const context=await browser.newContext({viewport:{width:1440,height:950},locale:'ko-KR',serviceWorkers:'block'});
    await context.addInitScript(s=>localStorage.setItem('kimse.p0.state',JSON.stringify(s)),{...state,clinicalReport:mixed,professionalOutcomes:[]});
    await context.route('https://api-kimse.suaveforge.com/**',route=>route.abort('failed'));
    const p=await context.newPage();
    await p.goto(BASE+'#/clinical-handoff',{waitUntil:'domcontentloaded',timeout:50000});
    await p.waitForSelector('#clinical-target-department',{timeout:25000});
    for(const [department,focus,field] of [
      ['노인의학과','GERIATRICS','safety'],
      ['노인의학과','GERIATRICS','medication'],
      ['정신건강의학과','PSYCHIATRY','mood'],
      ['가정의학과','PRIMARY_CARE','acute']
    ]){
      await p.locator('#clinical-target-department').fill(department);
      await p.locator('#clinical-target-department').dispatchEvent('change');
      await p.waitForFunction(id=>document.querySelector('.clinical-specialty-review')?.dataset.specialtyFocus===id,focus,{timeout:12000});
      const card=p.locator('[data-specialty-field="'+field+'"]');
      const value=await card.innerText();
      for(const fragment of sample.fragments)check(value.includes(fragment),'mixed-'+sample.name+'-'+field+'-'+fragment);
      check(await card.getAttribute('data-recorded')==='true','mixed-'+sample.name+'-collected-'+field);
    }
    if(sample.name!=='absent-and-unknown'){
      await p.locator('#clinical-target-department').fill('노인의학과');
      await p.locator('#clinical-target-department').dispatchEvent('change');
      await p.waitForFunction(()=>document.querySelector('.clinical-specialty-review')?.dataset.specialtyFocus==='GERIATRICS',{timeout:12000});
      await p.emulateMedia({media:'print'});
      const output=await p.pdf({format:'A4',printBackground:true,margin:{top:'11mm',right:'11mm',bottom:'11mm',left:'11mm'}});
      const file='clinical-specialty-'+sample.name+'.pdf';
      fs.writeFileSync('clinical-specialty-qa/'+file,output);
      const pdfText=execFileSync('pdftotext',['-layout','clinical-specialty-qa/'+file,'-'],{encoding:'utf8'}).replace(/\s+/g,'');
      for(const fragment of sample.fragments)check(pdfText.includes(fragment.replace(/\s+/g,'')),'mixed-pdf-'+sample.name+'-'+fragment);
      await p.emulateMedia({media:'screen'});
    }
    await context.close();
  }

  // Cross-output clinical source preservation: exactly the same synthetic
  // nested events are rendered in the actual patient-carried browser and A4.
  const history=JSON.parse(JSON.stringify(report));
  history.clinical_context_events=[
    {id:'SYN-OTHER-1',event_type:'OTHER',status:'NONE_REPORTED',
     occurred_at:'2026-09-27',recorded_at:'2026-10-12',summary:'SYNTHETIC-OTHER-NONE'},
    {id:'SYN-OTHER-2',event_type:'OTHER',status:'PRESENT',
     occurred_at:'2026-09-28',recorded_at:'2026-10-13',
     summary:'SYNTHETIC-OTHER-ZERO',details:{reported_quantity:0}}
  ];
  history.risk_confounders={
    conditions_context:'SYNTHETIC-RISK-CONTEXT-SELF-REPORT',
    validated_risk_context:{birthYear:'1948',sex:'UNKNOWN',education:0,activity:false,
      living:'alone',socialSupport:'none',socialActivity:0},
    current_sleep_user_record:'3시간 30분',
    sleep_disturbance_context:'frequent',
    medication_change:{events:[
      {status:'PRESENT',event_type:'MEDICATION_CHANGE',occurred_at:'2026-09-20',
       recorded_at:'2026-10-11',reported_by:'CAREGIVER',
       summary:'SYNTHETIC-MED-CHANGE',details:{new_dose:0}},
      {status:'ABSENT',event_type:'MEDICATION_CHANGE',occurred_at:'2026-09-21',summary:'SYNTHETIC-MED-ABSENT'}
    ]},
    acute_illness_context:{events:[
      {status:'UNKNOWN',event_type:'ACUTE_ILLNESS',occurred_at:'2026-09-22',summary:'SYNTHETIC-ACUTE-UNKNOWN'},
      {status:'NONE_REPORTED',event_type:'ACUTE_ILLNESS',occurred_at:'2026-09-23',summary:'SYNTHETIC-ACUTE-NONE'}
    ]},
    current_medications:[
      {id:'SYN-MED-1',name:'SYNTHETIC-AM',scheduled_time:'00:00',instructions:'SYNTHETIC-ONLY-USER-INSTRUCTION',active:true},
      {id:'SYN-MED-2',name:'SYNTHETIC-PM',scheduled_time:'20:00',instructions:'STOPPED-USER-REPORT',active:false},
      {id:'SYN-MED-3',name:'SYNTHETIC-UNKNOWN',scheduled_time:null,instructions:'',active:null},
      {id:'SYN-MED-4',name:'SYNTHETIC-04',active:true},
      {id:'SYN-MED-5',name:'SYNTHETIC-05',active:false}
    ]
  };
  history.clinical_domains={
    ...history.clinical_domains,
    cognition:{
      repeatable_task_sessions:[
        {id:'syn-cog-base',phase:'BASELINE',completed_at:'2026-10-10T10:20:00Z',
         delayed_recall_count:0,subtraction_answer:'70',subtraction_correct:false,
         subtraction_response_ms:null,comparison:null,objective_state:'UNKNOWN'},
        {id:'syn-cog-recheck',phase:'RECHECK',completed_at:'2026-10-12T10:20:00Z',
         delayed_recall_count:2,subtraction_answer:'79',subtraction_correct:true,
         subtraction_response_ms:1000,comparison:{delayed_recall:{baseline:0,delta:2},
           serial_subtraction:{response_ms_delta:0}},objective_state:'STABLE'}],
      recent_kimse_assessments:[
        {assessment_code:'KIMSE',completed_at:'2026-10-13',total_score:0,
         domain_scores:{memory:0,attention:null},source_type:'kimse_task'},
        {assessment_code:'UNKNOWN',completed_at:null,total_score:null,domain_scores:{}}]
    },
    subjective_change:{
      self:'PRESENT',self_observed_at:'2026-09-21',
      informant:'ABSENT',informant_observed_at:'2026-09-23',agreement:'DISAGREE'
    },
    function_independence:{
      self_status:'INDEPENDENT',self_observed_at:'2026-09-22',
      informant_status:'IADL_ASSISTANCE',informant_observed_at:'2026-09-24',agreement:'DISAGREE',
      latest_functional_answers:{events:'often',finances:'some',travel:'no'},
      functional_change_from_personal_baseline:{
        events:{baseline:'no',current:'often',changed:true},
        finances:{baseline:null,current:'some',changed:false},
        travel:{baseline:'some',current:'no',changed:false}
      },
      functional_observed_at:'2026-10-11T12:30:00Z',
      functional_source_type:'kimse_self_observation_task'
    },
    safety_support:{context_events:[
      {status:'PRESENT',event_type:'FALL',occurred_at:'2026-09-24',summary:'SYNTHETIC-SAFETY'}]},
    mood_behavior:{context_events:[
      {status:'ABSENT',event_type:'MOOD_CHANGE',occurred_at:'2026-09-25',summary:'SYNTHETIC-MOOD'}]},
    sensory_motor:{context_events:[
      {status:'UNKNOWN',event_type:'SENSORY_CHANGE',occurred_at:'2026-09-26',summary:'SYNTHETIC-SENSORY'}]}
  };

  // Independent field-audit regression: unknown counts/dates must never be
  // rewritten to zero in clinician screen, timeline or patient-carried A4.
  const syntheticMissingDeviation={
    status:'OBSERVED_DEVIATION',
    first_observed_deviation_at:null,
    observed_deviation_days:null,
    deviation_span_days:null,
    gap_days_within_span:null
  };
  const syntheticObservedZeroDeviation={
    status:'OBSERVED_DEVIATION',
    first_observed_deviation_at:'2026-10-05',
    observed_deviation_days:0,
    deviation_span_days:0,
    gap_days_within_span:0
  };
  history.monitoring.metrics[0].deviation_summary=syntheticMissingDeviation;
  history.monitoring.metrics[1].deviation_summary=syntheticObservedZeroDeviation;
  history.previsit_summary.top_changes[0].deviation_summary=syntheticMissingDeviation;
  history.previsit_summary.top_changes[1].deviation_summary=syntheticObservedZeroDeviation;
  history.timeline.push(
    {kind:'SIGNAL_DEVIATION_ONSET',at:'2026-10-06T00:00:00Z',label:'합성 결측 관찰 경과',metrics:['steps'],detail:syntheticMissingDeviation},
    {kind:'SIGNAL_DEVIATION_ONSET',at:'2026-10-07T00:00:00Z',label:'합성 실제 0일 관찰 경과',metrics:['sleep_minutes'],detail:syntheticObservedZeroDeviation}
  );
  const originalHistory=JSON.stringify(history);
  const historyCtx=await browser.newContext({viewport:{width:1440,height:950},locale:'ko-KR',serviceWorkers:'block'});
  await historyCtx.addInitScript(s=>localStorage.setItem('kimse.p0.state',JSON.stringify(s)),
    {...state,clinicalReport:history,professionalOutcomes:[]});
  await historyCtx.route('https://api-kimse.suaveforge.com/**',r=>r.abort('failed'));
  const hp=await historyCtx.newPage();
  await hp.goto(BASE+'#/clinical-handoff',{waitUntil:'domcontentloaded',timeout:50000});
  await hp.locator('#clinical-target-department').fill('노인의학과');
  await hp.locator('#clinical-target-department').dispatchEvent('change');
  await hp.waitForFunction(()=>document.querySelector('.clinical-specialty-review')?.dataset.specialtyFocus==='GERIATRICS',
    null,{timeout:12000});
  const metricMissingHtml=await hp.locator('.clinical-metric[data-clinical-metric="steps"] .clinical-deviation-copy').textContent();
  check(metricMissingHtml.includes('첫 관찰 이탈 날짜 미상')&&metricMissingHtml.includes('관찰된 이탈일 자료 없음')&&metricMissingHtml.includes('시간 범위 자료 없음'),'deviation-screen-missing-is-not-zero');
  check(!metricMissingHtml.includes('0일'),'deviation-screen-no-fabricated-zero');
  const metricZeroHtml=await hp.locator('.clinical-metric[data-clinical-metric="sleep_minutes"] .clinical-deviation-copy').textContent();
  check(metricZeroHtml.includes('2026-10-05')&&metricZeroHtml.includes('관찰된 이탈일 0일')&&metricZeroHtml.includes('시간 범위 0일'),'deviation-screen-explicit-zero-kept');
  const printChangeRows=await hp.locator('.clinical-print-grid .clinical-top-row').allTextContents();
  check(printChangeRows[0].includes('첫 이탈 날짜 미상 · 관찰 자료 없음'),'deviation-print-summary-missing-kept');
  check(printChangeRows[1].includes('첫 이탈 2026-10-05 · 관찰 0일'),'deviation-print-summary-zero-kept');
  const timelineText=await hp.locator('.clinical-timeline').textContent();
  check(timelineText.includes('관찰 이탈 자료 없음 · 시간 범위 자료 없음')&&
        timelineText.includes('관찰 이탈 0일 · 시간 범위 0일'),'deviation-timeline-missing-and-real-zero');
  const paths=[
    'risk_confounders.medication_change.events[0]',
    'risk_confounders.medication_change.events[1]',
    'risk_confounders.acute_illness_context.events[0]',
    'risk_confounders.acute_illness_context.events[1]',
    'clinical_domains.safety_support.context_events[0]',
    'clinical_domains.mood_behavior.context_events[0]',
    'clinical_domains.sensory_motor.context_events[0]',
    'clinical_context_events[0]',
    'clinical_context_events[1]'
  ];
  const originalRows=hp.locator('.clinical-print-context-group li[data-clinical-context-source]');
  check(await originalRows.count()===9,'history-screen-9-source-records-including-other');
  const actualPaths=await originalRows.evaluateAll(nodes=>nodes.map(x=>x.dataset.clinicalContextSource));
  check(JSON.stringify(actualPaths)===JSON.stringify(paths),'history-screen-canonical-paths');
  const medSourceRows=hp.locator('.clinical-print-medication-group li[data-clinical-medication-source]');
  check(await medSourceRows.count()===5,'medication-screen-untruncated-5-records');
  const medPaths=await medSourceRows.evaluateAll(nodes=>nodes.map(x=>x.dataset.clinicalMedicationSource));
  check(medPaths.every((value,i)=>value==='risk_confounders.current_medications['+i+']'),
    'medication-screen-canonical-paths');
  const medBody=await hp.locator('.clinical-print-medication-group').innerText();
  check(medBody.includes('00:00')&&medBody.includes('SYNTHETIC-ONLY-USER-INSTRUCTION')
    &&medBody.includes('사용 여부 미확인')&&medBody.includes('중단했다고 보고'),
    'medication-screen-fields-and-status');
  const domainRows=hp.locator('.clinical-print-reported-domain li[data-clinical-reported-domain]');
  check(await domainRows.count()===4,'reported-domain-screen-four-source-rows');
  const reportPaths=[
    'clinical_domains.subjective_change.self',
    'clinical_domains.subjective_change.informant',
    'clinical_domains.function_independence.self_status',
    'clinical_domains.function_independence.informant_status'
  ];
  const actualReportPaths=await domainRows.evaluateAll(nodes=>nodes.map(x=>x.dataset.clinicalReportedDomain));
  check(JSON.stringify(actualReportPaths)===JSON.stringify(reportPaths),
    'reported-domain-screen-exact-canonical-paths');
  const reportBody=await hp.locator('.clinical-print-reported-domain').allInnerTexts();
  check(reportBody.join(' ').includes('DISAGREE')&&reportBody.join(' ').includes('IADL_ASSISTANCE')
    &&reportBody.join(' ').includes('2026-09-23'),
    'reported-domain-screen-disagreement-date-and-status');
  const functionalRows=hp.locator('.clinical-print-functional-group li[data-clinical-functional-source]');
  check(await functionalRows.count()===3,'functional-screen-3-raw-item-rows');
  for(const key of ['events','finances','travel']){
    const itemPath='clinical_domains.function_independence.latest_functional_answers.'+key;
    check(await hp.locator('.clinical-print-functional-group li[data-clinical-functional-source="'+itemPath+'"]').count()===1,
      'functional-screen-canonical-source-'+key);
    check(await hp.locator('[data-clinical-functional-screen="'+itemPath+'"]').count()>=1,
      'functional-detail-screen-source-'+key);
  }
  const functionalBody=await hp.locator('.clinical-print-functional-group').innerText();
  check(functionalBody.includes('응답 often')&&functionalBody.includes('개인 기준선 no')&&
    functionalBody.includes('원본 변경 플래그 true')&&
    functionalBody.includes('개인 기준선 미수집')&&functionalBody.includes('2026-10-11')&&
    functionalBody.includes('임상 FAQ 검사 아님'),
    'functional-screen-raw-baseline-date-provenance');
  const userRiskRows=hp.locator('.clinical-print-user-risk-group li[data-clinical-user-risk-source]');
  check(await userRiskRows.count()===8,'risk-screen-8-original-rows');
  for(const path of ['risk_confounders.conditions_context',
    ...['birthYear','sex','education','activity','living','socialSupport','socialActivity']
     .map(key=>'risk_confounders.validated_risk_context.'+key)])
    check(await hp.locator('.clinical-print-user-risk-group li[data-clinical-user-risk-source="'+path+'"]').count()===1,
      'risk-screen-original-source-'+path);
  const originalRiskValues=await hp.locator('.clinical-print-user-risk-group').innerText();
  check(originalRiskValues.includes('SYNTHETIC-RISK-CONTEXT-SELF-REPORT')&&
    originalRiskValues.includes('education · 0')&&originalRiskValues.includes('activity · false')&&
    originalRiskValues.includes('socialActivity · 0')&&originalRiskValues.includes('UNKNOWN')&&
    originalRiskValues.includes('USER_ENTERED'),'risk-screen-values-not-inferred');
  const backgroundDetails=hp.locator('details.clinical-risk-profile-details');
  check(await backgroundDetails.count()===1,'risk-screen-disclosure');
  await backgroundDetails.locator('summary').click();
  check(await backgroundDetails.locator('li[data-clinical-risk-screen]').count()===8,
    'risk-screen-expanded-8-original-values');
  await backgroundDetails.locator('summary').click();
  const sleepRows=hp.locator('.clinical-print-sleep-group li[data-clinical-sleep-source]');
  check(await sleepRows.count()===2,'sleep-screen-2-independent-canonical-rows');
  for(const key of ['current_sleep_user_record','sleep_disturbance_context']){
    check(await hp.locator('.clinical-print-sleep-group li[data-clinical-sleep-source="risk_confounders.'+key+'"]').count()===1,
      'sleep-screen-raw-source-'+key);
  }
  const sleepBody=await hp.locator('.clinical-print-sleep-group').innerText();
  check(sleepBody.includes('3시간 30분')&&sleepBody.includes('frequent')
    &&sleepBody.includes('USER_ENTERED')&&sleepBody.includes('원래 관찰일 미수집'),
    'sleep-screen-raw-values-and-user-provenance');
  const cognitiveDetail=hp.locator('.clinical-domain-card details.clinical-cognition-raw-details');
  check(await cognitiveDetail.count()===1,'cognition-screen-accessible-raw-disclosure');
  await cognitiveDetail.locator('summary').click();
  check(await cognitiveDetail.locator('li[data-clinical-cognition-screen]').count()===4,
    'cognition-screen-four-raw-rows-on-expand');
  await cognitiveDetail.locator('summary').click();
  const cogRows=hp.locator('.clinical-print-cognition-group li[data-clinical-cognition-source]');
  check(await cogRows.count()===4,'cognition-screen-four-raw-source-records');
  for(const key of ['repeatable_task_sessions','recent_kimse_assessments'])
    for(let i=0;i<2;i++)
      check(await hp.locator('.clinical-print-cognition-group li[data-clinical-cognition-source="clinical_domains.cognition.'+key+'['+i+']"]').count()===1,
        'cognition-screen-canonical-row-'+key+'-'+i);
  const cogText=await hp.locator('.clinical-print-cognition-group').allInnerTexts();
  check(cogText.join(' ').includes('delayed_recall_count')&&
    cogText.join(' ').includes('subtraction_response_ms')&&
    cogText.join(' ').includes('response_ms_delta')&&
    cogText.join(' ').includes('total_score'),
    'cognition-screen-fields-untruncated');
  const contextBody=await hp.locator('.clinical-print-source-records').innerText();
  check(contextBody.includes('new_dose: 0')&&contextBody.includes('2026-10-11')&&
    contextBody.includes('상태 ABSENT')&&contextBody.includes('상태 UNKNOWN')&&
    contextBody.includes('상태 NONE_REPORTED')&&
    contextBody.includes('SYNTHETIC-OTHER-NONE')&&
    contextBody.includes('SYNTHETIC-OTHER-ZERO')&&
    contextBody.includes('reported_quantity: 0')&&
    contextBody.includes('2026-10-13'),'history-screen-zero-status-and-dates');
  check((await hp.locator('.clinical-visit-brief').getAttribute('data-provider-approved'))==='false',
    'history-no-medical-provider-approval');
  await hp.emulateMedia({media:'print'});
  const historyPdf=await hp.pdf({format:'A4',printBackground:true,
    margin:{top:'11mm',right:'11mm',bottom:'11mm',left:'11mm'}});
  const historyFile='clinical-specialty-context-history.pdf';
  fs.writeFileSync('clinical-specialty-qa/'+historyFile,historyPdf);
  const allText=execFileSync('pdftotext',['-layout','clinical-specialty-qa/'+historyFile,'-'],
    {encoding:'utf8'}).replace(/\s+/g,'');
  for(const path of paths)
    check(allText.includes(path),'history-pdf-original-path-'+path);
  check(allText.includes('첫이탈날짜미상·관찰자료없음'),'deviation-a4-unknown-date-and-count');
  check(allText.includes('첫이탈2026-10-05·관찰0일'),'deviation-a4-genuine-observed-zero');
  check(!allText.includes('첫이탈날짜미상·관찰0일'),'deviation-a4-no-missing-to-zero-coercion');

  for(const phrase of ['new_dose:0','2026-09-20','2026-10-11',
                        '상태ABSENT','상태UNKNOWN','상태NONE_REPORTED',
                        '의료진확인결과아님','SYNTHETIC-OTHER-NONE',
                        'SYNTHETIC-OTHER-ZERO','reported_quantity:0','2026-10-13'])
    check(allText.includes(phrase.replace(/\s+/g,'')),'history-pdf-original-value-'+phrase);
  for(let i=0;i<5;i++)
    check(allText.includes('risk_confounders.current_medications['+i+']'),
      'medication-pdf-original-path-'+i);
  for(const phrase of ['SYNTHETIC-ONLY-USER-INSTRUCTION','00:00','20:00',
                       '사용여부미확인','중단했다고보고','처방확인아님'])
    check(allText.includes(phrase.replace(/\s+/g,'')),'medication-pdf-field-'+phrase);
  for(const path of [
    'clinical_domains.subjective_change.self',
    'clinical_domains.subjective_change.informant',
    'clinical_domains.function_independence.self_status',
    'clinical_domains.function_independence.informant_status'
  ])check(allText.includes(path),'reported-domain-pdf-canonical-path-'+path);
  for(const phrase of ['2026-09-21','2026-09-22','2026-09-23','2026-09-24',
                       '상태PRESENT','상태ABSENT','IADL_ASSISTANCE','DISAGREE'])
    check(allText.includes(phrase.replace(/\s+/g,'')),'reported-domain-pdf-state-'+phrase);
  for(const key of ['events','finances','travel']){
    check(allText.includes('clinical_domains.function_independence.latest_functional_answers.'+key),
      'functional-pdf-raw-answer-source-'+key);
    check(allText.includes('clinical_domains.function_independence.functional_change_from_personal_baseline.'+key),
      'functional-pdf-baseline-source-'+key);
  }
  for(const token of ['응답often','응답some','응답no','개인기준선no',
                      '개인기준선미수집','원본변경플래그true','원본변경플래그false',
                      '2026-10-11','의료진기능검사·진단아님']){
    check(allText.includes(token),'functional-pdf-raw-field-'+token);
  }
  for(const path of ['risk_confounders.conditions_context',
    ...['birthYear','sex','education','activity','living','socialSupport','socialActivity']
     .map(key=>'risk_confounders.validated_risk_context.'+key)])
    check(allText.includes(path),'risk-pdf-canonical-source-'+path);
  for(const token of ['SYNTHETIC-RISK-CONTEXT-SELF-REPORT',
    'education·0','activity·false','socialActivity·0','UNKNOWN','USER_ENTERED',
    '의료진확인·기저질환확진·검증된위험점수아님'])
    check(allText.includes(token),'risk-pdf-source-value-'+token);
  for(const key of ['current_sleep_user_record','sleep_disturbance_context'])
    check(allText.includes('risk_confounders.'+key),'sleep-pdf-canonical-source-'+key);
  for(const phrase of ['3시간30분','frequent','USER_ENTERED','원래관찰일미수집','의료진확인·기기측정아님'])
    check(allText.includes(phrase),'sleep-pdf-raw-value-'+phrase);
  for(const key of ['repeatable_task_sessions','recent_kimse_assessments'])
    for(let i=0;i<2;i++)
      check(allText.includes('clinical_domains.cognition.'+key+'['+i+']'),
        'cognition-pdf-canonical-source-'+key+'-'+i);
  for(const token of ['delayed_recall_count','subtraction_correct','false',
                      'subtraction_response_ms','null','response_ms_delta','0',
                      'total_score','2026-10-12','2026-10-13','MoCA-K/FAQ'])
    check(allText.includes(token),'cognition-pdf-original-value-'+token);
  check(JSON.stringify(history)===originalHistory,'history-source-never-mutated');
  await historyCtx.close();
 }finally{await browser.close();}
 console.log('KIMSE_SPECIALTY_LIVE_24_CASES_4_A4_PDFS=PASS');
}
fs.mkdirSync('clinical-specialty-qa',{recursive:true});
main().catch(e=>{console.error(e);process.exit(1)});
