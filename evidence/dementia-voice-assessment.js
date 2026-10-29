(function(){
'use strict';
const API='https://api-kimse.suaveforge.com/api/v1/evidence/voice-analysis/beta';
const byId=id=>document.getElementById(id);
const researchModels=['pitt_basic','pitt_full'];
const senior={ready:false,recording:false,busy:false,recorder:null,stream:null,blob:null,url:null};
const examTasks=Object.freeze([
  {domain:'시간과 장소',question:'오늘 날짜와 지금 계신 곳을 말씀해 주세요.',tip:'기억나는 대로 편하게 이야기하세요.',seconds:25},
  {domain:'말의 유창성',question:'동물 이름을 최대한 많이 말씀해 주세요.',tip:'생각나는 순서대로 계속 말씀하세요.',seconds:30},
  {domain:'일상 이야기',question:'오늘 있었던 일을 들려주세요.',tip:'기억나는 일부터 편하게 말씀하세요.',seconds:30}
]);
const exam={index:0,answers:[],startedAt:0,timer:null,finished:false};
function examClock(seconds){
  const value=Math.max(0,Math.ceil(seconds));
  byId('exam-clock').textContent='00:'+String(value).padStart(2,'0');
}
function examDraw(){
  const task=examTasks[exam.index];
  byId('exam-progress').textContent=String(exam.index+1).padStart(2,'0')+' / 03';
  byId('exam-domain').textContent=task.domain;
  byId('exam-question').textContent=task.question;
  byId('exam-tip').textContent=task.tip;
  if(!senior.recording&&!senior.blob)examClock(task.seconds);
  byId('exam-finished').hidden=!exam.finished;
  const action=byId('senior-main-action');
  if(exam.finished){action.hidden=true;return}
  action.hidden=false;
  action.disabled=senior.busy||(!senior.recording&&(!senior.ready||!byId('senior-consent').checked));
  if(senior.busy){action.textContent='분석 중…';return}
  if(senior.recording){action.textContent='녹음 끝내기';action.disabled=false;return}
  if(senior.blob&&!byId('senior-result').hidden){action.textContent=exam.index===examTasks.length-1?'결과 보기':'다음 질문';return}
  action.textContent=senior.blob?'답변 확인하기':'녹음 시작';
}
function examRecordClock(){
  if(!senior.recording)return;
  const left=examTasks[exam.index].seconds-(performance.now()-exam.startedAt)/1000;
  examClock(left);
  if(left<=0)seniorStop();
}
function examNext(){
  if(senior.recording||senior.busy||byId('senior-result').hidden)return;
  if(exam.index===examTasks.length-1){
    exam.finished=true;
    byId('exam-summary').textContent=exam.answers.map((a,i)=>
      (i+1)+'. '+examTasks[i].domain+' · '+a.text).join('\n');
    examDraw();researchUpdate();binaryUpdate();return;
  }
  exam.index++;
  seniorDiscard();
  byId('senior-result').hidden=true;
  seniorMessage('질문을 듣고 녹음 시작을 누르세요.');
  examDraw();
}


const frozenBinary={
  ready:false,busy:false,
  model:'Mrsmetamorphosis/dementia-wav2vec-scientific-specaugment-V3'
};
function binaryUpdate(){
 const button=byId('binary-run');
 button.disabled=!exam.finished||!frozenBinary.ready||frozenBinary.busy||!senior.blob||
   !byId('senior-consent').checked||!byId('binary-research-opt-in').checked;
 if(!exam.finished)return;
 if(!frozenBinary.ready){
   byId('binary-runtime').textContent='치매/비치매 학습 모델이 사용 준비되지 않았습니다.';
 }else if(!frozenBinary.busy){
   byId('binary-runtime').textContent='공개 가중치 분류 준비됨 · 한국어 진단 검증은 되지 않았습니다.';
 }
}
async function binaryReady(){
 try{
   const response=await fetch(API+'/cognitive/binary-research/status',{cache:'no-store'});
   const data=response.ok?await response.json():{};
   frozenBinary.ready=data.ready===true&&data.model===frozenBinary.model&&
      JSON.stringify(data.trainedClasses)==='["nodementia","dementia"]'&&
      data.koreanValidation===false&&data.medicalDiagnosis===false;
 }catch{frozenBinary.ready=false}
 binaryUpdate();
}
async function binaryAnalyze(){
 if(!frozenBinary.ready||frozenBinary.busy||!exam.finished||!senior.blob||
    !byId('senior-consent').checked||!byId('binary-research-opt-in').checked)return;
 frozenBinary.busy=true;
 byId('binary-result').hidden=true;
 byId('binary-runtime').textContent='실제 학습 가중치로 분류 중입니다.';
 binaryUpdate();
 try{
   const samples=await seniorPcm16k(senior.blob);
   if(samples.length<3*16000)throw Error('3초 이상 녹음이 필요합니다.');
   const encoded=wavBase64(samples);
   const ctrl=new AbortController();
   const timer=setTimeout(()=>ctrl.abort(),165000);
   let response;
   try{
     response=await fetch(API+'/cognitive/binary-research/guest',{
       method:'POST',cache:'no-store',signal:ctrl.signal,
       headers:{'Content-Type':'application/json','X-KIMSE-EVIDENCE-CLIENT':id},
       body:JSON.stringify({language:'ko',audio_base64:encoded,
           consent_server_audio_processing:true,consent_nonclinical_research:true})
     });
   }finally{clearTimeout(timer)}
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error('실제 분류 모델 실행 실패');
   if(data.status!=='classified_research_only'||data.model!==frozenBinary.model||
      !['nodementia','dementia'].includes(data.trainingClass)||
      data.clinicalDecision!==null||data.dementiaDiagnosis!==null||
      data.mciClassification!==null||data.koreanValidation!==false||
      data.originalTrainingTaskVerified!==false||data.audioStored!==false||
      data.scoreMeaning!=='UNCALIBRATED_MODEL_SOFTMAX_NOT_CLINICAL_RISK')throw Error('연구 모델 출력 검증 실패');
   const label=data.trainingClass==='dementia'?'치매 학습 집단':'비치매 학습 집단';
   byId('binary-class').textContent=label+' · 연구 분류';
   byId('binary-result').hidden=false;
   byId('binary-runtime').textContent='실제 공개 학습 모델로 분류했습니다.';
 }catch(error){
   byId('binary-runtime').textContent=error?.name==='AbortError'?'모델 응답시간 초과':
     '연구 분류 실패: '+String(error?.message||'오류').slice(0,70);
   byId('binary-result').hidden=true;
 }finally{frozenBinary.busy=false;binaryUpdate()}
}

let researchReady=false;
async function researchStatus(){
 try{
   const response=await fetch(API+'/cognitive/ko/vgg-research/status',{cache:'no-store'});
   const data=response.ok?await response.json():{};
   researchReady=data.ready===true&&data.model==='AIHub217_official_two_VGG16_candidates'&&
     data.clinicalDecisionAvailable===false&&data.originalTaskVerified===false;
 }catch{researchReady=false}
 researchUpdate();
}
function researchUpdate(){
 byId('exam-run-vgg').disabled=!exam.finished||!senior.blob||senior.busy||
   !researchReady||!byId('exam-research-opt-in').checked||!byId('senior-consent').checked;
 byId('exam-research-status').textContent=researchReady?
   '연구용 한국어 인지 분류 모델 준비됨':'원본 인지 분류 모델을 현재 실행할 수 없습니다.';
}
async function researchAnalyze(){
 if(!exam.finished||!researchReady||!senior.blob||
   !byId('exam-research-opt-in').checked||!byId('senior-consent').checked)return;
 const button=byId('exam-run-vgg');button.disabled=true;
 byId('exam-research-status').textContent='실제 AI-Hub 217 가중치로 분석 중입니다.';
 try{
   const pcm=await seniorPcm16k(senior.blob);
   if(pcm.length<3*16000)throw Error('3초 이상 녹음이 필요합니다.');
   const encoded=wavBase64(pcm);
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),160000);
   let response;
   try{
     response=await fetch(API+'/cognitive/ko/vgg-research/guest',{
       method:'POST',cache:'no-store',signal:ctrl.signal,
       headers:{'Content-Type':'application/json','X-KIMSE-EVIDENCE-CLIENT':id},
       body:JSON.stringify({language:'ko',audio_base64:encoded,
         consent_server_audio_processing:true,consent_nonclinical_research:true})
     });
   }finally{clearTimeout(timer)}
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error('연구 모델 실행 실패');
   if(data.status!=='executed_research_only'||data.originalTaskVerified!==false||
      data.combinedThreeClassDiagnosis!==null||data.riskProbability!==null||
      data.clinicalDecision!==null||data.audioStored!==false)throw Error('검증되지 않은 연구 결과');
   const sci=data.candidateHeads?.SCIvsOTHERS,mci=data.candidateHeads?.MCIvsAD;
   if(sci?.meaning!=='UNVALIDATED_NOT_DISEASE_PROBABILITY'||
      mci?.meaning!=='UNVALIDATED_NOT_DISEASE_PROBABILITY')throw Error('모델 출처 불일치');
   for(const [el,value,label] of [['exam-vgg-sci',sci.rawActivation,'SCI vs OTHERS'],['exam-vgg-mci',mci.rawActivation,'MCI vs AD']]){
      if(!Number.isFinite(value)||value<0||value>1)throw Error('모델 출력 오류');
      byId(el).textContent=label+' · 연구 출력값 '+value.toFixed(4);
   }
   byId('exam-research-result').hidden=false;
   byId('exam-research-status').textContent='원본 한국어 VGG16 분류 가중치 두 개를 실제 실행했습니다.';
 }catch(error){
   byId('exam-research-result').hidden=true;
   byId('exam-research-status').textContent=error?.name==='AbortError'?'연구 모델 응답 시간이 초과됐습니다.':String(error?.message||'실행 오류');
 }finally{researchUpdate()}
}

