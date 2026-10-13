'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kh-preview/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const root='qa-artifacts/home-preview';
fs.mkdirSync(root,{recursive:true});
const variants=[
 {w:320,h:720,mode:'normal'},{w:375,h:812,mode:'normal'},
 {w:430,h:860,mode:'normal'},{w:1440,h:900,mode:'normal'},
 {w:375,h:812,mode:'large'},{w:375,h:812,mode:'contrast'},
 {w:220,h:812,mode:'zoom'}
];
(async()=>{
 const browser=await chromium.launch({headless:true}),report=[];
 try{
  for(const v of variants){
   const page=await browser.newPage({viewport:{width:v.w,height:v.h},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.addInitScript(({mode})=>{
    localStorage.setItem('kimse.p0.state',JSON.stringify({
      version:14,account:{name:'김노인',email:'preview@example.invalid'},intent:'both',self:true,care:true,mode:'self',
      onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
      initial:{step:5,completedAt:'2026-10-01T12:00:00Z',answers:{},voiceSamples:[]},
      baseline:{startedAt:new Date(Date.now()-1.73*86400000).toISOString()},
      caregivers:[],consents:{service:true,privacy:true,health:true,caregiverShare:false},
      a11y:{largeText:mode==='large',highContrast:mode==='contrast',largeTouchTargets:mode!=='normal'}
    }));
   },{mode:v.mode});
   await page.goto('http://127.0.0.1:4173/#/home',{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('.screen-home .kh2-actions').waitFor({timeout:16000});
   await page.waitForTimeout(200);
   const m=await page.evaluate(()=>{
    const q=x=>document.querySelector(x),r=x=>q(x)?.getBoundingClientRect();
    return {screen:location.hash,viewport:innerWidth,docWidth:document.documentElement.scrollWidth,
      actions:[...document.querySelectorAll('.kh2-action')].map(x=>({name:x.querySelector('strong')?.textContent,icon:x.querySelector('.icon')?.textContent,href:x.getAttribute('href')})),
      navCount:document.querySelectorAll('.bottom-nav .nav-item').length,
      lastTileBottom:r('.kh2-action:last-child')?.bottom,
      navTop:r('.bottom-nav')?.top,
      status:q('.kh2-status-content>strong')?.textContent,
      progText:q('.kh2-progress-head')?.textContent,
      progAria:q('.kh2-track')?.getAttribute('aria-label')
    };
   });
   const key='home-'+v.w+'-'+v.mode;
   await page.screenshot({path:root+'/'+key+'.png',fullPage:true,animations:'disabled'});
   if(v.w===375&&v.mode==='normal')await page.screenshot({path:root+'/home-375-first-screen.png',fullPage:false,animations:'disabled'});
   report.push({key,...m,errors});
   assert.equal(m.screen,'#/home','real home page');
   assert(m.docWidth<=m.viewport+2,'horizontal overflow: '+key+' '+JSON.stringify(m));
   assert.equal(m.navCount,5,'preserve native five-tab navigation');
   assert.deepEqual(m.actions.map(x=>x.icon),['🧠','🧩','💊','💚'],'restore original visible icons');
   assert.equal(m.actions.length,4);
   assert(m.status&&!m.status.includes('정상'),'do not infer a normal state without data');
   assert.equal(errors.filter(x=>!x.includes('require is not defined')).length,0,'JavaScript errors: '+errors.join(' | '));
   if(v.w<=375&&v.mode==='normal')assert(m.lastTileBottom<=m.navTop+2,'four original actions must fit above bottom nav at '+v.w+'px: '+JSON.stringify(m));
   console.log('HOME_COMPACT_PASS '+key+' '+JSON.stringify({lastTileBottom:m.lastTileBottom,navTop:m.navTop,docWidth:m.docWidth}));
   await page.close();
  }
  fs.writeFileSync(root+'/report.json',JSON.stringify(report,null,2));
  console.log('HOME_COMPACT_ALL_PASS '+report.length);
 }finally{await browser.close()}
})().catch(e=>{console.error('HOME_COMPACT_FAILED '+(e.stack||e));process.exitCode=1});
