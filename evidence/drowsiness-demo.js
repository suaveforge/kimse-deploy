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
// On iOS browsers WebAudio must be unlocked in a direct user-initiated click.
// The same unlocked context is reused for later camera-driven feedback.
function unlockAudio(){
  const AudioCtor=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtor)return Promise.reject(new Error('이 브라우저는 소리 재생을 지원하지 않습니다.'));
  try{
    if(!audioCtx||audioCtx.state==='closed')audioCtx=new AudioCtor();
    return audioCtx.resume().then(()=>{
      if(audioCtx.state!=='running')throw new Error('소리를 시작할 수 없습니다. 기기 음량을 확인하세요.');
      return audioCtx;
    });
  }catch(error){return Promise.reject(error);}
}
function tone(force=false,frequency=770){
  if((!force&&!$('sound-enabled').checked)||!audioCtx||audioCtx.state!=='running')return false;
  try{
    const start=audioCtx.currentTime+0.005;
    const oscillator=audioCtx.createOscillator(),gain=audioCtx.createGain();
    oscillator.type='sine';
    oscillator.frequency.setValueAtTime(frequency,start);
    oscillator.frequency.linearRampToValueAtTime(frequency+70,start+0.13);
    gain.gain.setValueAtTime(0.0001,start);
    gain.gain.exponentialRampToValueAtTime(0.22,start+0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001,start+0.24);
    oscillator.connect(gain);gain.connect(audioCtx.destination);
    oscillator.start(start);oscillator.stop(start+0.25);
    return true;
  }catch(error){return false;}
}
$('sound-test').addEventListener('click',()=>{
  unlockAudio().then(()=>{
    if(tone(true,660)){
      status('소리 테스트 재생','소리가 안 들리면 아이폰 미디어 음량과 출력 기기를 확인하세요.','normal');
    }else status('소리 재생 실패','아이폰 음량이나 브라우저 오디오 제한을 확인하세요.','alert');
  }).catch(error=>status('소리 재생 불가',error.message,'alert'));
});
function stop(showStatus=true){
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
      meter.invalidate();
      previousClosed=false;
      status('얼굴을 찾는 중','얼굴이 화면에 보이도록 정면을 바라보세요.');
      return;
    }
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
          status('보정 2/2 · 눈 감기','이제 눈을 감고 약 2초 유지하세요.');tone(false,520);
        }else{
          try{
            meter.setCalibration(buildCalibration(opened,samples));
            phase='measure';previousClosed=false;
            status('실시간 분석 중','눈을 감으면 측정값과 소리로 알려줍니다.','normal');
            tone(false,800);
          }catch(error){
            phase='open';stageAt=now;
            status('보정 재시도','눈을 뜨고 정면을 바라보세요.');
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
        if(tone())lastToneAt=now;
      }
      previousClosed=!!measurement.referenceClosure;
      status(measurement.referenceClosure?'눈 감김 관찰 중':'실시간 측정 중',
        measurement.referenceClosure?'눈 감김에 따른 체험용 소리입니다. 졸음 경고가 아닙니다.'
          :measurement.coverage>=0.5?'눈을 감았다 뜨며 변화를 확인하세요.':'관측 구간을 쌓고 있습니다.',
        'normal');
    }
  }catch(error){
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
  if($('sound-enabled').checked)unlockAudio().then(()=>{if(id===launchId)tone(false,620);}).catch(()=>{});
  try{
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('HTTPS와 카메라 권한이 필요합니다.');
    const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});
    if(id!==launchId){acquired.getTracks().forEach(t=>t.stop());return;}
    stream=acquired;video.srcObject=stream;
    await video.play();
    if(id!==launchId)return;
    status('AI 모델 준비 중','처음 한 번 모델 파일을 불러옵니다.');
    const mod=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm');
    const resolver=await mod.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');
    const created=await mod.FaceLandmarker.createFromOptions(resolver,{
      baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'CPU'},
      runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:false
    });
    if(id!==launchId){created.close();return;}
    landmarker=created;active=true;phase='open';stageAt=performance.now();lastVideoTime=-1;
    $('visual').dataset.active='true';$('start').textContent='측정 중';
    status('보정 1/2 · 눈 뜨기','눈을 자연스럽게 뜨고 약 2초 정면을 보세요.');
    stream.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{if(id===launchId)stop();},{once:true}));
    loop(id);
  }catch(error){
    if(id!==launchId)return;
    stop(false);
    const denied=['NotAllowedError','PermissionDeniedError'].includes(error?.name);
    status('시작 실패',denied?'카메라 권한을 허용한 뒤 다시 시도하세요.':error.message||'모델 또는 카메라 준비에 실패했습니다.','alert');
  }
});
$('stop').addEventListener('click',()=>stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(active||stream))stop();});
window.addEventListener('pagehide',()=>stop(false));
$('engine-version').textContent=DROWSINESS_DEMO_VERSION;