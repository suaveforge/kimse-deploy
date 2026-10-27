(function(){
'use strict';
const API='https://api-kimse.suaveforge.com/api/v1/evidence/voice-analysis/beta';
const byId=id=>document.getElementById(id);
const researchModels=['pitt_basic','pitt_full'];
const state={language:'en',model:'pitt_basic',available:{pitt_basic:false,pitt_full:false},recording:false,busy:false,
  recorder:null,stream:null,blob:null,url:null,clock:null,startedAt:0};
const id=(typeof crypto!=='undefined'&&crypto.randomUUID)?
  crypto.randomUUID().replace(/-/g,''):'cognitive'+String(Date.now())+String(Math.random()).slice(2,12);
const server=byId('task-runtime');
function status(message,error=false){server.textContent=message;server.dataset.state=error?'error':'ok';}
function releaseMic(){if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null;}}
function discard(){
  state.blob=null;
  if(state.url){URL.revokeObjectURL(state.url);state.url=null;}
  byId('record-playback').removeAttribute('src');
  byId('record-playback').hidden=true;
  byId('record-clock').textContent='00:00';
  byId('record-label').textContent='녹음 대기';
  byId('model-result').hidden=true;
  update();
}
function update(){
  const ready=Boolean(state.available[state.model]);
  const legal=byId('stimulus-confirm').checked&&byId('research-consent').checked;
  byId('start-record').disabled=!ready||!legal||state.recording||state.busy;
  byId('stop-record').disabled=!state.recording;
  byId('analyze-model').disabled=!ready||!legal||!state.blob||state.recording||state.busy;
  byId('discard-record').disabled=state.recording||state.busy||!state.blob;
  for(const model of researchModels){
    byId('model-'+model.replace('_','-')).disabled=state.recording||state.busy;
  }
}
function languageTo(value){
  if(state.recording||state.busy)return;
  state.language=value;
  byId('english-panel').hidden=value!=='en';
  byId('korean-panel').hidden=value!=='ko';
  byId('lang-en').setAttribute('aria-selected',String(value==='en'));
  byId('lang-ko').setAttribute('aria-selected',String(value==='ko'));
}
function selectModel(model){
  if(!researchModels.includes(model)||state.recording||state.busy)return;
  state.model=model;
  discard();
  for(const m of researchModels){
    byId('model-'+m.replace('_','-')).setAttribute('aria-pressed',String(model===m));
  }
  status(state.available[model]?
    'Pitt 모델 준비 완료 · 원본 그림을 보고 영어로 설명한 10~30초 음성만 처리합니다.':
    '선택한 Pitt 모델이 서버에 준비되지 않았습니다.',!state.available[model]);
  update();
}
async function checkModels(){
  try{
    const resp=await fetch(API+'/cognitive/models',{cache:'no-store'});
    if(!resp.ok)throw new Error('MODEL_STATUS_HTTP_'+resp.status);
    const data=await resp.json();
    state.available.pitt_basic=Boolean(data.ready&&data.english?.models?.pitt_basic);
    state.available.pitt_full=Boolean(data.ready&&data.english?.models?.pitt_full);
    if(data.korean?.inferenceEnabled===true){
      // Do NOT unlock Korean merely because a server readiness flag changed.
      byId('korean-runtime').textContent='한국어 모델의 각 하위 문항·라벨 매핑을 대조해야 합니다. 지금은 추론을 실행하지 않습니다.';
    }
    selectModel(state.model);
  }catch(error){
    status('검사 서버의 모델 준비 상태를 가져오지 못했습니다. 연결을 확인해 주세요.',true);
    update();
  }
}
function clock(){
  const elapsed=Math.floor((performance.now()-state.startedAt)/1000);
  byId('record-clock').textContent=
    String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
  if(elapsed>=29&&state.recording)stop();
}
async function begin(){
  if(state.recording||state.busy||!state.available[state.model])return;
  if(!byId('research-consent').checked||!byId('stimulus-confirm').checked){
    status('원본 그림 확인과 음성 전송 동의를 먼저 선택해 주세요.',true);return;
  }
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
    status('이 브라우저에서는 마이크 녹음을 사용할 수 없습니다.',true);return;
  }
  discard();
  try{
    state.stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    const recorder=new MediaRecorder(state.stream);
    const parts=[];
    recorder.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
    recorder.onerror=()=>{status('녹음을 저장하지 못했습니다. 다시 시도해 주세요.',true);};
    recorder.onstop=()=>{
      clearInterval(state.clock);state.clock=null;state.recording=false;releaseMic();
      if(parts.length){
        state.blob=new Blob(parts,{type:recorder.mimeType||parts[0]?.type||'audio/webm'});
        state.url=URL.createObjectURL(state.blob);
        const preview=byId('record-playback');
        preview.src=state.url;preview.hidden=false;
        const seconds=Math.round((performance.now()-state.startedAt)/1000);
        status(seconds<10?'음성이 너무 짧습니다. 최소 10초 이상 영어 그림 설명을 녹음해 주세요.':
          '녹음 완료 · 선택한 Pitt 모델로 분석할 수 있습니다.',seconds<10);
        byId('record-label').textContent='녹음 완료 · '+seconds+'초';
      }else status('녹음된 소리가 없습니다. 다시 시도해 주세요.',true);
      update();
    };
    state.recorder=recorder;
    recorder.start(250);
    state.recording=true;
    state.startedAt=performance.now();
    state.clock=setInterval(clock,300);
    byId('record-label').textContent='영어 그림 설명 녹음 중';
    status('그림을 보며 영어로 자유롭게 설명하세요. 10초 이상, 30초 이내 녹음합니다.');
    update();
  }catch(error){releaseMic();state.recording=false;
    status(error?.name==='NotAllowedError'?'마이크 권한이 거부됐습니다. 브라우저에서 마이크를 허용해 주세요.':
      '마이크를 시작할 수 없습니다. 기기 설정을 확인해 주세요.',true);update();
  }
}
function stop(){
  if(!state.recorder||state.recorder.state!=='recording')return;
  try{state.recorder.stop();}catch{releaseMic();state.recording=false;update();}
}
async function pcm16k(blob){
  const Audio=window.AudioContext||window.webkitAudioContext;
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!Audio||!Offline)throw Error('BROWSER_AUDIO_DECODER_UNAVAILABLE');
  const ctx=new Audio();
  try{
    const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());
    if(decoded.duration<10||decoded.duration>30.7)throw Error('PITT_EXCERPT_AUDIO_NEEDS_10_TO_30_SECONDS');
    const offline=new Offline(1,Math.floor(decoded.duration*16000),16000);
    const source=offline.createBufferSource();
    source.buffer=decoded;source.connect(offline.destination);source.start(0);
    const rendered=await offline.startRendering();
    const samples=rendered.getChannelData(0);
    if(samples.length<160000||samples.length>480000)throw Error('PITT_EXCERPT_AUDIO_NEEDS_10_TO_30_SECONDS');
    return samples;
  }finally{await ctx.close().catch(()=>{});}
}
function wavBase64(samples){
  const out=new ArrayBuffer(44+samples.length*2),view=new DataView(out);
  const chars=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i))};
  chars(0,'RIFF');view.setUint32(4,out.byteLength-8,true);
  chars(8,'WAVE');chars(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,16000,true);view.setUint32(28,32000,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);
  chars(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){
    const v=Math.max(-1,Math.min(1,samples[i]));
    view.setInt16(44+i*2,Math.round(v<0?v*32768:v*32767),true);
  }
  const arr=new Uint8Array(out);let encoded='';
  for(let i=0;i<arr.length;i+=8192)encoded+=String.fromCharCode(...arr.subarray(i,i+8192));
  return btoa(encoded);
}
async function analyze(){
  if(state.busy||state.recording||!state.blob||!state.available[state.model])return;
  if(state.language!=='en'||!researchModels.includes(state.model))return;
  if(!byId('research-consent').checked||!byId('stimulus-confirm').checked)return;
  state.busy=true;update();
  byId('model-result').hidden=true;
  status('녹음을 16kHz WAV로 변환하고 있습니다.');
  try{
    const samples=await pcm16k(state.blob);
    const data=wavBase64(samples);
    status('실제 Pitt 동결 모델을 실행하고 있습니다. 음성 특징 추출에 시간이 걸릴 수 있습니다.');
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),170000);
    let resp;
    try{
      resp=await fetch(API+'/cognitive/guest',{
        method:'POST',cache:'no-store',signal:ctrl.signal,
        headers:{'Content-Type':'application/json','X-KIMSE-EVIDENCE-CLIENT':id},
        body:JSON.stringify({
          model:state.model,language:'en',protocol_id:'pitt_cookie_theft_excerpt_30s',
          consent_server_audio_processing:true,pictured_stimulus_viewed:true,
          audio_base64:data
        })
      });
    }finally{clearTimeout(timer);}
    const result=await resp.json().catch(()=>({}));
    if(!resp.ok)throw new Error(String(typeof result.detail==='string'?result.detail:('HTTP_'+resp.status)));
    if(result.model!==state.model||result.protocolId!=='pitt_cookie_theft_excerpt_30s')throw Error('MODEL_RESULT_PROTOCOL_MISMATCH');
    const model=result.modelResult||{};
    let classification,explanation,modelName;
    if(state.model==='pitt_basic'){
      classification=model.researchClassOnly;
      if(!['AD','CN'].includes(classification))throw Error('PITT_OUTPUT_MISSING');
      modelName='Pitt 기본 · 음향 특징 이진 분류';
      explanation=classification==='AD'?
        '영어 음향 특징이 Pitt의 AD(알츠하이머병) 학습 집단으로 분류됐습니다.':
        '영어 음향 특징이 Pitt의 CN(인지 정상) 학습 집단으로 분류됐습니다.';
    }else{
      // The frozen four-stream model has its OWN three-class prediction (0/1/2).
      // Its auxiliary binaryTrainingPattern is a separate scorer, never the
      // primary result of the 3-class model.
      const raw=String(model.rawTrainingClassId??'');
      const groups={'0':'CN','1':'MCI','2':'AD'};
      if(!Object.hasOwn(groups,raw))throw Error('PITT_MULTICLASS_OUTPUT_MISSING');
      classification=groups[raw];
      modelName='Pitt 전체 융합 · 4스트림 3분류';
      const groupLabel={'CN':'CN(인지 정상)','MCI':'MCI(경도인지장애)','AD':'AD(알츠하이머병)'};
      const aux=['CN','AD'].includes(model.binaryTrainingPattern)?
        ' 같은 음성의 별도 이진 분류 보조값: '+model.binaryTrainingPattern+'.':'';
      explanation='전체 융합 모델의 학습 클래스 '+raw+' → '+groupLabel[classification]+' 집단 패턴입니다.'+
        aux+' 모델 훈련 집단 분류이며, 의료진 진단 또는 한국어 임상 검증을 의미하지 않습니다.';
    }
    byId('model-classification').textContent=classification;
    byId('model-explanation').textContent=explanation;
    byId('model-provenance').textContent=modelName+
      ' · '+Number(result.audioSeconds).toFixed(1)+'초 발췌본 · 약 3분 전체 그림 설명 프로토콜 점수로 환산하지 않음';
    byId('model-result').hidden=false;
    status('선택한 Pitt 모델의 실제 추론이 완료됐습니다.');
  }catch(error){
    const mapping={
      PITT_EXCERPT_AUDIO_NEEDS_10_TO_30_SECONDS:'기존 모델 입력 제한은 10~30초입니다. 녹음을 다시 확인해 주세요.',
      PITT_BASIC_MODEL_NOT_READY:'Pitt 기본 모델 서버가 준비되지 않았습니다.',
      PITT_FULL_MODEL_NOT_READY:'Pitt 전체 융합 서버가 준비되지 않았습니다.',
      BETA_HOURLY_QUOTA_REACHED:'연구 모델의 시간당 실행 횟수를 초과했습니다.',
      ORIGINAL_PICTURE_VIEW_CONFIRMATION_REQUIRED:'Cookie Theft 그림 확인이 필요합니다.',
      PITT_REQUIRES_ENGLISH_COOKIE_THEFT_TASK:'영어 Cookie Theft 과제로만 Pitt 분석을 실행할 수 있습니다.'
    };
    status(mapping[error.message]||(error.name==='AbortError'?'모델 응답 시간이 초과됐습니다.':
      '검사 분석을 완료하지 못했습니다. 서버 응답: '+String(error.message).slice(0,90)),true);
  }finally{state.busy=false;update();}
}
byId('lang-en').addEventListener('click',()=>languageTo('en'));
byId('lang-ko').addEventListener('click',()=>languageTo('ko'));
for(const model of researchModels)byId('model-'+model.replace('_','-')).addEventListener('click',()=>selectModel(model));
for(const id of ['research-consent','stimulus-confirm'])byId(id).addEventListener('change',update);
byId('start-record').addEventListener('click',begin);
byId('stop-record').addEventListener('click',stop);
byId('analyze-model').addEventListener('click',analyze);
byId('discard-record').addEventListener('click',discard);
window.addEventListener('pagehide',()=>{if(state.recorder?.state==='recording')state.recorder.stop();releaseMic();if(state.url)URL.revokeObjectURL(state.url);});
update();
void checkModels();
})();