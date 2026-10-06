(function(){
'use strict';
var root=document.querySelector('.page-body .container-xl');
if(!root||document.getElementById('evidence-application'))return;
var PAGE_MODE=document.body.getAttribute('data-evidence-page')||'evidence';

var names={
  1:'Lancet Commission 2024',2:'WHO Risk Reduction Guideline',3:'AA 2024 Diagnostic Criteria',
  4:'대한치매학회 진단·평가 지침',5:'FDA pTau217/Aβ',6:'CAIDE',7:'ANU-ADRI',8:'LIBRA/LIBRA2',
  9:'MoCA-K Validation',10:'Gait + Speech + Drawing',11:'Speech Digital Biomarker',12:'Passive DHT Review',
  13:'Wearable/Portable Digital Biomarkers',14:'AI Digital Biomarker Landscape',15:'SCD Dual-task Meta-analysis',
  16:'Korean VR Spatial Memory',17:'FAQ6 / IADL',18:'Incident MCI Meta-analysis',19:'Umbrella Review',
  20:'CAIDE Operationalization',21:'Risk-index Operationalization',22:'Olfactory Meta-analysis',
  23:'DETeCD-ADRD Primary Care',24:'DETeCD-ADRD Specialty Care',25:'NICE NG97',26:'HL7 IPS',27:'KR Core',
  28:'RADAR-AD',29:'Bio-Hermes',30:'ADNI',31:'KBASE',32:'CPAD',33:'MCI Prognosis Meta-analysis',
  34:'Korea Longitudinal Data RFP',35:'Dementia Platform Korea / TRR'
};
function pad(n){return String(n).padStart(2,'0')}
function refs(list){
  return '<div class="d-flex flex-wrap gap-1 mt-2">'+list.map(function(n){
    var href=PAGE_MODE==='evidence'?'#evidence-src-'+pad(n):'./#evidence-src-'+pad(n);
    return '<a class="badge bg-azure-lt text-azure text-decoration-none kimse-evidence-ref" href="'+href+'">근거 '+pad(n)+' · '+names[n]+'</a>';
  }).join('')+'</div>';
}
function row(title,body,ev){
  return '<div class="list-group-item px-0"><div class="fw-bold">'+title+'</div><div class="text-secondary small mt-1">'+body+'</div>'+refs(ev)+'</div>';
}
function opRow(title,body){
  return '<div class="list-group-item px-0"><div class="d-flex align-items-center gap-2 flex-wrap"><div class="fw-bold">'+title+'</div><span class="badge bg-secondary-lt">KIMSE operational field</span></div><div class="text-secondary small mt-1">'+body+'</div></div>';
}

var style=document.createElement('style');
style.textContent='.kimse-primary-hub{margin:0 0 24px}.kimse-primary-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:12px}.kimse-primary-head h2{font-size:1.15rem;line-height:1.25;margin:0;color:#182433}.kimse-primary-head p{margin:.3rem 0 0;color:#66788a;font-size:.88rem}.kimse-primary-grid{display:grid;grid-template-columns:1fr;gap:10px}.kimse-primary-choice{text-decoration:none!important;width:100%;min-height:96px;border:1px solid #dbe5ef;border-radius:17px;background:#fff;padding:16px 18px;display:grid;grid-template-columns:48px minmax(0,1fr) 34px;align-items:center;gap:15px;color:#182433;box-shadow:0 5px 18px rgba(24,50,80,.045);transition:border-color .16s ease,box-shadow .16s ease,background .16s ease,transform .16s ease}.kimse-primary-choice:hover{border-color:#b9cde4;box-shadow:0 8px 22px rgba(24,50,80,.08);transform:translateY(-1px)}.kimse-primary-choice.active{border:2px solid #206bc4;background:#f5f9ff;box-shadow:0 8px 24px rgba(32,107,196,.1)}.kimse-primary-no{width:46px;height:46px;border-radius:14px;display:grid!important;place-items:center;background:#eef5ff;color:#206bc4;font-size:.9rem;font-weight:900}.kimse-primary-copy{display:block;min-width:0}.kimse-primary-title{display:block;font-size:1.15rem;font-weight:900;line-height:1.2;color:#182433}.kimse-primary-en{display:block;margin-top:3px;font-size:.7rem;line-height:1.2;font-weight:800;letter-spacing:.055em;color:#74859a}.kimse-primary-desc{display:block;margin-top:7px;font-size:.86rem;line-height:1.4;color:#65758a;word-break:keep-all}.kimse-primary-go{display:grid!important;place-items:center;width:32px;height:32px;border-radius:999px;background:#f1f5f9;color:#708399;font-size:1rem;font-weight:900}.kimse-primary-choice.active .kimse-primary-go{background:#206bc4;color:#fff}.kimse-application-card{border:0;background:transparent;box-shadow:none}.kimse-purpose{border-left:4px solid #206bc4;background:#f6f9fc;padding:14px 16px;border-radius:10px}.kimse-rd-guard{border-left-color:#2fb344}.kimse-evidence-ref{white-space:normal;text-align:left;line-height:1.3}.kimse-architecture{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kimse-architecture-step{border:1px solid #dde6ef;border-radius:12px;padding:12px;background:#fff}.kimse-architecture-step strong{display:block;margin-bottom:4px}.kimse-output-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kimse-output-card{border:1px solid #e0e7ef;border-radius:12px;padding:12px;background:#f8fafc}.kimse-time-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kimse-time-card{border-radius:12px;padding:13px;border:1px solid #dbe5ef}.kimse-time-card b{font-size:1.05rem}.kimse-time-card span{display:block;color:#66788a;font-size:.82rem;margin-top:4px}@media(max-width:991.98px){.kimse-architecture,.kimse-output-grid,.kimse-time-grid{grid-template-columns:1fr}}@media(max-width:575.98px){.kimse-primary-head{display:block}.kimse-primary-head .badge{margin-top:8px}.kimse-primary-choice{grid-template-columns:44px minmax(0,1fr);padding:15px;min-height:92px}.kimse-primary-go{display:none!important}.kimse-primary-no{width:42px;height:42px}.kimse-primary-title{font-size:1.05rem}.kimse-primary-desc{font-size:.82rem}}';
document.head.appendChild(style);
var rdStyle=document.createElement('style');
rdStyle.textContent='.kimse-rd-principles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.kimse-rd-principle{border:1px solid #dfe8e4;border-radius:12px;padding:12px;background:#f8fcfa}.kimse-rd-units{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.kimse-rd-unit{border:1px solid #dde6ef;border-radius:10px;padding:10px;background:#fff}.kimse-rd-unit strong{display:block}.kimse-rd-unit span{display:block;color:#66788a;font-size:.78rem;margin-top:3px}.kimse-rd-stage{border:1px solid #dde6ef;border-radius:12px;padding:13px;height:100%;background:#fff}.kimse-rd-stage .kimse-stage-target{font-weight:800;font-size:1.05rem}.kimse-rd-stage .kimse-stage-note{color:#66788a;font-size:.82rem;margin-top:5px}@media(max-width:991.98px){.kimse-rd-principles{grid-template-columns:repeat(2,minmax(0,1fr))}.kimse-rd-units{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:767.98px){.kimse-rd-principles{grid-template-columns:1fr}.kimse-rd-units{grid-template-columns:repeat(2,minmax(0,1fr))}}';
document.head.appendChild(rdStyle);

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
  +'<div class="card mt-3"><div class="card-header"><div><h3 class="card-title">같은 Dataset에서 세 가지 View를 생성</h3><div class="text-secondary small">PDF를 위해 데이터를 자르지 않습니다.</div></div></div><div class="card-body"><div class="kimse-output-grid"><div class="kimse-output-card"><strong>Print / PDF</strong><div class="text-secondary small mt-1">1페이지 Pre-visit 요약 + 선택적 상세부록. 전달·인쇄·보관 최적화.</div></div><div class="kimse-output-card"><strong>Interactive Clinical View</strong><div class="text-secondary small mt-1">clinical coverage · timeline · domain drill-down · co-occurrence · family/informant · context/confounder · quality/missingness · evidence/provenance drill-down.</div></div><div class="kimse-output-card"><strong>EMR / FHIR</strong><div class="text-secondary small mt-1">내부 명세가 안정된 뒤 동일 snapshot을 IPS/KR Core 방향으로 구조화 연동.</div>'+refs([26,27])+'</div></div></div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><h3 class="card-title">의료진 가시성 목표 · 10 / 30 / 60초</h3></div><div class="card-body"><div class="kimse-time-grid"><div class="kimse-time-card"><b>10초</b><span>왜 왔는지 + 가장 큰 지속 변화가 무엇인지 파악</span></div><div class="kimse-time-card"><b>30초</b><span>언제부터 어떤 순서로 변했고 기능과 가족 관찰에 어떤 영향이 있었는지 파악</span></div><div class="kimse-time-card"><b>60초</b><span>데이터 품질·혼란요인·추가로 파고들 영역을 판단</span></div></div></div></div>'
  +'</div>';

var rd=''
  +'<div id="research-data-model" class="kimse-application-panel" data-panel="rd">'
  +'<div class="kimse-purpose kimse-rd-guard mb-3"><div class="text-uppercase small fw-bold text-green">PURPOSE · RESEARCH DATA MODEL</div><h3 class="mt-1 mb-2">기관 공동연구·검증·R&D에서 재현 가능한 장기 인지변화 데이터 구조를 만듭니다</h3><div class="text-secondary">목적별 동의, 가명·비식별 처리, 데이터 품질·출처·버전, 전문평가 outcome을 함께 보존해 연구기관이 같은 데이터를 다시 계산하고 검증할 수 있도록 합니다.</div></div>'
  +'<div class="card mb-3"><div class="card-header"><div><h3 class="card-title">연구가치는 “사람 수 × 기간”만으로 결정되지 않습니다</h3><div class="text-secondary small">외부 benchmark를 보면 강한 Ground Truth, 반복 측정, 정규화·품질, 재사용 가능한 동의가 함께 있을 때 연구가치가 올라갑니다.</div></div></div><div class="card-body"><div class="kimse-rd-principles"><div class="kimse-rd-principle"><strong>01 · Ground Truth</strong><div class="text-secondary small mt-1">전문평가·검사·바이오마커와 연결해 “무엇을 예측했는가”를 확인합니다.</div>'+refs([3,4,5,29])+'</div><div class="kimse-rd-principle"><strong>02 · Longitudinal</strong><div class="text-secondary small mt-1">한 번의 값보다 같은 사람의 반복 변화와 지속기간을 보존합니다.</div>'+refs([28,30,31,33])+'</div><div class="kimse-rd-principle"><strong>03 · Quality & Provenance</strong><div class="text-secondary small mt-1">누락·기기·앱·모델·산식 버전까지 남겨 재현 가능하게 합니다.</div>'+refs([12,14,32])+'</div><div class="kimse-rd-principle"><strong>04 · Reuse Governance</strong><div class="text-secondary small mt-1">목적별 동의와 가명처리를 데이터 자체의 메타데이터로 관리합니다.</div>'+refs([12,32])+'</div></div></div></div>'
  +'<div class="row g-3"><div class="col-xl-8"><div class="card h-100"><div class="card-header"><div><h3 class="card-title">R&D 정규화 데이터의 핵심 Variable Family</h3><div class="text-secondary small">각 변수군은 앱 신호·개인 baseline Δ·전문평가 outcome과 연결하고, 근거 원문까지 추적할 수 있어야 합니다.</div></div></div><div class="card-body py-0"><div class="list-group list-group-flush">'
  +row('1. 대상자·위험요인 Context','연령·교육·혈압·대사·생활습관·사회관계 등 해석에 필요한 맥락을 별도 계층으로 저장합니다. CAIDE 입력과 일일 걸음수는 같은 변수로 자동 환산하지 않습니다.',[1,2,6,7,8,18,19,20,21])
  +row('2. Passive Longitudinal Signals','수면·활동·이동·생활반경·루틴을 날짜별 시계열로 보존하고, 유효일·coverage·device-off/non-wear·missing reason을 함께 기록합니다.',[12,13])
  +row('3. Speech / Gait / Interaction Features','음성·보행·터치 등은 재현 가능한 feature와 개인 변화량으로 저장합니다. 원 연구의 AUC·민감도·특이도를 KIMSE 성능으로 재사용하지 않습니다.',[10,11,13,14,15])
  +row('4. Repeated Cognitive / Functional Measures','KIMSE 자체 반복과제의 원반응·정확도·반응시간·개인 delta와, 검증된 전문검사의 점수를 서로 다른 계층으로 보존합니다.',[9,16,17])
  +row('5. Outcome / Professional Labels','전문의 평가·신경심리검사·필요시 혈액/PET/CSF 등 바이오마커를 관찰 데이터와 분리된 Ground Truth 계층으로 연결합니다.',[3,4,5,29])
  +row('6. Provenance / Consent / Version','subject pseudonymous ID, source device/provider, app build, Evidence/model/transform version, purpose-specific consent, missingness/quality metadata를 함께 기록합니다.',[12,14,32])
  +'</div></div></div></div>'
  +'<div class="col-xl-4"><div class="card h-100"><div class="card-header"><h3 class="card-title">Longitudinal Unit</h3></div><div class="card-body"><div class="kimse-rd-units"><div class="kimse-rd-unit"><strong>Subject</strong><span>가명 대상자·cohort</span></div><div class="kimse-rd-unit"><strong>Day</strong><span>수면·활동·이동·coverage</span></div><div class="kimse-rd-unit"><strong>Session</strong><span>음성·인지·보행 과제</span></div><div class="kimse-rd-unit"><strong>Event</strong><span>가족확인·상태변화</span></div><div class="kimse-rd-unit"><strong>Outcome</strong><span>전문평가·바이오마커</span></div><div class="kimse-rd-unit"><strong>Provenance</strong><span>출처·산식·버전</span></div></div><div class="alert alert-success mt-3 mb-0"><strong>핵심</strong><br>값이 없는 날을 0으로 만들지 않고, 왜 없는지까지 데이터로 보존합니다.</div></div></div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><div><h3 class="card-title">표준 임상 Backbone + KIMSE 연속 생활데이터</h3><div class="text-secondary small">기존 권위 코호트와 다른 데이터만 모으는 것이 아니라, 비교·검증 가능한 공통 축을 함께 확보한 뒤 KIMSE 고유 시계열을 같은 대상자에 연결합니다.</div></div></div><div class="card-body"><div class="row g-3"><div class="col-lg-6"><div class="kimse-rd-principle h-100"><strong>Standard clinical / multimodal backbone</strong><div class="text-secondary small mt-1">인구학·위험요인 · 표준 인지/기능평가 · 전문 진단/추적 · 혈액·유전 · 가능한 경우 MRI/PET/CSF · actigraphy/웨어러블을 직접 수집하거나 기관 연계로 확보합니다.</div>'+refs([3,4,29,30,31])+'</div></div><div class="col-lg-6"><div class="kimse-rd-principle h-100"><strong>KIMSE-native continuous layer</strong><div class="text-secondary small mt-1">수면·활동·보행·이동·생활반경·루틴·말하기·상호작용·반복인지·가족확인과 개인 baseline Δ를 고빈도 종단 시계열로 연결합니다.</div>'+refs([10,11,12,13,14,15])+'</div></div></div><div class="alert alert-info mt-3 mb-0"><strong>목표</strong><br>같은 대상자의 표준 임상/바이오마커 축과 KIMSE 생활 시계열을 함께 보유해, 기존 연구와 직접 비교하면서 KIMSE 고유 데이터가 추가로 제공하는 연구가치를 검증합니다.</div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><div><h3 class="card-title">Benchmark-informed 확보 로드맵</h3><div class="text-secondary small">아래 숫자는 시장의 공식 최소요건이 아니라, 실제 AD/MCI 연구 benchmark를 바탕으로 정한 KIMSE의 연구자산 확보 목표입니다.</div></div></div><div class="card-body"><div class="row g-3"><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-green-lt">R1 · SIGNAL</span><div class="kimse-stage-target mt-2">200–250명 × 8–12주</div><div class="kimse-stage-note">임상군/표준평가 anchor를 붙여 digital signal validity를 확인합니다.</div>'+refs([28])+'</div></div><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-green-lt">R2 · LONGITUDINAL</span><div class="kimse-stage-target mt-2">600명+ × 12개월</div><div class="kimse-stage-note">continuous day-level + 반복 전문평가로 개인 변화 궤적을 검증합니다. 국내 MCD·종적데이터 구조와의 호환성을 함께 확보합니다.</div>'+refs([31,34,35])+'</div></div><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-azure-lt">R3 · MULTIMODAL</span><div class="kimse-stage-target mt-2">1,000명+ × 12–24개월</div><div class="kimse-stage-note">CN/SCD/MCI/early AD 구성, MCI 300명+ 목표, biomarker-linked subset을 확보합니다.</div>'+refs([29,30])+'</div></div><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-orange-lt">R4 · PROGRESSION</span><div class="kimse-stage-target mt-2">1,500명+ × 24–36개월</div><div class="kimse-stage-note">MCI 500명+과 반복 전문평가로 실제 progression event를 축적합니다.</div>'+refs([33])+'</div></div><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-purple-lt">R5 · MULTI-SITE</span><div class="kimse-stage-target mt-2">10,000명+ pooled</div><div class="kimse-stage-note">기관간 공통 schema와 contributor governance로 pooled R&D 자산을 만듭니다.</div>'+refs([32])+'</div></div></div><div class="alert alert-info mt-3 mb-0"><strong>해석 원칙</strong><br>2년의 스마트폰 로그만 있고 전문평가가 없는 데이터보다, 더 짧더라도 MCI/AD 분류와 amyloid 같은 강한 Ground Truth가 연결된 데이터가 특정 검증 연구에서는 더 높은 가치를 가질 수 있습니다.'+refs([29])+'</div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><div><h3 class="card-title">한국 국가 R&D 기준선</h3><div class="text-secondary small">KIMSE의 절대 최소요건이 아니라, 국내에서 research-grade 치매 종적데이터를 어떻게 정의하는지 보여주는 공식 비교기준입니다.</div></div></div><div class="card-body"><div class="row g-3"><div class="col-md-4"><div class="kimse-rd-stage"><span class="badge bg-purple-lt">COHORT MIX</span><div class="kimse-stage-target mt-2">780명+ · MCI 30%+ · 치매 20%+</div><div class="kimse-stage-note">임상·혈액·MRI·Amyloid PET 기반 MCD에 Tau PET·다중 혈액바이오마커를 추가합니다.</div>'+refs([34])+'</div></div><div class="col-md-4"><div class="kimse-rd-stage"><span class="badge bg-purple-lt">LONGITUDINAL</span><div class="kimse-stage-target mt-2">2년 주기 추적</div><div class="kimse-stage-note">2차·3차 추적을 계획하고, 같은 대상자의 임상·영상·혈액 변화를 반복 연결합니다.</div>'+refs([34,35])+'</div></div><div class="col-md-4"><div class="kimse-rd-stage"><span class="badge bg-purple-lt">QUALITY</span><div class="kimse-stage-target mt-2">결측치 5% 이하</div><div class="kimse-stage-note">DMP·QC·표준화·연구 활용 동의를 데이터 자체의 품질조건으로 관리합니다.</div>'+refs([34])+'</div></div></div><div class="alert alert-info mt-3 mb-0"><strong>KIMSE의 방향</strong><br>이 공통 임상·바이오마커 backbone과 호환되는 데이터를 확보하면서, 동일 대상자에 수면·활동·이동·생활반경·말하기·상호작용 등 고빈도 실생활 시계열을 추가합니다.'+refs([31,34,35])+'</div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><h3 class="card-title">외부 공개 원칙</h3></div><div class="card-body"><div class="alert alert-success mb-0"><strong>연구 활용을 위한 공개 범위</strong><br>연구·기관 R&D용 정규화 구조 · 공동연구·검증 · 목적별 동의 · 가명·비식별 처리 · 데이터 품질·출처·버전 · benchmark-informed 확보 로드맵을 공개합니다. 상업화 분석은 내부 사업자료에서 별도로 관리합니다.</div></div></div>'
  +'</div>';

function pageHref(key){
  if(key==='evidence')return './';
  if(key==='clinical')return './clinical.html';
  return './rd.html';
}
function choice(key,no,title,en,desc){
  return '<a class="kimse-primary-choice '+(PAGE_MODE===key?'active':'')+'" href="'+pageHref(key)+'" '+(PAGE_MODE===key?'aria-current="page"':'')+'><span class="kimse-primary-no">'+no+'</span><span class="kimse-primary-copy"><span class="kimse-primary-title">'+title+'</span><span class="kimse-primary-en">'+en+'</span><span class="kimse-primary-desc">'+desc+'</span></span><span class="kimse-primary-go" aria-hidden="true">→</span></a>';
}
var hub='<section class="kimse-primary-hub" id="evidence-home"><div class="kimse-primary-head"><div><h2>영역 선택</h2><p>각 항목은 독립된 페이지입니다.</p></div><span class="badge bg-blue-lt">Updated 2026.10.06 · 15</span></div><div class="kimse-primary-grid" aria-label="Evidence 대분류">'+choice('evidence','01','관찰 근거','EVIDENCE','낌새가 무엇을 관찰하고 왜 보는지, 원문 근거와 함께 확인합니다.')+choice('clinical','02','의료 리포트','CLINICAL HANDOFF','누적된 변화를 의료진이 빠르게 이해할 수 있는 형태로 정리합니다.')+choice('rd','03','연구·기관 R&D','RESEARCH DATA MODEL','공동연구·검증을 위한 종단 데이터 정규화 구조를 확인합니다.')+'</div></section>';

root.insertAdjacentHTML('afterbegin',hub);
var hubEl=document.getElementById('evidence-home');

if(PAGE_MODE==='clinical'&&hubEl){
  hubEl.insertAdjacentHTML('afterend','<section class="kimse-application-card mb-4" id="evidence-application">'+clinical+'</section>');
}else if(PAGE_MODE==='rd'&&hubEl){
  hubEl.insertAdjacentHTML('afterend','<section class="kimse-application-card mb-4" id="evidence-application">'+rd+'</section>');
}

/* Evidence page loads additional sections asynchronously; always keep the main selector first. */
if(PAGE_MODE==='evidence'&&hubEl){
  var keepHubFirst=function(){
    if(root.firstElementChild!==hubEl)root.insertBefore(hubEl,root.firstElementChild);
  };
  var hubObserver=new MutationObserver(keepHubFirst);
  hubObserver.observe(root,{childList:true});
  keepHubFirst();
}

var title=document.querySelector('.page-header .page-title');
var desc=document.querySelector('.page-header p.text-secondary');
if(title&&desc){
  if(PAGE_MODE==='clinical'){
    title.textContent='의료진에게 필요한 변화만 빠르게 전달합니다';
    desc.textContent='낌새의 관찰값을 진단과 구분한 채, 변화의 시작·경과·기능 영향·가족 확인·데이터 품질을 구조화해 보여줍니다.';
  }else if(PAGE_MODE==='rd'){
    title.textContent='공동연구·검증이 가능한 종단 데이터 구조를 만듭니다';
    desc.textContent='동의 범위와 목적 제한을 전제로 생활·인지 변화 데이터를 정규화하고 출처·품질·누락·전문평가 결과를 함께 관리합니다.';
  }
}

/* Legacy same-page links now redirect to the dedicated pages. */
if(PAGE_MODE==='evidence'){
  if(location.hash==='#clinical-handoff'||location.hash==='#clinical')location.replace('./clinical.html');
  if(location.hash==='#research-data-model'||location.hash==='#rd')location.replace('./rd.html');
}

document.querySelectorAll('.badge.bg-secondary-lt').forEach(function(e){if(e.textContent.indexOf('Updated 2026.09.23')>=0)e.textContent='Updated 2026.10.06 · Evidence Registry 15';});
document.querySelectorAll('.text-center.text-secondary.small.py-4').forEach(function(e){if(e.textContent.indexOf('KIMSE Evidence Registry')>=0)e.textContent='KIMSE Evidence Registry · Updated 2026.10.06';});
})();