import {GPCOG_SANDBOX_VERSION,PATIENT_ITEMS,INFORMANT_ITEM_IDS,gradeGpcog,describeSpeechMeasurements,suggestExactRecallMatches,makeSyntheticScenario} from './cognitive-scoring-core.mjs';
import {READING_REFERENCE_TEXT,compareReadingText,readingEvidenceFromSessions} from './pronunciation-evidence.mjs';
const el=id=>document.getElementById(id);
const patient=Array(9).fill(null),informant=Array(6).fill(null);
let importedSpeech=[],sample=false,lastASR=null,lastResult=null,micStream=null,recorder=null,recordedBlob=null,pipelinePromise=null,pipelineModel=null,previewUrl=null,lastReadingComparison=null,lastReadingAcoustics=null;
el('reading-reference').textContent=READING_REFERENCE_TEXT;
function showAudioPreview(blob){
 const player=el('audio-preview');if(!player)return;
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
 if(blob){previewUrl=URL.createObjectURL(blob);player.src=previewUrl;player.hidden=false;}
 else{player.removeAttribute('src');player.hidden=true;}
}
window.addEventListener('pagehide',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);if(micStream)micStream.getTracks().forEach(t=>t.stop());});
const pgrid=el('patient-grid'),igrid=el('informant-grid'),targetInputs=el('target-inputs');
function row(container,i,label,items,onSelect) {
 const div=document.createElement('div');div.className='grid-item';
 const title=document.createElement('label');title.textContent=label;
 const select=document.createElement('select');select.setAttribute('aria-label',label);
 for(const [value,name] of items){
  const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);
 }
 select.addEventListener('change',()=>{sample=false;onSelect(select.value||null);});
 div.append(title,select);container.append(div);return select;
}
const pselect=PATIENT_ITEMS.map((v,i)=>row(pgrid,i,(i+1)+'. '+v.label,[['','미입력'],['correct','정답 1점'],['incorrect','오답 0점']],x=>{patient[i]=x;}));
const isend=INFORMANT_ITEM_IDS.map((_,i)=>row(igrid,i,(i+1)+'. 보호자 평가 항목 '+(i+1),[['','미입력'],['yes','예: 변화 있음'],['no','아니요'],['unknown','모르겠음'],['na','해당 없음']],x=>{informant[i]=x;}));
const targets=[];
for(let i=0;i<5;i++){
 const input=document.createElement('input');input.type='text';input.placeholder='기준 요소 '+(i+1)+' (평가자가 입력)';input.setAttribute('aria-label','회상 목표 요소 '+(i+1));input.style.marginBottom='5px';targets.push(input);targetInputs.append(input);
}
function refreshScore(){
 lastResult=gradeGpcog({patient,informant});
 const x=lastResult,syntheticPrefix=sample?'[완전 가상 사례] ':'';
 const scoreTxt=x.patientScore===null?'—':x.patientScore+'/9',informantTxt=x.informantScore===null?'—':x.informantScore+'/6';
 el('score-result').textContent=syntheticPrefix+'환자 '+scoreTxt+' · 보호자 '+informantTxt+'\n'+x.interpretation+'\n음성 특징은 공식 GPCOG 점수 계산에 합산하지 않음.';
 el('score-result').style.whiteSpace='pre-line';
}
el('calculate').addEventListener('click',refreshScore);
el('synthetic').addEventListener('click',()=>{
 const scenario=makeSyntheticScenario();sample=true;
 scenario.patient.forEach((x,i)=>{patient[i]=x;pselect[i].value=x;});
 scenario.informant.forEach((x,i)=>{informant[i]=x;isend[i].value=x;});
 refreshScore();
 const immediate=el('synthetic-feedback');
 immediate.hidden=false;
 immediate.textContent='가상 사례 계산 완료: 환자 5/9점 → 보호자 면담 4/6점 → 공식 규칙상 선별검사에서 유의한 인지저하 징후가 나타나지 않은 구간 (임상 검사·진단 아님).';
 el('match-result').textContent='가상 사례를 채점 항목에 입력했습니다. 실제 음성·환자 상태와 무관합니다.';
});
el('speech-json').addEventListener('change',async()=>{
 const file=el('speech-json').files?.[0];if(!file)return;
 if(file.size>2000000){el('speech-evidence').textContent='파일 크기가 2MB를 초과합니다.';return;}
 try{
 const data=JSON.parse(await file.text()),out=describeSpeechMeasurements(data);
 importedSpeech=out;
 lastReadingAcoustics=readingEvidenceFromSessions(data);
 el('speech-evidence').textContent=out.length?
  out.map(x=>x.taskLabel+': 발화 '+(x.segmentCount??'—')+'구간 / 평균 쉼 '+(x.meanGapMs===null?'미측정':x.meanGapMs+'ms')+' / F0 '+(x.pitchMedianHz===null?'미측정':x.pitchMedianHz+'Hz')).join(' | ')
 :'인식된 음성 측정 세션이 없습니다. 임의로 수치를 만들지 않습니다.';
 }catch(e){el('speech-evidence').textContent='JSON을 읽지 못했습니다: '+e.message;importedSpeech=[];}
});

