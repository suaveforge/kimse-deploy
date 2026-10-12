// Synthetic-only deterministic stress fixtures for Clinical Lab; never a real patient.
const clone=r=>JSON.parse(JSON.stringify(r));
const updateQuality=r=>{
  for(const m of r.monitoring.metrics){
    m.quality.valid_days=m.series.length;
    m.quality.missing_calendar_days=28-m.series.length;
    m.quality.calendar_day_coverage=m.series.length/28;
  }
  return r;
};
const emptySignal=m=>{
  m.series=[];m.baseline=null;m.recent=null;m.relative_change=null;m.changed=false;
};
export function clinical08Cases(base){
  if(base.demo_marker!=='SYNTHETIC_ONLY_NOT_A_REAL_PATIENT'||base.subject?.care_subject_id!=='SYNTHETIC_NO_REAL_PATIENT_ID')throw Error('REAL_CLINICAL_DATA_REJECTED');
  const mk=(id,mutate)=>{const report=clone(base);mutate(report);updateQuality(report);return {id,report}};
  return [
    mk('C01_baseline',()=>{}),
    mk('C02_recent_week_only',r=>{for(const m of r.monitoring.metrics)m.series=m.series.filter(p=>p.day>='2026-10-04')}),
    mk('C03_every_third_day',r=>{for(const m of r.monitoring.metrics)m.series=m.series.filter((p,i)=>i%3===0)}),
    mk('C04_sleep_fully_missing',r=>{emptySignal(r.monitoring.metrics.find(m=>m.metric==='sleep_minutes'));r.previsit_summary.top_changes=r.previsit_summary.top_changes.filter(m=>m.metric!=='sleep_minutes')}),
    mk('C05_all_signals_uncollected',r=>{for(const m of r.monitoring.metrics)emptySignal(m);r.previsit_summary.top_changes=[];r.previsit_summary.first_observed_change_at=null;r.previsit_summary.latest_observed_change_at=null;r.timeline=r.timeline.filter(e=>e.kind!=='SIGNAL_DEVIATION_ONSET')}),
    mk('C06_no_informant',r=>{r.family_feedback=[];r.clinical_coverage.find(x=>x.id==='informant').status='missing';r.timeline=r.timeline.filter(e=>e.kind!=='INFORMANT_FEEDBACK');r.clinical_domains.subjective_change.informant='UNKNOWN'}),
    mk('C07_late_family_report',r=>{r.family_feedback[0].feedback_at='2026-10-09T09:00:00+09:00';r.family_feedback[0].note='합성 가족 관찰: 최근 기록 변경';r.timeline.find(x=>x.kind==='INFORMANT_FEEDBACK').at='2026-10-09T09:00:00Z'}),
    mk('C08_stable_observations',r=>{for(const m of r.monitoring.metrics){m.series.forEach(p=>{p.value=m.baseline});m.recent=m.baseline;m.relative_change=0;m.changed=false}r.previsit_summary.top_changes=[];r.previsit_summary.first_observed_change_at=null;r.previsit_summary.latest_observed_change_at=null;r.timeline=r.timeline.filter(e=>e.kind!=='SIGNAL_DEVIATION_ONSET')})
  ];
}
