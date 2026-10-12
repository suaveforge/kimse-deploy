'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-editorial/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='qa-artifacts/senior-editorial';
fs.mkdirSync(out,{recursive:true});
const BASE='https://kimse.suaveforge.com/#/';
const profiles=[{w:320,mode:'normal'},{w:375,mode:'normal'},{w:375,mode:'large'},{w:375,mode:'contrast'}];
const routes=['evidence-proof','research-engine','assessment','brain-map'];
const audit=[];
const seed=(route,mode)=>({
  version:14,account:{name:'시각 검수',email:'qa@example.invalid'},intent:'both',self:true,care:true,mode:'self',
  onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
  initial:{step:5,completedAt:'2026-09-30T12:00:00Z',answers:{},voiceSamples:[],domains:{memory:86,executive:82,language:86,spatial:86,daily:85}},
  baseline:{startedAt:'2026-09-17T00:00:00Z'},brainHistory:[],
  consents:{service:true,privacy:true,health:true,location:false,motion:false,usage:false,microphone:false,notifications:false,caregiverShare:false},
  a11y:{largeText:mode==='large',highContrast:mode==='contrast',largeTouchTargets:mode!=='normal',voiceGuidance:false,soundEffects:false}
});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const profile of profiles){
   for(const route of routes){
    const cx=await browser.newContext({viewport:{width:profile.w,height:810},reducedMotion:'reduce',deviceScaleFactor:1});
    await cx.addInitScript(state=>localStorage.setItem('kimse.p0.state',JSON.stringify(state)),seed(route,profile.mode));
    const page=await cx.newPage();
    const runtimeErrors=[];
    page.on('pageerror',e=>runtimeErrors.push(String(e)));
    try{
     await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:40000});
     const root=page.locator('.screen-'+route);
     await root.waitFor({timeout:20000});
     await page.waitForTimeout(550);
     const m=await page.evaluate(route=>{
      const screen=document.querySelector('.screen-'+route),q=x=>screen.querySelector(x);
      const box=x=>{const el=q(x);if(!el)return null;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.left,y:r.top,w:r.width,h:r.height,lh:parseFloat(s.lineHeight)||0,font:parseFloat(s.fontSize)||0,text:el.innerText?.trim()||''}};
      const boxes=[...screen.querySelectorAll('.research-source')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el.querySelector('strong'));return {x:r.left,y:r.top,w:r.width,h:r.height,font:parseFloat(s.fontSize)||0}});
      return {docWidth:document.documentElement.scrollWidth,viewWidth:innerWidth,
       title:box('.page-title'),researchCards:boxes,summaryText:q('.brain-focus-summary')?.innerText||'',
       originalDescriptions:screen.querySelectorAll(':scope > .page-desc').length,
       factorLabels:[...screen.querySelectorAll('.research-factor-row em')].map(e=>e.textContent.trim()),
       sourceText:[...screen.querySelectorAll('.research-source strong')].map(e=>e.innerText.trim())}
     },route);
     assert(m.docWidth<=m.viewWidth+2,route+' overflows viewport at '+profile.w+'/'+profile.mode);
     if(route==='evidence-proof'&&profile.mode==='normal'&&profile.w===375)
       assert(m.title?.lh>0 && m.title.h/m.title.lh<=2.35,'Evidence title has an orphan Korean syllable: '+JSON.stringify(m.title));
     if(route==='research-engine'){
      assert.equal(m.researchCards.length,3,'three citation sources required');
      assert(m.researchCards.every(x=>x.w>=profile.w*.71&&x.font>=15),'source labels are squeezed or too small: '+JSON.stringify(m.researchCards));
      for(let i=1;i<m.researchCards.length;i++)assert(m.researchCards[i].y>=m.researchCards[i-1].y+m.researchCards[i-1].h-2,'citation cards overlap');
      assert.deepEqual(m.factorLabels,['나의 평소 기준','나의 평소 기준','나의 평소 기준','나의 평소 기준'],'baseline must be legible Korean');
     }
     if(route==='brain-map'){
      assert.equal(m.originalDescriptions,1,'brain map repeats original introduction');
      assert(m.summaryText.includes('개인 진단 점수나 뇌영상 검사 결과가 아닙니다'),'map must retain medical limits');
     }
     assert.equal(runtimeErrors.filter(x=>!x.includes('require is not defined')).length,0,'JavaScript errors: '+runtimeErrors.join(' | '));
     const name=route+'-'+profile.w+'-'+profile.mode;
     await page.screenshot({path:out+'/'+name+'.png',fullPage:true,animations:'disabled'});
     audit.push({route,...profile,ok:true,metrics:m});
     console.log('KIMSE_EDITORIAL_VISUAL=PASS '+name+' '+JSON.stringify({height:m.title?.h,cards:m.researchCards.map(x=>[Math.round(x.w),Math.round(x.h)]),width:m.docWidth}));
    }finally{await cx.close()}
   }
  }
  fs.writeFileSync(out+'/audit.json',JSON.stringify(audit,null,2));
  console.log('KIMSE_EDITORIAL_VISUAL_ALL=PASS 16 browser states');
 }finally{await browser.close()}
})().catch(e=>{console.error('KIMSE_EDITORIAL_VISUAL_FAILED',e.stack||e);process.exitCode=1});