/* KIMSE R&D Global Atlas — interactive country explorer; factual internal-screening labels only. */
(function () {
  'use strict';
  if (document.body.getAttribute('data-evidence-page') !== 'rd') return;
  var mount = document.querySelector('.page-body .container-xl');
  if (!mount || document.getElementById('kimse-global-atlas')) return;
  var root = document.createElement('section');
  root.id = 'kimse-global-atlas';
  root.className = 'kimse-atlas-wrap';
  root.setAttribute('aria-labelledby','kimse-atlas-title');
  root.innerHTML =
    '<div class="kimse-atlas-shell">' +
      '<div class="kimse-atlas-head">' +
        '<div class="kimse-atlas-kicker">KIMSE · Global Research Atlas</div>' +
        '<h2 id="kimse-atlas-title">전 세계 연구협력 후보, 한눈에</h2>' +
        '<p>국가별 연구·사업화 후보를 발굴하고, 공개 근거에 따라 적합성을 선별합니다. 지도는 실제 자료조사와 공식 연락 이력을 구분해 보여줍니다.</p>' +
        '<div class="kimse-atlas-stats" id="kimse-atlas-stats" aria-live="polite"></div>' +
      '</div>' +
      '<section class="kimse-atlas-progress" aria-labelledby="kimse-progress-title">' +
        '<div class="kimse-atlas-progress-head"><div><div class="kimse-atlas-kicker">INSTITUTION BY INSTITUTION · 2026.10.13</div><h3 id="kimse-progress-title">어느 기관과 몇 단계인가?</h3><p>기관 이름 옆에 <strong>0·1·2단계</strong>를 직접 표시합니다. 0단계는 미접촉, 1단계는 연락·접수, 2단계는 실제 연구정보 답변입니다. 협력 단계와 구분합니다.</p></div><div class="kimse-atlas-progress-total" id="kimse-progress-total">기관 원장 확인 중</div></div>' +
        '<div class="kimse-progress-numbers" id="kimse-progress-numbers" aria-label="숫자 단계별 기관 필터"></div>' +
        '<div class="kimse-progress-overview" id="kimse-progress-overview" aria-label="세부 진행상태별 기관 수"></div>' +
        '<div class="kimse-progress-tools"><label for="kimse-progress-phase">숫자 단계<select id="kimse-progress-phase"><option value="">전체 (0~2단계)</option><option value="0">0단계 · 미접촉</option><option value="1">1단계 · 연락·접수</option><option value="2">2단계 · 자료 회신</option></select></label><label for="kimse-progress-stage">상세 상태<select id="kimse-progress-stage"><option value="">전체 상태</option></select></label><label for="kimse-progress-country">국가·지역<select id="kimse-progress-country"><option value="">전체 국가·지역</option></select></label><label class="kimse-progress-query-label" for="kimse-progress-search">기관 검색<input type="search" id="kimse-progress-search" placeholder="기관명 · 국가명 · 접수번호" autocomplete="off"></label></div>' +
        '<div class="kimse-progress-table-scroll"><table class="kimse-progress-table"><thead><tr><th scope="col">기관 · 숫자 단계</th><th scope="col">상세 상태</th><th scope="col">확인 근거</th><th scope="col">다음 행동</th><th scope="col">협력·매출</th></tr></thead><tbody id="kimse-progress-rows"><tr><td colspan="5">진행 데이터를 불러오는 중입니다.</td></tr></tbody></table></div>' +
        '<div class="kimse-progress-legal">상태 표시는 낌새가 수행한 자료조사·발송·FOI 접수·연구정보 회신만 반영합니다. 모든 기관의 사업협력·구매의향·임상검증은 미확인입니다. 승인만 받은 웹양식 9건은 <strong>미제출</strong>로 표시합니다. 개인 이메일과 내부 메일 식별자는 공개하지 않습니다.</div>' +
      '</section>' +
      '<div class="kimse-atlas-grid">' +
        '<div class="kimse-atlas-map-col">' +
          '<div class="kimse-atlas-toolbar">' +
            '<select class="kimse-atlas-select" id="kimse-atlas-country-select" aria-label="지도에서 볼 국가 선택"><option value="">전 세계 국가 선택</option></select>' +
            '<div class="kimse-atlas-buttons"><button type="button" class="kimse-atlas-btn" id="kimse-atlas-zoom-out" aria-label="지도 축소">−</button>' +
            '<button type="button" class="kimse-atlas-btn" id="kimse-atlas-reset">전체 보기</button>' +
            '<button type="button" class="kimse-atlas-btn" id="kimse-atlas-zoom-in" aria-label="지도 확대">+</button></div>' +
          '</div>' +
          '<div class="kimse-atlas-canvas-scroll" id="kimse-atlas-viewport">' +
            '<svg id="kimse-atlas-svg" class="kimse-atlas-svg" viewBox="0 0 1180 620" role="img" aria-label="전 세계 연구협력 후보 기관 분포를 선택할 수 있는 지도">' +
              '<text x="590" y="300" fill="#9dc5e6" text-anchor="middle">세계지도 불러오는 중…</text>' +
            '</svg>' +
          '</div>' +
          '<div id="kimse-atlas-tooltip" class="kimse-atlas-tooltip" role="status"></div>' +
          '<div class="kimse-atlas-legend" role="note"><span><i class="kimse-atlas-swatch" style="background:#224268"></i>검토 예정</span>' +
            '<span><i class="kimse-atlas-swatch" style="background:#2867b5"></i>1–2곳</span>' +
            '<span><i class="kimse-atlas-swatch" style="background:#278ac8"></i>3–6곳</span>' +
            '<span><i class="kimse-atlas-swatch" style="background:#7a64d9"></i>7곳 이상</span>' +
            '<span><i class="kimse-atlas-swatch" style="background:#ffc974"></i>자료요청 발송 국가</span></div>' +
          '<div class="kimse-atlas-mapnote">색상 = 후보 기관 수 · 금색 테두리 = 공식 자료요청 기록 · 원형 핀 = 도시 단위 참고점</div>' +
        '</div>' +
        '<aside class="kimse-atlas-side" aria-label="선택 국가의 기관 정보">' +
          '<div class="kimse-atlas-sidehead">' +
            '<div class="kimse-atlas-country-kicker">COUNTRY REVIEW</div>' +
            '<h3 id="kimse-atlas-selected-name">국가를 선택하세요</h3>' +
            '<div class="kimse-atlas-side-meta" id="kimse-atlas-selected-meta"></div>' +
            '<input class="kimse-atlas-search" id="kimse-atlas-search" type="search" autocomplete="off" placeholder="기관명·유형·도시 검색" aria-label="선택 국가 내 기관 검색">' +
          '</div>' +
          '<div class="kimse-atlas-institutions" id="kimse-atlas-institutions"><div class="kimse-atlas-empty">세계지도에서 국가를 선택하면 적합성 평가 대상과 근거가 표시됩니다.</div></div>' +
        '</aside>' +
      '</div>' +
      '<div class="kimse-atlas-foot"><strong>상태·영향력 표시 기준</strong> · ‘검토 예정’과 ‘적합성 검토 중’은 낌새의 내부 후보 평가입니다. 자료요청 발송·접수 확인은 실제 기록 기준이며, 외부 기관의 승인·보증·제휴나 협의 착수를 뜻하지 않습니다. ISO 3166-1 기준 249개 국가·지역이 검토대상이며, 현재 기관이 등록된 곳은 24개 국가·지역입니다. 영향력 A/B/C는 기관 유형과 공개 연구·거래 근거를 토대로 한 낌새 내부 참고 분류이며 독립적 공식 순위가 아닙니다. 도시 핀은 기관 건물의 정확한 위치가 아닌 도시 중심 참고좌표입니다. 지도 경계는 Natural Earth 50m 우선·110m 대체 경계이며, 작은 국가·영역은 선택 목록에서 확인할 수 있습니다.</div>' +
    '</div>';
  mount.insertBefore(root,mount.firstChild);

  var state = { data:null, features:[], selection:null, cities:[], svg:null, map:null, zoom:null, path:null, projection:null, polygons:null, markLayer:null, width:1180, height:620, currentScale:1 };
  var label = document.getElementById('kimse-atlas-selected-name');
  var meta = document.getElementById('kimse-atlas-selected-meta');
  var list = document.getElementById('kimse-atlas-institutions');
  var picker = document.getElementById('kimse-atlas-country-select');
  var search = document.getElementById('kimse-atlas-search');
  var tip = document.getElementById('kimse-atlas-tooltip');
  var svgEl = document.getElementById('kimse-atlas-svg');

  function safe(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function norm(x) { return String(x == null?'':x).toLocaleLowerCase(); }
  function isContact(x) { return !!(x && x.progress && x.progress.contactStatus!=='IDENTIFIED_NOT_CONTACTED'); }
  function stageClass(x) {
    var name=x&&x.stage||'';
    if(name==='FORMAL_FOI_REGISTERED')return 'status-registered';
    if(name==='RESEARCH_METHODS_RESPONSE_RECEIVED')return 'status-research';
    if(name==='AUTOMATED_ACK_ONLY')return 'status-ack';
    if(name==='INFORMATION_REQUEST_SENT')return 'status-request';
    if(name==='FOI_FORM_APPROVED_NOT_SUBMITTED')return 'status-pending-form';
    if(name==='FIRST_CONTACT_ROUTE_VERIFIED_UNSENT')return 'status-screen';
    return name==='CANDIDATE_FIT_PRELIMINARY'?'status-screen':'status-review';
  }
  function fromNumeric(id) { return String(id == null?'':id).padStart(3,'0'); }
  function selectedRecords(id) {
    return state.data.institutions.filter(function(x){ return x.countryNumeric===id; });
  }
  function summary(id) {
    var a=selectedRecords(id);
    return { all:a.length, contacted:a.filter(isContact).length,
      reviewing:a.filter(function(x){return x.stage==='CANDIDATE_FIT_PRELIMINARY'}).length,
      planned:a.filter(function(x){return x.stage==='CANDIDATE_REVIEW_SCHEDULED'}).length };
  }
  function fillFor(n) {
    if(!n)return '#224268';
    if(n<=2)return '#2867b5';
    if(n<=6)return '#278ac8';
    return '#7a64d9';
  }
  function renderStats() {
    var total=state.data.institutions.length, countries=new Set(state.data.institutions.map(function(x){return x.countryNumeric;})).size;
    var screening=state.data.institutions.filter(function(x){return x.stage==='CANDIDATE_FIT_PRELIMINARY'}).length;
    var sent=state.data.institutions.filter(isContact).length;
    var formal=state.data.institutions.filter(function(x){return x.stage==='FORMAL_FOI_REGISTERED'}).length;
    var methods=state.data.institutions.filter(function(x){return x.stage==='RESEARCH_METHODS_RESPONSE_RECEIVED'}).length;
    document.getElementById('kimse-atlas-stats').innerHTML=[
      ['전체 후보기관',total,'곳'],['등록 국가·지역',countries,'곳'],['세계 검토대상',state.data.isoMasterCount||0,'개'],['정보요청 발송',sent,'곳'],['공식 FOI 접수',formal,'곳'],['연구방법 답변',methods,'곳']
    ].map(function(a){return '<div class="kimse-atlas-stat"><small>'+safe(a[0])+'</small><strong>'+a[1]+'<em>'+safe(a[2])+'</em></strong></div>'}).join('');
  }
  function setupProgressFilters() {
    var stageEl=document.getElementById('kimse-progress-stage'), countryEl=document.getElementById('kimse-progress-country');
    if(!stageEl || !countryEl)return;
    stageEl.innerHTML='<option value="">전체 단계</option>'+(state.data.progressStages||[]).map(function(x){return '<option value="'+safe(x.code)+'">'+safe(x.label)+' ('+Number(x.count||0)+')</option>'}).join('');
    var countries=new Map();
    state.data.institutions.forEach(function(x){var z=countries.get(x.countryNumeric)||{numeric:x.countryNumeric,name:x.countryName,count:0};z.count++;countries.set(x.countryNumeric,z)});
    countryEl.innerHTML='<option value="">전체 국가·지역</option>'+Array.from(countries.values()).sort(function(a,b){return b.count-a.count||a.name.localeCompare(b.name)}).map(function(x){return '<option value="'+safe(x.numeric)+'">'+safe(x.name)+' · '+x.count+'곳</option>'}).join('');
    ['kimse-progress-phase','kimse-progress-stage','kimse-progress-country','kimse-progress-search'].forEach(function(id){var el=document.getElementById(id);el.addEventListener(id==='kimse-progress-search'?'input':'change',renderProgress)});
    document.getElementById('kimse-progress-numbers').addEventListener('click',function(event){var target=event.target.closest('button[data-phase]');if(!target)return;var phaseSelect=document.getElementById('kimse-progress-phase'),next=target.getAttribute('data-phase');phaseSelect.value=phaseSelect.value===next?'':next;renderProgress();});
    document.getElementById('kimse-progress-overview').addEventListener('click',function(event){var node=event.target.closest('button[data-stage]');if(!node)return;stageEl.value=stageEl.value===node.getAttribute('data-stage')?'':node.getAttribute('data-stage');renderProgress();});
  }
  function renderProgress() {
    if(!state.data)return;
    var phaseEl=document.getElementById('kimse-progress-phase'),stageEl=document.getElementById('kimse-progress-stage'),countryEl=document.getElementById('kimse-progress-country'),searchEl=document.getElementById('kimse-progress-search');
    if(!phaseEl||!stageEl||!countryEl||!searchEl)return;
    var stages=state.data.progressStages||[];
    document.getElementById('kimse-progress-numbers').innerHTML=[0,1,2].map(function(n){var num=state.data.institutions.filter(function(x){return x.progress&&x.progress.phase===n}).length;return '<button type="button" class="kimse-progress-number '+(phaseEl.value===String(n)?'is-selected':'')+'" data-phase="'+n+'" aria-pressed="'+(phaseEl.value===String(n)?'true':'false')+'"><span class="kimse-progress-number-value">'+n+'단계</span><strong>'+num+'곳</strong><small>'+(n===0?'접촉 전 · 준비':n===1?'발송 · 공식 접수':'연구정보 답변')+'</small></button>'}).join('');
    document.getElementById('kimse-progress-overview').innerHTML=stages.map(function(p){
      return '<button type="button" class="kimse-progress-metric '+(stageEl.value===p.code?'is-selected':'')+'" data-stage="'+safe(p.code)+'" aria-pressed="'+(stageEl.value===p.code?'true':'false')+'"><strong>'+Number(p.count||0)+'</strong><span>'+safe(p.label)+'</span></button>';
    }).join('');
    var phrase=norm(searchEl.value).trim(),filtered=state.data.institutions.filter(function(x){
      if(phaseEl.value!=='' && (!x.progress || String(x.progress.phase)!==phaseEl.value))return false;
      if(stageEl.value && x.stage!==stageEl.value)return false;
      if(countryEl.value && x.countryNumeric!==countryEl.value)return false;
      var p=x.progress||{};
      return !phrase||norm([x.name,x.countryName,x.stageLabel,p.formalFOIRef,x.sector].join(' ')).includes(phrase);
    });
    filtered.sort(function(a,b){return (b.progress?.order||0)-(a.progress?.order||0)||a.name.localeCompare(b.name)});
    document.getElementById('kimse-progress-total').textContent=filtered.length+' / '+state.data.institutions.length+'개 기관 · 기준 2026.10.13';
    var body=document.getElementById('kimse-progress-rows');
    if(!filtered.length){body.innerHTML='<tr><td colspan="5" class="kimse-progress-noresults">검색조건에 맞는 기관이 없습니다.</td></tr>';return;}
    body.innerHTML=filtered.map(function(x){
      var p=x.progress||{},ref=p.formalFOIRef?'<div class="kimse-progress-reference">접수번호 '+safe(p.formalFOIRef)+'</div>':'';
      var deadline=p.formalResponseDeadline?'<div class="kimse-progress-deadline">답변 예정 '+safe(p.formalResponseDeadline)+'</div>':'';
      var evidence=p.formalFOIRef?'공식 FOI 접수번호 확인':x.stage==='RESEARCH_METHODS_RESPONSE_RECEIVED'?'기관 연구방법 회신':x.stage==='AUTOMATED_ACK_ONLY'?'자동 확인메일 · 정식 접수 미확정':x.stage==='INFORMATION_REQUEST_SENT'?'회사메일 전송 · 답변 대기':x.stage==='FOI_FORM_APPROVED_NOT_SUBMITTED'?'사용자 승인 · 실제 제출 전':x.stage==='FIRST_CONTACT_ROUTE_VERIFIED_UNSENT'?'공식 문의경로 확인 · 아직 1차 연락 전':'공식 담당·연구 근거 검토';
      var phase=p.phase===2?'2단계 · 자료 검토':p.phase===1?'1단계 · 자료요청':'0단계 · 접촉 준비';
      return '<tr><td><div class="kimse-progress-name-and-phase"><span class="kimse-progress-bignum phase-'+Number(p.phase||0)+'">'+Number(p.phase||0)+'단계</span><strong>'+safe(x.name)+'</strong></div><small>'+safe(x.countryName)+' · '+safe(x.sector)+'</small></td>'+
        '<td><span class="kimse-atlas-chip '+stageClass(x)+'">'+safe(x.stageLabel)+'</span><small>'+safe(phase)+'</small></td>'+
        '<td>'+safe(evidence)+ref+deadline+'</td>'+
        '<td>'+safe(p.nextAction||'근거 확인 후 진행')+(p.approvedWebFormNotSubmitted && /^https:\/\//.test(p.formURL||'')?'<div class="kimse-progress-form-link"><a href="'+safe(p.formURL)+'" target="_blank" rel="noopener noreferrer">공식 FOI 양식 열기 ↗</a></div>':'')+(p.routeVerified && /^https:\/\//.test(p.contactRouteURL||'')?'<div class="kimse-progress-form-link"><a href="'+safe(p.contactRouteURL)+'" target="_blank" rel="noopener noreferrer">기관 공식 문의경로 ↗</a></div>':'')+'</td>'+
        '<td><span class="kimse-progress-unverified">협력 미확정</span><small>구매·계약 증거 0</small></td></tr>';
    }).join('');
  }
  function nameFor(id) {
    var sample=state.data.institutions.find(function(x){return x.countryNumeric===id;});
    if(sample)return sample.countryName;
    var iso=(state.data.iso31661Master||[]).find(function(x){return x.numeric===id});
    if(iso && typeof Intl!=='undefined' && Intl.DisplayNames){try{return new Intl.DisplayNames(['ko'],{type:'region'}).of(iso.alpha2)||iso.alpha2}catch(e){/* browser fallback */}}
    var f=state.features.find(function(z){return fromNumeric(z.id)===id});
    return f && f.properties && f.properties.name ? f.properties.name : '선택한 국가';
  }
  function showTip(event,html) {
    tip.innerHTML=html;tip.style.display='block';
    var r=root.getBoundingClientRect();
    var x=event.clientX-r.left+12, y=event.clientY-r.top+12;
    tip.style.left=Math.max(12,Math.min(x,r.width-270))+'px';
    tip.style.top=Math.max(12,y)+'px';
  }
  function hideTip() { tip.style.display='none'; }
  function renderInfo() {
    var id=state.selection;
    if(!id){label.textContent='국가를 선택하세요';meta.innerHTML='';list.innerHTML='<div class="kimse-atlas-empty">지도 위 국가를 클릭하거나 상단에서 선택하세요.</div>';return;}
    var sum=summary(id);
    label.textContent=nameFor(id);
    meta.innerHTML='<span><b>'+sum.all+'</b>개 후보기관</span><span><b>'+sum.reviewing+'</b>개 적합성 검토</span><span><b>'+sum.contacted+'</b>건 공식 자료요청</span>';
    var query=norm(search.value).trim();
    var arr=selectedRecords(id).filter(function(x){
      return !query || norm([x.name,x.sector,x.city,x.authority,x.stageLabel].join(' ')).includes(query);
    });
    arr.sort(function(a,b){return (b.progress?.order||0)-(a.progress?.order||0)||a.name.localeCompare(b.name)});
    if(!sum.all){list.innerHTML='<div class="kimse-atlas-empty"><strong>검토 예정</strong><p>현재 기관 원장에 등록된 조사 대상은 없습니다. 등록 기관이 없다는 것은 해당 국가에 적합한 기관이 없다는 뜻이 아닙니다.</p></div>';return;}
    if(!arr.length){list.innerHTML='<div class="kimse-atlas-empty">검색조건에 맞는 기관이 없습니다.</div>';return;}
    list.innerHTML=arr.map(function(x){
      var source=x.sourceURL && /^https:\/\//.test(x.sourceURL) ? '<a class="kimse-atlas-source" href="'+safe(x.sourceURL)+'" rel="noopener noreferrer" target="_blank">연구·거래 근거 보기 ↗</a>':'<span class="kimse-atlas-location">기관별 근거 확인 대상</span>';
      var place=x.city?'<div class="kimse-atlas-location">📍 '+safe(x.city)+' · 도시 단위 참고점</div>':'<div class="kimse-atlas-location">위치 확인 중 · 국가 단위 등록</div>';
      var desc=x.sourceScope?'<p class="kimse-atlas-excerpt">'+safe(x.sourceScope)+'</p>':'';
      var progress=x.progress||{};
      var trace='<div class="kimse-atlas-progress-line"><strong>'+(progress.phase===2?'2단계':progress.phase===1?'1단계':'0단계')+'</strong> · '+safe(progress.nextAction||'기관별 자료 확인 중')+'</div>'+(progress.formalFOIRef?'<div class="kimse-atlas-foi-ref">공식 FOI 접수번호: '+safe(progress.formalFOIRef)+'</div>':'');
      return '<article class="kimse-atlas-institution" id="kimse-atlas-inst-'+safe(x.id)+'"><h4>'+safe(x.name)+'</h4><div class="kimse-atlas-chiprow">'+
        '<span class="kimse-atlas-chip '+stageClass(x)+'">'+safe(x.stageLabel)+'</span>'+
        '<span class="kimse-atlas-chip">'+safe(x.sector)+'</span>'+
        '<span class="kimse-atlas-chip tier-'+safe(norm(x.authorityTier))+'" title="낌새 내부 평가용 영향력 분류 · 외부 공식 순위가 아닙니다">영향력 '+safe(x.authorityTier)+' · '+safe(x.authorityTierDescription)+'</span></div>'+place+trace+desc+source+'</article>';
    }).join('');
  }
  function renderPins() {
    if(!state.markLayer || !state.projection)return;
    state.markLayer.selectAll('*').remove();
    var id=state.selection;if(!id)return;
    var rec=selectedRecords(id).filter(function(x){return Array.isArray(x.cityCoordinate) && x.cityCoordinate.length===2});
    var group={};
    rec.forEach(function(x){var key=x.countryNumeric+'|'+x.city; if(!group[key])group[key]={x:x.cityCoordinate[0],y:x.cityCoordinate[1],city:x.city,records:[],contact:false};group[key].records.push(x);group[key].contact=group[key].contact||isContact(x)});
    var points=Object.values(group);
    state.markLayer.selectAll('g.kimse-atlas-pin').data(points).join('g')
      .attr('class','kimse-atlas-pin')
      .attr('data-contacted',function(d){return d.contact?'true':'false'})
      .attr('tabindex',0).attr('role','button').attr('aria-label',function(d){return d.city+' 연구기관 '+d.records.length+'곳'})
      .attr('transform',function(d){var p=state.projection([d.x,d.y]);return p?'translate('+p[0]+','+p[1]+')':'translate(-100,-100)'})
      .each(function(d){
        var g=window.d3.select(this);g.append('circle').attr('r',(d.records.length>1?11:7)/Math.max(1,state.currentScale));
        if(d.records.length>1)g.append('text').attr('dy',3.8/Math.max(1,state.currentScale)).style('font-size',(10/Math.max(1,state.currentScale))+'px').text(d.records.length);
      })
      .on('mouseenter',function(event,d){showTip(event,'<strong>'+safe(d.city)+'</strong><div>'+d.records.length+'개 기관 · 도시 중심 참고</div>')})
      .on('mousemove',function(event,d){showTip(event,'<strong>'+safe(d.city)+'</strong><div>'+d.records.length+'개 기관 · 도시 중심 참고</div>')})
      .on('mouseleave',hideTip)
      .on('click',function(event,d){event.stopPropagation();search.value=d.city;renderInfo();var target=list.querySelector('.kimse-atlas-institution');if(target)target.scrollIntoView({behavior:'smooth',block:'nearest'});})
      .on('keydown',function(event,d){if(event.key==='Enter'||event.key===' '){event.preventDefault();search.value=d.city;renderInfo();}});
  }
  function setSelected(id,focus) {
    state.selection=id;
    picker.value=id||'';
    search.value='';
    renderInfo();
    if(state.polygons)state.polygons.attr('data-selected',function(d){return fromNumeric(d.id)===id?'true':'false'});
    renderPins();
    if(focus && state.map && state.zoom && state.path){
      var f=state.features.find(function(x){return fromNumeric(x.id)===id});
      if(f){
        centerMapViewport();
        var bb=state.path.bounds(f),dx=bb[1][0]-bb[0][0],dy=bb[1][1]-bb[0][1];
        var z=Math.max(1,Math.min(11,.70/Math.max(dx/state.width,dy/state.height,.006)));
        var cx=(bb[0][0]+bb[1][0])/2,cy=(bb[0][1]+bb[1][1])/2;
        var target=window.d3.zoomIdentity.translate(state.width/2,state.height/2).scale(z).translate(-cx,-cy);
        state.svg.transition().duration(550).call(state.zoom.transform,target);
      }
    }
  }
  function enableControls() {
    picker.addEventListener('change',function(){if(!this.value){setSelected(null,false);resetZoom();}else setSelected(this.value,true)});
    search.addEventListener('input',renderInfo);
    document.getElementById('kimse-atlas-reset').addEventListener('click',function(){resetZoom();});
    document.getElementById('kimse-atlas-zoom-in').addEventListener('click',function(){if(state.svg&&state.zoom)state.svg.transition().duration(180).call(state.zoom.scaleBy,1.5)});
    document.getElementById('kimse-atlas-zoom-out').addEventListener('click',function(){if(state.svg&&state.zoom)state.svg.transition().duration(180).call(state.zoom.scaleBy,.67)});
  }
  function centerMapViewport(){
    var viewport=document.getElementById('kimse-atlas-viewport');
    if(viewport && viewport.scrollWidth>viewport.clientWidth){
      viewport.scrollLeft=Math.max(0,Math.round((viewport.scrollWidth-viewport.clientWidth)/2));
    }
  }
  function resetZoom(){if(state.svg&&state.zoom)state.svg.transition().duration(350).call(state.zoom.transform,window.d3.zoomIdentity);}
  function renderPicker() {
    var all=(state.data.iso31661Master||[]).map(function(x){return {id:x.numeric,name:x.alpha2,count:summary(x.numeric).all};});
    var inMap=new Set(all.map(function(x){return x.id}));
    state.data.institutions.forEach(function(x){if(!inMap.has(x.countryNumeric)){inMap.add(x.countryNumeric);all.push({id:x.countryNumeric,name:x.countryName,count:summary(x.countryNumeric).all})}});
    all.sort(function(a,b){return b.count-a.count||a.name.localeCompare(b.name)});
    picker.innerHTML='<option value="">전체 세계지도</option>'+all.map(function(x){return '<option value="'+safe(x.id)+'">'+safe(nameFor(x.id))+' · '+x.count+'곳</option>'}).join('');
  }
  function renderMap(world) {
    if(!window.d3||!window.topojson||!world.objects||!world.objects.countries)throw new Error('지도 라이브러리 로드 실패');
    var d3=window.d3;
    state.features=window.topojson.feature(world,world.objects.countries).features;
    state.svg=d3.select(svgEl);
    state.svg.selectAll('*').remove();
    state.projection=d3.geoNaturalEarth1().fitExtent([[14,18],[1166,596]],{type:'Sphere'});
    state.path=d3.geoPath(state.projection);
    state.svg.append('path').attr('class','kimse-atlas-water').attr('d',state.path({type:'Sphere'}));
    var gp=state.svg.append('g').attr('class','kimse-atlas-zoomlayer');
    gp.append('path').attr('class','kimse-atlas-gridline').attr('d',state.path(d3.geoGraticule().step([30,30])()));
    state.polygons=gp.append('g').selectAll('path.kimse-atlas-country').data(state.features).join('path')
      .attr('class','kimse-atlas-country')
      .attr('d',state.path)
      .attr('fill',function(f){return fillFor(summary(fromNumeric(f.id)).all)})
      .attr('data-contacted',function(f){return summary(fromNumeric(f.id)).contacted?'true':'false'})
      .attr('data-selected','false')
      .attr('tabindex',0).attr('role','button')
      .attr('aria-label',function(f){var id=fromNumeric(f.id),sum=summary(id);return nameFor(id)+', 후보 '+sum.all+'곳, 공식 자료요청 '+sum.contacted+'건'})
      .on('mouseenter',function(ev,f){var id=fromNumeric(f.id),sum=summary(id);showTip(ev,'<strong>'+safe(nameFor(id))+'</strong><div>후보 '+sum.all+'곳 · 자료요청 '+sum.contacted+'건</div>')})
      .on('mousemove',function(ev,f){var id=fromNumeric(f.id),sum=summary(id);showTip(ev,'<strong>'+safe(nameFor(id))+'</strong><div>후보 '+sum.all+'곳 · 자료요청 '+sum.contacted+'건</div>')})
      .on('mouseleave',hideTip)
      .on('click',function(ev,f){hideTip();setSelected(fromNumeric(f.id),true)})
      .on('keydown',function(ev,f){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();setSelected(fromNumeric(f.id),true)}});
    state.markLayer=gp.append('g').attr('class','kimse-atlas-pins');
    state.zoom=d3.zoom().scaleExtent([1,11]).translateExtent([[-130,-100],[1310,720]]).on('zoom',function(e){state.currentScale=e.transform.k;gp.attr('transform',e.transform);state.markLayer.selectAll('g.kimse-atlas-pin circle').attr('r',function(x){return (x.records.length>1?11:7)/Math.max(1,e.transform.k)});state.markLayer.selectAll('g.kimse-atlas-pin text').attr('dy',3.8/Math.max(1,e.transform.k)).style('font-size',(10/Math.max(1,e.transform.k))+'px');});
    state.svg.call(state.zoom).on('dblclick.zoom',null);
    renderPicker();setSelected('826',false);
    /* On narrow screens the SVG keeps a legible 780px canvas; centre its horizontal viewport. */
    centerMapViewport();
  }
  async function jsonFallback(urls) {
    var err;
    for(var i=0;i<urls.length;i++){try{var r=await fetch(urls[i],{mode:'cors'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch(e){err=e;}}
    throw err||new Error('지도 데이터 불러오기 실패');
  }
  function countryTextFallback(errorMessage) {
    svgEl.innerHTML='<text x="590" y="270" text-anchor="middle" font-size="23" fill="#ddeaff">지도 경계 데이터를 불러올 수 없습니다.</text><text x="590" y="315" text-anchor="middle" font-size="17" fill="#96b5d7">국가 선택 메뉴에서 기관별 자료를 계속 확인할 수 있습니다.</text>';
    picker.innerHTML='<option value="">국가 선택</option>'+(state.data.iso31661Master||[]).map(function(x){return '<option value="'+safe(x.numeric)+'">'+safe(nameFor(x.numeric))+' · '+summary(x.numeric).all+'곳</option>'}).join('');
    setSelected('826',false);
    console.warn('KIMSE R&D Atlas geography fallback:',errorMessage);
  }
  async function start() {
    try {
      var r=await fetch('./rd-world-map-data.json?v=20261013-first-enquiry-routes2',{cache:'no-store'});
      if(!r.ok)throw new Error('기관 자료 HTTP '+r.status);
      state.data=await r.json();
      if(!state.data||!Array.isArray(state.data.institutions)||state.data.institutions.length!==state.data.total)throw new Error('기관 원장 자료 무결성 오류');
      renderStats();
      setupProgressFilters();
      renderProgress();
      enableControls();
      try{
        var topo=await jsonFallback(['https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json','https://unpkg.com/world-atlas@2/countries-50m.json','https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json']);
        renderMap(topo);
      }catch(geoError){countryTextFallback(geoError.message);}
    }catch(err){
      document.getElementById('kimse-atlas-stats').innerHTML='<p class="text-danger">기관 데이터 로딩 실패. 잠시 후 새로고침해 주세요.</p>';
      svgEl.innerHTML='<text x="590" y="300" text-anchor="middle" fill="#a5c8e8">기관 자료 연결을 확인해 주세요.</text>';
      console.error('KIMSE R&D Atlas data error:',err);
    }
  }
  start();
})();
