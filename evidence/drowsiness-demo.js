import {extractEyeRatios,buildCalibration,EyeApertureMeasurement,DROWSINESS_DEMO_VERSION} from './drowsiness-demo-core.mjs';
const $=id=>document.getElementById(id),video=$('camera'),canvas=$('overlay');
const meter=new EyeApertureMeasurement();
let stream=null,landmarker=null,frameId=0,active=false,phase='idle',samples=[],opened=[],stageAt=0,lastVideoTime=-1;
let launchId=0,audioCtx=null,previousClosed=false,lastToneAt=-Infinity;
function status(title,detail,level='waiting'){
  $('status-title').textContent=title;
  $('status-detail').textContent=detail;
  $('status').dataset.level=level;
}
function output(x){
  $('blink').textContent=x?.fractions?Math.round(50*(x.fractions.left+x.fractions.right))+'%':'—';
  $('duration').textContent=x?.ongoingClosureMs!==undefined?(x.ongoingClosureMs/1000).toFixed(2)+'초':'—';
  $('ratio').textContent=x?.referenceRatio!=null?(x.referenceRatio*100).toFixed(1)+'%':'—';
  $('coverage').textContent=x?.coverage!=null?(x.coverage*100).toFixed(0)+'%':'—';
  if($('events')) $('events').textContent=x?.events?.length?x.events.map(e=>(e.start/1000).toFixed(1)+'~'+(e.end/1000).toFixed(1)+'초').join(', '):'—';
}
function draw(points){
  const ctx=canvas.getContext('2d');
  if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  }
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!points)return;
  ctx.strokeStyle='#68ecd5';ctx.lineWidth=2;
  for(const group of [[33,160,158,133,153,144],[362,385,387,263,373,380]]){
    ctx.beginPath();
    group.forEach((i,j)=>{const p=points[i];if(j)ctx.lineTo(p.x*canvas.width,p.y*canvas.height);else ctx.moveTo(p.x*canvas.width,p.y*canvas.height);});
    ctx.closePath();ctx.stroke();
  }
}
// Presentation-only cues: none of these tones are clinical thresholds or drowsiness warnings.
// Use one unlocked HTMLAudioElement and one WAV sprite across iOS Safari/Chrome event callbacks.
const CUES=[
  {key:'start',notes:[[0,480,.12],[.14,610,.15]],duration:.34},
  {key:'open',notes:[[0,570,.15],[.18,700,.16]],duration:.39},
  {key:'closed',notes:[[0,720,.15],[.18,520,.17]],duration:.40},
  {key:'ready',notes:[[0,520,.11],[.14,650,.12],[.29,790,.16]],duration:.49},
  {key:'detect',notes:[[0,850,.13],[.19,890,.14]],duration:.39},
  {key:'notice',notes:[[0,490,.22]],duration:.29},
  {key:'error',notes:[[0,410,.17],[.22,330,.18]],duration:.45},
  {key:'stop',notes:[[0,590,.12],[.15,430,.17]],duration:.38}
];
const cueMap=Object.create(null);
let beepPlayer=null,beepUrl=null,cueToken=0,cueTimer=0,voiceAvailable=true;
let soundTestStep=0,faceLostAt=null,faceNoticeSent=false,lastErrorCueAt=-Infinity;
function playbackSession(){
  try{if(navigator.audioSession&&navigator.audioSession.type!=='playback')navigator.audioSession.type='playback';}
  catch(error){/* Older browsers have no audioSession */ }
}
function buildSprite(){
  const rate=24000;let total=0;
  for(const item of CUES){item.from=total;total+=item.duration+.26;item.to=item.from+item.duration;cueMap[item.key]=item;}
  const count=Math.ceil(total*rate),data=new ArrayBuffer(44+count*2),view=new DataView(data);
  const four=(offset,word)=>{for(let i=0;i<4;i++)view.setUint8(offset+i,word.charCodeAt(i));};
  four(0,'RIFF');view.setUint32(4,data.byteLength-8,true);four(8,'WAVE');
  four(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);
  view.setUint16(34,16,true);four(36,'data');view.setUint32(40,count*2,true);
  for(const item of CUES)for(const [at,hz,duration] of item.notes){
    const offset=Math.round((item.from+at)*rate),count=Math.round(duration*rate);
    for(let i=0;i<count;i++){
      const t=i/rate,envelope=Math.min(1,t/.014)*Math.min(1,(duration-t)/.04);
      const wave=Math.sin(2*Math.PI*hz*t)+.17*Math.sin(2*Math.PI*hz*2*t);
      const pos=44+(offset+i)*2,old=view.getInt16(pos,true);
      const next=old+Math.round(wave*envelope*9200);
      view.setInt16(pos,Math.max(-32767,Math.min(32767,next)),true);
    }
  }
  return new Blob([data],{type:'audio/wav'});
}
function mediaPlayer(){
  if(!beepPlayer){
    beepUrl=URL.createObjectURL(buildSprite());
    beepPlayer=new Audio(beepUrl);
    beepPlayer.preload='auto';
    beepPlayer.volume=1;
    beepPlayer.addEventListener('error',()=>{$('sound-test').textContent='소리 오류';});
  }
  return beepPlayer;
}
function unlockAudio(){
  playbackSession();
  const AudioCtor=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtor)return Promise.resolve(null);
  try{
    if(!audioCtx||audioCtx.state==='closed')audioCtx=new AudioCtor();
    return audioCtx.resume().then(()=>audioCtx).catch(()=>null);
  }catch(error){return Promise.resolve(null);}
}
function webFallback(key){
  if(!audioCtx||audioCtx.state!=='running')return false;
  const sound=cueMap[key];if(!sound)return false;
  try{
    for(const [at,hz,duration] of sound.notes){
      const begin=audioCtx.currentTime+.01+at,o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type='sine';o.frequency.setValueAtTime(hz,begin);
      g.gain.setValueAtTime(.0001,begin);
      g.gain.exponentialRampToValueAtTime(.17,begin+.02);
      g.gain.exponentialRampToValueAtTime(.0001,begin+duration);
      o.connect(g);g.connect(audioCtx.destination);
      o.start(begin);o.stop(begin+duration+.01);
    }
    return true;
  }catch(error){return false;}
}
function cueError(error,key){
  unlockAudio().then(()=>{
    if(!webFallback(key)){
      $('sound-test').textContent='소리 오류';
      status('소리 출력 실패','오디오가 재생되지 않았습니다.','alert');
    }
  });
}
function cue(key,force=false){
  if(!force&&!$('sound-enabled').checked)return false;
  const clip=CUES.find(s=>s.key===key);
  if(!clip)return false;
  playbackSession();
  const token=++cueToken;
  if(cueTimer){clearTimeout(cueTimer);cueTimer=0;}
  try{
    const p=mediaPlayer();
    p.pause();
    const playAtPosition=()=>{
      if(token!==cueToken)return;
      try{p.currentTime=clip.from;}catch(error){}
      const pending=p.play();
      if(pending&&typeof pending.then==='function'){
        pending.then(()=>{
          if(token!==cueToken)return;
          cueTimer=setTimeout(()=>{
            if(token===cueToken){
              p.pause();
              if($('sound-test').textContent==='재생 중…')$('sound-test').textContent='소리 확인';
            }
          },Math.ceil((clip.duration+.05)*1000));
        }).catch(error=>{if(token===cueToken)cueError(error,key);});
      }
    };
    if(p.readyState===0&&clip.from>0){
      // iOS cannot always seek before loadedmetadata.
      p.addEventListener('loadedmetadata',playAtPosition,{once:true});
      const pending=p.play();
      if(pending&&typeof pending.catch==='function')pending.catch(error=>cueError(error,key));
    }else playAtPosition();
    return true;
  }catch(error){cueError(error,key);return false;}
}
function speak(words){
  if(!$('sound-enabled').checked||!voiceAvailable||!('speechSynthesis' in window))return;
  try{
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(words);
    utterance.lang='ko-KR';utterance.rate=1.02;utterance.volume=1;
    window.speechSynthesis.speak(utterance);
  }catch(error){voiceAvailable=false;}
}
function announce(key,words){
  cue(key);
  if(words)speak(words);
}
const soundTests=[
  ['start','시작 안내음'],['open','눈 뜨기 안내음'],['closed','눈 감기 안내음'],
  ['ready','보정 완료음'],['detect','눈 감김 확인음'],['error','오류 안내음']
];
$('sound-test').addEventListener('click',()=>{
  const [key,label]=soundTests[soundTestStep%soundTests.length];
  soundTestStep++;
  unlockAudio().catch(()=>{});
  $('sound-test').textContent='재생 중…';
  cue(key,true);
  if(!active)status('소리 확인 · '+label,'한 번 더 누르면 다음 소리를 재생합니다.','normal');
});
function stop(showStatus=true){
  if(showStatus&&active)announce('stop');
  if(!showStatus){
    ++cueToken;
    if(cueTimer){clearTimeout(cueTimer);cueTimer=0;}
    if(beepPlayer)beepPlayer.pause();
  }
  if('speechSynthesis' in window)window.speechSynthesis.cancel();
  faceLostAt=null;faceNoticeSent=false;lastErrorCueAt=-Infinity;
  ++launchId;
  active=false;cancelAnimationFrame(frameId);
  frameId=0;lastVideoTime=-1;previousClosed=false;lastToneAt=-Infinity;
  if(stream)stream.getTracks().forEach(t=>t.stop());
  stream=null;video.pause();video.srcObject=null;
  if(landmarker){try{landmarker.close();}catch(error){}landmarker=null;}
  meter.reset();meter.calibration=null;
  phase='idle';samples=[];opened=[];output(null);
  $('visual').dataset.active='false';
  $('start').disabled=false;$('start').textContent='카메라 시작';
  $('stop').disabled=true;
  if(showStatus)status('카메라 중지됨','다시 시작할 수 있습니다.');
}
function loop(id){
  if(!active||launchId!==id)return;
  frameId=requestAnimationFrame(()=>loop(id));
  if(video.readyState<2||video.currentTime===lastVideoTime)return;
  lastVideoTime=video.currentTime;
  const now=performance.now();
  try{
    const result=landmarker.detectForVideo(video,now);
    const points=result.faceLandmarks?.length===1?result.faceLandmarks[0]:null;
    const ratios=points?extractEyeRatios(points):null;
    draw(points);
    if(!ratios){
      if(faceLostAt===null)faceLostAt=now;
      if(!faceNoticeSent&&now-faceLostAt>=2000){faceNoticeSent=true;announce('notice','얼굴을 화면에 맞춰주세요.');}
      meter.invalidate();
      previousClosed=false;
      status('얼굴을 찾는 중','얼굴이 화면에 보이도록 정면을 바라보세요.');
      return;
    }
    faceLostAt=null;faceNoticeSent=false;
    if(phase==='open'||phase==='closed'){
      samples.push(ratios);
      if(now-stageAt>=2200){
        if(samples.length<8){
          samples=[];stageAt=now;
          status('보정 재시도','얼굴을 정면에서 다시 보여주세요.');
          return;
        }
        if(phase==='open'){
          opened=samples;phase='closed';samples=[];stageAt=now;
          status('보정 2/2 · 눈 감기','이제 눈을 감고 약 2초 유지하세요.');announce('closed','이제 눈을 감으세요.');
        }else{
          try{
            meter.setCalibration(buildCalibration(opened,samples));
            phase='measure';previousClosed=false;
            status('실시간 분석 중','눈을 감으면 측정값과 소리로 알려줍니다.','normal');
            announce('ready','보정이 완료되었습니다.');
          }catch(error){
            phase='open';stageAt=now;
            status('보정 재시도','눈을 뜨고 정면을 바라보세요.');
            announce('notice','눈을 뜨고 다시 정면을 바라보세요.');
          }
          samples=[];
        }
      }
      return;
    }
    if(phase==='measure'){
      const measurement=meter.update(now,ratios);
      output(measurement);
      if(measurement.referenceClosure&&!previousClosed&&now-lastToneAt>900){
        if(cue('detect'))lastToneAt=now;
      }
      previousClosed=!!measurement.referenceClosure;
      status(measurement.referenceClosure?'눈 감김 관찰 중':'실시간 측정 중',
        measurement.referenceClosure?'눈 감김에 따른 체험용 소리입니다. 졸음 경고가 아닙니다.'
          :measurement.coverage>=0.5?'눈을 감았다 뜨며 변화를 확인하세요.':'관측 구간을 쌓고 있습니다.',
        'normal');
    }
  }catch(error){
    if(now-lastErrorCueAt>=10000){lastErrorCueAt=now;announce('error');}
    meter.invalidate();previousClosed=false;
    status('분석 오류','카메라 화면과 조명을 확인한 후 다시 시도하세요.','alert');
  }
}
$('start').addEventListener('click',async()=>{
  if(active||$('start').disabled)return;
  const id=++launchId;
  $('start').disabled=true;$('start').textContent='준비 중…';$('stop').disabled=false;
  status('카메라 준비 중','카메라 권한을 허용하세요.');
  // Call unlockAudio immediately while the click's iOS user activation is valid.
  if($('sound-enabled').checked){
    playbackSession();
    cue('start'); // Direct tap primes the same media element for later alerts on iOS.
    unlockAudio().catch(()=>{});
  }
  try{
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('HTTPS와 카메라 권한이 필요합니다.');
    const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});
    if(id!==launchId){acquired.getTracks().forEach(t=>t.stop());return;}
    stream=acquired;video.srcObject=stream;
    await video.play();
    if(id!==launchId)return;
    status('AI 모델 준비 중','처음 한 번 모델 파일을 불러옵니다.');
    const mod=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/vision_bundle.mjs');
    const resolver=await mod.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm');
    const created=await mod.FaceLandmarker.createFromOptions(resolver,{
      baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'CPU'},
      runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:false
    });
    if(id!==launchId){created.close();return;}
    landmarker=created;active=true;phase='open';stageAt=performance.now();lastVideoTime=-1;
    $('visual').dataset.active='true';$('start').textContent='측정 중';
    status('보정 1/2 · 눈 뜨기','눈을 자연스럽게 뜨고 약 2초 정면을 보세요.');
    announce('open','눈을 뜨고 정면을 바라보세요.');
    stream.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{if(id===launchId)stop();},{once:true}));
    loop(id);
  }catch(error){
    if(id!==launchId)return;
    stop(false);
    const denied=['NotAllowedError','PermissionDeniedError'].includes(error?.name);
    status('시작 실패',denied?'카메라 권한을 허용한 뒤 다시 시도하세요.':error.message||'모델 또는 카메라 준비에 실패했습니다.','alert');
    announce('error');
  }
});
$('stop').addEventListener('click',()=>stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(active||stream))stop(false);});
window.addEventListener('pagehide',()=>{stop(false);if(beepPlayer)beepPlayer.pause();if(beepUrl)URL.revokeObjectURL(beepUrl);beepPlayer=null;beepUrl=null;});
$('engine-version').textContent=DROWSINESS_DEMO_VERSION;