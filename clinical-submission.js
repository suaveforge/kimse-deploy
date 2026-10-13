/* KIMSE Clinical Submission · patient-carried print and research-only target discovery.
 * Published referral instructions DO NOT authorize KIMSE to deliver to a hospital.
 * The module makes no outbound requests and stores selections in memory only.
 */
(function(root){'use strict';
  const genericProfile=Object.freeze({
    id:'KR_GENERAL_CLINICAL_PRINT', country:'KR', scope:'generic_print_only',
    label:'국내 일반 진료용 · 방문 지참', version:'2026-10-09',
    hospitalId:null, receivingInstitutionVerified:false,
    medicalReviewerVerified:false, deliveryChannelVerified:false,
    allowedDelivery:'PRINT_OR_PATIENT_CARRIED_PDF',
    evidenceAnchors:Object.freeze([4,23,24,25,26,27,36])
  });
  const countryLabels=Object.freeze({KR:'대한민국',GB:'영국',US:'미국',CA:'캐나다',AU:'호주',JP:'일본'});
  // Deterministic projection of clinical-profile-authorities.json / clinical-public-form-crosswalk.json.
  // tools/smoke-clinical-submission.mjs asserts all 11 identities/91 groups match their canonical registry.
  // The actual requirements and clinician-specific approvals remain external/unknown.
  const researchTargets=Object.freeze([
    {
      "id": "KR-SNUH-OUTPATIENT",
      "country": "KR",
      "name": "서울대학교병원",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.snuh.org/content/Q005001003.do",
      "publishedResearchGroups": 4,
      "officialResearchStatus": "PUBLIC_RESEARCH_ONLY",
      "routeConflict": false
    },
    {
      "id": "KR-AMC-NEURO-MEMORY",
      "country": "KR",
      "name": "서울아산병원",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://amcmg.amc.seoul.kr/asan/staff/base/staffBaseInfoDetail.do?drEmpId=d011eCtGRkxaS0dVSmY2TnJ4d1NKQT09&searchHpCd=D030",
      "publishedResearchGroups": 2,
      "officialResearchStatus": "PUBLIC_RESEARCH_ONLY",
      "routeConflict": false
    },
    {
      "id": "GB-DORSET-MAS",
      "country": "GB",
      "name": "Dorset HealthCare NHS Memory Assessment",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.dorsethealthcare.nhs.uk/our-services-and-sites/mental-health-and-learning-disabilities/memory-assessment/referral-form-gps-and-other-professionals",
      "publishedResearchGroups": 19,
      "officialResearchStatus": "PUBLIC_RESEARCH_ONLY",
      "routeConflict": false
    },
    {
      "id": "GB-CNTW-MAMS",
      "country": "GB",
      "name": "CNTW NHS MAMS",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.cntw.nhs.uk/resources/memory-assessment-and-management-service-mams-referrer-leaflet",
      "publishedResearchGroups": 8,
      "officialResearchStatus": "PUBLIC_RESEARCH_ONLY",
      "routeConflict": false
    },
    {
      "id": "GB-LEEDS-MAS",
      "country": "GB",
      "name": "Leeds and York NHS Memory Assessment",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.leedsandyorkpft.nhs.uk/our-services/older-peoples-community-services/memory-assessment-service/",
      "publishedResearchGroups": 6,
      "officialResearchStatus": "PUBLIC_RESEARCH_ONLY",
      "routeConflict": false
    },
    {
      "id": "GB-NORTHUMBRIA",
      "country": "GB",
      "name": "Northumbria NHS Memory Clinic",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.northumbria.nhs.uk/our-services/elderly-care/mental-health-services-older-people/memory-clinic-north-tyneside",
      "publishedResearchGroups": 5,
      "officialResearchStatus": "PUBLIC_RESEARCH_ONLY",
      "routeConflict": false
    },
    {
      "id": "US-MAYO-NEURO",
      "country": "US",
      "name": "Mayo Clinic Neurology Referrals",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.mayoclinic.org/medical-professionals/neurology-neurosurgery/referrals",
      "publishedResearchGroups": 4,
      "officialResearchStatus": "PUBLIC_RESEARCH_ONLY",
      "routeConflict": false
    },
    {
      "id": "CA-UHN-MEMORY-FORM",
      "country": "CA",
      "name": "University Health Network · Toronto Western Memory Clinic",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.uhn.ca/UHNReferrals/Memory_Clinic_Referral_Form.pdf",
      "publishedResearchGroups": 11,
      "officialResearchStatus": "PUBLIC_REFERRAL_FORM_NO_KIMSE_APPROVAL",
      "routeConflict": false
    },
    {
      "id": "AU-NSW-HORNSBY-MEMORY",
      "country": "AU",
      "name": "Hornsby Ku-ring-gai Hospital Memory Clinic (Northern Sydney Local Health District)",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.nslhd.health.nsw.gov.au/Services/Pages/MemClin-HKH.aspx",
      "publishedResearchGroups": 10,
      "officialResearchStatus": "OFFICIAL_HOSPITAL_MEMORY_REFERRAL_GUIDE_NOT_APPROVED",
      "routeConflict": false
    },
    {
      "id": "JP-KYORIN-SUGINAMI-MEMORY",
      "country": "JP",
      "name": "Kyorin University Suginami Hospital Memory Clinic",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.kyorin-u.ac.jp/hospital/suginami/clinic/monowasure/",
      "publishedResearchGroups": 7,
      "officialResearchStatus": "OFFICIAL_SPECIALTY_MEMORY_CLINIC_GUIDE_NOT_APPROVED",
      "routeConflict": false
    },
    {
      "id": "US-EMORY-COGNITIVE-NEUROLOGY",
      "country": "US",
      "name": "Emory Healthcare Cognitive Neurology Clinic",
      "specialty": "공개 진료·의뢰 자료 조사 (진료과 미승인)",
      "url": "https://www.emoryhealthcare.org/services/neuro/Programs/cognitive-neurology-program/refer-a-patient",
      "publishedResearchGroups": 15,
      "officialResearchStatus": "OFFICIAL_PUBLIC_REFERRAL_UNRESOLVED_ROUTE_CONFLICT_NOT_KIMSE_APPROVED",
      "routeConflict": true
    }
  ].map(x=>Object.freeze({...x,sourceStatus:'PUBLIC_RESEARCH_ONLY',kimseIntegration:'NOT_CONNECTED',hospitalApproved:false,clinicalReviewed:false,verifiedReceivingDepartment:false,verifiedClinician:false,approvedTransport:false}))); 
  let selection={country:'KR',institutionId:'',department:'',clinician:''};
  let officialRequirements=null, requirementsPromise=null, requirementsState='NOT_LOADED';
  const getRequirementsState=()=>requirementsState;
  const getResearchRequirements=id=>{
    const code=safeText(id??selection.institutionId,80);
    if(!officialRequirements||!researchTargets.some(t=>t.id===code))return null;
    return officialRequirements.get(code)||null;
  };
  const loadResearchRequirements=()=>{
    if(requirementsState==='PUBLIC_RESEARCH_LOADED')return Promise.resolve(true);
    if(requirementsPromise)return requirementsPromise;
    if(typeof fetch!=='function'){
      requirementsState='UNAVAILABLE';
      return Promise.resolve(false);
    }
    requirementsState='LOADING';
    requirementsPromise=fetch('./clinical-public-form-crosswalk.json',{credentials:'omit',cache:'no-store'})
      .then(response=>{
        if(!response.ok)throw Error('OFFICIAL_RESEARCH_UNAVAILABLE');
        return response.json();
      }).then(data=>{
        if(data.status!=='PUBLIC_SOURCE_CROSSWALK_NOT_INSTITUTION_APPROVAL' ||
           data.entry_count!==11||data.published_research_groups!==91||!Array.isArray(data.entries) ||
           data.entries.length!==researchTargets.length)throw Error('INVALID_UNAPPROVED_RESEARCH_LEDGER');
        const next=new Map();
        for(const target of researchTargets){
          const entry=data.entries.find(e=>e?.id===target.id);
          if(!entry||entry.country!==target.country||entry.source_url!==target.url||
             entry.approval_status==='APPROVED'||!Array.isArray(entry.requirement_groups)||
             entry.requirement_groups.length!==target.publishedResearchGroups)throw Error('RESEARCH_LEDGER_DRIFT');
          const requirements=entry.requirement_groups.map(g=>{
            if(!g?.id||!g.wording||!g.limit||!g.status||
               !Array.isArray(g.related_paths)||g.interpretation==='INSTITUTION_APPROVED')
              throw Error('INVALID_RESEARCH_REQUIREMENT');
            return Object.freeze({id:safeText(g.id,90),wording:safeText(g.wording,500),
              limit:safeText(g.limit,500),status:safeText(g.status,110),
              relatedPaths:Object.freeze(g.related_paths.map(x=>safeText(x,130))),
              sourceUrl:safeText(g.source_url||entry.source_url,700),
              sourcePage:Number.isInteger(g.source_page)&&g.source_page>0?g.source_page:null,
              sourceHeading:safeText(g.source_heading,200)});
          });
          next.set(target.id,Object.freeze({sourceStatus:'PUBLIC_RESEARCH_ONLY',
            institutionId:target.id,requirementGroups:Object.freeze(requirements)}));
        }
        officialRequirements=next;
        requirementsState='PUBLIC_RESEARCH_LOADED';
        return true;
      }).catch(()=>{
        officialRequirements=null;
        requirementsState='UNAVAILABLE';
        return false;
      });
    return requirementsPromise;
  };

  const safeText=(v,max=100)=>String(v??'').trim().slice(0,max);
  const getTargets=country=>researchTargets.filter(x=>x.country===country);
  const getSelection=()=>Object.freeze({...selection});
  const setSelection=next=>{
    const input=next&&typeof next==='object'?next:{};
    const country=Object.hasOwn(countryLabels,input.country)?input.country:selection.country;
    const candidate=Object.hasOwn(input,'institutionId')?safeText(input.institutionId,80):(country===selection.country?selection.institutionId:'');
    const institutionId=getTargets(country).some(x=>x.id===candidate)?candidate:'';
    const changedDestination=country!==selection.country||institutionId!==selection.institutionId;
    selection={
      country,institutionId,
      department:safeText(input.department??(changedDestination?'':selection.department)),
      clinician:safeText(input.clinician??(changedDestination?'':selection.clinician))
    };
    return getSelection();
  };
  const evaluate=(report,override)=>{
    const choice=override?{
      country:Object.hasOwn(countryLabels,override.country)?override.country:'KR',
      institutionId:safeText(override.institutionId,80),
      department:safeText(override.department),
      clinician:safeText(override.clinician)
    }:getSelection();
    const target=getTargets(choice.country).find(x=>x.id===choice.institutionId)||null;
    const blockers=[],warnings=[];
    if(!report||typeof report!=='object')blockers.push('진료 리포트를 먼저 불러와야 합니다.');
    else {
      if(report.schema_version!=='KIMSE_CLINICAL_HANDOFF_PAYLOAD_V2')blockers.push('지원되는 의료리포트 데이터 형식이 아닙니다.');
      const context=report.report_context;
      const summary=report.previsit_summary;
      const validDay=value=>{
        if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
        const date=new Date(value+'T00:00:00Z');
        return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
      };
      if(!context||typeof context!=='object'||Array.isArray(context)||!validDay(context.window_start)||!validDay(context.window_end)||context.window_start>context.window_end)
        blockers.push('관찰기간의 시작일·종료일을 확인해야 합니다.');
      if(!summary||typeof summary!=='object'||Array.isArray(summary)||!String(summary.handoff_reason||'').trim())
        blockers.push('진료 전 핵심 요약과 상담 사유가 없습니다.');
      if(typeof report.disclaimer!=='string'||!report.disclaimer.trim())
        blockers.push('관찰과 의료 진단을 구분하는 안내가 없습니다.');
      if(!Array.isArray(report.clinical_coverage)||report.clinical_coverage.length===0)
        blockers.push('임상 항목별 수집·결측 상태가 없습니다.');
      else if(!report.clinical_coverage.some(x=>x&&x.status==='available'))
        blockers.push('실제 수집된 임상·관찰 자료가 없어 진료 전달용 요약을 만들 수 없습니다.');
      const missing=(Array.isArray(report.clinical_coverage)?report.clinical_coverage:[]).filter(x=>x&&x.status!=='available');
      if(missing.length)warnings.push('아직 확인되지 않은 임상 영역 '+missing.length+'개가 있습니다. 미수집은 정상 소견이 아닙니다.');
      if(!report.subject?.display_name)warnings.push('환자 표시 이름이 제공되지 않았습니다. 실제 진료 전 환자 확인이 필요합니다.');
    }
    if(choice.country!=='KR')warnings.push('현재 출력물은 한국어 일반 진료용입니다. 선택한 국가·기관에 맞춘 서식 검증이나 현지화는 완료되지 않았습니다.');
    if(target)warnings.push('선택한 기관은 공개 진료·의뢰 안내 조사 대상이며 KIMSE 리포트 수신 승인 기관이 아닙니다.');
    if(choice.clinician)warnings.push('입력한 의료진의 실재·진료과·리포트 선호·수신 권한은 확인되지 않았습니다.');
    const printReady=blockers.length===0;
    return Object.freeze({
      profileId:genericProfile.id, selection:Object.freeze({...choice}),
      selectedResearchTarget:target,
      printReady,printStatus:printReady?'READY_FOR_PATIENT_DELIVERY':'DATA_INCOMPLETE',
      printBlockers:Object.freeze(blockers),warnings:Object.freeze(warnings),
      electronicSubmissionReady:false,
      electronicStatus:target?'REQUIREMENTS_UNVERIFIED':'NO_VERIFIED_DESTINATION',
      receivingInstitution:null,deliveryReceipt:null,
      electronicBlockers:Object.freeze([
        target?'해당 기관의 공개 의뢰 안내는 KIMSE 직접 제출 승인이 아닙니다.':'검증된 병원별 제출 프로파일과 수신 주소가 없습니다.',
        '의료진 검수·기관 요구사항 승인·환자매칭·제공 동의·서식 검증·보안 채널·기관 수신 ACK 검증이 필요합니다.'
      ])
    });
  };

  // CL11: Research-only readiness crosswalk for *each* official public group.
  // This only distinguishes candidate KIMSE reference data from missing material
  // and externally sourced documents. It NEVER marks a hospital requirement met.
  const CLINICAL_GROUP_STATE=Object.freeze({
    NO_DIRECT_APP_MAPPING:'앱의 직접 대응 필드 없음 · 외부 확인',
    RELATED_CONTEXT_NOT_COLLECTED:'앱의 관련 기록 미수집·미확인',
    APP_CONTEXT_REFERENCE_ONLY:'앱에 관련 참고 기록 있음 · 공식 자료 대체 불가'
  });
  const coverageForPath=Object.freeze({
    'clinical_domains.function_independence':'function',
    'clinical_domains.cognition':'cognition',
    'family_feedback':'informant',
    'professional_outcomes':'professional',
    'professional_outcomes.validated_assessments':'professional',
    'external_clinical_records':'professional',
    'risk_confounders':'risk_confounders',
    'risk_confounders.current_medications':'risk_confounders'
  });
  const hasActualValue=value=>{
    if(value===null||value===undefined||value==='')return false;
    if(typeof value==='number')return Number.isFinite(value); // 0 is a measured value.
    if(typeof value==='string')return !!value.trim();
    if(Array.isArray(value))return value.some(hasActualValue);
    if(typeof value==='object'){
      // A status marker is not the measurement it describes. Preserve true zeros
      // and explicitly reported normal states, but never turn missing metadata
      // into a clinical observation or a negative finding.
      const status=typeof value.status==='string'?value.status.toLowerCase():'';
      if(['missing','not_collected','not_available','unavailable','unknown','not_recorded','not_observed','not_provided'].includes(status))return false;
      const metadata=new Set(['status','guard','source_type','evidence_refs','unit','recorded_at','collected_at','updated_at']);
      return Object.entries(value).some(([key,entry])=>!metadata.has(key)&&hasActualValue(entry));
    }
    return typeof value==='boolean'; // false is a real observation, not "missing".
  };
  const pathHasRecord=(report,path)=>{
    if(!report||typeof report!=='object'||typeof path!=='string')return false;
    const allowed=/^(report_context|subject|previsit_summary|clinical_domains|risk_confounders|clinical_context|clinical_context_events|external_clinical_records|professional_outcomes|family_feedback|monitoring|alerts|timeline|cooccurrence|clinical_coverage)(?:\.[a-zA-Z_][a-zA-Z_0-9]*)*$/;
    if(!allowed.test(path))return false;
    const coverageId=coverageForPath[path];
    if(coverageId){
      const status=(Array.isArray(report.clinical_coverage)?report.clinical_coverage:[]).find(x=>x?.id===coverageId)?.status;
      if(status!=='available')return false;
    }
    const node=path.split('.').reduce((value,key)=>value&&typeof value==='object'?value[key]:undefined,report);
    return hasActualValue(node);
  };
  // Classification is based only on the published crosswalk's source status.
  // It is a patient preparation aid, never a hospital-approved checklist.
  const preparationKind=status=>{
    if(/APPROVED_CHANNEL|PARTNER_APPROVAL|INSTITUTION_REVIEW|AUTHORIZED_REFERRER|ROUTE_CONFLICT|EXTERNAL_APPOINTMENT|EXTERNAL_PATIENT_ADMINISTRATIVE|EXTERNAL_CLINICIAN_REFERRAL/.test(status))return 'PROVIDER_PROCESS';
    if(/EXTERNAL|PROFESSIONAL|CLINICIAN_ASSESSMENT|VALIDATED/.test(status))return 'EXTERNAL_CLINICAL_MATERIAL';
    if(/CAPTURE_DEPENDENT|NOT_YET_SUPPORTED|UNIMPLEMENTED|CANDIDATE_USER_REPORT|PARTIAL|INFORMANT_PARTICIPATION/.test(status))return 'PATIENT_OR_FAMILY_CONFIRMATION';
    return 'OBSERVATION_REFERENCE';
  };
  const preparationLabels=Object.freeze({
    PROVIDER_PROCESS:'의료기관·의뢰 절차 확인',
    EXTERNAL_CLINICAL_MATERIAL:'외부 검사·원본 기록 준비',
    PATIENT_OR_FAMILY_CONFIRMATION:'본인·가족 추가 확인',
    OBSERVATION_REFERENCE:'낌새 관찰·진료 참고'
  });
  // Projected from app/clinical-profile-authorities.json, verified by smoke tests.
  // This is a published-source display order, not a validated specialty protocol.
  const countryPublicClinicalPriority=Object.freeze({
  "KR": {
    "profileName": "대한민국 진료전 요약 후보",
    "priorities": [
      {
        "id": "consultation_reason",
        "label": "상담·의뢰 사유",
        "path": "previsit_summary.handoff_reason"
      },
      {
        "id": "onset_trajectory",
        "label": "관찰된 변화의 시작·순서·지속",
        "path": "previsit_summary.first_observed_change_at"
      },
      {
        "id": "cognitive_history",
        "label": "인지 관련 변화/반복과제",
        "path": "clinical_domains.cognition"
      },
      {
        "id": "function_independence",
        "label": "ADL·IADL·안전 영향",
        "path": "clinical_domains.function_independence"
      },
      {
        "id": "informant_history",
        "label": "가족·보호자 정보·불일치",
        "path": "clinical_domains.subjective_change"
      }
    ],
    "sources": [
      {
        "id": "KR-KDA-2021",
        "url": "https://www.dementia.or.kr/bbs/?code=guideline",
        "status": "OFFICIAL_PUBLISHED_2022_NEEDS_CURRENTNESS_REVIEW",
        "metadataOnly": false
      },
      {
        "id": "US-AA-DETECD-2025",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12173843/",
        "status": "PUBLISHED_PRIMARY_GUIDELINE",
        "metadataOnly": false
      }
    ]
  },
  "GB": {
    "profileName": "영국 Memory Assessment 후보",
    "priorities": [
      {
        "id": "consultation_reason",
        "label": "상담·의뢰 사유",
        "path": "previsit_summary.handoff_reason"
      },
      {
        "id": "onset_trajectory",
        "label": "관찰된 변화의 시작·순서·지속",
        "path": "previsit_summary.first_observed_change_at"
      },
      {
        "id": "informant_history",
        "label": "가족·보호자 정보·불일치",
        "path": "clinical_domains.subjective_change"
      },
      {
        "id": "function_independence",
        "label": "ADL·IADL·안전 영향",
        "path": "clinical_domains.function_independence"
      },
      {
        "id": "cognitive_history",
        "label": "인지 관련 변화/반복과제",
        "path": "clinical_domains.cognition"
      }
    ],
    "sources": [
      {
        "id": "GB-NICE-NG97",
        "url": "https://www.nice.org.uk/guidance/ng97/chapter/recommendations",
        "status": "OFFICIAL_LIVE_GUIDANCE_REVIEWED_2025_10_NO_UPDATE",
        "metadataOnly": false
      }
    ]
  },
  "US": {
    "profileName": "미국 Primary/Specialty Care 후보",
    "priorities": [
      {
        "id": "consultation_reason",
        "label": "상담·의뢰 사유",
        "path": "previsit_summary.handoff_reason"
      },
      {
        "id": "onset_trajectory",
        "label": "관찰된 변화의 시작·순서·지속",
        "path": "previsit_summary.first_observed_change_at"
      },
      {
        "id": "informant_history",
        "label": "가족·보호자 정보·불일치",
        "path": "clinical_domains.subjective_change"
      },
      {
        "id": "cognitive_history",
        "label": "인지 관련 변화/반복과제",
        "path": "clinical_domains.cognition"
      },
      {
        "id": "function_independence",
        "label": "ADL·IADL·안전 영향",
        "path": "clinical_domains.function_independence"
      }
    ],
    "sources": [
      {
        "id": "US-AA-DETECD-2025",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12173843/",
        "status": "PUBLISHED_PRIMARY_GUIDELINE",
        "metadataOnly": false
      }
    ]
  },
  "CA": {
    "profileName": "캐나다 인지저하 평가 후보",
    "priorities": [
      {
        "id": "consultation_reason",
        "label": "상담·의뢰 사유",
        "path": "previsit_summary.handoff_reason"
      },
      {
        "id": "informant_history",
        "label": "가족·보호자 정보·불일치",
        "path": "clinical_domains.subjective_change"
      },
      {
        "id": "function_independence",
        "label": "ADL·IADL·안전 영향",
        "path": "clinical_domains.function_independence"
      },
      {
        "id": "cognitive_history",
        "label": "인지 관련 변화/반복과제",
        "path": "clinical_domains.cognition"
      },
      {
        "id": "mood_neuropsychiatric",
        "label": "기분·행동·정신증상 맥락",
        "path": "clinical_domains.mood_behavior"
      }
    ],
    "sources": [
      {
        "id": "CA-CCCDTD5-2020",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7657153/",
        "status": "PUBLISHED_2020_LATEST_LISTED_BY_CANADIAN_DEMENTIA_GUIDELINE_GROUP_2026_10",
        "metadataOnly": false
      }
    ]
  },
  "AU": {
    "profileName": "호주 1차 진료 후보",
    "priorities": [
      {
        "id": "consultation_reason",
        "label": "상담·의뢰 사유",
        "path": "previsit_summary.handoff_reason"
      },
      {
        "id": "informant_history",
        "label": "가족·보호자 정보·불일치",
        "path": "clinical_domains.subjective_change"
      },
      {
        "id": "onset_trajectory",
        "label": "관찰된 변화의 시작·순서·지속",
        "path": "previsit_summary.first_observed_change_at"
      },
      {
        "id": "cognitive_history",
        "label": "인지 관련 변화/반복과제",
        "path": "clinical_domains.cognition"
      },
      {
        "id": "function_independence",
        "label": "ADL·IADL·안전 영향",
        "path": "clinical_domains.function_independence"
      }
    ],
    "sources": [
      {
        "id": "AU-RACGP-2016",
        "url": "https://www.racgp.org.au/afp/2016/december/clinical-practice-guidelines-and-principles-of-car",
        "status": "OFFICIAL_HISTORICAL_2016_2026_DRAFT_CONSULTATION_ENDED_FINAL_UNVERIFIED",
        "metadataOnly": false
      }
    ]
  },
  "JP": {
    "profileName": "일본 인지저하 평가 후보",
    "priorities": [
      {
        "id": "consultation_reason",
        "label": "상담·의뢰 사유",
        "path": "previsit_summary.handoff_reason"
      },
      {
        "id": "onset_trajectory",
        "label": "관찰된 변화의 시작·순서·지속",
        "path": "previsit_summary.first_observed_change_at"
      },
      {
        "id": "informant_history",
        "label": "가족·보호자 정보·불일치",
        "path": "clinical_domains.subjective_change"
      },
      {
        "id": "cognitive_history",
        "label": "인지 관련 변화/반복과제",
        "path": "clinical_domains.cognition"
      },
      {
        "id": "function_independence",
        "label": "ADL·IADL·안전 영향",
        "path": "clinical_domains.function_independence"
      }
    ],
    "sources": [
      {
        "id": "JP-JSN-2026",
        "url": "https://webview.isho.jp/book/detail/abs/10.11477/9784260665537",
        "status": "OFFICIALLY_PUBLISHED_2026_METADATA_ONLY_CONTENT_NOT_REVIEWED",
        "metadataOnly": true
      },
      {
        "id": "JP-JSN-2017",
        "url": "https://www.neurology-jp.org/guidelinem/dementia/index.html",
        "status": "OFFICIAL_HISTORICAL_SUPERSEDED_BY_2026_PUBLICATION",
        "metadataOnly": false
      }
    ]
  }
});
  const buildCountryPriority=(report,country)=>{
    const profile=countryPublicClinicalPriority[country];
    if(!profile)return null;
    return Object.freeze({
      profileName:profile.profileName,country,providerApproved:false,clinicianApproved:false,
      officialTranslationVerified:false,
      priorities:Object.freeze(profile.priorities.map(row=>Object.freeze({
        ...row,recorded:pathHasRecord(report,row.path)
      }))),
      guidelineSources:Object.freeze(profile.sources.map(row=>Object.freeze({...row}))),
      note:'국가 공개 임상지침을 참고한 정보 확인 순서이며, 전문의 개인 선호·병원 승인 양식이 아닙니다. 없는 자료는 정상으로 판단하지 않습니다.'
    });
  };
  const assessResearchRequirements=(report,institutionId)=>{
    const research=getResearchRequirements(institutionId);
    if(!research)return null;
    const target=researchTargets.find(x=>x.id===institutionId);
    const groups=research.requirementGroups.map(group=>{
      const referencePaths=group.relatedPaths.filter(path=>pathHasRecord(report,path));
      const uncollectedPaths=group.relatedPaths.filter(path=>!pathHasRecord(report,path));
      const state=group.relatedPaths.length===0?'NO_DIRECT_APP_MAPPING':
        referencePaths.length?'APP_CONTEXT_REFERENCE_ONLY':'RELATED_CONTEXT_NOT_COLLECTED';
      return Object.freeze({
        id:group.id,wording:group.wording,limit:group.limit,sourceStatus:group.status,
         sourceUrl:group.sourceUrl,sourcePage:group.sourcePage,sourceHeading:group.sourceHeading,
         preparationKind:preparationKind(group.status),
         preparationLabel:preparationLabels[preparationKind(group.status)],
        relatedPaths:group.relatedPaths,referencePaths:Object.freeze(referencePaths),
        uncollectedPaths:Object.freeze(uncollectedPaths),state,
        display:CLINICAL_GROUP_STATE[state],
        hospitalApproved:false,formRequirementVerified:false,deliveryAuthorized:false,
        requiresExternalConfirmation:true
      });
    });
    const counts=Object.freeze({
      researchGroups:groups.length,
      appReferenceOnly:groups.filter(x=>x.state==='APP_CONTEXT_REFERENCE_ONLY').length,
      relatedUncollected:groups.filter(x=>x.state==='RELATED_CONTEXT_NOT_COLLECTED').length,
      noDirectMapping:groups.filter(x=>x.state==='NO_DIRECT_APP_MAPPING').length
    });
    return Object.freeze({
      institutionId,sourceStatus:'PUBLIC_RESEARCH_ONLY',
      routeConflict:!!target?.routeConflict,
      institutionApproved:false,allRequirementsMet:false,submissionReady:false,
      counts,groups:Object.freeze(groups)
    });
  };

  // Patient-carried hospital visit brief derived from exact published research.
  // It may assist preparation, but does NOT transform public advice into approved
  // institution requirements, hospital verification or electronic submission.
  const buildVisitBrief=(report,override)=>{
    const gate=evaluate(report,override);
    const choice=gate.selection;
    const target=gate.selectedResearchTarget;
    const assessment=target?assessResearchRequirements(report,target.id):null;
    const groups=assessment?.groups||[];
    const rank=group=>{
      const needsRecord=group.state==='RELATED_CONTEXT_NOT_COLLECTED';
      const external=group.state==='NO_DIRECT_APP_MAPPING';
      const externalSource=/EXTERNAL|DOCUMENT|PROFESSIONAL|PROVIDER|REFERRAL|TEST/.test(group.sourceStatus);
      return (externalSource?0:1)+(needsRecord?0:external?1:2);
    };
    const researchItems=groups.map(g=>Object.freeze({
      id:g.id,wording:g.wording,limit:g.limit,state:g.state,display:g.display,
      sourceStatus:g.sourceStatus,sourceUrl:g.sourceUrl,sourcePage:g.sourcePage,
      sourceHeading:g.sourceHeading,preparationKind:g.preparationKind,
      preparationLabel:g.preparationLabel,referencePaths:g.referencePaths,
      uncollectedPaths:g.uncollectedPaths
    }));
    const preparationCounts=Object.freeze(Object.fromEntries(
      Object.keys(preparationLabels).map(kind=>[kind,researchItems.filter(item=>item.preparationKind===kind).length])));
    const selected=groups
      .filter(g=>g.state!=='APP_CONTEXT_REFERENCE_ONLY')
      .slice().sort((a,b)=>rank(a)-rank(b))
      .slice(0,6).map(g=>Object.freeze({
        id:g.id,wording:g.wording,limit:g.limit,state:g.state,
        display:g.display,referencePaths:g.referencePaths,uncollectedPaths:g.uncollectedPaths,
        sourceStatus:g.sourceStatus,
        action:'EXTERNAL_SOURCE_OR_PATIENT_CONFIRMATION'
      }));
    return Object.freeze({
      country:choice.country,countryName:countryLabels[choice.country]||'국가 미확인',
      institutionId:target?.id||null,institutionName:target?.name||null,
      publicSourceUrl:target?.url||null,
      departmentMemo:choice.department,clinicianMemo:choice.clinician,
      memoVerified:false,providerApproved:false,formApproved:false,recipientAuthorized:false,
      delivery:'PATIENT_CARRIED_PRINT_ONLY',printReady:gate.printReady,
      outputLanguage:'ko',translationValidated:false,formatValidatedByHospital:false,
      researchLoaded:!!assessment,routeConflict:!!target?.routeConflict,
      researchedGroupCount:assessment?.counts.researchGroups||0,
      referenceOnlyCount:assessment?.counts.appReferenceOnly||0,
      uncollectedCount:assessment?.counts.relatedUncollected||0,
      noDirectMappingCount:assessment?.counts.noDirectMapping||0,
      briefItems:Object.freeze(selected),
      researchItems:Object.freeze(researchItems),preparationCounts,
      countryClinicalPriority:buildCountryPriority(report,choice.country),
      missingMoreCount:Math.max(0,groups.filter(g=>g.state!=='APP_CONTEXT_REFERENCE_ONLY').length-selected.length),
      caution:'이 문서는 환자 지참용 한국어 진료 준비 자료입니다. 병원 승인 서식이나 필수 제출자료 목록이 아니며, 미수집은 정상 소견이 아닙니다.',
      electronicSubmissionReady:false,hospitalReceipt:null
    });
  };
  root.KIMSE_CLINICAL_SUBMISSION=Object.freeze({genericProfile,countryLabels,researchTargets,getTargets,getSelection,setSelection,evaluate,getRequirementsState,loadResearchRequirements,getResearchRequirements,assessResearchRequirements,buildVisitBrief});
})(typeof window!=='undefined'?window:globalThis);
