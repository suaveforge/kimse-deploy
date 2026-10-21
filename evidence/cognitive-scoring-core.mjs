// KIMSE Evidence sandbox: implements only publicly documented GPCOG score arithmetic.
// This does NOT reproduce the copyrighted test, license its administration, or diagnose disease.
// Source: https://gpcog.com.au/index/frequently-asked-questions
export const GPCOG_SANDBOX_VERSION='2026.10.22.1';
export const PATIENT_ITEMS=Object.freeze([
 {id:'orientation',label:'날짜 지남력 평가 결과'},
 {id:'clock_numbers',label:'시계 숫자 표현 평가 결과'},
 {id:'clock_hands',label:'시계 바늘 표현 평가 결과'},
 {id:'recent_event',label:'최근 사건 진술 평가 결과'},
 {id:'recall_1',label:'회상 요소 1'},
 {id:'recall_2',label:'회상 요소 2'},
 {id:'recall_3',label:'회상 요소 3'},
 {id:'recall_4',label:'회상 요소 4'},
 {id:'recall_5',label:'회상 요소 5'}
]);
export const INFORMANT_ITEM_IDS=Object.freeze(['change1','change2','change3','change4','change5','change6']);
const complete=(values,count,allowed)=>Array.isArray(values)&&values.length===count&&values.every(v=>allowed.includes(v));
export function gradeGpcog({patient,informant}={}){
 const guide='Official GPCOG scoring reference only; clinician administration and interpretation required; copyrighted questions intentionally omitted.';
 if(!complete(patient,9,['correct','incorrect'])){
  return {status:'incomplete_patient',patientScore:null,informantScore:null,interpretation:'환자 평가 9개 항목을 검사 지침대로 모두 채점해야 합니다.',guide};
 }
 const patientScore=patient.filter(x=>x==='correct').length;
 if(patientScore===9){
  return {status:'patient_no_indication',patientScore,informantScore:null,interpretation:'공식 규칙상 9점 구간: 이 선별검사에서는 뚜렷한 인지저하 징후가 나타나지 않은 구간입니다. 진단 결과는 아닙니다.',guide};
 }
 if(patientScore<=4){
  return {status:'patient_further_evaluation',patientScore,informantScore:null,interpretation:'공식 규칙상 0~4점 구간: 인지기능 저하 가능성이 있어 표준적인 추가 진료·평가가 권고됩니다. 치매 확진이 아닙니다.',guide};
 }
 if(!complete(informant,6,['yes','no','unknown','na'])){
  return {status:'informant_required',patientScore,informantScore:null,interpretation:'공식 규칙상 환자 평가 5~8점은 보호자 면담(6개 항목)이 필요합니다. 정보가 없으므로 평가를 보류합니다.',guide};
 }
 // Per official FAQ: yes=possible deterioration (0), no/don't know/N/A=1.
 const informantScore=informant.reduce((a,x)=>a+(x==='yes'?0:1),0);
 if(informantScore<=3){
  return {status:'informant_further_evaluation',patientScore,informantScore,interpretation:'공식 규칙상 보호자 0~3점: 인지기능 저하 가능성이 있어 표준적인 추가 진료·평가가 권고됩니다. 확진은 아닙니다.',guide};
 }
 return {status:'informant_no_indication',patientScore,informantScore,interpretation:'공식 규칙상 보호자 4~6점: 이 선별검사에서 뚜렷한 인지저하 징후가 나타나지 않은 구간입니다. 진단 결과는 아닙니다.',guide};
}
export function describeSpeechMeasurements(value) {
 const entries=Array.isArray(value?.completedSessions)?value.completedSessions:Array.isArray(value)?value:value?.task?[value]:[];
 const valid=entries.filter(e=>e&&typeof e==='object'&&typeof e.task==='string'&&Array.isArray(e.detectedSegments));
 return valid.map(e=>({
  task:e.task,taskLabel:e.taskLabel||e.task,
  durationMs:Number.isFinite(e.durationMs)?e.durationMs:null,
  segmentCount:Number.isInteger(e.segmentCount)?e.segmentCount:null,
  meanGapMs:Number.isFinite(e.meanGapMs)?e.meanGapMs:null,
  pitchMedianHz:Number.isFinite(e.pitch?.summary?.medianHz)?e.pitch.summary.medianHz:null,
  firstSpeechDelayMs:Number.isFinite(e.firstSpeechDelayMs)?e.firstSpeechDelayMs:null,
  source:'KIMSE speech-demo measurement JSON',
  includedInGpcogScore:false,
  dementiaPrediction:null
 }));
}
export function normalizeForReview(text){
 return String(text||'').normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[\s\p{P}\p{S}]+/gu,'');
}
export function suggestExactRecallMatches(transcript,targets){
 const normalized=normalizeForReview(transcript);
 return (Array.isArray(targets)?targets:[]).map(t=>{
  const target=normalizeForReview(t);
  return {target:t,exactSequenceFound:!!target&&!!normalized&&normalized.includes(target),state:'human_review_required'};
 });
}
export function makeSyntheticScenario(){
 return {isSynthetic:true,patient:['correct','incorrect','incorrect','correct','correct','correct','correct','incorrect','incorrect'],informant:['yes','yes','no','no','unknown','na'],
 explanation:'모든 환자·보호자 응답은 가상입니다. 5점 환자평가와 4점 보호자평가의 공식 계산 흐름만 검증합니다.'};
}