function clearReadingComparison(){
 lastReadingComparison=null;el('reading-summary').hidden=true;
 el('reading-summary').textContent='';el('reading-differences').replaceChildren();
 el('reading-status').textContent='비교할 음성 전사 결과를 준비하세요. 음성인식 차이는 발음 오류가 아닙니다.';
}
el('reading-reset').addEventListener('click',clearReadingComparison);
el('reading-compare').addEventListener('click',()=>{
 const typed=el('transcript').value.trim();
 const asrText=String(lastASR?.text||'').trim();
 const transcription=asrText||typed;
 if(!transcription){
  clearReadingComparison();el('reading-status').textContent='전사된 글자가 없습니다. 음성 파일을 불러오거나 녹음 후 위의 전사 버튼을 누르세요.';return;
 }
 const source=asrText?'whisper_asr':'manual_transcript_without_asr';
 const comparison=compareReadingText(READING_REFERENCE_TEXT,transcription);
 if(comparison.status!=='compared'){clearReadingComparison();el('reading-status').textContent=comparison.reason;return;}
 lastReadingComparison={...comparison,source,reference:READING_REFERENCE_TEXT,recognizedText:transcription,
   editedText:typed!==asrText?typed:null,acousticEvidence:lastReadingAcoustics,
   humanConfirmedPronunciation:false,officialCognitiveScoreContribution:0};
 const percent=(comparison.characterDisagreementRate*100).toFixed(1);
 const result=el('reading-summary');result.hidden=false;
 result.textContent='원문 '+comparison.referenceCount+'글자 / 인식 '+comparison.recognizedCount+'글자 · 다른 글자 편집거리 '+comparison.distance+
 ' · 문자 인식 불일치율 '+percent+'% · 바뀜 '+comparison.counts.substitute+' / 빠짐 '+comparison.counts.delete+' / 추가 '+comparison.counts.insert+
 ' · 발음 정확도/인지저하 점수: 계산하지 않음';
 const diffs=comparison.operations.filter(x=>x.kind!=='match');
 const box=el('reading-differences');box.replaceChildren();
 if(!diffs.length){box.textContent='문자 전사는 기준 문장과 일치합니다. 실제 발음이 정확하다고 증명하는 결과는 아닙니다.';}
 else{
  const heading=document.createElement('strong');heading.textContent='인식 불일치 후보 ('+diffs.length+'개 문자 작업, 앞에서부터 20개 표시)';box.append(heading);
  for(const item of diffs.slice(0,20)){
   const row=document.createElement('p');row.style.margin='3px 0';row.textContent=
    (item.kind==='substitute'?'다르게 인식':item.kind==='delete'?'원문 문자 미인식':'추가 인식')+
    ' · 원문 ['+(item.expected||'없음')+'] / 전사 ['+(item.recognized||'없음')+']'+
    (item.expectedIndex!==null?' · 원문 '+(item.expectedIndex+1)+'번째':'');
   box.append(row);
  }
 }
 el('reading-status').textContent=asrText
  ?'Whisper 원본 전사로 비교했습니다. 원음을 듣고 오류 후보를 검토하세요. 텍스트 입력란을 수정해도 원래 ASR 기록과 구별됩니다.'
  :'직접 입력한 텍스트만 비교했습니다. 실제 음성 발음에 대한 평가가 아닙니다.';
});
el('compare').addEventListener('click',()=>{
 const list=targets.map(x=>x.value.trim()).filter(Boolean);
 const suggestions=suggestExactRecallMatches(el('transcript').value,list);
 const result=el('match-result');result.replaceChildren();
 for(const x of suggestions){
 const para=document.createElement('p');para.textContent=(x.exactSequenceFound?'문자 일치 발견':'문자 일치 없음')+': '+x.target+' (자동 채점 아님 · 검사자 확인 필요)';result.append(para);
 }
 if(!suggestions.length)result.textContent='목표 요소를 검사자가 먼저 입력해주세요.';
});
function audioSession(){if(navigator.audioSession){try{navigator.audioSession.type='play-and-record';}catch{}}}
el('mic-record').addEventListener('click',async()=>{
 if(recorder&&recorder.state==='recording')return;
 try{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('이 브라우저에서 녹음할 수 없습니다.');
  audioSession();micStream=await navigator.mediaDevices.getUserMedia({audio:true});
  const parts=[];recorder=new MediaRecorder(micStream);
  recorder.ondataavailable=e=>{if(e.data?.size)parts.push(e.data);};
  recorder.onstop=()=>{recordedBlob=new Blob(parts,{type:recorder.mimeType||'audio/webm'});showAudioPreview(recordedBlob);micStream?.getTracks().forEach(t=>t.stop());micStream=null;el('asr-status').textContent='녹음 완료 · '+Math.round(recordedBlob.size/1024)+'KB. 전사를 누르면 기기에서 분석합니다.';};
  recordedBlob=null;lastASR=null;el('transcript').value='';clearReadingComparison();showAudioPreview(null);el('audio-file').value='';recorder.start();el('mic-record').disabled=true;el('mic-stop').disabled=false;
  el('asr-status').textContent='녹음 중 · 완료 시 정지를 누르세요.';
 }catch(e){micStream?.getTracks().forEach(t=>t.stop());micStream=null;el('asr-status').textContent='녹음 실패: '+e.message;}
});
el('mic-stop').addEventListener('click',()=>{
 if(recorder?.state==='recording')recorder.stop();
 el('mic-record').disabled=false;el('mic-stop').disabled=true;
});
el('audio-file').addEventListener('change',()=>{recordedBlob=null;lastASR=null;el('transcript').value='';clearReadingComparison();showAudioPreview(el('audio-file').files?.[0]||null);el('asr-status').textContent='음성 파일 선택됨. 먼저 재생해 녹음 품질을 확인하세요. 브라우저 안에서 전사됩니다.';});
async function decodeTo16k(blob) {
 const raw=await blob.arrayBuffer();const audioContext=new (window.AudioContext||window.webkitAudioContext)();
 try{
 const decoded=await audioContext.decodeAudioData(raw);
 if(decoded.duration>30)throw Error('이번 시연은 30초 이내 음성만 지원합니다. 더 짧게 녹음해주세요.');
 const frames=Math.ceil(decoded.duration*16000);
 if(frames<1600)throw Error('0.1초 이상 녹음된 음성이 필요합니다.');
 const offline=new OfflineAudioContext(1,frames,16000);
 const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
 const rendered=await offline.startRendering();
 return rendered.getChannelData(0).slice();
 }finally{await audioContext.close().catch(()=>{});}
}
el('transcribe').addEventListener('click',async()=>{
 const blob=recordedBlob||el('audio-file').files?.[0];if(!blob){el('asr-status').textContent='음성 파일을 선택하거나 새로 녹음하세요.';return;}
 if(blob.size>20e6){el('asr-status').textContent='20MB 이하의 짧은 파일을 사용하세요.';return;}
 const btn=el('transcribe');btn.disabled=true;lastASR=null;
 try{
  el('asr-status').textContent='음성 디코딩 중입니다.';
  const samples=await decodeTo16k(blob);
  const selectedModel=el('asr-model').value;
  el('asr-status').textContent='선택한 '+selectedModel+' 모델을 불러오는 중입니다. 최초 실행 시 수십~수백 MB의 모델 파일을 받을 수 있습니다.';
  if(pipelineModel!==selectedModel){pipelinePromise=null;pipelineModel=selectedModel;}
  if(!pipelinePromise){
   pipelinePromise=import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm').then(async({pipeline})=>
    pipeline('automatic-speech-recognition',selectedModel,{device:'wasm',progress_callback:(p)=>{
     if(p.status==='progress'&&Number.isFinite(p.progress))el('asr-status').textContent=selectedModel+' 다운로드 '+Math.round(p.progress)+'%';
    }}));
  }
  const asr=await pipelinePromise;
  el('asr-status').textContent='한국어 음성을 전사하고 있습니다. 전사 내용은 확인·수정이 필요합니다.';
  const result=await asr(samples,{language:'korean',task:'transcribe'});
  const text=String(result?.text||'').trim();
  lastASR={model:selectedModel,language:'ko',text,source:'in_browser_asr',verifiedByHuman:false};
  el('transcript').value=text;
  clearReadingComparison();
  el('reading-status').textContent='전사 완료. 문장 읽기 녹음이었다면 아래 전사와 읽기 문장 비교를 누르세요.';
  el('asr-status').textContent=text?'전사 완료 ('+selectedModel+'). 잘못 인식한 글자는 수정하세요. 검사지 자동 채점은 하지 않습니다.':'모델이 인식한 텍스트가 없습니다. 원본 소리·녹음 환경을 확인하세요.';
 }catch(e){pipelinePromise=null;pipelineModel=null;el('asr-status').textContent='전사 실패: '+(e?.message||String(e))+' / 다른 브라우저 또는 PC에서 재시도하거나 텍스트를 직접 입력하세요.';}
 finally{btn.disabled=false;}
});
el('save-audit').addEventListener('click',()=>{
 refreshScore();
 const output={version:GPCOG_SANDBOX_VERSION,createdAt:new Date().toISOString(),syntheticExample:sample,scoringSource:'https://gpcog.com.au/index/frequently-asked-questions',nonDiagnostic:true,license:'Official test administration and commercial reproduction require owner permission',patientRatings:patient,informantRatings:informant,scoring:lastResult,speechMeasurements:importedSpeech,readingComparison:lastReadingComparison,transcript:{text:el('transcript').value,asr:lastASR,reviewedByHuman:false},exactMatchSuggestions:suggestExactRecallMatches(el('transcript').value,targets.map(x=>x.value.trim()).filter(Boolean))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='kimse-cognitive-scoring-sandbox.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
});
refreshScore();
