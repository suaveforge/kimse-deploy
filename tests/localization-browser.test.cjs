'use strict';
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({headless:true});
  const base='http://127.0.0.1:8765';
  const cases=[
    {name:'English browser / KIMSE app',path:'/#/start',locale:'en-GB',expect:'Get started'},
    {name:'English browser / Evidence menu',path:'/evidence/',locale:'en-GB',expect:'Choose a section to explore.'},
    {name:'English browser / R&D atlas',path:'/evidence/rd.html',locale:'en-GB',expect:'Global research and institutional outreach at a glance'},
    {name:'Explicit English URL overrides saved Korean',path:'/evidence/?lang=en',locale:'ko-KR',saved:'ko',expect:'Choose a section to explore.'},
    {name:'Korean browser stays Korean',path:'/#/start',locale:'ko-KR',expect:'시작하기',expectedLanguage:'ko'},
    {name:'English works if LocalizeHub API is unavailable',path:'/evidence/?lang=en',locale:'en-GB',abortHub:true,expect:'Choose a section to explore.'}
  ];
  try{
    for(const c of cases){
      const context=await browser.newContext({locale:c.locale,viewport:{width:390,height:844}});
      const page=await context.newPage();
      if(c.saved)await page.addInitScript(v=>localStorage.setItem('localizehub:p45:locale',v),c.saved);
      if(c.abortHub)await page.route('**/api-localizehub.suaveforge.com:18025/**',route=>route.abort());
      const errors=[];page.on('pageerror',error=>errors.push(String(error)));
      await page.goto(base+c.path,{waitUntil:'domcontentloaded',timeout:35000});
      const expectedLanguage=c.expectedLanguage||'en';
      await page.waitForFunction(args=>document.documentElement.lang===args.language&&document.body.innerText.includes(args.text),{language:expectedLanguage,text:c.expect},{timeout:30000});
      const stats=await page.evaluate(()=>{
        const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
        let visibleText='',node;while(node=walker.nextNode()){
          const p=node.parentElement;
          if(p&&p.getClientRects().length&&!p.closest('script,style,noscript'))visibleText+=(node.nodeValue||'')+' ';
        }
        return {lang:document.documentElement.lang,untranslatedHangulChars:(visibleText.match(/[가-힣]/g)||[]).length,bodyChars:visibleText.length,overflow:document.documentElement.scrollWidth>window.innerWidth+6,untranslatedExamples:[...new Set(visibleText.split(/[\n·|]/).map(t=>t.trim()).filter(t=>/[가-힣]/.test(t)))].slice(0,18).map(x=>x.slice(0,150))};
      });
      if(c.path.startsWith('/evidence/rd')&&expectedLanguage==='en'){
        const more=await page.evaluate(()=>{
          const view=window.innerWidth;
          const culprits=[...document.querySelectorAll('body *')].map(el=>{
            const b=el.getBoundingClientRect(),st=getComputedStyle(el);
            return {tag:el.tagName,id:el.id,className:(typeof el.className==='string'?el.className:'').slice(0,75),right:Math.round(b.right),width:Math.round(b.width),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,parents:[el.parentElement,el.parentElement?.parentElement,el.parentElement?.parentElement?.parentElement].filter(Boolean).map(x=>(x.tagName.toLowerCase()+(x.className&&typeof x.className==='string'?'.'+x.className.slice(0,50):'')))};
          }).filter(x=>x.right>view+8&&x.width>0).slice(0,14);
          const frequency=new Map();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
          while(n=w.nextNode()){const e=n.parentElement;if(!e||e.getClientRects().length===0)continue;const txt=(n.nodeValue||'').trim();if(/[가-힣]/.test(txt))frequency.set(txt,(frequency.get(txt)||0)+1)}
          return {culprits,hangulTextNodes:[...frequency].sort((a,b)=>b[1]-a[1]).slice(0,35).map(([phrase,count])=>({phrase:phrase.slice(0,125),count}))};
        });
        console.log('EN_ATLAS_DETAIL',JSON.stringify(more));
      }
      await page.screenshot({path:'/tmp/kimse-'+cases.indexOf(c)+'-mobile.png',fullPage:false});
      console.log(JSON.stringify({test:c.name,result:'PASS',...stats,pageErrors:errors.slice(0,4)}));
      await context.close();
    }
  }finally{await browser.close()}
}
run().catch(error=>{console.error('KIMSE English localization QA FAILED',error);process.exit(1)});
