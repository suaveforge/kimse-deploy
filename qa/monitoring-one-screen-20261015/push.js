(()=>{'use strict';
const API='https://api-kimse.suaveforge.com',STATE_KEY='kimse.p0.state';
const state=()=>{try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}catch{return {}}};
const supported=()=>('serviceWorker'in navigator)&&('PushManager'in window)&&('Notification'in window);
const b64ToBytes=value=>{
  const pad='='.repeat((4-value.length%4)%4),raw=atob((value+pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
};
async function remoteRemove(s,subscription){
  if(!s?.remote?.accountId||!s?.remote?.subjectId||!s?.remote?.token||!subscription)return false;
  try{
    const r=await fetch(API+'/api/v1/subjects/'+encodeURIComponent(s.remote.subjectId)+'/push-subscriptions/remove',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-KIMSE-ACCOUNT-TOKEN':s.remote.token},
      body:JSON.stringify({account_id:s.remote.accountId,endpoint:subscription.endpoint}),
      keepalive:true
    });
    return r.ok;
  }catch{return false}
}
async function sync(){
  if(!supported())return {supported:false,active:false};
  const s=state();
  let reg;
  try{reg=await navigator.serviceWorker.ready}catch{return {supported:true,active:false,error:'SERVICE_WORKER_NOT_READY'}}
  let subscription=null;
  try{subscription=await reg.pushManager.getSubscription()}catch{}
  const wanted=!!s?.consents?.notifications&&Notification.permission==='granted';
  if(!wanted){
    if(subscription){
      await remoteRemove(s,subscription);
      try{await subscription.unsubscribe()}catch{}
    }
    return {supported:true,active:false,permission:Notification.permission};
  }
  if(!s?.remote?.accountId||!s?.remote?.subjectId||!s?.remote?.token){
    return {supported:true,active:!!subscription,pendingIdentity:true};
  }
  try{
    if(!subscription){
      const keyResponse=await fetch(API+'/api/v1/push/vapid-public-key',{cache:'no-store'});
      if(!keyResponse.ok)throw new Error('VAPID_'+keyResponse.status);
      const payload=await keyResponse.json();
      if(!payload.public_key)throw new Error('VAPID_KEY_MISSING');
      subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(payload.public_key)});
    }
    const r=await fetch(API+'/api/v1/subjects/'+encodeURIComponent(s.remote.subjectId)+'/push-subscriptions',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-KIMSE-ACCOUNT-TOKEN':s.remote.token},
      body:JSON.stringify({account_id:s.remote.accountId,...subscription.toJSON()})
    });
    if(!r.ok)throw new Error('PUSH_REGISTER_'+r.status);
    return {supported:true,active:true,permission:Notification.permission};
  }catch(err){
    return {supported:true,active:false,error:String(err?.message||err)};
  }
}
async function status(){
  if(!supported())return {supported:false,active:false};
  try{
    const reg=await navigator.serviceWorker.ready,subscription=await reg.pushManager.getSubscription();
    return {supported:true,active:!!subscription,permission:Notification.permission};
  }catch{return {supported:true,active:false,permission:Notification.permission}}
}
window.KIMSE_PUSH={sync,status};
window.addEventListener('online',()=>{const s=state();if(s?.consents?.notifications&&Notification.permission==='granted')sync()});
window.addEventListener('pageshow',()=>{const s=state();if(s?.consents?.notifications&&Notification.permission==='granted')sync()});
})();