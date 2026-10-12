// Synthetic-only 60-second clinical review; uses the identical canonical fixture.
document.addEventListener('DOMContentLoaded',async()=>{
  const byId=id=>document.getElementById(id);
  try{
    const res=await fetch('./clinical-template-demo-data.json');
    if(!res.ok)throw Error('FIXTURE_UNAVAILABLE');
    const r=await res.json();
    if(r.demo_marker!=='SYNTHETIC_ONLY_NOT_A_REAL_PATIENT'||r.subject?.care_subject_id!=='SYNTHETIC_NO_REAL_PATIENT_ID')throw Error('UNSAFE_FIXTURE');
    const show=()=>{
      const n=Number(byId('period').value),finish=r.report_context.window_end;
      if(![7,14,28].includes(n))throw Error('BAD_PERIOD');
      const begin=new Date(Date.parse(finish+'T00:00:00Z')-(n-1)*86400000).toISOString().slice(0,10);
      const days=new Map();
      r.monitoring.metrics.forEach(m=>m.series.filter(p=>p.day>=begin&&p.day<=finish).forEach(p=>days.set(p.day,(days.get(p.day)||0)+1)));
      const overlap=[...days.values()].filter(x=>x>=2).length;
      const sum=byId('clinical60sOverlap');
      sum.textContent='최근 '+n+'일 ('+begin+' ~ '+finish+') · 기록된 날 '+days.size+'일 · 2개 이상 신호 동시 기록 '+overlap+'일 · 동시 기록은 공동 악화·원인 판정 아님';
      sum.dataset.observedDays=String(days.size);sum.dataset.overlapDays=String(overlap);sum.dataset.selectedPeriodDays=String(n);
      const pro=byId('clinical60sProfessional');
      pro.textContent=(r.professional_outcomes?.length||r.external_clinical_records?.length)?'전문평가·병원 원본 존재 · 출처/검증별도 확인':'전문평가·병원 원본 미수집 (정상·음성 판정 아님)';
      const events=(r.timeline||[]).filter(e=>e.at?.slice(0,10)>=begin&&e.at.slice(0,10)<=finish).sort((a,b)=>a.at.localeCompare(b.at));
      const list=byId('clinical60sTimeline');list.replaceChildren();
      for(const e of events){
        const row=document.createElement('div');row.className='list-group-item small';row.setAttribute('role','listitem');
        row.dataset.eventKind=e.kind;
        row.textContent=e.at.slice(0,10)+' · '+(e.kind==='INFORMANT_FEEDBACK'?'가족 보고':'앱 관찰')+' · '+(e.label||'내용 미수집');
        list.append(row);
      }
      if(!events.length){const x=document.createElement('div');x.className='list-group-item small';x.setAttribute('role','listitem');x.textContent='선택 기간 별도 사건 미기록 (사건 부재 뜻 아님)';list.append(x)}
      list.dataset.eventCount=String(events.length);
      byId('print60sOverlap').textContent=sum.textContent;
      byId('print60sProfessional').textContent=pro.textContent;
      byId('print60sTimeline').textContent=[...list.children].map(x=>x.textContent).join(' / ');
      document.documentElement.dataset.clinical60Ready='yes';
    };
    show();byId('period').addEventListener('change',show);
  }catch(e){document.documentElement.dataset.clinical60Ready='error';}
});
