(()=>{'use strict';
const $=s=>document.querySelector(s),A=$('#app'),N=$('#announcer'),O=$('#offline-banner'),K='kimse.p0.state',MODEL_CACHE='kimse.evidence.model.cache';
const STATE_VERSION=9;
const D={version:STATE_VERSION,account:null,intent:null,self:false,care:false,mode:'self',caregivers:[],alertRecipients:[],plan:'FREE',q:0,answers:[],med:false,mood:'',
  medicines:[],
  health:{sleep:'',steps:'',pressure:'',memo:''},
  schedule:[],
  profile:{birthYear:'',sex:'',education:'',living:'',sleepHours:'',activity:'',hearing:'',conditions:''},
  onboarding:{profileDone:false,initialDone:false,consentDone:false,completed:false},
  initial:{step:0,answers:{},responseTimes:[],recall:'',voiceSamples:[],voiceSkipped:false,completedAt:null,domains:null},
  consents:{service:false,privacy:false,health:false,microphone:true,location:false,motion:false,usage:true,notifications:false,caregiverShare:false},
  baseline:{startedAt:null},
  permissions:{microphone:'unknown',location:'unknown',motion:'unknown',notifications:'unknown'},
  remote:{accountId:'',subjectId:'',token:''},
  monitoring:{pending:[],summary:null,alerts:[],lastFlushAt:null,lastSyncError:'',initialSignalsQueued:false},
  brainView:'side',brainRange:'week',brainHistory:[],
  selectedTraining:'memory',trainingResult:null,selectedHealth:'sleep',marketCategory:'all',marketSearch:'',marketItem:null,marketFavorites:[],partnerStatus:null,
  a11y:{largeText:false,highContrast:false,voiceGuidance:false,soundEffects:false,captions:true,largeTouchTargets:true,colorIcons:true,screenReader:true,reduceMotion:false}};
const stored=JSON.parse(localStorage.getItem(K)||'{}');
let S=Object.assign(structuredClone(D),stored);
if((Number(stored.version)||0)<STATE_VERSION){
  if(S.account?.name==='김○○'&&S.account?.email==='kimse@example.com'){S.account=null;S.self=false;S.care=false;S.intent=null;S.mode='self'}
  if(Array.isArray(S.medicines))S.medicines=S.medicines.filter(x=>!((x.id==='bp'&&x.name==='혈압약')||(x.id==='vitamin'&&x.name==='비타민')));
  if(S.health&&typeof S.health==='object'){
    if(S.health.sleep==='7시간 30분')S.health.sleep='';
    if(S.health.steps==='4,320 걸음')S.health.steps='';
    if(S.health.pressure==='120 / 80')S.health.pressure='';
  }
  if(Array.isArray(S.schedule))S.schedule=S.schedule.filter(x=>!['s1','s2'].includes(x.id));
  if(S.mood==='좋아요')S.mood='';
  S.version=STATE_VERSION;
  localStorage.setItem(K,JSON.stringify(S));
}
S.a11y=Object.assign({},D.a11y,stored.a11y||{});
if(!Array.isArray(S.medicines))S.medicines=structuredClone(D.medicines);
if(!S.health||typeof S.health!=='object')S.health=structuredClone(D.health);
if(!Array.isArray(S.schedule))S.schedule=structuredClone(D.schedule);
if(!Array.isArray(S.marketFavorites))S.marketFavorites=[];
if(typeof S.marketSearch!=='string')S.marketSearch='';
S.profile=Object.assign({},D.profile,S.profile||{});
S.onboarding=Object.assign({},D.onboarding,S.onboarding||{});
S.initial=Object.assign({},D.initial,S.initial||{});S.initial.answers=Object.assign({},D.initial.answers,S.initial.answers||{});if(!Array.isArray(S.initial.voiceSamples))S.initial.voiceSamples=[];
S.consents=Object.assign({},D.consents,S.consents||{});
S.baseline=Object.assign({},D.baseline,S.baseline||{});
S.permissions=Object.assign({},D.permissions,S.permissions||{});
S.remote=Object.assign({},D.remote,S.remote||{});
S.monitoring=Object.assign({},D.monitoring,S.monitoring||{});if(!Array.isArray(S.monitoring.pending))S.monitoring.pending=[];if(!Array.isArray(S.monitoring.alerts))S.monitoring.alerts=[];
if(!Array.isArray(S.initial.responseTimes))S.initial.responseTimes=[];
if(!Array.isArray(S.brainHistory))S.brainHistory=[];
if(!['top','side'].includes(S.brainView))S.brainView='side';
if(!['day','week','month'].includes(S.brainRange))S.brainRange='week';
const save=()=>{localStorage.setItem(K,JSON.stringify(S));applyA11y()},go=p=>location.hash='#/'+p,route=()=>(location.hash||'#/start').slice(2).split('?')[0],evidenceUrl=()=>/\/app(?:\/|$)/.test(location.pathname)?'../evidence/':'./evidence/';
const evidenceModelUrls=()=>/\/app(?:\/|$)/.test(location.pathname)?['../evidence/evidence-model.json','../evidence-model.json']:['./evidence/evidence-model.json','./evidence-model.json'];
let EVIDENCE_MODEL=null,Q=[];
const validModel=m=>m&&m.activeModel&&Array.isArray(m.activeModel.factors)&&m.activeModel.factors.length>0;
async function loadEvidenceModel(){
  for(const url of evidenceModelUrls()){
    try{
      const r=await fetch(url,{cache:'no-store'});
      if(!r.ok)continue;
      const m=await r.json();
      if(!validModel(m))continue;
      EVIDENCE_MODEL=m;
      localStorage.setItem(MODEL_CACHE,JSON.stringify(m));
      break;
    }catch{}
  }
  if(!EVIDENCE_MODEL){
    try{const cached=JSON.parse(localStorage.getItem(MODEL_CACHE)||'null');if(validModel(cached))EVIDENCE_MODEL=cached}catch{}
  }
  Q=(EVIDENCE_MODEL?.activeModel?.factors||[]).map(f=>({factorId:f.id,label:f.label,question:f.question,options:f.options||[],evidence:f.evidence}));
  return !!EVIDENCE_MODEL;
}
const assessmentScore=()=>Q.reduce((sum,q,i)=>{const o=q.options[S.answers[i]];return sum+(o?Number(o.points)||0:0)},0);
const API='https://api-kimse.suaveforge.com';
let audioCtx=null,lastSpokenRoute='',lastFeedbackAt=0;
const ensureAudio=()=>{if(!S.a11y.soundEffects)return null;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx}catch{return null}};
const tone=(kind='tap')=>{const ctx=ensureAudio();if(!ctx)return;try{const play=()=>{const o=ctx.createOscillator(),g=ctx.createGain();const hz=kind==='success'?660:kind==='warning'?260:440;o.frequency.value=hz;g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.07,ctx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.12);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.13)};if(ctx.state==='suspended')ctx.resume().then(play).catch(()=>{});else play()}catch{}};
const say=t=>{N.textContent='';setTimeout(()=>N.textContent=t,10);if(S.a11y.voiceGuidance&&'speechSynthesis'in window){speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(t);u.lang='ko-KR';u.rate=.9;speechSynthesis.speak(u)}};
const feedback=(t,kind='tap')=>{lastFeedbackAt=Date.now();tone(kind);say(t)};
const I=n=>`<i class="ti ti-${n}" aria-hidden="true"></i>`,btn=(t,p,c='btn-primary-k')=>`<button class="btn-kimse ${c} btn-full" data-go="${p}">${t}</button>`;
const accountRequired=()=>wrap(`<h1 class="page-title">로그인이 필요합니다</h1><p class="page-desc">내 기록과 가족 연결 정보를 사용하려면 먼저 계정을 시작해주세요.</p><div class="hero-actions">${btn('로그인 / 시작하기','auth')}${btn('처음 화면으로','start','btn-secondary-k')}</div>`,{title:'계정 확인',narrow:true});
function demo(){return !!S.account}
function head(t='낌새',back=true){return `<header class="app-header"><div class="app-header-inner">${back?`<button class="icon-button" data-back aria-label="이전 화면">${I('chevron-left')}</button>`:`<a class="brand" href="#/home"><span class="brand-mark" aria-hidden="true">낌</span><span>낌새<small class="brand-sub">작은 변화를 먼저 알아차려요</small></span></a>`}<strong>${back?t:''}</strong><div class="app-header-actions"><localize-switcher project="p45" type="compact" flags="true" label-mode="code" size="sm" control-shape="rounded"></localize-switcher><a class="icon-button" href="#/settings" aria-label="설정">${I('settings')}</a></div></div></header>`}
const foot=()=>`<div class="app-footer">Updated 2026.09.16 · Release 17<br>의료 진단을 대신하지 않으며 변화 관찰과 기록을 돕습니다.</div>`;
function nav(care=false,active=route()){let x=care?[['home','caregiver-home','홈'],['bell','emergency','알림'],['users','family','가족'],['chart-line','report','리포트'],['dots','settings','더보기']]:[['home','home','홈'],['checkbox','assessment-start','체크'],['barbell','training','훈련'],['clipboard-heart','health','기록'],['dots','settings','더보기']];return `<nav class="bottom-nav" aria-label="주요 메뉴"><div class="bottom-nav-inner">${x.map(([i,p,t])=>`<a class="nav-item ${p===active?'active':''}" href="#/${p}">${I(i)}<span>${t}</span></a>`).join('')}</div></nav>`}
const standaloneLang=()=>`<div class="standalone-lang" aria-label="언어 설정"><localize-switcher project="p45" type="compact" flags="true" label-mode="code" size="sm" control-shape="rounded"></localize-switcher></div>`;
function captureScenarioRibbon(){return ''}
function wrap(html,o={}){return `${o.nohead?standaloneLang():head(o.title||'낌새',o.back!==false)}<main id="main" class="page ${o.narrow?'narrow':''}" tabindex="-1">${html}${foot()}</main>${o.bottom?nav(o.care,o.active):''}`}
const notice=(h,p)=>`<div class="notice"><strong>${h}</strong>${p}</div>`;
const row=(h,s='',right='')=>`<div class="list-row"><span><strong>${h}</strong>${s?`<small>${s}</small>`:''}</span>${right}</div>`;
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=v=>{try{const u=new URL(String(v||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}};
const fmtDate=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?String(v||''):d.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})};
const PARTNER_TYPE_LABEL={PRODUCT:'상품 입점',SERVICE:'서비스 제휴',AD:'광고/콘텐츠 제휴',COOPERATION:'공동사업/기관 협력'};
const PARTNER_STATUS_LABEL={RECEIVED:'신규',REVIEWING:'검토중',CONTACTED:'회신완료',HOLD:'보류',CLOSED:'종료'};