function examRestart(){
  if(senior.recording||senior.busy)return;
  exam.index=0;exam.answers=[];exam.finished=false;
  byId('binary-research-opt-in').checked=false;
  byId('binary-result').hidden=true;
  byId('exam-research-opt-in').checked=false;
  byId('exam-research-result').hidden=true;
  seniorDiscard();
  byId('exam-finished').hidden=true;
  seniorMessage('준비되면 녹음 시작을 누르세요.');
  examDraw();
}
function examAction(){
  if(exam.finished)return;
  if(senior.recording){seniorStop();return}
  if(senior.busy)return;
  if(senior.blob){if(!byId('senior-result').hidden){examNext();return}return seniorAnalyze()}
  return seniorBegin();
}

const state={language:'ko',model:'pitt_basic',available:{pitt_basic:false,pitt_full:false},recording:false,busy:false,
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
  if(state.recording||state.busy||senior.recording||senior.busy)return;
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

function seniorMessage(message,error=false){
  const node=byId('senior-runtime');node.textContent=message;
  node.dataset.state=error?'error':'ok';
  examDraw();
}
function seniorUpdate(){
  const consent=byId('senior-consent').checked;
  byId('senior-start').disabled=!senior.ready||!consent||senior.recording||senior.busy;
  byId('senior-stop').disabled=!senior.recording;
  byId('senior-analyze').disabled=!senior.ready||!consent||!senior.blob||senior.recording||senior.busy;
  byId('senior-discard').disabled=!senior.blob||senior.recording||senior.busy;
  examDraw();
}
async function seniorReady(){
  try{
    const response=await fetch(API+'/asr/senior/status',{cache:'no-store'});
    if(!response.ok)throw Error('SENIOR_ASR_STATUS_HTTP_'+response.status);
    const data=await response.json();
    senior.ready=data.ready===true&&data.model==='hyyoka/wav2vec2-xlsr-korean-senior'&&
      data.language==='ko'&&data.nonDiagnostic===true&&data.clinicalDecisionAvailable===false;
    seniorMessage(senior.ready?
      '고령자 한국어 음성인식 모델 사용 가능 · 녹음 전송 동의 후 1~30초 한국어를 녹음하세요.':
      '고령자 한국어 모델을 준비 중입니다. 기존 Whisper 전사와 VOICE 3은 위 버튼으로 사용할 수 있습니다.',!senior.ready);
  }catch(error){
    senior.ready=false;
    seniorMessage('고령자 전사 서버 연결을 확인하지 못했습니다. 기존 Whisper 전사와 VOICE 3을 사용해 주세요.',true);
  }finally{seniorUpdate();}
}
function seniorReleaseMic(){
  if(senior.stream){senior.stream.getTracks().forEach(track=>track.stop());senior.stream=null;}
}
function seniorDiscard(){
  senior.blob=null;
  if(senior.url){URL.revokeObjectURL(senior.url);senior.url=null;}
  byId('senior-playback').removeAttribute('src');byId('senior-playback').hidden=true;
  byId('senior-result').hidden=true;
  byId('senior-transcript').textContent='';
  seniorUpdate();
}
async function seniorBegin(){
  if(!senior.ready||!byId('senior-consent').checked||senior.busy||senior.recording)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
    seniorMessage('이 브라우저에서 마이크 녹음을 지원하지 않습니다.',true);return;
  }
  seniorDiscard();
  try{
    senior.stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    const recorder=new MediaRecorder(senior.stream),chunks=[];
    recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)};
    recorder.onerror=()=>seniorMessage('녹음에 실패했습니다.',true);
    recorder.onstop=()=>{
      senior.recording=false;seniorReleaseMic();
      if(exam.timer){clearInterval(exam.timer);exam.timer=null;}
      if(chunks.length){
        senior.blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||'audio/webm'});
        senior.url=URL.createObjectURL(senior.blob);
        byId('senior-playback').src=senior.url;byId('senior-playback').hidden=false;
        seniorMessage('녹음 완료 · 1~30초인 경우 전사할 수 있습니다.');
      }else seniorMessage('녹음 파일이 없습니다.',true);
      seniorUpdate();
    };
    senior.recorder=recorder;recorder.start(250);senior.recording=true;
    exam.startedAt=performance.now();examClock(examTasks[exam.index].seconds);
    if(exam.timer)clearInterval(exam.timer);
    exam.timer=setInterval(examRecordClock,250);
    seniorMessage('한국어로 말씀하세요. 최대 30초까지 녹음합니다.');
    seniorUpdate();
    setTimeout(()=>{if(senior.recorder===recorder&&recorder.state==='recording')seniorStop()},examTasks[exam.index].seconds*1000-500);
  }catch(error){seniorReleaseMic();senior.recording=false;seniorUpdate();
    seniorMessage('마이크 권한 또는 기기 설정을 확인해 주세요.',true);}
}
function seniorStop(){
  if(!senior.recorder||senior.recorder.state!=='recording')return;
  try{senior.recorder.stop()}catch{seniorReleaseMic();senior.recording=false;seniorUpdate();}
}
async function seniorPcm16k(blob){
  const Audio=window.AudioContext||window.webkitAudioContext;
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!Audio||!Offline)throw Error('BROWSER_AUDIO_DECODER_UNAVAILABLE');
  const ctx=new Audio();
  try{
    const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());
    if(decoded.duration<1||decoded.duration>30.5)throw Error('SENIOR_ASR_REQUIRES_1_TO_30_SECONDS');
    const offline=new Offline(1,Math.floor(decoded.duration*16000),16000);
    const source=offline.createBufferSource();source.buffer=decoded;
    source.connect(offline.destination);source.start(0);
    const rendered=await offline.startRendering(),samples=rendered.getChannelData(0);
    if(samples.length<16000||samples.length>480000)throw Error('SENIOR_ASR_REQUIRES_1_TO_30_SECONDS');
    return samples;
  }finally{await ctx.close().catch(()=>{});}
}

