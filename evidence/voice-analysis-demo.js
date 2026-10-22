// KIMSE: common output from authenticated quick-test WAV or consent-bound Retell metadata.
const el = id => document.getElementById(id);
const API = 'https://api-kimse.suaveforge.com/api/v1/evidence/voice-analysis';
const prompts = {
  read: '오늘은 날씨가 맑아서 집 근처 공원을 천천히 걸었습니다.',
  vowel: "편한 목소리로 '아—'를 4~6초 동안 일정하게 발성하세요.",
  free: '최근에 있었던 일을 편하게 이야기해주세요.'
};
let stream=null, recorder=null, sound=null, previewUrl=null, report=null;
function identity(){
  try {
    const state=JSON.parse(localStorage.getItem('kimse.p0.state')||'{}');
    return state?.remote?.accountId && state?.remote?.token ?
      {accountId: state.remote.accountId, token:state.remote.token}:null;
  }catch{return null;}
}
const number = n => typeof n === 'number' && Number.isFinite(n);
function output(r){
  report=r;
  const p=r.pronunciation || {},d=r.responseDelay || {},t=r.vocalTremor || {};
  const score=p.scores?.accuracy;
  el('out-pron').textContent=p.status==='assessed'&&number(score)?score.toFixed(1)+'/100':'미측정';
  el('why-pron').textContent=p.status==='assessed'?
     'Azure 발음 평가 · 유창성 '+(number(p.scores?.fluency)?p.scores.fluency.toFixed(1):'미제공')+
     '/100 · 완성도 '+(number(p.scores?.completeness)?p.scores.completeness.toFixed(1):'미제공')+
     '/100 · 교육용 점수, 임상적 조음 정확도 아님':(p.reason||'실제 발음 평가 결과 없음');
  el('out-delay').textContent=d.status==='measured'&&number(d.medianLatencyMs)?
    (d.medianLatencyMs/1000).toFixed(2)+'초':'미측정';
  el('why-delay').textContent=d.status==='measured'?
     'Retell 질문→답변 '+d.observedCount+'회 · 근사 단어 시각 (청력·난도·연결시간 영향, 인지 지연 확정 아님)':
     (d.reason||'질문·답변 타임스탬프 없음');
  const fm=t.frequencyModulation?.peakRateHz,am=t.amplitudeModulation?.peakRateHz;
  el('out-tremor').textContent=t.status==='measured'?
     (number(fm)?fm.toFixed(2)+' Hz F0':'F0 변조율 미검출'):'미측정';
  el('why-tremor').textContent=t.status==='measured'?
    'Praat 모음 중간구간 3~12Hz 탐색 · 진폭 변조 '+(number(am)?am.toFixed(2)+'Hz':'미검출')+
    ' · 주기적 변조 후보(임상적 떨림 판정 아님)':
    (t.reason||'별도 지속 모음 발성 없음');
  el('evidence').textContent=JSON.stringify(r,null,2);
  el('download').disabled=false;
}
function cleanupPreview(){
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=null; const a=el('preview');a.pause();a.removeAttribute('src');a.hidden=true;
}
function newSound(blob){
  sound=blob;report=null;el('download').disabled=true;cleanupPreview();
  if(blob){previewUrl=URL.createObjectURL(blob);el('preview').src=previewUrl;el('preview').hidden=false;}
}
el('task').addEventListener('change',()=>{
  el('prompt').textContent=prompts[el('task').value];
  el('azure-consent').disabled=el('task').value!=='read';
  if(el('task').value!=='read')el('azure-consent').checked=false;
  newSound(null);el('audio-file').value='';
  el('quick-status').textContent='과제가 바뀌었습니다. 해당 과제 음성을 새로 준비해주세요.';
});
el('audio-file').addEventListener('change',()=>{
  newSound(el('audio-file').files?.[0]||null);
  el('quick-status').textContent=sound?'녹음 파일을 선택했습니다. 먼저 재생해 내용과 소리를 확인하세요.':'음성 파일 미선택';
});
el('record').addEventListener('click',async()=>{
  try{
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)throw Error('이 브라우저에서 녹음할 수 없습니다.');
    if(navigator.audioSession)try{navigator.audioSession.type='play-and-record';}catch{}
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    recorder=new MediaRecorder(stream);
    let fragments=[];
    recorder.ondataavailable=e=>{if(e.data?.size)fragments.push(e.data);};
    recorder.onstop=()=>{
      const blob=new Blob(fragments,{type:recorder.mimeType||'audio/webm'});
      newSound(blob);stream?.getTracks().forEach(t=>t.stop());stream=null;
      el('quick-status').textContent='녹음 완료. 원음 재생과 과제 확인 후 분석할 수 있습니다.';
    };
    newSound(null);el('audio-file').value='';recorder.start();
    el('record').disabled=true;el('stop').disabled=false;
    el('quick-status').textContent='녹음 중 · 종료를 누르세요.';
  }catch(error){
    stream?.getTracks().forEach(t=>t.stop());stream=null;
    el('quick-status').textContent='녹음 시작 실패: '+(error.message||error);
  }
});
el('stop').addEventListener('click',()=>{
  if(recorder?.state==='recording')recorder.stop();
  el('record').disabled=false;el('stop').disabled=true;
});
async function to16k(blob){
  const context=new (window.AudioContext||window.webkitAudioContext)();
  try{
    const decoded=await context.decodeAudioData(await blob.arrayBuffer());
    if(decoded.duration<1||decoded.duration>30)throw Error('1~30초 음성이 필요합니다.');
    const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);
    const src=offline.createBufferSource();src.buffer=decoded;src.connect(offline.destination);src.start();
    const result=await offline.startRendering();
    return result.getChannelData(0);
  }finally{await context.close().catch(()=>{});}
}
function wav16kBase64(audio){
  const b=new ArrayBuffer(44+audio.length*2),dv=new DataView(b);
  const text=(offset,value)=>{for(let i=0;i<value.length;i++)dv.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');dv.setUint32(4,b.byteLength-8,true);text(8,'WAVE');
  text(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);
  dv.setUint32(24,16000,true);dv.setUint32(28,32000,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);
  text(36,'data');dv.setUint32(40,audio.length*2,true);
  for(let i=0;i<audio.length;i++){
    const val=Math.max(-1,Math.min(1,Number(audio[i])||0));
    dv.setInt16(44+i*2,Math.round(val<0?val*32768:val*32767),true);
  }
  const bytes=new Uint8Array(b);let raw='';
  for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(raw);
}
async function apiCall(url,options){
  const response=await fetch(url,{cache:'no-store',...options});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(typeof body.detail==='string'?body.detail:'HTTP '+response.status);
  return body;
}
el('quick-analyze').addEventListener('click',async()=>{
  const status=el('quick-status'),person=identity(),button=el('quick-analyze');
  if(!person){status.textContent='낌새 앱에서 로그인해야 원음 분석 API를 사용할 수 있습니다.';return;}
  if(!sound){status.textContent='먼저 음성 파일을 선택하거나 녹음하세요.';return;}
  if(!el('server-consent').checked){status.textContent='낌새 서버 분석 동의가 필요합니다.';return;}
  if(el('task').value==='read'&&!el('azure-consent').checked){
    status.textContent='읽기 발음 점수에는 Azure 전송 동의가 필요합니다. 동의하지 않으면 발음은 미측정으로 반환됩니다.';
  }
  button.disabled=true;
  try{
    status.textContent='녹음 디코딩 및 WAV 변환 중…';
    const pcm=await to16k(sound);
    status.textContent='공통 분석 엔진 계산 중…';
    const result=await apiCall(API+'/quick',{method:'POST',headers:{'Content-Type':'application/json','X-KIMSE-ACCOUNT-TOKEN':person.token},
      body:JSON.stringify({
        account_id:person.accountId,task:el('task').value,audio_base64:wav16kBase64(pcm),
        consent_server_audio_processing:true,
        consent_azure_transfer:el('task').value==='read'&&el('azure-consent').checked
      })});
    output(result);status.textContent='통합 분석 완료 · 실제로 산출된 지표만 표시했습니다.';
  }catch(error){status.textContent='통합 분석 실패: '+(error.message||error);}
  finally{button.disabled=false;}
});
el('retell-analyze').addEventListener('click',async()=>{
  const person=identity(),callId=el('call-id').value.trim(),status=el('retell-status'),button=el('retell-analyze');
  if(!person){status.textContent='낌새 앱 로그인 후 진행하세요.';return;}
  if(!/^[A-Za-z0-9_-]{4,128}$/.test(callId)){status.textContent='정상적인 낌새 Retell 통화 ID를 입력하세요.';return;}
  button.disabled=true;
  try{
    status.textContent='동의된 통화 기록과 타임스탬프 조회 중…';
    const result=await apiCall(API+'/retell/'+encodeURIComponent(callId)+'?account_id='+encodeURIComponent(person.accountId),
      {headers:{'X-KIMSE-ACCOUNT-TOKEN':person.token}});
    output(result);status.textContent='Retell 통합 결과 표시 완료 · 시각은 공급자 근사치입니다.';
  }catch(error){status.textContent='Retell 분석 실패: '+(error.message||error);}
  finally{button.disabled=false;}
});
el('download').addEventListener('click',()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='kimse-three-voice-results.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
async function checkUnifiedEngine(){
 const quick=el('quick-analyze'),retell=el('retell-analyze');
 quick.disabled=true;retell.disabled=true;
 try{
  const r=await fetch(API+'/status',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(!data.ready||!Array.isArray(data.resultCategories)||data.resultCategories.length!==3)
    throw Error('분석 서버 응답 형식 오류');
  quick.disabled=false;retell.disabled=false;
  el('quick-status').textContent='분석 서버 연결됨 · 과제 음성을 녹음하거나 파일을 선택하세요.';
  el('retell-status').textContent='분석 서버 연결됨 · 동의된 Retell 통화 종료 후 기록을 조회할 수 있습니다.';
 }catch(e){
  el('quick-status').textContent='공통 분석 서버가 아직 준비되지 않았습니다: '+(e?.message||String(e));
  el('retell-status').textContent='공통 분석 서버 대기 중 · 서버 배포를 확인하세요.';
 }
}
checkUnifiedEngine();
window.addEventListener('pagehide',()=>{cleanupPreview();stream?.getTracks().forEach(t=>t.stop());});
const callId=new URLSearchParams(location.search).get('call_id');
if(callId&&/^[A-Za-z0-9_-]{4,128}$/.test(callId)){
  el('call-id').value=callId;el('retell-status').textContent='통화 ID가 연결됐습니다. 통화 종료 후 상담 기록 분석을 누르세요.';
}
