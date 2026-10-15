(function(){
'use strict';
const records=Array.isArray(window.KIMSE_COMPETITOR_RECORDS)?window.KIMSE_COMPETITOR_RECORDS:[];
const list=document.getElementById('competitor-list'),detail=document.getElementById('competitor-detail'),toolbar=document.getElementById('competitor-filters'),search=document.getElementById('competitor-search'),count=document.getElementById('competitor-count'),compareButton=document.getElementById('competitor-compare'),comparePanel=document.getElementById('competitor-compare-panel'),selectedCount=document.getElementById('competitor-selected-count');
if(!list||!detail||!records.length)return;
let category='전체',active=records[0].id,query='',compareIds=[];
function escape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function find(id){return records.find(a=>a.id===id);}
function logo(r,cls){const initials=r.name.replace(/[^A-Za-z가-힣0-9]/g,'').slice(0,2);if(!r.logo)return '<span class="'+cls+' competitor-logo-fallback" style="background:'+escape(r.brand)+'">'+escape(initials)+'</span>';return '<img class="'+cls+'" src="'+escape(r.logo)+'" alt="'+escape(r.name)+' 공식 아이콘/사이트 파비콘" loading="lazy" onerror="this.hidden=true;this.insertAdjacentHTML(\'afterend\',\'<span class=&quot;competitor-logo competitor-logo-fallback&quot;>·</span>\')">';}
function chip(t,neutral){return '<span class="competitor-chip'+(neutral?' neutral':'')+'">'+escape(t)+'</span>';}
function filtered(){return records.filter(a=>(category==='전체'||a.kind===category)&&(!query||[a.name,a.owner,a.kind,a.one,a.desc,...a.strengths,...a.limits].join(' ').toLowerCase().includes(query)));}
function renderFilters(){const kinds=['전체',...new Set(records.map(a=>a.kind))];toolbar.innerHTML=kinds.map(x=>'<button type="button" class="competitor-filter" data-filter="'+escape(x)+'" aria-pressed="'+String(category===x)+'">'+escape(x)+'</button>').join('');}
function renderList(){
 const found=filtered();count.textContent=found.length+' / '+records.length+'개 서비스';
 if(!found.length){list.innerHTML='<div class="competitor-empty">검색 결과가 없습니다.</div>';return;}
 list.innerHTML=found.map(r=>'<div class="competitor-entry'+(r.id===active?' is-active':'')+'" data-open="'+escape(r.id)+'" role="button" tabindex="0" aria-label="'+escape(r.name)+' 상세 보기">'+logo(r,'competitor-logo')+'<div class="competitor-entry-main"><b>'+escape(r.name)+'</b><small>'+escape(r.one)+'</small></div><input type="checkbox" data-select="'+escape(r.id)+'" aria-label="'+escape(r.name)+' 비교 선택" '+(compareIds.includes(r.id)?'checked':'')+' title="비교 선택"></div>').join('');
}
function metric(r){return r.stats.map(([title,value,note])=>'<div class="competitor-stat"><span>'+escape(title)+'</span><strong>'+escape(value)+'</strong><small>'+escape(note)+'</small></div>').join('');}
function textLi(v){return '<ul class="ps-3 mb-0">'+v.map(s=>'<li>'+escape(s)+'</li>').join('')+'</ul>';}
function renderDetail(){
 const r=find(active)||records[0];active=r.id;
 detail.innerHTML='<div class="competitor-brand-header">'+logo(r,'competitor-detail-logo')+'<div><h2 class="competitor-brand-name" style="color:'+escape(r.brand)+'">'+escape(r.name)+'</h2><div class="competitor-subline">'+escape(r.owner)+'</div><div class="mt-2">'+chip(r.kind,true)+chip(r.tag)+'</div></div></div>'+
 '<p class="competitor-statement">'+escape(r.one)+'</p><p class="text-secondary" style="font-size:14px;line-height:1.7">'+escape(r.desc)+'</p>'+
 '<div class="competitor-section"><h3>규모 · 공개 숫자</h3><div class="competitor-stats">'+metric(r)+'</div><p class="competitor-small mt-2">숫자는 성격·단위가 다릅니다. 기관 수와 앱 설치 수, 실제 사용자 수를 합산하지 않습니다.</p></div>'+
 '<div class="competitor-section competitor-dual"><div><h3>강점 · 공개 제품 기반</h3>'+textLi(r.strengths)+'</div><div><h3>제약 · 추가 검증 대상</h3>'+textLi(r.limits)+'</div></div>'+
 '<div class="competitor-section"><h3>낌새와의 관계</h3><p class="mb-2">'+chip(r.relationship,true)+'</p><h4 style="font-size:13px;margin-top:14px">데이터 활용 관점</h4><p style="font-size:13px;line-height:1.65">'+escape(r.data)+'</p><p class="competitor-small">현재 접근 상태: '+escape(r.access)+' · 낌새가 실제 수집 완료한 것과 구분</p></div>'+
 '<div class="competitor-section"><h3>원문 · 확인 출처</h3>'+r.sources.map(([title,url,type])=>'<div class="competitor-source"><span>'+escape(title)+' <em>('+escape(type)+')</em></span><a href="'+escape(url)+'" target="_blank" rel="noopener noreferrer">열기 ↗</a></div>').join('')+
 '<p class="competitor-small mt-3">마지막 조사: '+escape(window.KIMSE_COMPETITOR_LAST_REVIEWED)+' · 공식 사업자 주장, 공공기관 원문, 스토어 표시는 서로 다른 증거 수준으로 취급합니다.</p></div>';
}
function setDetail(id){if(!find(id))return;active=id;renderList();renderDetail();}
function renderSelected(){selectedCount.textContent=compareIds.length;compareButton.disabled=compareIds.length<2;}
function renderComparison(){
 if(compareIds.length<2){comparePanel.hidden=true;return;}
 const choices=compareIds.map(find).filter(Boolean);
 const fields=[["한눈에",r=>r.one],["분야",r=>r.kind],["공개 규모",r=>r.stats.map(x=>x[0]+' '+x[1]).join(' / ')],["강점",r=>r.strengths.join(' · ')],["공개 자료상 한계",r=>r.limits.join(' · ')],["낌새 데이터 연계",r=>r.access]];
 comparePanel.hidden=false;
 comparePanel.innerHTML='<div class="d-flex justify-content-between align-items-center gap-3"><h2>선택한 경쟁사 비교</h2><button type="button" id="competitor-compare-close" class="btn btn-sm btn-outline-secondary">닫기</button></div><p class="competitor-small">동일한 측정 단위로 보정하지 않은 원문 기반 정성 비교입니다.</p><table><thead><tr><th scope="col">비교 항목</th>'+choices.map(r=>'<th scope="col">'+escape(r.name)+'</th>').join('')+'</tr></thead><tbody>'+fields.map(([label,get])=>'<tr><td>'+escape(label)+'</td>'+choices.map(r=>'<td>'+escape(get(r))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 comparePanel.scrollIntoView({behavior:'smooth',block:'start'});
}
toolbar.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;category=b.dataset.filter;renderFilters();renderList();});
search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();renderList();});
list.addEventListener('click',e=>{
 const cb=e.target.closest('[data-select]');
 if(cb){const id=cb.dataset.select;if(cb.checked){if(compareIds.length>=3){cb.checked=false;alert('한 번에 최대 3개 서비스를 비교할 수 있습니다.');return;}compareIds.push(id);}else compareIds=compareIds.filter(x=>x!==id);renderSelected();return;}
 const b=e.target.closest('[data-open]');if(b)setDetail(b.dataset.open);
});
list.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-open]'))setDetail(e.target.dataset.open);});
compareButton.addEventListener('click',renderComparison);
comparePanel.addEventListener('click',e=>{if(e.target.id==='competitor-compare-close')comparePanel.hidden=true;});
renderFilters();renderList();renderDetail();renderSelected();
})();