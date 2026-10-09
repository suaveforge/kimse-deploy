/* KIMSE Clinical Submission Gate · no hospital integration is asserted by this client module. */
(function(root){'use strict';
  const genericProfile=Object.freeze({
    id:'KR_GENERAL_CLINICAL_PRINT', country:'KR', scope:'generic_print_only',
    label:'국내 일반 진료용 · 방문 지참', version:'2026-10-09',
    hospitalId:null, receivingInstitutionVerified:false,
    medicalReviewerVerified:false, deliveryChannelVerified:false,
    allowedDelivery:'PRINT_OR_PATIENT_CARRIED_PDF',
    evidenceAnchors:Object.freeze([4,23,24,25,26,27,36])
  });
  const evaluate=(report)=>{
    const blockers=[],warnings=[];
    if(!report||typeof report!=='object')blockers.push('진료 리포트를 먼저 불러와야 합니다.');
    else {
      if(report.schema_version!=='KIMSE_CLINICAL_HANDOFF_PAYLOAD_V2')blockers.push('지원되는 의료리포트 데이터 형식이 아닙니다.');
      if(!report.report_context||!report.previsit_summary)blockers.push('관찰기간 또는 진료 전 핵심 요약이 없습니다.');
      if(!report.disclaimer)blockers.push('관찰과 의료 진단을 구분하는 안내가 없습니다.');
      const missing=(Array.isArray(report.clinical_coverage)?report.clinical_coverage:[]).filter(x=>x&&x.status!=='available');
      if(missing.length)warnings.push('아직 확인되지 않은 임상 영역 '+missing.length+'개가 있습니다. 미수집은 정상 소견이 아닙니다.');
      if(!report.subject?.display_name)warnings.push('환자 표시 이름이 제공되지 않았습니다. 실제 진료 전 환자 확인이 필요합니다.');
    }
    const printReady=blockers.length===0;
    return Object.freeze({
      profileId:genericProfile.id,
      printReady,
      printStatus:printReady?'READY_FOR_PATIENT_DELIVERY':'DATA_INCOMPLETE',
      printBlockers:Object.freeze(blockers),
      warnings:Object.freeze(warnings),
      electronicSubmissionReady:false,
      electronicStatus:'NO_VERIFIED_DESTINATION',
      receivingInstitution:null,
      deliveryReceipt:null,
      electronicBlockers:Object.freeze([
        '검증된 병원별 제출 프로파일과 수신 주소가 없습니다.',
        '기관의 환자 매칭·제공 동의·서식 검증·보안 전송·수신 확인이 필요합니다.'
      ])
    });
  };
  root.KIMSE_CLINICAL_SUBMISSION=Object.freeze({genericProfile,evaluate});
})(typeof window!=='undefined'?window:globalThis);
