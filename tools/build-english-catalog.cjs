'use strict';
/** Static/public KIMSE content translation only. Never transmit private user data. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),BASE='http://127.0.0.1:8765';
const OUTPUT=path.join(ROOT,'kimse-en-auto.json');
const curated=JSON.parse(fs.readFileSync(path.join(ROOT,'kimse-en.json'),'utf8')).translations;
const ko=/[가-힣]/,str=t=>String(t||'').replace(/\s+/g,' ').trim();
const wanted=new Set();
const publicPagePriority=new Set();
function add(t){
 const s=str(t).replace(/^["']+|["']+$/g,'');
 if(!ko.test(s)||s.length<2||s.length>900||/data:|https?:\/\/|[{};=]{3,}/.test(s)||/(?:function\s*\(|=>|return\s+|let\s+|const\s+)/.test(s))return;
 wanted.add(s);
}
function extractSource(file){
 let src=fs.readFileSync(path.join(ROOT,file),'utf8');
 for(const m of src.matchAll(/>([^<>]{1,850}[가-힣][^<>]{0,300})</g)){
  add(m[1].replace(/\$\{[^}]+\}/g,' ').replace(/\\[nrt]/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/g,' ').replace(/['"]?\s*\+\s*['"]?/g,' '));
 }
 for(const m of src.matchAll(/(?:placeholder|aria-label|title|alt)\s*=\s*["']([^"'<>]{1,220}[가-힣][^"'<>]{0,140})["']/g))add(m[1]);
 for(const m of src.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n]){1,260})\1/g)){
  const t=m[2];
  if(ko.test(t)&&!/[<>{}\\]/.test(t))add(t);
 }
}
async function extractBrowser(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const pages=['/','/evidence/','/evidence/observation.html','/evidence/clinical.html','/evidence/rd.html','/evidence/trust.html'];
  for(const dest of pages){
   const context=await browser.newContext({locale:'ko-KR',viewport:{width:1440,height:1000}});
   const page=await context.newPage();
   await page.route('https://api-localizehub.suaveforge.com/**',r=>r.abort());
   try{
    await page.goto(BASE+dest+'?lang=ko',{waitUntil:'domcontentloaded',timeout:22000});
    await page.waitForTimeout(dest.includes('/evidence/')?2300:900);
    const texts=await page.evaluate(()=>{
      const result=[],w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
      while(n=w.nextNode()){
       if(n.parentElement?.closest('script,style,noscript,textarea,pre,code'))continue;
       if(/[가-힣]/.test(n.nodeValue||''))result.push(n.nodeValue||'');
      }
      for(const el of document.querySelectorAll('[placeholder],[aria-label],[title],[alt]'))
       for(const a of ['placeholder','aria-label','title','alt']){
        const value=el.getAttribute(a);if(value&&/[가-힣]/.test(value))result.push(value);
       }
      return result;
    });
    texts.forEach(t=>{add(t);publicPagePriority.add(str(t));});
    console.log('EXTRACT_PAGE',dest,texts.length,'unique',wanted.size);
   }catch(e){console.warn('EXTRACT_PAGE_WARN',dest,String(e).slice(0,180))}
   await context.close();
  }
 }finally{await browser.close()}
}
const {spawnSync}=require('node:child_process');
const os=require('node:os');
async function main(){
 const files=['index.html','app.js','evidence/index.html','evidence/observation.html','evidence/clinical.html','evidence/rd.html','evidence/trust.html','evidence/evidence-application-tabs.js','evidence/rd-world-map.js','evidence/evidence-authority.js','evidence/evidence-model-render.js','evidence/evidence-pagination.js'];
 for(const f of files)if(fs.existsSync(path.join(ROOT,f)))extractSource(f);
 await extractBrowser();
 const existing=fs.existsSync(OUTPUT)?JSON.parse(fs.readFileSync(OUTPUT,'utf8')).translations:{};
 const candidates=[...wanted].filter(x=>!(x in curated)&&!(x in existing)).sort((a,b)=>Number(publicPagePriority.has(b))-Number(publicPagePriority.has(a))||a.length-b.length);
 const max=Number(process.env.MAX_TRANSLATIONS||'2200'),todo=candidates.slice(0,max);
 console.log('EXTRACTION_SUMMARY',JSON.stringify({unique:wanted.size,curated:Object.keys(curated).length,existing:Object.keys(existing).length,toTranslate:candidates.length,max}));
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kimse-public-translation-'));
 const input=path.join(tmp,'source.json'),answer=path.join(tmp,'translated.json');
 fs.writeFileSync(input,JSON.stringify(todo),'utf8');
 const subprocess=spawnSync('python3',[path.join(__dirname,'translate-public-catalog.py'),input,answer],{stdio:'inherit',timeout:1000*60*17});
 if(subprocess.status!==0||!fs.existsSync(answer))throw Error('Offline Python translation did not finish: status '+subprocess.status);
 const translated=JSON.parse(fs.readFileSync(answer,'utf8'));
 const result={...existing,...translated.translations};
 const ok=Object.keys(translated.translations||{}).length,fail=(translated.failures||[]).length,errors=translated.failures||[];
  const output={schemaVersion:'2026-10-15.en.auto1',locale:'en',sourceLocale:'ko',source:'public static source and anonymous public browser UI only',privacy:'No private data or participant records transmitted',disclaimer:'Machine translation of public UI; not validated clinical-instrument translations',translations:Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b,'ko')))};
 fs.writeFileSync(OUTPUT,JSON.stringify(output,null,2)+'\n','utf8');
 console.log('TRANSLATION_DONE',JSON.stringify({extracted:wanted.size,generated:Object.keys(result).length,ok,fail,remaining:Math.max(0,candidates.length-todo.length),errors:errors.slice(0,12)}));
}
main().catch(e=>{console.error(e);process.exit(1)});