// The pretrained Senior checkpoint may emit [PAD] and compatibility Jamo.
// Compose only model-recognized phonemes; do not invent extra words or scores.
function composeSeniorKoreanTranscript(raw){
  const s=String(raw||'').replace(/\[[^\]]+\]/g,'').replace(/[^ ㄱ-ㅣ가-힣]/g,'');
  const leads='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const vowels='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  const tails=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  let out='';
  for(let i=0;i<s.length;){
    const l=leads.indexOf(s[i]),v=vowels.indexOf(s[i+1]||'!');
    if(l<0||v<0){out+=s[i++];continue;}
    i+=2;let tail=0;
    if(i<s.length&&tails.indexOf(s[i])>0&&vowels.indexOf(s[i+1]||'!')<0){
      tail=tails.indexOf(s[i++]);
    }
    out+=String.fromCharCode(0xAC00+(l*21+v)*28+tail);
  }
  return out.trim();
}

async function seniorAnalyze(){
  if(!senior.ready||!senior.blob||!byId('senior-consent').checked||senior.busy)return;
  senior.busy=true;seniorUpdate();byId('senior-result').hidden=true;
  try{
    seniorMessage('녹음을 16kHz WAV로 변환 중입니다.');
    const pcm=await seniorPcm16k(senior.blob),encoded=wavBase64(pcm);
    seniorMessage('고령자 한국어 사전학습 모델로 실제 전사 중입니다.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),115000);
    let response;
    try{
      response=await fetch(API+'/asr/senior/guest',{method:'POST',cache:'no-store',
        signal:controller.signal,
        headers:{'Content-Type':'application/json','X-KIMSE-EVIDENCE-CLIENT':id},
        body:JSON.stringify({language:'ko',consent_server_audio_processing:true,audio_base64:encoded})});
    }finally{clearTimeout(timer);}
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(typeof data.detail==='string'?data.detail:'SENIOR_ASR_HTTP_'+response.status);
    if(data.status!=='transcribed'||data.nonDiagnostic!==true||
       data.clinicalDecision!==null||data.dementiaClassification!==null||
       data.model!=='hyyoka/wav2vec2-xlsr-korean-senior')throw Error('SENIOR_ASR_RESULT_UNVERIFIED');
    byId('senior-transcript').textContent=composeSeniorKoreanTranscript(data.text)||'(인식된 단어 없음)';
    byId('senior-result').hidden=false;
    const transcript=byId('senior-transcript').textContent;
    const words=transcript.trim().split(/\s+/).filter(Boolean);
    byId('exam-measure').textContent='발화 단어 약 '+words.length+'개 · 자동 전사 결과';
    exam.answers[exam.index]={text:transcript,words:words.length};
    seniorMessage('확인했으면 다음 질문으로 넘어가세요.');
  }catch(error){
    const reason=error?.name==='AbortError'?'서버 응답시간 초과':
      error?.message==='SENIOR_ASR_REQUIRES_1_TO_30_SECONDS'?'녹음은 1~30초여야 합니다.':
      '한국어 전사를 완료하지 못했습니다: '+String(error?.message||'오류').slice(0,80);
    seniorMessage(reason,true);
  }finally{senior.busy=false;seniorUpdate();}
}
byId('senior-consent').addEventListener('change',seniorUpdate);
byId('senior-main-action').addEventListener('click',examAction);
byId('exam-restart').addEventListener('click',examRestart);
byId('exam-research-opt-in').addEventListener('change',researchUpdate);
byId('exam-run-vgg').addEventListener('click',researchAnalyze);
byId('binary-research-opt-in').addEventListener('change',binaryUpdate);
byId('binary-run').addEventListener('click',binaryAnalyze);
byId('senior-start').addEventListener('click',seniorBegin);
byId('senior-stop').addEventListener('click',seniorStop);
byId('senior-analyze').addEventListener('click',seniorAnalyze);
byId('senior-discard').addEventListener('click',seniorDiscard);

byId('lang-en').addEventListener('click',()=>languageTo('en'));
byId('lang-ko').addEventListener('click',()=>languageTo('ko'));
for(const model of researchModels)byId('model-'+model.replace('_','-')).addEventListener('click',()=>selectModel(model));
for(const id of ['research-consent','stimulus-confirm'])byId(id).addEventListener('change',update);
byId('start-record').addEventListener('click',begin);
byId('stop-record').addEventListener('click',stop);
byId('analyze-model').addEventListener('click',analyze);
byId('discard-record').addEventListener('click',discard);
window.addEventListener('pagehide',()=>{if(state.recorder?.state==='recording')state.recorder.stop();releaseMic();if(state.url)URL.revokeObjectURL(state.url);if(senior.recorder?.state==='recording')senior.recorder.stop();seniorReleaseMic();if(senior.url)URL.revokeObjectURL(senior.url);});
update();
examDraw();
void checkModels();
void seniorReady();
void researchStatus();
void binaryReady();
})();