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
  20:'CAIDE Operationalization',21:'Risk-index Operationalization',22:'Olfactory Meta-analysis'
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

var style=document.createElement('style');
style.textContent='.kimse-application-card{border:1px solid #d9e4ef;box-shadow:0 10px 30px rgba(24,50,80,.06)}.kimse-application-tabs{display:flex;gap:8px;flex-wrap:wrap}.kimse-application-tab{border:1px solid #dbe5ef;background:#fff;border-radius:999px;padding:8px 14px;font-weight:800;color:#526477;cursor:pointer}.kimse-application-tab.active{background:#15345b;color:#fff;border-color:#15345b}.kimse-application-panel[hidden]{display:none!important}.kimse-purpose{border-left:4px solid #206bc4;background:#f6f9fc;padding:14px 16px;border-radius:10px}.kimse-rd-guard{border-left-color:#2fb344}.kimse-evidence-ref{white-space:normal;text-align:left;line-height:1.3}.kimse-bridge-flow{display:flex;align-items:center;gap:7px;overflow-x:auto;padding:12px;border-radius:12px;background:#f8fafc}.kimse-bridge-flow span{white-space:nowrap;font-weight:800;font-size:.82rem}.kimse-bridge-flow i{font-style:normal;color:#8fa2b5}@media(max-width:575.98px){.kimse-application-tab{flex:1 1 100%;text-align:left}}';
document.head.appendChild(style);

var clinical=''
  +'<div id="clinical-handoff" class="kimse-application-panel" data-panel="clinical">'
  +'<div class="kimse-purpose mb-3"><div class="text-uppercase small fw-bold text-azure">PURPOSE · CLINICAL HANDOFF</div><h3 class="mt-1 mb-2">의료진이 짧은 진료시간 안에 “언제부터 무엇이 얼마나 달라졌는지” 파악하도록 정리합니다</h3><div class="text-secondary">낌새가 진단을 대신하는 문서가 아니라, 사용자의 장기 생활·인지 변화와 가족 확인 내용을 구조화해 전문평가에 넘기는 전달 계층입니다. 모든 임상적 해석은 의료진의 평가와 구분합니다.</div></div>'
  +'<div class="row g-3"><div class="col-lg-7"><div class="card h-100"><div class="card-header"><div><h3 class="card-title">의료진 전달 리포트의 최소 구조</h3><div class="text-secondary small">담당 스레드는 이 필드를 실제 KIMSE 리포트 명세로 확장합니다.</div></div></div><div class="card-body py-0"><div class="list-group list-group-flush">'
  +row('1. 변화의 시작·경과','증상이 언제 시작되었고, 최근 수주·수개월 동안 어떤 방향으로 변했는지 시간축으로 정리합니다.',[3,4])
  +row('2. 인지기능 변화','기억·주의·언어·집행기능·시공간 등 반복 과제의 개인 기준 대비 변화를 보여줍니다. KIMSE 자체 과제를 MoCA-K 점수로 환산하지 않습니다.',[9,16])
  +row('3. 일상기능 / IADL','약속·금전관리·외출·최근사건 등 생활기능 변화를 가족 확인과 함께 정리합니다.',[17])
  +row('4. 생활·디지털 변화','수면·활동·이동·보행·말하기 등 일상에서 수집한 변화 신호를 개인 baseline 대비 값으로 표시합니다.',[10,11,12,13,15])
  +row('5. 장기 위험요인 맥락','연령·교육·혈압·대사·신체활동·사회관계 등은 현재 변화와 분리해 위험요인 맥락으로 제공합니다.',[1,2,6,7,8])
  +row('6. 전문평가 연결 / Ground Truth','전문의 평가, 신경심리검사 및 필요한 경우 바이오마커 결과를 앱 관찰값과 구분해 후속 검증 라벨로 연결합니다.',[3,4,5])
  +'</div></div></div></div>'
  +'<div class="col-lg-5"><div class="card h-100"><div class="card-header"><h3 class="card-title">리포트에서 반드시 보존할 구분</h3></div><div class="card-body"><div class="alert alert-warning"><strong>진단 문서가 아닙니다.</strong><br>“MCI 확정”, “치매 진단”처럼 앱 관찰값을 임상진단으로 표현하지 않습니다.</div><ul class="mb-3"><li class="mb-2">사용자·가족 관찰과 의료진 판단 분리</li><li class="mb-2">개인 baseline 대비 변화와 집단 cutoff 분리</li><li class="mb-2">데이터 누락·수집기기·기간·품질 표시</li><li class="mb-2">근거 출처와 앱에서의 실제 측정값을 1:1 연결</li></ul>'+refs([3,4,9,17,12])+'</div></div></div></div>'
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

