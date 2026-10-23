/**
 * KIMSE Evidence — shared plain-language explanations of measurement provenance.
 * Loaded by both quick self-tests and Retell guest calls. No clinical score claims.
 */
(() => {
  'use strict';
  const methods = {
    pronunciation: {
      title: '발음 정확도는 어떻게 측정하나요?',
      kind: '상용 음성 AI 서비스',
      what: '화면에 나온 기준 문장을 읽은 녹음을 Microsoft의 Azure Speech로 보냅니다. 기준 발음과 얼마나 가깝게 발음했는지 단어·문장 단위로 반환받은 점수를 보여줍니다.',
      how: 'Azure가 돌려준 AccuracyScore를 그대로 표시합니다. 낌새에서 임의로 발음 점수를 만들어 붙이지 않습니다. Azure 전송에 동의하지 않았거나 서버가 점수를 반환하지 않으면 ‘미측정’입니다.',
      terms: [
        ['Azure Speech', 'Microsoft가 제공하는 상용 음성 AI 서비스. 발음 점수를 계산하는 엔진입니다.'],
        ['Pronunciation Assessment', 'Azure의 발음 평가 기능 이름입니다. 별도 논문 제목이 아닙니다.'],
        ['AccuracyScore', '발음이 기준과 얼마나 비슷한지 나타내는 점수입니다. 인지기능 점수가 아닙니다.']
      ],
      research: '직접 점수를 산출하는 근거는 Azure의 공식 서비스 설명과 API 결과입니다. 특정 치매 논문의 점수를 가져오는 것이 아닙니다.',
      limitation: '언어 학습용 발음 평가 결과입니다. 치매 위험이나 병적 발음장애를 판정하지 않고, 한국어 고령자 환경의 임상 정확도도 확인되지 않았습니다.',
      references: [
        ['Microsoft 공식 발음 평가 설명 · 제품 문서', 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment']
      ]
    },
    'self-delay': {
      title: '자가테스트 응답 지연은 어떻게 측정하나요?',
      kind: '오픈소스 음성 검출 기술 + 음향 분석',
      what: '녹음된 소리를 짧은 구간으로 나누고, 말하는 구간과 말하지 않는 구간을 구분합니다. 발화 시작과 발화 사이의 빈 시간을 기록합니다.',
      how: 'WebRTC VAD로 말소리 구간을 찾습니다. ‘질문이 끝난 시점’과 ‘녹음 시작 시점’의 시간 관계가 검증되지 않으면 질문 직후 반응 시간을 임의로 계산하지 않고 미측정 처리합니다.',
      terms: [
        ['WebRTC VAD', '소리 안에 사람 말소리가 있는지 판별하는 공개 음성 처리 기술입니다. VAD는 Voice Activity Detection(음성 구간 탐지)의 약자입니다.'],
        ['Speech timing', '말을 시작하고 끝내는 시점, 쉬는 시간 등을 재는 측정 방법입니다. 별도 진단 AI의 이름이 아닙니다.']
      ],
      research: 'König 등(2015)은 음성의 시간적 특징을 인지기능 연구에 활용할 수 있는지 조사했습니다. 이 논문이 낌새의 응답 지연 알고리즘 정확도를 검증한 것은 아닙니다.',
      limitation: '긴 침묵에는 질문 이해뿐 아니라 마이크 지연, 주변 소음, 생각 정리 등 여러 이유가 있을 수 있습니다. 측정된 시간을 인지저하 점수로 해석하지 않습니다.',
      references: [
        ['WebRTC VAD 공개 구현·기술 문서', 'https://github.com/wiseman/py-webrtcvad'],
        ['König 등(2015) 음성 분석 연구 · 학술논문', 'https://doi.org/10.1016/j.dadm.2014.11.012']
      ]
    },
    'retell-delay': {
      title: 'AI 통화의 응답 지연은 어떻게 측정하나요?',
      kind: '상용 AI 통화 서비스의 발화 기록 + 시간 계산',
      what: 'Retell이 기록한 ‘AI 상담사 질문의 마지막 단어 시각’과 ‘사용자 답변 첫 단어 시각’을 비교합니다. 측정 가능한 여러 문답의 지연 시간을 종합합니다.',
      how: 'Retell의 구조화된 대화(transcript_object)에 포함된 화자(agent/user)와 단어 시작·종료 시각으로 계산합니다. 질문 표시는 현재 문장부호를 기준으로 후보를 고르는 방식이므로 모든 질문을 검증했다고 볼 수 없습니다.',
      terms: [
        ['Retell AI', 'AI 전화·음성 상담을 연결하고 대화의 시각 정보를 제공하는 상용 플랫폼입니다. 이 항목의 독립적인 치매 판정 AI 모델은 아닙니다.'],
        ['Transcript', '통화에서 말한 내용을 글자로 옮긴 기록입니다.'],
        ['Word timestamps', '단어 하나하나가 시작하고 끝난 시각입니다. 오디오와 완벽히 일치하는지는 아직 검증되지 않았습니다.']
      ],
      research: '음성의 시간적 특징이 연구 대상이라는 배경은 König 등(2015) 같은 학술 연구에서 확인할 수 있습니다. 실제 수치는 논문에서 가져오는 것이 아니라 이번 Retell 통화 기록으로 계산합니다.',
      limitation: 'Retell 단어 시각은 근사값이고 네트워크·마이크·AI 응답 지연 등과 구분이 필요합니다. 측정된 대화 지연은 사고력이나 인지저하를 확정하지 않습니다.',
      references: [
        ['Retell 공식 통화 API 문서 · 제품 설명', 'https://docs.retellai.com/api-references/get-call'],
        ['König 등(2015) 음성 분석 연구 · 학술논문', 'https://doi.org/10.1016/j.dadm.2014.11.012']
      ]
    },
    modulation: {
      title: '목소리의 주기적 변조는 어떻게 측정하나요?',
      kind: '음향 분석 소프트웨어 + 신호처리 알고리즘',
      what: '‘아—’ 소리를 일정하게 길게 낸 녹음에서 목소리의 기본주파수(F0)가 시간에 따라 어떻게 변하는지 살펴봅니다. 주파수·음량에서 반복되는 변화 후보를 추출합니다.',
      how: 'Praat의 음향 분석 기능을 Parselmouth로 실행합니다. F0를 추정한 뒤 변화의 반복 주기를 3~12 Hz 범위에서 계산합니다. 통화 중 일반 대화로 임의 점수를 만들지 않습니다.',
      terms: [
        ['Praat', '언어·음성 연구에 널리 쓰이는 전문 음향 분석 프로그램입니다. 치매 판정 AI 모델은 아닙니다.'],
        ['Parselmouth', 'Praat 분석 기능을 Python 서버에서 쓰게 해주는 연결 라이브러리입니다. 별도 음성 AI 모델이 아닙니다.'],
        ['F0', '목소리의 기본주파수입니다. 대체로 높낮이와 관계있으며, 떨림 질환 여부를 뜻하지 않습니다.'],
        ['Hz', '1초에 몇 번 반복되는지를 나타내는 단위입니다. F0(목소리 높이)와 F0의 변조 주기는 서로 다른 수치입니다.']
      ],
      research: 'Praat·Parselmouth에 대한 자료는 분석 도구와 알고리즘의 출처입니다. Parselmouth 소개 논문(2018)은 소프트웨어를 설명한 것으로, 낌새의 질환 탐지 정확도를 입증한 논문은 아닙니다.',
      limitation: '표시된 주파수와 반복 변화는 음향적 특징입니다. 병적 음성 떨림, 파킨슨병 또는 치매를 판정할 임상 기준이나 검증된 위험 점수로 사용하지 않습니다.',
      references: [
        ['Praat 피치 분석 공식 매뉴얼 · 기술 문서', 'https://praat.org/manual/pitch_analysis_by_raw_autocorrelation.html'],
        ['Parselmouth 소개(2018) · 소프트웨어 논문', 'https://doi.org/10.1016/j.wocn.2018.07.001']
      ]
    }
  };
  const style = document.createElement('style');
  style.textContent = [
    '.kimse-evidence-help{display:inline-grid;place-items:center;flex:none;width:25px;height:25px;min-width:25px;padding:0;border:1px solid #a7cbbd;border-radius:50%;background:#f4faf7;color:#116c61;font:800 14px/1 system-ui;cursor:pointer}',
    '.kimse-evidence-help:hover{background:#e1f1eb}',
    '.kimse-evidence-help:focus-visible{outline:3px solid #3fac97;outline-offset:2px}',
    '.kimse-evidence-modal{border:1px solid #cddfd6;border-radius:18px;background:#fff;color:#203b3c;box-shadow:0 16px 50px #102b3038;padding:0;width:min(92vw,510px);max-height:min(83dvh,760px);overflow-y:auto;font:14px/1.55 system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif}',
    '.kimse-evidence-modal::backdrop{background:#091d22ac}',
    '.kimse-evidence-modal .em-body{padding:22px 22px 19px}',
    '.kimse-evidence-modal h2{font-size:21px;line-height:1.25;letter-spacing:-.035em;margin:4px 0 10px}',
    '.kimse-evidence-modal h3{font-size:14px;margin:16px 0 5px;color:#0b6157}',
    '.kimse-evidence-modal p{font-size:13px;margin:5px 0;color:#334e52}',
    '.kimse-evidence-modal .em-kind{font-weight:750;color:#087668;font-size:12px}',
    '.kimse-evidence-modal .em-current{background:#ecf7f2;border-radius:10px;padding:9px 11px;color:#155e53;font-size:12px;margin:10px 0 14px}',
    '.kimse-evidence-modal .em-term{border-top:1px solid #e5efeb;padding:8px 0}',
    '.kimse-evidence-modal .em-term strong{font-size:13px}',
    '.kimse-evidence-modal .em-term p{margin:2px 0 0}',
    '.kimse-evidence-modal .em-links{display:grid;gap:7px;margin:10px 0 0}',
    '.kimse-evidence-modal .em-links a{color:#087769;font-size:12px;text-decoration:underline;text-underline-offset:2px;font-weight:650}',
    '.kimse-evidence-modal .em-limit{background:#fff8eb;padding:11px;border-radius:10px}',
    '.kimse-evidence-modal .em-close{display:block;width:100%;margin-top:19px;border:0;border-radius:10px;background:#087668;color:#fff;font-size:14px;font-weight:800;padding:12px;cursor:pointer}',
    '@media(max-width:440px){.kimse-evidence-modal .em-body{padding:17px}.kimse-evidence-modal{max-height:85dvh}}'
  ].join('');
  document.head.appendChild(style);

  const dlg = document.createElement('dialog');
  dlg.className='kimse-evidence-modal';
  dlg.setAttribute('aria-label','측정 근거 설명');
  document.body.appendChild(dlg);
  const safe = str => String(str).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function open(method, btn) {
    const info=methods[method];if(!info)return;
    const card=btn.closest('.metric, .result');
    const value=(card?.querySelector('.metric-value, .value')?.textContent||'').trim();
    const terms=info.terms.map(([term,desc])=>'<div class="em-term"><strong>'+safe(term)+'</strong><p>'+safe(desc)+'</p></div>').join('');
    const sources=info.references.map(([name,url])=>'<a href="'+safe(url)+'" rel="noopener noreferrer" target="_blank">'+safe(name)+' ↗</a>').join('');
    dlg.innerHTML='<div class="em-body"><div class="em-kind">근거 분류 · '+safe(info.kind)+'</div><h2>'+safe(info.title)+'</h2>'+
      (value?'<div class="em-current">현재 화면에 표시된 값: <strong>'+safe(value)+'</strong></div>':'')+
      '<h3>무엇을 측정했나요?</h3><p>'+safe(info.what)+'</p>'+
      '<h3>이 수치는 어떻게 나왔나요?</h3><p>'+safe(info.how)+'</p>'+
      '<h3>영어 이름 쉽게 보기</h3>'+terms+
      '<h3>논문은 어떤 근거인가요?</h3><p>'+safe(info.research)+'</p>'+
      '<h3>결과를 해석할 때 주의할 점</h3><p class="em-limit">'+safe(info.limitation)+'</p>'+
      '<h3>원문 근거 확인</h3><div class="em-links">'+sources+'</div>'+
      '<button type="button" class="em-close">닫기</button></div>';
    if(typeof dlg.showModal==='function')dlg.showModal();
    else dlg.setAttribute('open','');
    dlg.querySelector('.em-close').focus();
  }
  document.addEventListener('click', e=>{
    if(e.target===dlg){dlg.close?.();return;}
    if(e.target.closest?.('.em-close')){dlg.close?.();dlg.removeAttribute('open');return;}
    const btn=e.target.closest?.('[data-evidence-method]');
    if(btn)open(btn.getAttribute('data-evidence-method'),btn);
  });
})();
