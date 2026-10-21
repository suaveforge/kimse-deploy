// KIMSE Evidence: measurement-only eye aperture engine.
// Face landmarks from pretrained MediaPipe Face Landmarker (not an in-vehicle drowsiness classifier).
// PERCLOS is pupil occlusion over time; this landmark aperture proxy is NOT validated PERCLOS.
export const DROWSINESS_DEMO_VERSION = '2026.10.21.2';
export const REFERENCE_WINDOW_MS = 60_000;
export const MAX_FRAME_GAP_MS = 500; // Engineering missing-frame protection; NOT a clinical cutoff.
export const REFERENCE_OPEN_FRACTION = 0.20; // 80% eyelid closure research definition; measured here only as an aperture proxy.

export const EYE_POINTS = Object.freeze({
  left: Object.freeze([33, 133, 160, 144, 158, 153]),
  right: Object.freeze([362, 263, 385, 380, 387, 373])
});

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (x) => Math.min(1, Math.max(0, x));
function distance(a, b) {
  if (!a || !b || !finite(a.x) || !finite(a.y) || !finite(b.x) || !finite(b.y)) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function eyeAspectRatio(landmarks, indices) {
  if (!Array.isArray(landmarks) || !Array.isArray(indices) || indices.length !== 6) return null;
  const p = indices.map((i) => landmarks[i]);
  const width = distance(p[0], p[1]);
  const v1 = distance(p[2], p[3]);
  const v2 = distance(p[4], p[5]);
  if (!finite(width) || width <= 0 || !finite(v1) || !finite(v2)) return null;
  return (v1 + v2) / (2 * width); // Eye Aspect Ratio (EAR), unitless.
}
export function extractEyeRatios(faceLandmarks) {
  const left = eyeAspectRatio(faceLandmarks, EYE_POINTS.left);
  const right = eyeAspectRatio(faceLandmarks, EYE_POINTS.right);
  if (!finite(left) || !finite(right) || left <= 0 || right <= 0) return null;
  return {left, right};
}
export function median(values) {
  const sorted = (Array.isArray(values) ? values : []).filter(finite).sort((a,b) => a-b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
}
export function buildCalibration(openSamples, closedSamples) {
  if (!Array.isArray(openSamples) || !Array.isArray(closedSamples)
    || openSamples.length < 8 || closedSamples.length < 8) {
    throw new Error('열린 눈과 감은 눈 각각 유효한 프레임 8개 이상이 필요합니다.');
  }
  const calibration = {
    open: {left: median(openSamples.map(v=>v.left)), right: median(openSamples.map(v=>v.right))},
    closed: {left: median(closedSamples.map(v=>v.left)), right: median(closedSamples.map(v=>v.right))}
  };
  for (const side of ['left','right']) {
    // Only verifies that a measurable difference exists; never diagnoses drowsiness.
    if (!finite(calibration.open[side]) || !finite(calibration.closed[side])
      || calibration.open[side] <= calibration.closed[side]) {
      throw new Error('눈 개방·감김 보정이 구분되지 않았습니다. 정면에서 다시 측정해주세요.');
    }
  }
  return calibration;
}
export function apertureFractions(ratios, calibration) {
  if (!ratios || !calibration) return null;
  const result = {};
  for (const side of ['left','right']) {
    const span = calibration.open?.[side] - calibration.closed?.[side];
    if (!finite(span) || span <= 0 || !finite(ratios[side])) return null;
    result[side] = clamp((ratios[side] - calibration.closed[side]) / span);
  }
  return result;
}

export class EyeApertureMeasurement {
  constructor({windowMs = REFERENCE_WINDOW_MS, maxFrameGapMs = MAX_FRAME_GAP_MS} = {}) {
    this.windowMs = windowMs;
    this.maxFrameGapMs = maxFrameGapMs;
    this.calibration = null;
    this.reset();
  }
  reset() {
    this.intervals = [];
    this.events = [];
    this.last = null;
    this.closedSince = null;
    this.startedAt = null;
  }
  setCalibration(calibration) {
    for (const side of ['left','right']) {
      if (!finite(calibration?.open?.[side]) || !finite(calibration?.closed?.[side])
        || calibration.open[side] <= calibration.closed[side]) throw new Error('Invalid calibration');
    }
    this.calibration = calibration;
    this.reset();
  }
  invalidate() {
    // Never join measurements across missing-face, occlusion, or dropped-frame gaps.
    this.last = null;
    this.closedSince = null;
  }
  update(timeMs, ratios) {
    if (!finite(timeMs)) throw new TypeError('Expected a monotonic timestamp');
    if (!this.calibration || !ratios) {
      this.invalidate();
      return {detected:false, calibrated:!!this.calibration, observedMs:0, referenceRatio:null, coverage:null};
    }
    const fractions = apertureFractions(ratios, this.calibration);
    if (!fractions) {
      this.invalidate();
      return {detected:false, calibrated:true, observedMs:0, referenceRatio:null, coverage:null};
    }
    const referenceClosure = fractions.left <= REFERENCE_OPEN_FRACTION
      && fractions.right <= REFERENCE_OPEN_FRACTION;
    if (this.startedAt === null) this.startedAt = timeMs;
    if (this.last && timeMs <= this.last.timeMs) throw new RangeError('Frame timestamps must increase');
    if (this.last && timeMs - this.last.timeMs <= this.maxFrameGapMs) {
      this.intervals.push({
        start: this.last.timeMs,
        end: timeMs,
        closed: this.last.closed
      });
      if (this.last.closed && !referenceClosure && this.closedSince !== null) {
        this.events.push({start: this.closedSince, end: timeMs, durationMs: timeMs - this.closedSince});
        if (this.events.length > 50) this.events.shift();
      }
    } else if (this.last) {
      this.closedSince = null;
    }
    if (referenceClosure && this.closedSince === null) this.closedSince = timeMs;
    if (!referenceClosure) this.closedSince = null;
    this.last = {timeMs, closed:referenceClosure};
    const cutoff = timeMs - this.windowMs;
    while (this.intervals.length && this.intervals[0].end <= cutoff) this.intervals.shift();
    let observedMs = 0, referenceClosedMs = 0;
    for (const interval of this.intervals) {
      const duration = Math.max(0, interval.end - Math.max(interval.start, cutoff));
      observedMs += duration;
      if (interval.closed) referenceClosedMs += duration;
    }
    return {
      detected:true,
      calibrated:true,
      ratios,
      fractions,
      referenceClosure,
      ongoingClosureMs: referenceClosure && this.closedSince !== null ? timeMs - this.closedSince : 0,
      observedMs,
      referenceClosedMs,
      referenceRatio: observedMs > 0 ? referenceClosedMs / observedMs : null,
      coverage: observedMs / this.windowMs,
      windowMs: this.windowMs,
      // This is a landmark-based reference indicator, NOT a clinically validated PERCLOS result.
      events: this.events.slice(-5)
    };
  }
}
