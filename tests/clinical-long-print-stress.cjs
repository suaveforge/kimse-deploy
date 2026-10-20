const {chromium}=require('playwright');
const {PDFDocument}=require('pdf-lib');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const base='https://kimse.suaveforge.com/';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const expected=hash(fs.readFileSync('app.js'));
const ok=(value,label)=>{assert.ok(value,label);console.log('PASS '+label)};
const date=i=>'2026-09-'+String(i%26+1).padStart(2,'0');
async function run(){
  let published=false;
  for(let i=0;i<55;i++){
    try{const r=await fetch(base+'app.js?clinicalLongQa='+expected.slice(0,16)+'&attempt='+i,{cache:'no-store'});
      if(r.ok&&hash(Buffer.from(await r.arrayBuffer()))===expected){published=true;break;}
    }catch{}
    await new Promise(r=>setTimeout(r,4000));
  }
  ok(published,'live-JS-matches-deploy-SHA');
  const report=JSON.parse(fs.readFileSync('clinical-template-demo-data.json','utf8'));
  const before=JSON.stringify(report);
  report.subject={...(report.subject||{}),display_name:'SYNTHETIC_PATIENT_54'};
  report.generated_at='2026-10-02T09:00:00Z';
  report.family_feedback=Array.from({length:18},(_,i)=>({
    feedback_at:date(i)+'T09:00:00Z',recorded_at:'2026-10-04',
    assessment:i%2?'NO_CHANGE':'CONFIRMED',reported_by:'SYNTHETIC CAREGIVER',
    note:i===0?'FAMILY_FIRST':i===17?'FAMILY_LAST':i===8?
      'FAMILY_LONG_START '+('합성 가족 관찰 날짜 출처 분리 '.repeat(330))+' LONG_NOTE_END':
      'FAMILY_ROW_'+i
  }));
  report.external_clinical_records=Array.from({length:18},(_,i)=>({
    performed_at:date(i),recorded_at:'2026-10-05',record_type:i===17?'GENERAL_LAB':'LAB',
    title:i===0?'EXTERNAL_FIRST':i===17?'EXTERNAL_LAST':'EXTERNAL_ROW_'+i,
    institution:'SYNTHETIC TEST ONLY',source_route:'USER_UPLOAD',
    items:i===17?Array.from({length:17},(_,j)=>({
      name:'EXTERNAL_PARITY_'+String(j+1).padStart(2,'0'),
      value:j===0?0:j===16?17:null,unit:'points',
      assay:j===0?'SYNTHETIC-LC-MS-MS-METHOD':null
    })):[{name:'ZERO_TEST_'+i,value:0,unit:'points'}]
  }));
  report.professional_outcomes=Array.from({length:18},(_,i)=>({
    evaluation_date:date(i),recorded_at:'2026-10-06',
    institution:'SYNTHETIC TEST ONLY',provenance:'USER_ENTERED',
    clinical_impression:i===0?'PROFESSIONAL_FIRST':i===17?'PROFESSIONAL_LAST':'PROFESSIONAL_ROW_'+i,
    result_category:'UNKNOWN',validated_assessments:[{name:'ZERO_SCORE_'+i,value:0,unit:'points'}]
  }));
  ok(JSON.stringify(report)!==before&&report.demo_marker==='SYNTHETIC_ONLY_NOT_A_REAL_PATIENT','synthetic-only-data');
  const state={version:13,account:{name:'SYNTHETIC QA',email:'qa@example.com'},intent:'self',self:true,care:false,mode:'self',
    caregivers:[],onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
    consents:{service:false,privacy:false,health:false,microphone:false,location:false,motion:false,usage:false,notifications:false,caregiverShare:false},
    remote:{accountId:'',subjectId:'',selfSubjectId:'',careSubjects:[],activeCareSubjectId:'',token:''},
    monitoring:{pending:[],summary:null,alerts:[],lastObserved:{},daily:{}},
    clinicalReport:report,professionalOutcomes:report.professional_outcomes,
    a11y:{largeText:false,highContrast:false,voiceGuidance:false,soundEffects:false,captions:true,largeTouchTargets:true,colorIcons:true,screenReader:true,reduceMotion:false}};
  const browser=await chromium.launch({headless:true});
  try{
    const ctx=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    await ctx.addInitScript(x=>localStorage.setItem('kimse.p0.state',JSON.stringify(x)),state);
    await ctx.route('https://api-kimse.suaveforge.com/**',r=>r.abort('failed'));
    const page=await ctx.newPage();
    await page.goto(base+'#/clinical-handoff',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForSelector('.clinical-explorer',{timeout:20000});
    await page.locator('#clinical-target-department').fill('신경과');
    await page.locator('#clinical-target-department').press('Tab');
    // The three long-form source groups have exactly 54 synthetic records.
    // New independent cognition/profile/context annexes may add valid rows;
    // never count them as lost/extra rows of these three groups.
    const primarySelector='.clinical-print-source-records > div[class="clinical-print-source-group"] > ol > li';
    await page.waitForFunction(selector=>document.querySelectorAll(selector).length===54,
      primarySelector,{timeout:30000});
    ok(await page.locator(primarySelector).count()===54,'54-complete-primary-source-records');
    ok(await page.locator('[data-clinical-cognition-source="clinical_domains.cognition.repeatable_task_sessions[0]"]').count()===1,
      'pre-existing-cognition-annex-kept-separately');
    const externalTags=page.locator('[data-clinical-external-item="true"]');
    ok(await externalTags.count()===34,'screen-17-extra-items-not-truncated');
    ok((await externalTags.nth(17).innerText()).includes('EXTERNAL_PARITY_01 · 0 points'),
      'screen-first-result-is-measured-zero');
    ok((await externalTags.nth(17).innerText()).includes('SYNTHETIC-LC-MS-MS-METHOD'),
      'screen-assay-input-visible-as-unverified');
    ok((await externalTags.nth(17).innerText()).includes('미검증'),
      'screen-assay-not-provider-verified');
    ok((await externalTags.nth(25).innerText()).includes('EXTERNAL_PARITY_09 · 검사값 미수집'),
      'screen-missing-result-is-not-zero');
    ok((await externalTags.nth(33).innerText()).includes('EXTERNAL_PARITY_17 · 17 points'),
      'screen-last-result-is-present');
    ok((await page.getByText('앱 등록일: 2026-10-05').count())>=1,
      'screen-test-date-and-record-date-are-separated');
    ok(await page.locator('.clinical-print-long-entry').count()>=1,'long-single-record');
    ok(await page.locator('.clinical-visit-source a').count()===0,'no-fabricated-hospital');
    ok(await page.locator('.clinical-visit-brief').getAttribute('data-provider-approved')==='false','no-hospital-approval');
    await page.emulateMedia({media:'print'});
    ok(await page.locator('.clinical-print-page').evaluate(e=>getComputedStyle(e).display)==='block','fragmentable-print-container');
    ok(await page.locator('.clinical-print-long-entry').first().evaluate(e=>getComputedStyle(e).breakInside)==='auto','long-item-breakable');
    const pdf=await page.pdf({format:'A4',printBackground:true,margin:{top:'11mm',right:'11mm',bottom:'11mm',left:'11mm'}});
    const count=(await PDFDocument.load(pdf)).getPageCount();
    ok(count>=4&&count<40,'multi-page-A4-'+count);
    const file='clinical-long-stress-a4.pdf';fs.writeFileSync(file,pdf);
    const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
    // Independent multi-page clinical safety: a detached source-record sheet
    // must retain patient-entered identity, the actual source period, the
    // non-diagnostic warning, and its own page index.
    for(let n=1;n<=count;n++){
      const pageText=execFileSync('pdftotext',['-f',String(n),'-l',String(n),'-raw',file,'-'],{encoding:'utf8'}).replace(/\s+/g,'');
      for(const token of ['SYNTHETIC_PATIENT_54','2026-09-01','2026-10-01','2026-10-02T09:00:00Z','의료기관미검증','진단아님']){
        ok(pageText.includes(token),'page-'+n+'-carry-id-'+token);
      }
      ok(pageText.includes(('쪽 '+n+' / '+count).replace(/\s+/g,'')),'page-'+n+'-correct-of-total');
    }
    for(const token of ['FAMILY_FIRST','FAMILY_LAST','LONG_NOTE_END','EXTERNAL_FIRST','EXTERNAL_LAST','EXTERNAL_PARITY_01','EXTERNAL_PARITY_17','PROFESSIONAL_FIRST','PROFESSIONAL_LAST','ZERO_SCORE_17']){
      ok(text.includes(token),'pdf-text-'+token);
    }
    // PDF text extractors legitimately insert line breaks in long assay names.
    // Compare a whitespace-normalized token without hiding a missing segment.
    ok(text.replace(/\s+/g,'').includes('SYNTHETIC-LC-MS-MS-METHOD'),
      'pdf-entered-assay-metadata-preserved');
    for(let i=1;i<=17;i++){
      const label='EXTERNAL_PARITY_'+String(i).padStart(2,'0');
      ok(text.includes(label),'pdf-all-seventeen-'+label);
    }
    ok(text.includes('2026-10-05'),'pdf-registration-date-preserved');
    await ctx.close();
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exit(1)});
