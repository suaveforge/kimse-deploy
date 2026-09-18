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
  const level=screen.querySelector('.monitoring-level-card');
  const eyebrow=screen.querySelector('.eyebrow');
  const title=screen.querySelector('.page-title');
  const desc=screen.querySelector('.page-desc');
  if(!title||!desc)return;
  const titleRow=make('div','monitoring-title-row');
  const titleCopy=make('div','monitoring-title-copy');
  titleCopy.append(title,desc);
  titleRow.append(titleCopy);
  if(level){
    const chip=make('span','monitoring-period-chip','14일 기준');
    if(eyebrow)eyebrow.append(chip);else titleRow.append(chip);
  }
  eyebrow?.after(titleRow);

  const journey=make('section','monitoring-journey');
  journey.setAttribute('aria-label','최근 변화 해석 순서');
  titleRow.after(journey);

  const changeCards=[...screen.querySelectorAll('.result-change')];
  const baseline=changeCards.length?changeCards.map(card=>{
    const label=clean(card.querySelector('.result-change-label strong')?.textContent);
    const raw=clean(card.querySelector('small span')?.textContent).replace(/^14일 평균\s*/,'');
    return label&&raw?label+' '+raw:'';
  }).filter(Boolean).join(' · '):'14일 동안 쌓인 생활 기록을 기준으로 비교합니다.';
  const baselineBand=make('div','monitoring-baseline-band',
    '<span class="journey-index">01</span><div class="journey-copy"><small>14일의 평소</small><strong>나의 생활 기준선</strong></div><p>'+baseline+'</p>');
  journey.append(baselineBand);

  const grid=screen.querySelector('.result-change-grid');
  const stable=screen.querySelector('.monitoring-stable-note');
  const pattern=make('section','monitoring-pattern-panel');
  const patternHead=make('div','monitoring-pattern-head',
    '<div><span class="journey-index">02</span><span><small>오늘의 변화</small><strong>'+(grid?'여러 변화가 같은 시기에 나타났어요':'큰 변화 없이 이어지고 있어요')+'</strong></span></div>'+icon('wave-sine'));
  pattern.append(patternHead);
  if(grid)pattern.append(grid);
  else if(stable)pattern.append(stable);
  journey.append(pattern);

  if(level){
    const key=statusKey(level);
    const line=level.querySelector('.monitoring-level-line');
    const heading=level.querySelector('h2');
    const meaning={
      stable:'최근 기록은 평소 범위 안에서 이어지고 있습니다.',
      warning:'한 가지 이상 변화가 보여 조금 더 세심하게 살펴볼 때입니다.',
      danger:'수면·활동·말하기 변화가 같은 시기에 보여 전문가와 확인하는 편이 안전합니다.',
      serious:'여러 변화의 폭이 커져 빠른 전문가 확인이 필요한 상태입니다.',
      urgent:'큰 변화가 함께 보여 보호자와 의료기관에 바로 연결할 필요가 있습니다.'
    }[key];
    const top=make('div','monitoring-level-top','<span class="journey-index">03</span><small>변화의 의미</small>');
    if(line){line.classList.add('monitoring-level-badge');top.append(line)}
    level.prepend(top);
    if(heading){
      const note=make('p','monitoring-level-note',meaning);
      heading.after(note);
    }
    journey.append(level);

    const actions=screen.querySelector('.monitoring-actions');
    const nextTitle=screen.querySelector('.monitoring-next-title');
    const detail=screen.querySelector('.monitoring-detail-link');
    if(actions){
      const conclusion={
        stable:'지금처럼 생활 기록을 이어가세요.',
        warning:'기능별 변화를 한 번 더 확인해보세요.',
        danger:'혼자 판단하지 말고, 지금 연결하세요.',
        serious:'오늘 안에 전문가와 연결하세요.',
        urgent:'지금 보호자와 의료기관에 연락하세요.'
      }[key];
      const box=make('section','monitoring-conclusion');
      box.innerHTML='<div class="monitoring-conclusion-head"><span class="journey-index">04</span><div><small>다음 행동</small><h2>'+conclusion+'</h2></div></div>';
      box.append(actions);
      if(detail)box.append(detail);
      nextTitle?.remove();
      journey.append(box);
      actions.querySelectorAll('.status-action').forEach(btn=>{
        const old=clean(btn.textContent);
        const isShare=/보호자/.test(old), isCall=/상담센터/.test(old), isCare=/의료/.test(old), isDetail=/기능별/.test(old);
        const label=isShare?'가족에게 알리기':isCall?'전문가와 확인하기':isCare?'가까운 지원 찾기':isDetail?'기록을 더 자세히':'다음 행동';
        const strong=old;
        const ico=btn.querySelector('i')?.outerHTML||'';
        btn.innerHTML=ico+'<span><small>'+label+'</small><strong>'+strong+'</strong></span>';
      });
    }
  }
}
function enhanceAccessibility(screen){
  if(screen.querySelector('input[data-a11y="captions"],input[data-a11y="colorIcons"],input[data-a11y="screenReader"]'))return false;
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
    largeText:['글자 크게 보기','본문과 핵심 수치를 더 크게 표시합니다.','text-size'],
    highContrast:['고대비 모드','글자·경계·버튼 대비를 더 분명하게 합니다.','contrast-2'],
    largeTouchTargets:['큰 터치 영역','주요 조작 영역을 더 넓게 만들어 누르기 쉽게 합니다.','hand-finger'],
    reduceMotion:['동작 최소화','화면 전환과 움직임을 가능한 한 줄입니다.','motion'],
    voiceGuidance:['음성 안내','화면 제목과 주요 완료 상태를 음성으로 안내합니다.','volume'],
    soundEffects:['효과음','선택·완료·경고 상황을 짧은 소리로 함께 알립니다.','bell']
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
  if(!screen.querySelector('.brain-page-desc'))title.after(make('p','page-desc brain-page-desc','기록된 생활·인지 변화를 기능 단위로 이해하기 쉽게 연결합니다.'));
  const icons={memory:'brain',executive:'target-arrow',language:'message-circle',spatial:'compass',daily:'home-heart'};
  tabs.querySelectorAll('button[data-brain-focus]').forEach(btn=>{
    const key=btn.dataset.brainFocus,label=clean(btn.textContent).replace(/^[^\p{L}\p{N}]+/u,'');
    btn.innerHTML=icon(icons[key]||'circle')+'<span>'+label+'</span>';
  });
  const selected=tabs.querySelector('button.active');
  const selectedLabel=clean(selected?.textContent)||clean(summary.querySelector('strong')?.textContent)||'선택 기능';
  const status=clean(summary.querySelector(':scope > span')?.textContent)||'기록 확인';
  const stage=make('section','brain-map-stage');
  stage.setAttribute('aria-label','선택한 인지 기능 지도');
  stage.innerHTML='<div class="brain-stage-kicker"><span>선택 기능</span><strong>'+selectedLabel+'</strong><em class="brain-stage-status">'+status+'</em></div>';
  visual.before(stage);stage.append(visual,summary);
  const oldStrong=summary.querySelector('strong'),oldSmall=summary.querySelector('small'),oldStatus=summary.querySelector(':scope > span');
  const region=clean(oldSmall?.textContent).replace(/와 관련된 변화를 살펴봅니다\.?$/,'');
  if(oldStrong&&oldSmall&&oldStatus){
    summary.innerHTML='<div><small>'+region+'</small><strong>'+clean(oldStrong.textContent)+' 관련 변화</strong></div><span>'+clean(oldStatus.textContent)+'</span><p>'+region+'와 연결된 기록을 함께 살펴봅니다.</p>';
  }
  if(views){
    views.querySelectorAll('button').forEach(btn=>{btn.textContent=btn.dataset.brainView==='side'?'옆면 보기':'윗면 보기'});
    const controls=make('div','brain-map-controls');
    views.before(controls);controls.append(views);
    if(actions){
      const btn=actions.querySelector('button');
      if(btn){btn.classList.add('brain-trend-cta');btn.innerHTML=icon('chart-line')+'<span>시간에 따른 변화 보기</span>';controls.append(btn)}
      actions.remove();
    }
  }
}
function enhance(){
  const screen=document.querySelector('#main');
  if(!screen||screen.dataset.premiumUx===VERSION)return;
  let ready=true;
  if(screen.classList.contains('screen-monitoring-status'))enhanceMonitoring(screen);
  else if(screen.classList.contains('screen-accessibility'))ready=enhanceAccessibility(screen);
  else if(screen.classList.contains('screen-brain-trends'))enhanceTrends(screen);
  else if(screen.classList.contains('screen-brain-map'))enhanceBrainMap(screen);
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