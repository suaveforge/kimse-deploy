(function(){
'use strict';
var root=document.querySelector('.page-body .container-xl');
if(!root||document.getElementById('evidence-application'))return;
var PAGE_MODE=document.body.getAttribute('data-evidence-page')||'menu';

var names={
  1:'Lancet Commission 2024',2:'WHO Risk Reduction Guideline',3:'AA 2024 Diagnostic Criteria',
  4:'대한치매학회 진단·평가 지침',5:'FDA pTau217/Aβ',6:'CAIDE',7:'ANU-ADRI',8:'LIBRA/LIBRA2',
  9:'MoCA-K Validation',10:'Gait + Speech + Drawing',11:'Speech Digital Biomarker',12:'Passive DHT Review',
  13:'Wearable/Portable Digital Biomarkers',14:'AI Digital Biomarker Landscape',15:'SCD Dual-task Meta-analysis',
  16:'Korean VR Spatial Memory',17:'FAQ6 / IADL',18:'Incident MCI Meta-analysis',19:'Umbrella Review',
  20:'CAIDE Operationalization',21:'Risk-index Operationalization',22:'Olfactory Meta-analysis',
  23:'DETeCD-ADRD Primary Care',24:'DETeCD-ADRD Specialty Care',25:'NICE NG97',26:'HL7 IPS',27:'KR Core',
  28:'RADAR-AD',29:'Bio-Hermes',30:'ADNI',31:'KBASE',32:'CPAD',33:'MCI Prognosis Meta-analysis',
  34:'Korea Longitudinal Data RFP',35:'Dementia Platform Korea / TRR',36:'ADI World Alzheimer Report 2021'
};
function pad(n){return String(n).padStart(2,'0')}
function refs(list){
  return '<div class="d-flex flex-wrap gap-1 mt-2">'+list.map(function(n){
    var href=PAGE_MODE==='observation'?'#evidence-src-'+pad(n):'./observation.html#evidence-src-'+pad(n);
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
style.textContent='.kimse-primary-hub{max-width:1040px;margin:54px auto 0;padding:0 8px}.kimse-primary-head{text-align:center;margin-bottom:24px}.kimse-primary-head h2{font-size:clamp(1.65rem,2.6vw,2rem);line-height:1.2;margin:0;color:#182433;font-weight:800}.kimse-primary-head p{margin:.55rem 0 0;color:#66788a;font-size:.95rem}.kimse-primary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.kimse-primary-choice{text-decoration:none!important;aspect-ratio:1/1;border:1px solid #dfe5ec;border-radius:20px;background:#fff;padding:22px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#182433;box-shadow:0 8px 24px rgba(24,50,80,.055);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}.kimse-primary-choice:hover{transform:translateY(-3px);border-color:#bfd0e2;box-shadow:0 14px 34px rgba(24,50,80,.11);background:#fbfdff}.kimse-primary-choice:focus-visible{outline:3px solid rgba(32,107,196,.18);outline-offset:3px}.kimse-primary-icon{width:70px;height:70px;border-radius:20px;display:grid!important;place-items:center;background:#eef5ff;color:#206bc4;margin-bottom:22px}.kimse-primary-icon .ti{font-size:35px;line-height:1}.kimse-primary-title{display:block;font-size:1.18rem;font-weight:800;line-height:1.2;color:#182433;word-break:keep-all}.kimse-primary-en{display:block;margin-top:7px;font-size:.66rem;line-height:1.2;font-weight:700;letter-spacing:.07em;color:#7c8da2}.kimse-primary-desc,.kimse-primary-no{display:none!important}.kimse-application-card{border:0;background:transparent;box-shadow:none}.kimse-purpose{border-left:4px solid #206bc4;background:#f6f9fc;padding:14px 16px;border-radius:10px}.kimse-rd-guard{border-left-color:#2fb344}.kimse-evidence-ref{white-space:normal;text-align:left;line-height:1.3}.kimse-architecture{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kimse-architecture-step{border:1px solid #dde6ef;border-radius:12px;padding:12px;background:#fff}.kimse-architecture-step strong{display:block;margin-bottom:4px}.kimse-output-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kimse-output-card{border:1px solid #e0e7ef;border-radius:12px;padding:12px;background:#f8fafc}.kimse-time-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kimse-time-card{border-radius:12px;padding:13px;border:1px solid #dbe5ef}.kimse-time-card b{font-size:1.05rem}.kimse-time-card span{display:block;color:#66788a;font-size:.82rem;margin-top:4px}@media(max-width:991.98px){.kimse-primary-hub{max-width:680px;margin-top:36px}.kimse-primary-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.kimse-primary-choice{padding:18px 14px}.kimse-primary-icon{width:58px;height:58px;border-radius:17px;margin-bottom:16px}.kimse-primary-icon .ti{font-size:30px}.kimse-primary-title{font-size:1.05rem}.kimse-architecture,.kimse-output-grid,.kimse-time-grid{grid-template-columns:1fr}}@media(max-width:575.98px){.kimse-primary-hub{margin-top:26px;padding:0 4px}.kimse-primary-head{margin-bottom:18px}.kimse-primary-head h2{font-size:1.4rem}.kimse-primary-head p{font-size:.82rem}.kimse-primary-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kimse-primary-choice{border-radius:16px;padding:12px 8px}.kimse-primary-icon{width:48px;height:48px;border-radius:14px;margin-bottom:12px}.kimse-primary-icon .ti{font-size:25px}.kimse-primary-title{font-size:.94rem}.kimse-primary-en{font-size:.53rem;margin-top:5px}}';
document.head.appendChild(style);
var rdStyle=document.createElement('style');
rdStyle.textContent='.kimse-rd-principles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.kimse-rd-principle{border:1px solid #dfe8e4;border-radius:12px;padding:12px;background:#f8fcfa}.kimse-rd-units{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.kimse-rd-unit{border:1px solid #dde6ef;border-radius:10px;padding:10px;background:#fff}.kimse-rd-unit strong{display:block}.kimse-rd-unit span{display:block;color:#66788a;font-size:.78rem;margin-top:3px}.kimse-rd-stage{border:1px solid #dde6ef;border-radius:12px;padding:13px;height:100%;background:#fff}.kimse-rd-stage .kimse-stage-target{font-weight:800;font-size:1.05rem}.kimse-rd-stage .kimse-stage-note{color:#66788a;font-size:.82rem;margin-top:5px}@media(max-width:991.98px){.kimse-rd-principles{grid-template-columns:repeat(2,minmax(0,1fr))}.kimse-rd-units{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:767.98px){.kimse-rd-principles{grid-template-columns:1fr}.kimse-rd-units{grid-template-columns:repeat(2,minmax(0,1fr))}}';
rdStyle.textContent += '.kimse-rd-outreach summary{cursor:pointer;list-style:none}.kimse-rd-outreach summary::-webkit-details-marker{display:none}.kimse-rd-outreach summary:hover{background:#f8fafc}.kimse-rd-outreach-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 18px;padding-left:1.2rem}.kimse-rd-outreach-list li{overflow-wrap:anywhere}.kimse-rd-outreach table{min-width:650px}.kimse-rd-outreach summary strong{line-height:1.5}@media(max-width:767.98px){.kimse-rd-outreach-list{grid-template-columns:1fr}.kimse-rd-outreach .card-body{padding:14px}}';
document.head.appendChild(rdStyle);
var trustStyle=document.createElement('style');
trustStyle.textContent='.kimse-trust-hero{border:1px solid #d8e4f0;background:linear-gradient(135deg,#f5f9ff,#f6fbf8);box-shadow:0 14px 36px rgba(25,57,92,.06)}.kimse-trust-pillars{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.kimse-trust-pillar{border:1px solid #dce6ef;border-radius:14px;padding:16px;background:#fff;height:100%}.kimse-trust-pillar .num{font-size:.75rem;font-weight:900;letter-spacing:.06em}.kimse-trust-pillar h3{margin:.45rem 0 .55rem}.kimse-trust-flow{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.kimse-trust-flow-step{position:relative;border:1px solid #dce6ef;border-radius:12px;padding:12px;background:#fff;min-height:112px}.kimse-trust-flow-step b{display:block;font-size:.78rem;color:#206bc4;margin-bottom:5px}.kimse-trust-flow-step strong{display:block;line-height:1.25}.kimse-trust-flow-step span{display:block;color:#66788a;font-size:.78rem;line-height:1.35;margin-top:5px}.kimse-trust-question{border:1px solid #dfe7ef;border-radius:12px;padding:13px;background:#f8fafc;height:100%}.kimse-trust-stage{border:1px solid #dfe7ef;border-radius:13px;padding:15px;background:#fff;height:100%}.kimse-trust-stage h3{margin:.45rem 0}.kimse-trust-stage ul{padding-left:1.1rem;margin-bottom:0}.kimse-trust-stage li{margin-bottom:.4rem}.kimse-trust-stage li:last-child{margin-bottom:0}.kimse-trust-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}.kimse-trust-compare>div{border-radius:13px;padding:16px}.kimse-trust-nochain{border:1px solid #f0d6d6;background:#fff8f8}.kimse-trust-chain{border:1px solid #cfe4dc;background:#f5fbf8}@media(max-width:1199.98px){.kimse-trust-flow{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:991.98px){.kimse-trust-pillars{grid-template-columns:1fr}.kimse-trust-compare{grid-template-columns:1fr}}@media(max-width:575.98px){.kimse-trust-flow{grid-template-columns:1fr}}';
document.head.appendChild(trustStyle);

var clinical=''
  +'<div id="clinical-handoff" class="kimse-application-panel" data-panel="clinical">'
  +'<div class="kimse-purpose mb-3"><div class="text-uppercase small fw-bold text-azure">PURPOSE · CLINICAL HANDOFF</div><h3 class="mt-1 mb-2">리포트는 PDF 한 장이 아니라, 의료진이 필요한 사실을 빠짐없이 보존한 Clinical Dataset입니다</h3><div class="text-secondary">낌새의 장기 관찰을 임상적으로 읽히는 구조로 정제하고, 같은 사실을 인쇄/PDF·동적 Clinical View·향후 EMR/FHIR 연계에 맞게 표현합니다. 목적은 진단을 대신하는 것이 아니라 진료실에서 놓치기 쉬운 변화의 시작·순서·지속성·기능영향·가족 확인·데이터 품질을 전달하는 것입니다.</div></div>'
  +'<div class="card mb-3"><div class="card-header"><div><h3 class="card-title">하나의 Clinical Truth, 국가·병원별로는 View/Profile만 변경</h3><div class="text-secondary small">국제 공통 임상 사실을 보존하고, 한국/기관별 용어·검사·표현·연동 요구를 위에 얹습니다.</div></div></div><div class="card-body"><div class="kimse-architecture"><div class="kimse-architecture-step"><span class="badge bg-blue-lt mb-2">GLOBAL CORE</span><strong>Global Clinical Core</strong><div class="text-secondary small">onset · trajectory · cognition · function · informant · confounder · quality · professional outcome</div></div><div class="kimse-architecture-step"><span class="badge bg-azure-lt mb-2">COUNTRY PROFILE</span><strong>KR Profile부터 시작</strong><div class="text-secondary small">대한치매학회 · 국내 용어/검사 · 향후 KR Core 연동</div>'+refs([4,27])+'</div><div class="kimse-architecture-step"><span class="badge bg-indigo-lt mb-2">INSTITUTION VIEW</span><strong>병원/전문의별 표시 최적화</strong><div class="text-secondary small">섹션 순서 · 기간 · PDF 구성 · EMR 전달 방식만 변경. 관찰 사실은 바꾸지 않습니다.</div>'+refs([26])+'</div></div></div></div>'
  +'<div class="row g-3"><div class="col-xl-8"><div class="card h-100"><div class="card-header"><div><h3 class="card-title">의료진에게 빠지면 안 되는 Clinical Coverage</h3><div class="text-secondary small">Alzheimer’s Association DETeCD-ADRD를 국제 내용 뼈대로, 대한치매학회·NICE와 ADI World Alzheimer Report 2021을 교차 기준으로 사용합니다.</div></div></div><div class="card-body py-0"><div class="list-group list-group-flush">'
  +row('1. 변화의 시작·순서·경과','무엇이 먼저 시작됐는지, 빈도와 진행 속도, 지속/회복/변동을 시간축으로 정리합니다.',[23,24,25,4,36])
  +row('2. 인지기능 변화','기억·주의·언어·집행기능·시공간 등 개인 기준 대비 변화를 보여줍니다. KIMSE 자체 과제를 MoCA-K 점수로 환산하지 않습니다.',[23,24,4,9,16,36])
  +row('3. ADL / IADL · 독립성 영향','약속·최근사건·금전/복약·외출/길찾기 등 실제 생활기능 변화를 사용자/가족 출처와 함께 구분합니다.',[23,24,25,17,36])
  +row('4. 기분·행동·감각·운동 Context','현재 기분 메모와 날짜가 있는 기분·행동 변화 이력을 분리합니다. 청력·시각·보행·균형·운동 변화도 날짜가 있는 사용자 보고, 현재 청력 맥락, passive 이동·활동 신호를 서로 다른 출처로 보존하며 어떤 사용자 보고도 임상진찰·진단으로 바꾸지 않습니다.',[23,24,25,4,36])
  +row('5. 생활·디지털 종단 변화','수면·활동·이동·생활반경·보행·말하기 등을 절대값보다 개인 baseline 대비 변화량·지속기간·동시변화 중심으로 보여줍니다.',[10,11,12,13,15])
  +row('6. 위험요인과 가역적/혼란 요인','장기 위험요인은 현재 변화와 분리하고, 복약·수면·기분·급성질환·감각저하 등 다른 설명 가능성은 실제 확인된 정보만 표시합니다.',[23,25,36,1,2,6,7,8])
  +row('7. 가족 / Informant 확인','누가, 무엇을, 언제 확인했는지 기록하고 사용자 진술·수동 입력·passive data와 섞지 않습니다. 본인과 가족의 보고가 다르면 합쳐 버리지 않고 불일치 자체를 별도 운영 필드로 보여줍니다.',[23,24,25,17,36])
  +opRow('8. 데이터 품질·누락·출처','유효일·coverage·missing·device off/non-wear·기기/앱/모델 버전은 임상 주장 자체가 아니라 KIMSE 운영 필드로 명확히 표시합니다.')
  +row('9. 전문평가 Handback','의료진 인상, 신경심리검사, 필요시 영상/검사/바이오마커, 진단·추적계획을 KIMSE 관찰과 별도 Professional layer로 되돌려 연결합니다.',[3,4,5,36])
  +'</div></div></div></div>'
  +'<div class="col-xl-4"><div class="card mb-3"><div class="card-header"><h3 class="card-title">절대 섞지 않는 4가지</h3></div><div class="card-body"><ul class="mb-0"><li class="mb-2">KIMSE 관찰 ↔ 의료진 진단</li><li class="mb-2">개인 baseline Δ ↔ 집단 cutoff</li><li class="mb-2">사용자 진술 ↔ 가족 확인 ↔ passive sensor</li><li>임상 근거 필드 ↔ KIMSE operational field</li></ul>'+refs([23,4,9,17,12])+'</div></div><div class="card"><div class="card-header"><h3 class="card-title">현재 권위 기준</h3></div><div class="card-body"><div class="small text-secondary mb-2">단일 국제 표준 서식 대신, 내용 기준과 데이터 교환 기준을 분리합니다.</div>'+refs([23,24,4,25,36,26,27])+'</div></div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><div><h3 class="card-title">같은 Dataset에서 세 가지 View를 생성</h3><div class="text-secondary small">PDF를 위해 데이터를 자르지 않습니다.</div></div></div><div class="card-body"><div class="kimse-output-grid"><div class="kimse-output-card"><strong>Print / PDF</strong><div class="text-secondary small mt-1">1페이지 Pre-visit 요약 + 선택적 상세부록. 전달·인쇄·보관 최적화.</div></div><div class="kimse-output-card"><strong>Interactive Clinical View</strong><div class="text-secondary small mt-1">영역 필터 → 개인 baseline 추이 → 동시변화 → 가족확인·전문평가·기분행동·감각운동·복약변경·급성질환·안전사건 overlay → 데이터 공백 → source event·Evidence drill-down 순으로 탐색합니다. 사용자 진료맥락은 provider-verified 결과와 구분하며, source event는 좌표·임의 metadata를 제외한 제한된 관찰값만 노출합니다.</div></div><div class="kimse-output-card"><strong>EMR / FHIR</strong><div class="text-secondary small mt-1">같은 Clinical Dataset을 IPS/KR Core 방향의 resource-level mapping으로 정의했습니다. 실제 FHIR endpoint·기관별 profile validation은 연계 단계에서 구현합니다.</div>'+refs([26,27])+'</div></div></div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><h3 class="card-title">의료진 가시성 목표 · 10 / 30 / 60초</h3></div><div class="card-body"><div class="kimse-time-grid"><div class="kimse-time-card"><b>10초</b><span>왜 왔는지 + 가장 큰 지속 변화가 무엇인지 파악</span></div><div class="kimse-time-card"><b>30초</b><span>언제부터 어떤 순서로 변했고 기능과 가족 관찰에 어떤 영향이 있었는지 파악</span></div><div class="kimse-time-card"><b>60초</b><span>데이터 품질·혼란요인·추가로 파고들 영역을 판단</span></div></div></div></div>'
  +'</div>';

var rdInstitutionOutreach="<section class=\"card mt-3 kimse-rd-outreach\" id=\"rd-institution-outreach\" aria-labelledby=\"rd-outreach-title\">\n  <div class=\"card-header\"><div><h3 class=\"card-title\" id=\"rd-outreach-title\">기관별 자료확보·공동연구 준비 현황</h3><div class=\"text-secondary small\">기관 조사는 진행 중이며, 자료 요청이나 후보 등재가 협약·공동연구 체결을 의미하지 않습니다.</div></div></div>\n  <div class=\"card-body\">\n  <div class=\"row g-2 mb-3\">\n    <div class=\"col-6 col-lg-3\"><div class=\"border rounded-3 p-3 h-100\"><div class=\"text-secondary small\">공식 자료요청 메일 발송</div><div class=\"h2 mb-0 mt-1\">3곳</div></div></div>\n    <div class=\"col-6 col-lg-3\"><div class=\"border rounded-3 p-3 h-100\"><div class=\"text-secondary small\">자동 수신 안내 회신</div><div class=\"h2 mb-0 mt-1\">1곳</div></div></div>\n    <div class=\"col-6 col-lg-3\"><div class=\"border rounded-3 p-3 h-100\"><div class=\"text-secondary small\">실질 자료 회신</div><div class=\"h2 mb-0 mt-1\">0곳</div></div></div>\n    <div class=\"col-6 col-lg-3\"><div class=\"border rounded-3 p-3 h-100\"><div class=\"text-secondary small\">협력 합의·계약</div><div class=\"h2 mb-0 mt-1\">0곳</div></div></div>\n  </div>\n  <h4 class=\"mb-2\">현재 공식 문의기관 · 3곳</h4>\n  <div class=\"table-responsive\"><table class=\"table table-vcenter table-bordered mb-2\"><thead><tr><th scope=\"col\">기관</th><th scope=\"col\">조사 내용</th><th scope=\"col\">자료 요청</th><th scope=\"col\">협력 상태</th></tr></thead><tbody><tr><td class=\"fw-semibold\">Fife Council</td><td class=\"text-secondary small\">원계약·연장, 이용인원과 실제 관찰기간</td><td><span class=\"badge bg-azure-lt\">이메일 발송</span><div class=\"text-secondary small mt-1\">2026.10.09 · 실질 자료 회신 전</div></td><td><span class=\"text-secondary small\">협력 미체결</span></td></tr><tr><td class=\"fw-semibold\">Cornwall Council</td><td class=\"text-secondary small\">해당 계약의 치매 관련 이용자·관찰기간</td><td><span class=\"badge bg-azure-lt\">이메일 발송</span><div class=\"text-secondary small mt-1\">2026.10.09 · 실질 자료 회신 전</div></td><td><span class=\"text-secondary small\">협력 미체결</span></td></tr><tr><td class=\"fw-semibold\">Darlington Borough Council</td><td class=\"text-secondary small\">계약별 인원·모니터링 기간·돌봄 범위</td><td><span class=\"badge bg-azure-lt\">수신 안내 회신</span><div class=\"text-secondary small mt-1\">2026.10.09 · 일반 안내만 수신</div></td><td><span class=\"text-secondary small\">협력 미체결</span></td></tr></tbody></table></div>\n   <div class=\"alert alert-info small mb-3\" role=\"note\"><strong>상태 해석:</strong> Darlington의 자동 회신은 정식 FOI 접수번호나 실질 자료 회신이 아닙니다. 세 기관 모두 공식 협력·공동연구·자료 제공 승인이 확인된 상태는 아닙니다.</div>\n   <div class=\"d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2\"><h4 class=\"mb-0\">조사 후보 · 49곳</h4><span class=\"text-secondary small\">추가 우선 검토 42곳 + 과거 자료 7곳</span></div>\n   <p class=\"text-secondary small mb-2\">아래 기관은 공개 기록에서 조사 필요성을 확인한 후보입니다. 아직 메일 발송이나 공동연구 협의를 시작하지 않았습니다.</p>\n   <div class=\"kimse-rd-outreach-groups\"><details class=\"border rounded-3 mb-2\"><summary class=\"d-flex justify-content-between align-items-center gap-2 p-3\"><span><strong>영국 계약 검증 1차 후보</strong><span class=\"d-block text-secondary small\">영국 Just Checking 실제 공공지출의 원계약·실사용 통계 확인 대상</span></span><span class=\"text-secondary small text-nowrap\">12곳 · 미문의</span></summary><div class=\"px-3 pb-3\"><ul class=\"kimse-rd-outreach-list mb-0\"><li>Manchester City Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>East Sussex County Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Hull City Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Blackburn with Darwen Borough Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Oxfordshire County Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Staffordshire County Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Wokingham Borough Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Stoke-on-Trent City Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Southampton City Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Shropshire Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Portsmouth City Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Hackney Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li></ul></div></details><details class=\"border rounded-3 mb-2\"><summary class=\"d-flex justify-content-between align-items-center gap-2 p-3\"><span><strong>영국 계약 검증 2차 후보</strong><span class=\"d-block text-secondary small\">추가 계약 관련성·관찰 대상군 확인 후 접촉</span></span><span class=\"text-secondary small text-nowrap\">12곳 · 미문의</span></summary><div class=\"px-3 pb-3\"><ul class=\"kimse-rd-outreach-list mb-0\"><li>Warrington Borough Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>North Lincolnshire Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>South Tyneside Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Leicestershire County Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Sefton Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Westminster City Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Hillingdon Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Kensington and Chelsea Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Southwark Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Leeds City Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Newham Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Nottinghamshire County Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li></ul></div></details><details class=\"border rounded-3 mb-2\"><summary class=\"d-flex justify-content-between align-items-center gap-2 p-3\"><span><strong>국내 공공 돌봄·인지관리 조사 후보</strong><span class=\"d-block text-secondary small\">치매·인지관리 사업 수행구조와 서비스 운영 근거 확인</span></span><span class=\"text-secondary small text-nowrap\">8곳 · 미문의</span></summary><div class=\"px-3 pb-3\"><ul class=\"kimse-rd-outreach-list mb-0\"><li>Daejeon Jung-gu <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Yesan County Public Health Center <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Yecheon County Public Health Center <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Geumcheon-gu, Seoul <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Gunsan City Dementia Safety Center <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Sancheong County Health Medical Center <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Dongducheon City Dementia Safety Center <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Seoul Metropolitan Government <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li></ul></div></details><details class=\"border rounded-3 mb-2\"><summary class=\"d-flex justify-content-between align-items-center gap-2 p-3\"><span><strong>임상·연구데이터 검증 후보</strong><span class=\"d-block text-secondary small\">연구 데이터 표준·임상지표·반복 측정 방식 참고</span></span><span class=\"text-secondary small text-nowrap\">10곳 · 미문의</span></summary><div class=\"px-3 pb-3\"><ul class=\"kimse-rd-outreach-list mb-0\"><li>Just Checking Ltd <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Neurophet <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>NVP Healthcare <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Cambridge Cognition <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Cogstate <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>IXICO <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Akrivia Health <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Certara <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Global Alzheimer&#39;s Platform Foundation <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>University of Edinburgh / EPAD consortium <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li></ul></div></details><details class=\"border rounded-3 mb-2\"><summary class=\"d-flex justify-content-between align-items-center gap-2 p-3\"><span><strong>과거 공공문서 확인 후보</strong><span class=\"d-block text-secondary small\">과거 운영 사례의 기록 보존 여부부터 확인</span></span><span class=\"text-secondary small text-nowrap\">7곳 · 미문의</span></summary><div class=\"px-3 pb-3\"><ul class=\"kimse-rd-outreach-list mb-0\"><li>Wrexham County Borough Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Middlesbrough Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Flintshire County Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Rhondda Cynon Taf County Borough Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Coventry City Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Cambridgeshire County Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li><li>Walsall Council <span class=\"text-secondary small\">· 미문의 / 협력 미체결</span></li></ul></div></details></div><p class=\"text-secondary small mt-3 mb-0\">현황 기준일: 2026.10.09 · 총 52개 기관·업체/단체(공식 자료요청 3, 추가 검토 42, 역사자료 검토 7). 공개정보 조사 현황이며 연구협력 성과를 뜻하지 않습니다.</p>\n  </div></section>";

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
  +opRow('7. 외부 전문검사·바이오마커 출처','사용자가 외부에서 받은 검사·영상·혈액/바이오마커 결과는 기억 기반 입력, 결과지·병원앱·나의건강기록을 보고 옮긴 입력, 향후 승인된 의료 마이데이터 연계, 기관 직접연계를 서로 다른 provenance/검증수준으로 보존합니다. 사용자 입력을 기관 검증 결과로 자동 승격하지 않습니다.')
  +'</div></div></div></div>'
  +'<div class="col-xl-4"><div class="card h-100"><div class="card-header"><h3 class="card-title">Longitudinal Unit</h3></div><div class="card-body"><div class="kimse-rd-units"><div class="kimse-rd-unit"><strong>Subject</strong><span>가명 대상자·cohort</span></div><div class="kimse-rd-unit"><strong>Day</strong><span>수면·활동·이동·coverage</span></div><div class="kimse-rd-unit"><strong>Session</strong><span>음성·인지·보행 과제</span></div><div class="kimse-rd-unit"><strong>Event</strong><span>가족확인·상태변화</span></div><div class="kimse-rd-unit"><strong>Outcome</strong><span>전문평가·바이오마커</span></div><div class="kimse-rd-unit"><strong>Provenance</strong><span>출처·산식·버전</span></div></div><div class="alert alert-success mt-3 mb-0"><strong>핵심</strong><br>값이 없는 날을 0으로 만들지 않고, 왜 없는지까지 데이터로 보존합니다.</div></div></div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><div><h3 class="card-title">표준 임상 Backbone + KIMSE 연속 생활데이터</h3><div class="text-secondary small">기존 권위 코호트와 다른 데이터만 모으는 것이 아니라, 비교·검증 가능한 공통 축을 함께 확보한 뒤 KIMSE 고유 시계열을 같은 대상자에 연결합니다.</div></div></div><div class="card-body"><div class="row g-3"><div class="col-lg-6"><div class="kimse-rd-principle h-100"><strong>Standard clinical / multimodal backbone</strong><div class="text-secondary small mt-1">인구학·위험요인 · 표준 인지/기능평가 · 전문 진단/추적 · 혈액·유전 · 가능한 경우 MRI/PET/CSF · actigraphy/웨어러블을 직접 수집하거나 기관 연계로 확보합니다.</div>'+refs([3,4,29,30,31])+'</div></div><div class="col-lg-6"><div class="kimse-rd-principle h-100"><strong>KIMSE-native continuous layer</strong><div class="text-secondary small mt-1">수면·활동·보행·이동·생활반경·루틴·말하기·상호작용·반복인지·가족확인과 개인 baseline Δ를 고빈도 종단 시계열로 연결합니다.</div>'+refs([10,11,12,13,14,15])+'</div></div></div><div class="alert alert-info mt-3 mb-0"><strong>목표</strong><br>같은 대상자의 표준 임상/바이오마커 축과 KIMSE 생활 시계열을 함께 보유해, 기존 연구와 직접 비교하면서 KIMSE 고유 데이터가 추가로 제공하는 연구가치를 검증합니다.</div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><div><h3 class="card-title">Benchmark-informed 확보 로드맵</h3><div class="text-secondary small">아래 숫자는 시장의 공식 최소요건이 아니라, 실제 AD/MCI 연구 benchmark를 바탕으로 정한 KIMSE의 연구자산 확보 목표입니다.</div></div></div><div class="card-body"><div class="row g-3"><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-green-lt">R1 · SIGNAL</span><div class="kimse-stage-target mt-2">200–250명 × 8–12주</div><div class="kimse-stage-note">임상군/표준평가 anchor를 붙여 digital signal validity를 확인합니다.</div>'+refs([28])+'</div></div><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-green-lt">R2 · LONGITUDINAL</span><div class="kimse-stage-target mt-2">600명+ × 12개월</div><div class="kimse-stage-note">continuous day-level + 반복 전문평가로 개인 변화 궤적을 검증합니다. 국내 MCD·종적데이터 구조와의 호환성을 함께 확보합니다.</div>'+refs([31,34,35])+'</div></div><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-azure-lt">R3 · MULTIMODAL</span><div class="kimse-stage-target mt-2">1,000명+ × 12–24개월</div><div class="kimse-stage-note">CN/SCD/MCI/early AD 구성, MCI 300명+ 목표, biomarker-linked subset을 확보합니다.</div>'+refs([29,30])+'</div></div><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-orange-lt">R4 · PROGRESSION</span><div class="kimse-stage-target mt-2">1,500명+ × 24–36개월</div><div class="kimse-stage-note">MCI 500명+과 반복 전문평가로 실제 progression event를 축적합니다.</div>'+refs([33])+'</div></div><div class="col-md-6 col-xl"><div class="kimse-rd-stage"><span class="badge bg-purple-lt">R5 · MULTI-SITE</span><div class="kimse-stage-target mt-2">10,000명+ pooled</div><div class="kimse-stage-note">기관간 공통 schema와 contributor governance로 pooled R&D 자산을 만듭니다.</div>'+refs([32])+'</div></div></div><div class="alert alert-info mt-3 mb-0"><strong>해석 원칙</strong><br>2년의 스마트폰 로그만 있고 전문평가가 없는 데이터보다, 더 짧더라도 MCI/AD 분류와 amyloid 같은 강한 Ground Truth가 연결된 데이터가 특정 검증 연구에서는 더 높은 가치를 가질 수 있습니다.'+refs([29])+'</div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><div><h3 class="card-title">한국 국가 R&D 기준선</h3><div class="text-secondary small">KIMSE의 절대 최소요건이 아니라, 국내에서 research-grade 치매 종적데이터를 어떻게 정의하는지 보여주는 공식 비교기준입니다.</div></div></div><div class="card-body"><div class="row g-3"><div class="col-md-4"><div class="kimse-rd-stage"><span class="badge bg-purple-lt">COHORT MIX</span><div class="kimse-stage-target mt-2">780명+ · MCI 30%+ · 치매 20%+</div><div class="kimse-stage-note">임상·혈액·MRI·Amyloid PET 기반 MCD에 Tau PET·다중 혈액바이오마커를 추가합니다.</div>'+refs([34])+'</div></div><div class="col-md-4"><div class="kimse-rd-stage"><span class="badge bg-purple-lt">LONGITUDINAL</span><div class="kimse-stage-target mt-2">2년 주기 추적</div><div class="kimse-stage-note">2차·3차 추적을 계획하고, 같은 대상자의 임상·영상·혈액 변화를 반복 연결합니다.</div>'+refs([34,35])+'</div></div><div class="col-md-4"><div class="kimse-rd-stage"><span class="badge bg-purple-lt">QUALITY</span><div class="kimse-stage-target mt-2">결측치 5% 이하</div><div class="kimse-stage-note">DMP·QC·표준화·연구 활용 동의를 데이터 자체의 품질조건으로 관리합니다.</div>'+refs([34])+'</div></div></div><div class="alert alert-info mt-3 mb-0"><strong>KIMSE의 방향</strong><br>이 공통 임상·바이오마커 backbone과 호환되는 데이터를 확보하면서, 동일 대상자에 수면·활동·이동·생활반경·말하기·상호작용 등 고빈도 실생활 시계열을 추가합니다.'+refs([31,34,35])+'</div></div></div>'
  +'<div class="card mt-3"><div class="card-header"><h3 class="card-title">외부 공개 원칙</h3></div><div class="card-body"><div class="alert alert-success mb-0"><strong>연구 활용을 위한 공개 범위</strong><br>연구·기관 R&D용 정규화 구조 · 공동연구·검증 · 목적별 동의 · 가명·비식별 처리 · 데이터 품질·출처·버전 · benchmark-informed 확보 로드맵을 공개합니다. 상업화 분석은 내부 사업자료에서 별도로 관리합니다.</div></div></div>'
  +rdInstitutionOutreach
  +'</div>';


var trust=`
<div id="trust-provenance" class="kimse-application-panel" data-panel="trust">
  <div class="card kimse-trust-hero mb-3">
    <div class="card-body p-4 p-lg-5">
      <div class="text-uppercase small fw-bold text-azure">PURPOSE · TRUST & PROVENANCE</div>
      <h2 class="mt-2 mb-2">블록체인은 데이터를 저장하기 위해 쓰지 않습니다</h2>
      <p class="lead mb-3">사용자·보호자·의료기관·연구기관처럼 서로 다른 주체가 같은 데이터의 존재·변경 여부·동의 범위·이용 이력을 독립적으로 검증할 수 있게 하는 신뢰 계층으로 사용합니다.</p>
      <div class="alert alert-warning mb-0"><strong>민감한 원본은 체인 밖에 둡니다.</strong><br>위치·음성·건강정보·임상문서·직접식별정보는 기존 보호 저장소에 보관하고, 검증에 필요한 해시와 시점·동의·이력 증거만 블록체인 앵커 대상으로 설계합니다.</div>
    </div>
  </div>

  <div class="kimse-trust-pillars mb-3">
    <div class="kimse-trust-pillar">
      <div class="num text-blue">01 · SHARED TRUTH</div>
      <h3>여러 주체가 같은 사실을 공유</h3>
      <p class="text-secondary mb-2">한 기관의 DB를 절대적인 원본으로 믿지 않아도 동일한 증거값과 기록 순서를 함께 확인할 수 있게 합니다.</p>
      <div class="fw-bold">KIMSE 적용 방향</div>
      <div class="small text-secondary mt-1">사용자 → 보호자 → 병원 → 연구기관으로 데이터가 이동해도 같은 원본에서 나온 기록인지 검증.</div>
      <span class="badge bg-blue-lt mt-3">기관 연계 단계에서 강화</span>
    </div>
    <div class="kimse-trust-pillar">
      <div class="num text-green">02 · VERIFIABLE HISTORY</div>
      <h3>무결성·시점·이력을 증명</h3>
      <p class="text-secondary mb-2">특정 데이터가 그 시점에 존재했고 이후 바뀌지 않았는지, 당시 어떤 동의와 제공 이력이 있었는지 검증합니다.</p>
      <div class="fw-bold">KIMSE 적용 방향</div>
      <div class="small text-secondary mt-1">데이터 해시 · 생성시점 · 동의범위 · 접근/제공 이벤트 · 버전을 외부 검증 가능한 증거로 연결.</div>
      <span class="badge bg-green-lt mt-3">1단계 핵심 구현 범위</span>
    </div>
    <div class="kimse-trust-pillar">
      <div class="num text-purple">03 · PROGRAMMABLE RIGHTS</div>
      <h3>권리·이용조건을 규칙대로 실행</h3>
      <p class="text-secondary mb-2">누가 어떤 목적과 기간으로 데이터를 사용할 수 있는지, 철회되면 무엇이 바뀌는지 명확한 규칙으로 관리합니다.</p>
      <div class="fw-bold">KIMSE 적용 방향</div>
      <div class="small text-secondary mt-1">기관별 접근권 · 목적 제한 · 기간 만료 · 동의 철회 · 향후 데이터 이용/보상 조건의 자동화.</div>
      <span class="badge bg-purple-lt mt-3">확장 단계</span>
    </div>
  </div>

  <div class="card mb-3">
    <div class="card-header"><div><h3 class="card-title">KIMSE Trust Layer · 데이터가 증거가 되는 흐름</h3><div class="text-secondary small">원본 민감정보와 공개 검증용 증거를 분리합니다.</div></div></div>
    <div class="card-body">
      <div class="kimse-trust-flow">
        <div class="kimse-trust-flow-step"><b>01 · EVENT</b><strong>생활·행동 데이터 생성</strong><span>수면 · 이동 · 활동 · 인지과제 · 전문평가 등</span></div>
        <div class="kimse-trust-flow-step"><b>02 · OFF-CHAIN</b><strong>원본 보호 저장</strong><span>민감정보와 실제 측정값은 기존 보안 저장소에 유지</span></div>
        <div class="kimse-trust-flow-step"><b>03 · DIGEST</b><strong>검증용 해시 생성</strong><span>정규화된 원본으로 동일 입력이면 동일한 증거값 생성</span></div>
        <div class="kimse-trust-flow-step"><b>04 · CONTEXT</b><strong>동의·이력 결합</strong><span>생성시점 · 목적 · 동의범위 · 접근/제공 이벤트 연결</span></div>
        <div class="kimse-trust-flow-step"><b>05 · ANCHOR</b><strong>블록체인 앵커</strong><span>개별 해시 또는 배치 루트를 공개 검증 가능한 원장에 기록</span></div>
        <div class="kimse-trust-flow-step"><b>06 · VERIFY</b><strong>제3자 검증</strong><span>병원·연구기관이 받은 데이터와 원장 증거의 일치 여부 확인</span></div>
      </div>
    </div>
  </div>

  <div class="row g-3 mb-3">
    <div class="col-lg-6">
      <div class="card h-100">
        <div class="card-header"><h3 class="card-title">체인 밖에 두는 것</h3></div>
        <div class="card-body">
          <div class="alert alert-danger py-2"><strong>Raw personal / health data</strong></div>
          <ul class="mb-0">
            <li class="mb-2">GPS 좌표·생활동선·음성 원본</li>
            <li class="mb-2">건강·인지 측정 원자료와 임상문서</li>
            <li class="mb-2">이름·연락처 등 직접 식별정보</li>
            <li>삭제·정정 요구가 적용되는 실제 업무 데이터</li>
          </ul>
        </div>
      </div>
    </div>
    <div class="col-lg-6">
      <div class="card h-100">
        <div class="card-header"><h3 class="card-title">체인에 증거로 남길 것</h3></div>
        <div class="card-body">
          <div class="alert alert-success py-2"><strong>Minimal verification proof</strong></div>
          <ul class="mb-0">
            <li class="mb-2">데이터 digest / batch root</li>
            <li class="mb-2">생성·등록 시점과 이벤트 종류</li>
            <li class="mb-2">동의정책·목적·버전의 digest</li>
            <li>가명화된 주체/기관 식별자와 앵커 Tx·Block 참조</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="card mb-3">
    <div class="card-header"><div><h3 class="card-title">이 구조가 답해야 하는 질문</h3><div class="text-secondary small">“블록체인을 쓴다”보다 실제로 무엇을 검증할 수 있는지가 중요합니다.</div></div></div>
    <div class="card-body">
      <div class="row g-3">
        <div class="col-md-6 col-xl-3"><div class="kimse-trust-question"><strong>이 데이터가 그때 존재했나?</strong><div class="text-secondary small mt-2">원장의 시점과 원본 digest를 비교합니다.</div></div></div>
        <div class="col-md-6 col-xl-3"><div class="kimse-trust-question"><strong>중간에 바뀌지 않았나?</strong><div class="text-secondary small mt-2">현재 원본을 다시 해시해 앵커 증거와 대조합니다.</div></div></div>
        <div class="col-md-6 col-xl-3"><div class="kimse-trust-question"><strong>당시 어디까지 동의했나?</strong><div class="text-secondary small mt-2">동의 범위·목적·버전과 변경 이력을 확인합니다.</div></div></div>
        <div class="col-md-6 col-xl-3"><div class="kimse-trust-question"><strong>누가 언제 이용했나?</strong><div class="text-secondary small mt-2">접근·제공 이벤트를 데이터 provenance와 연결합니다.</div></div></div>
      </div>
    </div>
  </div>

  <div class="kimse-trust-compare mb-3">
    <div class="kimse-trust-nochain">
      <div class="text-uppercase small fw-bold text-red">EVIDENCE REGISTRY</div>
      <h3 class="mt-1">왜 이 데이터를 보는가</h3>
      <p class="mb-0 text-secondary">논문·가이드라인·임상 근거와 KIMSE 관찰 팩터를 연결해 판단 근거의 투명성을 설명합니다.</p>
    </div>
    <div class="kimse-trust-chain">
      <div class="text-uppercase small fw-bold text-green">TRUST & PROVENANCE</div>
      <h3 class="mt-1">그 데이터 자체를 왜 믿을 수 있는가</h3>
      <p class="mb-0 text-secondary">원본의 무결성·존재시점·동의범위·접근/제공 이력을 독립적으로 검증할 수 있게 합니다.</p>
    </div>
  </div>

  <div class="card mb-3">
    <div class="card-header"><div><h3 class="card-title">단계별 적용 범위</h3><div class="text-secondary small">세 가지 블록체인 가치가 KIMSE 성장단계에 따라 순서대로 커집니다.</div></div></div>
    <div class="card-body">
      <div class="row g-3">
        <div class="col-lg-4"><div class="kimse-trust-stage"><span class="badge bg-green-lt">PHASE 1 · 구현 우선</span><h3>검증 가능한 기록</h3><ul><li>원본 정규화·digest</li><li>생성시점·동의·제공 이벤트</li><li>배치 앵커 및 검증기</li><li>원본은 off-chain 유지</li></ul></div></div>
        <div class="col-lg-4"><div class="kimse-trust-stage"><span class="badge bg-blue-lt">PHASE 2 · 기관 연계</span><h3>공동 신뢰</h3><ul><li>병원·연구기관 독립 검증</li><li>기관별 provenance 연결</li><li>검증 가능한 자격/주체 식별</li><li>공동연구 데이터 교환 증거</li></ul></div></div>
        <div class="col-lg-4"><div class="kimse-trust-stage"><span class="badge bg-purple-lt">PHASE 3 · 확장</span><h3>권리 자동화</h3><ul><li>목적·기간별 접근권</li><li>동의 철회에 따른 상태 변경</li><li>기관별 사용조건 자동 집행</li><li>필요 시 이용·정산 규칙 연결</li></ul></div></div>
      </div>
    </div>
  </div>

  <div class="alert alert-info mb-0">
    <strong>검증 표시 원칙</strong><br>
    실제 블록체인 트랜잭션에 앵커가 완료되고 원본과 대조 가능한 기록만 “on-chain verified”로 표시합니다. 설계 문서나 서버 내부 로그만 존재하는 단계에서는 블록체인 검증 완료라고 표시하지 않습니다.
  </div>
</div>`;

function pageHref(key){
  if(key==='evidence')return './observation.html';
  if(key==='clinical')return './clinical.html';
  if(key==='rd')return './rd.html';
  if(key==='trust')return './trust.html';
  return './';
}
function iconClass(key){
  if(key==='evidence')return 'ti-eye';
  if(key==='clinical')return 'ti-stethoscope';
  if(key==='rd')return 'ti-flask';
  return 'ti-shield-check';
}
function choice(key,no,title,en,desc){
  return '<a class="kimse-primary-choice" href="'+pageHref(key)+'"><span class="kimse-primary-icon" aria-hidden="true"><i class="ti '+iconClass(key)+'"></i></span><span class="kimse-primary-copy"><span class="kimse-primary-title">'+title+'</span><span class="kimse-primary-en">'+en+'</span></span></a>';
}
var hub='<section class="kimse-primary-hub" id="evidence-home"><div class="kimse-primary-head"><h2>Evidence Registry</h2><p>확인할 영역을 선택하세요.</p></div><div class="kimse-primary-grid" aria-label="Evidence 대분류">'+choice('evidence','01','관찰 근거','EVIDENCE','낌새가 무엇을 관찰하고 왜 보는지, 원문 근거와 함께 확인합니다.')+choice('clinical','02','의료 리포트','CLINICAL HANDOFF','누적된 변화를 의료진이 빠르게 이해할 수 있는 형태로 정리합니다.')+choice('rd','03','연구·기관 R&D','RESEARCH DATA MODEL','공동연구·검증을 위한 종단 데이터 정규화 구조를 확인합니다.')+choice('trust','04','데이터 신뢰·검증','TRUST & PROVENANCE','데이터 무결성·시점·동의·이용 이력을 검증하는 구조를 확인합니다.')+'</div></section>';


var clinicalSubmissionStatus='<section class="card mt-3" id="clinical-submission-readiness"><div class="card-header"><div><h3 class="card-title">최종 목적 · 병원별 맞춤 리포트 원클릭 제출</h3><div class="text-secondary small">국가·병원·진료과별 필수 내용/형식을 적용하고 검증된 채널로 전송한 뒤 실제 병원 수신증빙까지 확보하는 것이 목표입니다.</div></div></div>'
+'<div class="card-body"><p class="mb-3">한 환자의 관찰·전문검사·가족 확인 정보를 한 Clinical Dataset으로 유지하고, <strong>A4 출력·PDF</strong>와 <strong>모니터·태블릿 인터랙티브 화면</strong> 및 향후 기관별 구조화 전송을 동일한 사실에서 만듭니다.</p>'
+'<div class="row g-2">'
+'<div class="col-md-4"><div class="border rounded p-3 h-100"><strong>코드상 구현</strong><p class="small text-secondary mt-2 mb-0">임상 데이터 구조·인쇄·대화형 분석·근거 추적·미검증 FHIR 후보 및 제출 전 확인 상태</p></div></div>'
+'<div class="col-md-4"><div class="border rounded p-3 h-100"><strong>의료진·병원 검증 필요</strong><p class="small text-secondary mt-2 mb-0">실제 의료기관별 문진 필수항목·표시 순서·진료과 선호·환자 매칭·동의·수신 방식 및 의료진 평가</p></div></div>'
+'<div class="col-md-4"><div class="border rounded p-3 h-100"><strong>병원 원클릭 전송 미완료</strong><p class="small text-secondary mt-2 mb-0">검증된 실제 병원 수신 채널·병원 수신 receipt·의료진 확인 근거 없음. PDF 생성은 접수가 아닙니다.</p></div></div>'
+'</div><h4 class="mt-4 mb-2">공식 근거 및 적용 범위</h4><div class="list-group list-group-flush">'
+row('임상 리포트의 내용 기준','인지·일상기능·행동·증상 경과·가족 관찰·가역적 요인의 임상 기록 기준. 개별 병원의 접수 양식과 동일하다고 주장하지 않습니다.',[23,24,4,25,36])
+row('상호운용성 기본 구조','HL7 IPS는 국제 환자요약 구조, KR Core는 한국 FHIR 제약조건. 병원별 실제 수신 승인/구현 여부와는 별도입니다.',[26,27])
+opRow('의료기관별 수집·검증 공백','개별 병원의 필수·선택 필드, 전송 채널, 의사/간호사 사용성 피드백과 실제 수신은 아직 공식 승인된 데이터로 확보되지 않았습니다.')
+'</div><p class="small text-secondary mt-3 mb-0">실제 연동 승인 없이 기관명·의료진 평가·제출 성공 상태를 생성하지 않습니다. 문서 기준: Clinical Report One-click Objective, 2026-10-09.</p></div></section>';

if(PAGE_MODE==='menu'){
  root.innerHTML='';
  root.insertAdjacentHTML('afterbegin',hub);
}else if(PAGE_MODE==='clinical'){
  root.insertAdjacentHTML('afterbegin','<section class="kimse-application-card mb-4" id="evidence-application">'+clinical+'</section>'+clinicalSubmissionStatus);
}else if(PAGE_MODE==='rd'){
  root.insertAdjacentHTML('afterbegin','<section class="kimse-application-card mb-4" id="evidence-application">'+rd+'</section>');
}else if(PAGE_MODE==='trust'){
  root.insertAdjacentHTML('afterbegin','<section class="kimse-application-card mb-4" id="evidence-application">'+trust+'</section>');
}

var title=document.querySelector('.page-header .page-title');
var desc=document.querySelector('.page-header p.text-secondary');
if(title&&desc){
  if(PAGE_MODE==='observation'){
    title.textContent='낌새가 무엇을 보고, 그 기준은 어디에서 왔는지 보여드립니다';
    desc.textContent='수면·말하기·이동·활동·인지 변화가 어떤 연구와 검증도구에 근거하는지 확인합니다.';
  }else if(PAGE_MODE==='clinical'){
    title.textContent='의료진에게 필요한 변화만 빠르게 전달합니다';
    desc.textContent='낌새의 관찰값을 진단과 구분한 채, 변화의 시작·경과·기능 영향·가족 확인·데이터 품질을 구조화해 보여줍니다.';
  }else if(PAGE_MODE==='rd'){
    title.textContent='공동연구·검증이 가능한 종단 데이터 구조를 만듭니다';
    desc.textContent='동의 범위와 목적 제한을 전제로 생활·인지 변화 데이터를 정규화하고 출처·품질·누락·전문평가 결과를 함께 관리합니다.';
  }else if(PAGE_MODE==='trust'){
    title.textContent='데이터와 동의 이력을 외부에서도 검증할 수 있게 만듭니다';
    desc.textContent='원본 민감정보는 보호 저장소에 두고, 무결성·존재시점·동의·접근·제공 이력을 블록체인 증거와 연결하는 Trust & Provenance 구조입니다.';
  }
}

/* Legacy links on the menu route redirect to dedicated content pages. */
if(PAGE_MODE==='menu'){
  if(location.hash==='#clinical-handoff'||location.hash==='#clinical')location.replace('./clinical.html');
  else if(location.hash==='#research-data-model'||location.hash==='#rd')location.replace('./rd.html');
  else if(location.hash==='#trust-provenance'||location.hash==='#trust')location.replace('./trust.html');
  else if((location.hash||'').indexOf('#evidence-src-')===0)location.replace('./observation.html'+location.hash);
}

document.querySelectorAll('.badge.bg-secondary-lt').forEach(function(e){if(e.textContent.indexOf('Updated 2026.09.23')>=0)e.textContent='Updated 2026.10.06 · Evidence Registry 18';});
document.querySelectorAll('.text-center.text-secondary.small.py-4').forEach(function(e){if(e.textContent.indexOf('KIMSE Evidence Registry')>=0)e.textContent='KIMSE Evidence Registry · Updated 2026.10.06';});
})();