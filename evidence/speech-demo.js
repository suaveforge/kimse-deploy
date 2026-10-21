import {SpeechSession,TASKS,SPEECH_DEMO_VERSION} from './speech-demo-core.mjs';
const el=id=>document.getElementById(id),mode=()=>document.querySelector('input[name="task"]:checked')?.value||'free';
let stream=null,mic=null,ctx=null,analyser=null,detector=null,pitchTimer=0,raf=0,session=null,active=false,report=null;
const completedSessions=[];
function prepareAudioCapture(){
  // iOS Safari/WebKit may reject getUserMedia when AudioSession is 'playback'.
  if('audioSession' in navigator && navigator.audioSession){
    try{navigator.audioSession.type='play-and-record';}catch(error){console.warn('AudioSession type could not be set',error);}
  }
}
function updateReportSummary(){
  const target=el('measurement-summary');if(!target)return;
  if(!report){target.textContent='측정 후 분석 가능한 결과가 여기에 표시됩니다. 인지검사 점수는 산출하지 않습니다.';return;}
  const last=completedSessions.at(-1);
  const tasks=new Set(completedSessions.map(x=>x.task));
  const gap=last.meanGapMs===null?'관찰되지 않음':sec(last.meanGapMs);
  const pitch=last.pitch?.summary;
  const pitchDesc=pitch?.count?(' · F0 중앙값 '+pitch.medianHz.toFixed(1)+'Hz · 변동폭 '+(pitch.maxHz-pitch.minHz).toFixed(1)+'Hz'):' · F0 추출 불가';
  target.textContent='완료 '+completedSessions.length+'회 · 과제 '+tasks.size+'/3종 · 최근 '+last.taskLabel+' · 음성 '+last.segmentCount+'구간 · 쉼 평균 '+gap+pitchDesc+' · 인지저하 판정 모델 미구현';
}