var html='<section class="card kimse-application-card mb-4" id="evidence-application"><div class="card-header"><div class="w-100"><div class="d-flex justify-content-between align-items-start gap-3 flex-wrap"><div><div class="text-uppercase text-secondary small">EVIDENCE APPLICATION LAYER</div><h2 class="card-title mt-1">관찰된 변화는 어떻게 이어지는가</h2><div class="text-secondary small mt-1">개인 변화 관찰의 근거를 의료진 전달과 기관 R&D 데이터 구조까지 끊김 없이 연결합니다.</div></div><span class="badge bg-blue-lt">Updated 2026.10.06 · 07</span></div><div class="kimse-application-tabs mt-3" role="tablist"><button type="button" class="kimse-application-tab active" data-kimse-tab="clinical">의료 리포트 · Clinical Handoff</button><button type="button" class="kimse-application-tab" data-kimse-tab="rd">R&D 데이터 모델 · Research Data Model</button></div></div></div><div class="card-body">'
  +'<div class="kimse-bridge-flow mb-4"><span>외부 근거</span><i>→</i><span>앱 실제 신호</span><i>→</i><span>개인 baseline Δ</span><i>→</i><span>가족 확인</span><i>→</i><span>의료진 전달</span><i>→</i><span>전문평가 결과</span><i>→</i><span>R&D 정규화</span></div>'
  +clinical+rd+'</div></section>';

var impact=document.getElementById('impact-proof');
if(impact)impact.insertAdjacentHTML('afterend',html); else root.insertAdjacentHTML('afterbegin',html);

var nav=document.querySelector('.kimse-evidence-links');
if(nav){
  var change=nav.querySelector('a[href="#change-review"]');
  var a=document.createElement('a');a.className='nav-link';a.href='#clinical-handoff';a.textContent='Clinical';
  var b=document.createElement('a');b.className='nav-link';b.href='#research-data-model';b.textContent='R&D';
  if(change){nav.insertBefore(a,change);nav.insertBefore(b,change);}else{nav.appendChild(a);nav.appendChild(b);}
}

function activate(key,scroll){
  var tabs=[].slice.call(document.querySelectorAll('[data-kimse-tab]'));
  var panels=[].slice.call(document.querySelectorAll('.kimse-application-panel'));
  tabs.forEach(function(t){t.classList.toggle('active',t.getAttribute('data-kimse-tab')===key)});
  panels.forEach(function(p){p.hidden=p.getAttribute('data-panel')!==key});
  if(scroll){var el=key==='rd'?document.getElementById('research-data-model'):document.getElementById('clinical-handoff');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
}
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-kimse-tab]');if(t){activate(t.getAttribute('data-kimse-tab'),false);return;}
  var n=e.target.closest('a[href="#clinical-handoff"],a[href="#research-data-model"]');
  if(n){e.preventDefault();var key=n.getAttribute('href')==='#research-data-model'?'rd':'clinical';activate(key,true);history.replaceState(null,'',n.getAttribute('href'));}
});
if(location.hash==='#research-data-model')activate('rd',false);
if(location.hash==='#clinical-handoff')activate('clinical',false);

document.querySelectorAll('.badge.bg-secondary-lt').forEach(function(e){if(e.textContent.indexOf('Updated 2026.09.23')>=0)e.textContent='Updated 2026.10.06 · Evidence Registry 07';});
document.querySelectorAll('.text-center.text-secondary.small.py-4').forEach(function(e){if(e.textContent.indexOf('KIMSE Evidence Registry')>=0)e.textContent='KIMSE Evidence Registry · Updated 2026.10.06';});
})();