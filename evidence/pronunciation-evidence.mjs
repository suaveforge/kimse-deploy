// Reading-text comparison for KIMSE Evidence. This measures ASR text disagreement, NOT pronunciation correctness.
export const READING_REFERENCE_TEXT = '오늘은 날씨가 맑아서 집 근처 공원을 천천히 걸었습니다.';
export const READING_COMPARISON_VERSION = '2026.10.22.1';
export function readingCharacters(input) {
 return Array.from(String(input??'').normalize('NFKC').toLocaleLowerCase('ko-KR'))
  .filter(ch=>/[가-힣ㄱ-ㅎㅏ-ㅣa-z0-9]/u.test(ch));
}
export function compareReadingText(reference,recognized){
 const left=readingCharacters(reference),right=readingCharacters(recognized);
 if(!left.length||!right.length) return {status:'insufficient_text',reason:'기준 문장과 AI 전사 결과가 모두 필요합니다.',referenceCount:left.length,recognizedCount:right.length,distance:null,characterDisagreementRate:null,operations:[],pronunciationScore:null};
 if(left.length>400||right.length>400)throw new Error('비교할 텍스트가 너무 깁니다. 짧은 읽기 문장을 사용해주세요.');
 const n=left.length,m=right.length,dp=Array.from({length:n+1},()=>Array(m+1).fill(0));
 for(let i=0;i<=n;i++)dp[i][0]=i;
 for(let j=0;j<=m;j++)dp[0][j]=j;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){
  dp[i][j]=Math.min(dp[i-1][j-1]+(left[i-1]===right[j-1]?0:1),dp[i-1][j]+1,dp[i][j-1]+1);
 }
 const ops=[],counts={match:0,substitute:0,delete:0,insert:0};let i=n,j=m;
 while(i>0||j>0){
  if(i>0&&j>0&&dp[i][j]===dp[i-1][j-1]+(left[i-1]===right[j-1]?0:1)){
   const kind=left[i-1]===right[j-1]?'match':'substitute';
   ops.push({kind,expected:left[i-1],recognized:right[j-1],expectedIndex:i-1,recognizedIndex:j-1});
   counts[kind]++;i--;j--;
  }else if(i>0&&dp[i][j]===dp[i-1][j]+1){
   ops.push({kind:'delete',expected:left[i-1],recognized:'',expectedIndex:i-1,recognizedIndex:null});
   counts.delete++;i--;
  }else if(j>0&&dp[i][j]===dp[i][j-1]+1){
   ops.push({kind:'insert',expected:'',recognized:right[j-1],expectedIndex:null,recognizedIndex:j-1});
   counts.insert++;j--;
  }else throw new Error('문자 비교 경로를 만들지 못했습니다.');
 }
 ops.reverse();
 return {status:'compared',version:READING_COMPARISON_VERSION,referenceCount:n,recognizedCount:m,
  distance:dp[n][m],characterDisagreementRate:dp[n][m]/n,counts,operations:ops,
  pronunciationScore:null,medicalInference:null,
  warning:'Whisper의 문자 인식 차이는 발음 오류·조음장애·치매 위험도와 동일하지 않습니다. 음성과 전사본을 검사자가 확인해야 합니다.'};
}
export function readingEvidenceFromSessions(data){
 const sessions=Array.isArray(data?.completedSessions)?data.completedSessions:Array.isArray(data)?data:data?.task?[data]:[];
 const candidates=sessions.filter(x=>x&&x.task==='read'&&Array.isArray(x.detectedSegments));
 if(!candidates.length)return null;
 const s=candidates[candidates.length-1];return {task:'read',durationMs:Number.isFinite(s.durationMs)?s.durationMs:null,
  detectedDurationMs:Number.isFinite(s.detectedDurationMs)?s.detectedDurationMs:null,
  segmentCount:Number.isInteger(s.segmentCount)?s.segmentCount:null,meanGapMs:Number.isFinite(s.meanGapMs)?s.meanGapMs:null,
  pronunciationInference:null,source:'KIMSE speech measurement JSON; session linkage not independently verified'};
}

export function summarizeReadingIntervals(segments,totalDurationMs,recognizedText){
 if(!Array.isArray(segments)||!Number.isFinite(totalDurationMs)||totalDurationMs<=0)
  return {status:'unavailable',reason:'유효한 오디오 및 음성 검출 구간 없음'};
 const normalized=segments
  .filter(x=>Number.isFinite(x?.startMs)&&Number.isFinite(x?.endMs)&&x.endMs>x.startMs)
  .map(x=>({startMs:Math.max(0,x.startMs),endMs:Math.min(totalDurationMs,x.endMs)}))
  .filter(x=>x.endMs>x.startMs)
  .sort((a,b)=>a.startMs-b.startMs);
 if(!normalized.length)return {status:'no_detected_speech',speechDurationMs:0,segments:[],betweenSpeechGapsMs:[],referenceMedicalInference:null};
 const merged=[];
 for(const interval of normalized){
  const tail=merged[merged.length-1];
  if(tail&&interval.startMs<=tail.endMs)tail.endMs=Math.max(tail.endMs,interval.endMs);
  else merged.push({...interval});
 }
 const speechDurationMs=merged.reduce((n,x)=>n+(x.endMs-x.startMs),0);
 const gaps=[];for(let i=1;i<merged.length;i++)gaps.push(merged[i].startMs-merged[i-1].endMs);
 const recognizedSyllables=Array.from(String(recognizedText??'')).filter(c=>/[가-힣]/u.test(c)).length;
 return {status:'measured',totalDurationMs,speechDurationMs,segmentCount:merged.length,segments:merged,
  betweenSpeechGapsMs:gaps,observedSpeechFraction:speechDurationMs/totalDurationMs,
  recognizedSyllableCount:recognizedSyllables,
  asrSyllablesPerVoicedSecond:recognizedSyllables&&speechDurationMs>0?recognizedSyllables/(speechDurationMs/1000):null,
  referenceMedicalInference:null,
  method:'Silero VAD default speech segmentation + Whisper recognized Korean syllables divided by VAD speech duration; no clinical accuracy or articulation diagnosis'};
}
