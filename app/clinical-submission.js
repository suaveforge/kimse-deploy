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
  root.KIMSE_CLINICAL_SUBMISSION=Object.freeze({genericProfile,countryLabels,researchTargets,getTargets,getSelection,setSelection,evaluate});
})(typeof window!=='undefined'?window:globalThis);