const VOICE_PROMPTS=[
  '오늘 아침부터 지금까지 무엇을 하셨는지 편하게 말씀해주세요.',
  '최근 기억에 남는 일을 순서대로 설명해주세요.',
  '생각나는 동물 이름을 가능한 많이 말씀해주세요.'
];
const BRAIN_DOMAINS=[
  ['memory','기억·학습','해마·내측측두엽','🧠'],
  ['executive','주의·실행','전전두엽 네트워크','🎯'],
  ['language','언어','측두엽·언어 네트워크','💬'],
  ['spatial','공간·이동','두정엽·precuneus 네트워크','🧭'],
  ['daily','일상기능','여러 뇌 네트워크의 통합 기능','🏠']
];
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
function baselineDay(){
  if(!S.baseline.startedAt)return 0;
  const t=new Date(S.baseline.startedAt).getTime();
  if(!Number.isFinite(t))return 0;
  return Math.min(14,Math.max(1,Math.floor((Date.now()-t)/86400000)+1));
}
const baselineComplete=()=>baselineDay()>=14;
function initialScores(){
  if(S.initial.domains)return S.initial.domains;
  const a=S.initial.answers||{},words=['나무','기차','우산'],r=String(S.initial.recall||'').replace(/\s/g,'');
  const recalled=words.filter(w=>r.includes(w)).length;
  return {
    memory:clamp(55+recalled*15),
    executive:a.attention==='10'?88:62,
    language:a.language==='과일'?88:62,
    spatial:a.spatial==='no'?88:a.spatial==='sometimes'?72:58,
    daily:a.daily==='no'?90:a.daily==='sometimes'?74:56
  };
}
function statusMeta(score){
  score=clamp(score);
  if(score>=82)return ['안정적으로 수행','stable'];
  if(score>=68)return ['조금 더 관찰','watch'];
  return ['추가 확인 권장','alert'];
}
function addBrainSnapshot(source='initial'){
  const d=initialScores(),at=new Date().toISOString(),last=S.brainHistory[S.brainHistory.length-1];
  if(last&&last.source===source&&String(last.at||'').slice(0,10)===at.slice(0,10))return;
  S.brainHistory.push({at,source,...d});
  S.brainHistory=S.brainHistory.slice(-180);
}
function filteredBrainHistory(){
  const now=Date.now(),days=S.brainRange==='day'?1:S.brainRange==='month'?30:7,cut=now-days*86400000;
  return S.brainHistory.filter(x=>new Date(x.at).getTime()>=cut);
}
function sparkline(key){
  const rows=filteredBrainHistory(),w=280,h=76,p=9;
  if(!rows.length)return '<div class="trend-empty">아직 측정 데이터가 없어요.</div>';
  const pts=rows.map((x,i)=>{const xx=rows.length===1?w/2:p+i*((w-2*p)/(rows.length-1));const yy=h-p-(clamp(x[key])*(h-2*p)/100);return [xx,yy,clamp(x[key])]});
  const line=pts.length>1?'<polyline points="'+pts.map(x=>x[0]+','+x[1]).join(' ')+'" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'';
  return '<svg class="mini-trend" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(BRAIN_DOMAINS.find(x=>x[0]===key)?.[1]||key)+' 변화 그래프"><line x1="'+p+'" y1="'+(h-p)+'" x2="'+(w-p)+'" y2="'+(h-p)+'" class="trend-axis"/>'+line+pts.map(x=>'<circle cx="'+x[0]+'" cy="'+x[1]+'" r="5" fill="currentColor"/>').join('')+'</svg>';
}
function brainSvg(view='side'){
  const d=initialScores();
  const label=(key)=>{const m=statusMeta(d[key]);return '<span class="brain-score '+m[1]+'">'+m[0]+'</span>'};
  if(view==='top')return '<div class="brain-visual-wrap"><svg class="brain-visual" viewBox="0 0 360 250" role="img" aria-label="위에서 본 뇌 기능 연관 지도"><path d="M178 28C119 5 54 46 54 112c0 34 18 58 45 75 20 13 43 23 79 33V28Z" class="brain-outline"/><path d="M182 28c59-23 124 18 124 84 0 34-18 58-45 75-20 13-43 23-79 33V28Z" class="brain-outline"/><path d="M92 62c24-22 58-27 86-17v67H78c-2-20 2-36 14-50Z" class="region executive"/><path d="M268 62c-24-22-58-27-86-17v67h100c2-20-2-36-14-50Z" class="region executive"/><path d="M76 120h102v82c-29-7-53-18-72-34-20-16-30-32-30-48Z" class="region spatial"/><path d="M284 120H182v82c29-7 53-18 72-34 20-16 30-32 30-48Z" class="region spatial"/><line x1="180" y1="28" x2="180" y2="220" class="brain-mid"/></svg><div class="brain-legend"><div><i class="dot executive"></i><span>주의·실행</span>'+label('executive')+'</div><div><i class="dot spatial"></i><span>공간·이동</span>'+label('spatial')+'</div><small>해마와 언어 네트워크처럼 깊거나 측면에 위치한 영역은 옆면 보기에서 표시합니다.</small></div></div>';
  return '<div class="brain-visual-wrap"><svg class="brain-visual" viewBox="0 0 360 250" role="img" aria-label="옆에서 본 뇌 기능 연관 지도"><path d="M52 126c0-58 47-103 112-103 70 0 132 43 143 98 7 37-12 71-48 88-24 12-52 15-82 9-26 18-69 10-88-12-25-28-37-50-37-80Z" class="brain-outline"/><path d="M65 113c6-45 43-76 91-80l4 76-95 4Z" class="region executive"/><path d="M167 34c55 1 105 33 126 78l-91 15-35-93Z" class="region spatial"/><path d="M196 133l91-12c3 33-16 61-49 75l-72-35 30-28Z" class="region language"/><ellipse cx="158" cy="150" rx="39" ry="22" class="region memory"/><path d="M96 124c7 39 30 70 67 87-29 9-58 0-75-20-21-25-30-45-30-67l38 0Z" class="region language"/></svg><div class="brain-legend"><div><i class="dot executive"></i><span>주의·실행 · 전전두 네트워크</span>'+label('executive')+'</div><div><i class="dot memory"></i><span>기억·학습 · 해마/내측측두엽</span>'+label('memory')+'</div><div><i class="dot language"></i><span>언어 · 측두/언어 네트워크</span>'+label('language')+'</div><div><i class="dot spatial"></i><span>공간·이동 · 두정/precuneus</span>'+label('spatial')+'</div></div></div>';
}
let voiceRecorder=null,voiceStartedAt=0,voiceChunks=[],voiceStream=null,voiceTask=-1;
function openVoiceDb(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){resolve(null);return}
    const req=indexedDB.open('kimse-private',1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('voiceSamples'))req.result.createObjectStore('voiceSamples')};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function persistVoiceBlob(id,blob){
  try{const db=await openVoiceDb();if(!db)return false;await new Promise((resolve,reject)=>{const tx=db.transaction('voiceSamples','readwrite');tx.objectStore('voiceSamples').put(blob,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();return true}catch{return false}
}
async function startVoiceRecording(index){
  if(!navigator.mediaDevices?.getUserMedia||!('MediaRecorder'in window)){S.permissions.microphone='unsupported';save();feedback('이 기기에서는 브라우저 음성 녹음을 사용할 수 없습니다.','warning');render();return}
  try{
    voiceStream=await navigator.mediaDevices.getUserMedia({audio:true});
    voiceChunks=[];voiceTask=index;voiceStartedAt=Date.now();voiceRecorder=new MediaRecorder(voiceStream);
    voiceRecorder.ondataavailable=e=>{if(e.data&&e.data.size)voiceChunks.push(e.data)};
    voiceRecorder.onstop=async()=>{
      const blob=new Blob(voiceChunks,{type:voiceRecorder?.mimeType||'audio/webm'}),id='voice-'+Date.now(),durationSec=Math.max(1,Math.round((Date.now()-voiceStartedAt)/1000));
      const stored=await persistVoiceBlob(id,blob),features=await analyzeVoiceBlob(blob);
      S.permissions.microphone='granted';
      S.initial.voiceSamples[index]={id,prompt:VOICE_PROMPTS[index],durationSec,size:blob.size,capturedAt:new Date().toISOString(),storedLocal:stored,features};
      voiceStream?.getTracks().forEach(t=>t.stop());voiceStream=null;voiceRecorder=null;voiceTask=-1;save();feedback((index+1)+'번째 음성 샘플을 저장했습니다.','success');render();
    };
    voiceRecorder.start();S.permissions.microphone='granted';save();render();feedback((index+1)+'번째 음성 녹음을 시작합니다.');
  }catch{S.permissions.microphone='denied';save();feedback('마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.','warning');render()}
}
function stopVoiceRecording(){if(voiceRecorder&&voiceRecorder.state==='recording')voiceRecorder.stop()}
async function requestSelectedPermissions(){
  if(S.consents.location&&navigator.geolocation){
    await new Promise(resolve=>navigator.geolocation.getCurrentPosition(()=>{S.permissions.location='granted';resolve()},()=>{S.permissions.location='denied';resolve()},{enableHighAccuracy:false,timeout:5000,maximumAge:300000}));
  }
  if(S.consents.motion&&typeof DeviceMotionEvent!=='undefined'){
    try{if(typeof DeviceMotionEvent.requestPermission==='function')S.permissions.motion=(await DeviceMotionEvent.requestPermission())==='granted'?'granted':'denied';else S.permissions.motion='available'}catch{S.permissions.motion='denied'}
  }
  if(S.consents.notifications&&'Notification'in window){
    try{S.permissions.notifications=await Notification.requestPermission()}catch{S.permissions.notifications='denied'}
  }
}
const SIGNAL_LABELS={sleep_minutes:'수면시간',steps:'걸음수',location_radius_m:'생활반경',movement_distance_m:'이동거리',outings:'외출',motion_active_minutes:'활동시간',app_active_minutes:'낌새 이용시간',call_count:'통화 횟수',call_duration_min:'통화시간',messaging_sessions:'메신저 활동',task_response_ms:'반응시간',voice_pause_ratio:'말 중 멈춤'};
const signalId=()=>window.crypto&&crypto.randomUUID?crypto.randomUUID():'sig-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const monitoringEnabled=()=>!!(S.onboarding.completed&&S.consents.service&&S.consents.privacy&&S.consents.health);
function queueSignal(metric,value,unit='',source='pwa',metadata={}){
  const n=Number(value);if(!monitoringEnabled()||!Number.isFinite(n))return;
  S.monitoring.pending.push({client_event_id:signalId(),source,metric,value:n,unit:unit||null,metadata,observed_at:new Date().toISOString()});
  if(S.monitoring.pending.length>300)S.monitoring.pending=S.monitoring.pending.slice(-300);save();
}
async function ensureRemoteIdentity(){
  if(S.remote.accountId&&S.remote.subjectId&&S.remote.token)return true;
  if(!S.account||!navigator.onLine)return false;
  try{
    const a=await fetch(API+'/api/v1/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({display_name:S.account.name,email:S.account.email||null})});
    if(!a.ok)throw new Error('signup '+a.status);const account=await a.json();
    const s=await fetch(API+'/api/v1/subjects/self',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account_id:account.id})});
    if(!s.ok)throw new Error('subject '+s.status);const subject=await s.json();
    S.remote={accountId:account.id,subjectId:subject.care_subject_id,token:account.access_token||''};S.monitoring.lastSyncError='';save();
    return !!S.remote.token;
  }catch{S.monitoring.lastSyncError='서버 계정 연결 실패';save();return false}
}
const remoteHeaders=()=>({'X-KIMSE-ACCOUNT-TOKEN':S.remote.token,'Content-Type':'application/json'});
async function startRemoteMonitoring(){
  if(!await ensureRemoteIdentity())return false;
  try{
    const r=await fetch(API+'/api/v1/subjects/'+encodeURIComponent(S.remote.subjectId)+'/monitoring/start',{method:'POST',headers:remoteHeaders(),body:JSON.stringify({account_id:S.remote.accountId})});
    if(!r.ok)throw new Error('monitoring '+r.status);const x=await r.json();
    if(x.baseline_started_at&&!S.baseline.startedAt)S.baseline.startedAt=x.baseline_started_at;S.monitoring.lastSyncError='';save();return true;
  }catch{S.monitoring.lastSyncError='모니터링 시작 동기화 실패';save();return false}
}
function handleMonitoringAlert(alert){
  if(!alert||!alert.id||S.monitoring.alerts.some(x=>x.id===alert.id))return;
  S.monitoring.alerts.unshift(alert);S.monitoring.alerts=S.monitoring.alerts.slice(0,30);save();
  if(S.consents.notifications&&'Notification'in window&&Notification.permission==='granted'){try{new Notification('낌새 · 최근 변화가 보여요',{body:alert.summary||'평소와 다른 변화가 함께 관찰되었습니다.',tag:'kimse-change-'+alert.id})}catch{}}
}
async function flushSignals(){
  if(!monitoringEnabled()||!navigator.onLine||!S.monitoring.pending.length)return false;
  if(!await startRemoteMonitoring())return false;
  const batch=S.monitoring.pending.slice(0,100);
  try{
    const r=await fetch(API+'/api/v1/subjects/'+encodeURIComponent(S.remote.subjectId)+'/signals/batch',{method:'POST',headers:remoteHeaders(),body:JSON.stringify({account_id:S.remote.accountId,events:batch})});
    if(!r.ok)throw new Error('signals '+r.status);const x=await r.json(),ids=new Set(x.client_event_ids||[]);
    S.monitoring.pending=S.monitoring.pending.filter(e=>!ids.has(e.client_event_id));S.monitoring.lastFlushAt=new Date().toISOString();S.monitoring.lastSyncError='';if(x.alert)handleMonitoringAlert(x.alert);save();return true;
  }catch{S.monitoring.lastSyncError='관찰 데이터 전송 대기 중';save();return false}
}
async function syncMonitoring(){
  if(!monitoringEnabled()||!navigator.onLine)return false;if(!await startRemoteMonitoring())return false;
  try{
    await flushSignals();const base=API+'/api/v1/subjects/'+encodeURIComponent(S.remote.subjectId),h={'X-KIMSE-ACCOUNT-TOKEN':S.remote.token};
    const pair=await Promise.all([fetch(base+'/monitoring/summary?account_id='+encodeURIComponent(S.remote.accountId),{headers:h}),fetch(base+'/change-alerts?account_id='+encodeURIComponent(S.remote.accountId)+'&limit=30',{headers:h})]);
    if(pair[0].ok)S.monitoring.summary=await pair[0].json();if(pair[1].ok){const rows=await pair[1].json();for(const a of rows.slice().reverse())handleMonitoringAlert(a)}S.monitoring.lastSyncError='';save();return true;
  }catch{S.monitoring.lastSyncError='최근 상태를 동기화하지 못했습니다.';save();return false}
}
function parseSleepMinutes(v){const s=String(v||'');let m=0;const h=s.match(/(\d+(?:\.\d+)?)\s*시간/),mm=s.match(/(\d+)\s*분/);if(h)m+=Number(h[1])*60;if(mm)m+=Number(mm[1]);if(!m&&/^\d+(?:\.\d+)?$/.test(s.trim()))m=Number(s)*60;return m>0?m:null}
function parseSteps(v){const n=Number(String(v||'').replace(/[^\d.]/g,''));return Number.isFinite(n)&&n>0?n:null}
function haversine(a,b){const R=6371000,p=Math.PI/180,dLat=(b.lat-a.lat)*p,dLon=(b.lon-a.lon)*p,x=Math.sin(dLat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
let runtimeLocationDay='',runtimeFirstLocation=null,runtimeLastLocation=null,locationTimer=null,motionAccumMs=0,motionLastFlush=Date.now(),appSessionStarted=Date.now(),collectorsStarted=false;
function collectLocationOnce(){
  if(!monitoringEnabled()||!S.consents.location||S.permissions.location!=='granted'||!navigator.geolocation)return;
  navigator.geolocation.getCurrentPosition(pos=>{
    const p={lat:pos.coords.latitude,lon:pos.coords.longitude},day=new Date().toISOString().slice(0,10);
    if(runtimeLocationDay!==day){runtimeLocationDay=day;runtimeFirstLocation=p;runtimeLastLocation=null}if(!runtimeFirstLocation)runtimeFirstLocation=p;
    if(runtimeLastLocation){const d=haversine(runtimeLastLocation,p);if(Number.isFinite(d)&&d>=3&&d<50000)queueSignal('movement_distance_m',d,'m','geolocation',{accuracy:Math.round(pos.coords.accuracy||0)})}
    const radius=haversine(runtimeFirstLocation,p);if(Number.isFinite(radius))queueSignal('location_radius_m',radius,'m','geolocation',{accuracy:Math.round(pos.coords.accuracy||0)});runtimeLastLocation=p;flushSignals();
  },()=>{}, {enableHighAccuracy:false,timeout:8000,maximumAge:300000});
}
function onDeviceMotion(e){
  if(!monitoringEnabled()||!S.consents.motion)return;const a=e.acceleration;if(!a)return;const mag=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2),interval=Math.max(10,Math.min(1000,Number(e.interval)||100));if(mag>1.2)motionAccumMs+=interval;
  if(Date.now()-motionLastFlush>300000){if(motionAccumMs>1000)queueSignal('motion_active_minutes',motionAccumMs/60000,'min','devicemotion');motionAccumMs=0;motionLastFlush=Date.now();flushSignals()}
}
async function analyzeVoiceBlob(blob){
  try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;const ctx=new C(),buf=await ctx.decodeAudioData(await blob.arrayBuffer()),data=buf.getChannelData(0),sr=buf.sampleRate,frame=Math.max(1,Math.floor(sr*.02)),rms=[];
    for(let i=0;i<data.length;i+=frame){let s=0,n=0;for(let j=i;j<Math.min(i+frame,data.length);j++){s+=data[j]*data[j];n++}rms.push(Math.sqrt(s/Math.max(1,n)))}
    const sorted=rms.slice().sort((a,b)=>a-b),med=sorted[Math.floor(sorted.length/2)]||0,threshold=Math.max(.008,med*.35),pause=rms.filter(x=>x<threshold).length/Math.max(1,rms.length),mean=rms.reduce((a,b)=>a+b,0)/Math.max(1,rms.length);try{await ctx.close()}catch{}return {pauseRatio:Number(pause.toFixed(4)),rms:Number(mean.toFixed(5))};
  }catch{return null}
}
function queueInitialSignals(){
  if(S.monitoring.initialSignalsQueued)return;for(const ms of S.initial.responseTimes||[])if(Number.isFinite(Number(ms)))queueSignal('task_response_ms',Number(ms),'ms','initial-test');
  for(const v of S.initial.voiceSamples||[]){if(!v)continue;queueSignal('voice_duration_s',Number(v.durationSec)||0,'s','initial-voice');if(v.features&&v.features.pauseRatio!=null)queueSignal('voice_pause_ratio',v.features.pauseRatio,'ratio','initial-voice');if(v.features&&v.features.rms!=null)queueSignal('voice_rms',v.features.rms,'rms','initial-voice')}S.monitoring.initialSignalsQueued=true;save();
}
async function collectNativeBridgeSignals(){
  if(!monitoringEnabled()||!window.KIMSE_NATIVE||typeof window.KIMSE_NATIVE.getDailySignals!=='function')return;try{const rows=await window.KIMSE_NATIVE.getDailySignals();if(Array.isArray(rows))for(const x of rows){if(x&&x.metric&&Number.isFinite(Number(x.value)))queueSignal(x.metric,Number(x.value),x.unit||'','native',{provider:x.provider||'device'})}flushSignals()}catch{}
}
function startPassiveCollectors(){
  if(collectorsStarted||!monitoringEnabled())return;collectorsStarted=true;if(S.consents.usage){queueSignal('app_sessions',1,'count','pwa');appSessionStarted=Date.now()}
  if(S.consents.location&&S.permissions.location==='granted'){collectLocationOnce();locationTimer=setInterval(collectLocationOnce,10*60*1000)}if(S.consents.motion&&['granted','available'].includes(S.permissions.motion))window.addEventListener('devicemotion',onDeviceMotion,{passive:true});collectNativeBridgeSignals();setTimeout(flushSignals,500);
}
function recordAppActive(){if(!monitoringEnabled()||!S.consents.usage)return;const mins=(Date.now()-appSessionStarted)/60000;if(mins>.05)queueSignal('app_active_minutes',mins,'min','pwa');appSessionStarted=Date.now()}
const DEMO_DURATION_MS=40000;
let demoRecorder=null,demoRecordStream=null,demoChunks=[],demoDownloadUrl='',demoAutoRunning=false,demoOriginalStateJson=null,demoRunId=0,demoPreviewOnly=false;
const demoWait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function demoSetValue(selector,value){
  const el=$(selector);if(!el)return false;el.scrollIntoView?.({block:'center',behavior:'smooth'});el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
function demoCheck(selector,checked=true){const el=$(selector);if(!el)return false;el.checked=checked;el.dispatchEvent(new Event('change',{bubbles:true}));return true}
async function demoFocus(selector,ms=260,block='center'){
  const el=$(selector);if(!el)return false;el.scrollIntoView?.({block,behavior:'smooth'});await demoWait(ms);return true;
}
async function demoClick(selector,after=420,block='center'){
  const el=$(selector);if(!el)return false;el.scrollIntoView?.({block,behavior:'smooth'});await demoWait(220);el.classList.add('capture-tap');await demoWait(180);el.click();await demoWait(after);return true;
}
function demoCaptureScroller(){return document.documentElement.classList.contains('capture-frame-mode')?A:window}
function demoScrollTop(){
  const scroller=demoCaptureScroller();
  if(scroller===window)window.scrollTo({top:0,left:0,behavior:'instant'});
  else scroller.scrollTo({top:0,left:0,behavior:'instant'});
}
async function demoGo(name,after=800){
  go(name);await demoWait(100);demoScrollTop();await demoWait(after);
}
function demoRestoreState(){
  const raw=demoOriginalStateJson;demoOriginalStateJson=null;
  try{const x=raw?JSON.parse(raw):{};S=Object.assign(structuredClone(D),x);S.a11y=Object.assign({},D.a11y,x.a11y||{});S.profile=Object.assign({},D.profile,x.profile||{});S.onboarding=Object.assign({},D.onboarding,x.onboarding||{});S.initial=Object.assign({},D.initial,x.initial||{});S.initial.answers=Object.assign({},D.initial.answers,x.initial?.answers||{});S.consents=Object.assign({},D.consents,x.consents||{});S.baseline=Object.assign({},D.baseline,x.baseline||{});S.permissions=Object.assign({},D.permissions,x.permissions||{});S.remote=Object.assign({},D.remote,x.remote||{});S.monitoring=Object.assign({},D.monitoring,x.monitoring||{});if(!Array.isArray(S.monitoring.pending))S.monitoring.pending=[];if(!Array.isArray(S.monitoring.alerts))S.monitoring.alerts=[];if(!Array.isArray(S.brainHistory))S.brainHistory=[];if(raw)localStorage.setItem(K,raw);else localStorage.removeItem(K)}catch{}
  demoAutoRunning=false;document.documentElement.classList.remove('real-app-capture-running','capture-frame-mode');applyA11y();
}
function demoPrepareScenario(){
  demoOriginalStateJson=localStorage.getItem(K);
  const keepA11y=Object.assign({},S.a11y,{voiceGuidance:false,soundEffects:false});
  S=structuredClone(D);S.version=STATE_VERSION;S.a11y=keepA11y;S.intent=null;S.self=false;S.care=false;S.mode='self';
  demoAutoRunning=true;document.documentElement.classList.add('real-app-capture-running');save();
}
function demoWarpBaseline(day){
  S.baseline.startedAt=new Date(Date.now()-Math.max(0,day-1)*86400000).toISOString();save();render();demoScrollTop();
}
function demoInjectHistoryAndChanges(){
  const now=Date.now(),day=n=>new Date(now-n*86400000).toISOString();
  S.brainHistory=[
    {at:day(13),source:'scenario',memory:91,executive:89,language:90,spatial:88,daily:91},
    {at:day(9),source:'scenario',memory:90,executive:88,language:89,spatial:87,daily:90},
    {at:day(5),source:'scenario',memory:88,executive:86,language:88,spatial:86,daily:89},
    {at:day(2),source:'scenario',memory:84,executive:82,language:86,spatial:84,daily:87},
    {at:day(0),source:'scenario',memory:81,executive:79,language:84,spatial:82,daily:85}
  ];
  S.monitoring.summary={status:'READY',baseline_days:14,baseline_target_days:14,level:'ATTENTION',changes:[
    {metric:'sleep_minutes',baseline:425,recent:336,relative_change:-0.2094,changed:true},
    {metric:'steps',baseline:5120,recent:3460,relative_change:-0.3242,changed:true},
    {metric:'voice_pause_ratio',baseline:0.18,recent:0.23,relative_change:0.2778,changed:true}
  ],metrics:[],interpretation:'현재 결과는 변화 관찰을 위한 참고 정보이며 치매 진단을 의미하지 않습니다.'};
  S.monitoring.alerts=[{id:'capture-alert',level:'ATTENTION',summary:'수면·활동·음성에서 평소와 다른 변화가 함께 이어지고 있습니다.',detected_at:new Date().toISOString()}];
  S.care=true;S.self=true;S.caregivers=[{name:'가족 보호자',relation:'자녀'}];S.consents.caregiverShare=true;save();
}
async function runRealAppTour(){
  const run=++demoRunId;demoPrepareScenario();
  const alive=()=>demoAutoRunning&&run===demoRunId;
  const wait=async ms=>{await demoWait(ms);return alive()};
  try{
    await demoGo('start',1500);if(!alive())return;
    await demoClick('[data-go="role"]',650);if(!alive())return;
    await demoClick('[data-role="self"]',650);if(!alive())return;

    demoSetValue('#name','시연 사용자');demoSetValue('#email','demo@kimse.app');if(!await wait(650))return;
    await demoClick('#signup',850);if(!alive())return;

    demoSetValue('#profile-birth','1956');demoSetValue('#profile-sex','female');demoSetValue('#profile-education','gte10');demoSetValue('#profile-living','family');demoSetValue('#profile-sleep','7시간');demoSetValue('#profile-activity','some');demoSetValue('#profile-hearing','no');
    await demoFocus('#profile-form button[type="submit"]',500,'center');if(!alive())return;$('#profile-form')?.requestSubmit();if(!await wait(1000))return;

    await demoClick('[data-initial-next]',650);if(!alive())return;
    await demoClick('[data-initial-answer="attention:10"]',550);if(!alive())return;
    await demoClick('[data-initial-answer="language:과일"]',550);if(!alive())return;
    await demoClick('[data-initial-answer="spatial:no"]',550);if(!alive())return;
    await demoClick('[data-initial-answer="daily:no"]',550);if(!alive())return;
    demoSetValue('#recall-input','나무, 기차, 우산');if(!await wait(500))return;await demoClick('#save-recall',1000);if(!alive())return;

    await demoFocus('#skip-voice',850,'end');if(!alive())return;await demoClick('#skip-voice',1100,'end');if(!alive())return;
    await demoFocus('[data-go="brain-map"]',700,'center');if(!alive())return;
    await demoClick('[data-go="consent"]',750,'end');if(!alive())return;

    ['#consent-service','#consent-privacy','#consent-health'].forEach(x=>demoCheck(x,true));if(!await wait(700))return;
    await demoFocus('#consent-microphone',650,'center');if(!alive())return;
    ['#consent-microphone','#consent-location','#consent-motion','#consent-usage','#consent-notifications','#consent-caregiver'].forEach(x=>demoCheck(x,true));
    await demoFocus('#consent-form button[type="submit"]',900,'end');if(!alive())return;$('#consent-form')?.requestSubmit();if(!await wait(1200))return;

    demoWarpBaseline(1);if(!await wait(1200))return;
    demoWarpBaseline(7);if(!await wait(1200))return;
    demoWarpBaseline(14);if(!await wait(1400))return;

    demoInjectHistoryAndChanges();await demoGo('brain-map',1700);if(!alive())return;
    await demoClick('[data-brain-view="top"]',900);if(!alive())return;

    await demoGo('brain-trends',1600);if(!alive())return;
    await demoClick('[data-brain-range="month"]',1400);if(!alive())return;
    await demoFocus('.trend-stack .trend-card:nth-child(3)',700,'center');if(!alive())return;

    await demoGo('monitoring-status',1900);if(!alive())return;
    await demoFocus('.signal-change-list',900,'center');if(!alive())return;

    S.mode='care';save();await demoGo('caregiver-home',1800);if(!alive())return;
    await demoFocus('.care-alert-card',800,'center');if(!alive())return;

    S.mode='self';save();await demoGo('home',1800);if(!alive())return;
  }finally{
    if(!alive())return;
    demoAutoRunning=false;document.documentElement.classList.remove('real-app-capture-running');
    if(demoRecorder&&demoRecorder.state!=='inactive'){demoRecorder.stop()}
    else{demoRestoreState();go('demo-capture')}
  }
}
function stopDemoRecording(){
  demoRunId++;demoAutoRunning=false;document.documentElement.classList.remove('real-app-capture-running');
  if(demoRecorder&&demoRecorder.state!=='inactive')demoRecorder.stop();
  else{if(demoRecordStream){demoRecordStream.getTracks().forEach(t=>t.stop());demoRecordStream=null}demoRestoreState();go('demo-capture')}
}
function playDemoTimeline(){demoPreviewOnly=true;runRealAppTour()}
async function startDemoCapture(){
  if(!navigator.mediaDevices?.getDisplayMedia||!('MediaRecorder'in window)){feedback('이 브라우저는 현재 탭 녹화를 지원하지 않습니다. 자동조작 미리보기만 이용해주세요.','warning');return}
  try{
    document.documentElement.classList.add('capture-frame-mode');
    await demoWait(120);
    demoRecordStream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:false,preferCurrentTab:true,selfBrowserSurface:'include'});
    const [videoTrack]=demoRecordStream.getVideoTracks();
    if(window.CropTarget?.fromElement&&videoTrack&&typeof videoTrack.cropTo==='function'){
      try{
        const target=await CropTarget.fromElement(A);
        await videoTrack.cropTo(target);
      }catch(err){
        console.warn('KIMSE_REGION_CAPTURE_FALLBACK',err);
      }
    }
    const types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'],mime=types.find(x=>MediaRecorder.isTypeSupported?.(x))||'';
    demoChunks=[];demoPreviewOnly=false;demoRecorder=mime?new MediaRecorder(demoRecordStream,{mimeType:mime,videoBitsPerSecond:4500000}):new MediaRecorder(demoRecordStream,{videoBitsPerSecond:4500000});
    demoRecorder.ondataavailable=e=>{if(e.data&&e.data.size)demoChunks.push(e.data)};
    demoRecorder.onstop=()=>{
      if(demoDownloadUrl)URL.revokeObjectURL(demoDownloadUrl);
      const blob=new Blob(demoChunks,{type:demoRecorder?.mimeType||'video/webm'});demoDownloadUrl=URL.createObjectURL(blob);
      if(demoRecordStream){demoRecordStream.getTracks().forEach(t=>t.stop());demoRecordStream=null}
      demoRecorder=null;demoRestoreState();go('demo-capture');setTimeout(()=>{if(route()==='demo-capture')render()},80);
    };
    demoRecorder.start(500);setTimeout(()=>runRealAppTour(),220);
  }catch{
    document.documentElement.classList.remove('capture-frame-mode');
    feedback('화면 공유가 취소되었습니다. 현재 탭을 선택하면 실제 앱 자동조작을 촬영할 수 있습니다.','warning')
  }
}

