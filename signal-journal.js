/* KIMSE durable monitoring journal; it does not collect sensors in the background. */
(()=>{'use strict';
const DB='kimse-monitoring-journal-v1',STORE='events';let opening=null,writeTail=Promise.resolve(true);
function open(){
 if(opening)return opening;
 if(!('indexedDB'in window))return Promise.resolve(null);
 opening=new Promise(resolve=>{
  let req;try{req=indexedDB.open(DB,1)}catch{resolve(null);return}
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const t=db.createObjectStore(STORE,{keyPath:'client_event_id'});t.createIndex('observed_at','observed_at',{unique:false})}};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);req.onblocked=()=>resolve(null);
 });
 return opening;
}
async function persistOne(event){
 const db=await open();if(!db)return false;
 return new Promise(resolve=>{try{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(event);tx.oncomplete=()=>resolve(true);tx.onabort=()=>resolve(false);tx.onerror=()=>resolve(false)}catch{resolve(false)}});
}
function enqueue(event){const next=writeTail.then(()=>persistOne(event),()=>persistOne(event));writeTail=next.then(()=>true,()=>false);return next}
async function pending(limit=100,legacy=[]){
 await writeTail;const db=await open();let rows=[];
 if(db)rows=await new Promise(resolve=>{try{const tx=db.transaction(STORE,'readonly'),q=tx.objectStore(STORE).index('observed_at').getAll(null,Math.max(1,limit));q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>resolve([])}catch{resolve([])}});
 const all=new Map();for(const event of [...(legacy||[]),...rows])if(event?.client_event_id)all.set(event.client_event_id,event);
 return [...all.values()].sort((a,b)=>String(a.observed_at||'').localeCompare(String(b.observed_at||''))||String(a.client_event_id).localeCompare(String(b.client_event_id))).slice(0,limit);
}
async function acknowledge(ids){
 await writeTail;const db=await open();if(!db)return true;
 return new Promise(resolve=>{try{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);for(const id of ids)store.delete(id);tx.oncomplete=()=>resolve(true);tx.onabort=()=>resolve(false);tx.onerror=()=>resolve(false)}catch{resolve(false)}});
}
async function migrate(legacy){let ok=true;for(const event of Array.isArray(legacy)?legacy:[])if(event?.client_event_id&&!await enqueue(event))ok=false;return ok}
window.KIMSE_SIGNAL_JOURNAL=Object.freeze({enqueue,pending,acknowledge,migrate});
})();