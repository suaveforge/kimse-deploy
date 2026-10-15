(()=>{'use strict';
const VERSION='39';
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const icon=n=>'<i class="ti ti-'+n+'" aria-hidden="true"></i>';
const app=document.querySelector('#app');
if(!app)return;

function make(tag,cls,html=''){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(html)node.innerHTML=html;
  return node;
}
function statusKey(card){
  return ['stable','warning','danger','serious','urgent'].find(k=>card?.classList.contains('level-'+k))||'stable';
}
function enhanceMonitoring(screen){
  // One actual mobile screen. The complete original server result stays in details.
  if(screen.querySelector('.kimse-monitoring-one-screen,.kimse-monitoring-insufficient'))return;
  const level=screen.querySelector('.monitoring-level-card');
  if(!level)return;
  const cards=[...screen.querySelectorAll('.result-change')];
  const key=statusKey(level);
  const statusText={stable:'평소 흐름',warning:'변화 확인',danger:'상담 준비',serious:'빠른 확인',urgent:'즉시 확인'}[key];
  const overview=make('section','kimse-monitoring-one-screen');
  overview.setAttribute('aria-label','최근 생활 변화 한눈에 보기');
  const meta=make('div','kimse-one-screen-meta');
  const kicker=make('span','kimse-one-screen-kicker');
  kicker.textContent='최근 변화 · 14일 기준 비교';
  const badge=make('span','kimse-one-screen-badge level-'+key);
  badge.textContent=statusText;
  meta.append(kicker,badge);
  const heading=make('h1','page-title kimse-one-screen-headline');
  heading.textContent=cards.length>1?'생활 변화 '+cards.length+'가지가 보여요':cards.length===1?'평소와 달라진 기록이 있어요':'최근 기록을 확인했어요';
  const intro=make('p','kimse-one-screen-intro');
  intro.textContent='평소 기록과 비교한 결과이며, 진단 결과는 아닙니다.';
  overview.append(meta,heading,intro);
  if(cards.length){
    const list=make('div','kimse-one-screen-signals');
    list.setAttribute('role','list');
    cards.slice(0,3).forEach(card=>{
      const tile=make('div','kimse-one-screen-signal');
      tile.setAttribute('role','listitem');
      const original=clean(card.querySelector('.result-change-label strong')?.textContent);
      const label=make('span','kimse-one-screen-name');
      label.textContent=({'수면시간':'수면','걸음수':'걸음','말할 때 멈춤':'말하기 멈춤'}[original]||original||'관찰 신호');
      const raw=clean(card.querySelector('b')?.textContent);
      const delta=make('strong','kimse-one-screen-delta');
      delta.textContent=raw.match(/[+−-]?\s*\d+(?:\.\d+)?\s*%/)?.[0]?.replace(/\s/g,'')||raw;
      tile.append(label,delta);
      tile.setAttribute('aria-label',label.textContent+' '+delta.textContent);
      list.append(tile);
    });
    overview.append(list);
    if(cards.length>3){const more=make('small','kimse-one-screen-more');more.textContent='다른 변화 '+(cards.length-3)+'개는 상세 기록에서 확인할 수 있어요.';overview.append(more)}
  }else{
    const empty=make('div','kimse-one-screen-empty');empty.textContent='현재 표시할 변화 신호가 없습니다.';overview.append(empty);
  }
  const action=[...screen.querySelectorAll('.observation-stage-card .list-row')].find(x=>clean(x.querySelector('strong')?.textContent)==='지금 할 일');
  const next=make('section','kimse-one-screen-next');
  const label=make('span','kimse-one-screen-next-label');label.textContent='지금 할 일';
  const advice=make('strong','kimse-one-screen-advice');
  advice.textContent=clean(action?.querySelector('small')?.textContent)||(key==='stable'?'생활 기록을 계속 남겨주세요.':'가족이나 전문가와 최근 기록을 확인하세요.');
  const links=make('div','kimse-one-screen-links');
  const report=make('a','kimse-one-screen-primary');report.href='#/consultation-report';report.textContent='상담용 요약 보기';
  const collection=make('a','kimse-one-screen-secondary');collection.href='#/collection-status';collection.textContent='수집 기록';
  links.append(report,collection);
  next.append(label,advice,links);overview.append(next);

  const details=make('details','kimse-monitoring-details');
  const summary=make('summary','');summary.textContent='상세 변화·판단 근거 보기';details.append(summary);
  [...screen.childNodes].forEach(node=>details.append(node)); // move controls intact, never duplicate
  screen.append(overview,details);
  screen.dataset.monitoringOneScreen='true';
}
function enhanceAccessibility(screen){
  const title=screen.querySelector('.page-title'),desc=screen.querySelector('.page-desc'),card=screen.querySelector('.summary-card');
  if(!title||!desc||!card)return false;
  const hero=make('section','accessibility-hero');
  const symbol=make('span','accessibility-hero-icon',icon('accessible'));
  const copy=make('div','');
  const eyebrow=make('div','eyebrow','내게 맞는 사용 환경');
  copy.append(eyebrow,title,desc);hero.append(symbol,copy);
  card.before(hero);
  card.classList.add('accessibility-control-card');
  const head=make('div','accessibility-card-head','<strong>사용 환경 조정</strong><small>변경 즉시 앱 전체에 적용됩니다.</small>');
  card.prepend(head);
  const meta={
    largeText:['글자 크게 보기','글자를 더 크게 봅니다.','text-size'],
    highContrast:['고대비 모드','글자와 버튼을 뚜렷하게 봅니다.','contrast-2'],
    largeTouchTargets:['큰 터치 영역','누르기 쉽게 버튼을 넓힙니다.','hand-finger'],
    voiceGuidance:['음성 안내','화면 내용을 소리로 안내합니다.','volume'],
    soundEffects:['효과음','선택하거나 저장하면 소리가 납니다.','bell'],
    reduceMotion:['화면 움직임 줄이기','화면 움직임을 줄입니다.','motion']
  };
  card.querySelectorAll('.switch-row').forEach(row=>{
    const input=row.querySelector('input[data-a11y]'),m=meta[input?.dataset.a11y];
    if(!input||!m)return;
    row.classList.add('a11y-setting-row');
    const label=row.querySelector('label');
    if(label)label.innerHTML='<span class="a11y-setting-icon">'+icon(m[2])+'</span><span><strong>'+m[0]+'</strong><small>'+m[1]+'</small></span>';
  });
  return true;
}
function enhanceTrends(screen){
  const row=screen.querySelector('.trend-title-row'),title=row?.querySelector('.page-title'),desc=screen.querySelector('.page-desc'),delta=row?.querySelector('.trend-delta');
  if(!row||!title||!desc)return;
  const rawTitle=clean(title.textContent),parts=rawTitle.split('·').map(x=>x.trim());
  const range=parts.length>1?parts[0]:'조회 기간';
  const domain=parts.length>1?parts.slice(1).join(' · '):rawTitle.replace(/의 변화$/,'');
  const heading=make('div','trend-heading-copy');
  title.textContent=(domain||'전체 기능')+'의 변화';
  heading.append(title,desc);
  row.prepend(heading);
  const deltaValue=clean(delta?.textContent);
  if(delta){
    delta.innerHTML='<small>'+range+'</small><strong>'+deltaValue+'</strong>';
  }
  const rangeBox=screen.querySelector('.compact-range'),tabs=screen.querySelector('.trend-domain-tabs');
  if(rangeBox&&tabs){
    const filters=make('div','trend-filter-stack');
    rangeBox.before(filters);filters.append(rangeBox,tabs);
    const icons={overall:'activity-heartbeat',memory:'brain',executive:'target-arrow',language:'message-circle',spatial:'compass',daily:'home-heart'};
    tabs.querySelectorAll('button[data-brain-domain]').forEach(btn=>{
      const key=btn.dataset.brainDomain,label=clean(btn.textContent).replace(/^[^\p{L}\p{N}]+/u,'');
      btn.innerHTML=icon(icons[key]||'circle')+'<span>'+label+'</span>';
    });
  }
  const hero=screen.querySelector('.trend-hero'),heroHead=hero?.querySelector('.trend-hero-head'),svg=hero?.querySelector('.overall-trend');
  if(hero&&heroHead){
    const count=clean(heroHead.querySelector(':scope > span')?.textContent);
    const small=heroHead.querySelector('small');
    if(small&&count)small.textContent=clean(small.textContent)+' · '+count;
    const numeric=parseInt(String(deltaValue).replace(/[^\d-]/g,''),10);
    const reading=Number.isFinite(numeric)?(numeric<=-4?'최근 기록이 평소보다 낮아지는 흐름입니다.':numeric>=4?'최근 기록이 평소보다 높아지는 흐름입니다.':'최근 기록은 큰 흔들림 없이 이어지고 있습니다.'):'기록이 쌓이면 변화 흐름을 보여드립니다.';
    const old=heroHead.querySelector(':scope > span');if(old){old.className='trend-reading';old.textContent=reading}
    if(svg&&!hero.querySelector('.trend-chart-legend'))svg.after(make('div','trend-chart-legend','<span><i></i>기록 흐름</span><span><i class="attention"></i>눈에 띈 날</span>'));
  }
}
function enhanceBrainMap(screen){
  const title=screen.querySelector('.page-title'),tabs=screen.querySelector('.brain-domain-tabs'),visual=screen.querySelector('.brain-visual-wrap'),summary=screen.querySelector('.brain-focus-summary'),views=screen.querySelector('.brain-view-switch'),actions=screen.querySelector('.hero-actions');
  if(!title||!tabs||!visual||!summary)return;
  tabs.before(make('h2','brain-section-heading','1. 살펴볼 기능을 선택하세요'));
  const icons={memory:'brain',executive:'target-arrow',language:'message-circle',spatial:'compass',daily:'home-heart'};
  tabs.querySelectorAll('button[data-brain-focus]').forEach(btn=>{
    const key=btn.dataset.brainFocus,label=clean(btn.textContent).replace(/^[^\p{L}\p{N}]+/u,'');
    btn.innerHTML=icon(icons[key]||'circle')+'<span>'+label+'</span>';
  });
  const selected=tabs.querySelector('button.active');
  const selectedLabel=clean(selected?.textContent)||clean(summary.querySelector('strong')?.textContent)||'선택 기능';
  const rawStatus=clean(summary.querySelector(':scope > span')?.textContent);
  const status=rawStatus==='개인 점수 미산출'?'참고 지도':rawStatus||'참고 지도';
  const stage=make('section','brain-map-stage');
  stage.setAttribute('aria-label','선택한 기능과 관련된 참고 지도');
  stage.innerHTML='<div class="brain-stage-kicker"><span>2. 선택한 기능과 관련된 영역</span><strong>'+selectedLabel+'</strong><em class="brain-stage-status">'+status+'</em></div>';
  visual.before(stage);stage.append(visual,summary);
  const oldStrong=summary.querySelector('strong'),oldSmall=summary.querySelector('small'),oldStatus=summary.querySelector(':scope > span');
  const region=clean(oldSmall?.textContent).split('와 관련된')[0].trim()||'관찰 영역';
  if(oldStrong&&oldSmall&&oldStatus){
    summary.innerHTML='<div><small>그림에서 강조된 영역</small><strong>'+region+'</strong></div><p>이 그림은 관련 기능을 이해하기 위한 안내입니다. 뇌영상 검사나 개인의 치매 진단 결과가 아닙니다.</p>';
  }
  if(views){
    views.querySelectorAll('button').forEach(btn=>{btn.textContent=btn.dataset.brainView==='side'?'옆면 보기':'윗면 보기'});
    const controls=make('div','brain-map-controls');
    controls.append(views);
    stage.insertBefore(controls,visual);
  }
  if(actions){
    actions.classList.add('brain-next-action');
    const btn=actions.querySelector('button');
    if(btn){btn.classList.add('brain-trend-cta');btn.innerHTML=icon('chart-line')+'<span>3. 시간에 따른 변화 보기</span>';}
  }
}
function enhanceResearchEngine(screen){
  const title=screen.querySelector('.page-title');
  // Keep the original page heading; it explains the two-step evidence-to-record flow.
  screen.querySelectorAll('.research-factor-row em').forEach(label=>{
    if(label.textContent.trim()==='개인 baseline')label.textContent='나의 평소 기준';
  });
}
function enhance(){
  const screen=document.querySelector('#main');
  if(!screen||screen.dataset.premiumUx===VERSION)return;
  let ready=true;
  if(screen.classList.contains('screen-monitoring-status'))enhanceMonitoring(screen);
  else if(screen.classList.contains('screen-accessibility'))ready=enhanceAccessibility(screen);
  else if(screen.classList.contains('screen-brain-trends'))enhanceTrends(screen);
  else if(screen.classList.contains('screen-brain-map'))enhanceBrainMap(screen);
  else if(screen.classList.contains('screen-research-engine'))enhanceResearchEngine(screen);
  else return;
  if(ready)screen.dataset.premiumUx=VERSION;
}
let queued=false;
function schedule(){
  if(queued)return;queued=true;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;enhance()}));
}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
window.addEventListener('hashchange',schedule);
window.addEventListener('storage',schedule);
schedule();
})();