const page={};
page['demo-capture']=()=>wrap('<div class="eyebrow">모두의창업 제출 영상</div><h1 class="page-title">실제 앱을 자동 조작해<br>약 40초로 촬영합니다</h1><p class="page-desc">별도 데모 화면을 만들지 않습니다. 시작·가입·기본검사·동의·14일 기준선·뇌 기능 지도·변화 감지·보호자 화면까지 <strong>현재 앱의 실제 화면과 버튼</strong>을 자동으로 조작합니다.</p>'+notice('14일은 어떻게 보여주나요?','실제 14일을 기다릴 수 없으므로 자동촬영 모드에서만 시간 경과와 예시 경과 데이터를 압축 재현합니다. 촬영이 끝나면 기존 사용자 데이터는 원상복구됩니다.')+'<div class="capture-route-list"><span>시작</span><i>→</i><span>최초검사</span><i>→</i><span>음성</span><i>→</i><span>동의</span><i>→</i><span>1·7·14일</span><i>→</i><span>뇌지도</span><i>→</i><span>변화알림</span><i>→</i><span>보호자</span></div><div class="hero-actions"><button id="demo-preview" class="btn-kimse btn-secondary-k">실제 앱 자동조작 미리보기</button><button id="demo-record" class="btn-kimse btn-primary-k">YouTube용 세로 자동촬영 시작</button><button id="demo-window" class="btn-kimse btn-blue-k">세로 촬영창 열기</button><button id="demo-stop" class="btn-kimse btn-danger-k">중지 / 원상복구</button>'+(demoDownloadUrl?'<a id="demo-download" class="btn-kimse btn-primary-k" href="'+demoDownloadUrl+'" download="kimse-youtube-demo-40s.webm">촬영 영상 저장</a>':'')+'</div><p class="demo-controller-note">녹화 시작 때 공유창에서 반드시 “현재 탭”을 선택하세요. Chrome에서는 앱 영역만 9:16 세로로 자동 크롭해 녹화합니다. 이후 앱 조작·스크롤·장면 이동·녹화 종료는 자동입니다. YouTube에는 ‘일부 공개’로 업로드한 뒤 링크를 제출하면 됩니다.</p>',{title:'자동촬영',narrow:true});
page.start=()=>wrap(`<section class="hero"><img class="hero-logo" src="./assets/icons/icon.svg" alt="낌새 로고"><div class="eyebrow">오늘도, 변화를 먼저 알아차리는</div><h1>낌새</h1><p>작은 관심이 큰 안심이 됩니다.<br>나와 가족의 인지·생활 변화를 쉽고 꾸준하게 기록해요.</p><div class="hero-actions">${btn('시작하기','role')}${btn('로그인','auth','btn-secondary-k')}</div></section>${notice('접근성을 기본으로 설계했어요.','큰 글씨, 큰 터치 영역, 색상+아이콘, 화면 읽기와 음성 안내를 지원합니다.')}`,{nohead:true,narrow:true});
page.role=()=>wrap(`<div class="eyebrow">가입 1/3</div><h1 class="page-title">어떤 목적으로 사용하시나요?</h1><p class="page-desc">역할은 나중에 언제든 추가할 수 있어요.</p>${[['self','👵','제가 사용해요','내 건강을 스스로 관리해요.','bg-blue'],['care','👩','가족을 돌보고 있어요','가족의 상태를 함께 살펴봐요.','bg-pink'],['both','👵👩','둘 다 사용해요','내 건강도 챙기고 가족도 돌봐요.','bg-purple']].map(x=>`<button class="role-card ${x[4]}" data-role="${x[0]}"><span class="avatar-lg">${x[1]}</span><span><h3>${x[2]}</h3><p>${x[3]}</p></span>${I('chevron-right')}</button>`).join('')}${notice('계정은 하나, 역할은 여러 개.','보호자로 시작해도 나중에 사용자 역할을 추가할 수 있어요.')}`,{title:'역할 선택',narrow:true});
page.auth=()=>wrap(`<div class="eyebrow">가입 2/3</div><h1 class="page-title">간편하게 시작하세요</h1><div class="form-stack"><div class="field"><label for="name">이름</label><input id="name" value="${S.account?.name||''}" placeholder="이름"></div><div class="field"><label for="email">이메일</label><input id="email" type="email" value="${S.account?.email||''}" placeholder="name@example.com"></div><button id="signup" class="btn-kimse btn-primary-k">이메일로 시작하기</button></div>`,{title:'회원가입 / 로그인',narrow:true});

page['onboarding-profile']=()=>wrap(`<div class="eyebrow">처음 설정 1/4</div><h1 class="page-title">나의 평소를 알기 위한<br>기본정보를 알려주세요</h1><p class="page-desc">처음 상태와 앞으로의 변화를 비교할 때 필요한 최소 정보입니다.</p><form id="profile-form" class="form-stack"><div class="field"><label for="profile-birth">출생연도</label><input id="profile-birth" inputmode="numeric" value="${esc(S.profile.birthYear)}" placeholder="예: 1956"></div><div class="field"><label for="profile-sex">성별</label><select id="profile-sex"><option value="">선택</option><option value="female" ${S.profile.sex==='female'?'selected':''}>여성</option><option value="male" ${S.profile.sex==='male'?'selected':''}>남성</option><option value="other" ${S.profile.sex==='other'?'selected':''}>기타 / 응답하지 않음</option></select></div><div class="field"><label for="profile-education">교육기간</label><select id="profile-education"><option value="">선택</option><option value="lt7" ${S.profile.education==='lt7'?'selected':''}>7년 미만</option><option value="7to9" ${S.profile.education==='7to9'?'selected':''}>7~9년</option><option value="gte10" ${S.profile.education==='gte10'?'selected':''}>10년 이상</option></select></div><div class="field"><label for="profile-living">함께 사는 사람</label><select id="profile-living"><option value="">선택</option><option value="alone" ${S.profile.living==='alone'?'selected':''}>혼자 거주</option><option value="family" ${S.profile.living==='family'?'selected':''}>가족과 거주</option><option value="other" ${S.profile.living==='other'?'selected':''}>기타</option></select></div><div class="field"><label for="profile-sleep">평소 수면시간</label><input id="profile-sleep" value="${esc(S.profile.sleepHours)}" placeholder="예: 7시간"></div><div class="field"><label for="profile-activity">평소 외출·걷기</label><select id="profile-activity"><option value="">선택</option><option value="frequent" ${S.profile.activity==='frequent'?'selected':''}>주 5회 이상</option><option value="some" ${S.profile.activity==='some'?'selected':''}>주 2~4회</option><option value="low" ${S.profile.activity==='low'?'selected':''}>주 1회 이하</option></select></div><div class="field"><label for="profile-hearing">대화할 때 청력이 불편한가요?</label><select id="profile-hearing"><option value="">선택</option><option value="no" ${S.profile.hearing==='no'?'selected':''}>거의 불편하지 않음</option><option value="some" ${S.profile.hearing==='some'?'selected':''}>가끔 불편함</option><option value="yes" ${S.profile.hearing==='yes'?'selected':''}>자주 불편함</option></select></div><button class="btn-kimse btn-primary-k" type="submit">기본 테스트로 계속</button></form>`,{title:'기본정보',narrow:true});

page['initial-check']=()=>{
  const s=Math.min(5,Math.max(0,Number(S.initial.step)||0)),a=S.initial.answers||{};
  const top=`<div class="eyebrow">처음 설정 2/4 · 기본 테스트 ${s+1}/6</div><div class="progress-k mt-2"><span style="width:${(s+1)/6*100}%"></span></div>`;
  if(s===0)return wrap(top+`<h1 class="page-title">세 단어를 기억해주세요</h1><div class="memory-words"><strong>나무</strong><strong>기차</strong><strong>우산</strong></div><p class="page-desc">잠시 뒤 다시 여쭤볼게요. 지금은 외우려고 너무 애쓰지 않아도 됩니다.</p><button class="btn-kimse btn-primary-k btn-full" data-initial-next>기억했어요</button>`,{title:'기억 시작',narrow:true});
  if(s===1)return wrap(top+`<div class="eyebrow mt-4">주의·실행</div><h1 class="page-title">2, 4, 6, 8 다음 숫자는?</h1><div class="answer-grid">${['10','9','12','6'].map(v=>`<button class="answer" data-initial-answer="attention:${v}">${v}</button>`).join('')}</div>`,{title:'주의·실행',narrow:true});
  if(s===2)return wrap(top+`<div class="eyebrow mt-4">언어</div><h1 class="page-title">사과와 배는 어떤 종류인가요?</h1><div class="answer-grid">${['과일','동물','교통수단','가구'].map(v=>`<button class="answer" data-initial-answer="language:${v}">${v}</button>`).join('')}</div>`,{title:'언어',narrow:true});
  if(s===3)return wrap(top+`<div class="eyebrow mt-4">공간·이동</div><h1 class="page-title">최근 익숙한 길이나 장소에서 방향이 헷갈린 적이 있나요?</h1><div class="answer-grid">${[['no','거의 없어요'],['sometimes','가끔 있어요'],['often','자주 있어요']].map(v=>`<button class="answer" data-initial-answer="spatial:${v[0]}">${v[1]}</button>`).join('')}</div>`,{title:'공간·이동',narrow:true});
  if(s===4)return wrap(top+`<div class="eyebrow mt-4">일상기능</div><h1 class="page-title">최근 약속이나 복약 시간을 놓치는 일이 있었나요?</h1><div class="answer-grid">${[['no','거의 없어요'],['sometimes','가끔 있어요'],['often','자주 있어요']].map(v=>`<button class="answer" data-initial-answer="daily:${v[0]}">${v[1]}</button>`).join('')}</div>`,{title:'일상기능',narrow:true});
  return wrap(top+`<div class="eyebrow mt-4">지연회상</div><h1 class="page-title">처음 보여드린 세 단어를<br>기억나는 만큼 적어주세요</h1><p class="page-desc">순서는 상관없습니다.</p><div class="form-stack"><div class="field"><label for="recall-input">기억나는 단어</label><input id="recall-input" value="${esc(S.initial.recall)}" placeholder="예: 나무, …"></div><button id="save-recall" class="btn-kimse btn-primary-k">음성 테스트로 계속</button></div>`,{title:'지연회상',narrow:true});
};

