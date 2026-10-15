(function(){
'use strict';
if(document.body.dataset.evidencePage!=='menu')return;
const hub=document.getElementById('evidence-home'),grid=hub&&hub.querySelector('.kimse-primary-grid');
if(!grid)return;
const style=document.createElement('style');
style.textContent=
'.readiness-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:25px 0 17px}'+
'.readiness-total{border:1px solid #dce9e7;background:white;border-radius:14px;padding:16px 19px}'+
'.readiness-total .head{display:flex;justify-content:space-between;align-items:baseline;gap:9px}'+
'.readiness-total .head span{font-size:15px;font-weight:850;color:#244b54}'+
'.readiness-total .head strong{font-size:32px;line-height:1.2;letter-spacing:-.035em;color:#087b70;font-variant-numeric:tabular-nums}'+
'.readiness-total .track{height:6px;border-radius:6px;background:#e7f1ef;overflow:hidden;margin:9px 0 10px}'+
'.readiness-total .bar{display:block;height:100%;width:0;background:linear-gradient(90deg,#6acaaf,#038c7a);transition:width .6s ease}'+
'.readiness-total p{font-size:12px;color:#5c7880;line-height:1.55;margin:0}'+
'.readiness-disclaimer{font-size:12px;color:#687e88;line-height:1.65;margin:0 0 17px;text-align:center}'+
'.kimse-primary-choice[data-readiness-key]{position:relative;isolation:isolate;overflow:hidden;padding-bottom:54px}'+
'.kimse-primary-choice[data-readiness-key] .readiness-fill{position:absolute;z-index:-1;left:0;right:0;bottom:0;height:0;background:linear-gradient(0deg,rgba(9,161,138,.20),rgba(105,211,193,.13));border-top:1px solid rgba(4,141,125,.19);pointer-events:none;transition:height .8s ease}'+
'.kimse-primary-choice[data-readiness-key] .readiness-fill.is-zero{border-top:0}'+
'.kimse-primary-choice[data-readiness-key] .kimse-primary-icon,.kimse-primary-choice[data-readiness-key] .kimse-primary-copy{position:relative;z-index:1}'+
'.kimse-primary-choice[data-readiness-key] .kimse-primary-copy{transform:translateY(-4px)}'+
'.kimse-primary-choice[data-readiness-key] .readiness-value{position:absolute;z-index:2;bottom:14px;left:4px;right:4px;display:flex;align-items:baseline;justify-content:center;gap:7px}'+
'.readiness-value strong{font-size:29px;color:#087c71;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.045em}'+
'.readiness-value span{font-size:10.5px;color:#426f6b;font-weight:800}'+
'.readiness-method{background:white;border:1px solid #dde9e7;border-radius:13px;margin-top:15px;overflow:hidden}'+
'.readiness-method summary{cursor:pointer;padding:16px 20px;font-size:14px;color:#31545b;font-weight:850}'+
'.readiness-method-body{padding:0 20px 20px}'+
'.readiness-group{padding:14px 0;border-top:1px solid #e4eeec}'+
'.readiness-group h3{display:flex;justify-content:space-between;gap:12px;margin:0 0 10px;font-size:15px;font-weight:850}'+
'.readiness-group h3 span{font-variant-numeric:tabular-nums;color:#087c71}'+
'.readiness-check{display:grid;grid-template-columns:72px minmax(0,1fr);gap:8px;margin:8px 0;line-height:1.5}'+
'.readiness-check .state{font-size:12px;color:#536a75}.readiness-check .state.met{color:#087c71}.readiness-check .state.partial{color:#886017}'+
'.readiness-check b{display:block;font-size:12.5px;color:#355560}.readiness-check p{font-size:12px;margin:2px 0;color:#5c7682}'+
'.readiness-check a{font-size:12px;color:#047e70}'+
'.readiness-method .method-footer{color:#617985;font-size:12px;line-height:1.8}'+
'@media(max-width:575.98px){.readiness-summary{grid-template-columns:1fr;gap:9px;margin:18px 0 14px}.readiness-total{padding:12px 15px}.readiness-total .head span{font-size:13px}.readiness-total .head strong{font-size:25px}.kimse-primary-choice[data-readiness-key]{padding-bottom:40px}.kimse-primary-choice[data-readiness-key] .readiness-value{bottom:8px;gap:4px}.readiness-value strong{font-size:21px}.readiness-value span{font-size:9px}.readiness-check{grid-template-columns:60px minmax(0,1fr)}.readiness-method-body{padding:0 13px 15px}}'+
'@media(prefers-reduced-motion:reduce){.readiness-total .bar,.kimse-primary-choice[data-readiness-key] .readiness-fill{transition:none}}';
document.head.append(style);
function node(tag,txt,cls){
 const e=document.createElement(tag);if(txt!==null)e.textContent=txt;if(cls)e.className=cls;return e;
}
const totals=node('div',null,'readiness-summary');totals.setAttribute('aria-label','근거 준비도 점수');
function metric(label,description){
 const root=node('section',null,'readiness-total'),h=node('div',null,'head');
 const name=node('span',label),num=node('strong','—');
 const track=node('div',null,'track'),bar=node('i',null,'bar');
 bar.setAttribute('aria-hidden','true');track.append(bar);h.append(name,num);
 root.append(h,track,node('p',description));totals.append(root);return {num,bar};
}
const real=metric('실사용 공개 근거 준비도','사용자 검증 제외 6개 영역의 증빙 항목 평균');
const investor=metric('투자 설명 근거 준비도','앞의 6개 영역 65% + 사용자 검증 35%');
hub.querySelector('.kimse-primary-head').after(totals);
const disclaimer=node('p','카드의 비율은 근거 확보·검증 항목의 자체 점검 결과입니다. 제품 출시 승인, 의료 유효성, 투자 성사 확률과는 다릅니다.','readiness-disclaimer');
totals.after(disclaimer);
const details=node('details',null,'readiness-method');details.id='readiness-method';
details.append(node('summary','7개 영역의 점수 계산 기준 · 남은 과제 보기'));
const body=node('div',null,'readiness-method-body');details.append(body);grid.after(details);
function progress(m,value){m.num.textContent=value+'%';m.bar.style.width=value+'%';}
const stateText={met:'확인',partial:'일부 확인',missing:'미확인'};
function render(data){
 if(!data||!Array.isArray(data.categories)||data.categories.length!==7)throw Error('bad readiness data');
 const scores={};
 for(const c of data.categories){
  if(!Array.isArray(c.checks)||c.checks.length!==5)throw Error('bad checks');
  const score=c.checks.reduce((a,x)=>{if(!Object.prototype.hasOwnProperty.call(data.scoreRules,x.status))throw Error('bad status');return a+data.scoreRules[x.status];},0);
  if(scores[c.key]!==undefined||score<0||score>100)throw Error('bad score');
  scores[c.key]=score;
  const card=grid.querySelector('[data-readiness-key="'+c.key+'"]');
  if(!card)throw Error('missing menu card');
  const fill=node('span',null,'readiness-fill'+(score===0?' is-zero':''));
  fill.setAttribute('aria-hidden','true');fill.style.height=score+'%';card.prepend(fill);
  const val=node('span',null,'readiness-value');
  val.append(node('strong',score+'%'),node('span',String(score/20)+'/5 항목'));card.append(val);
  card.setAttribute('aria-label',c.title+' · 근거 충족도 '+score+'퍼센트 · 페이지 열기');
  const group=node('section',null,'readiness-group'),head=node('h3',null);
  head.append(node('span',c.title),node('span',score+'%'));group.append(head);
  for(const item of c.checks){
   const row=node('div',null,'readiness-check');
   row.append(node('span',stateText[item.status],'state '+item.status));
   const content=node('div',null);content.append(node('b',item.label),node('p',item.why));
   if(item.link&&/^\.\/[-a-zA-Z0-9./]+$/.test(item.link)){
    const anchor=node('a','관련 Evidence ↗');anchor.href=item.link;content.append(anchor);
   }
   row.append(content);group.append(row);
  }
  body.append(group);
 }
 const keys=data.summary.publicKeys;
 if(keys.length!==6||!keys.every(k=>typeof scores[k]==='number'))throw Error('bad summary');
 const pub=Math.round(keys.reduce((s,k)=>s+scores[k],0)/keys.length);
 const w=data.summary.investment,inv=Math.round(pub*w.publicWeight+scores.users*w.userWeight);
 progress(real,pub);progress(investor,inv);
 body.append(node('p','계산: 확인 '+data.scoreRules.met+'점, 일부 확인 '+data.scoreRules.partial+'점, 미확인 '+data.scoreRules.missing+'점. 영역마다 5항목입니다. 실사용 공개 근거는 사용자 검증을 제외한 6개 영역의 산술평균이며, 투자 설명 근거는 그 평균에 65%·사용자 검증에 35%를 적용합니다. '+data.summary.disclaimer+' · 점검일 '+data.reviewedAt,'method-footer'));
}
fetch('./evidence-readiness-data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('fetch failed');return r.json();}).then(render).catch(()=>{
 real.num.textContent='확인 불가';investor.num.textContent='확인 불가';
 body.append(node('p','산식 자료를 불러오지 못해 점수를 표시하지 않습니다.','method-footer'));
});
})();