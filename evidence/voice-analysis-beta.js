// KIMSE Evidence: minimal, sequential recording UI. Measurements remain distinct.
const el=id=>document.getElementById(id);
const API='https://api-kimse.suaveforge.com/api/v1/evidence/voice-analysis/beta';
const tasks=['read','response','vowel'];
const stageNames=['문장 읽기','질문 듣고 답하기','모음 발성'];
const prompts={
  read:'오늘은 날씨가 맑아서 집 근처 공원을 천천히 걸었습니다.',
  response:'어제 하루 동안 기억에 남는 일은 무엇이었나요?',
  vowel:"'아' 소리를 4~6초간 일정하게 내주세요."
};
let index=0,stream=null,recorder=null,sound=null,previewUrl=null,recordingStarted=0;
let meterContext=null,analyser=null,meterSource=null,meterFrame=0,clockInterval=0;
let questionEnd=null,questionOffset=null,report=null,completed={};
let assessmentGeneration=0; // Ignore delayed server results after restarting a self-test.
let voiceProgress={status:'idle',research:false,extended:false,completed:0,total:0,phase:null,connected:false};
const voiceCheckpoints=['audio_accepted','webrtc_completed','silero_completed','research_completed','extended_completed','report_completed'];
const voicePhaseMessages={audio_accepted:'음성 형식 확인 및 분석 요청 수락',webrtc_completed:'발화와 침묵의 기본 구간 추출 완료',silero_completed:'비교 음성 구간 분석 완료',research_completed:'Pitt 연구용 음향 패턴 분류 완료',extended_completed:'별도 사전학습 AI 모델 비교 처리 완료',report_completed:'수신한 실제 측정 결과 정리 완료'};
let responsePreRollMs=0,responseSoundHasPreRoll=false;
let busy=false,recordingSession=0,serviceReady=false,researchReady=false;
let extendedReady=false,extendedModelNames=[];
let autoStopTimer=0,activeRecordingTask=null,autoVoiceSeen=false,lastActiveVoiceMs=null,voiceAboveFrames=0;
let vowelOnsetMs=null,vowelLastVoiceMs=null,vowelVoiceFrames=0;
let noiseFloor=.003,autoStopReason=null;
let captureStartConfirmed=false,captureStartWatchdog=0;
// UI capture duration parameters only. These ARE NOT speech-disorder thresholds.
// A fixed 5.5s vowel recording provides >=5s samples as used by tremor research.
// For unstructured answers, a generous silence window protects interior hesitations.
const RECORD_LIMITS={
  read:{minimumMs:3500,silenceAfterMs:2600,maxMs:25000},
  response:{minimumMs:6500,silenceAfterMs:5000,maxMs:29000},
  vowel:{minimumMs:5500,silenceAfterMs:null,maxMs:11000}
};
const RESPONSE_QUESTION='어제 하루 동안 기억에 남는 일은 무엇이었나요?';
// Anonymous per-browser quota scope, not an identity or a login token.
const anonymousClientId=(()=>{
  const fresh=()=>window.crypto?.randomUUID?.().replace(/-/g,'')||
    (Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));
  try{
    const previous=window.sessionStorage?.getItem('kimse.voice.evidence.client')||'';
    if(/^[A-Za-z0-9_-]{16,100}$/.test(previous))return previous;
    const id=fresh();
    window.sessionStorage?.setItem('kimse.voice.evidence.client',id);
    return id;
  }catch{return fresh();}
})();
const number=n=>typeof n==='number'&&Number.isFinite(n);
const currentTask=()=>tasks[index];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let lastAnalysisError=null; // diagnostic codes only; never retains or logs audio, transcript, browser identifiers
const shortReason={
  EVIDENCE_GUEST_DAILY_QUOTA_REACHED:'오늘 이용 가능한 분석 횟수를 초과했습니다. 재분석을 반복해도 바로 풀리지 않습니다.',
  AUDIO_SIZE_INVALID:'녹음 길이 또는 파일 크기가 허용 범위를 초과했습니다.',
  AUDIO_MUST_BE_RIFF_WAV:'서버가 녹음 파일 형식을 읽지 못했습니다.',
  AUDIO_REQUIRES_16K_MONO_PCM16:'서버가 녹음 형식을 지원하지 않습니다.',
  AUDIO_DURATION_MUST_BE_1_TO_30_SECONDS:'녹음은 1~30초까지만 분석할 수 있습니다.',
  AUDIO_WAV_CORRUPTED:'녹음 파일이 손상됐습니다.',
  EVIDENCE_GUEST_QUOTA_UNAVAILABLE:'일시적으로 분석 서버를 사용할 수 없습니다.',
  AUDIO_FORMAT_INVALID:'녹음 파일을 읽을 수 없습니다.',
  AUDIO_BASE64_INVALID:'녹음 파일 변환에 실패했습니다.',
  PCM16_WAV_REQUIRED:'녹음 형식을 처리하지 못했습니다.',
  PCM16_16K_MONO_REQUIRED:'녹음 형식이 올바르지 않습니다.',
  DURATION_1_TO_30_SECONDS_REQUIRED:'녹음은 1~30초만 가능합니다.',
  AZURE_SPEECH_NOT_CONFIGURED:'발음 분석 서버가 준비되지 않았습니다.',
  UNKNOWN_VOICE_TASK:'분석 서버가 아직 새 버전으로 업데이트되지 않았습니다.',
  SERVER_AUDIO_PROCESSING_CONSENT_REQUIRED:'음성 분석 동의가 필요합니다.',
  AZURE_AUDIO_TRANSFER_CONSENT_REQUIRED:'Azure 발음 평가 동의가 필요합니다.',
  VOICE_ANALYSIS_TIMEOUT:'분석 응답 시간이 초과됐습니다. 녹음 파일을 유지했으니 다시 분석해 주세요.',
  Failed_to_fetch:'분석 서버에 연결할 수 없습니다.'
};
function friendlyError(e){
  const raw=String(e?.message||e||'알 수 없는 오류');
  const http=e?.httpStatus;
  if(http===429)return raw==='BETA_HOURLY_QUOTA_REACHED'?
    '베타 분석의 시간당 사용 한도에 도달했습니다. 잠시 뒤 다시 시도하거나 안정판을 이용해 주세요.':
    shortReason.EVIDENCE_GUEST_DAILY_QUOTA_REACHED;
  if(http===413)return '녹음 데이터가 서버 허용 크기를 초과했습니다.';
  if(http===422){
    if(raw.includes('audio_base64')||raw.includes('string_too_long'))
      return '녹음 데이터 크기가 허용 범위를 초과했습니다.';
    if(raw.includes('question_end_to_capture_start_ms'))
      return '응답 시작시간 정보가 잘못됐습니다.';
    return shortReason[raw]||'녹음 요청값을 서버에서 거절했습니다.';
  }
  if(http>=500)return '분석 서버가 요청을 처리하지 못했습니다.';
  if(e?.phase==='decode'){
    if(/질문 이후 답변/.test(raw))return raw;
    if(/1~30초|녹음 파일의 길이/.test(raw))return raw;
    return '이 아이폰에서 녹음 파일 변환에 실패했습니다. 기존 녹음으로 재분석할 수 있습니다.';
  }
  return shortReason[raw]||(/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(raw)?
      '서버 연결에 실패했습니다. 인터넷 연결을 확인하고 다시 시도하세요.':raw);
}
function apiError(response,data){
  const detail=data?.detail;
  let code=typeof detail==='string'?detail:'HTTP_'+response.status;
  if(Array.isArray(detail)){
    // Pydantic error items can echo the entire user audio as .input.
    // Only use field names and error types, never serialize the payload.
    const minimal=detail.slice(0,3).map(d=>
      String(d?.loc?.[d.loc.length-1]||'body')+':'+String(d?.type||'invalid')
    );
    code=minimal.join(',');
  }
  const err=new Error(code);
  err.httpStatus=response.status;
  return err;
}
function errorDiagnostic(err,phase,pcmLength=0){
  return {
    stage:currentTask(),phase:String(phase).slice(0,25),
    httpStatus:Number.isInteger(err?.httpStatus)?err.httpStatus:null,
    errorCode:String(err?.message||'unknown').slice(0,90),
    recordedAudioType:sound?.type||'',
    pcmDurationMs:pcmLength?Math.round(pcmLength/16):null
  };
}
function setStatus(message,mode=''){
  const node=el('quick-status');
  node.textContent=message;node.className=mode;node.setAttribute('aria-busy',busy?'true':'false');
}
function setRecordingState(recording){
  el('meter-wrap').classList.toggle('recording',!!recording);
  el('record-label').textContent=recording?'● 녹음 중':'녹음 대기';
  el('signal-label').textContent=recording?'목소리를 내면 막대가 반응합니다.':'마이크 음량이 표시됩니다.';
}
function drawMeter(){
  const canvas=el('levelCanvas'),ctx=canvas.getContext('2d');
  if(!ctx)return;
  const W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  let rms=0;
  if(analyser){
    const arr=new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(arr);
    let total=0;
    for(let j=0;j<arr.length;j++){const d=(arr[j]-128)/128;total+=d*d;}
    rms=Math.sqrt(total/arr.length);
    watchRecordingActivity(rms);
  }
  const bars=35,gap=5,bw=(W-gap*(bars-1))/bars;
  const t=performance.now()/115;
  for(let i=0;i<bars;i++){
    const middle=1-Math.abs((i-(bars-1)/2)/((bars-1)/2));
    const level=analyser?Math.min(1,rms*5.5):0;
    const h=6+level*(15+middle*55)*(0.63+0.37*Math.abs(Math.sin(t+i*.52)));
    const x=i*(bw+gap);
    ctx.fillStyle=analyser?'#0e8c7c':'#c3ddd4';
    ctx.beginPath();ctx.roundRect?.(x,(H-h)/2,bw,h,bw/2);
    if(ctx.roundRect)ctx.fill();else ctx.fillRect(x,(H-h)/2,bw,h);
  }
  meterFrame=requestAnimationFrame(drawMeter);
}
async function beginMeter(inputStream){
  endMeter();
  const Constructor=window.AudioContext||window.webkitAudioContext;
  if(!Constructor)return;
  try{
    meterContext=new Constructor();
    await meterContext.resume();
    if(!inputStream.active){endMeter();return;}
    analyser=meterContext.createAnalyser();
    analyser.fftSize=1024;
    analyser.smoothingTimeConstant=.62;
    meterSource=meterContext.createMediaStreamSource(inputStream);
    meterSource.connect(analyser); // No connection to speakers: prevents feedback
    drawMeter();
  }catch(e){endMeter();}
}
function endMeter(){
  if(meterFrame)cancelAnimationFrame(meterFrame);
  meterFrame=0;
  meterSource?.disconnect();
  meterSource=null;analyser=null;
  const c=meterContext;meterContext=null;
  if(c)c.close().catch(()=>{});
  const canvas=el('levelCanvas'),ctx=canvas.getContext('2d');
  if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
}
function stopAutoMonitor(){
  if(autoStopTimer)clearTimeout(autoStopTimer);
  autoStopTimer=0;
  autoVoiceSeen=false;lastActiveVoiceMs=null;voiceAboveFrames=0;
  vowelOnsetMs=null;vowelLastVoiceMs=null;vowelVoiceFrames=0;
  activeRecordingTask=null;
}
function requestRecordingStop(reason){
  if(recorder?.state!=='recording')return false;
  autoStopReason=reason;
  el('stop').disabled=true;
  setStatus(reason==='vowel_time'?'연속 발성 녹음 완료 · 분석을 시작합니다.':
    reason==='vowel_timeout'?'녹음 종료 · 유효한 발성 구간을 확인합니다.':
    reason==='silence_after_speech'?'발화 종료 감지 · 분석을 시작합니다.':
    reason==='maximum_duration'?'최대 녹음 시간에 도달했습니다. 분석을 시작합니다.':
    '녹음 종료 · 분석을 시작합니다.');
  recorder.stop();
  return true;
}
function watchRecordingActivity(rms){
  if(!activeRecordingTask||recorder?.state!=='recording')return;
  const task=activeRecordingTask;
  if(task==='vowel'){
    const now=performance.now();
    const threshold=Math.max(.014,Math.min(.07,noiseFloor*3.5));
    if(rms<threshold*.55)noiseFloor=noiseFloor*.99+rms*.01;
    if(rms>threshold){
      vowelVoiceFrames++;
      if(vowelVoiceFrames>=4){
        if(vowelOnsetMs===null)vowelOnsetMs=now;
        vowelLastVoiceMs=now;
      }
    }else{
      vowelVoiceFrames=0;
      if(vowelOnsetMs!==null && vowelLastVoiceMs!==null && now-vowelLastVoiceMs>650){
        vowelOnsetMs=null;vowelLastVoiceMs=null;
      }
    }
    return;
  }
  const now=performance.now();
  const elapsed=now-recordingStarted;
  // Slowly estimate ambient noise only in quiet frames. This detector decides
  // when to stop the UX capture, NOT medically significant pause boundaries.
  const threshold=Math.max(.008,Math.min(.055,noiseFloor*3.2));
  if(rms<threshold*.65)noiseFloor=noiseFloor*.985+rms*.015;
  if(rms>threshold){
    voiceAboveFrames++;
    if(voiceAboveFrames>=4){
      autoVoiceSeen=true;
      lastActiveVoiceMs=now;
    }
  }else voiceAboveFrames=0;
  const conf=RECORD_LIMITS[task];
  if(autoVoiceSeen&&lastActiveVoiceMs!==null&&elapsed>=conf.minimumMs
    &&now-lastActiveVoiceMs>=conf.silenceAfterMs)requestRecordingStop('silence_after_speech');
}
function beginAutoMonitor(task){
  stopAutoMonitor();
  activeRecordingTask=task;
  autoStopReason=null;
  noiseFloor=.003;
  const conf=RECORD_LIMITS[task];
  const start=performance.now();
  // Use a polling timer independent of animation frames: mobile browsers can
  // throttle requestAnimationFrame, especially when audio route changes.
  const tick=()=>{
    if(recorder?.state!=='recording'||activeRecordingTask!==task)return;
    const elapsed=performance.now()-start;
    if(task==='vowel'){
      const voicedMs=vowelOnsetMs===null?0:Math.max(0,performance.now()-vowelOnsetMs);
      el('signal-label').textContent=vowelOnsetMs===null?
        '아— 소리를 내면 발성 길이를 자동으로 확인합니다.':
        '아— 소리를 그대로 유지해 주세요 · '+(Math.max(0,conf.minimumMs-voicedMs)/1000).toFixed(1)+'초';
      if(voicedMs>=conf.minimumMs&&vowelLastVoiceMs!==null&&performance.now()-vowelLastVoiceMs<650){
        requestRecordingStop('vowel_time');return;
      }
    }
    if(elapsed>=conf.maxMs){
      requestRecordingStop(task==='vowel'?'vowel_timeout':'maximum_duration');
      return;
    }
    autoStopTimer=setTimeout(tick,80);
  };
  autoStopTimer=setTimeout(tick,80);
}
function stopClock(){
  if(clockInterval)clearInterval(clockInterval);
  clockInterval=0;
}
function startClock(){
  stopClock();recordingStarted=performance.now();
  clockInterval=setInterval(()=>{
    const secs=Math.floor((performance.now()-recordingStarted)/1000);
    el('elapsed').textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
  },150);
}
function cleanupAudio(){
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=null;
  const p=el('preview');p.pause();p.hidden=true;p.removeAttribute('src');
}
function setAudio(blob){
  sound=blob;cleanupAudio();
  if(blob?.size){
    previewUrl=URL.createObjectURL(blob);
    el('preview').src=previewUrl;el('preview').hidden=false;
  }
}
function closeMicrophone(){
  if(captureStartWatchdog)clearTimeout(captureStartWatchdog);
  captureStartWatchdog=0;
  stopAutoMonitor();
  stream?.getTracks().forEach(track=>track.stop());
  stream=null;endMeter();stopClock();setRecordingState(false);
  el('record').disabled=busy;
  el('stop').disabled=true;
  if(currentTask()==='response')el('stop').hidden=true;
}
function cancelCapture(){
  ++recordingSession;
  if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}
  recorder=null;closeMicrophone();
}
async function checkService(){
  serviceReady=false;
  el('record').disabled=true;
  el('check-connection').hidden=true;
  setStatus('분석 서버 연결 확인 중…');
  try{
    const response=await Promise.race([
      fetch(API+'/status',{cache:'no-store'}),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),8000))
    ]);
    if(!response.ok)throw Error('HTTP '+response.status);
    const status=await response.json();
    if(status.ready!==true||status.evidenceGuestQuickEnabled!==true)throw Error('API_NOT_READY');
    serviceReady=true;
    researchReady=status.researchBinaryAvailable===true;
    setExtendedAvailability(status);
    if(!researchReady && el('pitt-consent').checked){
      el('pitt-consent').checked=false;
      setStatus('연구용 AI 분류를 사용할 수 없어 해당 항목은 미측정으로 진행합니다.','error');
    }
    el('record').disabled=false;
      setStatus('연결 완료 · 동의 후 녹음을 시작해 주세요.','success');
  }catch(e){
    serviceReady=false;researchReady=false;
    setExtendedAvailability({});
    el('record').disabled=true;
    el('check-connection').hidden=false;
    setStatus('베타 분석 서버 준비 중입니다. 현재는 안정판 테스트를 이용해주세요.','error');
  }
}
function renderVoiceProgress(){
  const active=voiceProgress.status!=='idle';
  const visibleSteps=voiceCheckpoints.filter(step=>
    (voiceProgress.research||step!=='research_completed')&&
    (voiceProgress.extended||step!=='extended_completed'));
  const confirmed=voiceProgress.completed, total=voiceProgress.total||visibleSteps.length;
  const pct=voiceProgress.connected&&total>0?Math.floor(confirmed/total*100):null;
  const last=voiceProgress.phase;
  const message=voiceProgress.status==='failed'?'분석을 완료하지 못했습니다. 기존 측정 결과는 유지됩니다.':
    voiceProgress.status==='done'?'서버 분석 완료 · 측정된 결과를 보고서에 반영했습니다.':
    pct===null?'분석 서버가 확인한 처리 단계 대기 중':
    confirmed===0?'분석 요청 처리 중':
    (voicePhaseMessages[last]||'음성 분석 진행 중')+' · 다음 단계 처리 중';
  for(const prefix of ['response','result-response']){
    const card=el(prefix+'-progress');
    if(!card)continue;
    const postCapture=prefix==='result-response'&&el('analysis-view').hidden===false;
    card.hidden=!active||!postCapture;
    if(card.hidden)continue;
    card.setAttribute('data-mode',voiceProgress.status);
    const value=el(prefix+'-progress-value');
    value.textContent=pct===null?'—':pct+'%';
    el(prefix+'-progress-message').textContent=message;
    const bar=el(prefix+'-progress-bar');
    if(pct===null)bar.removeAttribute('aria-valuenow');
    else bar.setAttribute('aria-valuenow',String(pct));
    el(prefix+'-progress-fill').style.width=(pct||0)+'%';
    const ring=el(prefix+'-progress-ring');
    ring.style['--analysis-pct']=(pct||0)+'%';
    el(prefix+'-progress-count').textContent=pct===null?'서버 확인 대기':confirmed+' / '+total+'단계 완료';
    for(let i=0;i<voiceCheckpoints.length;i++){
      const step=voiceCheckpoints[i],node=el(prefix+'-step-'+step);
      if(!node)continue;
      node.hidden=!visibleSteps.includes(step);
      if(node.hidden)continue;
      const seq=visibleSteps.indexOf(step);
      const mode=voiceProgress.status==='done'||seq<confirmed?'done':
        voiceProgress.status==='pending'&&seq===confirmed?'active':'waiting';
      node.setAttribute('data-state',mode);
    }
  }
}
function startVoiceProgress(research,extended=false){
  voiceProgress={status:'pending',research:!!research,extended:!!extended,completed:0,
    total:(research?5:4)+(extended?1:0),phase:null,connected:false};
  renderVoiceProgress();
}
function recordVoiceCheckpoint(event){
  if(voiceProgress.status!=='pending'||!event||!voiceCheckpoints.includes(event.phase))return;
  const n=event.completed,t=event.total,
    expected=(voiceProgress.research?5:4)+(voiceProgress.extended?1:0);
  if(!Number.isInteger(n)||t!==expected||n<1||n>t||n<voiceProgress.completed)return;
  voiceProgress.connected=true;
  voiceProgress.completed=n;voiceProgress.phase=event.phase;
  renderVoiceProgress();
}
function finishVoiceProgress(success){
  voiceProgress.status=success?'done':'failed';
  if(success){
    voiceProgress.connected=true;
    voiceProgress.completed=voiceProgress.total;
    voiceProgress.phase='report_completed';
  }
  renderVoiceProgress();
}
function updateResponseProgress(){renderVoiceProgress();}
function renderTaskCards(){
  const active=currentTask();
  for(let i=0;i<tasks.length;i++){
    const task=tasks[i],card=el('task-card-'+task);
    if(!card)continue;
    const state=i<index?'done':i===index?'current':'upcoming';
    card.setAttribute('data-state',state);
    card.hidden=i!==index;
    if(i===index)card.setAttribute('aria-current','step');
    else card.removeAttribute('aria-current');
    el('task-state-'+task).textContent=state==='done'?'완료':state==='current'?'지금 할 차례':'다음 차례';
  }
  const currentCard=el('task-card-'+active),controls=el('voice-live-controls');
  // Position exactly one microphone panel inside the active card.
  // All task cards remain present in the DOM and in their numbered order.
  if(currentCard?.appendChild&&controls)currentCard.appendChild(controls);
}
function showStage(i){
  cancelCapture();
  index=i;questionEnd=null;questionOffset=null;responsePreRollMs=0;responseSoundHasPreRoll=false;setAudio(null);
  lastAnalysisError=null;el('error-copy').hidden=true;
  const task=currentTask();
  el('self-panel').hidden=false;
  el('result-view').hidden=true;
  el('task').value=task;
  el('progress').textContent=(i+1)+' / 3';
  el('progressFill').style.width=((i+1)/3*100)+'%';
  el('stage-title').textContent=(i+1)+'단계 · '+stageNames[i];
  el('prompt').textContent=task==='response'?'녹음 시작을 누르면 질문이 나타납니다.':prompts[task];
  el('response-question').textContent='녹음을 시작하면 질문이 나타나요';
  renderTaskCards();
  el('signal-label').textContent=task==='vowel'?'아— 소리를 일정하게 유지하면 자동으로 녹음을 마칩니다.':
    task==='response'?'녹음 시작 시 질문이 공개됩니다. 답변을 마치면 자동 종료됩니다.':'문장을 읽고 잠시 멈추면 자동으로 종료됩니다.';
  el('record').hidden=false;
  el('stop').hidden=true;
  el('task-other-actions').hidden=i!==0;
  el('skip-pron').hidden=i!==0;
  el('after-actions').hidden=true;
  el('elapsed').textContent='00:00';
  el('record').textContent=task==='response'?'● 나의 답변 말하기 시작':task==='vowel'?'● 아—— 소리 시작':'● 이 문장 읽기 시작';
  el('record').disabled=!serviceReady;
  busy=false;
  updateResponseProgress();

  setStatus(serviceReady?(task==='response'?'이제 녹음을 시작하면 질문이 공개됩니다. 내 말로 대답하세요.':
    i===0?'아래 문장을 그대로 소리 내어 읽으세요.':'아—— 소리 하나를 길게 내세요.'):'분석 서버 연결을 확인해주세요.');
}
function newAssessment(){
  if(!el('server-consent').checked){
    el('consent-message').textContent='시작하려면 필수 음성 분석 동의를 선택해 주세요.';
    return;
  }
  assessmentGeneration++;
  completed={};report=null;
  voiceProgress={status:'idle',research:false,extended:false,completed:0,total:0,phase:null,connected:false};
  // Consent is collected explicitly once before recording, not reset between tasks.
  el('method-picker').hidden=true;
  showStage(0);
  return checkService();
}
function mergeResult(task,data,audioDurationMs=null){
  if(task==='read')completed.pronunciation=data.pronunciation;
  if(task==='response'){
    completed.responseDelay=data.responseDelay;
    completed.responseDelayComparison=data.responseDelayComparison||null;
    completed.researchBinary=data.researchBinary||{status:'not_requested'};
    completed.researchComparisons=data.researchComparisons||{status:'not_requested',models:{}};
  }
  if(task==='vowel')completed.vocalTremor=data.vocalTremor;
  if(number(audioDurationMs)&&audioDurationMs>0)completed[task+'AudioDurationMs']=audioDurationMs;
  completed[task+'Quality']={serverStatus:data?.status||'ok',at:new Date().toISOString()};
}
function escapeText(value){
  return String(value??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
function fmtSeconds(ms){
  return (ms/1000).toFixed(1)+'초';
}
function pct(n,total){
  if(!number(n)||!number(total)||total<=0)return 0;
  return Math.max(0,Math.min(100,n/total*100));
}
function axis(totalMs,description){
  return '<div class="time-axis" aria-label="'+escapeText(description)+'">'+
    '<span>0%</span><span>50%</span><span>100% · '+fmtSeconds(totalMs)+'</span></div>';
}
function noChart(id,reason){
  el(id).innerHTML='<div class="viz-empty">'+escapeText(reason)+'</div>';
}
function renderPronunciation(p){
  const words=(Array.isArray(p.words)?p.words:[]).slice(0,80)
    .map(x=>({
      word:String(x?.word||'').slice(0,32),start:Number(x?.startMs),
      duration:Number(x?.durationMs),accuracy:x?.accuracy
    }))
    .filter(x=>x.word&&number(x.start)&&x.start>=0&&number(x.duration)&&x.duration>0);
  if(p.status!=='assessed'||!words.length){
    noChart('viz-pron','단어별 위치 데이터가 없어 시간축을 표시하지 않습니다.');
    return;
  }
  const maxWordEnd=Math.max(...words.map(w=>w.start+w.duration));
  const duration=Math.max(maxWordEnd,number(completed.readAudioDurationMs)?completed.readAudioDurationMs:0);
  if(duration<=0){noChart('viz-pron','시간 정보를 확인할 수 없습니다.');return;}
  const numeric=words.filter(w=>number(w.accuracy));
  const minimum=numeric.length?Math.min(...numeric.map(w=>w.accuracy)):null;
  // Relative lowest score among this utterance, NOT a clinical cutoff.
  const markMin=minimum!==null&&numeric.some(w=>w.accuracy>minimum);
  const bars=words.map(w=>{
    const offset=pct(w.start,duration),width=Math.max(.65,pct(w.duration,duration));
    const lower=markMin&&w.accuracy===minimum;
    const label=w.word+' · '+(number(w.accuracy)?w.accuracy.toFixed(0)+'점':'점수 없음')+
      ' · '+fmtSeconds(w.start)+'~'+fmtSeconds(w.start+w.duration);
    return '<span class="segment word'+(lower?' lower':'')+
      '" role="img" aria-label="'+escapeText(label)+
      '" title="'+escapeText(label)+'" style="left:'+offset.toFixed(2)+'%;width:'+
      Math.min(width,100-offset).toFixed(2)+'%"></span>';
  }).join('');
  const pills=words.map(w=>{
    const lower=markMin&&w.accuracy===minimum;
    return '<span class="word-pill'+(lower?' lower':'')+'" aria-label="'+
      escapeText(w.word+' '+(number(w.accuracy)?w.accuracy.toFixed(0)+'점':'점수 없음'))+'">'+
      escapeText(w.word)+' <b>'+ (number(w.accuracy)?w.accuracy.toFixed(0)+'점':'—')+
      '</b></span>';
  }).join('');
  const insight=markMin?'<div class="viz-insight">이번 읽기에서 상대적으로 낮은 단어: '+
      escapeText(words.filter(w=>w.accuracy===minimum).map(w=>w.word).join(', '))+
      ' ('+minimum.toFixed(0)+'점)</div>':'';
  el('viz-pron').innerHTML='<div class="time-track" role="img" aria-label="단어별 실제 측정 시각과 발음 점수">'+
    bars+'</div>'+axis(duration,'문장 읽기 녹음 길이')+
    '<div class="time-legend"><span><i class="time-dot"></i>단어 위치</span>'+
    (markMin?'<span><i class="time-dot pause"></i>이번 읽기에서 상대적으로 낮은 점수</span>':'')+
    '</div><div class="word-list">'+pills+'</div>'+insight+
    '<div class="viz-notice">Azure 단어별 교육용 발음 점수 · 의학적 기준선 없음</div>';
}
function renderDelay(d){
  const source=Array.isArray(d.segments)?d.segments:[];
  const slices=source.filter(x=>number(x?.startMs)&&number(x?.endMs)&&x.endMs>x.startMs);
  const ms=number(d.audioDurationMs)?d.audioDurationMs:
    number(completed.responseAudioDurationMs)?completed.responseAudioDurationMs:0;
  if(d.status!=='measured'||!slices.length||ms<=0){
    noChart('viz-delay','발화·무음 구간이 측정되지 않아 그래프를 표시하지 않습니다.');return;
  }
  const offset=number(d.initialResponseLatencyMs)&&number(d.firstSpeechFromWavStartMs)?
    Math.max(0,d.initialResponseLatencyMs-d.firstSpeechFromWavStartMs):0;
  const total=Math.max(ms+offset,1);
  const all=[];
  const hasPromptClock=number(d.initialResponseLatencyMs);
  // No verified cross-clock mapping on iOS yet. The leading silence remains
  // genuine PCM evidence, but is NOT confirmed stimulus-to-response latency.
  if(!hasPromptClock&&number(d.firstSpeechFromWavStartMs)&&d.firstSpeechFromWavStartMs>0)
    all.push({start:0,end:d.firstSpeechFromWavStartMs,type:'initial'});
  if(offset>0)all.push({start:0,end:offset,type:'initial'});
  for(const voice of slices)all.push({start:voice.startMs+offset,end:voice.endMs+offset,type:'speech'});
  const gaps=d.withinResponse?.silentPauses||[];
  for(const gap of gaps){
    if(number(gap.startMs)&&number(gap.endMs)&&gap.endMs>gap.startMs){
      all.push({start:gap.startMs+offset,end:gap.endMs+offset,type:'pause'});
    }
  }
  // In the WAV offset frame, the leading initial silence is shown as 'initial'
  // only if question-end timing exists; otherwise do not attribute it to thinking.
  const knownInitial=number(d.initialResponseLatencyMs);
  if(knownInitial&&d.initialResponseLatencyMs>0)
    all.push({start:offset,end:Math.max(offset,d.initialResponseLatencyMs),type:'initial'});
  const bars=all.filter(x=>x.end>x.start).map(x=>{
    const label=x.type==='speech'?'발화':x.type==='pause'?'답변 중 무음':'발화 이전';
    return '<span class="segment '+x.type+'" role="img" aria-label="'+
      escapeText(label+' '+fmtSeconds(x.start)+'~'+fmtSeconds(x.end))+
      '" style="left:'+pct(x.start,total).toFixed(2)+'%;width:'+
      Math.max(.25,pct(x.end-x.start,total)).toFixed(2)+'%"></span>';
  }).join('');
  const pauseCount=d.withinResponse?.silentPauseCount;
  const pauseTotal=d.withinResponse?.totalSilentPauseMs;
  const startInfo=knownInitial?
    '답변 시작 '+fmtSeconds(d.initialResponseLatencyMs)+' (기기 시각 정합 검증 전)':
    '질문 후 응답 시작시간 미측정';
  const pauseInfo=number(pauseCount)&&number(pauseTotal)?
    ' · 답변 중 무음 '+pauseCount+'회 / 총 '+fmtSeconds(pauseTotal):
    ' · 답변 중 무음 횟수 미측정';
  el('viz-delay').innerHTML='<div class="time-track" role="img" aria-label="답변의 실측 발화와 무음 구간">'+
    bars+'</div>'+axis(total,knownInitial?'질문 종료 기준, 근사 정렬':'녹음 시작 기준')+
    '<div class="time-legend"><span><i class="time-dot"></i>발화</span>'+
    '<span><i class="time-dot pause"></i>답변 중 무음</span>'+
    ((knownInitial||number(d.firstSpeechFromWavStartMs))?'<span><i class="time-dot initial"></i>첫 발화 전 무음</span>':'')+
    '</div><div class="viz-insight">'+escapeText(startInfo+pauseInfo)+'</div>'+
    '<div class="viz-notice">'+(knownInitial?'브라우저 질문 종료 시각과 음성 구간의 근사 정렬':
      '첫 발화 이전 무음은 녹음 시작 기준이며 질문 표시 시각과 PCM 정합성은 미검증')+
    ' · VAD 구간 자체는 임상 판정 아님</div>';
}
function renderTremor(v){
  const raw=Array.isArray(v.pitchTrajectory)?v.pitchTrajectory:[];
  const values=raw.slice(0,160).filter(x=>number(x?.timeMs)&&number(x?.f0Hz)&&x.f0Hz>0);
  if(v.status!=='measured'||values.length<3){
    noChart('viz-tremor','이번 결과에는 시간별 F0 자료가 없어 임의의 곡선을 그리지 않습니다.');
    return;
  }
  const duration=number(completed.vowelAudioDurationMs)?completed.vowelAudioDurationMs:
    Math.max(...values.map(p=>p.timeMs));
  if(duration<=0){noChart('viz-tremor','주파수 시간축을 확인할 수 없습니다.');return;}
  const lo=Math.min(...values.map(p=>p.f0Hz));
  const hi=Math.max(...values.map(p=>p.f0Hz));
  const range=Math.max(6,hi-lo);
  const min=lo-range*.2,max=hi+range*.2;
  const width=620,height=128,l=12,r=8,t=13,b=14;
  const contentW=width-l-r,contentH=height-t-b;
  const x=p=>l+pct(p.timeMs,duration)/100*contentW;
  const y=p=>t+(1-(p.f0Hz-min)/(max-min))*contentH;
  const line=values.map((p,i)=>(i?'L':'M')+x(p).toFixed(1)+' '+y(p).toFixed(1)).join(' ');
  const center=number(v.medianF0Hz)?v.medianF0Hz:null;
  const centerLine=center!==null?
    '<line class="midline" x1="'+l+'" x2="'+(width-r)+'" y1="'+
    y({f0Hz:center}).toFixed(1)+'" y2="'+y({f0Hz:center}).toFixed(1)+'"/>':'';
  el('viz-tremor').innerHTML='<svg class="viz-svg" viewBox="0 0 '+width+' '+height+
    '" role="img" aria-label="Praat이 실제 추적한 기본주파수 최소 '+lo.toFixed(1)+
    ' 헤르츠에서 최대 '+hi.toFixed(1)+' 헤르츠">'+
    [0,.5,1].map(v=>'<line class="gridline" x1="'+l+'" x2="'+(width-r)+'" y1="'+
      (t+v*contentH).toFixed(1)+'" y2="'+(t+v*contentH).toFixed(1)+'"/>').join('')+
    centerLine+'<path class="f0-line" d="'+line+'"/></svg>'+
    axis(duration,'모음 녹음 길이')+
    '<div class="viz-insight">실제 F0 범위 '+lo.toFixed(1)+'~'+hi.toFixed(1)+
    ' Hz'+(center!==null?' · 중앙값 '+center.toFixed(1)+' Hz':'')+'</div>'+
    '<div class="viz-notice">중앙 안정구간에서 추출한 실제 Praat F0 프레임의 축소 표현 · 떨림 진단 아님</div>';
}
function renderBetaComparison(){
  const node=el('beta-comparison');
  const pair=completed.responseDelayComparison;
  if(!pair){node.textContent='2단계 분석 결과가 없어 모델 비교를 표시하지 않습니다.';return;}
  const base=pair.baseline||{},candidate=pair.candidate||{};
  const formatMs=n=>number(n)?(n/1000).toFixed(2)+'초':'미측정';
  if(candidate.status!=='measured'){
    node.textContent='WebRTC·Silero 비교: Silero 미측정 ('+String(candidate.reason||candidate.status||'unknown')+'). WebRTC 결과만 별도로 확인할 수 있습니다.';
    return;
  }
  const bPause=base.withinResponse||{},cPause=candidate.withinResponse||{};
  const rows=[
    ['첫 발화 위치',formatMs(base.firstSpeechFromWavStartMs),formatMs(candidate.firstSpeechFromWavStartMs)],
    ['답변 중 무음 횟수',number(bPause.silentPauseCount)?bPause.silentPauseCount+'회':'미측정',number(cPause.silentPauseCount)?cPause.silentPauseCount+'회':'미측정'],
    ['답변 중 무음 총합',formatMs(bPause.totalSilentPauseMs),formatMs(cPause.totalSilentPauseMs)]
  ];
  node.innerHTML='<h2>동일 녹음 · 음성 구간 모델 비교</h2>'+
    '<div class="viz-notice">두 모델의 차이만 표시합니다. 수동 기준 정답이 없어 어느 쪽이 더 정확한지 판단할 수 없습니다.</div>'+
    '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px"><thead><tr>'+
    '<th scope="col" style="text-align:left;padding:8px 4px">측정 항목</th><th scope="col">WebRTC</th><th scope="col">Silero</th></tr></thead><tbody>'+
    rows.map(r=>'<tr>'+r.map((v,i)=>'<td style="padding:9px 4px;border-top:1px solid #e0ebe7;'+(i?'text-align:center':'')+'">'+escapeText(v)+'</td>').join('')+'</tr>').join('')+
    '</tbody></table>';
}
function showResearchBinary(){
  const x=completed.researchBinary||{status:'not_requested'};
  const value=el('research-binary-result'),note=el('research-binary-note');
  if(x.status==='classified_research_only' && x.outOfDomain===true &&
     (x.researchClassOnly==='CN'||x.researchClassOnly==='AD')){
    value.textContent=x.researchClassOnly==='AD'?'AD 관련 음향 패턴':'정상군(CN) 음향 패턴';
    note.textContent='Pitt 사전학습 연구 모델이 이번 음성에서 분류한 패턴입니다. 결과는 이진 분류(CN/AD)로 제한되며 한국어에서의 정확도는 검증되지 않았습니다.';
  }else if(x.status==='pending'){
    value.textContent='음성 패턴 분석 중';
    note.textContent='2단계에서 선택한 연구용 분류를 처리하고 있습니다. 진행 상황은 아래 분석 단계 카드에서 확인할 수 있습니다.';
  }else if(x.status==='unavailable'||x.status==='insufficient_data'){
    value.textContent='음성 패턴 분류 불가';
    note.textContent='음성 자료 부족 또는 연구 모델 처리 실패로 분류값이 없습니다. 정상이나 AD로 추정해서 표시하지 않습니다.';
  }else{
    value.textContent='연구용 AI 분류 미진행';
    note.textContent='2단계의 별도 연구용 분류 동의가 없거나 분석 결과가 제출되지 않았습니다. 기본 음성 측정과는 별도입니다.';
  }
}
function renderExtendedResearch(){
  const x=completed.researchComparisons||{status:'not_requested',models:{}};
  const card=el('extended-research-card');
  card.hidden=x.status==='not_requested';
  if(card.hidden)return;
  const running=x.status==='pending',models=x.models||{};
  el('extended-research-status').textContent=running?
    '추가 연구용 모델 실행 중 · 완료된 실제 추론만 표시합니다.':
    x.status==='completed_research_only'?
      '사전학습 모델의 실제 연구용 추론 결과입니다. 진단이나 위험 확률은 제공하지 않습니다.':
      '사전학습 모델 추론을 완료하지 못했습니다. 결과를 만들어 표시하지 않습니다.';
  const pitt=models.pitt_full||{};
  el('extended-pitt-value').textContent=running?'분석 중':pitt.status==='executed_research_only'?
    '학습 클래스 '+String(pitt.rawTrainingClassId||'확인 불가'):'실행 결과 없음';
  el('extended-pitt-note').textContent=pitt.status==='executed_research_only'?
    '4개 스트림 융합 성공 · 학습 클래스 ID는 한국어 MCI/치매 단계가 아닙니다.':
    '별도 Pitt 전체 융합 모델의 실제 출력이 확보되지 않았습니다.';
  const hub=models.aihub217||{};
  el('extended-aihub-value').textContent=running?'분석 중':hub.status==='executed_research_only'?
    '공식 VGG16 2종 실행 완료':'실행 결과 없음';
  el('extended-aihub-note').textContent=hub.status==='executed_research_only'?
    'SCIvsOTHERS·MCIvsAD 각각 계산 완료 · 최종 ANN 미확보 · 3단계 합산 판정 없음.':
    'AI-Hub 217 사전학습 모델의 실제 출력이 확보되지 않았습니다.';
  // Raw outputs only inside the collapsed evidence section; never a risk gauge.
  el('extended-research-raw').textContent=running?
    '실제 서버 결과 대기 중':JSON.stringify(x,null,2);
}
function output(shouldScroll=true){
  const p=completed.pronunciation||{},d=completed.responseDelay||{},v=completed.vocalTremor||{};
  const score=p.scores?.accuracy;
  el('out-pron').textContent=p.status==='assessed'&&number(score)?score.toFixed(1)+'/100':'미측정';
  el('why-pron').textContent=p.status==='assessed'?
    'Azure 발음 평가 · 교육용 정확도 점수':'측정된 발음 점수가 없습니다.';
  const onset=number(d.initialResponseLatencyMs)?d.initialResponseLatencyMs:null;
  const fromRecordStart=number(d.firstSpeechFromWavStartMs)?d.firstSpeechFromWavStartMs:null;
  const pauses=d.withinResponse||{};
  el('out-delay').textContent=d.status==='pending'?'분석 중':onset!==null?'~'+(onset/1000).toFixed(2)+'초':
    fromRecordStart!==null?'~'+(fromRecordStart/1000).toFixed(2)+'초':d.status==='measured'?'내부 휴지 측정':'미측정';
  el('why-delay').textContent=d.status==='pending'?'2단계 분석 결과가 도착하면 자동으로 표시됩니다.':d.status==='measured'?
    (onset!==null?'질문 종료 시각 기준 추정':'녹음 시작~첫 발화(화면 질문 표시와 PCM 시각 정합 미검증)')+
    ' · 내부 무음 '+(number(pauses.silentPauseCount)?pauses.silentPauseCount+'회':'미측정')+
    ' · 총 '+(number(pauses.totalSilentPauseMs)?(pauses.totalSilentPauseMs/1000).toFixed(2)+'초':'미측정'):
    '답변 음성 분석 자료가 없습니다.';
  const f=v.frequencyModulation?.peakRateHz;
  el('out-tremor').textContent=v.status==='measured'&&number(f)?f.toFixed(2)+' Hz':'미측정';
  el('why-tremor').textContent=v.status==='measured'?
    '목소리 주기적 변조의 측정값 · 떨림 질환 판정 아님':
    '품질 기준을 충족한 모음 발성 자료가 없습니다.';
  report={source:'evidence_guest',status:'research_features_only',pronunciation:p,responseDelay:d,vocalTremor:v,researchOnlyBinary:completed.researchBinary||{status:'not_requested'},researchComparisons:completed.researchComparisons||{status:'not_requested'},cognitiveScreening:{status:'not_available',reason:'NO_KOREAN_CLINICALLY_VALIDATED_MODEL_CONNECTED',clinicalDecision:null},completedStages:tasks.filter(x=>completed[x+'Quality']?.serverStatus!=='pending'&&completed[x+'Quality']),measuredAt:new Date().toISOString()};
  renderPronunciation(p);
  renderDelay(d);
  renderTremor(v);
  renderBetaComparison();
  showResearchBinary();
  renderExtendedResearch();
  el('evidence').textContent=JSON.stringify(report,null,2);
  el('summary-pron').textContent=el('out-pron').textContent;
  el('summary-delay').textContent=el('out-delay').textContent;
  el('summary-vowel').textContent=el('out-tremor').textContent;
  el('download').disabled=false;
  el('self-panel').hidden=true;el('results').hidden=false;
  const unfinished=voiceProgress.status==='pending';
  el('analysis-view').hidden=!unfinished;
  el('result-view').hidden=unfinished;
  updateResponseProgress();
  // Each view fits the screen without moving the page or displaying another task.
}
function finishStage(){
  el('after-actions').hidden=true;
  if(index===2){output();return;}
  showStage(index+1);
}
function checkConsent(){
  if(!el('server-consent').checked){
    setStatus('음성 분석 동의를 체크해주세요.','error');return false;
  }
  return true;
}
async function to16k(blob,removeQuestionMs=0){
  const Constructor=window.AudioContext||window.webkitAudioContext;
  if(!Constructor)throw Error('이 브라우저는 녹음 변환을 지원하지 않습니다.');
  const context=new Constructor();
  try{
    const decoded=await context.decodeAudioData(await blob.arrayBuffer());
    // Stage two records the question as a safety pre-roll. Only the
    // trimmed answer may be sent to the server (maximum 30 seconds).
    if(decoded.duration<1||decoded.duration>45)throw Error('녹음 파일의 길이가 올바르지 않습니다.');
    const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);
    const source=offline.createBufferSource();
    source.buffer=decoded;source.connect(offline.destination);source.start();
    const rendered=await offline.startRendering();
    const all=rendered.getChannelData(0);
    const drop=Math.min(all.length,Math.max(0,Math.round(removeQuestionMs*16)));
    const answer=all.subarray(drop);
    if(answer.length<16000||answer.length>480000)
      throw Error('질문 이후 답변이 1~30초 이상 녹음돼야 합니다.');
    return answer;
  }finally{await context.close().catch(()=>{});}
}
function wav16kBase64(audio){
  const b=new ArrayBuffer(44+audio.length*2),dv=new DataView(b);
  function word(i,s){for(let j=0;j<s.length;j++)dv.setUint8(i+j,s.charCodeAt(j));}
  word(0,'RIFF');dv.setUint32(4,b.byteLength-8,true);word(8,'WAVE');
  word(12,'fmt ');dv.setUint32(16,16,true);
  dv.setUint16(20,1,true);dv.setUint16(22,1,true);
  dv.setUint32(24,16000,true);dv.setUint32(28,32000,true);
  dv.setUint16(32,2,true);dv.setUint16(34,16,true);
  word(36,'data');dv.setUint32(40,audio.length*2,true);
  for(let i=0;i<audio.length;i++){
    const value=Math.max(-1,Math.min(1,Number(audio[i])||0));
    dv.setInt16(44+i*2,Math.round(value<0?value*32768:value*32767),true);
  }
  const bytes=new Uint8Array(b);let raw='';
  for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(raw);
}
async function analyze(){
  if(busy||!sound||!checkConsent())return;
  const task=currentTask(),stageIndex=index,session=recordingSession;
  const generation=assessmentGeneration;
  const researchRequested=task==='response'&&researchReady&&el('pitt-consent').checked;
  const extendedRequested=task==='response'&&extendedReady&&el('extended-consent').checked;
  let phase='decode',pcmLength=0;
  busy=true;lastAnalysisError=null;
  el('error-copy').hidden=true;
  el('record').disabled=true;el('quick-analyze').disabled=true;
  setStatus('녹음 파일을 분석 가능한 형식으로 변환하고 있습니다…');
  el('quick-status').setAttribute('aria-busy','true');
  try{
    let pcm;
    try{pcm=await to16k(sound,task==='response'&&responseSoundHasPreRoll?responsePreRollMs:0);}
    catch(e){e.phase='decode';throw e;}
    pcmLength=pcm.length;
    // On mobile the playback/recorder clock can have a large unexpected gap.
    // Never reject the entire voice analysis for an invalid initial-latency
    // offset: mark it unmeasured instead of supplying an invented interval.
    // Question audio preceding the answer was removed locally. The new PCM
    // starts at the browser's approximate prompt-end, not a fabricated
    // positive device delay. Boundary quality remains explicitly unverified.
    const safeOffset=task==='response'&&responseSoundHasPreRoll?0:
      (number(questionOffset)&&questionOffset>=0&&questionOffset<=30000?questionOffset:null);
    phase='encode';
    const audio=wav16kBase64(pcm);
    phase='request';
    setStatus(task==='response'&&researchReady&&el('pitt-consent').checked?
      '음성 구간 및 학습 완료 연구용 AD/CN 분류기를 실행하고 있습니다…':
      '분석 서버에서 음성의 발화·침묵 구간을 확인하고 있습니다…');
    // The response stage is analyzed independently: 3rd-stage capture does not
    // wait for Silero/Pitt processing. Only the same consented response audio
    // is sent once; no synthetic score, duplicate call or persisted recording.
    const requestJob=async()=>{
      const controller=typeof AbortController==='function'?new AbortController():null;
      let timeoutId=0;
      const payload=JSON.stringify({
        task,audio_base64:audio,consent_server_audio_processing:true,
        consent_azure_transfer:task==='read'&&el('azure-consent').checked,
        consent_research_classification:researchRequested,
        consent_extended_model_comparison:extendedRequested,
        question_end_to_capture_start_ms:task==='response'?safeOffset:null
      });
      const request=async(endpoint)=>{
        const response=await fetch(API+endpoint,{
          method:'POST',cache:'no-store',signal:controller?.signal,
          headers:{'Content-Type':'application/json','X-KIMSE-EVIDENCE-CLIENT':anonymousClientId},
          body:payload
        });
        return response;
      };
      const readStream=async(response)=>{
        if(!response.body?.getReader)throw Error('VOICE_PROGRESS_STREAM_UNSUPPORTED');
        const reader=response.body.getReader(),decoder=new TextDecoder();
        let buffer='',finalResult=null;
        for(;;){
          const {done,value}=await reader.read();
          if(done)break;
          buffer+=decoder.decode(value,{stream:true});
          // Only parse event payloads after a complete SSE frame has arrived.
          let boundary;
          while((boundary=buffer.indexOf('\n\n'))!==-1){
            const frame=buffer.slice(0,boundary).replace(/\r/g,'');
            buffer=buffer.slice(boundary+2);
            const dataLine=frame.split('\n').find(line=>line.startsWith('data: '));
            if(!dataLine)continue; // heartbeat
            let event;
            try{event=JSON.parse(dataLine.slice(6));}
            catch{throw Error('VOICE_PROGRESS_EVENT_INVALID');}
            if(event.type==='checkpoint'){
              if(generation===assessmentGeneration)recordVoiceCheckpoint(event);
            }else if(event.type==='error'){
              const err=new Error(String(event.code||'VOICE_ANALYSIS_PROCESSING_FAILED').slice(0,90));
              err.httpStatus=Number(event.status)||503;
              throw err;
            }else if(event.type==='result'){
              finalResult=event.result;
            }
          }
        }
        if(!finalResult||typeof finalResult!=='object')
          throw Error('VOICE_PROGRESS_INCOMPLETE');
        return finalResult;
      };
      try{
        return await Promise.race([
          (async()=>{
            // Old beta nodes may briefly lack the streaming endpoint during deploy.
            // A 404 is the ONLY fallback: no audio was processed or quota consumed.
            if(task==='response'&&typeof TextDecoder==='function'&&typeof ReadableStream==='function'){
              const response=await request('/guest/stream');
              if(response.status!==404){
                if(!response.ok)throw apiError(response,await response.json().catch(()=>({})));
                return await readStream(response);
              }
            }
            const response=await request('/guest');
            const data=await response.json().catch(()=>({}));
            if(!response.ok)throw apiError(response,data);
            return data;
          })(),
          new Promise((_,reject)=>{
            timeoutId=setTimeout(()=>{
              reject(new Error('VOICE_ANALYSIS_TIMEOUT'));
              controller?.abort();
            },extendedRequested?195000:researchRequested?95000:35000);
          })
        ]);
      }finally{if(timeoutId)clearTimeout(timeoutId);}
    };
    if(task==='response'){
      startVoiceProgress(researchRequested,extendedRequested);
      completed.responseDelay={status:'pending',reason:'VOICE_ANALYSIS_IN_PROGRESS'};
      completed.responseDelayComparison=null;
      completed.researchBinary=researchRequested?{status:'pending'}:{status:'not_requested'};
      completed.researchComparisons=extendedRequested?{status:'pending',models:{}}:{status:'not_requested',models:{}};
      completed.responseQuality={serverStatus:'pending',at:new Date().toISOString()};
      // The response promise can finish before or after the vowel stage.
      // Never use recordingSession here: showStage() deliberately changes it.
      void requestJob().then(data=>{
        if(generation!==assessmentGeneration)return;
        mergeResult('response',data,Math.round(pcmLength/16));
        finishVoiceProgress(true);
        if(completed.responseDelay?.status!=='measured'){
          completed.responseQuality.serverStatus='unmeasured';
        }
        updateResponseProgress();
        if(el('result-view').hidden===false||el('analysis-view').hidden===false)output(false);
      }).catch(error=>{
        if(generation!==assessmentGeneration)return;
        completed.responseDelay={status:'unavailable',reason:'VOICE_ANALYSIS_REQUEST_FAILED'};
        completed.responseDelayComparison=null;
        completed.researchBinary=researchRequested?
          {status:'unavailable',reason:'VOICE_ANALYSIS_REQUEST_FAILED'}:{status:'not_requested'};
        completed.researchComparisons=extendedRequested?
          {status:'unavailable',models:{}}:{status:'not_requested',models:{}};
        finishVoiceProgress(false);
        completed.responseQuality={serverStatus:'failed',
          errorCode:String(error?.message||'VOICE_ANALYSIS_REQUEST_FAILED').slice(0,90)};
        updateResponseProgress();
        if(el('result-view').hidden===false||el('analysis-view').hidden===false)output(false);
      });
      finishStage();
      setStatus('2단계 녹음 완료 · 분석은 별도로 진행됩니다. 3단계를 시작해 주세요.','success');
      return;
    }
    const data=await requestJob();
    phase='measurement';
    const feature=task==='read'?data.pronunciation:task==='response'?data.responseDelay:data.vocalTremor;
    const good=task==='read'?feature?.status==='assessed':feature?.status==='measured';
    if(task==='read'&&!el('azure-consent').checked&&feature?.status==='not_measured'){
      mergeResult(task,data,Math.round(pcm.length/16));
      setStatus('발음 평가는 미측정으로 남겨두고 질문 응답으로 진행합니다.','success');
      finishStage();
      return;
    }
    if(!good){
      mergeResult(task,data,Math.round(pcm.length/16));
      lastAnalysisError={stage:task,phase:'measurement',httpStatus:200,
        errorCode:String(feature?.status||'feature_not_returned'),pcmDurationMs:Math.round(pcm.length/16)};
      el('error-copy').hidden=false;
      setStatus(task==='vowel'?
        '아— 소리의 연속 구간을 확인하지 못했어요. 마이크 가까이에서 일정하게 5초 이상 내고 다시 녹음해 주세요.':
        '음성 분석 품질이 부족합니다. 재분석하거나 다시 녹음해주세요.','error');
      el('after-actions').hidden=false;
      return;
    }
    mergeResult(task,data,Math.round(pcm.length/16));
    setStatus('분석 완료. 다음 단계로 이동합니다.','success');
    finishStage();
  }catch(e){
    if(session!==recordingSession)return;
    lastAnalysisError=errorDiagnostic(e,phase,pcmLength);
    el('error-copy').hidden=false;
    if((e?.httpStatus>=500)||/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(String(e?.message||e))){
      serviceReady=false;el('check-connection').hidden=false;
    }
    const code=e?.httpStatus?'HTTP '+e.httpStatus:phase==='decode'?'녹음 변환':'요청 오류';
    setStatus('분석 실패 ('+code+'): '+friendlyError(e)+' 녹음 파일은 유지됩니다.','error');
    el('after-actions').hidden=false;
  }finally{
    busy=false;el('quick-analyze').disabled=false;
    if(el('self-panel').hidden===false)el('record').disabled=!serviceReady;
    el('quick-status').setAttribute('aria-busy','false');
  }
}
async function startRecording(){
  if(busy||!checkConsent())return;
  const task=currentTask(),isResponse=task==='response';
  if(!serviceReady){await checkService();if(!serviceReady)return;}
  const session=++recordingSession;
  captureStartConfirmed=false;
  questionEnd=null;questionOffset=null;
  responsePreRollMs=0;responseSoundHasPreRoll=false;
  el('after-actions').hidden=true;
  setAudio(null);
  el('record').disabled=true;
  setStatus('마이크 연결 중…');
  try{
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)
      throw Error('이 브라우저에서 마이크 녹음을 지원하지 않습니다.');
    // The same direct microphone-capture code is used for all three tasks.
    // No TTS or speaker route change occurs while capturing the answer.
    const captured=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    if(session!==recordingSession){
      captured.getTracks().forEach(track=>track.stop());return;
    }
    stream=captured;
    const chunks=[];
    recorder=new MediaRecorder(stream);
    // Keep the capture's own recorder reference: an error may clear the
    // mutable global before the browser dispatches the trailing stop event.
    const captureRecorder=recorder;
    let captureFailed=false;
    captureRecorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
    captureRecorder.onstart=()=>{
      if(session!==recordingSession)return;
      // Reject the UI start state when the audio track has already ended.
      // Otherwise, the prompt could be shown without any usable recording.
      if(!stream?.getTracks().some(track=>track.readyState!=='ended')){
        recorder?.stop();return;
      }
      captureStartConfirmed=true;
      if(captureStartWatchdog)clearTimeout(captureStartWatchdog);
      captureStartWatchdog=0;
      // The question is hidden until the recorder confirms a live capture.
      // Audio onset is relative to capture zero, NOT the end of an audible question.
      if(isResponse){
        el('prompt').textContent=RESPONSE_QUESTION;
        el('response-question').textContent=RESPONSE_QUESTION;
      }
      beginMeter(stream);
      setRecordingState(true);
      startClock();
      beginAutoMonitor(task);
      el('stop').hidden=false;
      el('stop').disabled=false;
      if(isResponse)el('record-label').textContent='● 답변 녹음 중';
      setStatus(task==='vowel'?'● 녹음 중 · 아— 소리를 유지하면 자동 종료':
        '● 녹음 중 · 말하기를 마치면 자동 종료됩니다.');
    };
    captureRecorder.onstop=()=>{
      if(session!==recordingSession||captureFailed)return;
      const blob=new Blob(chunks,{type:captureRecorder.mimeType||chunks[0]?.type||'audio/webm'});
      const confirmed=captureStartConfirmed;
      closeMicrophone();recorder=null;
      if(!confirmed){
        if(blob.size)setAudio(blob); // preserve any capture for local diagnosis; do not analyze it
        el('record').disabled=false;
        setStatus('마이크가 실제 녹음을 시작했는지 확인할 수 없습니다. 다시 시도해 주세요.','error');
        return;
      }
      if(!blob.size){
        el('record').disabled=false;
        setStatus('녹음 데이터가 없습니다. 다시 녹음해주세요.','error');
        return;
      }
      setAudio(blob);
      el('after-actions').hidden=false;
      setStatus('녹음 완료 · 분석 중입니다…');
      analyze();
    };
    captureRecorder.onerror=event=>{
      if(session!==recordingSession)return;
      captureFailed=true;
      recorder=null;closeMicrophone();
      el('record').disabled=false;
      lastAnalysisError={stage:task,phase:'capture',httpStatus:null,
        errorCode:String(event?.error?.name||'MEDIA_RECORDER_ERROR').slice(0,90),
        recordedAudioType:captureRecorder.mimeType||'',pcmDurationMs:null};
      el('error-copy').hidden=false;
      setStatus('녹음 장치 오류로 중단됐습니다. 마이크를 확인하고 다시 녹음해 주세요.','error');
    };
    recorder.start();
    // Safari may neither reject start() nor dispatch onstart. Never leave
    // stage two silently stuck or reveal the stimulus before confirmation.
    if(!captureStartConfirmed)captureStartWatchdog=setTimeout(()=>{
      if(session!==recordingSession||captureStartConfirmed)return;
      if(recorder?.state==='recording')recorder.stop();
      else{
        closeMicrophone();recorder=null;el('record').disabled=false;
        setStatus('녹음 시작 확인 시간이 초과됐습니다. 다시 시도해 주세요.','error');
      }
    },6000);
  }catch(e){
    if(session!==recordingSession)return;
    recorder=null;closeMicrophone();
    el('record').disabled=false;
    setStatus('마이크 녹음 시작 실패: '+friendlyError(e),'error');
  }
}
el('check-connection').addEventListener('click',checkService);
function setExtendedAvailability(status){
  const models=Array.isArray(status?.extendedResearchModels)?status.extendedResearchModels:[];
  extendedModelNames=models.filter(x=>x==='pitt_full'||x==='aihub217');
  extendedReady=status?.extendedResearchAvailable===true&&extendedModelNames.length>0;
  el('extended-row').hidden=!extendedReady;
  if(!extendedReady)el('extended-consent').checked=false;
  updateConsentStart();
}
async function probeResearchAvailability(){
  try{
    const response=await fetch(API+'/status',{cache:'no-store'});
    if(response.ok)setExtendedAvailability(await response.json());
  }catch{setExtendedAvailability({});}
}
function updateConsentStart(){
  const required=el('server-consent').checked;
  el('choose-self').disabled=!required;
  el('choose-self').textContent=required?'선택한 항목으로 검사 시작 →':'필수 동의를 선택하고 검사 시작 →';
  el('consent-message').textContent=required?
    '동의 확인 완료 · 검사 중 추가 동의 화면은 나타나지 않습니다.':
    '원하는 항목을 직접 선택하세요. 선택 동의 없이도 2·3단계를 진행할 수 있습니다.';
}
for(const id of ['server-consent','azure-consent','pitt-consent','extended-consent']){
  el(id).addEventListener('change',updateConsentStart);
}
el('consent-all').addEventListener('click',()=>{
  for(const id of ['server-consent','azure-consent','pitt-consent'])el(id).checked=true;
  if(extendedReady)el('extended-consent').checked=true;
  updateConsentStart();
});
updateConsentStart();
void probeResearchAvailability();
el('choose-self').addEventListener('click',newAssessment);
el('choose-retell').addEventListener('click',()=>{
  cancelCapture();el('method-picker').hidden=true;
  el('self-panel').hidden=true;el('result-view').hidden=true;el('retell-panel').hidden=false;
});
el('back-method').addEventListener('click',()=>{
  el('retell-panel').hidden=true;el('method-picker').hidden=false;
});
el('record').addEventListener('click',startRecording);
el('view-partial').addEventListener('click',()=>{
  if(el('analysis-view').hidden===false){
    el('analysis-view').hidden=true;
    el('result-view').hidden=false;
    // Results can be viewed without inventing the pending analysis values.
    el('summary-delay').textContent=el('out-delay').textContent;
  }
});
el('stop').addEventListener('click',()=>{
  if(recorder?.state==='recording'){
    requestRecordingStop('manual');
  }
});
el('quick-analyze').addEventListener('click',analyze);
el('error-copy').addEventListener('click',async()=>{
  if(!lastAnalysisError)return;
  const detail=JSON.stringify(lastAnalysisError);
  try{
    await navigator.clipboard.writeText(detail);
    setStatus('오류 정보가 복사됐습니다. 원음이나 대화 내용은 포함되지 않습니다.','success');
  }catch{
    setStatus('오류 정보: '+detail,'error');
  }
});
el('skip-pron').addEventListener('click',()=>{
  if(busy||currentTask()!=='read')return;
  completed.pronunciation={status:'not_measured',reason:'OPTIONAL_AZURE_PRONUNCIATION_SKIPPED'};
  completed.readQuality={serverStatus:'skipped_by_user'};
  setStatus('발음 평가 없이 질문 응답으로 진행합니다.','success');
  finishStage();
});
el('skip-stage').addEventListener('click',()=>{
  if(busy)return;
  const key=currentTask()==='read'?'pronunciation':currentTask()==='response'?'responseDelay':'vocalTremor';
  completed[key]={status:'not_measured',reason:'사용자가 해당 과제를 건너뛰었습니다.'};
  completed[currentTask()+'Quality']={serverStatus:'skipped'};
  finishStage();
});
el('audio-file').addEventListener('change',e=>{
  const file=e.target.files?.[0]||null;
  setAudio(file);
  if(file){
    responseSoundHasPreRoll=false;responsePreRollMs=0;
    el('after-actions').hidden=false;
    setStatus('파일을 선택했습니다. 분석 버튼을 누르세요.');
  }
});
el('new-session').addEventListener('click',newAssessment);
el('restart-from-result').addEventListener('click',newAssessment);
el('download').addEventListener('click',()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='kimse-voice-evidence.json';
  anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener('pagehide',()=>{
  cancelCapture();cleanupAudio();
});