page['voice-check']=()=>{const done=S.initial.voiceSamples.filter(Boolean).length,recording=!!voiceRecorder;return wrap(`<div class="eyebrow">처음 설정 3/4 · 음성 기준 만들기</div><h1 class="page-title">말하는 습관도<br>나의 평소가 됩니다</h1><p class="page-desc">내용을 평가하려는 것이 아니라 말의 속도·멈춤·표현 변화 등을 장기적으로 비교하기 위한 첫 음성 샘플입니다.</p><div class="voice-task-list">${VOICE_PROMPTS.map((p,i)=>{const v=S.initial.voiceSamples[i];const active=recording&&voiceTask===i;return `<section class="voice-task ${v?'done':''}"><div class="voice-index">${v?'✓':i+1}</div><div><strong>${p}</strong><small>${v?`녹음 완료 · ${v.durationSec}초 · 이 기기에 저장`:'30초 이상 편하게 말해주세요.'}</small></div><button class="btn-kimse ${active?'btn-danger-k':'btn-blue-k'} compact-btn" data-voice-task="${i}" ${recording&&!active?'disabled':''}>${active?'녹음 종료':v?'다시 녹음':'녹음 시작'}</button></section>`}).join('')}</div>${S.permissions.microphone==='denied'?notice('마이크 권한이 꺼져 있어요.','브라우저 사이트 설정에서 마이크를 허용하면 다시 녹음할 수 있습니다.'):''}<div class="hero-actions"><button id="finish-voice" class="btn-kimse btn-primary-k" ${done<3?'disabled':''}>첫 상태 결과 보기</button><button id="skip-voice" class="btn-kimse btn-secondary-k">음성 없이 계속</button></div>${notice('개인정보 원칙','현재 음성 원본은 서버로 전송하지 않고 이 기기의 전용 저장공간에 보관합니다. 향후 분석·연구 전송은 별도 동의를 받습니다.')}`,{title:'음성 기준',narrow:true})};

page['initial-result']=()=>{if(!S.initial.completedAt)return wrap(`<h1 class="page-title">첫 상태 테스트가 필요해요</h1>${notice('아직 결과를 만들 수 없습니다.','기본 테스트와 음성 기준 만들기를 먼저 진행해주세요.')}<button class="btn-kimse btn-primary-k btn-full" data-go="initial-check">기본 테스트 시작</button>`,{title:'첫 상태 참고',narrow:true});const d=initialScores(),avg=Math.round(Object.values(d).reduce((x,y)=>x+y,0)/5),m=statusMeta(avg);return wrap(`<div class="eyebrow">첫 상태 참고</div><h1 class="page-title">오늘의 기능 상태를<br>먼저 참고해보세요</h1><div class="status-hero ${m[1]}"><span>현재 기능 참고</span><strong>${m[0]}</strong><small>기본 테스트 수행과 자가응답을 합친 참고값</small></div><div class="domain-grid">${BRAIN_DOMAINS.map(([k,t,r,icon])=>{const x=statusMeta(d[k]);return `<div class="domain-card"><span class="domain-icon">${icon}</span><div><strong>${t}</strong><small>${r}</small></div><span class="brain-score ${x[1]}">${x[0]}</span></div>`}).join('')}</div>${notice('이 결과는 진단이 아닙니다.','현재 결과는 변화 관찰을 위한 참고 정보이며 치매 진단을 의미하지 않습니다. 14일 동안 나의 평소 패턴이 쌓이면 이후에는 내 기준과의 변화도 함께 봅니다.')}<div class="hero-actions"><button class="btn-kimse btn-blue-k" data-go="brain-map">뇌 기능 연관 지도 보기</button><button class="btn-kimse btn-primary-k" data-go="consent">데이터 수집 동의로 계속</button></div>`,{title:'첫 상태 참고',narrow:true})};

page.consent=()=>wrap(`<div class="eyebrow">처음 설정 4/4</div><h1 class="page-title">어떤 데이터를 모을지<br>직접 선택해주세요</h1><p class="page-desc">필수 항목 외에는 언제든 설정에서 끌 수 있습니다.</p><form id="consent-form" class="form-stack"><div class="consent-panel"><label class="consent-row"><input id="consent-service" type="checkbox" ${S.consents.service?'checked':''}><span><strong>필수 · 서비스 이용</strong><small>계정과 기본 기능 제공</small></span></label><label class="consent-row"><input id="consent-privacy" type="checkbox" ${S.consents.privacy?'checked':''}><span><strong>필수 · 개인정보 수집·이용</strong><small>프로필과 이용 기록 처리</small></span></label><label class="consent-row"><input id="consent-health" type="checkbox" ${S.consents.health?'checked':''}><span><strong>필수 · 건강 관련 민감정보</strong><small>인지·생활 변화 기록 처리</small></span></label></div><h2 class="section-title">자동 관찰에 사용할 신호</h2><div class="consent-panel"><label class="consent-row"><input id="consent-microphone" type="checkbox" ${S.consents.microphone?'checked':''}><span><strong>마이크·음성 샘플</strong><small>말속도·멈춤·표현의 장기 변화 비교</small></span></label><label class="consent-row"><input id="consent-location" type="checkbox" ${S.consents.location?'checked':''}><span><strong>위치·이동</strong><small>생활반경·외출 리듬 변화 관찰. 브라우저/OS 권한 필요</small></span></label><label class="consent-row"><input id="consent-motion" type="checkbox" ${S.consents.motion?'checked':''}><span><strong>움직임 센서</strong><small>지원 기기에서 활동·보행 관련 신호 수집</small></span></label><label class="consent-row"><input id="consent-usage" type="checkbox" ${S.consents.usage?'checked':''}><span><strong>낌새 앱 사용 패턴</strong><small>반응시간·사용 시간대·과제 참여 변화</small></span></label><label class="consent-row"><input id="consent-notifications" type="checkbox" ${S.consents.notifications?'checked':''}><span><strong>이 기기에서 변화 알림 받기</strong><small>여러 변화가 함께 지속될 때 브라우저 알림</small></span></label><label class="consent-row"><input id="consent-caregiver" type="checkbox" ${S.consents.caregiverShare?'checked':''}><span><strong>보호자와 변화 알림 공유</strong><small>연결된 가족에게 의미 있는 변화가 있을 때 공유</small></span></label></div><div class="signal-limit"><strong>전화·메신저 패턴</strong><p>타 앱의 대화 내용은 읽지 않습니다. 향후 네이티브 앱에서 운영체제가 허용하는 통화·메시지 메타데이터를 연결할 때 별도 동의를 받습니다.</p></div><button class="btn-kimse btn-primary-k" type="submit">동의하고 14일 기준 만들기 시작</button></form>`,{title:'데이터 이용 동의',narrow:true});

