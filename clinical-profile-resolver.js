/* KIMSE public-evidence presentation profile resolver.
 * This changes only visual section priority and citation badges, never medical observations.
 * A publicly described referral process is not a hospital's approved KIMSE requirements.
 */
(function(root,factory){
  const mod=factory();
  if(typeof module==='object' && module.exports) module.exports=mod;
  if(root && typeof root==='object') root.KIMSE_CLINICAL_PROFILES=mod;
})(typeof globalThis!=='undefined'?globalThis:null,function(){'use strict';
  const OWN=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
  const safePath=(data,path)=>{
    if(!data||typeof data!=='object'||typeof path!=='string')return undefined;
    return path.split('.').reduce((v,k)=>v!==null && typeof v==='object' && OWN(v,k)?v[k]:undefined,data);
  };
  const presence=value=>{
    if(value===undefined||value===null||value==='')return 'not_collected';
    if(Array.isArray(value))return value.length?'available':'not_collected';
    if(typeof value==='object' && OWN(value,'status') && ['not_collected','missing','unknown'].includes(String(value.status).toLowerCase()))return 'not_collected';
    if(typeof value==='object' && !Object.keys(value).length)return 'not_collected';
    return 'available';
  };
  function resolve(registry, report, selection={}){
    if(!registry||registry.status!=='PUBLIC_EVIDENCE_CANDIDATES_NOT_PROVIDER_APPROVED'||!Array.isArray(registry.fields)||!Array.isArray(registry.regions))throw Error('UNVERIFIED_PROFILE_REGISTRY');
    if(report!==null&&report!==undefined&&(!report||report.schema_version!=='KIMSE_CLINICAL_HANDOFF_PAYLOAD_V2'))throw Error('UNSUPPORTED_CANONICAL_CLINICAL_DATA');
    const country=String(selection.country||'GLOBAL').toUpperCase();
    const region=registry.regions.find(x=>x.code===country)||registry.regions.find(x=>x.code==='GLOBAL');
    if(!region)throw Error('GLOBAL_PROFILE_MISSING');
    const rawInstitution=String(selection.institutionId||'');
    const institution=registry.institutions.find(x=>x.id===rawInstitution && x.country===region.code)||null;
    const all=Object.fromEntries(registry.fields.map(f=>[f.id,f]));
    if(new Set(region.presentation_order).size!==region.presentation_order.length)throw Error('DUPLICATE_PROFILE_FIELD');
    const listed=new Set(region.presentation_order);
    const order=region.presentation_order.concat(registry.fields.filter(f=>!listed.has(f.id)).map(f=>f.id));
    const sections=order.map((id,position)=>{
      const f=all[id];
      if(!f)throw Error('PROFILE_UNKNOWN_FIELD_'+id);
      const value=report?safePath(report,f.canonical_path):undefined;
      return {id,label:f.label,canonical_path:f.canonical_path,guard:f.guard,position,
        availability:report?presence(value):'demo_not_loaded',value:value===undefined?null:value};
    });
    const sourceIds=new Set(region.evidence);
    const sources=registry.sources.filter(s=>sourceIds.has(s.id)).map(s=>({id:s.id,issuer:s.issuer,url:s.url,role:s.role,source_status:s.source_status,scope:s.authority_scope}));
    if(sources.length!==sourceIds.size)throw Error('PROFILE_MISSING_AUTHORITY_SOURCE');
    return {
      profile_id:region.code, profile_label:region.label, profile_status:'CANDIDATE_NEEDS_CLINICIAN_VALIDATION',
      profile_note:region.notes, institution:institution&&{id:institution.id,name:institution.name,source:institution.public_source_url,status:'PUBLIC_RESEARCH_ONLY'},
      hospital_specific_requirements_approved:false,recipient_authorized:false,electronic_submission_ready:false,
      allowed_delivery:'PATIENT_CARRIED_PRINT_ONLY',
      coverage_summary:{
        available:sections.filter(s=>s.availability==='available').length,
        not_collected:sections.filter(s=>s.availability==='not_collected').length
      },
      sources,sections, disclaimers:[
        '표시 순서는 공개지침 기반 낌새 후보이며 의료기관 승인 서식이 아닙니다.',
        '최초 변화 관찰일은 질병 발병일이 아닙니다.',
        '미수집은 정상/음성이 아닙니다. 환자 입력은 병원 검증자료가 아닙니다.'
      ]
    };
  }
  return Object.freeze({resolve, safePath, presence});
});
