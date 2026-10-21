// KIMSE Evidence: descriptive voice feature extraction only. Not a dementia classifier.
export const SPEECH_DEMO_VERSION = "2026.10.22.2";
export const TASKS = Object.freeze({
 free: Object.freeze({label:"자유발화", prompt:"최근에 있었던 일을 편하게 이야기해주세요."}),
 read: Object.freeze({label:"문장 읽기", prompt:"오늘은 날씨가 맑아서 집 근처 공원을 천천히 걸었습니다."}),
 vowel: Object.freeze({label:"모음 발성", prompt:"편안한 목소리로 '아—' 소리를 길게 내보세요."})
});
export function median(values) {
 const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);
 if(!a.length)return null;
 const k=Math.floor(a.length/2);return a.length%2?a[k]:(a[k-1]+a[k])/2;
}
export function summarizePitch(points) {
 const valid=points.filter(v=>Number.isFinite(v.hz)&&v.hz>0&&Number.isFinite(v.clarity));
 if(!valid.length)return {count:0,medianHz:null,minHz:null,maxHz:null};
 const a=valid.map(x=>x.hz);
 return {count:valid.length,medianHz:median(a),minHz:Math.min(...a),maxHz:Math.max(...a)};
}
export class SpeechSession {
 constructor(task="free",startedAt=0) {
  if(!TASKS[task])throw new TypeError("Unknown speech task");
  this.task=task;this.startedAt=startedAt;this.firstSpeechAt=null;
  this.segments=[];this.currentStart=null;this.pitch=[];
 }
 speechStart(at) {
  if(!Number.isFinite(at)||at<this.startedAt)return;
  if(this.currentStart!==null)return;
  this.currentStart=at;
  if(this.firstSpeechAt===null)this.firstSpeechAt=at;
 }
 speechEnd(at) {
  if(!Number.isFinite(at)||this.currentStart===null||at<this.currentStart)return;
  this.segments.push({startMs:Math.round(this.currentStart-this.startedAt),endMs:Math.round(at-this.startedAt)});
  this.currentStart=null;
 }
 pitchSample(at,hz,clarity) {
  if(!Number.isFinite(at)||!Number.isFinite(hz)||hz<=0||!Number.isFinite(clarity))return;
  this.pitch.push({atMs:Math.round(at-this.startedAt),hz:Math.round(hz*10)/10,clarity:Math.round(clarity*1000)/1000});
  if(this.pitch.length>1200)this.pitch.shift();
 }
 report(endedAt) {
  const end=Math.max(this.startedAt,Number.isFinite(endedAt)?endedAt:this.startedAt);
  const segments=this.segments.map(x=>({...x}));
  let gaps=[];
  for(let i=1;i<segments.length;i++)gaps.push(Math.max(0,segments[i].startMs-segments[i-1].endMs));
  const totalMs=segments.reduce((n,x)=>n+(x.endMs-x.startMs),0);
  return {
   version:SPEECH_DEMO_VERSION,task:this.task,taskLabel:TASKS[this.task].label,
   durationMs:Math.round(end-this.startedAt),
   firstSpeechDelayMs:this.firstSpeechAt===null?null:Math.round(this.firstSpeechAt-this.startedAt),
   detectedSegments:segments,segmentCount:segments.length,
   detectedDurationMs:totalMs,
   betweenSegmentGapsMs:gaps,meanGapMs:gaps.length?Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length):null,
   maxGapMs:gaps.length?Math.max(...gaps):null,
   pitch:{summary:summarizePitch(this.pitch),points:this.pitch.slice()},
   pitchMeasurementLabel:"voiced-region fundamental-frequency trajectory (all three tasks), not a clinical vocal-tremor measure", 
   method:"Silero VAD v5 on-device; event callback times are approximate, include algorithmic lag. Pitchy clarity-filtered F0 during VAD-detected voiced regions for all tasks. Not jitter/shimmer, tremor diagnosis, pronunciation accuracy, ASR or cognitive-risk prediction.",
   clinicalValidation:"not_established"
  };
 }
}