page.baseline=()=>{if(!S.baseline.startedAt)return wrap(`<div class="eyebrow">개인 기준 형성</div><h1 class="page-title">아직 나의 평소 만들기를<br>시작하지 않았어요</h1>${notice('먼저 동의 범위를 정해주세요.','필수 동의와 선택 센서 범위를 확인하면 기준선 형성이 시작됩니다.')}<button class="btn-kimse btn-primary-k btn-full" data-go="consent">데이터 수집 동의 설정</button>`,{title:'나의 평소 만들기',narrow:true});const day=baselineDay(),pct=Math.round(day/14*100);return wrap(`<div class="eyebrow">개인 기준 형성</div><h1 class="page-title">나의 평소를<br>알아가는 중이에요</h1><div class="baseline-ring" style="--p:${pct}"><div><strong>${day || 1}<small>/14일</small></strong><span>${baselineComplete()?'기준 형성 완료':'데이터 축적 중'}</span></div></div><p class="page-desc text-center">${baselineComplete()?'이제 최근 상태를 나의 평소와 비교할 수 있습니다.':'평소처럼 생활해주세요. 사용 가능한 신호를 동의 범위 안에서 차곡차곡 모읍니다.'}</p>${baselineComplete()?`<button class="brain-home-card" data-go="brain-map"><span class="brain-home-icon">🧠</span><span><small>14일 기준 형성 후</small><strong>현재 기능 상태 함께 보기</strong><em>첫 검사와 이후 실제 체크 기록을 나의 평소와 함께 봅니다.</em></span>${I('chevron-right')}</button>`:''}<div class="signal-grid">${[['🌙','수면','건강데이터 연결 시'],['🚶','활동','움직임·건강데이터'],['📍','이동','위치 권한'],['🎙️','음성','초기 음성 샘플'],['📱','사용리듬','낌새 앱 이용'],['🏠','일상기능','체크·기록']].map(x=>`<div class="signal-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('')}</div><div class="monitor-sync-card"><strong>${S.monitoring.lastSyncError?'동기화 대기':'관찰 데이터 연결'}</strong><small>${S.monitoring.lastFlushAt?'마지막 전송 '+fmtDate(S.monitoring.lastFlushAt):S.monitoring.pending.length+'개 신호 전송 대기'}</small><button id="sync-monitoring" class="btn-kimse btn-secondary-k compact-btn">지금 동기화</button></div><div class="hero-actions"><button class="btn-kimse btn-blue-k" data-go="monitoring-status">관찰 데이터 상태 보기</button><button class="btn-kimse btn-blue-k" data-go="initial-result">첫 상태 다시 보기</button><button class="btn-kimse btn-primary-k" data-go="home">홈으로</button></div>${notice('수집 범위','웹앱에서 운영체제가 허용하지 않는 전화·메신저 기록 등은 임의로 읽지 않습니다. 지원되는 기기 연결은 권한을 받은 항목만 사용합니다.')}`,{title:'나의 평소 만들기',narrow:true})};

page['brain-map']=()=>{if(!S.initial.completedAt)return wrap(`<div class="eyebrow">뇌 기능 연관 지도</div><h1 class="page-title">첫 상태 테스트 후<br>기능 지도가 열려요</h1><div class="empty-state"><h3>아직 측정 데이터가 없어요</h3><p>기억·주의·언어·공간·일상기능을 확인하면 기능 연관 지도를 만들 수 있습니다.</p></div><button class="btn-kimse btn-primary-k btn-full mt-3" data-go="initial-check">기본 테스트 시작</button>${notice('뇌영상 검사가 아닙니다.','이 지도는 실제 뇌 조직을 촬영하거나 손상을 진단하지 않습니다.')}`,{title:'뇌 기능 지도',narrow:true});const d=initialScores();return wrap(`<div class="d-flex justify-content-between align-items-start gap-2"><div><div class="eyebrow">뇌 기능 연관 지도</div><h1 class="page-title">어느 기능에서<br>변화가 보이나요?</h1></div><button class="btn-kimse btn-blue-k compact-btn" data-go="brain-trends">일·주·월 추이</button></div><div class="segmented"><button data-brain-view="side" class="${S.brainView==='side'?'active':''}">옆에서 보기</button><button data-brain-view="top" class="${S.brainView==='top'?'active':''}">위에서 보기</button></div>${brainSvg(S.brainView)}<div class="domain-grid mt-3">${BRAIN_DOMAINS.map(([k,t,r,icon])=>{const x=statusMeta(d[k]);return `<div class="domain-card"><span class="domain-icon">${icon}</span><div><strong>${t}</strong><small>${r}</small></div><span class="brain-score ${x[1]}">${x[0]}</span></div>`}).join('')}</div>${notice('뇌영상 검사가 아닙니다.','표시는 검사·생활신호와 관련된 인지 기능을 이해하기 위한 기능 연관 지도입니다. 실제 뇌 조직의 손상이나 질환 위치를 측정한 결과가 아닙니다.')}`,{title:'뇌 기능 지도',narrow:true})};

page['monitoring-status']=()=>{
  const s=S.monitoring.summary,changes=s&&Array.isArray(s.changes)?s.changes:[],level=s?.level||'NORMAL';
  const levelText=level==='ATTENTION'?'여러 변화가 함께 보여요':level==='WATCH'?'조금 더 관찰할 변화가 있어요':'현재 뚜렷한 복합 변화는 없어요';
  const stateClass=level==='NORMAL'?'stable':level==='WATCH'?'watch':'alert';
  const changeHtml=changes.length?changes.map(x=>{const pct=x.relative_change==null?'':Math.round(x.relative_change*100);return '<div class="signal-change"><strong>'+esc(SIGNAL_LABELS[x.metric]||x.metric)+'</strong><span>'+(pct>0?'+':'')+pct+'%</span><small>평소 '+esc(x.baseline??'-')+' → 최근 '+esc(x.recent??'-')+'</small></div>'}).join(''):'<div class="empty-state"><h3>함께 지속되는 큰 변화가 아직 없어요</h3><p>한 번의 수치보다 여러 신호가 반복해서 달라지는지 확인합니다.</p></div>';
  const cards=[['🌙','수면','직접 기록·연결 데이터'],['🚶','활동·걸음','센서·건강데이터'],['📍','이동','동의한 위치의 이동량만'],['🎙️','음성','원음은 기기 보관·특징값 비교'],['📱','앱 사용','낌새 이용 리듬'],['☎️','통화·메신저','네이티브 연결 시 메타데이터만']].map(x=>'<div class="signal-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>').join('');
  return wrap('<div class="eyebrow">개인 변화 관찰</div><h1 class="page-title">내 평소와 비교한<br>최근 상태</h1><div class="status-hero '+stateClass+'"><span>'+(s?.status==='READY'?'14일 개인 기준과 비교':'개인 기준 형성 중')+'</span><strong>'+levelText+'</strong><small>'+(s?.status==='READY'?'최근 3일과 초기 14일의 실제 수집값을 비교합니다.':'14일 기준이 완성되기 전에는 이상 변화 판정을 하지 않습니다.')+'</small></div><div class="signal-change-list">'+changeHtml+'</div><h2 class="section-title">수집 가능한 신호</h2><div class="signal-grid">'+cards+'</div><button id="sync-monitoring" class="btn-kimse btn-primary-k btn-full">최신 상태 동기화</button>'+(S.monitoring.lastSyncError?notice('동기화 대기',S.monitoring.lastSyncError):'')+notice('진단이 아닙니다.','현재 결과는 변화 관찰을 위한 참고 정보이며 치매 진단을 의미하지 않습니다.'),{title:'개인 변화 관찰',narrow:true});
};
page['brain-trends']=()=>{const rows=filteredBrainHistory(),latest=rows[rows.length-1]||S.brainHistory[S.brainHistory.length-1]||null;return wrap(`<div class="eyebrow">기능 상태 변화</div><h1 class="page-title">시간에 따른 변화를<br>한눈에 확인해요</h1><div class="segmented"><button data-brain-range="day" class="${S.brainRange==='day'?'active':''}">일</button><button data-brain-range="week" class="${S.brainRange==='week'?'active':''}">주</button><button data-brain-range="month" class="${S.brainRange==='month'?'active':''}">월</button></div><p class="page-desc">선택 기간의 실제 체크 기록만 표시합니다. 데이터가 없는 날짜를 임의로 채우지 않습니다.</p><div class="trend-stack">${BRAIN_DOMAINS.map(([k,t,r,icon])=>{const score=latest?clamp(latest[k]):null,m=score===null?['측정 전','neutral']:statusMeta(score);return `<section class="trend-card"><div class="trend-card-head"><span class="domain-icon">${icon}</span><div><strong>${t}</strong><small>${r}</small></div><span class="brain-score ${m[1]}">${m[0]}</span></div>${sparkline(k)}</section>`}).join('')}</div>${notice('변화 해석 원칙','하루의 한 번 결과보다 반복되는 변화와 여러 영역의 동시 변화를 중요하게 봅니다. 이 그래프는 치매 진단 그래프가 아닙니다.')}`,{title:'기능 변화 추이',narrow:true})};

page.account=()=>{if(!demo())return accountRequired();return wrap(`<h1 class="page-title">내 계정 / 역할 관리</h1><div class="summary-card"><h3>${S.account.name}님</h3><p>${S.account.email}</p></div><div class="list">${row('사용자','내 건강을 관리하는 역할',`<span class="context-chip">${S.self?'활성':'미등록'}</span>`)}${row('보호자','가족을 돌보는 역할',`<span class="context-chip caregiver">${S.care?'활성':'미등록'}</span>`)}</div><div class="hero-actions"><button class="btn-kimse btn-blue-k" data-add-role="self">+ 사용자 역할 추가</button><button class="btn-kimse btn-secondary-k" data-add-role="care">+ 보호자 역할 추가</button>${btn('역할 전환','switch')}</div>`,{title:'내 계정',narrow:true})};
page.switch=()=>{if(!demo())return accountRequired();return wrap(`<h1 class="page-title">어떤 화면으로 이동할까요?</h1>${S.self?`<button class="role-card bg-blue" data-mode="self"><span class="avatar-lg">👵</span><span><h3>사용자 화면</h3><p>내 건강을 관리해요.</p></span>${I('chevron-right')}</button>`:''}${S.care?`<button class="role-card bg-pink" data-mode="care"><span class="avatar-lg">👩</span><span><h3>보호자 화면</h3><p>가족을 돌봐요.</p></span>${I('chevron-right')}</button>`:''}${!S.care?notice('보호자 역할이 아직 없어요.','내 계정에서 언제든 추가할 수 있어요.'):''}`,{title:'역할 전환',narrow:true})};
page.home=()=>{if(!demo())return accountRequired();const day=baselineDay(),d=S.initial.completedAt?initialScores():null,avg=d?Math.round(Object.values(d).reduce((x,y)=>x+y,0)/5):null,m=avg===null?null:statusMeta(avg);const journey=!S.onboarding.completed?`<div class="summary-card bg-blue"><div class="eyebrow">처음 설정이 아직 남아 있어요</div><h3>나의 평소를 만들 준비를 해주세요.</h3><p>기본 테스트·음성 기준·데이터 동의를 마치면 14일 기준선 형성이 시작됩니다.</p><button class="btn-kimse btn-primary-k btn-full mt-3" data-go="${S.onboarding.profileDone?'initial-check':'onboarding-profile'}">설정 이어하기</button></div>`:`<div class="baseline-home-card"><div><span class="context-chip">${baselineComplete()?'개인 기준 준비됨':'개인 기준 형성 중'}</span><h3>${baselineComplete()?'이제 나의 평소와 비교할 수 있어요':'나의 평소를 알아가는 중이에요'}</h3><p>${baselineComplete()?'최근 변화가 평소 범위를 벗어나는지 계속 관찰합니다.':`오늘은 ${day}/14일째예요. 동의한 신호를 계속 쌓고 있습니다.`}</p></div><div class="baseline-mini"><strong>${day || 1}<small>/14</small></strong></div><button class="btn-kimse btn-secondary-k btn-full" data-go="baseline">수집 상태 보기</button></div>`;return wrap(`<div class="d-flex justify-content-between"><div><span class="context-chip">내 건강 보기</span><h1 class="page-title">안녕하세요<br>${S.account.name}님</h1></div><button class="icon-button" data-go="switch" aria-label="역할 전환">${I('switch-horizontal')}</button></div>${journey}${m?`<button class="brain-home-card" data-go="brain-map"><span class="brain-home-icon">🧠</span><span><small>현재 기능 상태 참고</small><strong>${m[0]}</strong><em>기억·주의·언어·공간·일상기능을 함께 봅니다.</em></span>${I('chevron-right')}</button>`:''}<div class="card-grid">${[['🧠','근거 기반 체크','assessment-start','bg-pink'],['🧩','인지 훈련','training','bg-purple'],['💊','복약 관리','medication','bg-amber'],['💚','건강 기록','health','bg-mint']].map(x=>`<a class="action-card ${x[3]}" href="#/${x[2]}"><span class="icon">${x[0]}</span><strong>${x[1]}</strong></a>`).join('')}</div><h2 class="section-title">가족과 함께</h2><a href="#/family" class="list-row"><span><strong>${S.caregivers.length?`연결된 보호자 ${S.caregivers.length}명`:'가족/보호자 연결하기'}</strong><small>가족/보호자 연결은 구독과 별개로 관리할 수 있어요.</small></span>${I('chevron-right')}</a>`,{back:false,bottom:true,active:'home'})};
page['assessment-start']=()=>{const a=EVIDENCE_MODEL?.activeModel;if(!a)return wrap(`<h1 class="page-title">근거 모델을 불러오지 못했습니다</h1>${notice('점수를 추정하지 않습니다.','근거 레지스트리를 다시 불러온 뒤 이용해주세요.')}`,{title:'근거 기반 체크',narrow:true});return wrap(`<div class="eyebrow">근거 기반 위험요인 체크</div><h1 class="page-title">${a.name}</h1>${row('팩터',a.factors.map(f=>f.label).join(' · '),a.factors.length+'개')}${row('조합',a.combination.rule,'최대 '+a.combination.maxScore+'점')}${notice('공개 검증된 원 점수체계를 사용합니다.','이 점수는 장기 위험요인 연구모델이며 치매 진단이나 현재 인지상태 판정이 아닙니다.')}<button id="begin" class="btn-kimse btn-primary-k btn-full">시작하기</button>`,{title:'근거 기반 체크',narrow:true})};
page.assessment=()=>{if(!Q.length)return page['assessment-start']();let i=Math.min(S.q,Q.length-1),q=Q[i];return wrap(`<strong>위험요인 체크 ${i+1}/${Q.length}</strong><div class="progress-k mt-2"><span style="width:${(i+1)/Q.length*100}%"></span></div><div class="eyebrow mt-4">${q.label} · ${q.evidence}</div><h1 class="page-title">${q.question}</h1><div class="answer-grid">${q.options.map((x,j)=>`<button class="answer" data-answer="${j}" aria-pressed="${S.answers[i]===j}">${x.label}<small>${x.points}점</small></button>`).join('')}</div><button id="next" class="btn-kimse btn-primary-k btn-full" ${S.answers[i]===undefined?'disabled':''}>${i===Q.length-1?'결과 보기':'다음'}</button>`,{title:'근거 기반 체크',narrow:true})};
page.result=()=>{const a=EVIDENCE_MODEL?.activeModel;if(!a||!Q.length)return page['assessment-start']();const score=assessmentScore(),max=a.combination.maxScore,cut=a.combination.researchCutoff;const rows=Q.map((q,i)=>{const o=q.options[S.answers[i]];return row(q.label,o?o.label:'미응답',o?o.points+'점':'-')}).join('');return wrap(`<div class="eyebrow">근거 기반 체크 결과</div><h1 class="page-title">${a.name}</h1><div class="summary-card text-center"><div class="context-chip">공개 원 점수 합계</div><div style="font-size:64px;font-weight:900;color:#14755f">${score}<small style="font-size:22px"> / ${max}</small></div><strong>7개 CAIDE Model 1 팩터의 원 점수 합산</strong></div><div class="list">${rows}</div>${notice('원 연구의 참고 기준: '+cut.operator+cut.value+'점',cut.note)}${notice('해석 범위','CAIDE는 중년기의 장기 치매 위험 연구모델입니다. 현재 인지상태나 치매 여부를 이 점수로 판정하지 않습니다.')}${btn('홈으로','home')}`,{title:'근거 기반 결과',narrow:true})};
const TRAINING={
memory:{icon:'🖼️',title:'기억 훈련',desc:'짧게 보고 핵심 정보를 떠올려요.',prompt:'조금 전 본 세 단어 중 포함된 것은?',choices:['사과','기차','연필','우산'],correct:0,hint:'정답보다 꾸준한 회상이 중요해요.'},
attention:{icon:'🎯',title:'집중 훈련',desc:'비슷한 것 사이에서 다른 하나를 찾아요.',prompt:'다른 하나를 골라보세요.',choices:['● ● ●','● ● ●','● ○ ●','● ● ●'],correct:2,hint:'서두르지 말고 한 줄씩 살펴보세요.'},
language:{icon:'💬',title:'언어 훈련',desc:'말의 뜻과 연결을 천천히 떠올려요.',prompt:'“따뜻하다”와 가장 가까운 말은?',choices:['포근하다','무겁다','빠르다','멀다'],correct:0,hint:'평소 쓰는 쉬운 말부터 연결해요.'},
daily:{icon:'☕',title:'일상 훈련',desc:'생활 속 순서와 판단을 연습해요.',prompt:'외출 전에 가장 먼저 확인하면 좋은 것은?',choices:['가스·문 잠금','TV 채널','사진 정리','서랍 색상'],correct:0,hint:'실제 생활과 연결해 반복하는 훈련이에요.'}
};
page.training=()=>wrap(`<h1 class="page-title">인지 훈련</h1><p class="page-desc">기억·집중·언어·일상 활동을 짧고 부담 없이 연습해요.</p><div class="list">${Object.entries(TRAINING).map(([k,x])=>`<button class="list-row menu-row" data-training="${k}"><span><strong>${x.icon} ${x.title}</strong><small>${x.desc}</small></span>${I('chevron-right')}</button>`).join('')}</div>${notice('훈련은 진단이 아닙니다.','정답률보다 규칙적인 참여와 변화 추이를 살펴보는 용도입니다.')}`,{title:'인지 훈련',bottom:true,active:'training'});
page['training-play']=()=>{const x=TRAINING[S.selectedTraining]||TRAINING.memory;const done=S.trainingResult&&S.trainingResult.type===S.selectedTraining;return wrap(`<div class="eyebrow">${x.icon} ${x.title}</div><h1 class="page-title">${x.prompt}</h1><p class="page-desc">${x.desc}</p><div class="answer-grid">${x.choices.map((c,i)=>`<button class="answer" data-training-answer="${i}" ${done?'disabled':''}>${c}</button>`).join('')}</div>${done?notice(S.trainingResult.correct?'잘했어요.':'괜찮아요. 다시 떠올려보세요.',x.hint):''}${done?'<button class="btn-kimse btn-secondary-k btn-full" data-training-reset>한 번 더 하기</button>':''}`,{title:x.title,narrow:true})};
page.medication=()=>wrap(`<h1 class="page-title">복약 관리</h1><p class="page-desc">등록한 약마다 복용 여부를 바로 기록할 수 있어요.</p><div class="list">${S.medicines.map(m=>row('💊 '+m.name,`${m.time} · ${m.note||'복용 메모 없음'}`,`<button class="btn-kimse ${m.taken?'btn-secondary-k':'btn-primary-k'}" data-med-id="${m.id}">${m.taken?'복용 완료 ✓':'복용 기록'}</button>`)).join('')}</div><div class="hero-actions">${btn('+ 약 등록하기','medication-add','btn-blue-k')}</div>`,{title:'복약 관리',narrow:true});
page['medication-add']=()=>wrap(`<h1 class="page-title">약 등록</h1><div class="form-stack"><div class="field"><label for="med-name">약 이름</label><input id="med-name" placeholder="예: 혈압약"></div><div class="field"><label for="med-time">복용 시간</label><input id="med-time" type="time" value="08:00"></div><div class="field"><label for="med-note">복용 메모</label><input id="med-note" placeholder="예: 아침 식사 후"></div><button id="save-med" class="btn-kimse btn-primary-k">등록하기</button></div>`,{title:'약 등록',narrow:true});
const HEALTH_META={sleep:['🌙','수면','지난밤'],steps:['🚶','활동량','오늘'],pressure:['❤️','혈압','최근']};
page.health=()=>wrap(`<h1 class="page-title">건강 기록</h1><div class="summary-card"><h3>오늘의 기분</h3><div class="answer-grid" style="grid-template-columns:repeat(3,1fr)">${[['🙂','좋아요'],['😐','보통이에요'],['🙁','안 좋아요']].map(x=>`<button class="answer" data-mood="${x[1]}" aria-pressed="${S.mood===x[1]}"><span class="emoji">${x[0]}</span>${x[1]}</button>`).join('')}</div></div><div class="list">${Object.entries(HEALTH_META).map(([k,x])=>`<button class="list-row menu-row" data-health="${k}"><span><strong>${x[0]} ${x[1]}</strong><small>${x[2]}</small></span><span><strong>${S.health[k]||'기록 없음'}</strong> ${I('chevron-right')}</span></button>`).join('')}</div>`,{title:'건강 기록',bottom:true,active:'health'});
page['health-detail']=()=>{const k=S.selectedHealth in HEALTH_META?S.selectedHealth:'sleep',x=HEALTH_META[k];return wrap(`<div class="eyebrow">${x[0]} ${x[1]}</div><h1 class="page-title">${x[1]} 기록 수정</h1><div class="form-stack"><div class="field"><label for="health-value">${x[1]} 값</label><input id="health-value" value="${S.health[k]||''}" placeholder="${k==='sleep'?'예: 7시간 30분':k==='steps'?'예: 4,320 걸음':'예: 120 / 80'}"></div><div class="field"><label for="health-memo">메모</label><textarea id="health-memo" rows="4" placeholder="특이사항이 있으면 적어주세요.">${S.health.memo||''}</textarea></div><button id="save-health" class="btn-kimse btn-primary-k">저장하기</button></div>`,{title:x[1]+' 기록',narrow:true})};
page['caregiver-home']=()=>{if(!demo())return accountRequired();const alert=S.monitoring.alerts[0];return wrap(`<span class="context-chip caregiver">가족 돌봄 보기</span><h1 class="page-title">안녕하세요<br>${S.account.name}님</h1>${alert?`<button class="care-alert-card" data-go="monitoring-status"><span>⚠️</span><span><strong>가족의 최근 변화가 보여요</strong><small>${esc(alert.summary||'여러 신호가 평소와 다르게 관찰되고 있습니다.')}</small></span>${I('chevron-right')}</button>`:''}<div class="summary-card bg-pink"><h3>연결된 가족</h3><p>가족의 오늘 상태를 한눈에 확인하세요.</p></div><div class="card-grid">${[['📊','상태 요약','report'],['🚨','비상 알림','emergency'],['📅','일정 관리','care-schedule'],['👨‍👩‍👧','가족 관리','family']].map(x=>`<a class="action-card" href="#/${x[2]}"><span class="icon">${x[0]}</span><strong>${x[1]}</strong></a>`).join('')}</div><h2 class="section-title">내 기능도 사용하기</h2><button class="btn-kimse btn-blue-k btn-full" data-add-role="self">내 건강 관리 사용자 역할 추가/이동</button>`,{back:false,bottom:true,care:true,active:'caregiver-home'})};
page['care-schedule']=()=>wrap(`<h1 class="page-title">가족 일정 관리</h1><p class="page-desc">복약·안부·진료 같은 가족 일정을 한곳에 적어둘 수 있어요.</p><div class="list">${S.schedule.map(x=>row('📅 '+x.title,x.date,'예정')).join('')}</div><h2 class="section-title">일정 추가</h2><div class="form-stack"><div class="field"><label for="schedule-title">일정</label><input id="schedule-title" placeholder="예: 병원 동행"></div><div class="field"><label for="schedule-date">날짜/시간</label><input id="schedule-date" placeholder="예: 9월 16일 10:30"></div><button id="add-schedule" class="btn-kimse btn-primary-k">일정 추가</button></div>`,{title:'일정 관리',narrow:true});
page.family=()=>wrap(`<h1 class="page-title">가족 연결 관리</h1><div class="summary-card bg-blue"><h3>보호자 ${S.caregivers.length}명 연결</h3><p>가족 연결과 역할 관리는 구독 여부와 관계없이 사용할 수 있어요.</p></div><div class="list">${S.caregivers.map((x,i)=>row(x.name,i?'자녀':'배우자','연결됨')).join('')||'<div class="empty-state"><h3>연결된 보호자가 없어요</h3></div>'}</div><button class="btn-kimse btn-primary-k btn-full mt-3" data-go="family-add">+ 보호자 추가하기</button>`,{title:'가족 연결 관리',narrow:true});
page['family-add']=()=>wrap(`<h1 class="page-title">보호자 연결 추가</h1><div class="form-stack"><div class="field"><label for="family-name">이름</label><input id="family-name" placeholder="예: 김○○"></div><div class="field"><label for="family-relation">관계</label><input id="family-relation" placeholder="예: 배우자, 자녀"></div><button id="save-family" class="btn-kimse btn-primary-k">연결 정보 저장</button></div>${notice('가족 연결 정보','가족 연결 정보와 비상알림 수신자는 별도로 관리됩니다. 실제 알림을 받을 사람은 비상 알림 메뉴에서 등록해주세요.')}`,{title:'보호자 추가',narrow:true});
page.report=()=>{const meds=S.medicines.length?`${S.medicines.filter(x=>x.taken).length} / ${S.medicines.length}개 복용 기록`:'기록 없음';const rows=[row('🙂 오늘 기분','직접 기록한 값',S.mood||'기록 없음'),row('🌙 수면','직접 기록한 값',S.health.sleep||'기록 없음'),row('🚶 활동량','직접 기록한 값',S.health.steps||'기록 없음'),row('❤️ 혈압','직접 기록한 값',S.health.pressure||'기록 없음'),row('💊 복약','등록된 약 기준',meds)].join('');return wrap(`<h1 class="page-title">상태 리포트</h1><p class="page-desc">입력한 기록만 보여드립니다. 임의의 점수나 변화율을 만들지 않습니다.</p><div class="summary-card">${rows}</div>${notice('지속되는 변화가 걱정된다면','의료기관 상담을 권합니다. 낌새는 진단을 대신하지 않습니다.')}`,{title:'상태 리포트',narrow:true})};
page.emergency=()=>wrap(`<h1 class="page-title">비상 알림</h1><div class="summary-card bg-pink"><h3>비상상태 알림 수신자 ${S.alertRecipients.length}명</h3><p>수신자 1인까지 무료이며, 2인째부터 구독이 적용됩니다.</p></div><div class="list">${S.alertRecipients.map((x,i)=>row(x.name,i?'추가 수신자':'무료 수신자','알림 받음')).join('')||'<div class="empty-state"><h3>등록된 비상알림 수신자가 없어요</h3></div>'}</div><button class="btn-kimse btn-primary-k btn-full mt-3" data-go="alert-add">+ 비상알림 수신자 추가</button>${notice('가족 연결과는 별개예요.','보호자 역할을 추가하는 것 자체에는 이 구독 제한을 적용하지 않습니다.')}`,{title:'비상 알림',narrow:true});
page['alert-add']=()=>wrap(`<h1 class="page-title">비상알림 수신자 추가</h1><div class="form-stack"><div class="field"><label for="alert-name">이름</label><input id="alert-name" placeholder="예: 김○○"></div><div class="field"><label for="alert-relation">관계</label><input id="alert-relation" placeholder="예: 자녀"></div><div class="field"><label for="alert-phone">연락처</label><input id="alert-phone" inputmode="tel" placeholder="010-0000-0000"></div><button id="save-alert" class="btn-kimse btn-primary-k">수신자 저장</button></div>`,{title:'비상알림 수신자',narrow:true});
const MARKET_CATS=[
['all','🧭','전체'],['cognitive','🧠','인지·활동'],['safety','🛡️','안전·생활'],['emergency','📍','위치·비상'],['med','💊','복약·건강'],['meal','🥣','식사·영양'],['sense','🔊','감각·소통'],['care','🤝','돌봄·동행'],['digital','📱','디지털·가족'],['welfare','🏥','공공·복지']
];
const MARKET_ITEMS=[
{id:'c1',cat:'cognitive',icon:'🧠',vendor:'실비아헬스',title:'실비아 웰니스',desc:'전문가가 설계한 두뇌활동·건강교육·생활습관 콘텐츠를 제공하는 뇌 건강 관리 앱.',useFor:'집에서 스마트폰으로 인지·생활 습관을 꾸준히 관리하고 싶은 분',check:'자가관리 서비스이며 의료 진단을 대신하지 않습니다. 개인정보 처리와 유료 기능 범위를 확인하세요.',meta:'디지털 건강관리',url:'https://silviahealth.com/product/wellness'},
{id:'c2',cat:'cognitive',icon:'🖥️',vendor:'실비아헬스',title:'실비아 스테이션',desc:'복지관·병원·공공시설 등에서 인지 측정과 훈련을 연결하는 키오스크형 인지건강 솔루션.',useFor:'기관에서 시니어 인지활동과 결과 관리를 운영하려는 경우',check:'설치 기관, 운영 방식, 측정 도구의 해석 범위와 데이터 관리 정책을 확인하세요.',meta:'기관용 솔루션 · 물품식별번호 25671631 안내',url:'https://silviahealth.com/product/station'},
{id:'c3',cat:'cognitive',icon:'🎮',vendor:'캐어유',title:'엔브레인 게임',desc:'기억력·순발력·사고력·집중력·판단력 영역의 인지훈련 게임과 기록 기능을 제공하는 앱.',useFor:'게임 방식으로 짧게 인지활동을 반복하고 싶은 분',check:'훈련 성과가 질환의 예방·치료 효과를 보장하는 것은 아닙니다. 이용 전 개인정보·과금 조건을 확인하세요.',meta:'인지훈련 앱',url:'https://enbrain.kr/'},
{id:'c4',cat:'cognitive',icon:'📊',vendor:'캐어유',title:'엔브레인 플랫폼',desc:'인지지원 사례관리, 정신건강 점검, 인지훈련 데이터를 한곳에서 관리하는 기관용 플랫폼.',useFor:'복지시설·기관에서 여러 이용자의 인지지원 기록을 관리하는 경우',check:'기관용 계약 범위와 개인정보 처리, 검사도구 사용 자격을 확인하세요.',meta:'기관용 디지털 사례관리',url:'https://careyou.org/31'},

{id:'s1',cat:'safety',icon:'🛁',vendor:'케어맥스',title:'실버플라이 목욕의자 SH-001',desc:'욕실에서 앉은 자세로 씻을 때 사용할 수 있는 목욕 보조의자.',useFor:'욕실에서 오래 서 있기 어렵거나 미끄럼 위험을 줄이고 싶은 분',check:'사용자의 체격·균형능력, 욕실 바닥 상태, 제품 크기와 미끄럼 방지 상태를 확인하세요.',meta:'생활 보조용품 · 공식몰 표시상 법정 인증 해당없음',url:'https://www.caremax.kr/goods/goods_view.php?goodsNo=1000000011'},
{id:'s2',cat:'safety',icon:'🚶',vendor:'케어맥스',title:'실버플라이 보행보조차',desc:'외출·실내 이동 시 지지와 휴식을 돕는 보행보조차 제품군.',useFor:'보행 시 지지점이나 휴식 공간이 필요한 분',check:'사용자 키에 맞는 손잡이 높이, 브레이크 조작, 실내 문폭·경사로 환경을 확인하세요.',meta:'생활·이동 보조용품',url:'https://www.caremax.kr/goods/goods_list.php?cateCd=001'},
{id:'s3',cat:'safety',icon:'🦯',vendor:'케어맥스',title:'사발지팡이 CW-CMS001',desc:'바닥 지지점이 여러 개인 사발형 지팡이.',useFor:'일반 지팡이보다 넓은 지지면이 필요한 분',check:'좌우 사용 방향, 높이 조절, 보행 패턴에 맞는지 전문가와 확인하면 좋습니다.',meta:'생활·이동 보조용품',url:'https://www.caremax.kr/goods/goods_view.php?goodsNo=1000000034'},
{id:'s4',cat:'safety',icon:'🦽',vendor:'케어맥스',title:'실버플라이 워커',desc:'실내외 보행 시 몸을 지지할 수 있는 워커 제품군.',useFor:'보행 중 양손 지지가 필요한 분',check:'폭·높이·바퀴 유무와 사용 공간을 확인하고, 넘어짐 위험이 있다면 전문가 상담 후 선택하세요.',meta:'생활·이동 보조용품',url:'https://www.caremax.kr/goods/goods_list.php?cateCd=003002'},

{id:'e1',cat:'emergency',icon:'📡',vendor:'국민건강보험공단',title:'장기요양 배회감지기 대여',desc:'장기요양 수급자를 대상으로 GPS형·매트형 배회감지기를 복지용구로 대여할 수 있는 제도.',useFor:'실종 위험이 있어 위치 확인이나 이탈 알림이 필요한 장기요양 수급자',check:'수급자격, 시설급여 이용 여부, 본인부담금과 해당 복지용구 사업소를 확인하세요.',meta:'공공지원 · 노인장기요양보험',url:'https://www.longtermcare.or.kr/'},
{id:'e2',cat:'emergency',icon:'🪪',vendor:'치매안심센터',title:'실종예방 서비스',desc:'배회인식표·지문 사전등록·배회감지기 등 지역 치매안심센터에서 확인할 수 있는 실종예방 지원.',useFor:'실종 위험이 있는 치매환자와 보호자',check:'지역별 지원 품목·재고·대상 조건이 다를 수 있어 거주지 치매안심센터에 확인하세요.',meta:'공공지원 · 지역별 조건 확인',url:'https://www.nid.or.kr/'},
{id:'e3',cat:'emergency',icon:'🏷️',vendor:'삼성전자',title:'갤럭시 스마트태그2',desc:'SmartThings Find를 통해 등록한 태그의 위치를 확인할 수 있는 블루투스/UWB 기반 위치 액세서리.',useFor:'가방·열쇠 등 소지품 위치 확인이나 가족과 합의한 위치 확인 보조가 필요한 경우',check:'갤럭시 기기·삼성계정·SmartThings 호환 조건을 확인하세요. 사람의 안전을 보장하는 의료·구조 장비는 아닙니다.',meta:'위치 확인 액세서리 · IP67',url:'https://www.samsung.com/sec/mobile-accessories/galaxy-smart-tag-2/EI-T5600BBEGKR/'},

{id:'m1',cat:'med',icon:'🩺',vendor:'한국오므론헬스케어',title:'HEM-7156T 자동전자혈압계',desc:'상완 혈압 측정과 블루투스 데이터 전송을 지원하는 가정용 혈압계.',useFor:'가정에서 혈압을 정기적으로 기록하고 스마트폰으로 관리하려는 분',check:'커프 둘레, 측정 자세, 의료진이 안내한 측정 시간과 방법을 따르세요.',meta:'가정용 혈압계 · 국제기준검증 표시',url:'https://www.omron-healthcare.co.kr/products/blood-pressure-monitors/view?prductSq=101'},
{id:'m2',cat:'med',icon:'📲',vendor:'한국오므론헬스케어',title:'오므론 커넥트 연동',desc:'지원 기기에서 측정한 혈압 데이터를 스마트폰으로 전송해 경향·메모 등을 관리하는 기능.',useFor:'종이 수첩 대신 측정 기록을 휴대폰에 모으고 싶은 분',check:'사용 중인 측정기 모델과 스마트폰의 앱 호환 여부를 확인하세요.',meta:'기기 연동 건강기록',url:'https://www.omron-healthcare.co.kr/products/blood-pressure-monitors/view?prductSq=101'},
{id:'m3',cat:'med',icon:'❤️',vendor:'한국오므론헬스케어',title:'HEM-7530T 혈압·심전도 측정기',desc:'혈압 측정과 심전도 기록 기능을 함께 제공하는 가정용 측정기.',useFor:'의료진 안내에 따라 혈압과 심전도 기록을 함께 관리하려는 분',check:'증상 판단이나 진단을 앱·기기 결과만으로 하지 말고, 이상 증상이 있으면 의료기관에 문의하세요.',meta:'의료기기 · 사용설명서 확인 필수',url:'https://www.omron-healthcare.co.kr/products/electrocardiogram/view?prductSq=132'},

{id:'n1',cat:'meal',icon:'🥤',vendor:'대상웰라이프',title:'뉴케어 균형영양식',desc:'식사가 어렵거나 균형 있는 영양 보충이 필요한 상황을 위한 환자용 균형영양식 제품군.',useFor:'식사량이 부족하거나 간편한 영양 보충이 필요한 분',check:'질환·연하 상태·섭취량에 따라 적합한 제품이 다르므로 의료진·영양사 안내와 제품 표시를 확인하세요.',meta:'환자용 균형영양식',url:'https://www.daesangwellife.com/kr/brand/nucare-balanced-nutrition'},
{id:'n2',cat:'meal',icon:'🥣',vendor:'대상웰라이프',title:'뉴케어 전문영양식',desc:'질환별 영양 설계를 적용한 전문영양식 제품군.',useFor:'질환 때문에 일반 식사만으로 영양 관리가 어려운 분',check:'질환별 제품 선택은 진료·영양 상담과 제품의 섭취 주의사항을 먼저 확인하세요.',meta:'전문영양식 · 제품별 대상 확인',url:'https://www.daesangwellife.com/kr/brand/nucare-specialized-nutrition'},
{id:'n3',cat:'meal',icon:'🌾',vendor:'매일유업',title:'메디웰 완전균형영양식',desc:'오곡맛·고단백 등 다양한 구성을 제공하는 환자용 완전균형영양식 제품군.',useFor:'식사 보완이나 영양 관리가 필요한 분',check:'당뇨·신장질환 등은 일반 제품이 아닌 전용 영양식이 필요할 수 있으므로 제품 구분과 의료진 안내를 확인하세요.',meta:'환자용 영양식',url:'https://direct.maeil.com/m/product/productList.do?categoryCode=700000&subCategory=005'},

{id:'a1',cat:'sense',icon:'👂',vendor:'시그니아',title:'시그니아 보청기',desc:'난청 정도와 착용 형태에 맞춘 다양한 보청기와 연결 액세서리를 제공.',useFor:'대화·TV·전화 등 일상 청취가 불편해 청력 평가와 보청기 상담이 필요한 분',check:'보청기는 청력검사와 전문가 피팅이 중요합니다. 온라인 정보만으로 모델을 정하지 마세요.',meta:'청각 보조 의료기기 · 전문가 피팅 권장',url:'https://www.signia.net/ko-kr/'},
{id:'a2',cat:'sense',icon:'📱',vendor:'시그니아',title:'시그니아 앱',desc:'호환 보청기의 볼륨·청취 프로그램 조절, 원격 상담 등 연결 기능을 제공.',useFor:'보청기를 스마트폰으로 조절하거나 원격 지원을 받고 싶은 사용자',check:'보청기 모델·스마트폰 OS 호환성과 텔레케어 활성화 조건을 확인하세요.',meta:'보청기 연동 앱',url:'https://www.signia.net/ko-kr/connectivity/signia-app/'},
{id:'a3',cat:'sense',icon:'🎧',vendor:'오티콘 코리아',title:'오티콘 보청기',desc:'난청 정도와 생활환경에 맞춘 보청기 제품과 청각 지원 정보를 제공.',useFor:'청력 저하로 일상 대화가 불편해 전문 피팅이 필요한 분',check:'청력검사 결과와 귀 상태, 사후관리 가능한 센터 여부를 함께 확인하세요.',meta:'청각 보조 의료기기 · 전문가 상담 권장',url:'https://www.oticon.co.kr/'},
{id:'a4',cat:'sense',icon:'🦻',vendor:'포낙',title:'포낙 보청기',desc:'경도부터 고심도 난청까지 다양한 형태의 보청기와 무선 연결 솔루션을 제공.',useFor:'청력 수준과 생활환경에 맞는 보청기 선택이 필요한 분',check:'공식 안내도 전문가 평가·피팅을 권장합니다. 비승인 판매처와 보증 조건을 확인하세요.',meta:'의료기기 · 전문가 피팅 권장',url:'https://www.phonak.com/ko-kr/hearing-devices/hearing-aids'},
{id:'a5',cat:'sense',icon:'📲',vendor:'포낙',title:'myPhonak 앱',desc:'포낙 보청기의 청취 설정 조절, 개인화, 원격 지원 연결을 제공하는 앱.',useFor:'호환 포낙 보청기를 스마트폰에서 관리하고 싶은 분',check:'보청기 모델과 iOS·Android 버전 호환성을 확인하세요.',meta:'보청기 연동 앱',url:'https://www.phonak.com/ko-kr/hearing-devices/apps/myphonak'},

{id:'r1',cat:'care',icon:'🏠',vendor:'케어링',title:'방문요양',desc:'장기요양등급 이용자를 대상으로 위생·건강·일상·인지활동·정서 지원 등을 제공하는 재가요양 서비스.',useFor:'집에서 요양보호사의 정기적인 돌봄이 필요한 장기요양 수급자',check:'장기요양등급, 본인부담률, 지역 매칭 가능 여부와 실제 제공 시간을 확인하세요.',meta:'장기요양 재가서비스',url:'https://caring.co.kr/visit'},
{id:'r2',cat:'care',icon:'🌞',vendor:'케어링',title:'주간보호센터',desc:'낮 시간 동안 돌봄·활동 프로그램을 제공하는 주간보호 서비스.',useFor:'낮 시간 보호와 활동, 식사·생활지원이 필요한 장기요양 수급자',check:'센터 위치, 송영 범위, 프로그램, 이용시간, 본인부담금을 확인하세요.',meta:'장기요양 주야간보호',url:'https://caring.co.kr/daycare'},
{id:'r3',cat:'care',icon:'🤝',vendor:'케어닥',title:'간병·가사 돌봄',desc:'병원 간병, 집에서 간병, 가족 간병, 가사 돌봄 등 필요한 돌봄을 신청할 수 있는 서비스.',useFor:'입원·퇴원 후 또는 가정에서 간병·생활지원 인력이 필요한 가족',check:'서비스 지역, 돌봄 인력의 역할 범위, 비용·취소 조건, 보호자 인계사항을 확인하세요.',meta:'민간 돌봄 서비스 · 비제휴',url:'https://caredoc.kr/'},
{id:'r4',cat:'care',icon:'🧑‍⚕️',vendor:'케어네이션',title:'간병인 찾기·방문간병',desc:'병원·가정에서 필요한 간병인을 앱으로 찾아 프로필과 후기를 확인하고 매칭하는 서비스.',useFor:'간병인이 필요한 날짜·지역·돌봄 조건에 맞춰 직접 비교하고 싶은 보호자',check:'간병 범위, 보험·결제, 교대시간, 취소 조건과 환자 상태 전달 내용을 확인하세요.',meta:'민간 돌봄 매칭 · 비제휴',url:'https://www.carenation.kr/service/protector/'},

{id:'d1',cat:'digital',icon:'📱',vendor:'케어네이션',title:'케어네이션 앱',desc:'간병인 찾기, 방문요양·병원동행 등 여러 돌봄 서비스를 한곳에서 신청·관리하는 앱 기반 플랫폼.',useFor:'가족의 돌봄 서비스를 휴대폰에서 비교·신청하고 싶은 보호자',check:'서비스별 계약 주체, 개인정보 처리, 결제·취소 조건을 확인하세요.',meta:'가족 돌봄 플랫폼 · 비제휴',url:'https://www.carenation.kr/'},
{id:'d2',cat:'digital',icon:'🏡',vendor:'삼성전자',title:'SmartThings',desc:'호환되는 센서·가전·태그를 스마트폰에서 연결해 상태를 확인하고 자동화를 설정하는 플랫폼.',useFor:'가정의 조명·센서·태그 등 호환 기기를 가족과 함께 관리하고 싶은 경우',check:'기기별 호환성, 계정 공유 권한과 위치·생활 데이터의 개인정보 설정을 확인하세요.',meta:'스마트홈 플랫폼 · 비제휴',url:'https://www.samsung.com/sec/smartthings/'},
{id:'d3',cat:'digital',icon:'📞',vendor:'캐어유',title:'AI 케어콜',desc:'기관이 어르신 안부 확인과 생활 지원 연락을 운영할 때 활용할 수 있는 AI 기반 케어콜 서비스.',useFor:'기관·복지시설에서 정기 안부 확인 업무를 보조하려는 경우',check:'기관용 서비스 범위, 동의 절차, 통화기록·개인정보 처리와 사람의 후속 대응 체계를 확인하세요.',meta:'기관용 안부확인 서비스',url:'https://careyou.org/98'},

{id:'w1',cat:'welfare',icon:'🏥',vendor:'국민건강보험공단',title:'노인장기요양보험',desc:'장기요양 인정신청, 급여·기관·복지용구 정보를 확인할 수 있는 공식 서비스.',useFor:'방문요양·주간보호·복지용구 등 장기요양 서비스를 알아보는 가족',check:'등급과 급여종류, 본인부담률, 이용 가능한 기관·복지용구를 공식 사이트에서 확인하세요.',meta:'공공 제도 안내',url:'https://www.longtermcare.or.kr/'},
{id:'w2',cat:'welfare',icon:'🧭',vendor:'중앙치매센터',title:'치매안심센터·지원정보',desc:'지역 치매안심센터와 치매 관련 공공 지원, 안내 자료를 확인할 수 있는 공식 정보 채널.',useFor:'검사·상담·가족지원·실종예방 등 지역 서비스를 찾는 분',check:'실제 서비스 신청은 거주지 치매안심센터의 대상·운영시간·필요서류를 확인하세요.',meta:'공공 치매지원 정보',url:'https://www.nid.or.kr/'},
{id:'w3',cat:'welfare',icon:'☎️',vendor:'중앙치매센터',title:'치매상담콜센터 1899-9988',desc:'치매 관련 정보와 돌봄·지원 제도 상담을 받을 수 있는 공공 상담 창구.',useFor:'어디에 문의해야 할지 모르거나 치매 관련 지원 경로를 빠르게 찾고 싶은 가족',check:'응급상황은 119 등 긴급 체계를 이용하고, 상담 내용은 의료 진단을 대신하지 않습니다.',meta:'공공 상담 서비스',url:'https://www.nid.or.kr/'}
];
const MARKET_CAT_LABEL=k=>(MARKET_CATS.find(x=>x[0]===k)||['','','기타'])[2];
const marketText=x=>[x.vendor,x.title,x.desc,x.useFor,x.check,x.meta,MARKET_CAT_LABEL(x.cat)].join(' ').toLowerCase();
page.market=()=>{const q=(S.marketSearch||'').trim().toLowerCase();const items=MARKET_ITEMS.filter(x=>(S.marketCategory==='all'||x.cat===S.marketCategory)&&(!q||marketText(x).includes(q)));const selected=MARKET_CATS.find(x=>x[0]===S.marketCategory);return wrap(`<div class="d-flex justify-content-between align-items-start"><div><h1 class="page-title">치매 케어관</h1><p class="page-desc">필요한 분야를 먼저 고르면 관련 업체·제품·서비스를 바로 볼 수 있어요.</p></div><button class="btn-kimse btn-blue-k compact-btn" data-go="partnership">입점/제휴</button></div>${notice('현재 등록 항목은 모두 비제휴 정보입니다.','광고·협찬·판매 제휴가 생기면 해당 카드에 별도로 표시합니다. 낌새가 제품의 치료·예방 효과를 보증하지 않습니다.')}<section class="market-category-section" aria-labelledby="market-category-title"><div class="d-flex justify-content-between align-items-end"><div><h2 id="market-category-title" class="section-title">무엇을 찾으세요?</h2><p class="page-desc">큰 카테고리를 눌러 바로 찾아보세요.</p></div>${S.marketCategory!=='all'?'<button class="btn-kimse btn-secondary-k compact-btn" data-market-cat="all">전체 보기</button>':''}</div><div class="market-category-grid">${MARKET_CATS.filter(x=>x[0]!=='all').map(([k,i,t])=>`<button class="market-category-card ${S.marketCategory===k?'active':''}" data-market-cat="${k}" aria-pressed="${S.marketCategory===k?'true':'false'}"><span class="market-category-icon" aria-hidden="true">${i}</span><strong>${t}</strong><small>${MARKET_ITEMS.filter(x=>x.cat===k).length}개</small></button>`).join('')}</div></section><form id="market-search-form" class="form-stack market-search-box" role="search"><div class="field"><label for="market-search">제품·서비스 검색</label><input id="market-search" value="${(S.marketSearch||'').replace(/"/g,'&quot;')}" placeholder="예: 혈압, 보청기, 방문요양, 위치"></div><div class="d-flex gap-2"><button class="btn-kimse btn-primary-k" type="submit">검색</button>${S.marketSearch?'<button class="btn-kimse btn-secondary-k" type="button" id="market-search-clear">검색어 지우기</button>':''}</div></form><div class="market-results-head"><div><span class="eyebrow">${selected&&selected[0]!=='all'?selected[1]+' '+selected[2]:'전체 업체·제품·서비스'}</span><p class="page-desc"><strong>${items.length}개</strong> 항목</p></div></div><div class="list market-list">${items.length?items.map(x=>`<button class="market-item" data-market-item="${x.id}"><span class="market-item-icon">${x.icon}</span><span><b class="market-vendor">${x.vendor}</b><strong>${x.title}</strong><small>${x.desc}</small><em>비제휴 정보 · ${x.meta}</em></span>${I('chevron-right')}</button>`).join(''):`<div class="empty-state"><h3>조건에 맞는 항목이 없어요</h3><p>검색어를 지우거나 다른 큰 카테고리를 선택해보세요.</p></div>`}</div><section class="partner-cta"><strong>제품·서비스를 제공하는 사업자이신가요?</strong><p>입점, 서비스 제휴, 광고, 공동사업 제안을 한 곳에서 받습니다.</p><button class="btn-kimse btn-secondary-k btn-full" data-go="partnership">입점·제휴 문의</button></section>`,{title:'치매 케어관',narrow:true})};
page['market-detail']=()=>{const x=MARKET_ITEMS.find(i=>i.id===S.marketItem)||MARKET_ITEMS[0],fav=S.marketFavorites.includes(x.id);return wrap(`<div class="eyebrow">${x.icon} ${x.vendor}</div><h1 class="page-title">${x.title}</h1><div class="summary-card"><div class="tag-row"><span class="status-pill">비제휴 정보</span><span class="status-pill neutral">${MARKET_CAT_LABEL(x.cat)}</span></div><p>${x.desc}</p></div><div class="list">${row('업체 / 운영주체','',x.vendor)}${row('카테고리','',MARKET_CAT_LABEL(x.cat))}${row('핵심 용도',x.useFor,'')}${row('선택 시 확인',x.check,'')}</div><div class="hero-actions"><a class="btn-kimse btn-primary-k" href="${x.url}" target="_blank" rel="noopener">공식 페이지 보기 ${I('external-link')}</a><button class="btn-kimse ${fav?'btn-secondary-k':'btn-blue-k'}" data-market-fav="${x.id}">${fav?'관심 저장됨 ✓':'관심 품목 저장'}</button><button class="btn-kimse btn-secondary-k" data-go="partnership">이 분야 입점·제휴 제안</button></div>`,{title:'케어관 상세',narrow:true})};
page.partnership=()=>wrap(`<h1 class="page-title">입점·제휴 문의</h1><p class="page-desc">상품 입점, 돌봄 서비스, 광고, 공동사업 제안을 구분해 접수합니다.</p><div class="form-stack"><div class="field"><label for="partner-type">문의 유형</label><select id="partner-type"><option value="PRODUCT">상품 입점</option><option value="SERVICE">서비스 제휴</option><option value="AD">광고/콘텐츠 제휴</option><option value="COOPERATION">공동사업/기관 협력</option></select></div><div class="field"><label for="partner-company">회사/기관명</label><input id="partner-company" placeholder="회사 또는 기관명"></div><div class="field"><label for="partner-name">담당자명</label><input id="partner-name" placeholder="담당자 이름"></div><div class="field"><label for="partner-email">이메일</label><input id="partner-email" type="email" placeholder="partner@example.com"></div><div class="field"><label for="partner-phone">연락처</label><input id="partner-phone" inputmode="tel" placeholder="선택 입력"></div><div class="field"><label for="partner-web">회사/서비스 URL</label><input id="partner-web" inputmode="url" placeholder="https://"></div><div class="field"><label for="partner-category">카테고리</label><select id="partner-category">${MARKET_CATS.filter(x=>x[0]!=='all').map(x=>`<option value="${x[2]}">${x[2]}</option>`).join('')}</select></div><div class="field"><label for="partner-message">제안 내용</label><textarea id="partner-message" rows="6" placeholder="제품/서비스, 대상 사용자, 제공 지역, 인증·허가 여부, 제휴 방식 등을 적어주세요."></textarea></div><label class="consent-row"><input id="partner-consent" type="checkbox"> <span>문의 처리를 위한 담당자 연락정보 저장에 동의합니다.</span></label><button id="partner-submit" class="btn-kimse btn-primary-k">문의 접수</button></div>${notice('입점은 검토 후 결정됩니다.','접수된 제안은 표시 기준, 의료·광고 표현, 개인정보 처리 여부 등을 확인한 뒤 입력하신 연락처로 안내합니다.')}`,{title:'입점·제휴 문의',narrow:true});
page.plan=()=>wrap(`<h1 class="page-title">구독 관리</h1><div class="summary-card"><h3>현재 이용 범위</h3>${row('비상상태 알림 수신자','첫 1인','무료')}${row('추가 수신자','2인째부터','구독 대상')}</div>${notice('가족 연결은 무료입니다.','가족·보호자 역할을 연결하는 것과 비상상태 알림 수신자를 추가하는 것은 별도입니다.')}`,{title:'구독 관리',narrow:true});
page.accessibility=()=>{let R=[['largeText','글자 크게 보기'],['highContrast','고대비 모드'],['voiceGuidance','음성 안내 (화면·버튼·완료)'],['soundEffects','효과음 (선택·완료·경고)'],['captions','자막 / 텍스트 대체'],['largeTouchTargets','큰 터치 영역'],['colorIcons','색상 + 아이콘 병행'],['screenReader','화면 읽기 지원'],['reduceMotion','동작 최소화']];return wrap(`<h1 class="page-title">접근성 설정</h1><p class="page-desc">고령층·저시력/시각장애·청각장애·색각 이상·운동장애를 기본 범위로 지원합니다.</p><div class="summary-card">${R.map(([k,t])=>`<div class="switch-row"><label for="a-${k}">${t}</label><input id="a-${k}" class="switch" type="checkbox" data-a11y="${k}" ${S.a11y[k]?'checked':''}></div>`).join('')}</div>${notice('시청각 동시중복장애','촉각/모스 인터페이스는 후속 단계로 분리했습니다.')}`,{title:'접근성 설정',narrow:true})};
page['admin-partners']=()=>{const token=sessionStorage.getItem('kimse.admin.token')||'';return wrap(`<h1 class="page-title">제휴 문의 관리자</h1><p class="page-desc">입점·제휴 문의를 확인하고 처리 상태를 관리합니다.</p>${token?`<div class="d-flex justify-content-between align-items-center mb-3"><span class="context-chip">운영자 인증됨</span><button class="btn-kimse btn-secondary-k compact-btn" id="admin-logout">로그아웃</button></div><div id="admin-inquiry-list" class="list"><div class="empty-state"><h3>문의 목록을 불러오는 중…</h3></div></div>`:`<div class="summary-card"><div class="field"><label for="admin-token">운영자 접근 코드</label><input id="admin-token" type="password" autocomplete="current-password" placeholder="운영자 접근 코드"></div><button id="admin-login" class="btn-kimse btn-primary-k btn-full mt-3">문의함 열기</button></div>`}`,{title:'제휴 문의 관리자',narrow:true})};
async function loadAdminInquiries(){
  const token=sessionStorage.getItem('kimse.admin.token');
  if(!token)return;
  const box=$('#admin-inquiry-list');
  if(!box)return;
  try{
    const r=await fetch(API+'/api/v1/admin/partner-inquiries?limit=100',{headers:{'X-KIMSE-ADMIN-TOKEN':token}});
    if(r.status===401||r.status===403){
      sessionStorage.removeItem('kimse.admin.token');
      feedback('운영자 접근 코드를 다시 확인해주세요.','warning');
      render();
      return;
    }
    if(!r.ok)throw new Error('HTTP '+r.status);
    const rows=await r.json();
    box.innerHTML=rows.length?rows.map(x=>{const u=safeUrl(x.website_url);return `<article class="admin-inquiry"><div class="d-flex justify-content-between gap-2"><div><b>${esc(x.company_name)}</b><small>${esc(PARTNER_TYPE_LABEL[x.inquiry_type]||x.inquiry_type)} · ${esc(x.category)}</small><small>접수일 ${esc(fmtDate(x.created_at))}</small></div><span class="status-pill neutral">${esc(PARTNER_STATUS_LABEL[x.status]||x.status)}</span></div><p>${esc(x.message)}</p><dl><div><dt>담당자</dt><dd>${esc(x.contact_name)}</dd></div><div><dt>이메일</dt><dd><a href="mailto:${encodeURIComponent(x.email)}">${esc(x.email)}</a></dd></div>${x.phone?`<div><dt>연락처</dt><dd><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a></dd></div>`:''}${u?`<div><dt>URL</dt><dd><a href="${esc(u)}" target="_blank" rel="noopener">공식 페이지</a></dd></div>`:''}</dl><div class="admin-status-actions">${[['RECEIVED','신규'],['REVIEWING','검토중'],['CONTACTED','회신완료'],['HOLD','보류'],['CLOSED','종료']].map(([v,t])=>`<button class="filter-chip ${x.status===v?'active':''}" data-admin-status="${v}" data-inquiry-id="${esc(x.id)}">${t}</button>`).join('')}</div></article>`}).join(''):'<div class="empty-state"><h3>접수된 문의가 없어요</h3></div>';
  }catch(err){
    box.innerHTML='<div class="notice danger"><strong>문의함을 불러오지 못했습니다.</strong>잠시 뒤 다시 시도해주세요.</div>';
  }
}
page.settings=()=>{if(!demo())return accountRequired();return wrap(`<h1 class="page-title">설정</h1><div class="summary-card"><h3>${S.account.name}</h3><p>${S.account.email}</p></div><div class="list"><a class="list-row" href="#/account">내 프로필 / 역할 관리 ${I('chevron-right')}</a><a class="list-row" href="#/family">가족 / 보호자 관리 ${I('chevron-right')}</a><a class="list-row" href="#/accessibility">접근성 설정 ${I('chevron-right')}</a><a class="list-row" href="#/brain-map">뇌 기능 연관 지도 ${I('chevron-right')}</a><a class="list-row" href="#/brain-trends">기능 변화 일·주·월 그래프 ${I('chevron-right')}</a><a class="list-row" href="#/monitoring-status">개인 변화 관찰 상태 ${I('chevron-right')}</a><a class="list-row" href="#/consent">데이터 수집 / 공유 동의 ${I('chevron-right')}</a><div class="list-row"><span><strong>언어</strong><small>LocalizeHub · 브라우저 언어 자동 감지 / 직접 선택</small></span><localize-switcher project="p45" type="compact" flags="true" label-mode="native" size="sm"></localize-switcher></div><a class="list-row" href="#/plan">구독 관리 ${I('chevron-right')}</a><a class="list-row" href="#/market">치매 케어관 ${I('chevron-right')}</a><a class="list-row" href="#/partnership">사업자 입점 / 제휴 문의 ${I('chevron-right')}</a><a class="list-row" href="${evidenceUrl()}" target="_blank">연구 근거 / Evidence ${I('external-link')}</a></div>`,{title:'설정',narrow:true})};
function applyA11y(){document.documentElement.classList.toggle('large-text',S.a11y.largeText);document.documentElement.classList.toggle('large-touch',S.a11y.largeTouchTargets);document.documentElement.classList.toggle('high-contrast',S.a11y.highContrast)}
function render(){applyA11y();let r=route(),f=page[r]||page.start;document.documentElement.classList.toggle('demo-capture-mode',r==='demo-capture');A.innerHTML=f();setTimeout(()=>$('#main')?.focus({preventScroll:true}),0);if(r==='admin-partners'&&sessionStorage.getItem('kimse.admin.token'))setTimeout(loadAdminInquiries,20);document.title='낌새 · '+r;if(r!==lastSpokenRoute){lastSpokenRoute=r;setTimeout(()=>{if(Date.now()-lastFeedbackAt<1200)return;const h=$('#main h1')?.innerText||$('.app-header strong')?.innerText||'낌새';if(S.a11y.voiceGuidance)say(h+' 화면입니다.')},160)}}
document.addEventListener('click',e=>{let t=e.target.closest('[data-go],[data-back],[data-role],[data-mode],[data-add-role],[data-answer],[data-med],[data-med-id],[data-mood],[data-training],[data-training-answer],[data-training-reset],[data-health],[data-market-cat],[data-market-item],[data-market-fav],[data-initial-next],[data-initial-answer],[data-brain-view],[data-brain-range],[data-voice-task]');if(!t)return;if(t.dataset.go){tone('tap');go(t.dataset.go)}if(t.hasAttribute('data-initial-next')){S.initial.step=Math.min(5,(Number(S.initial.step)||0)+1);S.initial._stepStartedAt=Date.now();save();feedback('다음 항목으로 이동합니다.');render()}if(t.dataset.initialAnswer){const [k,v]=t.dataset.initialAnswer.split(':');const rt=Math.max(100,Date.now()-(Number(S.initial._stepStartedAt)||Date.now()));S.initial.responseTimes.push(rt);S.initial.answers[k]=v;S.initial.step=Math.min(5,(Number(S.initial.step)||0)+1);S.initial._stepStartedAt=Date.now();save();feedback('선택했습니다.');render()}if(t.dataset.brainView){S.brainView=t.dataset.brainView;save();render()}if(t.dataset.brainRange){S.brainRange=t.dataset.brainRange;save();render()}if(t.dataset.voiceTask!==undefined){const i=Number(t.dataset.voiceTask);if(voiceRecorder&&voiceTask===i)stopVoiceRecording();else startVoiceRecording(i)}if(t.hasAttribute('data-back')){tone('tap');history.length>1?history.back():go('start')}if(t.dataset.role){tone('tap');S.intent=t.dataset.role;S.self=['self','both'].includes(S.intent);S.care=['care','both'].includes(S.intent);save();go('auth')}if(t.dataset.mode){tone('tap');S.mode=t.dataset.mode;save();go(S.mode==='care'?'caregiver-home':'home')}if(t.dataset.addRole){tone('tap');S[t.dataset.addRole]=true;S.mode=t.dataset.addRole==='care'?'care':'self';save();go(S.mode==='care'?'caregiver-home':'home')}if(t.dataset.answer!==undefined){S.answers[S.q]=+t.dataset.answer;save();feedback('선택했습니다.');render()}if(t.hasAttribute('data-med')){S.med=!S.med;save();feedback(S.med?'복용 완료로 기록했습니다.':'복용 기록을 취소했습니다.',S.med?'success':'tap');render()}if(t.dataset.medId){const m=S.medicines.find(x=>x.id===t.dataset.medId);if(m){m.taken=!m.taken;save();feedback(m.name+(m.taken?' 복용 완료로 기록했습니다.':' 복용 기록을 취소했습니다.'),m.taken?'success':'tap');render()}}if(t.dataset.mood){S.mood=t.dataset.mood;save();feedback('오늘의 기분을 '+S.mood+'로 기록했습니다.','success');render()}if(t.dataset.training){tone('tap');S.selectedTraining=t.dataset.training;S.trainingResult=null;save();go('training-play')}if(t.dataset.trainingAnswer!==undefined){const x=TRAINING[S.selectedTraining]||TRAINING.memory;const correct=+t.dataset.trainingAnswer===x.correct;S.trainingResult={type:S.selectedTraining,correct};save();feedback(correct?'정답입니다. 잘했어요.':'괜찮아요. 해설을 확인해보세요.',correct?'success':'warning');render()}if(t.hasAttribute('data-training-reset')){S.trainingResult=null;save();feedback('훈련을 다시 시작합니다.');render()}if(t.dataset.health){tone('tap');S.selectedHealth=t.dataset.health;save();go('health-detail')}if(t.dataset.marketCat){S.marketCategory=t.dataset.marketCat;save();feedback('케어관 카테고리를 변경했습니다.');render()}if(t.dataset.marketItem){tone('tap');S.marketItem=t.dataset.marketItem;save();go('market-detail')}if(t.dataset.marketFav){const id=t.dataset.marketFav,i=S.marketFavorites.indexOf(id);if(i>=0)S.marketFavorites.splice(i,1);else S.marketFavorites.push(id);save();feedback(i>=0?'관심 품목에서 해제했습니다.':'관심 품목에 저장했습니다.','success');render()}});
document.addEventListener('click',e=>{
  if(e.target.id==='save-recall'){
    const v=$('#recall-input')?.value.trim()||'';if(!v){feedback('기억나는 단어를 적어주세요. 없으면 “없음”이라고 적어도 됩니다.','warning');return}
    S.initial.recall=v;S.initial.step=5;save();feedback('기본 테스트를 저장했습니다.','success');go('voice-check');return;
  }
  if(e.target.id==='finish-voice'||e.target.id==='skip-voice'){
    if(e.target.id==='skip-voice'){S.initial.voiceSkipped=true}
    S.initial.domains=initialScores();S.initial.completedAt=new Date().toISOString();S.onboarding.initialDone=true;addBrainSnapshot('initial');save();feedback('첫 상태 참고 결과를 만들었습니다.','success');go('initial-result');return;
  }
});
document.addEventListener('submit',async e=>{
  if(e.target.id==='profile-form'){
    e.preventDefault();
    const birth=$('#profile-birth')?.value.trim()||'',sex=$('#profile-sex')?.value||'',education=$('#profile-education')?.value||'',living=$('#profile-living')?.value||'',sleep=$('#profile-sleep')?.value.trim()||'',activity=$('#profile-activity')?.value||'',hearing=$('#profile-hearing')?.value||'';
    const year=Number(birth),thisYear=new Date().getFullYear();
    if(!year||year<thisYear-120||year>thisYear-18||!sex||!education||!living||!sleep||!activity||!hearing){feedback('기본정보 항목을 모두 확인해주세요.','warning');return}
    S.profile={...S.profile,birthYear:birth,sex,education,living,sleepHours:sleep,activity,hearing};S.onboarding.profileDone=true;S.initial.step=0;save();feedback('기본정보를 저장했습니다.','success');go('initial-check');return;
  }
  if(e.target.id==='consent-form'){
    e.preventDefault();
    const required=['service','privacy','health'];for(const k of required)S.consents[k]=!!$('#consent-'+k)?.checked;
    if(required.some(k=>!S.consents[k])){feedback('필수 동의 3가지를 확인해주세요.','warning');return}
    S.consents.microphone=!!$('#consent-microphone')?.checked;S.consents.location=!!$('#consent-location')?.checked;S.consents.motion=!!$('#consent-motion')?.checked;S.consents.usage=!!$('#consent-usage')?.checked;S.consents.notifications=!!$('#consent-notifications')?.checked;S.consents.caregiverShare=!!$('#consent-caregiver')?.checked;
    S.onboarding.consentDone=true;S.onboarding.completed=true;if(!S.baseline.startedAt)S.baseline.startedAt=new Date().toISOString();save();
    if(demoAutoRunning){go('baseline');return}
    feedback('동의를 저장하고 나의 평소 만들기를 시작합니다.','success');await requestSelectedPermissions();await startRemoteMonitoring();queueInitialSignals();startPassiveCollectors();flushSignals();save();go('baseline');return;
  }
});
document.addEventListener('pointerdown',()=>{ensureAudio()},{capture:true,passive:true});
document.addEventListener('touchend',()=>{ensureAudio()},{capture:true,passive:true});
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#/"]');if(a)tone('tap')});
document.addEventListener('change',e=>{if(e.target.dataset.a11y){S.a11y[e.target.dataset.a11y]=e.target.checked;save();render();feedback(e.target.closest('.switch-row').innerText+(e.target.checked?' 켰습니다':' 껐습니다'),e.target.checked?'success':'tap')}});
document.addEventListener('click',e=>{if(e.target.id==='signup'){const name=$('#name').value.trim(),email=$('#email').value.trim();if(!name||!email){feedback('이름과 이메일을 입력해주세요.','warning');return}S.account={name,email};S.version=STATE_VERSION;S.mode=S.intent==='care'?'care':'self';save();tone('success');go(S.mode==='care'&&!S.self?'caregiver-home':'onboarding-profile')}if(e.target.id==='begin'){tone('tap');S.q=0;S.answers=[];save();go('assessment')}if(e.target.id==='next'){if(S.answers[S.q]===undefined)return;if(S.q>=Q.length-1){feedback('결과를 확인합니다.');go('result')}else{S.q++;save();feedback((S.q+1)+'번째 문항입니다.');render()}}if(e.target.id==='save-family'){const name=$('#family-name').value.trim(),relation=$('#family-relation').value.trim();if(!name){feedback('이름을 입력해주세요.','warning');return}S.caregivers.push({name,relation:relation||'가족'});save();feedback('보호자 연결 정보를 저장했습니다.','success');go('family')}if(e.target.id==='save-alert'){const name=$('#alert-name').value.trim(),relation=$('#alert-relation').value.trim(),phone=$('#alert-phone').value.trim();if(!name||!phone){feedback('이름과 연락처를 입력해주세요.','warning');return}if(S.alertRecipients.length>=1&&S.plan!=='PREMIUM'){feedback('비상알림 수신자 2인째부터 구독이 필요합니다.','warning');go('plan')}else{S.alertRecipients.push({name,relation:relation||'가족',phone});save();feedback('비상알림 수신자를 저장했습니다.','success');go('emergency')}}if(e.target.id==='save-med'){const name=$('#med-name').value.trim(),time=$('#med-time').value||'08:00',note=$('#med-note').value.trim();if(!name){feedback('약 이름을 입력해주세요.','warning');return}S.medicines.push({id:'m'+Date.now(),name,time,note,taken:false});save();feedback('약을 등록했습니다.','success');go('medication')}if(e.target.id==='save-health'){const k=S.selectedHealth in HEALTH_META?S.selectedHealth:'sleep',v=$('#health-value').value.trim();if(!v){feedback('기록할 값을 입력해주세요.','warning');return}S.health[k]=v;S.health.memo=$('#health-memo').value.trim();save();if(k==='sleep'){const n=parseSleepMinutes(v);if(n)queueSignal('sleep_minutes',n,'min','manual-health')}if(k==='steps'){const n=parseSteps(v);if(n)queueSignal('steps',n,'count','manual-health')}flushSignals();feedback(HEALTH_META[k][1]+' 기록을 저장했습니다.','success');go('health')}if(e.target.id==='add-schedule'){const title=$('#schedule-title').value.trim(),date=$('#schedule-date').value.trim();if(!title||!date){feedback('일정과 날짜/시간을 입력해주세요.','warning');return}S.schedule.push({id:'s'+Date.now(),title,date});save();feedback('가족 일정을 추가했습니다.','success');render()}});
document.addEventListener('submit',e=>{if(e.target.id==='market-search-form'){e.preventDefault();S.marketSearch=$('#market-search')?.value.trim()||'';save();feedback(S.marketSearch?'검색 결과를 보여드립니다.':'전체 항목을 보여드립니다.');render()}});
document.addEventListener('click',e=>{if(e.target.id==='market-search-clear'){S.marketSearch='';save();feedback('검색어를 지웠습니다.');render()}});
document.addEventListener('click',e=>{if(e.target.id==='demo-preview'){playDemoTimeline()}if(e.target.id==='demo-record'){startDemoCapture()}if(e.target.id==='demo-stop'){stopDemoRecording()}if(e.target.id==='demo-window'){const u=location.origin+location.pathname+'?capture=1#/demo-capture';window.open(u,'kimseDemoCapture','popup=yes,width=450,height=800,resizable=yes,scrollbars=no')}});
document.addEventListener('click',async e=>{if(e.target.id==='sync-monitoring'){e.target.disabled=true;e.target.textContent='동기화 중…';const ok=await syncMonitoring();feedback(ok?'최신 관찰 상태를 불러왔습니다.':'동기화를 완료하지 못했습니다.',ok?'success':'warning');render()}});
document.addEventListener('click',async e=>{if(e.target.id==='admin-login'){const token=$('#admin-token').value.trim();if(!token){feedback('운영자 접근 코드를 입력해주세요.','warning');return}e.target.disabled=true;e.target.textContent='확인 중…';try{const r=await fetch(API+'/api/v1/admin/partner-inquiries?limit=1',{headers:{'X-KIMSE-ADMIN-TOKEN':token}});if(r.status===401||r.status===403){feedback('운영자 접근 코드를 다시 확인해주세요.','warning');return}if(!r.ok)throw new Error('HTTP '+r.status);sessionStorage.setItem('kimse.admin.token',token);feedback('운영자 인증이 확인되었습니다.','success');render()}catch{feedback('운영자 문의함에 연결하지 못했습니다. 잠시 뒤 다시 시도해주세요.','warning')}finally{if(e.target?.isConnected){e.target.disabled=false;e.target.textContent='문의함 열기'}}return}if(e.target.id==='admin-logout'){sessionStorage.removeItem('kimse.admin.token');feedback('운영자 문의함에서 로그아웃했습니다.');render();return}const statusBtn=e.target.closest('[data-admin-status]');if(statusBtn){const token=sessionStorage.getItem('kimse.admin.token');if(!token)return;statusBtn.disabled=true;try{const r=await fetch(API+'/api/v1/admin/partner-inquiries/'+encodeURIComponent(statusBtn.dataset.inquiryId)+'/status',{method:'POST',headers:{'Content-Type':'application/json','X-KIMSE-ADMIN-TOKEN':token},body:JSON.stringify({status:statusBtn.dataset.adminStatus})});if(!r.ok)throw new Error('HTTP '+r.status);feedback('문의 상태를 변경했습니다.','success');await loadAdminInquiries()}catch{feedback('문의 상태 변경에 실패했습니다.','warning');statusBtn.disabled=false}}});
document.addEventListener('click',async e=>{if(e.target.id!=='partner-submit')return;const company=$('#partner-company').value.trim(),contact=$('#partner-name').value.trim(),email=$('#partner-email').value.trim(),message=$('#partner-message').value.trim();if(!company||!contact||!email||message.length<10||!$('#partner-consent').checked){feedback('회사명, 담당자, 이메일, 10자 이상의 제안 내용과 개인정보 동의를 확인해주세요.','warning');return}e.target.disabled=true;e.target.textContent='접수 중…';try{const r=await fetch(API+'/api/v1/partner-inquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inquiry_type:$('#partner-type').value,company_name:company,contact_name:contact,email,phone:$('#partner-phone').value.trim()||null,website_url:$('#partner-web').value.trim()||null,category:$('#partner-category').value,message})});if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();S.partnerStatus={id:data.id,at:data.created_at,company};save();feedback('입점·제휴 문의가 정상 접수되었습니다.','success');A.innerHTML=wrap(`<h1 class="page-title">문의가 접수됐어요</h1>${notice('접수 완료',company+' 담당자님의 제안을 저장했습니다. 검토 후 입력한 이메일로 연락드릴 수 있습니다.')}<button class="btn-kimse btn-primary-k btn-full" data-go="market">케어관으로 돌아가기</button>`,{title:'문의 접수',narrow:true})}catch(err){feedback('접수에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.','warning');e.target.disabled=false;e.target.textContent='문의 접수'}});

window.addEventListener('hashchange',render);window.addEventListener('online',()=>{O.hidden=true;say('인터넷 연결이 복구되었습니다.');flushSignals();syncMonitoring()});window.addEventListener('offline',()=>{O.hidden=false;say('인터넷 연결이 끊겼습니다.')});O.hidden=navigator.onLine;
document.addEventListener('visibilitychange',()=>{if(document.hidden){recordAppActive();flushSignals()}else{appSessionStarted=Date.now();if(monitoringEnabled())syncMonitoring()}});
window.addEventListener('beforeunload',()=>{recordAppActive()});
async function bootstrap(){await loadEvidenceModel();render();if(monitoringEnabled()){queueInitialSignals();await startRemoteMonitoring();startPassiveCollectors();await syncMonitoring()}if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}))}
bootstrap();
})();