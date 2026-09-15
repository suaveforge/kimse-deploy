(function(){
'use strict';
var root=document.querySelector('.page-body .container-xl');
if(!root||document.getElementById('app-model'))return;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function badge(points){return '<span class="badge bg-azure-lt">'+esc(points)+'점</span>'}
function optionText(options){return options.map(function(o){return esc(o.label)+' '+badge(o.points)}).join(' · ')}
function render(m){
  var a=m.activeModel, cr=m.changeReview||{}, tracked=m.trackedSignals||[], rules=m.combinationRules||[], devices=m.deviceTiers||{}, tiers=devices.tiers||[], signalMap=m.signalMap||{}, signals=signalMap.signals||[];
  var review=(cr.items||[]).length
    ? '<div class="list-group list-group-flush">'+cr.items.map(function(x){
        var tone=x.action==='add'?'green':x.action==='remove'?'red':'yellow';
        return '<div class="list-group-item"><div class="d-flex justify-content-between gap-2"><strong>'+esc(x.title||x.factor||'근거 변경 후보')+'</strong><span class="badge bg-'+tone+'-lt">'+esc(x.action||'review')+'</span></div>'+(x.evidenceLevel?'<div class="small fw-bold mt-2">'+esc(x.evidenceLevel)+'</div>':'')+(x.source?'<div class="text-secondary small">'+esc(x.source)+'</div>':'')+'<div class="mt-2">'+esc(x.rationale||x.detail||'')+'</div>'+(x.impact?'<div class="alert alert-warning py-2 mt-2 mb-0"><strong>영향 검토</strong><br>'+esc(x.impact)+'</div>':'')+(x.sourceUrl?'<a class="btn btn-sm btn-outline-secondary mt-2" target="_blank" rel="noopener" href="'+esc(x.sourceUrl)+'">근거 원문 ↗</a>':'')+'</div>'
      }).join('')+'</div>'
    : '<div class="alert alert-success mb-0"><strong>변경 검토 대기 없음</strong><br>'+esc(cr.emptyMessage||'현재 검토 대기 근거가 없습니다.')+'</div>';
  var signalHtml='';
  if(signals.length){
    var iconMap={sleep:'🌙',speech:'🗣️',mobility:'🚶',social:'📞',gait_activity:'👣',cognition:'🧠'};
    var levelTone={'근거 기반':'green','연구 근거':'azure','확장 관찰':'yellow'};
    signalHtml='<section class="mb-4" id="signal-map">'
      +'<div class="card border-0 shadow-sm overflow-hidden"><div class="card-body p-4 p-lg-5">'
      +'<div class="row g-4 align-items-end mb-4"><div class="col-lg-8"><div class="text-uppercase text-azure fw-bold small">'+esc(signalMap.eyebrow||'KIMSE · EARLY CHANGE SIGNAL MAP')+'</div><h2 class="display-5 mt-2 mb-2">'+esc(signalMap.headline||'낌새는 이런 작은 변화를 함께 봅니다')+'</h2><p class="lead text-secondary mb-0">'+esc(signalMap.subheadline||'')+'</p></div>'
      +'<div class="col-lg-4"><div class="alert alert-primary mb-0"><strong>관찰 원칙</strong><br>'+esc(signalMap.principle||'여러 변화 신호를 함께 봅니다.')+'</div></div></div>'
      +'<div class="row g-3">'+signals.map(function(s){var tone=levelTone[s.evidenceLevel]||'secondary';return '<div class="col-md-6 col-xl-4"><article class="card h-100 kimse-signal-card"><div class="card-body">'
        +'<div class="d-flex align-items-start justify-content-between gap-3 mb-3"><div class="d-flex align-items-center gap-3"><div class="kimse-signal-icon" aria-hidden="true">'+esc(iconMap[s.id]||'•')+'</div><div><h3 class="h2 mb-1">'+esc(s.label)+'</h3><p class="text-secondary mb-0">'+esc(s.summary)+'</p></div></div><span class="badge bg-'+tone+'-lt text-'+tone+'">'+esc(s.evidenceLevel||'근거 검토')+'</span></div>'
        +'<div class="kimse-signal-examples mb-3">'+(s.examples||[]).map(function(x){return '<div class="kimse-signal-example"><span class="text-azure">●</span><strong>'+esc(x)+'</strong></div>'}).join('')+'</div>'
        +'<div class="mb-2"><div class="text-secondary small mb-1">수집 기기</div><div class="d-flex flex-wrap gap-1">'+(s.devices||[]).map(function(x){return '<span class="badge bg-blue-lt">'+esc(x)+'</span>'}).join('')+'</div></div>'
        +'<div class="pt-2 mt-2 border-top"><div class="text-secondary small mb-1">외부 근거</div><div class="d-flex flex-wrap gap-1">'+(s.authority||[]).map(function(x){return '<span class="badge bg-green-lt">'+esc(x)+'</span>'}).join('')+'</div></div>'
        +(s.note?'<p class="text-secondary small mt-3 mb-0">'+esc(s.note)+'</p>':'')
        +'</div></article></div>'}).join('')+'</div>'
      +'<div class="mt-4 p-3 rounded bg-light"><div class="d-flex flex-wrap align-items-center gap-2"><strong>함께 보는 위험요인</strong>'+(signalMap.riskContext||[]).map(function(x){return '<span class="badge bg-white text-dark border">'+esc(x)+'</span>'}).join('')+'</div><div class="text-secondary mt-2">'+esc(signalMap.footerMessage||'')+'</div></div>'
      +'</div></div></section>';
  }
  var deviceHtml='';
  if(tiers.length){
    var tone={phone:'blue',health:'azure',wearable:'green',home:'purple'};
    deviceHtml='<div class="card mb-4" id="device-map"><div class="card-body p-4 p-lg-5">'
      +'<div class="row align-items-end g-3 mb-4"><div class="col-lg-8"><div class="text-uppercase text-secondary small">START SMALL · EXPAND WHEN NEEDED</div><h2 class="display-6 mb-2">'+esc(devices.headline||'스마트폰부터 시작합니다.')+'</h2><p class="text-secondary mb-0">'+esc(devices.subheadline||'')+'</p></div><div class="col-lg-4"><div class="alert alert-info mb-0"><strong>핵심</strong><br>스마트폰이 기본입니다. 웨어러블·홈기기는 선택적으로 데이터 범위를 넓힙니다.</div></div></div>'
      +'<div class="row g-3">'+tiers.map(function(t,i){var color=tone[t.id]||'secondary';return '<div class="col-md-6 col-xl-3"><div class="card h-100 border-'+color+'"><div class="card-body"><div class="d-flex justify-content-between align-items-start gap-2 mb-2"><div><span class="badge bg-'+color+'-lt">0'+(i+1)+'</span><h3 class="mt-2 mb-1">'+esc(t.label)+'</h3></div><span class="badge bg-'+color+' text-white">'+esc(t.badge)+'</span></div><p class="fw-bold">'+esc(t.role)+'</p><div class="list-group list-group-flush mb-3">'+(t.signals||[]).map(function(s){return '<div class="list-group-item px-0 py-2">'+esc(s)+'</div>'}).join('')+'</div><div class="alert alert-'+color+' py-2 mb-2"><strong>'+esc(t.message)+'</strong></div>'+(t.note?'<div class="text-secondary small">'+esc(t.note)+'</div>':'')+'<div class="mt-3 d-flex flex-wrap gap-1">'+(t.evidence||[]).map(function(e){return '<span class="badge bg-secondary-lt">'+esc(e)+'</span>'}).join('')+'</div></div></div></div>'}).join('')+'</div>'
      +'<div class="mt-4 text-secondary small">'+esc(devices.claimGuard||'')+'</div></div></div>';
  }
  var html='<div class="card mb-4" id="app-model"><div class="card-header"><div><div class="text-uppercase text-secondary small">KIMSE · ACTIVE EVIDENCE MODEL</div><h2 class="card-title mt-1">낌새 앱이 실제 사용하는 팩터 · 가중치 · 조합</h2><div class="text-secondary small mt-1">앱 계산값은 이 레지스트리의 활성 모델을 직접 읽어 사용합니다 · Updated '+esc(m.updated)+'</div></div></div>'
    +'<div class="card-body"><div class="row g-3 mb-4"><div class="col-lg-8"><div class="card h-100 bg-blue-lt"><div class="card-body"><span class="badge bg-blue text-white">ACTIVE</span><h3 class="mt-2">'+esc(a.name)+'</h3><p class="mb-2">'+esc(a.description)+'</p><div class="d-flex flex-wrap gap-2"><span class="badge bg-white text-dark">'+esc(a.factors.length)+' factors</span><span class="badge bg-white text-dark">최대 '+esc(a.combination.maxScore)+'점</span><span class="badge bg-white text-dark">'+esc(a.combination.method)+'</span></div></div></div></div>'
    +'<div class="col-lg-4"><div class="card h-100"><div class="card-body"><div class="text-secondary small">조합 규칙</div><h3 class="mt-1">원 CAIDE 점수 합산</h3><p>'+esc(a.combination.rule)+'</p><div class="alert alert-warning py-2 mb-0"><strong>연구 기준 '+esc(a.combination.researchCutoff.operator)+esc(a.combination.researchCutoff.value)+'점</strong><br>'+esc(a.combination.researchCutoff.note)+'</div></div></div></div></div>'
    +'<div class="table-responsive mb-4"><table class="table table-vcenter"><thead><tr><th>팩터</th><th>앱 선택값 → 가중치</th><th>근거</th></tr></thead><tbody>'+a.factors.map(function(f){return '<tr><td><strong>'+esc(f.label)+'</strong></td><td>'+optionText(f.options)+'</td><td>'+esc(f.evidence)+'</td></tr>'}).join('')+'</tbody></table></div>'
    +'<div class="row g-3"><div class="col-lg-7"><div class="card h-100"><div class="card-header"><h3 class="card-title">앱에서 수집하지만 고정 가중치로 합산하지 않는 데이터</h3></div><div class="list-group list-group-flush">'+tracked.map(function(s){return '<div class="list-group-item"><div class="d-flex justify-content-between gap-2"><strong>'+esc(s.label)+'</strong><span class="badge bg-secondary-lt">고정가중치 없음</span></div><div class="text-secondary small mt-1">'+esc(s.appUse)+' · '+esc(s.note)+'</div></div>'}).join('')+'</div></div></div>'
    +'<div class="col-lg-5"><div class="card h-100"><div class="card-header"><h3 class="card-title">결합 원칙</h3></div><div class="card-body"><ol class="mb-0">'+rules.map(function(x){return '<li class="mb-2">'+esc(x)+'</li>'}).join('')+'</ol></div></div></div></div></div></div>'
    +'<div class="card mb-4" id="change-review"><div class="card-header"><div><div class="text-uppercase text-secondary small">EVIDENCE CHANGE REVIEW</div><h2 class="card-title mt-1">팩터 · 가중치 · 조합 변경 검토</h2><div class="text-secondary small mt-1">새 논문·가이드라인·규제 이슈가 활성 모델의 추가·변경·삭제를 요구할 때 여기에 표시합니다. 검토 후보는 활성 모델에 자동 반영하지 않습니다.</div></div></div>'+review+'<div class="card-footer text-secondary small">Last reviewed '+esc(cr.lastReviewed||m.updated)+' · 상태 '+esc(cr.status||'review')+'</div></div>';
  if(deviceHtml)root.insertAdjacentHTML('afterbegin',deviceHtml);
  if(signalHtml)root.insertAdjacentHTML('afterbegin',signalHtml);
  var factors=document.getElementById('factors');
  if(factors)factors.insertAdjacentHTML('beforebegin',html); else root.insertAdjacentHTML('beforeend',html);
}
fetch('./evidence-model.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(render).catch(function(){
  var factors=document.getElementById('factors');
  var h='<div class="alert alert-danger mb-4" id="app-model"><strong>앱 적용 근거 레지스트리를 불러오지 못했습니다.</strong><br>현재 팩터·가중치를 추정해서 표시하지 않습니다.</div>';
  if(factors)factors.insertAdjacentHTML('beforebegin',h);
});
})();
