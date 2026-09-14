(()=>{
'use strict';
const PROJECT='p45';
const API='https://api-localizehub.suaveforge.com:18025';
const DEFAULT_LOCALE='ko';
const STORAGE_KEY=`localizehub:${PROJECT}:locale`;
const ATTRS=['placeholder','title','aria-label','alt'];
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
  const direct=baseLocale(localStorage.getItem(STORAGE_KEY));
  if(direct&&supportedSet.has(direct))return direct;
  let query='';
  try{query=baseLocale(new URL(location.href).searchParams.get('lang')||'')}catch{}
  if(query&&supportedSet.has(query))return query;
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
      const raw=n.nodeValue||'',key=normalize(raw),translated=sourceToTarget.get(key);
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
          const raw=el.getAttribute(name),translated=sourceToTarget.get(normalize(raw));
          if(!translated)continue;
          rememberAttr(el,name,raw);
          el.setAttribute(name,translated);
        }
      }
    }
  }finally{applying=false}
}
async function setLocale(locale){
  const next=baseLocale(locale)||DEFAULT_LOCALE;
  if(observer)observer.disconnect();
  restore(document);
  activeLocale=next;
  document.documentElement.lang=next;
  try{
    if(next!==DEFAULT_LOCALE){
      [sourceBundle,targetBundle]=await Promise.all([bundle(DEFAULT_LOCALE),bundle(next)]);
      sourceToTarget=translationMap(sourceBundle,targetBundle);
      applyTranslations(document);
    }else{
      sourceBundle={};targetBundle={};sourceToTarget=new Map();
    }
  }catch(error){
    console.warn('KIMSE LocalizeHub bundle unavailable:',error);
    sourceToTarget=new Map();
  }
  observe();
}
function observe(){
  if(observer)observer.disconnect();
  observer=new MutationObserver(records=>{
    if(applying||activeLocale===DEFAULT_LOCALE||!sourceToTarget.size)return;
    for(const r of records){
      for(const node of r.addedNodes){
        if(node.nodeType===Node.ELEMENT_NODE)applyTranslations(node);
        else if(node.nodeType===Node.TEXT_NODE&&node.parentElement)applyTranslations(node.parentElement);
      }
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
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
    const cfg=await config();
    setSwitcherVisibility(cfg);
    const locale=requestedLocale(cfg);
    await setLocale(locale);
    document.addEventListener('localechange',e=>{
      if(e.detail?.project===PROJECT&&e.detail?.locale)setLocale(e.detail.locale);
    });
    window.KIMSE_LOCALIZEHUB={project:PROJECT,api:API,get locale(){return activeLocale},setLocale};
  }catch(error){
    console.warn('KIMSE LocalizeHub unavailable:',error);
    document.documentElement.lang=DEFAULT_LOCALE;
    observe();
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
