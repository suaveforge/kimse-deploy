'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const {PDFDocument}=require('pdf-lib');

const BASE='https://kimse.suaveforge.com/';
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
const ok=(condition,label,detail='')=>{assert.ok(condition,label+': '+detail);console.log('KIMSE_DEVIATION_QA_PASS '+label,detail)};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function awaitLiveAssets(){
  const expected=['app.js','index.html','app.css'].map(name=>({name,sha:sha256(fs.readFileSync(name))}));
  for(let i=0;i<55;i++){
    const results=await Promise.all(expected.map(async file=>{
      try{
        const r=await fetch(BASE+file.name+'?clinicalDeviation='+file.sha.slice(0,12)+'&attempt='+i,{cache:'no-store'});
        return r.ok&&sha256(Buffer.from(await r.arrayBuffer()))===file.sha;
      }catch{return false}
    }));
    if(results.every(Boolean)){console.log('KIMSE_DEVIATION_QA_LIVE_SHA_MATCH '+expected.map(x=>x.name+':'+x.sha).join(' '));return}
    if(i%12===0)console.log('KIMSE_DEVIATION_QA_WAIT_DEPLOY '+i+' '+JSON.stringify(results));
    await pause(4000);
  }
  throw Error('Live clinical JS/CSS/HTML do not match this deployment commit');
}
function makeReport(template,zero){
  const report=JSON.parse(JSON.stringify(template));
  const metric=report.monitoring.metrics.find(x=>x.metric==='steps');
  assert(metric,'synthetic dataset must include steps');
  metric.deviation_summary={
    status:'OBSERVED_DEVIATION',
    first_observed_deviation_at:zero?'2026-10-05':null,
    observed_deviation_days:zero?0:null,
    deviation_span_days:zero?0:null,
    gap_days_within_span:zero?0:null
  };
  const marker=zero?'SYNTH-ZERO-DAYS-STEP':'SYNTH-MISSING-DAYS-STEP';
  report.previsit_summary.top_changes=[{
    metric:'steps',clinical_label:marker,baseline:0,recent:0,relative_change:0,
    deviation_summary:{status:'OBSERVED_DEVIATION',first_observed_deviation_at:zero?'2026-10-05':null,observed_deviation_days:zero?0:null}
  }];
  report.timeline=[{
    kind:'SIGNAL_DEVIATION_ONSET',at:'2026-10-05T00:00:00Z',
    label:zero?'SYNTH-ONSET-ZERO':'SYNTH-ONSET-MISSING',metrics:['steps'],
    detail:{observed_deviation_days:zero?0:null,deviation_span_days:zero?0:null,gap_days_within_span:zero?0:null}
  }];
  return report;
}
function makeState(report){
  return {
    version:14,account:{name:'합성 인수 QA',email:'qa@example.invalid'},
    intent:'self',self:true,care:false,mode:'self',caregivers:[],
    onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
    consents:{service:false,privacy:false,health:false,microphone:false,location:false,motion:false,usage:false,notifications:false,caregiverShare:false},
    remote:{accountId:'',subjectId:'',selfSubjectId:'',careSubjects:[],activeCareSubjectId:'',token:''},
    monitoring:{pending:[],summary:null,alerts:[],lastObserved:{},daily:{}},
    clinicalReport:report,professionalOutcomes:report.professional_outcomes,
    a11y:{largeText:false,highContrast:false,voiceGuidance:false,soundEffects:false,captions:true,largeTouchTargets:false,colorIcons:true,screenReader:true,reduceMotion:false}
  };
}
async function testCase(browser,template,zero){
  const report=makeReport(template,zero),before=JSON.stringify(report),label=zero?'measured-zero':'missing-count';
  const context=await browser.newContext({viewport:{width:1340,height:920},locale:'ko-KR',serviceWorkers:'block'});
  await context.addInitScript(state=>localStorage.setItem('kimse.p0.state',JSON.stringify(state)),makeState(report));
  await context.route('https://api-kimse.suaveforge.com/**',r=>r.abort('failed'));
  const page=await context.newPage();
  try{
    await page.goto(BASE+'?lang=ko#/clinical-handoff',{waitUntil:'domcontentloaded',timeout:50000});
    await page.locator('.clinical-explorer').waitFor({timeout:25000});
    const top=page.locator('.clinical-top-row').filter({hasText:zero?'SYNTH-ZERO-DAYS-STEP':'SYNTH-MISSING-DAYS-STEP'});
    ok(await top.count()===1,label+'-single-top-change');
    const topText=(await top.textContent()||'').replace(/\s+/g,' ').trim();
    const deviation=page.locator('.clinical-metric[data-clinical-metric="steps"] .clinical-deviation-copy');
    ok(await deviation.count()===1,label+'-metric-present');
    const metricText=await deviation.innerText();
    const timeline=page.locator('.clinical-timeline-row').filter({hasText:zero?'SYNTH-ONSET-ZERO':'SYNTH-ONSET-MISSING'});
    ok(await timeline.count()===1,label+'-timeline-single-event');
    const timelineText=await timeline.innerText();
    if(zero){
      ok(topText.includes('첫 이탈 2026-10-05')&&topText.includes('관찰 0일')&&topText.includes('0%'),label+'-print-preview-retains-zero',topText);
      ok(metricText.includes('관찰된 이탈일')&&metricText.includes('0일')&&!metricText.includes('자료 없음'),label+'-metric-retains-measured-zero',metricText);
      ok(timelineText.includes('관찰 이탈 0일')&&timelineText.includes('시간 범위 0일'),label+'-timeline-retains-zero',timelineText);
    }else{
      ok(topText.includes('첫 이탈 날짜 미상')&&topText.includes('관찰 자료 없음')&&!topText.includes('관찰 0일')&&topText.includes('0%'),label+'-print-preview-preserves-missing-and-true-pct',topText);
      ok(metricText.includes('첫 관찰 이탈')&&metricText.includes('날짜 미상')&&metricText.includes('관찰된 이탈일')&&metricText.includes('자료 없음')&&!metricText.includes('0일'),label+'-metric-preserves-missing',metricText);
      ok(timelineText.includes('관찰 이탈 자료 없음')&&timelineText.includes('시간 범위 자료 없음')&&timelineText.includes('중간 미수집 자료 없음')&&!timelineText.includes('관찰 이탈 0일'),label+'-timeline-preserves-missing',timelineText);
    }
    ok(await page.locator('[data-provider-approved="true"],[data-transport-authorized="true"]').count()===0&&
      (await page.locator('.clinical-delivery-disclaimer').allTextContents()).some(x=>x.includes('전자제출 버튼을 활성화하지 않습니다')),
      label+'-no-institution-approval-or-transfer');
    await page.emulateMedia({media:'print'});
    const pdf=await page.pdf({format:'A4',printBackground:true,margin:{top:'11mm',right:'11mm',bottom:'11mm',left:'11mm'}});
    const filename='clinical-deviation-'+label+'.pdf';fs.writeFileSync(filename,pdf);
    const pages=(await PDFDocument.load(pdf)).getPageCount();
    ok(pages>=1&&pages<35,label+'-pdf-created',String(pages));
    const pdftxt=execFileSync('pdftotext',['-layout',filename,'-'],{encoding:'utf8'}).replace(/\s+/g,' ');
    const pdfCompact=pdftxt.replace(/\s+/g,'');
    ok(pdfCompact.includes(zero?'SYNTH-ZERO-DAYS-STEP':'SYNTH-MISSING-DAYS-STEP'),label+'-pdf-marker');
    if(zero)ok(pdfCompact.includes('관찰0일'),label+'-pdf-measured-zero');
    else ok(pdfCompact.includes('관찰자료없음')&&!pdfCompact.includes('SYNTH-MISSING-DAYS-STEP첫이탈날짜미상·관찰0일'),label+'-pdf-missing-not-invented');
    ok(JSON.stringify(report)===before,label+'-source-report-immutable');
  }finally{await context.close()}
}
async function testPrevisitCoverage(browser,template,value,label,expected){
  const report=JSON.parse(JSON.stringify(template));
  report.previsit_summary.median_signal_coverage=value;
  const before=JSON.stringify(report);
  const ctx=await browser.newContext({viewport:{width:1340,height:920},locale:'ko-KR',serviceWorkers:'block'});
  await ctx.addInitScript(state=>localStorage.setItem('kimse.p0.state',JSON.stringify(state)),makeState(report));
  await ctx.route('https://api-kimse.suaveforge.com/**',r=>r.abort('failed'));
  try{
    const page=await ctx.newPage();
    await page.goto(BASE+'?lang=ko#/clinical-handoff',{waitUntil:'domcontentloaded',timeout:50000});
    await page.locator('.clinical-explorer').waitFor({timeout:25000});
    const fact=page.locator('.clinical-keyfact-grid').locator('div').filter({hasText:'신호 중앙 coverage'});
    ok(await fact.count()===1&&await fact.locator('strong').innerText()===expected,
      'previsit-coverage-'+label,expected);
    await page.emulateMedia({media:'print'});
    const pdf=await page.pdf({format:'A4',printBackground:true});
    const file='clinical-previsit-coverage-'+label+'.pdf';
    fs.writeFileSync(file,pdf);
    const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}).replace(/\s+/g,'');
    ok(text.includes('신호중앙coverage'+expected),'previsit-coverage-pdf-'+label);
    ok(JSON.stringify(report)===before,'previsit-coverage-immutable-'+label);
  }finally{await ctx.close()}
}

(async()=>{
  await awaitLiveAssets();
  const template=JSON.parse(fs.readFileSync('clinical-template-demo-data.json','utf8'));
  ok(template.demo_marker==='SYNTHETIC_ONLY_NOT_A_REAL_PATIENT','synthetic-report-only');
  const browser=await chromium.launch({headless:true});
  try{
    await testCase(browser,template,false);await testCase(browser,template,true);
    await testPrevisitCoverage(browser,template,false,'false','자료 없음');
  await testPrevisitCoverage(browser,template,'','empty','자료 없음');
  await testPrevisitCoverage(browser,template,'bad','invalid','자료 없음');
  await testPrevisitCoverage(browser,template,0,'measured-zero','0%');
    await testPrevisitCoverage(browser,template,0.5,'measured-half','50%');
  }finally{await browser.close()}
})().catch(e=>{console.error('KIMSE_DEVIATION_QA_FAILED',e);process.exitCode=1});