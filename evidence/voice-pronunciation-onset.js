"use strict";
// Beta-only client. Audio stays in memory until the user explicitly submits a take.
(() => {
const $=id=>document.getElementById(id);
const BASE="https://api-kimse.suaveforge.com/api/v1/evidence/voice-analysis/beta";
const state={takes:{},active:null,selected:null,ready:false,meterCtx:null,raf:0,stream:null,recorder:null,timer:0,signalTimer:0,liveAnalyser:null,started:false};
const resetCanvas=id=>{const c=$(id),ctx=c.getContext("2d");if(ctx){ctx.clearRect(0,0,c.width,c.height)}};
const setStatus=(id,msg,error=false)=>{$(id).textContent=msg;$(id).className="status"+(error?" error":"")};
const now=()=>performance.now();
function buttons(){
  const active=!!state.active;
  $("record-a").disabled=active;$("record-b").disabled=active;$("record-stop").disabled=!active;
  $("use-a").disabled=active||!state.takes.A;$("use-b").disabled=active||!state.takes.B;
  $("run-azure").disabled=active||!state.ready||!state.selected||!$("azure-consent").checked;
}
function closeTracks(){
  if(state.timer)clearTimeout(state.timer);state.timer=0;
  if(state.signalTimer)clearTimeout(state.signalTimer);state.signalTimer=0;
  if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;
  if(state.meterCtx){state.meterCtx.close().catch(()=>{});state.meterCtx=null}
  if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null}
  state.liveAnalyser=null;state.recorder=null;
  resetCanvas("live-wave");
}
function drawLive(){
  const c=$("live-wave"),ctx=c.getContext("2d"),a=state.liveAnalyser;
  if(!ctx||!a||!state.active)return;
  const bytes=new Uint8Array(a.fftSize);a.getByteTimeDomainData(bytes);
  let total=0;for(let i=0;i<bytes.length;i++){const d=(bytes[i]-128)/128;total+=d*d}
  const rms=Math.sqrt(total/bytes.length),w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#168476";
  for(let i=0;i<36;i++){
    const height=Math.min(h-12,7+rms*310*(.6+.4*Math.sin(i*.5)**2));
    ctx.fillRect(i*w/36+2,(h-height)/2,w/36-4,height)
  }
  state.raf=requestAnimationFrame(drawLive);
}
async function attachMeter(stream){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  try{
    const ctx=new AC();state.meterCtx=ctx;
    await ctx.resume();if(!state.active||state.stream!==stream)return;
    const analyser=ctx.createAnalyser();analyser.fftSize=1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    state.liveAnalyser=analyser;drawLive()
  }catch{state.liveAnalyser=null}
}
function cue(label,delay){
  $("go-signal").textContent=delay?"녹음 중 · 1.5초 후 문장이 나타납니다":"지금 문장을 읽어 주세요!";
  $("go-signal").classList.toggle("ready",!delay);
  $("read-stimulus").hidden=!!delay;
  if(delay){
    state.signalTimer=setTimeout(()=>{
      if(state.active===label&&state.started){
        $("go-signal").textContent="지금 문장을 읽어 주세요!";
        $("go-signal").classList.add("ready");
        $("read-stimulus").hidden=false;
      }
    },delay);
  }
}
async function recording(label){
  if(state.active)return;
  // Prior WAV remains in browser memory even if the replacement recording fails.
  state.active=label;state.started=false;$("read-stimulus").hidden=true;buttons();
  setStatus("capture-status",label+" 마이크 권한 확인 중…");
  try{
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error("이 브라우저는 녹음을 지원하지 않습니다.");
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    if(state.active!==label){stream.getTracks().forEach(t=>t.stop());return}
    state.stream=stream;
    const rec=new MediaRecorder(stream);state.recorder=rec;
    const chunks=[];
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    rec.onstart=()=>{
      if(state.active!==label)return;
      if(!stream.getAudioTracks().some(t=>t.readyState!=="ended")){rec.stop();return}
      state.started=true;
      cue(label,label==="B"?1500:0);
      setStatus("capture-status",label+" 녹음 중. 문장을 끝까지 읽은 후 녹음 종료를 누르세요.");
      attachMeter(stream);
      state.timer=setTimeout(()=>{if(state.recorder?.state==="recording")state.recorder.stop()},27000);
    };
    rec.onstop=async()=>{
      if(state.active!==label)return;
      const confirmed=state.started;
      const blob=new Blob(chunks,{type:rec.mimeType||chunks[0]?.type||"audio/mp4"});
      closeTracks();state.active=null;buttons();
      if(!confirmed||!blob.size){setStatus("capture-status","실제 녹음을 확인할 수 없거나 음성 자료가 없습니다. 다시 시도해 주세요.",true);return}
      setStatus("capture-status",label+" 녹음 완료. 첫부분 파형을 분석 중입니다.");
      try{
        const samples=await decode16k(blob);
        if(samples.length<16000||samples.length>28.9*16000)throw Error("1~28초 녹음만 비교할 수 있습니다.");
        const old=state.takes[label];if(old?.url)URL.revokeObjectURL(old.url);
        const url=URL.createObjectURL(blob);
        state.takes[label]={blob,samples,url,metrics:firstSignalMetrics(samples)};
        $("audio-"+label.toLowerCase()).src=url;$("audio-"+label.toLowerCase()).hidden=false;
        plotSamples("wave-"+label.toLowerCase(),samples);
        const q=state.takes[label].metrics;
        $("stats-"+label.toLowerCase()).textContent="실제 파일 "+(samples.length/16000).toFixed(2)+"초 · 첫 0.25초 RMS "+q.firstQuarterRms.toFixed(4)+" · 큰 입력 후보 "+(q.onsetCandidateMs===null?"없음":(q.onsetCandidateMs/1000).toFixed(2)+"초")+
          " · 오디오 시작 구간 표본 손실 여부는 파형·청취로 확인 필요";
        $("go-signal").textContent=label+" 녹음 완료";$("go-signal").classList.remove("ready");$("read-stimulus").hidden=true;
        setStatus("capture-status",label+" 녹음·PCM 변환 완료. 파형과 녹음을 확인하세요.");
        buttons();
      }catch(e){setStatus("capture-status","녹음 파일 PCM 변환 실패: "+(e?.message||"지원되지 않는 형식"),true)}
    };
    rec.onerror=()=>{closeTracks();state.active=null;buttons();setStatus("capture-status","녹음기에 오류가 발생했습니다.",true)};
    rec.start();
  }catch(e){closeTracks();state.active=null;buttons();setStatus("capture-status","녹음 시작 실패: "+(e?.message||"마이크 접근 실패"),true)}
}
async function decode16k(blob){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC||!window.OfflineAudioContext)throw Error("WebAudio 지원 불가");
  const c=new AC();
  try{
    const original=await c.decodeAudioData(await blob.arrayBuffer());
    if(!original?.length||!original.duration||original.duration>29)throw Error("녹음 길이 확인 실패");
    const offline=new OfflineAudioContext(1,Math.ceil(original.duration*16000),16000);
    const source=offline.createBufferSource();source.buffer=original;
    source.connect(offline.destination);source.start();
    return (await offline.startRendering()).getChannelData(0).slice();
  }finally{await c.close().catch(()=>{})}
}
function firstSignalMetrics(samples){
  // RMS amplitude candidate only: breathing and ambient noise can trigger it.
  const step=320,windowCount=Math.ceil(samples.length/step),rms=[];
  for(let i=0;i<windowCount;i++){
    let sum=0,n=0;for(let j=i*step;j<Math.min(samples.length,(i+1)*step);j++){sum+=samples[j]*samples[j];n++}
    rms.push(Math.sqrt(sum/Math.max(1,n)));
  }
  const baseline=(rms.slice(0,10).sort((a,b)=>a-b)[Math.floor(Math.min(rms.length,10)/2)]||0);
  const threshold=Math.max(.013,baseline*3.5);
  let onset=null;
  for(let i=0;i<rms.length-2;i++){
    if(rms[i]>threshold&&rms[i+1]>threshold&&rms[i+2]>threshold){onset=i*20;break}
  }
  const start=samples.slice(0,Math.min(samples.length,4000));
  const firstQuarterRms=Math.sqrt(start.reduce((s,v)=>s+v*v,0)/Math.max(1,start.length));
  return {onsetCandidateMs:onset,firstQuarterRms,threshold};
}
function plotSamples(id,samples){
  const c=$(id),ctx=c.getContext("2d");if(!ctx)return;
  const w=c.width,h=c.height,frames=Math.min(samples.length,40000);
  ctx.clearRect(0,0,w,h);ctx.fillStyle="#eef6f2";ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#9bb4a9";ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
  ctx.strokeStyle="#107c6b";ctx.lineWidth=1;
  for(let x=0;x<w;x++){
    const left=Math.floor(frames*x/w),right=Math.max(left+1,Math.floor(frames*(x+1)/w));
    let low=1,high=-1;
    for(let i=left;i<right;i++){const v=samples[i];if(v<low)low=v;if(v>high)high=v}
    ctx.beginPath();ctx.moveTo(x,h*(1-high)/2);ctx.lineTo(x,h*(1-low)/2);ctx.stroke()
  }
  ctx.fillStyle="#526d63";ctx.font="12px system-ui";
  ctx.fillText("0초",7,h-8);ctx.fillText((frames/16000).toFixed(2)+"초",w-55,h-8);
}
function wavBase64(samples){
  const len=44+samples.length*2,buf=new ArrayBuffer(len),view=new DataView(buf);
  const word=(at,str)=>{for(let i=0;i<str.length;i++)view.setUint8(at+i,str.charCodeAt(i))};
  word(0,"RIFF");view.setUint32(4,len-8,true);word(8,"WAVE");word(12,"fmt ");view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);
  view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  word(36,"data");view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){
    const v=Math.max(-1,Math.min(1,samples[i]));
    view.setInt16(44+i*2,Math.round(v<0?v*32768:v*32767),true);
  }
  const bytes=new Uint8Array(buf);let raw="";
  for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(raw);
}
async function apiStatus(){
  try{
    const res=await fetch(BASE+"/status",{cache:"no-store"});
    const body=await res.json();
    if(!res.ok||body?.ready!==true){throw Error("베타 API 미배포 또는 비활성화")}
    if(body?.onsetAzureEnabled!==true){
      state.ready=false;setStatus("azure-status","베타 서버는 연결됐지만 첫 단어 Azure 비교 기능이 비활성화돼 있습니다. 로컬 A/B 파형은 사용할 수 있습니다.",true);
    }else{
      state.ready=true;setStatus("azure-status","베타 Azure 분석 준비됨 · 동의 후 동일 음원 원본/무음 추가본을 비교할 수 있습니다.");
    }
  }catch{
    state.ready=false;setStatus("azure-status","베타 API가 아직 연결되지 않았습니다. 현재 A/B 녹음과 파형 비교만 사용할 수 있습니다. 안정판 API로 우회 전송하지 않습니다.",true)
  }finally{buttons()}
}
const safe=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function showAzure(data){
 const root=$("azure-result");root.hidden=false;
 const p=data?.pronunciationOnsetComparison;
 if(!p){root.textContent="Azure 비교 결과를 반환받지 못했습니다.";return}
 const variants=[p.original,p.padded500ms];
 const rows=variants.map((v,i)=>{
   const word=v?.firstWord||{};
   return "<tr><td>"+(i?"0.5초 무음 추가":"원본")+"</td><td>"+safe(word.word||"미측정")+"</td><td>"+
     (typeof word.accuracy==="number"?word.accuracy.toFixed(1):"미측정")+"</td><td>"+
     (typeof word.startMs==="number"?(word.startMs/1000).toFixed(2)+"초":"미측정")+"</td><td>"+
     safe(word.errorType||"없음")+"</td></tr>";
 }).join("");
 root.innerHTML='<div class="table-scroll"><table><thead><tr><th>조건</th><th>Azure 첫 단어</th><th>점수</th><th>위치</th><th>오류 유형</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<p class="sub" style="margin-top:10px">동일한 발화에 무음만 추가한 비교입니다. 점수 변화는 경계 민감도 후보이며 발음 오류 또는 시스템 결함의 확정은 아닙니다.</p>';
}
async function compareAzure(){
 if(!state.ready||!state.selected||!$("azure-consent").checked)return;
 const take=state.takes[state.selected];if(!take)return;
 $("run-azure").disabled=true;
 setStatus("azure-status","Azure에 원본과 무음 추가본을 각각 평가 요청 중…");
 try{
   const body={audio_base64:wavBase64(take.samples),consent_server_audio_processing:true,
     consent_azure_transfer:true};
   const res=await fetch(BASE+"/pronunciation-onset/guest",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error("베타 Azure 비교 오류 ("+res.status+")");
   showAzure(data);
   setStatus("azure-status","두 Azure 비교 응답을 받았습니다. 결과를 확인하세요.");
 }catch(e){setStatus("azure-status",e?.message||"Azure 비교 실패",true)}
 finally{buttons()}
}
function clearAll(){
 if(state.recorder?.state==="recording")state.recorder.stop();
 closeTracks();state.active=null;
 for(const take of Object.values(state.takes)){if(take?.url)URL.revokeObjectURL(take.url)}
 state.takes={};state.selected=null;state.started=false;
 for(const label of ["a","b"]){resetCanvas("wave-"+label);$("audio-"+label).removeAttribute("src");$("audio-"+label).hidden=true;$("stats-"+label).textContent="녹음 전"}
 $("which-audio").textContent="비교할 녹음을 선택해 주세요.";
 $("azure-result").hidden=true;$("azure-result").textContent="";
 $("go-signal").textContent="녹음 방식을 선택해 주세요";$("go-signal").classList.remove("ready");$("read-stimulus").hidden=true;
 setStatus("capture-status","로컬 녹음 자료를 삭제했습니다.");
 buttons();
}
$("record-a").addEventListener("click",()=>recording("A"));
$("record-b").addEventListener("click",()=>recording("B"));
$("record-stop").addEventListener("click",()=>{if(state.recorder?.state==="recording")state.recorder.stop()});
for(const name of ["A","B"]){
 $("use-"+name.toLowerCase()).addEventListener("click",()=>{
   if(!state.takes[name])return;
   state.selected=name;$("which-audio").textContent=name+" 녹음을 선택했습니다.";
   $("azure-result").hidden=true;buttons()
 })
}
$("azure-consent").addEventListener("change",buttons);
$("run-azure").addEventListener("click",compareAzure);
$("clear-all").addEventListener("click",clearAll);
window.addEventListener("pagehide",closeTracks);
buttons();apiStatus();
})();