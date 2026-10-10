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
  // Published Tabler text components receive user-readable explanations; canonical guard/source codes are retained in data-* attributes.
  const GUARD_TEXT={
    OBSERVED_AND_PATIENT_HISTORY:'관찰 기록과 본인 설명을 구분해 확인합니다.',
    OBSERVATION_DATE_NOT_DISEASE_ONSET:'처음 기록된 변화일이며 질병 발병일은 아닙니다.',
    KIMSE_OPERATIONAL_NOT_DIAGNOSTIC:'생활 신호의 변화이며 임상 진단 결과가 아닙니다.',
    KIMSE_TASK_NOT_VALIDATED_SCORE:'앱 반복과제는 공인 인지검사 점수로 환산하지 않습니다.',
    SELF_AND_INFORMANT_SEPARATE:'본인과 가족이 보고한 일상기능 상태를 각각 확인합니다.',
    INFORMANT_NOT_CLINICIAN_VERIFIED:'가족이 전한 내용은 의료진의 검증 결과가 아닙니다.',
    NOT_A_PSYCHIATRIC_DIAGNOSIS:'기분·행동 관찰은 정신과적 진단을 의미하지 않습니다.',
    NOT_A_CLINICAL_NEURO_EXAM:'감각·운동 관련 기록은 의료진의 신경학적 검사와 다릅니다.',
    MISSING_IS_NOT_NEGATIVE:'수집하지 않은 항목을 정상 또는 음성으로 간주하지 않습니다.',
    MUST_PRESERVE_USER_ENTERED_VS_PROVIDER_LINKED:'직접 입력한 검사 결과와 의료기관에서 확인된 자료를 구분합니다.',
    KIMSE_SUMMARY_CANNOT_REPLACE_ORIGINAL:'병원 의뢰장·영상·원검사는 원본 자료를 따로 준비해야 합니다.',
    MISSING_AND_NONE_REPORTED_DISTINCT:'자료가 없는 상태와 이상이 없다고 보고한 상태는 다릅니다.'
  };
  const PROFILE_NOTE_TEXT={
    GLOBAL:'국제 공통 정보구조를 참고한 표시 후보이며 세계 공통의 필수 치매 의뢰서는 아닙니다.',
    KR:'국내 공개 임상지침을 참고한 후보입니다. 개별 병원의 진료 접수요건은 승인되지 않았습니다.',
    GB:'NICE의 평가 지침을 참고한 후보로, 개별 NHS 의료기관의 의뢰서가 아닙니다.',
    US:'알츠하이머협회 공개 권고사항을 참고했으며 미국 보험·병원 승인 서식이 아닙니다.',
    CA:'우려 증상에 대한 평가 지침을 참고한 후보이며 무증상자 일괄 선별검사와 다릅니다.',
    AU:'2016년 역사적 호주 일반진료 지침을 참고합니다. 2026년 개정 최종판 여부는 별도로 확인해야 합니다.',
    JP:'2017년 일본 종합 치매지침을 참고합니다. 전문분야 추가 지침과 병원별 승인 요건은 별개입니다.'
  };
  const SOURCE_SCOPE_TEXT={
    'GLOBAL-HL7-IPS-2026':'국제 환자 요약 교환구조 참고자료이며 치매 전용 의뢰양식이 아닙니다.',
    'KR-KDA-2021':'국내 치매 진단·평가 지침 참고자료이며 개별 병원 접수양식이 아닙니다.',
    'KR-HL7K-CORE-2':'국내 FHIR 교환규격 참고자료이며 병원 전자수신을 보증하지 않습니다.',
    'GB-NICE-NG97':'병력·인지·행동·일상기능과 가역원인 평가 지침이며 KIMSE의 전자접수 승인과 무관합니다.',
    'US-AA-DETECD-2025':'본인·보호자 이력, 기능·안전·검사 평가 지침이며 낌새의 임상적 유효성 승인이 아닙니다.',
    'CA-CCCDTD5-2020':'증상 우려에 대한 의료평가와 타당화된 검사 권고를 참고하며 일괄 선별검사 지침이 아닙니다.',
    'AU-RACGP-2016':'호주의 과거 일반진료 지침입니다. 후속 지침 개정 상태를 재확인해야 합니다.',
    'JP-JSN-2017':'일본의 과거 종합 치매지침으로, 최신 전문 보충지침이나 병원 승인서식과 다릅니다.'
  };
  const SOURCE_MODE_TEXT={
    native_step_counter_simulation:'가상 걸음수 센서',
    manual_entry_simulation:'가상 직접 입력',
    foreground_location_simulation:'가상 앱 사용 중 위치',
    active_speech_task_simulation:'가상 말하기 과제',
    kimse_call_only_simulation:'가상 낌새 앱 통화',
    in_app_task_simulation:'가상 반복과제'
  };
  const SIGNAL_UNIT_TEXT={steps:'보',sleep_minutes:'분',location_radius_m:'m',voice_pause_ratio:'비율',call_count:'회',task_response_ms:'ms'};

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
    qs('profileNote').textContent=PROFILE_NOTE_TEXT[profile.profile_id]||'공개 지침 기반 표시 후보이며 병원별 승인 서식이 아닙니다.';
    qs('profileNote').dataset.sourceNote=profile.profile_note;
    status(profile.profile_label+(profile.institution?' · '+profile.institution.name:'')+' · 공개 근거 기반 화면 후보, 의료진 승인 없음');
    const list=qs('fieldList');list.replaceChildren();
    qs('fieldCoverage').textContent=profile.sections.length+' / '+registry.fields.length+'개 후보 항목 표시 · 미승인 진료과 참고 순서';
    profile.sections.forEach((f,i)=>{
      const item=make('div','list-group-item px-0 py-2');
      const head=make('div','d-flex justify-content-between align-items-start gap-2');
      head.append(make('span','fw-semibold',String(i+1).padStart(2,'0')+' · '+f.label));
      const badge=make('span','badge '+(f.availability==='available'?'bg-blue-lt':'bg-secondary-lt'),f.availability==='available'?'합성값 있음':'미수집');
      head.append(badge);
      const note=make('div','small text-secondary mt-1',GUARD_TEXT[f.guard]||'확인된 자료의 수집·검증 상태를 구분해 살펴봅니다.');
      note.dataset.guardCode=f.guard;
      item.append(head,note);list.append(item);
    });
    const sourceList=qs('sourceList');sourceList.replaceChildren();
    profile.sources.forEach(s=>{
      const box=make('div','mb-3 pb-2 border-bottom');
      const link=make('a','fw-semibold',s.issuer+' · '+s.id);link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';
      const scope=make('div','text-secondary small mt-1',SOURCE_SCOPE_TEXT[s.id]||'원문 자료의 적용 범위를 개별 확인해야 합니다.');
      scope.dataset.sourceScope=s.scope;
      box.append(link,scope);
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
    delete message.dataset.routingConflict;
    const traceStatus=qs('sourceTraceSummary');
    delete traceStatus.dataset.pdfPageMapped;
    delete traceStatus.dataset.htmlSectionMapped;
    delete traceStatus.dataset.unlocated;
    const row=crosswalk.entries.find(item=>item.id===institutionId&&item.country===country);
    const disclosure=qs('institutionEvidenceDisclosure'),disclosureSummary=qs('institutionEvidenceSummary');
    const evidenceKey=row?row.id:'';
    if(disclosure.dataset.institutionId!==evidenceKey){
      disclosure.open=false;
      disclosure.dataset.institutionId=evidenceKey;
    }
    disclosureSummary.textContent=row?
      row.requirement_groups.length+'개 기관 공개 조사 항목 · 원문과 준비자료 펼쳐 보기':
      '기관을 선택하면 해당 기관의 공개 조사 항목을 펼쳐 볼 수 있습니다';
    if(!row){
      message.textContent='국가 공통 표시 후보입니다. 공개 의료기관을 선택해야 그 기관의 조사된 원문 요건과 추가 확인자료를 볼 수 있습니다.';
      traceStatus.textContent='기관 원문을 선택하지 않았습니다. 승인된 제출 양식으로 오인하지 마세요.';
      root.append(make('div','list-group-item text-secondary','병원 미선택 · 승인된 제출 프로파일 없음'));
      return;
    }
    if(row.approval_status==='APPROVED'||crosswalk.policy.verified_receivers!==0)throw Error('PUBLIC_FORM_APPROVAL_STATE_CONFLICT');
    message.textContent='공식 공개자료 조사 '+row.requirement_groups.length+'개 항목/그룹입니다. 아래 내용은 필수항목의 승인된 체크리스트가 아니며, KIMSE 데이터만으로 서류·전문검사를 대신하지 못합니다.';
    if(row.source_conflict?.status==='UNRESOLVED_OFFICIAL_SOURCE_CONFLICT'){
      message.textContent+=' 접수 경로 공식 원문 상충: 진료과 웹·PDF 안내의 실물 배송 방법이 서로 다르며, 병원 전체 안내는 진료과별 접수 경로를 대신하지 않습니다. 담당 의료기관 확인 전 KIMSE 환자자료 발송 금지.';
      message.dataset.routingConflict='unresolved';
    } else delete message.dataset.routingConflict;
    const located=row.requirement_groups.filter(item=>Number.isInteger(item.source_page)&&item.source_page>0&&/\.pdf(?:\?|$)/i.test(item.source_url||row.source_url)).length;
    const htmlLocated=row.requirement_groups.filter(item=>item.source_locator_type==='HTML_SECTION_HEADING'&&typeof item.source_heading==='string'&&item.source_heading.trim()&&item.source_page===null&&!/\.pdf(?:\?|$)/i.test(item.source_url||row.source_url)).length;
    const unlocated=row.requirement_groups.length-located-htmlLocated;
    traceStatus.textContent='원문 위치: 공식 PDF 쪽수 '+located+'개 · 공식 HTML 절 제목 '+htmlLocated+'개 · 상세 위치 미매핑 '+unlocated+'개 (조사 '+row.requirement_groups.length+'개). 원문 위치 검증은 기관의 제출 승인과 다릅니다.';
    traceStatus.dataset.pdfPageMapped=String(located);
    traceStatus.dataset.htmlSectionMapped=String(htmlLocated);
    traceStatus.dataset.unlocated=String(unlocated);
    for(const [index,item] of row.requirement_groups.entries()){
      const isExternal=/EXTERNAL|AUTHORIZED|APPROVED_CHANNEL|PARTNER_APPROVAL|NOT_YET_SUPPORTED|INSTITUTION_REVIEW|UNIMPLEMENTED|PROFESSIONAL|CLINICIAN/.test(item.status);
      const box=make('div','list-group-item px-0 py-3');
      const top=make('div','d-flex flex-wrap justify-content-between align-items-start gap-2');
      top.append(make('div','fw-semibold',String(index+1).padStart(2,'0')+' · '+item.wording));
      top.append(make('span','badge '+(isExternal?'bg-yellow-lt':'bg-azure-lt'),
        isExternal?'외부 확인·자료 필요':'관련 정보 후보 · 승인 전'));
      box.append(top);
      const officialSourceUrl=item.source_url||row.source_url;
      const exactPdfPage=Number.isInteger(item.source_page)&&item.source_page>0&&/\.pdf(?:\?|$)/i.test(officialSourceUrl);
      const htmlHeading=!exactPdfPage&&item.source_locator_type==='HTML_SECTION_HEADING'&&typeof item.source_heading==='string'&&item.source_heading.trim()&&!/\.pdf(?:\?|$)/i.test(officialSourceUrl);
      const trace=make('a','d-block small mt-1',exactPdfPage?
        '기관 공식 PDF '+item.source_page+'쪽 열기 (부분별 원문 직접 대조)':
        htmlHeading?'기관 공식 HTML 원문 열기 · 절: '+item.source_heading:
        '기관 공식 공개페이지 열기 (해당 절·문장 위치 미매핑)');
      // HTML heading is a searchable section label, NOT an invented anchor ID.
      trace.href=officialSourceUrl+(exactPdfPage?'#page='+item.source_page:'');
      trace.rel='noopener noreferrer';trace.target='_blank';
      trace.dataset.sourceTrace=exactPdfPage?'PDF_PAGE_INDEXED':htmlHeading?'HTML_SECTION_HEADING':'OFFICIAL_URL_SECTION_UNLOCATED';
      trace.dataset.requirementId=item.id;
      if(htmlHeading)trace.dataset.sourceHeading=item.source_heading;
      box.append(trace);
      if(item.related_paths.length)box.append(make('div','small text-secondary mt-1','연관된 데이터 경로: '+item.related_paths.join(' · ')));
      else box.append(make('div','small text-secondary mt-1','KIMSE 직접 대응 경로 없음 · 외부 문서/기관 별도 확인 필요'));
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
    const originalDays=Number(report.report_context.view_horizon_days);
    if(!Number.isInteger(originalDays)||originalDays<subset.days)throw Error('INVALID_SYNTHETIC_PERIOD_SCOPE');
    qs('periodInterpretation').textContent='선택한 최근 '+subset.days+'일 ('+subset.earliest+' ~ '+subset.latest+')은 날짜별 추이와 수집·미수집 일수만 변경합니다. 첫 관찰 변화일·주요 변화·기준선·최근 대표값·변화율은 전체 '+originalDays+'일 원본 기준 고정값이며 선택 기간 재산출값이 아닙니다.';
    qs('periodInterpretation').dataset.selectedPeriodDays=String(subset.days);
    qs('periodInterpretation').dataset.originalHorizonDays=String(originalDays);
    const rows=qs('rawMetricRows');rows.replaceChildren();
    subset.metrics.forEach((m,index)=>{
      const tr=make('tr');
      const first=make('th','fw-semibold',m.clinical_label);first.scope='row';tr.append(first);
      const unit=SIGNAL_UNIT_TEXT[m.metric]||m.unit;
      for(const value of [raw(m.baseline,unit),raw(m.recent,unit),pct(m.relative_change),m.series.length+' / '+subset.days+'일']){
        tr.append(make('td','',value));
      }
      const source=make('td','',SOURCE_MODE_TEXT[m.source_mode]||'출처 코드 확인 필요');
      source.dataset.sourceCode=m.source_mode||'';
      source.dataset.originalUnit=m.unit||'';
      tr.append(source);
      const cell=make('td');
      const focus=make('button','btn btn-outline-primary btn-sm','추이 보기');focus.type='button';focus.dataset.clinicalFocus=String(index);
      focus.setAttribute('aria-label',m.clinical_label+' 시계열 차트로 이동');cell.append(focus);tr.append(cell);rows.append(tr);
    });
    const family=qs('informantContext');family.replaceChildren();
    const f=(report.family_feedback||[])[0];
    family.append(make('div','fw-semibold','가족 관찰 · 합성 사용자 보고'));
    family.append(make('p','text-secondary mb-2',f?f.note:'가족 관찰 미수집'));
    qs('summaryFamily').textContent=f?.note||'가족 관찰 미수집 · 가족 확인이 없는 상태';
    const professional=qs('professionalContext');
    professional.textContent=report.professional_outcomes?.length?
      '외부 전문평가 기록이 존재하지만 검증등급을 별도로 확인해야 합니다.':
      '전문검사/의료진 공식 평가 결과: 미수집 (정상 판정이 아님)';
    qs('summaryProfessional').textContent=professional.textContent;
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

  // The print summary duplicates only already-rendered screen text and rows.
  // Never reinterpret a metric, substitute a missing result, or create a clinical assessment.
  function renderPrintable(report,subset,registry,crosswalk){
    if(report.demo_marker!=='SYNTHETIC_ONLY_NOT_A_REAL_PATIENT'||report.subject?.care_subject_id!=='SYNTHETIC_NO_REAL_PATIENT_ID'){
      throw Error('PRINT_REAL_PATIENT_FORBIDDEN');
    }
    const copy=(to,from)=>{qs(to).textContent=qs(from).textContent};
    copy('printHandoffReason','handoffReason');
    copy('printFirstObserved','firstObservedSummary');
    copy('printTopDomains','topDomainSummary');
    copy('printMissing','missingSummary');
    copy('printFamily','informantContext');
    copy('printProfessional','professionalContext');
    qs('printPeriod').textContent=subset.days+'일 · '+subset.earliest+' ~ '+subset.latest+' (대표값은 원본 '+Number(report.report_context.view_horizon_days)+'일 기준)';
    copy('printPeriodInterpretation','periodInterpretation');
    const country=qs('country').value,institution=qs('institution').value;
    qs('printProfile').textContent=registry.regions.find(x=>x.code===country)?.label||'GLOBAL';
    const printRows=qs('printSummaryRows');printRows.replaceChildren();
    const from=Array.from(qs('rawMetricRows').querySelectorAll('tr'));
    for(const src of from){
      const tr=make('tr');
      Array.from(src.children).slice(0,6).forEach(cell=>tr.append(cell.cloneNode(true)));
      printRows.append(tr);
    }
    const quality=qs('printQualityRows');quality.replaceChildren();
    for(const m of subset.metrics){
      const tr=make('tr');
      const mode=SOURCE_MODE_TEXT[m.source_mode]||'출처 코드 확인 필요';
      const qualityCells=[m.clinical_label,mode,String(m.series.length),String(Math.max(0,subset.days-m.series.length)),subset.earliest+' ~ '+subset.latest];
      qualityCells.forEach((t,i)=>{const cell=make(i===0?'th':'td','',t);if(i===0)cell.scope='row';tr.append(cell)});
      tr.dataset.metric=m.metric;
      tr.dataset.originalSource=m.source_mode;
      quality.append(tr);
    }
    const missing=(report.clinical_coverage||[]).filter(x=>['missing','not_collected'].includes(x.status));
    qs('printMissingDetail').textContent=missing.length?
      missing.map(x=>(COVERAGE_LABELS[x.id]||x.id)+' · 미수집 (정상·음성 판정 아님)').join(' / '):
      '자료 수집 범위 안에서 확인된 미수집 항목 없음. 미검사항목의 정상 판정은 아님.';
    qs('printExternal').textContent='외부 전문검사/병원 원자료: '+
      (report.professional_outcomes?.length||report.external_clinical_records?.length?
        '별도 출처와 검증등급 확인 필요':'미수집 (검사 정상 또는 음성이라는 뜻이 아님)');
    const row=crosswalk.entries.find(x=>x.id===institution&&x.country===country);
    qs('printInstitution').textContent=row?
      '공개 조사 기관: '+(registry.institutions.find(x=>x.id===institution)?.name||institution)+' · 공식 공개자료의 항목/그룹 '+row.requirement_groups.length+'개 · KIMSE 승인된 제출 프로파일 아님'+(row.source_conflict?.status==='UNRESOLVED_OFFICIAL_SOURCE_CONFLICT'?' · 공식 배송 안내 상충, 전달방식 미확정·환자자료 발송 금지':''):
      '의료기관 미선택 · 국가 공통 공개지침 후보만 참고. 승인된 병원 제출 프로파일 없음';
    const target=qs('printInstitutionUrl');target.replaceChildren();
    if(row){const a=make('a','',row.source_url);a.href=row.source_url;target.append(a)}
    else target.textContent='해당 의료기관 제출 원문 없음';
    qs('printHospitalRequirements').textContent=row?
      '공개자료 조사 항목 예시 (승인된 필수 제출 요건 아님): '+
       row.requirement_groups.slice(0,3).map(x=>x.wording).join(' / ')+
       (row.requirement_groups.length>3?' / 이외 '+(row.requirement_groups.length-3)+'개는 화면에서 원문과 대조':''):
      '병원별 추가 서류는 미확인 · 의사 발행 의뢰장, 전문검사, 영상 등은 외부에서 준비';
    qs('clinicalPrintButton').disabled=false;
    document.documentElement.dataset.clinicalPrintReady='yes';
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
      tooltip:{trigger:'axis',confine:true,axisPointer:{type:'cross'},valueFormatter:v=>v==null?'미수집':(v>0?'+':'')+Number(v).toFixed(1)+'%'},
      legend:{type:'scroll',top:0},color:optionColor,grid:{top:68,left:55,right:18,bottom:62,containLabel:false},
      xAxis:{type:'category',boundaryGap:false,data:days,axisLabel:{fontSize:10,hideOverlap:true}},
      yAxis:{type:'value',axisLabel:{formatter:'{value}%'},splitLine:{lineStyle:{color:'#e9eef3'}}},
      dataZoom:[{id:'kimse-observed-days',type:'inside',xAxisIndex:0,filterMode:'none'},{id:'kimse-observed-days-slider',type:'slider',height:16,bottom:12,showDetail:false,filterMode:'none'}],
      series:lines};
  }
  // Pattern: official Apache ECharts cartesian heatmap, with visible missing days.
  function coverageOption(subset){
    const days=Array.from({length:subset.days},(_,i)=>day(Date.parse(subset.earliest+'T00:00:00Z')+i*86400000));
    const names=subset.metrics.map(m=>m.clinical_label);
    const heat=[];
    subset.metrics.forEach((m,y)=>{const present=new Set(m.series.map(p=>p.day));days.forEach((d,x)=>heat.push([x,y,present.has(d)?1:0]))});
    return {backgroundColor:'transparent',tooltip:{position:'top',confine:true,formatter:p=>names[p.data[1]]+'<br>'+days[p.data[0]]+' · '+(p.data[2]===1?'실제 합성 기록':'미수집')},
      grid:{top:20,bottom:42,left:118,right:12},
      xAxis:{type:'category',data:days,splitArea:{show:true},axisLabel:{interval:Math.max(1,Math.floor(subset.days/6)),formatter:v=>v.slice(5),rotate:35,fontSize:10}},
      yAxis:{type:'category',data:names,splitArea:{show:true},axisLabel:{width:104,overflow:'truncate',fontSize:10}},
      dataZoom:[{id:'kimse-observed-days',type:'inside',xAxisIndex:0,filterMode:'none'}],
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
    // Apache ECharts 5.6.0 upstream connect API: link only charts with the same calendar-day x-axis.
    // The %-by-domain bar has a different x-axis and must never be synchronized by position.
    const trend=window.echarts.getInstanceByDom(qs('trendChart'));
    const coverage=window.echarts.getInstanceByDom(qs('coverageChart'));
    trend.group='kimse-synthetic-calendar-days';
    coverage.group='kimse-synthetic-calendar-days';
    window.echarts.connect('kimse-synthetic-calendar-days');
  }
  async function initialize(){
    if(!window.KIMSE_CLINICAL_PROFILES)throw Error('PROFILE_RESOLVER_MISSING');
    const [registry,report,crosswalk]=await Promise.all([load('./clinical-profile-authorities.json'),load('./clinical-template-demo-data.json'),load('./clinical-public-form-crosswalk.json')]);
    if(crosswalk.status!=='PUBLIC_SOURCE_CROSSWALK_NOT_INSTITUTION_APPROVAL'||crosswalk.policy.verified_receivers!==0)throw Error('PUBLIC_FORM_CONTRACT_NOT_SAFE');
    if(report.demo_marker!=='SYNTHETIC_ONLY_NOT_A_REAL_PATIENT')throw Error('REAL_PATIENT_DATA_FORBIDDEN_IN_PUBLIC_DEMO');
    if(report.subject?.care_subject_id!=='SYNTHETIC_NO_REAL_PATIENT_ID')throw Error('PATIENT_ID_FORBIDDEN');
    const providerCount=registry.institutions.length;
    const researchGroups=crosswalk.entries.reduce((n,entry)=>n+entry.requirement_groups.length,0);
    if(crosswalk.entry_count!==providerCount||crosswalk.published_research_groups!==researchGroups)throw Error('PUBLISHED_REQUIREMENTS_COUNT_DRIFT');
    if(registry.institutions.some(item=>item.clinical_reviewer_approved||item.kimse_electronic_receiver_approved))throw Error('CLINICAL_APPROVAL_STATE_CONFLICT');
    qs('demoVersion').textContent='Updated 2026.10.10 · Clinical Template Lab 04 · 공개조사 '+providerCount+'기관 · '+researchGroups+'개 연구 그룹 · 승인 0건';

    const {updateInstitutions}=listControls(registry);
    const refreshProfile=()=>{renderProfile(registry,report);renderHospitalRequirements(crosswalk,qs('country').value,qs('institution').value);if(selectedSubset)renderPrintable(report,selectedSubset,registry,crosswalk)};
    qs('country').addEventListener('change',()=>{updateInstitutions();refreshProfile()});
    qs('institution').addEventListener('change',refreshProfile);
    const refresh=()=>{
      const subset=getSelectedReport(report,Number(qs('period').value));
      renderMeta(report,subset);
      renderCharts(subset);
      renderPrintable(report,subset,registry,crosswalk);
    };
    qs('period').addEventListener('change',refresh);
    qs('clinicalPrintButton').addEventListener('click',()=>{if(document.documentElement.dataset.clinicalPrintReady==='yes')window.print()});
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
