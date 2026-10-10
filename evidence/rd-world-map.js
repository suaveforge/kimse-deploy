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
      '<div class="kimse-atlas-foot"><strong>상태 표시 기준</strong> · ‘검토 예정’과 ‘적합성 검토 중’은 낌새의 내부 후보 평가입니다. 자료요청 발송·접수 확인은 실제 기록 기준이며, 외부 기관의 승인·보증·제휴나 협의 착수를 뜻하지 않습니다. 도시 핀은 기관 건물의 정확한 위치가 아닌 도시 중심 참고좌표입니다. 지도 경계는 Natural Earth 110m 기반으로 일부 소국가·영역은 확대 지도에 나타나지 않을 수 있습니다.</div>' +
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
  function isContact(x) { return !!(x && /^INFORMATION_REQUEST_/.test(x.stage)); }
  function stageClass(x) {
    return isContact(x) ? 'status-request' : x.stage==='CANDIDATE_FIT_PRELIMINARY'?'status-screen':'status-review';
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
    document.getElementById('kimse-atlas-stats').innerHTML=[
      ['조사 기관',total,'곳'],['탐색 국가·지역',countries,'곳'],['적합성 검토 중',screening,'곳'],['공식 자료요청 발송',sent,'곳']
    ].map(function(a){return '<div class="kimse-atlas-stat"><small>'+safe(a[0])+'</small><strong>'+a[1]+'<em>'+safe(a[2])+'</em></strong></div>'}).join('');
  }
  function nameFor(id) {
    var sample=state.data.institutions.find(function(x){return x.countryNumeric===id;});
    if(sample)return sample.countryName;
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
    arr.sort(function(a,b){var s=function(x){return isContact(x)?3:x.stage==='CANDIDATE_FIT_PRELIMINARY'?2:1};return s(b)-s(a)||a.name.localeCompare(b.name)});
    if(!sum.all){list.innerHTML='<div class="kimse-atlas-empty"><strong>검토 예정</strong><p>현재 기관 원장에 등록된 조사 대상은 없습니다. 등록 기관이 없다는 것은 해당 국가에 적합한 기관이 없다는 뜻이 아닙니다.</p></div>';return;}
    if(!arr.length){list.innerHTML='<div class="kimse-atlas-empty">검색조건에 맞는 기관이 없습니다.</div>';return;}
    list.innerHTML=arr.map(function(x){
      var source=x.sourceURL && /^https:\/\//.test(x.sourceURL) ? '<a class="kimse-atlas-source" href="'+safe(x.sourceURL)+'" rel="noopener noreferrer" target="_blank">연구·거래 근거 보기 ↗</a>':'<span class="kimse-atlas-location">기관별 근거 확인 대상</span>';
      var place=x.city?'<div class="kimse-atlas-location">📍 '+safe(x.city)+' · 도시 단위 참고점</div>':'<div class="kimse-atlas-location">위치 확인 중 · 국가 단위 등록</div>';
      var desc=x.sourceScope?'<p class="kimse-atlas-excerpt">'+safe(x.sourceScope)+'</p>':'';
      return '<article class="kimse-atlas-institution" id="kimse-atlas-inst-'+safe(x.id)+'"><h4>'+safe(x.name)+'</h4><div class="kimse-atlas-chiprow">'+
        '<span class="kimse-atlas-chip '+stageClass(x)+'">'+safe(x.stageLabel)+'</span>'+
        '<span class="kimse-atlas-chip">'+safe(x.sector)+'</span>'+
        '<span class="kimse-atlas-chip">'+safe(x.authority)+'</span></div>'+place+desc+source+'</article>';
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
  function resetZoom(){if(state.svg&&state.zoom)state.svg.transition().duration(350).call(state.zoom.transform,window.d3.zoomIdentity);}
  function renderPicker() {
    var all=state.features.length?state.features.map(function(f){return {id:fromNumeric(f.id),name:f.properties.name||'기타',count:summary(fromNumeric(f.id)).all};}):[];
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
  }
  async function jsonFallback(urls) {
    var err;
    for(var i=0;i<urls.length;i++){try{var r=await fetch(urls[i],{mode:'cors'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch(e){err=e;}}
    throw err||new Error('지도 데이터 불러오기 실패');
  }
  function countryTextFallback(errorMessage) {
    svgEl.innerHTML='<text x="590" y="270" text-anchor="middle" font-size="23" fill="#ddeaff">지도 경계 데이터를 불러올 수 없습니다.</text><text x="590" y="315" text-anchor="middle" font-size="17" fill="#96b5d7">국가 선택 메뉴에서 기관별 자료를 계속 확인할 수 있습니다.</text>';
    picker.innerHTML='<option value="">국가 선택</option>'+Array.from(new Set(state.data.institutions.map(function(x){return x.countryNumeric}))).map(function(id){return '<option value="'+safe(id)+'">'+safe(nameFor(id))+' · '+summary(id).all+'곳</option>'}).join('');
    setSelected('826',false);
    console.warn('KIMSE R&D Atlas geography fallback:',errorMessage);
  }
  async function start() {
    try {
      var r=await fetch('./rd-world-map-data.json?v=20261010-globalatlas',{cache:'no-store'});
      if(!r.ok)throw new Error('기관 자료 HTTP '+r.status);
      state.data=await r.json();
      if(!state.data||!Array.isArray(state.data.institutions)||state.data.institutions.length!==state.data.total)throw new Error('기관 원장 자료 무결성 오류');
      renderStats();
      enableControls();
      try{
        var topo=await jsonFallback(['https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json','https://unpkg.com/world-atlas@2/countries-110m.json']);
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
