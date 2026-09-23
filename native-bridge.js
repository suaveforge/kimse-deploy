(()=>{'use strict';
const cap=()=>window.Capacitor||null;
let pedometer=null,listenerHandle=null,currentSteps=null,currentProvider='',listeners=new Set();

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
  const steps=Math.max(0,Math.round(Number(payload?.steps)||0));
  currentSteps=steps;
  currentProvider=String(payload?.provider||'native-pedometer');
  const event={steps,provider:currentProvider,observedAt:payload?.observedAt||new Date().toISOString()};
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
  if(result&&Number.isFinite(Number(result.steps))){
    notify(result);
    return {steps:currentSteps,provider:currentProvider,observedAt:result.observedAt||new Date().toISOString()};
  }
  return null;
}
async function startStepUpdates(callback){
  if(typeof callback==='function')listeners.add(callback);
  const p=plugin();if(!p)return {available:false,remove:async()=>{if(callback)listeners.delete(callback)}};
  const permission=await permissions();
  if(!permission.granted)return {...permission,remove:async()=>{if(callback)listeners.delete(callback)}};
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
