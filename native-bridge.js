(()=>{'use strict';
const cap=()=>window.Capacitor||null;
let pedometer=null,listenerHandle=null,currentSteps=null,currentProvider='',currentObservedDay='',listeners=new Set();

function plugin(){
  if(pedometer)return pedometer;
  const c=cap();
  if(!c||!c.isNativePlatform?.())return null;
  try{
    pedometer=c.Plugins?.KimsePedometer||c.registerPlugin?.('KimsePedometer')||null;
  }catch{pedometer=null}
  return pedometer;
}
function notify(payload){
  const raw=payload?.steps;
  if(payload?.available===false||payload?.granted===false||payload?.observedToday===false||raw===null||raw===undefined||String(raw).trim()===''||!Number.isFinite(Number(raw)))return;
  const steps=Math.max(0,Math.round(Number(raw)));
  const provider=String(payload?.provider||'native-pedometer');
  const observedAt=payload?.observedAt||new Date().toISOString();
  const observedDate=new Date(observedAt);
  const observedDay=Number.isNaN(observedDate.getTime())?new Date().toDateString():observedDate.toDateString();
  // A polling read of an unchanged same-day counter must not emit a second sensor event.
  if(currentSteps===steps&&currentProvider===provider&&currentObservedDay===observedDay)return;
  currentSteps=steps;
  currentProvider=provider;
  currentObservedDay=observedDay;
  const event={steps,provider,observedAt};
  for(const fn of listeners){try{fn(event)}catch{}}
  window.dispatchEvent(new CustomEvent('kimse:pedometer',{detail:event}));
}
async function permissions(){
  const p=plugin();if(!p)return {available:false,granted:false,platform:'web'};
  try{
    if(typeof p.requestPermissions==='function'){
      const result=await p.requestPermissions();
      return {available:result?.available!==false,granted:result?.granted!==false,platform:cap()?.getPlatform?.()||'native'};
    }
    return {available:true,granted:true,platform:cap()?.getPlatform?.()||'native'};
  }catch(error){
    return {available:true,granted:false,platform:cap()?.getPlatform?.()||'native',error:String(error?.message||error)};
  }
}
async function readToday(){
  const p=plugin();if(!p)return null;
  const result=await p.getTodaySteps();
  if(result&&result.available!==false&&result.granted!==false&&result.observedToday!==false&&result.steps!==null&&result.steps!==undefined&&String(result.steps).trim()!==''&&Number.isFinite(Number(result.steps))){
    notify(result);
    return {steps:currentSteps,provider:currentProvider,observedAt:result.observedAt||new Date().toISOString()};
  }
  return null;
}
async function startStepUpdates(callback){
  if(typeof callback==='function')listeners.add(callback);
  const p=plugin();if(!p)return {available:false,remove:async()=>{if(callback)listeners.delete(callback)}};
  const permission=await permissions();
  if(!permission.available||!permission.granted)return {...permission,remove:async()=>{if(callback)listeners.delete(callback)}};
  try{await readToday()}catch{}
  if(!listenerHandle&&typeof p.addListener==='function'){
    listenerHandle=await p.addListener('stepUpdate',notify);
  }
  if(typeof p.startUpdates==='function')await p.startUpdates();
  return {available:true,granted:true,remove:async()=>{
    if(callback)listeners.delete(callback);
    if(!listeners.size){
      try{await p.stopUpdates?.()}catch{}
      try{await listenerHandle?.remove?.()}catch{}
      listenerHandle=null;
    }
  }};
}
async function getDailySignals(){
  const rows=[];
  try{
    const today=await readToday();
    if(today)rows.push({metric:'steps',value:today.steps,unit:'count',provider:today.provider||'native-pedometer'});
  }catch{}
  return rows;
}
window.KIMSE_NATIVE=Object.freeze({
  platform:()=>cap()?.getPlatform?.()||'web',
  isNative:()=>!!cap()?.isNativePlatform?.(),
  requestStepPermission:permissions,
  getTodaySteps:readToday,
  startStepUpdates,
  getDailySignals
});
})();
