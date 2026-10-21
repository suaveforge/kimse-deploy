import {SpeechSession,TASKS,SPEECH_DEMO_VERSION} from './speech-demo-core.mjs';
const el=id=>document.getElementById(id),mode=()=>document.querySelector('input[name="task"]:checked')?.value||'free';
let stream=null,mic=null,ctx=null,analyser=null,detector=null,pitchTimer=0,raf=0,session=null,active=false,report=null;
const status=s=>{el('status').textContent=s;}, sec=ms=>(ms/1000).toFixed(1)+'초';
function update() {
 if(!session)return;
 const r=session.report(performance.now());
 el('elapsed').textContent=sec(r.durationMs);
 el('latency').textContent=r.firstSpeechDelayMs===null?'아직 없음':sec(r.firstSpeechDelayMs);
 el('segments').textContent=String(r.segmentCount);
 el('pauses').textContent=r.meanGapMs===null?'기록 없음':sec(r.meanGapMs);
 el('speech-total').textContent=sec(r.detectedDurationMs);
 el('f0').textContent=r.pitch?.summary.medianHz?Math.round(r.pitch.summary.medianHz)+' Hz':'해당 없음';
 el('timeline').textContent=r.detectedSegments.length?r.detectedSegments.map(s=>(s.startMs/1000).toFixed(1)+'~'+(s.endMs/1000).toFixed(1)+'초').join(' · '):'아직 완료된 발화 구간 없음';
 renderPitch(r.pitch?.points||[]);
}
function renderPitch(points) {
 const canvas=el('pitch-chart'),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.clearRect(0,0,w,h);c.fillStyle='#f6faf9';c.fillRect(0,0,w,h);c.strokeStyle='#d5e6e0';c.strokeRect(1,1,w-2,h-2);
 if(points.length<2)return;
 const start=points[0].atMs,end=Math.max(start+1,points.at(-1).atMs),v=points.map(x=>x.hz),low=Math.min(...v),high=Math.max(low+1,...v);
 c.strokeStyle='#087e70';c.lineWidth=2;c.beginPath();
 for(let i=0;i<points.length;i++){const p=points[i];const x=12+(w-24)*(p.atMs-start)/(end-start),y=h-10-(h-20)*(p.hz-low)/(high-low);
 if(!i)c.moveTo(x,y);else c.lineTo(x,y);
 }c.stroke();
}
async function stop() {
 if(!stream&&!mic){el('start').disabled=false;el('stop').disabled=true;return;}
 active=false;cancelAnimationFrame(raf);
 if(mic){try{await mic.pause();}catch{}mic=null;}
 if(ctx){try{await ctx.close();}catch{}ctx=null;}
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 if(session){report=session.report(performance.now());update();}
 el('start').disabled=false;el('stop').disabled=true;el('export').disabled=!report;
 status('종료되었습니다. 결과는 브라우저에만 있으며, 다운로드를 선택해야 JSON 파일이 생성됩니다.');
}
function tick(time) {
 if(!active)return;raf=requestAnimationFrame(tick);
 if(session?.task==='vowel'&&detector&&analyser&&time-pitchTimer>110) {
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
 el('start').disabled=true;status('사전학습 음성 모델을 불러오는 중입니다.');
 try{
  if(!window.vad?.MicVAD)throw Error('Silero VAD 라이브러리를 불러오지 못했습니다.');
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  report=null;
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  await ctx.resume();const source=ctx.createMediaStreamSource(stream);
  analyser=ctx.createAnalyser();analyser.fftSize=2048;
  const silent=ctx.createGain();silent.gain.value=0;source.connect(analyser);analyser.connect(silent);silent.connect(ctx.destination);
  if(mode()==='vowel'){
    const {PitchDetector}=await import('https://esm.sh/pitchy@4');
    detector=PitchDetector.forFloat32Array(analyser.fftSize);
  }else detector=null;
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
 }catch(e){const reason=e?.message||String(e);await stop();status('측정 시작 실패: '+reason);}
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
