(()=>{'use strict';
const STATE_KEY='kimse.p0.state';
const ALWAYS_ON_KEYS=new Set(['captions','colorIcons','screenReader']);
const RELEASE_LABEL='Updated 2026.09.17 · Release 38';
const clean=t=>String(t||'').replace(/\s+/g,' ').trim();
const readState=()=>{try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}catch{return {}}};
function applyPreferenceClasses(){
  const a11y=readState().a11y||{};
  document.documentElement.classList.toggle('user-reduced-motion',!!a11y.reduceMotion);
}
function setTextSummary(screen,id,title,parts){
  let section=screen.querySelector('#'+id);
  if(!section){
    section=document.createElement('section');
    section.id=id;
    section.className='a11y-only';
    screen.appendChild(section);
  }
  if(section.getAttribute('aria-label')!==title)section.setAttribute('aria-label',title);
  const text=[title,...parts.map(clean).filter(Boolean)].join('. ')+'.';
  if(section.textContent!==text)section.textContent=text;
  return section;
}
function markStateButtons(screen){
  screen.querySelectorAll('button[data-brain-focus],button[data-brain-domain],button[data-brain-range],button[data-brain-view],button[data-market-cat]').forEach(btn=>{
    btn.setAttribute('aria-pressed',btn.classList.contains('active')?'true':'false');
  });
  screen.querySelectorAll('.nav-item').forEach(item=>{
    if(item.classList.contains('active'))item.setAttribute('aria-current','page');
    else item.removeAttribute('aria-current');
  });
}
function enhanceAccessibility(screen){
  const desc=screen.querySelector('.page-desc');
  if(desc&&desc.textContent!=='보기·듣기·조작 방식을 내 환경에 맞게 조정할 수 있습니다.')desc.textContent='보기·듣기·조작 방식을 내 환경에 맞게 조정할 수 있습니다.';
  const card=screen.querySelector('.summary-card');
  if(card&&card.dataset.a11ySettingsNormalized!=='true'){
    card.querySelectorAll('input[data-a11y]').forEach(input=>{
      if(ALWAYS_ON_KEYS.has(input.dataset.a11y))input.closest('.switch-row')?.remove();
    });
    const order=['largeText','highContrast','largeTouchTargets','voiceGuidance','soundEffects','reduceMotion'];
    order.forEach(key=>{const row=card.querySelector('input[data-a11y="'+key+'"]')?.closest('.switch-row');if(row)card.appendChild(row)});
    const labels={voiceGuidance:'음성 안내',soundEffects:'효과음',largeTouchTargets:'큰 터치 영역',reduceMotion:'동작 최소화'};
    Object.entries(labels).forEach(([key,label])=>{const el=card.querySelector('label[for="a-'+key+'"]');if(el&&el.textContent!==label)el.textContent=label});
    card.dataset.a11ySettingsNormalized='true';
  }
  screen.querySelectorAll('.notice').forEach(n=>{if(clean(n.textContent).includes('촉각/모스 인터페이스'))n.remove()});
  if(!screen.querySelector('.accessibility-basics')){
    const basics=document.createElement('section');
    basics.className='accessibility-basics';
    basics.setAttribute('aria-labelledby','accessibility-basics-title');
    basics.innerHTML='<h2 id="accessibility-basics-title">기본으로 적용돼요</h2>'+
      '<div class="accessibility-basic-row"><i class="ti ti-shapes" aria-hidden="true"></i><span><strong>상태는 색만으로 구분하지 않아요</strong><small>상태명·아이콘·증감 방향을 함께 표시합니다.</small></span></div>'+
      '<div class="accessibility-basic-row"><i class="ti ti-chart-line" aria-hidden="true"></i><span><strong>그래프의 핵심 변화는 글로도 제공해요</strong><small>주요 변화와 눈에 띄는 날을 텍스트로 함께 확인할 수 있습니다.</small></span></div>'+
      '<div class="accessibility-basic-row"><i class="ti ti-accessible" aria-hidden="true"></i><span><strong>주요 버튼과 상태 요약을 화면 읽기 기능에서 확인할 수 있어요</strong><small>보이는 정보와 같은 의미가 접근성 트리에도 남도록 구성합니다.</small></span></div>';
    (card||screen.querySelector('.page-desc'))?.after(basics);
  }
}
function enhanceStart(screen){
  const notice=[...screen.querySelectorAll('.notice')].find(n=>clean(n.textContent).includes('접근성을 기본으로 설계했어요'));
  if(notice&&notice.dataset.a11yCopyNormalized!=='true'){notice.innerHTML='<strong>보기와 조작을 편하게 바꿀 수 있어요.</strong>큰 글씨·큰 터치·고대비·음성 안내를 조정하고, 주요 상태는 글자와 아이콘으로도 표시합니다.';notice.dataset.a11yCopyNormalized='true'}
}
function enhanceMonitoring(screen){
  const headline=clean(screen.querySelector('h1')?.textContent);
  const level=clean(screen.querySelector('.monitoring-level-card')?.textContent);
  const changes=[...screen.querySelectorAll('.result-change')].map(card=>{
    const label=clean(card.querySelector('.result-change-label strong')?.textContent);
    const delta=clean(card.querySelector('b')?.textContent);
    const compare=clean(card.querySelector('small')?.textContent);
    card.setAttribute('aria-label',[label,delta,compare].filter(Boolean).join(', '));
    return [label,delta,compare].filter(Boolean).join(', ');
  });
  const actions=clean(screen.querySelector('.monitoring-actions')?.textContent);
  const foot=clean(screen.querySelector('.screen-footnote')?.textContent);
  const summary=setTextSummary(screen,'monitoring-a11y-summary','최근 변화 요약',[headline,level,...changes,actions?'다음 단계 '+actions:'',foot]);
  screen.querySelector('.monitoring-level-card')?.setAttribute('aria-describedby',summary.id);
}
function enhanceBrainMap(screen){
  const selection=clean(screen.querySelector('.brain-focus-summary')?.textContent||screen.querySelector('.brain-focus-head')?.textContent);
  const foot=clean(screen.querySelector('.screen-footnote')?.textContent);
  const summary=setTextSummary(screen,'brain-map-a11y-summary','인지 기능 지도 요약',[selection,foot]);
  screen.querySelectorAll('.brain-visual,[role="img"][aria-label*="인지 기능 연관 지도"]').forEach(svg=>{
    svg.setAttribute('aria-describedby',summary.id);
    svg.setAttribute('aria-label','선택한 인지 기능과 관련된 기능 연관 지도');
  });
}
function enhanceBrainTrends(screen){
  const title=clean(screen.querySelector('.trend-title-row .page-title')?.textContent||screen.querySelector('h1')?.textContent);
  const delta=clean(screen.querySelector('.trend-delta')?.textContent);
  const records=clean(screen.querySelector('.trend-hero-head')?.textContent);
  const attention=clean(screen.querySelector('.trend-attention-note')?.textContent);
  const foot=clean(screen.querySelector('.screen-footnote')?.textContent);
  const summary=setTextSummary(screen,'brain-trends-a11y-summary','기능 변화 그래프 요약',[title,delta?'변화 '+delta:'',records,attention,foot]);
  screen.querySelectorAll('.overall-trend').forEach(svg=>{
    svg.setAttribute('aria-describedby',summary.id);
    svg.setAttribute('aria-label',(title||'기능 변화')+' 그래프');
  });
}
function enhanceDemoCapture(screen){
  const title=screen.querySelector('.page-title');
  if(title&&title.innerHTML.includes('약 50초'))title.innerHTML=title.innerHTML.replace('약 50초','약 1분');
  const download=screen.querySelector('#demo-download');
  if(download)download.setAttribute('download','kimse-youtube-demo-1min.webm');
}
function updateRelease(screen){
  const foot=screen.querySelector('.app-footer');
  if(foot){const lines=clean(foot.textContent).replace(/^Updated\s+\S+\s+·\s+Release\s+\d+\s*/,'');const html=RELEASE_LABEL+'<br>'+lines;if(foot.innerHTML!==html)foot.innerHTML=html}
}
function enhance(){
  applyPreferenceClasses();
  const screen=document.querySelector('#main');
  if(!screen)return;
  markStateButtons(screen);
  if(screen.classList.contains('screen-accessibility'))enhanceAccessibility(screen);
  if(screen.classList.contains('screen-start'))enhanceStart(screen);
  if(screen.classList.contains('screen-monitoring-status'))enhanceMonitoring(screen);
  if(screen.classList.contains('screen-brain-map'))enhanceBrainMap(screen);
  if(screen.classList.contains('screen-brain-trends'))enhanceBrainTrends(screen);
  if(screen.classList.contains('screen-demo-capture'))enhanceDemoCapture(screen);
  updateRelease(screen);
  screen.dataset.a11yEnhanced='true';
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
const app=document.querySelector('#app');
if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
window.addEventListener('storage',schedule);
window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',schedule);
schedule();
})();