const status=s=>{el('status').textContent=s;}, sec=ms=>(ms/1000).toFixed(1)+'초';
function update() {
 if(!session)return;
 const r=session.report(performance.now());
 el('elapsed').textContent=sec(r.durationMs);
 el('latency').textContent=r.durationMs>0?(Math.min(100,100*r.detectedDurationMs/r.durationMs)).toFixed(0)+'%':'—';
 el('segments').textContent=String(r.segmentCount);
 el('pauses').textContent=r.meanGapMs===null?'기록 없음':sec(r.meanGapMs);
 el('speech-total').textContent=sec(r.detectedDurationMs);
 const f0=r.pitch?.summary;el('f0').textContent=f0?.count?Math.round(f0.medianHz)+' Hz':'검출 없음';
 if(el('f0-range'))el('f0-range').textContent=f0?.count?(f0.maxHz-f0.minHz).toFixed(1)+' Hz':'—';
 if(el('pitch-count'))el('pitch-count').textContent=String(f0?.count||0);
 el('timeline').textContent=r.detectedSegments.length?r.detectedSegments.map(s=>(s.startMs/1000).toFixed(1)+'~'+(s.endMs/1000).toFixed(1)+'초').join(' · '):'아직 완료된 발화 구간 없음';
 renderPitch(r.pitch?.points||[]);
}
function renderPitch(points) {
 const canvas=el('pitch-chart'),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.clearRect(0,0,w,h);c.fillStyle='#f6faf9';c.fillRect(0,0,w,h);
 const left=38,right=w-9,top=13,bottom=h-21;
 c.strokeStyle='#dce9e5';c.lineWidth=1;
 for(let i=0;i<3;i++){const y=top+(bottom-top)*i/2;c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();}
 c.font='11px system-ui';c.fillStyle='#69828b';c.fillText('Hz',5,13);
 if(points.length<2){c.fillText('발성 중 음높이 데이터가 추출되면 표시됩니다.',left+8,Math.round(h/2));return;}
 const start=points[0].atMs,end=Math.max(start+1,points[points.length-1].atMs);
 const v=points.map(x=>x.hz),low=Math.min(...v),high=Math.max(low+1,...v);
 c.fillText(Math.round(high).toString(),3,top+10);c.fillText(Math.round(low).toString(),3,bottom);
 c.fillText((start/1000).toFixed(1)+'s',left,bottom+15);
 c.fillText((end/1000).toFixed(1)+'s',Math.max(left,right-35),bottom+15);
 c.strokeStyle='#087e70';c.lineWidth=2;c.beginPath();
 let previous=null;
 for(const p of points){
  const x=left+(right-left)*(p.atMs-start)/(end-start),y=bottom-(bottom-top)*(p.hz-low)/(high-low);
  if(!previous||p.atMs-previous.atMs>380)c.moveTo(x,y);else c.lineTo(x,y);
  previous=p;
 }
 c.stroke();
}
async function stop() {
 if(!stream&&!mic){el('start').disabled=false;el('stop').disabled=true;return;}
 const hadStarted=active;
 active=false;cancelAnimationFrame(raf);
 if(mic){try{await mic.pause();}catch{}mic=null;}
 if(ctx){try{await ctx.close();}catch{}ctx=null;}
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 if(session && hadStarted){
   if(session.currentStart!==null)session.speechEnd(performance.now());
   const result=session.report(performance.now());
   completedSessions.push(result);
   report={...result,completedSessions:completedSessions.slice(),measurementOnly:true};
   update();updateReportSummary();
 }
 session=null;
 el('start').disabled=false;el('stop').disabled=true;el('export').disabled=!report;
 status('종료되었습니다. 결과는 브라우저에만 있으며, 다운로드를 선택해야 JSON 파일이 생성됩니다.');
}
function tick(time) {
 if(!active)return;raf=requestAnimationFrame(tick);
 if(session&&detector&&analyser&&time-pitchTimer>90) {
  pitchTimer=time;const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);
  const [hz,clarity]=detector.findPitch(samples,ctx.sampleRate);
  // Display-quality gate from pitch estimation, not a medical cutoff.
  if(clarity>=0.9&&Number.isFinite(hz)&&hz>0&&session.currentStart!==null)session.pitchSample(time,hz,clarity);
 }
 update();
}
async function begin(){
 if(active||stream)return;
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){status('HTTPS와 마이크 권한이 필요합니다.');return;}
 el('start').disabled=true;report=null;session=null;el('export').disabled=true;updateReportSummary();status('사전학습 음성 모델을 불러오는 중입니다.');
 try{
  prepareAudioCapture();
  if(!window.vad?.MicVAD)throw Error('Silero VAD 라이브러리를 불러오지 못했습니다.');
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  report=null;
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  await ctx.resume();const source=ctx.createMediaStreamSource(stream);
  analyser=ctx.createAnalyser();analyser.fftSize=2048;
  const silent=ctx.createGain();silent.gain.value=0;source.connect(analyser);analyser.connect(silent);silent.connect(ctx.destination);
  const {PitchDetector}=await import('https://esm.sh/pitchy@4');
  detector=PitchDetector.forFloat32Array(analyser.fftSize);
  mic=await window.vad.MicVAD.new({
    model:'v5',startOnLoad:false,
    baseAssetPath:'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/',
    onnxWASMBasePath:'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/',
    getStream:async()=>stream,
    onSpeechStart:()=>session?.speechStart(performance.now()),
    onSpeechEnd:()=>session?.speechEnd(performance.now())
  });
  await mic.start();session=new SpeechSession(mode(),performance.now());active=true;el('stop').disabled=false;el('export').disabled=true;
  status('측정 중 · 시간별 발화 시작·종료 이벤트가 기록됩니다. 원본 음성은 저장하지 않습니다.');
  raf=requestAnimationFrame(tick);
 }catch(e){const reason=e?.message||String(e);await stop();
  if(/AudioSession category|audio capture/i.test(reason))status('마이크 오디오 세션 충돌: 브라우저에서 녹음용 오디오 세션을 설정하지 못했습니다. Safari/Chrome을 완전히 닫았다가 다시 열어주세요. ('+reason+')');
  else status('측정 시작 실패: '+reason);
 }
}
document.querySelectorAll('input[name="task"]').forEach(x=>x.addEventListener('change',()=>{
 if(active)return;el('prompt').textContent=TASKS[mode()].prompt;status('대기 중 · 선택한 과제의 측정 방법을 확인하세요.');
}));
el('start').addEventListener('click',begin);el('stop').addEventListener('click',stop);
el('export').addEventListener('click',()=>{
 if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kimse-speech-measurement.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream)stop();});
window.addEventListener('pagehide',()=>{if(stream)stop();});
el('version').textContent=SPEECH_DEMO_VERSION;
updateReportSummary();
