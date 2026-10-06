(function(){
'use strict';
var root=document.querySelector('.page-body .container-xl');
if(!root||document.getElementById('evidence-application'))return;

var names={
  1:'Lancet Commission 2024',2:'WHO Risk Reduction Guideline',3:'AA 2024 Diagnostic Criteria',
  4:'대한치매학회 진단·평가 지침',5:'FDA pTau217/Aβ',6:'CAIDE',7:'ANU-ADRI',8:'LIBRA/LIBRA2',
  9:'MoCA-K Validation',10:'Gait + Speech + Drawing',11:'Speech Digital Biomarker',12:'Passive DHT Review',
  13:'Wearable/Portable Digital Biomarkers',14:'AI Digital Biomarker Landscape',15:'SCD Dual-task Meta-analysis',
  16:'Korean VR Spatial Memory',17:'FAQ6 / IADL',18:'Incident MCI Meta-analysis',19:'Umbrella Review',
  20:'CAIDE Operationalization',21:'Risk-index Operationalization',22:'Olfactory Meta-analysis',
  23:'DETeCD-ADRD Primary Care',24:'DETeCD-ADRD Specialty Care',25:'NICE NG97',26:'HL7 IPS',27:'KR Core'
};
function pad(n){return String(n).padStart(2,'0')}
function refs(list){
  return '<div class="d-flex flex-wrap gap-1 mt-2">'+list.map(function(n){
    return '<a class="badge bg-azure-lt text-azure text-decoration-none kimse-evidence-ref" href="#evidence-src-'+pad(n)+'">근거 '+pad(n)+' · '+names[n]+'</a>';
  }).join('')+'</div>';
}
function row(title,body,ev){
  return '<div class="list-group-item px-0"><div class="fw-bold">'+title+'</div><div class="text-secondary small mt-1">'+body+'</div>'+refs(ev)+'</div>';
}
function opRow(title,body){
  return '<div class="list-group-item px-0"><div class="d-flex align-items-center gap-2 flex-wrap"><div class="fw-bold">'+title+'</div><span class="badge bg-secondary-lt">KIMSE operational field</span></div><div class="text-secondary small mt-1">'+body+'</div></div>';
}

var style=document.createElement('style');
style.textContent='.kimse-primary-hub{margin-top:4px}.kimse-primary-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:16px}.kimse-primary-head h2{font-size:clamp(1.55rem,3vw,2.15rem);margin:0}.kimse-primary-head p{margin:.35rem 0 0;color:#66788a}.kimse-primary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.kimse-primary-choice{position:relative;min-height:168px;border:1px solid #d9e4ef;border-radius:22px;background:#fff;padding:22px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 10px 28px rgba(24,50,80,.06);cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.kimse-primary-choice:hover{transform:translateY(-2px);box-shadow:0 15px 34px rgba(24,50,80,.1)}.kimse-primary-choice.active{border:2px solid #206bc4;background:linear-gradient(145deg,#f4f9ff,#fff);box-shadow:0 14px 34px rgba(32,107,196,.14)}.kimse-primary-choice .kimse-primary-no{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#eef5ff;color:#206bc4;font-weight:900}.kimse-primary-choice .kimse-primary-title{font-size:1.28rem;font-weight:900;line-height:1.2;margin-top:20px;color:#182433}.kimse-primary-choice .kimse-primary-en{font-size:.78rem;font-weight:800;letter-spacing:.04em;color:#718096;margin-top:5px}.kimse-primary-choice .kimse-primary-desc{font-size:.9rem;line-height:1.45;color:#66788a;margin-top:8px}.kimse-primary-choice.active:after{content:"선택됨";position:absolute;right:16px;top:16px;border-radius:999px;padding:5px 9px;background:#206bc4;color:#fff;font-size:.72rem;font-weight:800}.kimse-application-card{border:1px solid #d9e4ef;box-shadow:0 10px 30px rgba(24,50,80,.06)}.kimse-application-panel[hidden],.kimse-observation-hidden{display:none!important}.kimse-purpose{border-left:4px solid #206bc4;background:#f6f9fc;padding:14px 16px;border-radius:10px}.kimse-rd-guard{border-left-color:#2fb344}.kimse-evidence-ref{white-space:normal;text-align:left;line-height:1.3}.kimse-bridge-flow{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;padding:12px;border-radius:12px;background:#f8fafc}.kimse-bridge-flow span{font-weight:800;font-size:.78rem;text-align:center}.kimse-bridge-flow i{display:none}.kimse-architecture{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kimse-architecture-step{border:1px solid #dde6ef;border-radius:12px;padding:12px;background:#fff}.kimse-architecture-step strong{display:block;margin-bottom:4px}.kimse-output-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kimse-output-card{border:1px solid #e0e7ef;border-radius:12px;padding:12px;background:#f8fafc}.kimse-time-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kimse-time-card{border-radius:12px;padding:13px;border:1px solid #dbe5ef}.kimse-time-card b{font-size:1.05rem}.kimse-time-card span{display:block;color:#66788a;font-size:.82rem;margin-top:4px}@media(max-width:991.98px){.kimse-primary-grid{grid-template-columns:1fr}.kimse-primary-choice{min-height:142px}.kimse-bridge-flow{grid-template-columns:1fr;gap:4px}.kimse-bridge-flow span{text-align:left;padding:7px 10px;border-radius:9px;background:#fff}.kimse-architecture,.kimse-output-grid,.kimse-time-grid{grid-template-columns:1fr}}@media(max-width:575.98px){.kimse-primary-head{display:block}.kimse-primary-choice{padding:18px;min-height:136px}.kimse-primary-choice .kimse-primary-title{font-size:1.18rem}}';
document.head.appendChild(style);

var clinical=''
  +'<div id="clinical-handoff" class="kimse-application-panel" data-panel="clinical">'
  +'<div class="kimse-purpose mb-3"><div class="text-uppercase small fw-bold text-azure">PURPOSE · CLINICAL HANDOFF</div><h3 class="mt-1 mb-2">리포트는 PDF 한 장이 아니라, 의료진이 필요한 사실을 빠짐없이 보존한 Clinical Dataset입니다</h3><div class="text-secondary">낌새의 장기 관찰을 임상적으로 읽히는 구조로 정제하고, 같은 사실을 인쇄/PDF·동적 Clinical View·향후 EMR/FHIR 연계에 맞게 표현합니다. 목적은 진단을 대신하는 것이 아니라 진료실에서 놓치기 쉬운 변화의 시작·순서·지속성·기능영향·가족 확인·데이터 품질을 전달하는 것입니다.</div></div>'
  +'<div class="card mb-3"><div class="card-header"><div><h3 class="card-title">하나의 Clinical Truth, 국가·병원별로는 View/Profile만 변경</h3><div class="text-secondary small">국제 공통 임상 사실을 보존하고, 한국/기관별 용어·검사·표현·연동 요구를 위에 얹습니다.</div></div></div><div class="card-body"><div class="kimse-architecture"><div class="kimse-architecture-step"><span class="badge bg-blue-lt mb-2">GLOBAL CORE</span><strong>Global Clinical Core</strong><div class="text-secondary small">onset · trajectory · cognition · function · informant · confounder · quality · professional outcome</div></div><div class="kimse-architecture-step"><span class="badge bg-azure-lt mb-2">COUNTRY PROFILE</span><strong>KR Profile부터 시작</strong><div class="text-secondary small">대한치매학회 · 국내 용어/검사 · 향후 KR Core 연동</div>'+refs([4,27])+'</div><div class="kimse-architecture-step"><span class="badge bg-indigo-lt mb-2">INSTITUTION VIEW</span><strong>병원/전문의별 표시 최적화</strong><div class="text-secondary small">섹션 순서 · 기간 · PDF 구성 · EMR 전달 방식만 변경. 관찰 사실은 바꾸지 않습니다.</div>'+refs([26])+'</div></div></div></div>'
  +'<div class="row g-3"><div class="col-xl-8"><div class="card h-100"><div class="card-header"><div><h3 class="card-title">의료진에게 빠지면 안 되는 Clinical Coverage</h3><div class="text-secondary small">Alzheimer’s Association DETeCD-ADRD를 국제 내용 뼈대로, 대한치매학회와 NICE를 교차 기준으로 사용합니다.</div></div></div><div class="card-body py-0"><div class="list-group list-group-flush">'
  +row('1. 변화의 시작·순서·경과','무엇이 먼저 시작됐는지, 빈도와 진행 속도, 지속/회복/변동을 시간축으로 정리합니다.',[23,24,25,4])
  +row('2. 인지기능 변화','기억·주의·언어·집행기능·시공간 등 개인 기준 대비 변화를 보여줍니다. KIMSE 자체 과제를 MoCA-K 점수로 환산하지 않습니다.',[23,24,4,9,16])
  +row('3. ADL / IADL · 독립성 영향','약속·최근사건·금전/복약·외출/길찾기 등 실제 생활기능 변화를 사용자/가족 출처와 함께 구분합니다.',[23,24,25,17])
  +row('4. 기분·행동·감각·운동 Context','진료에서 필요한 mood/neuropsychiatric 및 sensory/motor 변화를 실제 수집된 범위에서 제공하고 임상진단과 구분합니다.',[23,24,25])
  +row('5. 생활·디지털 종단 변화','수면·활동·이동·생활반경·보행·말하기 등을 절대값보다 개인 baseline 대비 변화량·지속기간·동시변화 중심으로 보여줍니다.',[10,11,12,13,15])
  +row('6. 위험요인과 가역적/혼란 요인','장기 위험요인은 현재 변화와 분리하고, 복약·수면·기분·급성질환·감각저하 등 다른 설명 가능성은 실제 확인된 정보만 표시합니다.',[23,25,1,2,6,7,8])
  +row('7. 가족 / Informant 확인','누가, 무엇을, 언제 확인했는지 기록하고 사용자 진술·수동 입력·passive data와 섞지 않습니다.',[23,24,25,17])
  +opRow('8. 데이터 품질·누락·출처','유효일·coverage·missing·device off/non-wear·기기/앱/모델 버전은 임상 주장 자체가 아니라 KIMSE 운영 필드로 명확히 표시합니다.')
  +row('9. 전문평가 Handback','의료진 인상, 신경심리검사, 필요시 영상/검사/바이오마커, 진단·추적계획을 KIMSE 관찰과 별도 Professional layer로 되돌려 연결합니다.',[3,4,5])
  +'</div></div></div></div>'
  +'<div class="col-xl-4"><div class="card mb-3"><div class="card-header"><h3 class="card-title">절대 섞지 않는 4가지</h3></div><div class="card-body"><ul class="mb-0"><li class="mb-2">KIMSE 관찰 ↔ 의료진 진단</li><li class="mb-2">개인 baseline Δ ↔ 집단 cutoff</li><li class="mb-2">사용자 진술 ↔ 가족 확인 ↔ passive sensor</li><li>임상 근거 필드 ↔ KIMSE operational field</li></ul>'+refs([23,4,9,17,12])+'</div></div><div class="card"><div class="card-header"><h3 class="card-title">현재 권위 기준</h3></div><div class="card-body"><div class="small text-secondary mb-2">단일 국제 표준 서식 대신, 내용 기준과 데이터 교환 기준을 분리합니다.</div>'+refs([23,24,4,25,26,27])+'</div></div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><div><h3 class="card-title">같은 Dataset에서 세 가지 View를 생성</h3><div class="text-secondary small">PDF를 위해 데이터를 자르지 않습니다.</div></div></div><div class="card-body"><div class="kimse-output-grid"><div class="kimse-output-card"><strong>Print / PDF</strong><div class="text-secondary small mt-1">1페이지 Pre-visit 요약 + 선택적 상세부록. 전달·인쇄·보관 최적화.</div></div><div class="kimse-output-card"><strong>Interactive Clinical View</strong><div class="text-secondary small mt-1">timeline · domain drill-down · co-occurrence · family event · quality/missingness overlay · evidence drill-down.</div></div><div class="kimse-output-card"><strong>EMR / FHIR</strong><div class="text-secondary small mt-1">내부 명세가 안정된 뒤 동일 snapshot을 IPS/KR Core 방향으로 구조화 연동.</div>'+refs([26,27])+'</div></div></div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><h3 class="card-title">의료진 가시성 목표 · 10 / 30 / 60초</h3></div><div class="card-body"><div class="kimse-time-grid"><div class="kimse-time-card"><b>10초</b><span>왜 왔는지 + 가장 큰 지속 변화가 무엇인지 파악</span></div><div class="kimse-time-card"><b>30초</b><span>언제부터 어떤 순서로 변했고 기능과 가족 관찰에 어떤 영향이 있었는지 파악</span></div><div class="kimse-time-card"><b>60초</b><span>데이터 품질·혼란요인·추가로 파고들 영역을 판단</span></div></div></div></div>'
  +'</div>';

var rd=''
  +'<div id="research-data-model" class="kimse-application-panel" data-panel="rd" hidden>'
  +'<div class="kimse-purpose kimse-rd-guard mb-3"><div class="text-uppercase small fw-bold text-green">PURPOSE · RESEARCH DATA MODEL</div><h3 class="mt-1 mb-2">기관 공동연구·검증·R&D에서 재현 가능한 장기 인지변화 데이터 구조를 만듭니다</h3><div class="text-secondary">이 영역은 개인정보 판매를 설명하는 페이지가 아닙니다. 동의 범위, 목적 제한, 가명·비식별 처리, 데이터 품질과 출처를 전제로 연구기관·의료기관·공공기관·산업 연구팀이 검증 가능한 형태로 정규화하는 방법을 공개합니다.</div></div>'
  +'<div class="row g-3"><div class="col-lg-7"><div class="card h-100"><div class="card-header"><div><h3 class="card-title">R&D 정규화 데이터의 최소 구조</h3><div class="text-secondary small">담당 스레드는 실제 데이터셋·시장 조사 결과를 공개용 표현과 내부 사업자료로 분리해 확장합니다.</div></div></div><div class="card-body py-0"><div class="list-group list-group-flush">'
  +row('1. 대상자·위험요인 Context','연령·교육·생활습관·혈압·대사·사회관계 등 해석에 필요한 기본 맥락을 출처가 있는 변수로 정규화합니다.',[1,2,6,7,8,18,19,20,21])
  +row('2. Passive Longitudinal Signals','수면·활동·이동·생활반경·루틴을 날짜별 시계열로 보존하고 수집기기·누락률·유효일을 함께 기록합니다.',[12,13])
  +row('3. Speech / Gait / Interaction Features','음성·보행·터치 등은 원 연구의 성능을 그대로 가져오지 않고 재현 가능한 feature와 개인 변화량으로 저장합니다.',[10,11,14,15])
  +row('4. Repeated Cognitive / Functional Measures','반복 인지과제와 일상기능 정보는 임상 점수와 KIMSE 자체 측정을 구분한 채 종단 데이터로 보존합니다.',[9,16,17])
  +row('5. Outcome / Professional Labels','전문평가·신경심리검사·필요시 바이오마커 결과를 관찰 데이터와 별도 계층으로 보존해 모델 검증에 사용합니다.',[3,4,5])
  +row('6. Provenance & Version','subject pseudonymous ID, source device/provider, app build, Evidence/model version, consent scope, missingness/quality metadata를 함께 기록합니다.',[12,14])
  +'</div></div></div></div>'
  +'<div class="col-lg-5"><div class="card h-100"><div class="card-header"><h3 class="card-title">외부 공개 원칙</h3></div><div class="card-body"><div class="alert alert-success"><strong>표현 기준</strong><br>“데이터 판매”가 아니라 “공동연구·검증·기관 R&D를 위한 정규화 데이터 구조”로 설명합니다.</div><ul class="mb-3"><li class="mb-2">개인 식별정보와 연구데이터 분리</li><li class="mb-2">연구·협력 목적별 동의 범위 기록</li><li class="mb-2">원자료보다 파생변수·품질정보·출처를 함께 관리</li><li class="mb-2">임상 Ground Truth가 없는 데이터와 있는 데이터 구분</li></ul>'+refs([12,13,14,3,4])+'</div></div></div></div>'
  +'</div>';

var hub='<section class="kimse-primary-hub mb-4" id="evidence-home"><div class="kimse-primary-head"><div><div class="text-uppercase text-secondary small fw-bold">KIMSE EVIDENCE HUB</div><h2>세 가지 목적을 먼저 선택하세요</h2><p>근거를 확인하고, 의료진에게 전달하고, 연구 가능한 데이터로 정규화합니다.</p></div><span class="badge bg-blue-lt">Updated 2026.10.06 · 09</span></div><div class="kimse-primary-grid" role="tablist" aria-label="Evidence 대분류"><button type="button" class="kimse-primary-choice active" data-kimse-primary="evidence" aria-pressed="true"><span class="kimse-primary-no">01</span><span><span class="kimse-primary-title">관찰 근거</span><span class="kimse-primary-en">Evidence</span><span class="kimse-primary-desc">낌새가 무엇을 보고, 왜 보는지와 원문 근거를 확인합니다.</span></span></button><button type="button" class="kimse-primary-choice" data-kimse-primary="clinical" aria-pressed="false"><span class="kimse-primary-no">02</span><span><span class="kimse-primary-title">의료 리포트</span><span class="kimse-primary-en">Clinical Handoff</span><span class="kimse-primary-desc">장기 변화를 의료진이 빠르게 읽을 수 있는 구조로 전달합니다.</span></span></button><button type="button" class="kimse-primary-choice" data-kimse-primary="rd" aria-pressed="false"><span class="kimse-primary-no">03</span><span><span class="kimse-primary-title">연구·기관 R&D</span><span class="kimse-primary-en">Research Data Model</span><span class="kimse-primary-desc">공동연구·검증을 위한 종단 데이터 정규화 구조를 확인합니다.</span></span></button></div></section>';

var html='<section class="card kimse-application-card mb-4" id="evidence-application" hidden><div class="card-header"><div class="w-100"><div class="d-flex justify-content-between align-items-start gap-3 flex-wrap"><div><div class="text-uppercase text-secondary small">EVIDENCE APPLICATION LAYER</div><h2 class="card-title mt-1">관찰된 변화는 어떻게 이어지는가</h2><div class="text-secondary small mt-1">개인 변화 관찰의 근거를 의료진 전달과 기관 R&D 데이터 구조까지 끊김 없이 연결합니다.</div></div><span class="badge bg-blue-lt">Evidence Registry 09</span></div></div></div><div class="card-body">'
  +'<div class="kimse-bridge-flow mb-4"><span>외부 근거</span><i>→</i><span>앱 실제 신호</span><i>→</i><span>개인 baseline Δ</span><i>→</i><span>가족 확인</span><i>→</i><span>의료진 전달</span><i>→</i><span>전문평가 결과</span><i>→</i><span>R&D 정규화</span></div>'
  +clinical+rd+'</div></section>';

var originalChildren=[].slice.call(root.children);
originalChildren.forEach(function(el){el.dataset.kimseObservation='1'});
root.insertAdjacentHTML('afterbegin',hub);
var hubEl=document.getElementById('evidence-home');
if(hubEl)hubEl.insertAdjacentHTML('afterend',html);

var app=document.getElementById('evidence-application');
function markObservationChildren(){
  [].slice.call(root.children).forEach(function(el){
    if(el.id==='evidence-home'||el.id==='evidence-application')return;
    el.dataset.kimseObservation='1';
  });
}
markObservationChildren();

var currentMode='evidence';
function setMode(key,scroll){
  if(!['evidence','clinical','rd'].includes(key))key='evidence';
  currentMode=key;
  document.querySelectorAll('[data-kimse-primary]').forEach(function(b){
    var on=b.getAttribute('data-kimse-primary')===key;
    b.classList.toggle('active',on);
    b.setAttribute('aria-pressed',on?'true':'false');
  });
  markObservationChildren();
  document.querySelectorAll('[data-kimse-observation="1"]').forEach(function(el){
    el.classList.toggle('kimse-observation-hidden',key!=='evidence');
  });
  if(app)app.hidden=key==='evidence';
  document.querySelectorAll('.kimse-application-panel').forEach(function(p){
    p.hidden=key==='evidence'||p.getAttribute('data-panel')!==key;
  });
  var title=document.querySelector('.page-header .page-title');
  var desc=document.querySelector('.page-header p.text-secondary');
  if(title&&desc){
    if(key==='clinical'){
      title.textContent='장기 변화를 의료진이 빠르게 이해할 수 있는 형태로 연결합니다';
      desc.textContent='관찰값을 진단으로 바꾸지 않고, 변화의 시작·순서·지속성·기능 영향·가족 확인·데이터 품질을 구조화해 전달합니다.';
    }else if(key==='rd'){
      title.textContent='공동연구·검증을 위한 재현 가능한 종단 데이터 구조를 만듭니다';
      desc.textContent='동의 범위와 목적 제한을 전제로 생활·인지 변화 데이터를 정규화하고 출처·품질·누락·전문평가 결과를 함께 관리합니다.';
    }else{
      title.textContent='낌새가 무엇을 보고, 그 기준은 어디에서 왔는지 한눈에 보여드립니다';
      desc.textContent='수면량, 말하기, 이동시간, 통화·사회활동, 보행·활동량, 기억·집중의 변화를 평소 기준선과 비교합니다. 각 신호 옆에서 어떤 기기로 수집하는지와 어떤 연구·검증도구가 근거인지 바로 확인할 수 있습니다.';
    }
  }
  if(scroll){
    var target=key==='evidence'?document.getElementById('impact-proof'):app;
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
document.addEventListener('click',function(e){
  var primary=e.target.closest('[data-kimse-primary]');
  if(primary){
    var key=primary.getAttribute('data-kimse-primary');
    setMode(key,true);
    history.replaceState(null,'',key==='clinical'?'#clinical-handoff':key==='rd'?'#research-data-model':'#evidence-home');
    return;
  }
  var ref=e.target.closest('a[href^="#evidence-src-"]');
  if(ref)setMode('evidence',false);
});
window.addEventListener('hashchange',function(){
  var h=location.hash||'';
  if(h==='#clinical-handoff')setMode('clinical',false);
  else if(h==='#research-data-model')setMode('rd',false);
  else if(h==='#evidence-home'||h.indexOf('#evidence-src-')===0||h==='#sources'||h==='#signal-map'||h==='#device-map'||h==='#app-model'||h==='#factors'||h==='#change-review')setMode('evidence',false);
});
var observer=new MutationObserver(function(){markObservationChildren();setMode(currentMode,false)});
observer.observe(root,{childList:true});
if(location.hash==='#clinical-handoff')setMode('clinical',false);
else if(location.hash==='#research-data-model')setMode('rd',false);
else setMode('evidence',false);

document.querySelectorAll('.badge.bg-secondary-lt').forEach(function(e){if(e.textContent.indexOf('Updated 2026.09.23')>=0)e.textContent='Updated 2026.10.06 · Evidence Registry 09';});
document.querySelectorAll('.text-center.text-secondary.small.py-4').forEach(function(e){if(e.textContent.indexOf('KIMSE Evidence Registry')>=0)e.textContent='KIMSE Evidence Registry · Updated 2026.10.06';});
})();