/* KIMSE Clinical Template Lab.
 * All layout uses upstream Tabler dashboard classes; chart views reuse Apache
 * ECharts official line/dataZoom, heatmap and horizontal bar chart patterns.
 * The ONLY data source in this public sandbox is a fixed synthetic JSON fixture.
 * DO NOT add authenticated patients or real clinical data to this page.
 */
(function(){'use strict';
  const qs=id=>document.getElementById(id);
  const error=(message)=>{const el=qs('selectionStatus');if(el){el.textContent=message;el.classList.add('text-danger')}};
  const status=message=>{const el=qs('selectionStatus');if(el)el.textContent=message};
  const make=(name,cls,text)=>{const x=document.createElement(name);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x};
  const day=ms=>new Date(ms).toISOString().slice(0,10);
  const pct=n=>Number.isFinite(n)?(n>0?'+':'')+(n*100).toFixed(1)+'%':'자료 없음';
  const charts=[];
  let selectedSubset=null;
  const raw=(value,unit)=>value===undefined||value===null?'미수집':Number(value).toLocaleString('ko-KR',{maximumFractionDigits:2})+' '+unit;
  const COVERAGE_LABELS={function:'일상기능',risk_confounders:'약물·질병 이력',professional:'전문검사',onset_trajectory:'변화 관찰일',cognition:'인지 관련 자료',informant:'보호자 정보'};
  const optionColor=['#206bc4','#4299e1','#2fb344','#f59f00','#ae3ec9','#d63939'];
  async function load(url){
    const response=await fetch(url,{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw Error('FIXTURE_LOAD_'+response.status);
    return response.json();
  }
  function getSelectedReport(report,days){
    const ms=Date.parse(report.report_context.window_end+'T00:00:00Z');
    const earliest=day(ms-(days-1)*86400000);
    const latest=report.report_context.window_end;
    const metrics=report.monitoring.metrics.map(m=>({
      ...m,series:m.series.filter(p=>p.day>=earliest&&p.day<=latest)
    }));
    return {earliest,latest,days,metrics};
  }
  function listControls(registry){
    const country=qs('country'), inst=qs('institution');
    registry.regions.forEach(r=>{const x=make('option','',r.label);x.value=r.code;country.append(x)});
    country.value='KR';
    const updateInstitutions=()=>{
      inst.replaceChildren();
      const all=make('option','','국가 공통 후보 · 기관 미선택');all.value='';inst.append(all);
      registry.institutions.filter(i=>i.country===country.value).forEach(i=>{const x=make('option','',i.name+' · 승인되지 않음');x.value=i.id;inst.append(x)});
    };
    updateInstitutions();
    return {updateInstitutions};
  }
  function renderProfile(registry,report){
    const profile=window.KIMSE_CLINICAL_PROFILES.resolve(registry,report,{
      country:qs('country').value,institutionId:qs('institution').value
    });
    qs('profileNote').textContent=profile.profile_note;
    status(profile.profile_label+(profile.institution?' · '+profile.institution.name:'')+' · 공개 근거 기반 화면 후보, 의료진 승인 없음');
    const list=qs('fieldList');list.replaceChildren();
    profile.sections.slice(0,10).forEach((f,i)=>{
      const item=make('div','list-group-item px-0 py-2');
      const head=make('div','d-flex justify-content-between align-items-start gap-2');
      head.append(make('span','fw-semibold',String(i+1).padStart(2,'0')+' · '+f.label));
      const badge=make('span','badge '+(f.availability==='available'?'bg-blue-lt':'bg-secondary-lt'),f.availability==='available'?'합성값 있음':'미수집');
      head.append(badge);
      item.append(head,make('div','small text-secondary mt-1',f.guard));list.append(item);
    });
    const sourceList=qs('sourceList');sourceList.replaceChildren();
    profile.sources.forEach(s=>{
      const box=make('div','mb-3 pb-2 border-bottom');
      const link=make('a','fw-semibold',s.issuer+' · '+s.id);link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';
      box.append(link,make('div','text-secondary small mt-1',s.scope));
      sourceList.append(box);
    });
    if(profile.institution){
      const info=make('div','alert alert-warning small','이 기관은 공개 의뢰 안내 조사 대상일 뿐 KIMSE 전용 필드·전송 경로·접수 승인 상태가 아닙니다.');
      const form=make('a','d-block mt-2 fw-semibold','해당 기관의 공식 공개 안내·의뢰양식 열기');
      form.href=profile.institution.source;form.target='_blank';form.rel='noopener noreferrer';
      info.append(form);
      sourceList.prepend(info);
    }
    return profile;
  }
  // Tabler's published list-group component, not a new infographic.
  // Grouping preserves the exact recorded public source descriptions; no "met"
  // flags, clinical score, provider verification or electronic routing is inferred.
  function renderHospitalRequirements(crosswalk,country,institutionId){
    const root=qs('hospitalRequirements'),message=qs('requirementsExplanation');
    root.replaceChildren();
    const row=crosswalk.entries.find(item=>item.id===institutionId&&item.country===country);
    if(!row){
      message.textContent='국가 공통 표시 후보입니다. 공개 의료기관을 선택해야 그 기관의 조사된 원문 요건과 추가 확인자료를 볼 수 있습니다.';
      root.append(make('div','list-group-item text-secondary','병원 미선택 · 승인된 제출 프로파일 없음'));
      return;
    }
    if(row.approval_status==='APPROVED'||crosswalk.policy.verified_receivers!==0)throw Error('PUBLIC_FORM_APPROVAL_STATE_CONFLICT');
    message.textContent='공식 공개자료 조사 '+row.requirement_groups.length+'개 항목/그룹입니다. 아래 내용은 필수항목의 승인된 체크리스트가 아니며, KIMSE 데이터만으로 서류·전문검사를 대신하지 못합니다.';
    for(const [index,item] of row.requirement_groups.entries()){
      const isExternal=/EXTERNAL|AUTHORIZED|APPROVED_CHANNEL|PARTNER_APPROVAL|NOT_YET_SUPPORTED|INSTITUTION_REVIEW|UNIMPLEMENTED|PROFESSIONAL|CLINICIAN/.test(item.status);
      const box=make('div','list-group-item px-0 py-3');
      const top=make('div','d-flex flex-wrap justify-content-between align-items-start gap-2');
      top.append(make('div','fw-semibold',String(index+1).padStart(2,'0')+' · '+item.wording));
      top.append(make('span','badge '+(isExternal?'bg-yellow-lt':'bg-azure-lt'),
        isExternal?'외부 확인·자료 필요':'관련 정보 후보 · 승인 전'));
      box.append(top);
      if(item.source_page)box.append(make('div','small text-secondary mt-1','공식 양식 '+item.source_page+'쪽'));
      if(item.related_paths.length)box.append(make('div','small text-secondary mt-1','연관된 데이터 경로: '+item.related_paths.join(' · ')));
      if(item.limit)box.append(make('div','small mt-1',item.limit));
      root.append(box);
    }
    const footer=make('div','list-group-item border-top pt-3');
    footer.append(make('strong','text-danger','병원 수신 확인·의료진 승인 0건'));
    const source=make('a','d-block mt-2','이 기관의 공개 원문 직접 확인');
    source.href=row.source_url;source.target='_blank';source.rel='noopener noreferrer';
    footer.append(source);root.append(footer);
  }
  function renderMeta(report,subset){
    selectedSubset=subset;
    const firstObserved=String(report.previsit_summary.first_observed_change_at||'미수집').slice(0,10);
    qs('firstDate').textContent=firstObserved;
    qs('firstObservedSummary').textContent=firstObserved;
    qs('handoffReason').textContent=report.previsit_summary.handoff_reason||'의뢰 사유 미수집';
    const ranked=subset.metrics.filter(m=>m.changed&&Number.isFinite(m.relative_change))
      .slice().sort((a,b)=>Math.abs(b.relative_change)-Math.abs(a.relative_change)).slice(0,3);
    qs('topDomainSummary').textContent=ranked.length?ranked.map(m=>m.clinical_label+' '+pct(m.relative_change)).join(' · '):'변화 관찰 미수집';
    const missing=(report.clinical_coverage||[]).filter(x=>x.status==='missing'||x.status==='not_collected');
    qs('missingSummary').textContent=missing.length?missing.map(x=>COVERAGE_LABELS[x.id]||x.id).join(' · '):'확인된 결손 없음 (수집 범위 내)';
    qs('metricCount').textContent=subset.metrics.length+'개';
    qs('changesCount').textContent=subset.metrics.filter(m=>m.changed).length+'개';
    const rows=qs('rawMetricRows');rows.replaceChildren();
    subset.metrics.forEach((m,index)=>{
      const tr=make('tr');
      const first=make('th','fw-semibold',m.clinical_label);first.scope='row';tr.append(first);
      for(const value of [raw(m.baseline,m.unit),raw(m.recent,m.unit),pct(m.relative_change),m.series.length+' / '+subset.days+'일',m.source_mode||'출처 미수집']){
        tr.append(make('td','',value));
      }
      const cell=make('td');
      const focus=make('button','btn btn-outline-primary btn-sm','추이 보기');focus.type='button';focus.dataset.clinicalFocus=String(index);
      focus.setAttribute('aria-label',m.clinical_label+' 시계열 차트로 이동');cell.append(focus);tr.append(cell);rows.append(tr);
    });
    const family=qs('informantContext');family.replaceChildren();
    const f=(report.family_feedback||[])[0];
    family.append(make('div','fw-semibold','가족 관찰 · 합성 사용자 보고'));
    family.append(make('p','text-secondary mb-2',f?f.note:'가족 관찰 미수집'));
    const professional=qs('professionalContext');
    professional.textContent=report.professional_outcomes?.length?
      '외부 전문평가 기록이 존재하지만 검증등급을 별도로 확인해야 합니다.':
      '전문검사/의료진 공식 평가 결과: 미수집 (정상 판정이 아님)';
  }
  function focusMetric(index){
    const m=selectedSubset?.metrics?.[index];
    const lineChart=charts.find(c=>c.getDom()===qs('trendChart'));
    if(!m||!lineChart||!m.series.length){status('선택 영역의 기록일이 없어 시계열로 이동하지 않았습니다.');return}
    const latest=m.series[m.series.length-1].day;
    const dataIndex=Math.round((Date.parse(latest+'T00:00:00Z')-Date.parse(selectedSubset.earliest+'T00:00:00Z'))/86400000);
    if(dataIndex<0||dataIndex>=selectedSubset.days)return;
    lineChart.dispatchAction({type:'highlight',seriesIndex:index,dataIndex});
    lineChart.dispatchAction({type:'showTip',seriesIndex:index,dataIndex});
    status(m.clinical_label+' · 선택한 합성 원자료 '+latest+' · 진단 결과 아님');
    qs('trendChart').scrollIntoView({behavior:'smooth',block:'center'});
  }
  function createChart(id,option){
    const el=qs(id);
    if(!el)return;
    let chart=charts.find(c=>c.getDom()===el);
    if(!chart){chart=window.echarts.init(el,null,{renderer:'canvas'});charts.push(chart)}
    chart.setOption(option,true);
  }
  // Pattern: official Apache ECharts line + zoom example, data labels only
  // https://echarts.apache.org/examples/en/index.html (Line / DataZoom).
  function trendOption(subset){
    const days=Array.from({length:subset.days},(_,i)=>day(Date.parse(subset.earliest+'T00:00:00Z')+i*86400000));
    const lines=subset.metrics.map((m,index)=>{
      const byDay=new Map(m.series.map(p=>[p.day,p.value]));
      return {name:m.clinical_label,type:'line',symbol:'circle',showSymbol:false,symbolSize:6,
        connectNulls:false,emphasis:{focus:'series'},smooth:false,
        lineStyle:{width:2},itemStyle:{color:optionColor[index%optionColor.length]},
        data:days.map(d=>{
          const v=byDay.get(d);
          return typeof v==='number'&&Number.isFinite(v)&&m.baseline!==0?
            Number(((v-m.baseline)/Math.abs(m.baseline)*100).toFixed(2)):null
        })};
    });
    return {backgroundColor:'transparent',animationDuration:650,
      toolbox:{show:true,top:33,right:8,feature:{dataZoom:{yAxisIndex:'none',title:{zoom:'범위 확대',back:'확대 뒤로'}},restore:{title:'확대 원복'}}},
      tooltip:{trigger:'axis',axisPointer:{type:'cross'},valueFormatter:v=>v==null?'미수집':(v>0?'+':'')+Number(v).toFixed(1)+'%'},
      legend:{type:'scroll',top:0},color:optionColor,grid:{top:68,left:55,right:18,bottom:62,containLabel:false},
      xAxis:{type:'category',boundaryGap:false,data:days,axisLabel:{fontSize:10,hideOverlap:true}},
      yAxis:{type:'value',axisLabel:{formatter:'{value}%'},splitLine:{lineStyle:{color:'#e9eef3'}}},
      dataZoom:[{type:'inside',xAxisIndex:0,filterMode:'none'},{type:'slider',height:16,bottom:12,showDetail:false,filterMode:'none'}],
      series:lines};
  }
  // Pattern: official Apache ECharts cartesian heatmap, with visible missing days.
  function coverageOption(subset){
    const days=Array.from({length:subset.days},(_,i)=>day(Date.parse(subset.earliest+'T00:00:00Z')+i*86400000));
    const names=subset.metrics.map(m=>m.clinical_label);
    const heat=[];
    subset.metrics.forEach((m,y)=>{const present=new Set(m.series.map(p=>p.day));days.forEach((d,x)=>heat.push([x,y,present.has(d)?1:0]))});
    return {backgroundColor:'transparent',tooltip:{position:'top',formatter:p=>names[p.data[1]]+'<br>'+days[p.data[0]]+' · '+(p.data[2]===1?'실제 합성 기록':'미수집')},
      grid:{top:20,bottom:42,left:118,right:12},
      xAxis:{type:'category',data:days,splitArea:{show:true},axisLabel:{interval:Math.max(1,Math.floor(subset.days/6)),formatter:v=>v.slice(5),rotate:35,fontSize:10}},
      yAxis:{type:'category',data:names,splitArea:{show:true},axisLabel:{width:104,overflow:'truncate',fontSize:10}},
      visualMap:{show:false,min:0,max:1,inRange:{color:['#e2e8f0','#206bc4']}},
      series:[{name:'관찰일',type:'heatmap',data:heat,label:{show:false},emphasis:{itemStyle:{shadowBlur:4,shadowColor:'rgba(0,0,0,.28)'}}}]};
  }
  // Pattern: official Apache ECharts horizontal bar sample (category yAxis).
  function changeOption(subset){
    const metrics=subset.metrics;
    return {backgroundColor:'transparent',color:['#206bc4'],tooltip:{trigger:'axis',axisPointer:{type:'shadow'},valueFormatter:v=>(v>0?'+':'')+Number(v).toFixed(1)+'%'},
      grid:{left:148,right:72,top:15,bottom:25},
      xAxis:{type:'value',axisLabel:{formatter:'{value}%'},splitLine:{lineStyle:{color:'#e9eef3'}}},
      yAxis:{type:'category',inverse:true,data:metrics.map(m=>m.clinical_label),axisLabel:{width:126,overflow:'truncate',fontSize:11}},
      series:[{type:'bar',barMaxWidth:18,data:metrics.map((m,index)=>({
        value:Math.round(m.relative_change*1000)/10,
        itemStyle:{color:optionColor[index%optionColor.length]}
      })),label:{show:true,position:'right',formatter:p=>(p.value>0?'+':'')+p.value+'%'}}]};
  }
  function renderCharts(subset){
    if(!window.echarts||typeof window.echarts.init!=='function'){
      for(const name of ['trendChart','coverageChart','changeChart'])qs(name).textContent='공식 ECharts 템플릿을 불러오지 못했습니다. 차트를 임의 이미지로 대체하지 않습니다.';
      error('외부 차트 템플릿 로드 실패 · 검증 불가');
      return;
    }
    createChart('trendChart',trendOption(subset));
    createChart('coverageChart',coverageOption(subset));
    createChart('changeChart',changeOption(subset));
  }
  async function initialize(){
    if(!window.KIMSE_CLINICAL_PROFILES)throw Error('PROFILE_RESOLVER_MISSING');
    const [registry,report,crosswalk]=await Promise.all([load('./clinical-profile-authorities.json'),load('./clinical-template-demo-data.json'),load('./clinical-public-form-crosswalk.json')]);
    if(crosswalk.status!=='PUBLIC_SOURCE_CROSSWALK_NOT_INSTITUTION_APPROVAL'||crosswalk.policy.verified_receivers!==0)throw Error('PUBLIC_FORM_CONTRACT_NOT_SAFE');
    if(report.demo_marker!=='SYNTHETIC_ONLY_NOT_A_REAL_PATIENT')throw Error('REAL_PATIENT_DATA_FORBIDDEN_IN_PUBLIC_DEMO');
    if(report.subject?.care_subject_id!=='SYNTHETIC_NO_REAL_PATIENT_ID')throw Error('PATIENT_ID_FORBIDDEN');
    const {updateInstitutions}=listControls(registry);
    const refreshProfile=()=>{renderProfile(registry,report);renderHospitalRequirements(crosswalk,qs('country').value,qs('institution').value)};
    qs('country').addEventListener('change',()=>{updateInstitutions();refreshProfile()});
    qs('institution').addEventListener('change',refreshProfile);
    const refresh=()=>{
      const subset=getSelectedReport(report,Number(qs('period').value));
      renderMeta(report,subset);
      renderCharts(subset);
    };
    qs('period').addEventListener('change',refresh);
    qs('rawMetricRows').addEventListener('click',e=>{const button=e.target.closest('[data-clinical-focus]');if(button)focusMetric(Number(button.dataset.clinicalFocus))});
    refreshProfile();refresh();
    window.addEventListener('resize',()=>charts.forEach(c=>c.resize()),{passive:true});
    // Browser QA can read this marker; no network requests or user data.
    document.documentElement.dataset.clinicalTemplateReady=window.echarts?'yes':'charts-unavailable';
    document.documentElement.dataset.clinicalTemplateSource='TABLER_AND_APACHE_ECHARTS';
  }
  window.addEventListener('DOMContentLoaded',()=>initialize().catch(e=>{
    error('템플릿 검증실 로딩 실패: '+String(e.message||e));
    document.documentElement.dataset.clinicalTemplateReady='error';
  }));
})();
