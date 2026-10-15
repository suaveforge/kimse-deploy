(()=>{
'use strict';
const PROJECT='p45';
// KIMSE international English glossary: 2026-10-14; hub translations take precedence for other locales.
const API='https://api-localizehub.suaveforge.com:18025';
const DEFAULT_LOCALE='ko';
const STORAGE_KEY=`localizehub:${PROJECT}:locale`;
const ATTRS=['placeholder','title','aria-label','alt'];
const CONSISTENT_LOCALES=['ko','en'];
let controlsReady=false;
let supportedLocales=CONSISTENT_LOCALES;
const originalText=new WeakMap();
const originalAttrs=new WeakMap();
let activeLocale=DEFAULT_LOCALE;
let sourceBundle={};
let targetBundle={};
let sourceToTarget=new Map();
let applying=false;
let observer=null;

const normalize=v=>String(v??'').replace(/\s+/g,' ').trim();
const baseLocale=v=>String(v||'').toLowerCase().split(/[-_]/)[0];
async function fetchJSON(url){
  const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});
  if(!r.ok)throw new Error(`LocalizeHub HTTP ${r.status}`);
  return r.json();
}
async function config(){
  return fetchJSON(`${API}/api/v1/public/projects/${encodeURIComponent(PROJECT)}/locales`);
}
async function bundle(locale){
  const x=await fetchJSON(`${API}/api/v1/public/projects/${encodeURIComponent(PROJECT)}/bundle?locale=${encodeURIComponent(locale)}`);
  return x&&typeof x.texts==='object'&&x.texts?x.texts:{};
}
function requestedLocale(cfg){
  const supported=(cfg.supportedLocales||[]).map(baseLocale);
  const supportedSet=new Set(supported);
  let query='';
  try{query=baseLocale(new URL(location.href).searchParams.get('lang')||'')}catch{}
  if(query&&supportedSet.has(query))return query;
  const direct=baseLocale(localStorage.getItem(STORAGE_KEY));
  if(direct&&supportedSet.has(direct))return direct;
  for(const item of navigator.languages||[navigator.language]){
    const code=baseLocale(item);
    if(code&&supportedSet.has(code))return code;
  }
  const def=baseLocale(cfg.defaultLocale||DEFAULT_LOCALE);
  return supportedSet.has(def)?def:(supported[0]||DEFAULT_LOCALE);
}
function translationMap(source,target){
  const candidates=new Map();
  for(const [key,sourceText] of Object.entries(source||{})){
    const s=normalize(sourceText),t=normalize(target?.[key]);
    if(!s||!t||s===t)continue;
    if(!candidates.has(s))candidates.set(s,new Set());
    candidates.get(s).add(String(target[key]));
  }
  const map=new Map();
  for(const [s,values] of candidates){
    if(values.size===1)map.set(s,[...values][0]);
  }
  return map;
}
// Exact translations take priority; short standalone phrases support live table cells
// containing counts, statuses and localized institution names in the same text node.
let englishParts=[];
const compositeCache=new Map();
function translationFor(key){
  if(sourceToTarget.has(key))return sourceToTarget.get(key);
  if(activeLocale!=='en'||!/[가-힣]/.test(key))return null;
  if(compositeCache.has(key))return compositeCache.get(key);
  let out=key.replace(/(\d{4})년대/g,'$1s')
    .replace(/([\d,]+)명/g,'$1 people')
    .replace(/(\d+)회/g,'$1 times')
    .replace(/(\d+)개(?!\s*기관)/g,'$1 items');
  for(const pair of englishParts)out=out.replace(pair.pattern,pair.translation);
  out=out.replace(/(\d+)\s*개 기관/g,'$1 institutions')
    .replace(/(\d+)\s*곳/g,'$1 institutions')
    .replace(/(\d+)\s*단계/g,'Stage $1')
    .replace(/(\d+)\s*건/g,'$1 records')
    .replace(/(\d+)\s*점/g,'$1 points');
  const translated=out===key?null:out;
  if(compositeCache.size>2000)compositeCache.clear();
  compositeCache.set(key,translated);
  return translated;
}
function compileEnglishParts(){
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  englishParts=[...sourceToTarget.entries()]
    .filter(([source,target])=>source.length>=2&&source.length<=90&&/[가-힣]/.test(source)&&!/[\n\r]/.test(source)&&target)
    .sort((a,b)=>b[0].length-a[0].length)
    .map(([source,translation])=>({pattern:new RegExp('(?<![가-힣])'+escape(source)+'(?![가-힣])','g'),translation}));
  compositeCache.clear();
}
function rememberAttr(el,name,value){
  let attrs=originalAttrs.get(el);
  if(!attrs){attrs={};originalAttrs.set(el,attrs)}
  if(!(name in attrs))attrs[name]=value;
}
function restore(root=document){
  applying=true;
  try{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let n;
    while((n=walker.nextNode())){
      if(originalText.has(n))n.nodeValue=originalText.get(n);
    }
    if(root.querySelectorAll){
      for(const el of root.querySelectorAll('*')){
        const attrs=originalAttrs.get(el);
        if(!attrs)continue;
        for(const [name,value] of Object.entries(attrs)){
          if(value===null)el.removeAttribute(name);else el.setAttribute(name,value);
        }
      }
    }
  }finally{applying=false}
}
function skipTextNode(node){
  const p=node.parentElement;
  if(!p)return true;
  return !!p.closest('script,style,noscript,code,pre,textarea,localize-switcher');
}
function applyTranslations(root=document){
  if(activeLocale===DEFAULT_LOCALE||!sourceToTarget.size)return;
  applying=true;
  try{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let n;
    while((n=walker.nextNode())){
      if(skipTextNode(n))continue;
      const raw=n.nodeValue||'',key=normalize(raw),translated=translationFor(key);
      if(!translated)continue;
      if(!originalText.has(n))originalText.set(n,raw);
      const leading=raw.match(/^\s*/)?.[0]||'';
      const trailing=raw.match(/\s*$/)?.[0]||'';
      n.nodeValue=leading+translated+trailing;
    }
    if(root.querySelectorAll){
      for(const el of root.querySelectorAll('*')){
        if(el.closest('localize-switcher'))continue;
        for(const name of ATTRS){
          if(!el.hasAttribute(name))continue;
          const raw=el.getAttribute(name),translated=translationFor(normalize(raw));
          if(!translated)continue;
          rememberAttr(el,name,raw);
          el.setAttribute(name,translated);
        }
      }
    }
  }finally{applying=false}
}
function documentLocaleParameter(){
  // Keep an explicitly chosen country variant in URLs; translation bundle stays base 'en'.
  const param=new URL(location.href).searchParams.get('lang')||'';
  return activeLocale==='en'&&/^en[-_](US|GB)$/i.test(param)?'en-'+param.split(/[-_]/)[1].toUpperCase():activeLocale;
}
function updateLocalizedMetadata(){
  const path=location.pathname;
  const pages={
    '/':['KIMSE | Everyday Cognitive Change Tracking','낌새(KIMSE) | 일상 속 인지 변화 관찰',
      'KIMSE helps users review changes in sleep, speech, movement and daily routines. It does not diagnose dementia.',
      '낌새는 수면·이동·말하기 등 일상생활의 변화를 관찰하도록 돕습니다. 치매 진단을 대신하지 않습니다.'],
    '/evidence/':['KIMSE Evidence | Sources and Methods','낌새 · Evidence Registry',
      'Explore sources and methods behind KIMSE research, clinical handoff design, data provenance and competitor review.',
      '낌새의 관찰 근거·의료 전달·연구·데이터 신뢰 구조를 확인합니다.'],
    '/evidence/observation.html':['What KIMSE Observes | Research Evidence','낌새 · 관찰 근거',
      'Review research on sleep, movement, speech and cognition. Published findings are not KIMSE diagnostic accuracy.',
      '관찰 신호의 연구 출처와 한계를 설명합니다. 연구 결과는 낌새 자체 진단 정확도가 아닙니다.'],
    '/evidence/clinical.html':['Clinical Handoff Design | KIMSE Evidence','낌새 · 의료 리포트',
      'How KIMSE prepares observations for clinician review without replacing clinical evaluation or diagnosis.',
      '낌새의 관찰 기록을 의료진이 검토할 수 있도록 정리하는 설계입니다. 진단을 대신하지 않습니다.'],
    '/evidence/rd.html':['Research Data Model | KIMSE Evidence','낌새 · 연구·기관 R&D',
      'Explore the proposed longitudinal research data model, consent context and validation requirements.',
      '기관 공동연구와 검증을 위한 종단 데이터 구조 및 동의·품질 원칙을 설명합니다.'],
    '/evidence/trust.html':['Data Quality and Provenance | KIMSE Evidence','낌새 · 데이터 신뢰·검증',
      'Explore the proposed data integrity, consent history and provenance approach. No regulatory approval is implied.',
      '데이터 무결성·동의·접근 이력과 신뢰 구조를 설명합니다. 규제 승인을 의미하지 않습니다.'],
    '/evidence/competitors.html':['Competitor Research | KIMSE Evidence','경쟁사 연구 · KIMSE Evidence',
      'Compare publicly documented digital cognitive care and monitoring products and their integration limitations.',
      '인지관리·생활관찰 서비스의 공개 실적과 데이터 연동 가능성을 비교합니다.']
  };
  const item=pages[path]||pages[path==='/index.html'?'/':path==='/evidence/index.html'?'/evidence/':''];
  if(!item)return;
  const english=activeLocale==='en';
  const title=item[english?0:1],summary=item[english?2:3];
  document.title=title;
  for(const [selector,value] of [['meta[name="description"]',summary],['meta[property="og:title"]',title],['meta[property="og:description"]',summary]]){
    const el=document.querySelector(selector);
    if(el)el.setAttribute('content',value);
  }
  const locale=document.querySelector('meta[property="og:locale"]');
  if(locale)locale.setAttribute('content',english?(documentLocaleParameter()==='en-GB'?'en_GB':'en_US'):'ko_KR');
  if(path==='/'||path==='/index.html'){
    const manifest=document.querySelector('link[rel="manifest"]');
    const target=english?'./manifest-en.webmanifest':'./manifest.webmanifest';
    if(manifest&&manifest.getAttribute('href')!==target)manifest.setAttribute('href',target);
  }
}
function preserveLocaleLinks(root=document){
  const param=documentLocaleParameter();
  const links=[...(root.matches?.('a[href]')?[root]:[]),...(root.querySelectorAll?.('a[href]')||[])];
  for(const a of links){
    const href=a.getAttribute('href')||'';
    if(!href||href[0]==='#'||href.startsWith('mailto:')||href.startsWith('javascript:'))continue;
    try{
      const url=new URL(href,location.href);
      if(url.origin!==location.origin)continue;
      // Evidence and app links must carry the same explicit language across documents.
      if(!url.pathname.startsWith('/evidence/')&&url.pathname!=='/'&&!url.pathname.startsWith('/app/'))continue;
      if(url.searchParams.get('lang')===param)continue;
      url.searchParams.set('lang',param);
      a.setAttribute('href',url.pathname+url.search+url.hash);
    }catch{}
  }
}
function ensureLocaleControl(cfg){
  // The legacy LocalizeHub switcher has its own selection state and may show
  // Korean while ?lang=en is active; replace only its presentation with one
  // deterministic control, keeping LocalizeHub bundles and project p45.
  const wraps=[...document.querySelectorAll('.kimse-lang-wrap')];
  if(!wraps.length||controlsReady)return;
  supportedLocales=[...new Set((cfg?.supportedLocales||CONSISTENT_LOCALES).map(baseLocale))];
  const options=CONSISTENT_LOCALES.filter(v=>supportedLocales.includes(v));
  for(const wrap of wraps){
    const legacy=wrap.querySelector('localize-switcher');
    if(legacy)legacy.style.setProperty('display','none','important');
    if(wrap.querySelector('[data-kimse-locale-select]'))continue;
    const label=document.createElement('label');
    label.setAttribute('aria-label','Language / 언어');
    label.className='kimse-verified-language';
    label.style.cssText='display:inline-flex;align-items:center;max-width:100%;font-size:14px;white-space:nowrap';
    const sel=document.createElement('select');
    sel.setAttribute('data-kimse-locale-select','');
    sel.setAttribute('aria-label','Language / 언어');
    sel.style.cssText='min-width:110px;max-width:100%;padding:8px 11px;font:inherit;border:1px solid #afc5db;border-radius:8px;background:#fff;color:#1b3652;cursor:pointer';
    for(const code of options){
      const opt=document.createElement('option');
      opt.value=code;
      opt.textContent=code==='en'?'English':'한국어';
      sel.append(opt);
    }
    sel.value=activeLocale;
    sel.addEventListener('change',()=>{
      const next=sel.value;
      localStorage.setItem(STORAGE_KEY,next);
      const url=new URL(location.href);
      url.searchParams.set('lang',next);
      history.replaceState(history.state,'',url.pathname+url.search+url.hash);
      setLocale(next);
    });
    label.append(sel);wrap.append(label);
  }
  controlsReady=true;
}
function syncLocaleControls(){
  for(const sel of document.querySelectorAll('[data-kimse-locale-select]'))sel.value=activeLocale;
}
async function setLocale(locale){
  const next=baseLocale(locale)||DEFAULT_LOCALE;
  if(observer)observer.disconnect();
  restore(document);
  activeLocale=next;
  // Persist explicit URL and UI choice across Evidence page navigation.
  try{localStorage.setItem(STORAGE_KEY,next)}catch{}
  document.documentElement.lang=next;
  syncLocaleControls();
  try{
    if(next!==DEFAULT_LOCALE){
      [sourceBundle,targetBundle]=await Promise.all([
        bundle(DEFAULT_LOCALE).catch(()=>({})),
        bundle(next).catch(()=>({}))
      ]);
      sourceToTarget=translationMap(sourceBundle,targetBundle);
      if(next==='en'){
        // Offline machine-translation drafts contain PUBLIC source text only.
        // Never send live form values or health data to an external translator.
        const autoGlossary=await fetchJSON('/kimse-en-auto.json?v=20261015-offline-full1').catch(()=>({}));
        for(const [source,translation] of Object.entries(autoGlossary?.translations||{})){
          if(normalize(source)&&normalize(translation)&&!/[가-힣]/.test(translation))sourceToTarget.set(normalize(source),String(translation));
        }
        const verifiedGlossary=await fetchJSON('/kimse-en.json?v=20261015-archive-locale-1');
        const entries=verifiedGlossary?.translations||{};
        for(const [k,v] of Object.entries(entries)){
          if(normalize(k)&&normalize(v))sourceToTarget.set(normalize(k),String(v));
        }
      }
      compileEnglishParts();
      applyTranslations(document);
    }else{
      sourceBundle={};targetBundle={};sourceToTarget=new Map();
    }
  }catch(error){
    console.warn('KIMSE LocalizeHub bundle unavailable:',error);
    sourceToTarget=new Map();
    englishParts=[];compositeCache.clear();
  }
  updateLocalizedMetadata();
  preserveLocaleLinks(document);
  observe();
}
function observe(){
  if(observer)observer.disconnect();
  observer=new MutationObserver(records=>{
    if(applying)return;
    for(const record of records){
      for(const node of record.addedNodes||[]){
        if(node.nodeType===Node.ELEMENT_NODE)preserveLocaleLinks(node);
      }
    }
    if(activeLocale===DEFAULT_LOCALE||!sourceToTarget.size)return;
    for(const r of records){
      if(r.type==='characterData'&&r.target?.parentElement){applyTranslations(r.target.parentElement);continue;}
      for(const node of r.addedNodes){
        if(node.nodeType===Node.ELEMENT_NODE)applyTranslations(node);
        else if(node.nodeType===Node.TEXT_NODE&&node.parentElement)applyTranslations(node.parentElement);
      }
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
}
function setSwitcherVisibility(cfg){
  const count=new Set((cfg.supportedLocales||[]).map(baseLocale).filter(Boolean)).size;
  let style=document.getElementById('kimse-localizehub-visibility');
  if(count<=1){
    if(!style){style=document.createElement('style');style.id='kimse-localizehub-visibility';document.head.append(style)}
    style.textContent='localize-switcher{display:none!important}';
  }else if(style){style.remove()}
}
async function boot(){
  try{
    const cfg=await config().catch(()=>({defaultLocale:'ko',supportedLocales:['ko','en']}));
    setSwitcherVisibility(cfg);
    const locale=requestedLocale(cfg);
    activeLocale=locale;
    ensureLocaleControl(cfg);
    await setLocale(locale);
    // The embedded legacy widget can emit its default ko locale during every
    // document load. Only the verified explicit selector controls language.
    // Do not let a widget initialization event silently reset ?lang=en.
    window.KIMSE_LOCALIZEHUB={project:PROJECT,api:API,get locale(){return activeLocale},get localeParameter(){return documentLocaleParameter()},translate:text=>translationFor(normalize(text))||String(text||''),setLocale};
  }catch(error){
    console.warn('KIMSE LocalizeHub unavailable:',error);
    document.documentElement.lang=DEFAULT_LOCALE;
    observe();
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
