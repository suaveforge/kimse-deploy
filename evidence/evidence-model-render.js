(function(){
'use strict';
var root=document.querySelector('.page-body .container-xl');
if(!root||document.getElementById('app-model'))return;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function badge(points){return '<span class="badge bg-azure-lt">'+esc(points)+'점</span>'}
function optionText(options){return options.map(function(o){return esc(o.label)+' '+badge(o.points)}).join(' · ')}
function render(m){
  var a=m.activeModel, cr=m.changeReview||{}, tracked=m.trackedSignals||[], rules=m.combinationRules||[];
  var review=(cr.items||[]).length
    ? '<div class="list-group list-group-flush">'+cr.items.map(function(x){
        var tone=x.action==='add'?'green':x.action==='remove'?'red':'yellow';
        return '<div class="list-group-item"><div class="d-flex justify-content-between gap-2"><strong>'+esc(x.title||x.factor||'근거 변경 후보')+'</strong><span class="badge bg-'+tone+'-lt">'+esc(x.action||'review')+'</span></div><div class="text-secondary mt-1">'+esc(x.rationale||x.detail||'')+'</div>'+(x.sourceUrl?'<a class="btn btn-sm btn-outline-secondary mt-2" target="_blank" rel="noopener" href="'+esc(x.sourceUrl)+'">근거 원문 ↗</a>':'')+'</div>'
      }).join('')+'</div>'
    : '<div class="alert alert-success mb-0"><strong>변경 검토 대기 없음</strong><br>'+esc(cr.emptyMessage||'현재 검토 대기 근거가 없습니다.')+'</div>';
  var html='<div class="card mb-4" id="app-model"><div class="card-header"><div><div class="text-uppercase text-secondary small">KIMSE · ACTIVE EVIDENCE MODEL</div><h2 class="card-title mt-1">낌새 앱이 실제 사용하는 팩터 · 가중치 · 조합</h2><div class="text-secondary small mt-1">앱 계산값은 이 레지스트리의 활성 모델을 직접 읽어 사용합니다 · Updated '+esc(m.updated)+'</div></div></div>'
    +'<div class="card-body"><div class="row g-3 mb-4"><div class="col-lg-8"><div class="card h-100 bg-blue-lt"><div class="card-body"><span class="badge bg-blue text-white">ACTIVE</span><h3 class="mt-2">'+esc(a.name)+'</h3><p class="mb-2">'+esc(a.description)+'</p><div class="d-flex flex-wrap gap-2"><span class="badge bg-white text-dark">'+esc(a.factors.length)+' factors</span><span class="badge bg-white text-dark">최대 '+esc(a.combination.maxScore)+'점</span><span class="badge bg-white text-dark">'+esc(a.combination.method)+'</span></div></div></div></div>'
    +'<div class="col-lg-4"><div class="card h-100"><div class="card-body"><div class="text-secondary small">조합 규칙</div><h3 class="mt-1">원 CAIDE 점수 합산</h3><p>'+esc(a.combination.rule)+'</p><div class="alert alert-warning py-2 mb-0"><strong>연구 기준 '+esc(a.combination.researchCutoff.operator)+esc(a.combination.researchCutoff.value)+'점</strong><br>'+esc(a.combination.researchCutoff.note)+'</div></div></div></div></div>'
    +'<div class="table-responsive mb-4"><table class="table table-vcenter"><thead><tr><th>팩터</th><th>앱 선택값 → 가중치</th><th>근거</th></tr></thead><tbody>'+a.factors.map(function(f){return '<tr><td><strong>'+esc(f.label)+'</strong></td><td>'+optionText(f.options)+'</td><td>'+esc(f.evidence)+'</td></tr>'}).join('')+'</tbody></table></div>'
    +'<div class="row g-3"><div class="col-lg-7"><div class="card h-100"><div class="card-header"><h3 class="card-title">앱에서 수집하지만 고정 가중치로 합산하지 않는 데이터</h3></div><div class="list-group list-group-flush">'+tracked.map(function(s){return '<div class="list-group-item"><div class="d-flex justify-content-between gap-2"><strong>'+esc(s.label)+'</strong><span class="badge bg-secondary-lt">고정가중치 없음</span></div><div class="text-secondary small mt-1">'+esc(s.appUse)+' · '+esc(s.note)+'</div></div>'}).join('')+'</div></div></div>'
    +'<div class="col-lg-5"><div class="card h-100"><div class="card-header"><h3 class="card-title">결합 원칙</h3></div><div class="card-body"><ol class="mb-0">'+rules.map(function(x){return '<li class="mb-2">'+esc(x)+'</li>'}).join('')+'</ol></div></div></div></div></div></div>'
    +'<div class="card mb-4" id="change-review"><div class="card-header"><div><div class="text-uppercase text-secondary small">EVIDENCE CHANGE REVIEW</div><h2 class="card-title mt-1">팩터 · 가중치 · 조합 변경 검토</h2><div class="text-secondary small mt-1">새 논문·가이드라인·규제 이슈가 활성 모델의 추가·변경·삭제를 요구할 때 여기에 표시합니다. 검토 후보는 활성 모델에 자동 반영하지 않습니다.</div></div></div>'+review+'<div class="card-footer text-secondary small">Last reviewed '+esc(cr.lastReviewed||m.updated)+' · 상태 '+esc(cr.status||'review')+'</div></div>';
  var factors=document.getElementById('factors');
  if(factors)factors.insertAdjacentHTML('beforebegin',html); else root.insertAdjacentHTML('afterbegin',html);
}
fetch('./evidence-model.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(render).catch(function(){
  var factors=document.getElementById('factors');
  var h='<div class="alert alert-danger mb-4" id="app-model"><strong>앱 적용 근거 레지스트리를 불러오지 못했습니다.</strong><br>현재 팩터·가중치를 추정해서 표시하지 않습니다.</div>';
  if(factors)factors.insertAdjacentHTML('beforebegin',h);
});
})();
