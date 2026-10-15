(()=>{'use strict';
const API='https://api-authhub.suaveforge.com';
const PROJECT='p45';
const ENV='production';
const SESSION_KEY='kimse.authhub.session.v1';
const PENDING_KEY='kimse.authhub.pending.v1';
const CLIENT='kimse-p45';
let configCache=null;

function redirectUri(){
  return location.origin+location.pathname;
}
function readJson(key){
  try{return JSON.parse(localStorage.getItem(key)||sessionStorage.getItem(key)||'null')}catch{return null}
}
function session(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}
}
function pendingVerification(){
  try{return JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null')}catch{return null}
}
function saveSession(value){
  const normalized={
    accessToken:String(value?.accessToken||''),
    refreshToken:String(value?.refreshToken||''),
    expiresAt:Date.now()+Math.max(60,Number(value?.expiresIn)||3600)*1000,
    tokenType:value?.tokenType||'Bearer',
    user:value?.user||null,
    membership:value?.membership||null,
    onboarding:value?.onboarding||null
  };
  if(!normalized.accessToken||!normalized.refreshToken)throw new Error('AUTHHUB_SESSION_INVALID');
  localStorage.setItem(SESSION_KEY,JSON.stringify(normalized));
  sessionStorage.removeItem(PENDING_KEY);
  return normalized;
}
async function request(path,options={}){
  const headers={'Content-Type':'application/json','X-AuthHub-Client':CLIENT,...(options.headers||{})};
  const response=await fetch(API+path,{credentials:'include',cache:'no-store',...options,headers});
  const text=await response.text();
  let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text||'request_failed'}}
  if(!response.ok){
    const error=new Error(data.error||('AuthHub HTTP '+response.status));
    error.status=response.status;error.data=data;throw error;
  }
  return {status:response.status,data};
}
async function config(force=false){
  if(configCache&&!force)return configCache;
  const {data}=await request('/v1/config/'+encodeURIComponent(PROJECT)+'?environment='+encodeURIComponent(ENV),{method:'GET'});
  configCache=data;return data;
}
async function finishPasswordResponse(result){
  if(result.data?.verificationRequired){
    sessionStorage.setItem(PENDING_KEY,JSON.stringify({
      user:result.data.user||null,
      membership:result.data.membership||null,
      challenge:result.data.challenge||null,
      deliveryPending:!!result.data.deliveryPending,
      deliveryError:result.data.deliveryError||''
    }));
    return {verificationRequired:true,...result.data};
  }
  if(result.data?.pendingApproval)return {pendingApproval:true,...result.data};
  return saveSession(result.data);
}
async function login({email,password}){
  return finishPasswordResponse(await request('/v1/auth/'+PROJECT+'/login?environment='+ENV,{
    method:'POST',
    body:JSON.stringify({email,password,redirectUri:redirectUri(),state:'kimse'})
  }));
}
async function signup({email,password,displayName}){
  return finishPasswordResponse(await request('/v1/auth/'+PROJECT+'/signup?environment='+ENV,{
    method:'POST',
    body:JSON.stringify({email,password,displayName,redirectUri:redirectUri(),state:'kimse'})
  }));
}
async function exchangeCode(code){
  const {data}=await request('/v1/auth/'+PROJECT+'/exchange?environment='+ENV,{
    method:'POST',body:JSON.stringify({code:String(code||'')})
  });
  return saveSession(data);
}
async function verifyEmail(code){
  await request('/v1/auth/'+PROJECT+'/profile-completion/email/verify?environment='+ENV,{
    method:'POST',body:JSON.stringify({code:String(code||'').trim()})
  });
  const {data}=await request('/v1/auth/'+PROJECT+'/profile-completion/complete?environment='+ENV,{
    method:'POST',body:'{}'
  });
  const target=new URL(data.redirectTo,location.href);
  const oneTime=target.searchParams.get('code');
  if(!oneTime)throw new Error(data.status==='pending_approval'?'AUTHHUB_PENDING_APPROVAL':'AUTHHUB_CODE_MISSING');
  return exchangeCode(oneTime);
}
async function refresh(){
  const current=session();
  if(!current?.refreshToken)return null;
  try{
    const {data}=await request('/v1/auth/'+PROJECT+'/refresh?environment='+ENV,{
      method:'POST',body:JSON.stringify({refreshToken:current.refreshToken})
    });
    return saveSession(data);
  }catch(error){
    localStorage.removeItem(SESSION_KEY);
    throw error;
  }
}
async function accessToken(){
  const current=session();
  if(!current)return '';
  if(Number(current.expiresAt||0)-Date.now()>60000&&current.accessToken)return current.accessToken;
  const renewed=await refresh();
  return renewed?.accessToken||'';
}
async function logout(){
  const current=session();
  localStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(PENDING_KEY);
  if(current?.refreshToken){
    try{await request('/v1/auth/'+PROJECT+'/logout?environment='+ENV,{method:'POST',body:JSON.stringify({refreshToken:current.refreshToken})})}catch{}
  }
}
async function consumeOAuthCallback(){
  const url=new URL(location.href);
  const error=url.searchParams.get('error');
  const status=url.searchParams.get('status');
  const code=url.searchParams.get('code');
  if(error){
    url.searchParams.delete('error');url.searchParams.delete('state');history.replaceState(null,'',url.pathname+url.search+url.hash);
    const e=new Error(error);e.statusText=status||'';throw e;
  }
  if(status==='pending_approval'){
    url.searchParams.delete('status');url.searchParams.delete('state');history.replaceState(null,'',url.pathname+url.search+url.hash);
    return {pendingApproval:true};
  }
  if(!code)return null;
  const result=await exchangeCode(code);
  url.searchParams.delete('code');url.searchParams.delete('state');
  history.replaceState(null,'',url.pathname+url.search+url.hash);
  return result;
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const found=[...document.scripts].find(s=>s.src===src);
    if(found){if(window.AuthHubSocialLogin)return resolve();found.addEventListener('load',resolve,{once:true});found.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src=src;s.async=true;s.dataset.authhubSocialUi='1';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
}
async function mountSocial(target){
  const cfg=await config();
  if(!cfg.socialUi?.script)return {config:cfg,providers:[]};
  await loadScript(cfg.socialUi.script);
  if(!window.AuthHubSocialLogin?.mount)throw new Error('AUTHHUB_SOCIAL_UI_UNAVAILABLE');
  return window.AuthHubSocialLogin.mount({
    target,
    project:PROJECT,
    environment:ENV,
    redirectUri:redirectUri(),
    state:'kimse',
    locale:'ko',
    ariaLabel:'소셜 로그인'
  });
}
window.KIMSE_AUTH=Object.freeze({
  apiBase:API,project:PROJECT,environment:ENV,config,session,pendingVerification,
  login,signup,verifyEmail,refresh,accessToken,logout,consumeOAuthCallback,mountSocial
});
})();