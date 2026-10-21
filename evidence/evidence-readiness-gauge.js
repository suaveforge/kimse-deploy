(function(){
'use strict';
if(document.body.getAttribute('data-evidence-page')!=='menu')return;
const hub=document.getElementById('evidence-home'),grid=hub&&hub.querySelector('.kimse-primary-grid');
if(!grid)return;
const css=[
'.readiness-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:24px 0 14px}',
'.readiness-total{background:#fff;border:1px solid #d8e8e4;border-radius:14px;padding:17px 19px;min-width:0}',
'.readiness-total .readiness-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px}',
'.readiness-total .readiness-head span{font-size:15px;font-weight:800;color:#254e52}',
'.readiness-total .readiness-head strong{font-size:32px;line-height:1.15;letter-spacing:-.045em;font-variant-numeric:tabular-nums;color:#006f63}',
'.readiness-total .readiness-track{height:7px;overflow:hidden;background:#e5f0ed;border-radius:12px;margin:10px 0 9px}',
'.readiness-total .readiness-bar{display:block;width:0;height:100%;background:linear-gradient(90deg,#62c6b5,#078574);border-radius:12px;transition:width .7s ease}',
'.readiness-total p{font-size:12px;line-height:1.55;color:#607780;margin:0}',
'.readiness-disclaimer{font-size:12px;color:#667e82;line-height:1.6;margin:0 0 17px;text-align:center}',
'.kimse-primary-choice[data-readiness-key]{position:relative;isolation:isolate;overflow:hidden;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 7px 22px rgba(18,70,66,.065);transition:border-color .2s,box-shadow .2s,transform .2s}',
'.kimse-primary-choice[data-readiness-key]:hover{transform:translateY(-3px);border-color:#77c1b4;box-shadow:0 12px 31px rgba(18,99,84,.14)}',
'.kimse-primary-choice[data-readiness-key]:focus-visible{outline:3px solid #068a79;outline-offset:3px}',
'.kimse-primary-choice[data-readiness-key] .readiness-liquid{position:absolute;z-index:0;left:0;right:0;bottom:0;width:100%;height:0;pointer-events:none;transition:height 1.55s cubic-bezier(.16,.72,.19,1)}',
'.kimse-primary-choice[data-readiness-key] .readiness-liquid-base{position:absolute;z-index:0;top:10px;bottom:0;left:0;right:0;background:linear-gradient(180deg,rgba(63,188,160,.29) 0%,rgba(11,157,135,.34) 70%,rgba(0,139,118,.40) 100%)}',
'.kimse-primary-choice[data-readiness-key] .readiness-liquid-wave{position:absolute;z-index:1;top:-5px;left:0;width:200%;height:24px;max-width:none;display:block;will-change:transform;animation:kimse-wave-slide 5.8s linear infinite}',
'.kimse-primary-choice[data-readiness-key] .readiness-liquid-wave.wave-second{z-index:2;opacity:.62;top:-3px;animation-duration:8.1s;animation-direction:reverse}',
'.kimse-primary-choice[data-readiness-key] .readiness-liquid.is-zero{display:none}',
'.kimse-primary-choice[data-readiness-key] .readiness-liquid.is-full .readiness-liquid-base{top:0}',
'.kimse-primary-choice[data-readiness-key] .readiness-liquid.is-full .readiness-liquid-wave{display:none}',
'@keyframes kimse-wave-slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
'.kimse-primary-choice[data-readiness-key]>.kimse-primary-icon,.kimse-primary-choice[data-readiness-key]>.kimse-primary-copy{position:relative;z-index:3;pointer-events:none}',
'.kimse-primary-choice[data-readiness-key]>.kimse-primary-icon{margin-bottom:17px;background:rgba(255,255,255,.74)}',
'.kimse-primary-choice[data-readiness-key]>.kimse-primary-copy{transform:none}',
'.kimse-primary-choice[data-readiness-key] .readiness-gauge-value{position:relative;z-index:3;display:block;margin-top:18px;font-size:43px;font-weight:900;line-height:1;letter-spacing:-.06em;font-variant-numeric:tabular-nums;color:#075e55;text-shadow:0 1px 0 rgba(255,255,255,.20)}',
'.kimse-primary-choice[data-readiness-key] .readiness-gauge-count{position:relative;z-index:3;margin-top:6px;font-size:12px;font-weight:750;color:#315e59}',
'.kimse-primary-choice[data-readiness-key] .readiness-gauge-linkhint{position:relative;z-index:3;margin-top:11px;font-size:11px;font-weight:750;color:#1a776a;opacity:.88}',
'.readiness-method{border:1px solid #deeae7;border-radius:13px;background:#fff;margin-top:18px;overflow:hidden}',
'.readiness-method summary{font-size:14px;font-weight:750;color:#35575c;cursor:pointer;padding:16px 20px}',
'.readiness-method-body{padding:0 20px 18px}',
'.readiness-group{padding:15px 0;border-top:1px solid #e3eeeb}',
'.readiness-group h3{display:flex;justify-content:space-between;gap:10px;margin:0 0 10px;font-size:15px;font-weight:850}',
'.readiness-group h3 span{color:#078376;font-variant-numeric:tabular-nums}',
'.readiness-check{display:grid;grid-template-columns:70px minmax(0,1fr);gap:8px;margin:9px 0;line-height:1.5}',
'.readiness-check .state{font-size:12px;color:#637b81}.readiness-check .state.met{color:#078274}.readiness-check .state.partial{color:#986919}',
'.readiness-check b{display:block;font-size:12.5px;color:#35545e}',
'.readiness-check p{font-size:12px;color:#637b83;line-height:1.6;margin:3px 0}',
'.readiness-check a{font-size:12px;color:#087c70}',
'.readiness-method .method-footer{font-size:12px;color:#627b83;line-height:1.8}',
'@media(max-width:991.98px){.kimse-primary-choice[data-readiness-key]>.kimse-primary-icon{margin-bottom:12px}.kimse-primary-choice[data-readiness-key] .readiness-gauge-value{margin-top:14px;font-size:37px}}',
'@media(max-width:575.98px){.readiness-summary{grid-template-columns:1fr;margin:18px 0 14px;gap:9px}.readiness-total{padding:12px 15px}.readiness-total .readiness-head span{font-size:13px}.readiness-total .readiness-head strong{font-size:25px}.kimse-primary-choice[data-readiness-key]{padding:9px 5px!important}.kimse-primary-choice[data-readiness-key]>.kimse-primary-icon{width:43px;height:43px;border-radius:12px;margin-bottom:7px}.kimse-primary-choice[data-readiness-key]>.kimse-primary-icon .ti{font-size:23px}.kimse-primary-choice[data-readiness-key] .kimse-primary-title{font-size:.88rem;line-height:1.15}.kimse-primary-choice[data-readiness-key] .kimse-primary-en{font-size:.51rem;margin-top:4px}.kimse-primary-choice[data-readiness-key] .readiness-gauge-value{font-size:28px;margin-top:8px}.kimse-primary-choice[data-readiness-key] .readiness-gauge-count{font-size:10px;margin-top:3px}.kimse-primary-choice[data-readiness-key] .readiness-gauge-linkhint{font-size:9.5px;margin-top:5px}.readiness-method summary{padding:13px 14px}.readiness-method-body{padding:0 14px 14px}.readiness-check{grid-template-columns:60px minmax(0,1fr)}}',
'@media(max-width:380px){.kimse-primary-choice[data-readiness-key]>.kimse-primary-icon{display:none}.kimse-primary-choice[data-readiness-key] .readiness-gauge-value{margin-top:7px;font-size:27px}.kimse-primary-choice[data-readiness-key] .readiness-gauge-linkhint{margin-top:3px}}',
'@media(prefers-reduced-motion:reduce){.readiness-total .readiness-bar,.kimse-primary-choice[data-readiness-key] .readiness-liquid{transition:none!important}.kimse-primary-choice[data-readiness-key] .readiness-liquid-wave{animation:none!important;will-change:auto}.kimse-primary-choice[data-readiness-key]:hover{transform:none}}'
].join('');
const sheet=document.createElement('style');sheet.textContent=css;document.head.append(sheet);
function el(tag,text,cls){const x=document.createElement(tag);if(text!==null&&text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;}
const summary=el('div',null,'readiness-summary');summary.setAttribute('aria-label','근거 충족도 요약');
function meter(title,note){
 const box=el('section',null,'readiness-total'),head=el('div',null,'readiness-head');
 const number=el('strong','—'),track=el('div',null,'readiness-track'),bar=el('span',null,'readiness-bar');
 head.append(el('span',title),number);track.append(bar);box.append(head,track,el('p',note));summary.append(box);return {number,bar};
}
const publicMeter=meter('실사용 공개 근거 준비도','사용자 검증 제외 6개 영역의 증빙 확보 정도');
const investorMeter=meter('투자 설명 근거 준비도','6개 영역 65% + 사용자 검증 35%');
hub.querySelector('.kimse-primary-head').after(summary);
summary.after(el('p','현재 점수는 문서·구현·검증 자료 충족도이며 제품 출시 승인, 의료 유효성, 투자 성사 가능성을 뜻하지 않습니다.','readiness-disclaimer'));
const detail=el('details',null,'readiness-method');detail.id='readiness-method';
detail.append(el('summary','전체 35개 점검 항목과 점수 계산 기준'));
const methodBody=el('div',null,'readiness-method-body');detail.append(methodBody);grid.after(detail);
const labels={met:'확인',partial:'일부 확인',missing:'미확인'};
const SVG='http://www.w3.org/2000/svg';
function waterWave(cls,path,color){
 const svg=document.createElementNS(SVG,'svg');svg.setAttribute('viewBox','0 0 400 24');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.classList.add('readiness-liquid-wave',cls);
 const p=document.createElementNS(SVG,'path');p.setAttribute('d',path);p.setAttribute('fill',color);svg.append(p);return svg;
}
const waveFront='M0 11 Q25 1 50 11 T100 11 T150 11 T200 11 T250 11 T300 11 T350 11 T400 11 V24 H0 Z';
const waveBack='M0 11 Q25 18 50 11 T100 11 T150 11 T200 11 T250 11 T300 11 T350 11 T400 11 V24 H0 Z';
function waterLevel(card,percent){
 const fluid=el('div',null,'readiness-liquid'+(percent===0?' is-zero':percent===100?' is-full':''));
 fluid.setAttribute('aria-hidden','true');
 fluid.append(el('span',null,'readiness-liquid-base'),waterWave('wave-first',waveFront,'rgba(55,181,158,.48)'),waterWave('wave-second',waveBack,'rgba(121,223,200,.62)'));
 card.prepend(fluid);
 const rise=()=>{fluid.style.height=percent+'%';};
 if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)rise();
 else requestAnimationFrame(()=>requestAnimationFrame(rise));
}
function fillMethod(c,score){
 const section=el('section',null,'readiness-group'),head=el('h3');
 head.append(el('span',c.title),el('span',score+'%'));section.append(head);
 for(const item of c.checks){
  const row=el('div',null,'readiness-check'),description=el('div');
  row.append(el('span',labels[item.status],'state '+item.status));
  description.append(el('b',item.label),el('p',item.why));
  if(item.link&&/^\.\/[-a-zA-Z0-9./]+$/.test(item.link)){const a=el('a','관련 Evidence ↗');a.href=item.link;description.append(a);}
  row.append(description);section.append(row);
 }
 methodBody.append(section);
}
function render(reg){
 if(!reg||!Array.isArray(reg.categories)||reg.categories.length!==7)throw Error('invalid categories');
 const scores={},statuses=reg.scoreRules;
 for(const c of reg.categories){
  if(!Array.isArray(c.checks)||c.checks.length!==5||scores[c.key]!==undefined)throw Error('invalid checklist');
  const score=c.checks.reduce((sum,i)=>{if(!Object.prototype.hasOwnProperty.call(statuses,i.status))throw Error('invalid status');return sum+statuses[i.status];},0);
  if(score<0||score>100)throw Error('invalid score');
  const card=grid.querySelector('[data-readiness-key="'+c.key+'"]');
  if(!card||card.tagName!=='A')throw Error('card navigation mismatch');
  waterLevel(card,score);
  const known=c.checks.filter(x=>x.status==='met').length;
  card.append(el('strong',score+'%','readiness-gauge-value'),el('span','확인 '+known+'개 · 남은 '+(5-known)+'개','readiness-gauge-count'),el('span','근거 살펴보기 ↗','readiness-gauge-linkhint'));
  card.setAttribute('aria-label',c.title+', 근거 충족 '+score+'퍼센트, 상세 페이지 열기');
  fillMethod(c,score);scores[c.key]=score;
 }
 const ipCard=grid.querySelector('[data-readiness-key="patents"]');
 if(ipCard){
  ipCard.append(el('strong','현황','readiness-gauge-value'),el('span','기능별 검토·출원 확인 상태','readiness-gauge-count'),el('span','권리화 목록 보기 ↗','readiness-gauge-linkhint'));
  ipCard.setAttribute('aria-label','특허·지식재산, 기능별 권리화 검토 및 출원·등록 확인 상태');
 }
 const keys=reg.summary.publicKeys;
 if(!Array.isArray(keys)||keys.length!==6||!keys.every(k=>typeof scores[k]==='number'))throw Error('summary scope');
 const publicScore=Math.round(keys.reduce((sum,k)=>sum+scores[k],0)/keys.length);
 const weights=reg.summary.investment,investorScore=Math.round(publicScore*weights.publicWeight+scores.users*weights.userWeight);
 publicMeter.number.textContent=publicScore+'%';publicMeter.bar.style.width=publicScore+'%';
 investorMeter.number.textContent=investorScore+'%';investorMeter.bar.style.width=investorScore+'%';
 methodBody.append(el('p','확인 '+statuses.met+'점 · 일부 확인 '+statuses.partial+'점 · 미확인 '+statuses.missing+'점. 각 영역 5개 항목으로 평가. '+reg.summary.disclaimer+' · 점검일 '+reg.reviewedAt,'method-footer'));
}
fetch('./evidence-readiness-data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('registry unavailable');return r.json();}).then(render).catch(()=>{
 publicMeter.number.textContent='확인 불가';investorMeter.number.textContent='확인 불가';
 methodBody.append(el('p','근거 점수 자료를 불러올 수 없어 수치를 표시하지 않습니다.','method-footer'));
});
})();