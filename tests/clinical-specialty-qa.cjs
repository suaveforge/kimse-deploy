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
async function awaitExactJS(){
 const expected=hash(fs.readFileSync('app.js'));
 for(let n=0;n<60;n++){
   try{
    const res=await fetch(BASE+'app.js?clinicalFocus='+expected.slice(0,16)+'&attempt='+n,{cache:'no-store'});
    if(res.ok&&hash(Buffer.from(await res.arrayBuffer()))===expected){
      console.log('KIMSE_SPECIALTY_LIVE_SHA256='+expected);return;
    }
   }catch{}
   await new Promise(r=>setTimeout(r,5000));
 }
 throw Error('CLINICAL_FOCUS_LIVE_JS_SHA_NOT_MATCHED');
}
async function main(){
 await awaitExactJS();
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
  const ctx=await browser.newContext({viewport:{width:1440,height:950},serviceWorkers:'block'});
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
   const pdf=await page.pdf({format:'A4',printBackground:true,
     margin:{top:'11mm',right:'11mm',bottom:'11mm',left:'11mm'}});
   const pages=(await PDFDocument.load(pdf)).getPageCount();
   check(pages>=1&&pages<=4,'a4-pages-'+item.id+'-'+pages);
   const file='clinical-specialty-'+item.id+'.pdf';
   fs.writeFileSync('clinical-specialty-qa/'+file,pdf);
   const extracted=execFileSync('pdftotext',['-layout','clinical-specialty-qa/'+file,'-'],{encoding:'utf8'});
   const compact=extracted.replace(/\\s+/g,'');
   check(compact.includes(item.needle.replace(/\\s+/g,'')),'pdf-specialty-heading-'+item.id);
   check(compact.includes('정상소견으로해석하지않음'),'pdf-missing-does-not-become-normal-'+item.id);
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
 }finally{await browser.close();}
 console.log('KIMSE_SPECIALTY_LIVE_24_CASES_4_A4_PDFS=PASS');
}
fs.mkdirSync('clinical-specialty-qa',{recursive:true});
main().catch(e=>{console.error(e);process.exit(1)});
