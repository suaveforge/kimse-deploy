(function(){
'use strict';
if(document.body.getAttribute('data-evidence-page')!=='menu')return;
const hub=document.getElementById('evidence-home'),grid=hub&&hub.querySelector('.kimse-primary-grid');
if(!grid)return;
const st=document.createElement('style');
st.textContent=[
'.readiness-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:24px 0 15px}',
'.readiness-total{background:#fff;border:1px solid #d8e8e4;border-radius:15px;padding:17px 19px;min-width:0}',
'.readiness-total .head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
'.readiness-total .head span{font-size:15px;font-weight:800;color:#254e52}',
'.readiness-total .head strong{font-size:33px;line-height:1.1;letter-spacing:-.045em;font-variant-numeric:tabular-nums;color:#006f63}',
'.readiness-total .track{height:7px;overflow:hidden;background:#e6efec;border-radius:9px;margin:11px 0 9px}',
'.readiness-total .bar{display:block;width:0;height:100%;background:linear-gradient(90deg,#40bba7,#077c6d);border-radius:9px;transition:width .6s ease}',
'.readiness-total p{font-size:12px;line-height:1.5;color:#60747a;margin:0}',
'.readiness-disclaimer{margin:0 0 17px;color:#667b80;font-size:12px;line-height:1.6;text-align:center}',
'.kimse-primary-choice[data-readiness-key]{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;justify-content:stretch!important;align-items:stretch!important;padding:0!important;min-width:0;box-shadow:0 6px 19px rgba(10,66,63,.07)}',
'.kimse-primary-choice[data-readiness-key].readiness-active{border-color:#087f74!important;box-shadow:0 0 0 3px rgba(14,136,120,.14),0 10px 28px rgba(7,90,80,.13)}',
'.kimse-primary-choice[data-readiness-key] .readiness-fill{position:absolute;z-index:0;pointer-events:none;inset:auto 0 0;height:0;background:linear-gradient(180deg,rgba(114,218,192,.32) 0%,rgba(4,150,126,.35) 100%);transition:height .85s cubic-bezier(.22,.68,0,1)}',
'.kimse-primary-choice[data-readiness-key] .readiness-fill:not(.is-zero):before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:rgba(0,127,106,.65)}',
'.kimse-primary-choice[data-readiness-key] .readiness-card-trigger{position:relative;z-index:1;display:flex;flex:1;flex-direction:column;justify-content:center;align-items:center;width:100%;min-height:0;border:0;background:transparent;color:inherit;cursor:pointer;padding:13px 14px 43px;font-family:inherit}',
'.kimse-primary-choice[data-readiness-key] .readiness-card-trigger:focus-visible{outline:3px solid #006f65;outline-offset:-5px;border-radius:18px}',
'.kimse-primary-choice[data-readiness-key] .readiness-card-trigger .kimse-primary-icon{flex-shrink:0;margin:0 0 13px}',
'.kimse-primary-choice[data-readiness-key] .readiness-card-trigger .kimse-primary-copy{display:block;flex-shrink:0}',
'.kimse-primary-choice[data-readiness-key] .readiness-number{display:block;margin-top:13px;font-size:42px;font-weight:900;letter-spacing:-.065em;line-height:1;color:#005f57;font-variant-numeric:tabular-nums}',
'.kimse-primary-choice[data-readiness-key] .readiness-count{margin-top:6px;color:#1e625d;font-size:12px;font-weight:800;line-height:1.3}',
'.kimse-primary-choice[data-readiness-key] .readiness-card-link{position:absolute;z-index:3;bottom:10px;left:50%;transform:translateX(-50%);white-space:nowrap;color:#145f58!important;background:rgba(255,255,255,.80);border:1px solid rgba(9,115,102,.2);border-radius:999px;text-decoration:none;font-weight:750;font-size:12px;line-height:1;padding:8px 12px;backdrop-filter:blur(3px)}',
'.kimse-primary-choice[data-readiness-key] .readiness-card-link:hover{background:#fff;border-color:#07887a}',
'.kimse-primary-choice[data-readiness-key] .readiness-card-link:focus-visible{outline:3px solid #006f65;outline-offset:2px}',
'.readiness-inspector{margin-top:18px;padding:23px 26px;border:1px solid #bee1d9;border-radius:18px;background:#f9fdfb;box-shadow:0 6px 20px rgba(10,67,63,.05);scroll-margin-top:14px}',
'.readiness-inspector[hidden]{display:none}',
'.readiness-inspector .inspector-head{display:flex;align-items:center;justify-content:space-between;gap:14px}',
'.readiness-inspector .inspector-eyebrow{display:block;font-size:11px;font-weight:850;color:#0d8d7b;letter-spacing:.06em;margin-bottom:5px}',
'.readiness-inspector h3{font-weight:900;font-size:23px;letter-spacing:-.035em;margin:0}',
'.readiness-inspector .inspector-close{border:1px solid #d7e6e3;background:#fff;width:34px;height:34px;border-radius:9px;cursor:pointer;font-size:22px;line-height:1;color:#4b7370;flex-shrink:0}',
'.readiness-inspector .inspector-meta{margin:12px 0 19px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
'.readiness-inspector .inspector-percent{font-size:36px;font-weight:900;color:#007e70;letter-spacing:-.05em;line-height:1}',
'.readiness-inspector .inspector-meta p{margin:0;color:#557579;font-size:13px;line-height:1.5}',
'.readiness-inspector .inspector-actions{display:flex;justify-content:space-between;align-items:center;gap:9px;flex-wrap:wrap;margin-top:16px}',
'.readiness-inspector .inspector-page-link{display:inline-flex;align-items:center;gap:5px;font-weight:800;color:#08776c;text-decoration:none;font-size:13px;border:1px solid #bfded8;border-radius:9px;padding:9px 12px;background:white}',
'.readiness-inspector .inspector-hint{font-size:12px;color:#677f83}',
'.readiness-inspector .inspector-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
'.readiness-inspector .inspector-check{border:1px solid #e0ece9;background:#fff;border-radius:11px;padding:12px 14px;min-width:0}',
'.readiness-inspector .inspector-check .mark{font-size:11px;font-weight:800;color:#657781;display:block;margin-bottom:5px}',
'.readiness-inspector .inspector-check .mark.met{color:#07836e}',
'.readiness-inspector .inspector-check .mark.partial{color:#9b690d}',
'.readiness-inspector .inspector-check b{display:block;font-size:13px;line-height:1.45;color:#23454f}',
'.readiness-inspector .inspector-check p{font-size:12px;line-height:1.55;color:#58727b;margin:6px 0 0}',
'.readiness-inspector .inspector-check.is-next{border-color:#e4cba2;background:#fffaf1}',
'.readiness-method{background:#fff;border:1px solid #e0eae8;border-radius:12px;margin-top:17px;overflow:hidden}',
'.readiness-method summary{cursor:pointer;font-size:13px;color:#5e767b;padding:14px 18px;font-weight:750}',
'.readiness-method-body{padding:0 18px 18px}',
'.readiness-group{border-top:1px solid #e7efed;padding:14px 0}',
'.readiness-group h3{display:flex;justify-content:space-between;gap:12px;font-weight:850;font-size:14px;margin:0 0 9px}',
'.readiness-group h3 span{color:#077b6f}',
'.readiness-check{display:grid;grid-template-columns:68px minmax(0,1fr);gap:9px;margin:9px 0}',
'.readiness-check .state{font-size:12px;color:#657c80}',
'.readiness-check .state.met{color:#087969}.readiness-check .state.partial{color:#916918}',
'.readiness-check b{display:block;font-size:12.5px;color:#34545b}',
'.readiness-check p{font-size:12px;line-height:1.5;color:#667e82;margin:3px 0}',
'.readiness-check a{font-size:12px;color:#08776b}',
'.readiness-method .method-footer{font-size:12px;line-height:1.7;color:#60787c}',
'@media(max-width:760px){.readiness-inspector .inspector-checks{grid-template-columns:1fr}}',
'@media(max-width:575.98px){.readiness-summary{grid-template-columns:1fr;gap:9px;margin:18px 0 13px}.readiness-total{padding:12px 15px}.readiness-total .head span{font-size:13px}.readiness-total .head strong{font-size:26px}.kimse-primary-choice[data-readiness-key] .readiness-card-trigger{padding:7px 5px 31px}.kimse-primary-choice[data-readiness-key] .readiness-card-trigger .kimse-primary-icon{width:39px;height:39px;border-radius:11px;margin-bottom:7px}.kimse-primary-choice[data-readiness-key] .readiness-card-trigger .kimse-primary-icon .ti{font-size:22px}.kimse-primary-choice[data-readiness-key] .readiness-card-trigger .kimse-primary-title{font-size:.88rem;line-height:1.16}.kimse-primary-choice[data-readiness-key] .readiness-card-trigger .kimse-primary-en{font-size:.50rem;line-height:1.1;margin-top:4px}.kimse-primary-choice[data-readiness-key] .readiness-number{font-size:26px;margin-top:7px}.kimse-primary-choice[data-readiness-key] .readiness-count{font-size:10px;margin-top:2px}.kimse-primary-choice[data-readiness-key] .readiness-card-link{font-size:10px;padding:6px 9px;bottom:5px}.readiness-inspector{padding:16px 15px}.readiness-inspector h3{font-size:19px}.readiness-inspector .inspector-percent{font-size:29px}.readiness-method summary{padding:12px 14px}.readiness-method-body{padding:0 13px 14px}}',
'@media(max-width:380px){.kimse-primary-choice[data-readiness-key] .readiness-card-trigger .kimse-primary-en{display:none}.kimse-primary-choice[data-readiness-key] .readiness-card-trigger .kimse-primary-icon{margin-bottom:5px}.kimse-primary-choice[data-readiness-key] .readiness-number{margin-top:5px}}',
'@media(prefers-reduced-motion:reduce){.readiness-total .bar,.kimse-primary-choice[data-readiness-key] .readiness-fill{transition:none}}'
].join('');
st.textContent += '.kimse-primary-choice[data-readiness-key] .readiness-tap-hint{display:block;margin-top:7px;color:#12695f;font-size:11px;font-weight:700;line-height:1.1}@media(max-width:575.98px){.kimse-primary-choice[data-readiness-key] .readiness-card-trigger .kimse-primary-icon{display:none!important}.kimse-primary-choice[data-readiness-key] .readiness-tap-hint{font-size:9.5px;margin-top:3px}}';
document.head.append(st);
function el(tag,txt,cls){const e=document.createElement(tag);if(txt!==null&&txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e;}
const summary=el('section',null,'readiness-summary');summary.setAttribute('aria-label','근거 충족도 요약');
function makeMetric(label,description){
 const box=el('div',null,'readiness-total'),head=el('div',null,'head');
 const num=el('strong','—'),bar=el('div',null,'track'),fill=el('span',null,'bar');
 bar.append(fill);head.append(el('span',label),num);
 box.append(head,bar,el('p',description));summary.append(box);return {num,fill};
}
const use=makeMetric('실사용 공개 근거 준비도','사용자 검증 외 6개 영역의 증빙 확보 정도');
const investment=makeMetric('투자 설명 근거 준비도','6개 영역 65% + 사용자 검증 35%');
hub.querySelector('.kimse-primary-head').after(summary);
summary.after(el('p','각 숫자는 문서·구현·검증 자료의 확보 정도입니다. 출시 승인·임상 성능·투자 가능성을 뜻하지 않습니다.','readiness-disclaimer'));
const inspector=el('section',null,'readiness-inspector');inspector.id='readiness-selected-detail';inspector.hidden=true;inspector.setAttribute('aria-live','polite');
const method=el('details',null,'readiness-method');method.id='readiness-method';method.append(el('summary','전체 35개 점검 항목과 계산 기준'));const methodBody=el('div',null,'readiness-method-body');method.append(methodBody);
grid.after(inspector,method);
let selected=null,categories=new Map(),links=new Map(),totals=new Map();
const label={met:'확인',partial:'일부 확인',missing:'미확인'};
function renderInspect(key,scroll){
 const c=categories.get(key),score=totals.get(key);if(!c)return;
 const prior=selected;
 if(prior){const old=grid.querySelector('[data-readiness-key="'+prior+'"]');if(old){old.classList.remove('readiness-active');old.querySelector('button.readiness-card-trigger').setAttribute('aria-expanded','false');}}
 if(prior===key){selected=null;inspector.hidden=true;return;}
 selected=key;const card=grid.querySelector('[data-readiness-key="'+key+'"]');card.classList.add('readiness-active');card.querySelector('button.readiness-card-trigger').setAttribute('aria-expanded','true');
 inspector.replaceChildren();inspector.hidden=false;
 const header=el('div',null,'inspector-head'),titleBox=el('div');titleBox.append(el('span','AREA CHECKLIST / '+c.checks.length+' ITEMS','inspector-eyebrow'),el('h3',c.title));
 const close=el('button','×','inspector-close');close.type='button';close.setAttribute('aria-label','점수 상세 닫기');close.addEventListener('click',()=>{renderInspect(key,false);card.querySelector('button.readiness-card-trigger').focus();});
 header.append(titleBox,close);
 const meta=el('div',null,'inspector-meta');
 const ok=c.checks.filter(x=>x.status==='met').length,partial=c.checks.filter(x=>x.status==='partial').length,remaining=c.checks.length-ok;
 meta.append(el('strong',score+'%','inspector-percent'),el('p','확인 '+ok+'개 · 일부 확인 '+partial+'개 · 남은 검증 '+remaining+'개'));
 const checks=el('div',null,'inspector-checks');
 // The highest-priority remaining work is displayed first.
 const sorted=c.checks.slice().sort((a,b)=>({missing:0,partial:1,met:2}[a.status]-({missing:0,partial:1,met:2}[b.status])));
 for(const item of sorted){
  const tile=el('article',null,'inspector-check'+(item.status!=='met'?' is-next':''));
  tile.append(el('span',(item.status==='met'?'✓ ':item.status==='partial'?'◐ ':'○ ')+label[item.status],'mark '+item.status),el('b',item.label),el('p',item.why));checks.append(tile);
 }
 const actions=el('div',null,'inspector-actions');
 actions.append(el('span','확인 근거는 점수 파일의 점검일 기준입니다.','inspector-hint'));
 const a=el('a','해당 Evidence 페이지 열기 ↗','inspector-page-link');a.href=links.get(key);actions.append(a);
 inspector.append(header,meta,checks,actions);
 if(scroll)inspector.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
function build(data){
 if(!data||!Array.isArray(data.categories)||data.categories.length!==7)throw Error('invalid readiness categories');
 const rules=data.scoreRules;
 for(const c of data.categories){
  if(!c.checks||c.checks.length!==5||categories.has(c.key))throw Error('invalid checklist');
  const score=c.checks.reduce((total,x)=>{if(!Object.prototype.hasOwnProperty.call(rules,x.status))throw Error('invalid status');return total+rules[x.status];},0);
  if(score<0||score>100)throw Error('invalid progress');
  const card=grid.querySelector('[data-readiness-key="'+c.key+'"]');if(!card)throw Error('missing '+c.key);
  const button=card.querySelector('.readiness-card-trigger');if(!button)throw Error('missing trigger');
  const link=card.querySelector('a.readiness-card-link');if(!link)throw Error('missing destination');
  links.set(c.key,link.href);categories.set(c.key,c);totals.set(c.key,score);
  const fill=el('span',null,'readiness-fill'+(score===0?' is-zero':''));fill.setAttribute('aria-hidden','true');fill.style.height='0%';
  card.prepend(fill);
  const ok=c.checks.filter(x=>x.status==='met').length,remaining=c.checks.length-ok;
  button.append(el('strong',score+'%','readiness-number'),el('span','확인 '+ok+'개 · 남은 '+remaining+'개','readiness-count'),el('span','눌러서 확인 ↓','readiness-tap-hint'));
  button.setAttribute('aria-label',c.title+' 근거 충족도 '+score+'퍼센트 · 눌러서 검증 항목 보기');
  button.addEventListener('click',()=>renderInspect(c.key,true));
  requestAnimationFrame(()=>{fill.style.height=score+'%';});
  const group=el('section',null,'readiness-group'),title=el('h3');title.append(el('span',c.title),el('span',score+'%'));group.append(title);
  for(const item of c.checks){
   const row=el('div',null,'readiness-check');row.append(el('span',label[item.status],'state '+item.status));
   const content=el('div');content.append(el('b',item.label),el('p',item.why));
   if(item.link&&/^\.\/[-a-zA-Z0-9./]+$/.test(item.link)){const url=el('a','근거 페이지 ↗');url.href=item.link;content.append(url);}
   row.append(content);group.append(row);
  }
  methodBody.append(group);
 }
 const keys=data.summary.publicKeys;if(!Array.isArray(keys)||keys.length!==6||!keys.every(x=>totals.has(x)))throw Error('invalid public set');
 const pub=Math.round(keys.reduce((s,x)=>s+totals.get(x),0)/6);
 const w=data.summary.investment,inv=Math.round(pub*w.publicWeight+totals.get('users')*w.userWeight);
 use.num.textContent=pub+'%';use.fill.style.width=pub+'%';
 investment.num.textContent=inv+'%';investment.fill.style.width=inv+'%';
 methodBody.append(el('p','확인 20점 · 일부 확인 10점 · 미확인 0점. 영역마다 5개 항목입니다. '+data.summary.disclaimer+' · 기준일 '+data.reviewedAt,'method-footer'));
}
fetch('./evidence-readiness-data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('readiness unavailable');return r.json();}).then(build).catch(()=>{
 use.num.textContent='확인 불가';investment.num.textContent='확인 불가';
 methodBody.append(el('p','근거 점수 파일을 확인하지 못해 점수를 표시하지 않습니다.','method-footer'));
});
})();