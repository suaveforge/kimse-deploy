import { DrowsinessDemoEngine } from './drowsiness-demo-core.mjs';

const el = id => document.getElementById(id);
const video = el('camera');
const canvas = el('overlay');
const context = canvas.getContext('2d');
const startButton = el('start');
const stopButton = el('stop');
const engine = new DrowsinessDemoEngine();
let stream = null;
let landmarker = null;
let audioContext = null;
let animationFrame = 0;
let session = 0;
let lastVideoTime = -1;
let lastAnalysisAt = 0;
let lastAlertAt = -Infinity;

function setStatus(title, detail, level = 'waiting') {
  const titleNode = el('status-title');
  const detailNode = el('status-detail');
  if (titleNode.textContent !== title) titleNode.textContent = title;
  if (detailNode.textContent !== detail) detailNode.textContent = detail;
  if (el('status').dataset.level !== level) el('status').dataset.level = level;
}
function formatSeconds(ms) {
  return (Math.max(0, ms) / 1000).toFixed(1) + '초';
}
function clearMetrics() {
  el('blink').textContent = '—';
  el('duration').textContent = '—';
  el('ratio').textContent = '—';
}
function updateMetrics(result) {
  if (!result.detected) {
    clearMetrics();
    setStatus('얼굴을 찾는 중', '카메라에 얼굴이 잘 보이도록 위치를 조정하세요.', 'waiting');
    return;
  }
  el('blink').textContent = Math.round(result.blinkScore * 100) + '%';
  el('duration').textContent = formatSeconds(result.closedDurationMs);
  el('ratio').textContent = result.observedMs >= 1500
    ? Math.round(result.closedRatio * 100) + '%' : '측정 중';
  if (result.warning) {
    setStatus('눈 감김 경고 시연', '눈을 오래 감은 패턴이 관찰됐습니다. 실제 졸음 판정은 아닙니다.', 'alert');
  } else if (result.closed) {
    setStatus('양쪽 눈 감김 감지', '눈 감김 지속시간을 측정 중입니다.', 'normal');
  } else {
    setStatus('얼굴 특징점 추적 중', '눈을 감았다 뜨면서 값의 변화를 확인해 보세요.', 'normal');
  }
}
function clearOverlay() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}
function drawEyePoints(points) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width; canvas.height = height;
  }
  clearOverlay();
  if (!points || !points.length) return;
  context.strokeStyle = '#68ecd5';
  context.fillStyle = '#68ecd5';
  context.lineWidth = Math.max(1.5, width / 320);
  const groups = [[33, 160, 158, 133, 153, 144], [362, 385, 387, 263, 373, 380]];
  for (const group of groups) {
    const selected = group.map(index => points[index]).filter(Boolean);
    if (selected.length !== group.length) continue;
    context.beginPath();
    selected.forEach((p, index) => index
      ? context.lineTo(p.x * width, p.y * height)
      : context.moveTo(p.x * width, p.y * height));
    context.closePath();
    context.stroke();
    for (const p of selected) {
      context.beginPath();
      context.arc(p.x * width, p.y * height, Math.max(2, width / 250), 0, Math.PI * 2);
      context.fill();
    }
  }
}
function playAlert() {
  if (!el('voice').checked) return;
  try {
    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    if (audioContext) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.32);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.34);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('눈 감김 경고 테스트입니다.');
      utterance.lang = 'ko-KR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  } catch (error) {
    // Audio may be unavailable in restrictive browser settings; visual warning still works.
  }
}
function stop(resetText = true) {
  ++session;
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  engine.reset();
  lastVideoTime = -1;
  lastAnalysisAt = 0;
  lastAlertAt = -Infinity;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.pause();
  video.srcObject = null;
  if (landmarker) {
    try { landmarker.close(); } catch (error) { /* best effort cleanup */ }
    landmarker = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
  clearOverlay();
  clearMetrics();
  el('visual').dataset.active = 'false';
  startButton.disabled = false;
  stopButton.disabled = true;
  startButton.textContent = '카메라 시작';
  if (resetText) setStatus('카메라 중지됨', '다시 시작을 눌러 체험할 수 있습니다.');
}
function frame(id) {
  if (id !== session || !stream || !landmarker) return;
  animationFrame = requestAnimationFrame(() => frame(id));
  const now = performance.now();
  if (now - lastAnalysisAt < 85 || video.readyState < 2 || lastVideoTime === video.currentTime) return;
  lastAnalysisAt = now;
  lastVideoTime = video.currentTime;
  try {
    const result = landmarker.detectForVideo(video, now);
    const categories = result.faceBlendshapes?.[0]?.categories || null;
    const state = engine.update(now, categories);
    updateMetrics(state);
    drawEyePoints(result.faceLandmarks?.[0] || null);
    if (state.warning && now - lastAlertAt >= 7000) {
      lastAlertAt = now;
      playAlert();
    }
  } catch (error) {
    stop(false);
    setStatus('분석 중 오류', '브라우저가 실시간 비전 분석을 완료하지 못했습니다. 다시 시작해 보세요.', 'alert');
  }
}
async function start() {
  if (stream || startButton.disabled) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    setStatus('카메라를 사용할 수 없음', 'HTTPS 주소와 카메라 지원 브라우저에서 실행하세요.', 'alert');
    return;
  }
  const id = ++session;
  startButton.disabled = true;
  startButton.textContent = '준비 중…';
  stopButton.disabled = false;
  setStatus('카메라 연결 중', '권한을 요청하고 얼굴 특징점 모델을 준비합니다.');
  try {
    const acquired = await navigator.mediaDevices.getUserMedia({
      audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    if (id !== session) {
      acquired.getTracks().forEach(track => track.stop());
      return;
    }
    stream = acquired;
    video.srcObject = stream;
    await video.play();
    if (id !== session) return;
    el('visual').dataset.active = 'true';
    setStatus('비전 모델 불러오는 중', '처음 실행할 때는 모델 파일을 다운로드합니다.');
    if (el('voice').checked && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtor();
        audioContext.resume().catch(() => {});
      } catch (error) { audioContext = null; }
    }
    const pkg = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/vision_bundle.mjs');
    const vision = await pkg.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm'
    );
    const created = await pkg.FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'CPU'
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    if (id !== session) { created.close(); return; }
    landmarker = created;
    stream.getVideoTracks().forEach(track => {
      track.addEventListener('ended', () => {
        if (id === session) stop();
      }, { once: true });
    });
    startButton.textContent = '분석 중';
    setStatus('분석 시작', '눈을 감았다 뜨면서 변화를 확인해 보세요.', 'normal');
    animationFrame = requestAnimationFrame(() => frame(id));
  } catch (error) {
    if (id !== session) return;
    const name = error?.name || '';
    stop(false);
    const denied = name === 'NotAllowedError' || name === 'PermissionDeniedError';
    const notFound = name === 'NotFoundError';
    setStatus('시작하지 못했습니다', denied
      ? '카메라 권한이 차단됐습니다. 브라우저 주소 표시줄에서 권한을 허용하세요.'
      : notFound ? '사용 가능한 카메라가 없습니다.'
      : '카메라 또는 비전 모델 로딩에 실패했습니다. 인터넷 연결과 브라우저를 확인하세요.', 'alert');
    console.error('Drowsiness demo start failed:', error);
  }
}
startButton.addEventListener('click', start);
stopButton.addEventListener('click', () => stop());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (stream || startButton.disabled)) stop();
});
window.addEventListener('pagehide', () => stop(false));
