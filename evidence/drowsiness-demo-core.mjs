// Reusable, UI-independent blink-pattern demo engine.
// Inputs are MediaPipe Face Landmarker blendshape categories, not video frames.
// This is NOT a medical test or a validated in-vehicle drowsiness detector.
export const DROWSINESS_DEMO_VERSION = '0.1.0';
export const DEFAULT_OPTIONS = Object.freeze({
  blinkThreshold: 0.64,
  longClosureMs: 1400,
  windowMs: 6000,
  minWindowMs: 3500,
  closedRatioThreshold: 0.55,
  gapResetMs: 1000
});

export function extractEyeClosure(categories) {
  const values = new Map((Array.isArray(categories) ? categories : []).map(
    item => [item.categoryName, item.score]
  ));
  const left = values.get('eyeBlinkLeft');
  const right = values.get('eyeBlinkRight');
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  // Both eyes must close: a wink should not trigger a warning.
  return Math.max(0, Math.min(1, Math.min(left, right)));
}

export class DrowsinessDemoEngine {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.reset();
  }
  reset() {
    this.samples = [];
    this.closedSince = null;
    this.lastTime = null;
  }
  update(timeMs, categories) {
    if (!Number.isFinite(timeMs)) throw new TypeError('Expected a monotonic timestamp');
    const score = extractEyeClosure(categories);
    if (score === null || (this.lastTime !== null &&
        (timeMs < this.lastTime || timeMs - this.lastTime > this.options.gapResetMs))) {
      this.reset();
      if (score === null) return {
        detected: false, closed: false, blinkScore: null,
        closedDurationMs: 0, closedRatio: null, observedMs: 0,
        warning: false, sampleCount: 0
      };
    }
    this.lastTime = timeMs;
    const closed = score >= this.options.blinkThreshold;
    if (closed) {
      if (this.closedSince === null) this.closedSince = timeMs;
    } else {
      this.closedSince = null;
    }
    this.samples.push({ timeMs, closed });
    const cutoff = timeMs - this.options.windowMs;
    while (this.samples.length && this.samples[0].timeMs < cutoff) this.samples.shift();
    const observedMs = this.samples.length >= 2
      ? this.samples[this.samples.length - 1].timeMs - this.samples[0].timeMs : 0;
    const closedRatio = this.samples.reduce((sum, s) => sum + Number(s.closed), 0) / this.samples.length;
    const closedDurationMs = closed && this.closedSince !== null ? timeMs - this.closedSince : 0;
    const warning = closedDurationMs >= this.options.longClosureMs ||
      (observedMs >= this.options.minWindowMs && closedRatio >= this.options.closedRatioThreshold);
    return {
      detected: true, closed, blinkScore: score,
      closedDurationMs, closedRatio, observedMs,
      warning, sampleCount: this.samples.length
    };
  }
}
