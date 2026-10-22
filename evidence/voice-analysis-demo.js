// KIMSE Evidence: minimal, sequential recording UI. Measurements remain distinct.
const el=id=>document.getElementById(id);
const API='https://api-kimse.suaveforge.com/api/v1/evidence/voice-analysis';
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
let busy=false,recordingSession=0,serviceReady=false;
let autoStopTimer=0,activeRecordingTask=null,autoVoiceSeen=false,lastActiveVoiceMs=null,voiceAboveFrames=0;
let noiseFloor=.003,autoStopReason=null;
// UI capture duration parameters only. These ARE NOT speech-disorder thresholds.
// A fixed 5.5s vowel recording provides >=5s samples as used by tremor research.
// For unstructured answers, a generous silence window protects interior hesitations.
const RECORD_LIMITS={
  read:{minimumMs:3500,silenceAfterMs:2600,maxMs:25000},
  response:{minimumMs:6500,silenceAfterMs:5000,maxMs:29000},
  vowel:{minimumMs:5500,silenceAfterMs:null,maxMs:5500}
};
const QUESTION_AUDIO_URL=API+'/question-audio';
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
const shortReason={
  EVIDENCE_GUEST_DAILY_QUOTA_REACHED:'오늘 이용 가능한 분석 횟수를 초과했습니다.',
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
  Failed_to_fetch:'분석 서버에 연결할 수 없습니다.'
};
function friendlyError(e){
  const raw=String(e?.message||e||'알 수 없는 오류');
  return shortReason[raw]||(/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(raw)?
      '서버 연결에 실패했습니다. 인터넷 연결을 확인하고 다시 시도하세요.':raw);
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
  activeRecordingTask=null;
}
function requestRecordingStop(reason){
  if(recorder?.state!=='recording')return false;
  autoStopReason=reason;
  el('stop').disabled=true;
  setStatus(reason==='vowel_time'?'5.5초 발성 녹음 완료 · 분석을 시작합니다.':
    reason==='silence_after_speech'?'발화 종료 감지 · 분석을 시작합니다.':
    reason==='maximum_duration'?'최대 녹음 시간에 도달했습니다. 분석을 시작합니다.':
    '녹음 종료 · 분석을 시작합니다.');
  recorder.stop();
  return true;
}
function watchRecordingActivity(rms){
  if(!activeRecordingTask||recorder?.state!=='recording')return;
  const task=activeRecordingTask;
  if(task==='vowel')return; // vowel stops by elapsed samples, not volume.
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
      const remain=Math.max(0,(conf.maxMs-elapsed)/1000);
      el('signal-label').textContent='아— 소리를 유지해 주세요 · '+remain.toFixed(1)+'초 남음';
    }
    if(elapsed>=conf.maxMs){
      requestRecordingStop(task==='vowel'?'vowel_time':'maximum_duration');
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
  stopAutoMonitor();
  stream?.getTracks().forEach(track=>track.stop());
  stream=null;endMeter();stopClock();setRecordingState(false);
  el('record').disabled=busy;
  el('stop').disabled=true;
  if(currentTask()==='response')el('stop').hidden=true;
}
function cancelCapture(){
  const questionAudio=el('question-audio');
  questionAudio.pause();questionAudio.onended=null;questionAudio.onerror=null;
  ++recordingSession;
  if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}
  recorder=null;closeMicrophone();window.speechSynthesis?.cancel?.();
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
    el('record').disabled=false;
    el('play-question').disabled=false;
    setStatus('연결 완료 · 동의 후 녹음을 시작해 주세요.','success');
  }catch(e){
    serviceReady=false;
    el('record').disabled=true;
    el('play-question').disabled=true;
    el('check-connection').hidden=false;
    setStatus('분석 서버에 연결할 수 없습니다. 녹음 전에 다시 연결해주세요.','error');
  }
}
function showStage(i){
  cancelCapture();
  index=i;questionEnd=null;questionOffset=null;setAudio(null);
  const task=currentTask();
  el('self-panel').hidden=false;
  el('result-view').hidden=true;
  el('task').value=task;
  el('progress').textContent=(i+1)+' / 3';
  el('progressFill').style.width=((i+1)/3*100)+'%';
  el('stage-title').textContent=(i+1)+'단계 · '+stageNames[i];
  el('prompt').textContent=prompts[task];
  el('signal-label').textContent=task==='vowel'?'5.5초 동안 아— 소리를 내면 자동으로 종료됩니다.':
    task==='response'?'답변을 마치면 자동으로 녹음이 종료됩니다.':'문장을 읽고 잠시 멈추면 자동으로 종료됩니다.';
  el('question-guide').hidden=task!=='response';
  el('record').hidden=task==='response';
  el('stop').hidden=task==='response';
  el('play-question').disabled=!serviceReady;
  el('repeat-question').hidden=true;
  if(task==='response'){
    const questionAudio=el('question-audio');
    if(!questionAudio.getAttribute('src')){
      questionAudio.src=QUESTION_AUDIO_URL;
      questionAudio.load();
    }
    el('question-hint').textContent='질문이 끝나면 답변 녹음이 자동으로 시작됩니다.';
  }
  el('azure-row').hidden=i!==0;
  el('after-actions').hidden=true;
  el('elapsed').textContent='00:00';
  el('record').textContent='🎙 녹음 시작';
  el('record').disabled=!serviceReady;
  busy=false;
  setStatus(serviceReady?(task==='response'?'🔊 질문 듣고 답변하기를 눌러주세요.':
    i===0?'동의 후 녹음을 시작해 주세요.':'준비되면 녹음 시작을 눌러주세요.'):'분석 서버 연결을 확인해주세요.');
}
function newAssessment(){
  completed={};report=null;
  el('server-consent').checked=false;el('azure-consent').checked=false;
  el('method-picker').hidden=true;
  showStage(0);
  return checkService();
}
function mergeResult(task,data,audioDurationMs=null){
  if(task==='read')completed.pronunciation=data.pronunciation;
  if(task==='response')completed.responseDelay=data.responseDelay;
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
    (knownInitial?'<span><i class="time-dot initial"></i>답변 시작 전</span>':'')+
    '</div><div class="viz-insight">'+escapeText(startInfo+pauseInfo)+'</div>'+
    '<div class="viz-notice">'+(knownInitial?'브라우저 질문 종료 시각과 음성 구간의 근사 정렬':
      '첫 발화 이전 무음은 녹음 시작 기준이며 질문 종료시간은 미확정')+
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
function output(){
  const p=completed.pronunciation||{},d=completed.responseDelay||{},v=completed.vocalTremor||{};
  const score=p.scores?.accuracy;
  el('out-pron').textContent=p.status==='assessed'&&number(score)?score.toFixed(1)+'/100':'미측정';
  el('why-pron').textContent=p.status==='assessed'?
    'Azure 발음 평가 · 교육용 정확도 점수':'측정된 발음 점수가 없습니다.';
  const onset=number(d.initialResponseLatencyMs)?d.initialResponseLatencyMs:null;
  const pauses=d.withinResponse||{};
  el('out-delay').textContent=onset!==null?(onset/1000).toFixed(2)+'초':d.status==='measured'?'내부 휴지 측정':'미측정';
  el('why-delay').textContent=d.status==='measured'?
    '답변 중 침묵 '+(number(pauses.silentPauseCount)?pauses.silentPauseCount+'회':'미측정')+
    ' · 총 '+(number(pauses.totalSilentPauseMs)?(pauses.totalSilentPauseMs/1000).toFixed(2)+'초':'미측정')+
    ' · 시작 지연은 기기 시계 오차 검증 전':
    '답변 음성 분석 자료가 없습니다.';
  const f=v.frequencyModulation?.peakRateHz;
  el('out-tremor').textContent=v.status==='measured'&&number(f)?f.toFixed(2)+' Hz':'미측정';
  el('why-tremor').textContent=v.status==='measured'?
    '목소리 주기적 변조의 측정값 · 떨림 질환 판정 아님':
    '품질 기준을 충족한 모음 발성 자료가 없습니다.';
  report={source:'evidence_guest',status:'research_features_only',pronunciation:p,responseDelay:d,vocalTremor:v,completedStages:tasks.filter(x=>completed[x+'Quality']),measuredAt:new Date().toISOString()};
  renderPronunciation(p);
  renderDelay(d);
  renderTremor(v);
  el('evidence').textContent=JSON.stringify(report,null,2);
  el('download').disabled=false;
  el('self-panel').hidden=true;el('result-view').hidden=false;el('results').hidden=false;
  el('result-view').scrollIntoView({block:'start',behavior:'smooth'});
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
  if(currentTask()==='read'&&!el('azure-consent').checked){
    setStatus('발음 평가를 위해 Azure 전송 동의를 체크해주세요.','error');return false;
  }
  return true;
}
async function to16k(blob){
  const Constructor=window.AudioContext||window.webkitAudioContext;
  if(!Constructor)throw Error('이 브라우저는 녹음 변환을 지원하지 않습니다.');
  const context=new Constructor();
  try{
    const decoded=await context.decodeAudioData(await blob.arrayBuffer());
    if(decoded.duration<1||decoded.duration>30)throw Error('1~30초 음성을 녹음해주세요.');
    const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);
    const source=offline.createBufferSource();
    source.buffer=decoded;source.connect(offline.destination);source.start();
    const rendered=await offline.startRendering();
    return rendered.getChannelData(0);
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
  busy=true;el('record').disabled=true;el('quick-analyze').disabled=true;
  setStatus('분석 중입니다…');
  el('quick-status').setAttribute('aria-busy','true');
  try{
    const pcm=await to16k(sound);
    // Keep the server's documented 1-30 second PCM16 limit.
    const audio=wav16kBase64(pcm);
    const response=await fetch(API+'/guest',{
      method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','X-KIMSE-EVIDENCE-CLIENT':anonymousClientId},
      body:JSON.stringify({
        task,audio_base64:audio,consent_server_audio_processing:true,
        consent_azure_transfer:task==='read'&&el('azure-consent').checked,
        question_end_to_capture_start_ms:task==='response'?questionOffset:null
      })
    });
    let data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(typeof data.detail==='string'?data.detail:'HTTP '+response.status);
    if(stageIndex!==index||session!==recordingSession)return;
    const feature=task==='read'?data.pronunciation:task==='response'?data.responseDelay:data.vocalTremor;
    const good=task==='read'?feature?.status==='assessed':
      task==='response'?feature?.status==='measured':feature?.status==='measured';
    if(!good){
      mergeResult(task,data,Math.round(pcm.length/16)); // preserve unavailable, no false curves
      setStatus('측정값을 얻지 못했습니다. 다시 녹음하거나 다음 단계로 진행할 수 있습니다.','error');
      el('after-actions').hidden=false;
      return;
    }
    mergeResult(task,data,Math.round(pcm.length/16));
    setStatus('분석 완료. 다음 단계로 이동합니다.','success');
    finishStage();
  }catch(e){
    if(session!==recordingSession)return;
    if(/HTTP 50[0234]|Failed to fetch|NetworkError|Load failed|fetch failed/i.test(String(e?.message||e))){
      serviceReady=false;
      el('check-connection').hidden=false;
    }
    setStatus('분석 실패: '+friendlyError(e)+' 다시 분석하거나 녹음해주세요.','error');
    el('after-actions').hidden=false;
  }finally{
    busy=false;el('quick-analyze').disabled=false;
    if(el('self-panel').hidden===false)el('record').disabled=!serviceReady;
    el('play-question').disabled=!serviceReady;
    el('quick-status').setAttribute('aria-busy','false');
  }
}
async function startRecording(playback='none'){
  if(busy)return;
  if(!serviceReady){await checkService();if(!serviceReady)return;}
  if(!checkConsent())return;
  const isResponse=currentTask()==='response';
  if(isResponse&&playback==='none'){
    setStatus('🔊 질문 듣고 답변하기 버튼을 눌러주세요.','error');
    return;
  }
  try{
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)
      throw Error('이 브라우저에서 마이크 녹음을 지원하지 않습니다.');
    ++recordingSession;
    const session=recordingSession;
    el('after-actions').hidden=true;questionEnd=null;questionOffset=null;
    setAudio(null);
    const chunks=[];
    let questionAudio=el('question-audio');
    let questionFinished=false;
    let microphoneReady=false;
    let playbackFailure=false;
    let questionStarted=false;
    let speakingTimer=0;
    const resetPlayButton=()=>{
      el('play-question').disabled=false;
      el('repeat-question').hidden=false;
      el('question-hint').textContent='질문 소리가 안 들리면 다시 듣기를 눌러주세요.';
    };
    function questionFailed(){
      if(session!==recordingSession||questionFinished)return;
      playbackFailure=true;
      if(speakingTimer)clearTimeout(speakingTimer);
      questionAudio.pause();
      closeMicrophone();
      resetPlayButton();
      setStatus('질문 재생에 실패했습니다. 다시 듣기를 눌러주세요.','error');
    }
    function questionDone(){
      if(session!==recordingSession||playbackFailure)return;
      questionFinished=true;
      if(speakingTimer)clearTimeout(speakingTimer);
      questionEnd=performance.now();
      if(!microphoneReady||!recorder||recorder.state!=='inactive'){
        // If the mic was not ready, the first speech sample could be lost.
        // Do not fabricate a response-onset time; require a fresh play.
        closeMicrophone();
        resetPlayButton();
        setStatus('마이크가 준비되기 전에 질문이 끝났습니다. 다시 듣기를 눌러주세요.','error');
        return;
      }
      try{
        recorder.start();
        el('question-hint').textContent='질문이 끝났습니다. 이제 답변해 주세요.';
      }catch(e){questionFailed();}
    }
    if(isResponse){
      // Start the audio inside the direct tap BEFORE awaiting microphone permission.
      // On iOS, speech synthesis after await getUserMedia can be silently blocked.
      el('play-question').disabled=true;
      el('repeat-question').hidden=true;
      el('question-hint').textContent='질문을 재생하고 있습니다. 끝나면 답변해 주세요.';
      setStatus('🔊 질문 재생 중 · 끝나면 답변해 주세요.');
      speakingTimer=setTimeout(()=>{
        if(session===recordingSession&&!questionFinished)questionFailed();
      },20000);
      if(playback==='tts'){
        if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){
          questionFailed();return;
        }
        window.speechSynthesis.cancel();
        const spoken=new window.SpeechSynthesisUtterance(RESPONSE_QUESTION);
        spoken.lang='ko-KR';spoken.rate=.9;spoken.volume=1;
        const voices=window.speechSynthesis.getVoices();
        const korean=voices.find(v=>(v.lang||'').toLowerCase().startsWith('ko'));
        if(korean)spoken.voice=korean;
        spoken.onstart=()=>{questionStarted=true};
        spoken.onend=questionDone;
        spoken.onerror=questionFailed;
        window.speechSynthesis.speak(spoken);
      }else{
        questionAudio.pause();questionAudio.currentTime=0;
        questionAudio.volume=1;
        questionAudio.onplaying=()=>{questionStarted=true};
        questionAudio.onended=questionDone;
        questionAudio.onerror=questionFailed;
        try{
          const p=questionAudio.play();
          if(p?.catch)p.catch(questionFailed);
        }catch(e){questionFailed();}
      }
    }
    // Acquire microphone while the user hears the question. Stage one already
    // granted capture access; if setup is late, fail instead of faking latency.
    if(navigator.audioSession && !isResponse){
      try{navigator.audioSession.type='play-and-record';}catch{}
    }
    stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    if(session!==recordingSession){closeMicrophone();return;}
    if(playbackFailure||questionFinished){
      closeMicrophone();
      if(!playbackFailure){
        resetPlayButton();
        setStatus('마이크 연결이 늦었습니다. 질문을 다시 재생해주세요.','error');
      }
      return;
    }
    recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
    recorder.onstart=()=>{
      if(session!==recordingSession)return;
      if(questionEnd!==null)questionOffset=Math.max(0,performance.now()-questionEnd);
      beginMeter(stream);
      setRecordingState(true);
      startClock();
      beginAutoMonitor(currentTask());
      el('stop').hidden=false;
      el('stop').disabled=false;
      setStatus(currentTask()==='vowel'?'● 녹음 중 · 5.5초 후 자동 종료':
        '● 녹음 중 · 발화를 마치면 자동 종료됩니다.');
    };
    recorder.onstop=()=>{
      if(session!==recordingSession)return;
      const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
      closeMicrophone();recorder=null;
      if(!blob.size){setStatus('녹음 파일이 비어 있습니다. 다시 녹음해주세요.','error');return;}
      setAudio(blob);
      el('after-actions').hidden=false;
      setStatus('녹음 완료 · 분석 중입니다…');
      analyze();
    };
    recorder.onerror=()=>{
      closeMicrophone();
      setStatus('녹음 오류가 발생했습니다. 다시 시도해주세요.','error');
      if(isResponse)resetPlayButton();
    };
    microphoneReady=true;
    if(!isResponse){el('record').disabled=true;recorder.start();}
  }catch(e){
    closeMicrophone();
    el('play-question').disabled=false;
    setStatus('녹음 시작 실패: '+friendlyError(e),'error');
  }
}
el('check-connection').addEventListener('click',checkService);
el('choose-self').addEventListener('click',newAssessment);
el('choose-retell').addEventListener('click',()=>{
  cancelCapture();el('method-picker').hidden=true;
  el('self-panel').hidden=true;el('result-view').hidden=true;el('retell-panel').hidden=false;
});
el('back-method').addEventListener('click',()=>{
  el('retell-panel').hidden=true;el('method-picker').hidden=false;
});
el('record').addEventListener('click',()=>startRecording('none'));
// MP3 is preferred when ready. Until the API deploys (or if it fails),
 // directly user-activated Korean browser TTS is the immediate fallback.
function questionPlaybackMode(){
  return el('question-audio').readyState>=2?'audio':'tts';
}
el('play-question').addEventListener('click',()=>startRecording(questionPlaybackMode()));
el('repeat-question').addEventListener('click',()=>startRecording(questionPlaybackMode()==='audio'?'audio':'tts'));
el('stop').addEventListener('click',()=>{
  if(recorder?.state==='recording'){
    requestRecordingStop('manual');
  }
});
el('quick-analyze').addEventListener('click',analyze);
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
