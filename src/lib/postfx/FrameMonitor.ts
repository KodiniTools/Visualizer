/**
 * FrameMonitor - adaptive quality controller based on measured frame time.
 *
 * Pure logic (no DOM), so it is unit-testable. It keeps a rolling average of
 * frame durations and derives a discrete `qualityLevel` in {1.0, 0.85, 0.7, 0.55}.
 * Strong hysteresis prevents oscillation: quality only steps down when the
 * average frame time stays over budget, and only steps back up after a
 * sustained calm period. Callers read `qualityLevel` to scale post-processing
 * cost (bloom downscale / blur passes) without touching the visual result.
 *
 * @module postfx/FrameMonitor
 */

// Discrete quality steps, highest first. Fewer steps → less visible switching.
export const QUALITY_STEPS: readonly number[] = [1.0, 0.85, 0.7, 0.55]

export interface FrameMonitorOptions {
  /** Frame-rate we budget for (60) */
  targetFps?: number
  /** Frames averaged before acting (45, ~0.75s @60fps) */
  sampleSize?: number
  /** Avg frame time above budget×margin steps quality down (1.25) */
  downgradeMargin?: number
  /** Avg frame time below budget×margin allows stepping up (0.7) */
  upgradeMargin?: number
  /** Frames of calm required before stepping up (180, ~3s) */
  upgradeCooldown?: number
}

export class FrameMonitor {
  targetFps: number
  budgetMs: number
  sampleSize: number
  downgradeMargin: number
  upgradeMargin: number
  upgradeCooldown: number
  _samples: number[]
  _sum: number
  _stepIndex: number
  _calmFrames: number
  _lastTimestamp: number | null

  constructor(opts: FrameMonitorOptions = {}) {
    this.targetFps = opts.targetFps ?? 60
    this.budgetMs = 1000 / this.targetFps
    this.sampleSize = opts.sampleSize ?? 45
    this.downgradeMargin = opts.downgradeMargin ?? 1.25
    this.upgradeMargin = opts.upgradeMargin ?? 0.7
    this.upgradeCooldown = opts.upgradeCooldown ?? 180

    this._samples = []
    this._sum = 0
    this._stepIndex = 0 // index into QUALITY_STEPS (0 = full quality)
    this._calmFrames = 0
    this._lastTimestamp = null
  }

  /** Current quality level (0.55–1.0). */
  get qualityLevel(): number {
    // _stepIndex bleibt im Bereich von QUALITY_STEPS
    return QUALITY_STEPS[this._stepIndex] as number
  }

  /** Rolling average frame time in ms (0 until enough samples collected). */
  get averageFrameMs(): number {
    return this._samples.length ? this._sum / this._samples.length : 0
  }

  /**
   * Feed a monotonic timestamp (performance.now()). The first call only seeds
   * the clock. Returns the (possibly updated) quality level.
   * @param {number} timestamp
   * @returns {number}
   */
  tick(timestamp: number): number {
    if (this._lastTimestamp === null) {
      this._lastTimestamp = timestamp
      return this.qualityLevel
    }
    const delta = timestamp - this._lastTimestamp
    this._lastTimestamp = timestamp
    // Ignore absurd deltas (tab was backgrounded, debugger paused, etc.)
    if (delta > 0 && delta < 1000) this.pushFrameTime(delta)
    return this.qualityLevel
  }

  /**
   * Feed a raw frame duration in ms. Separated from tick() so tests can drive
   * the controller deterministically without a clock.
   * @param {number} deltaMs
   * @returns {number} updated quality level
   */
  pushFrameTime(deltaMs: number): number {
    this._samples.push(deltaMs)
    this._sum += deltaMs
    if (this._samples.length > this.sampleSize) {
      this._sum -= this._samples.shift() as number
    }
    if (this._samples.length < this.sampleSize) return this.qualityLevel

    const avg = this._sum / this._samples.length

    if (avg > this.budgetMs * this.downgradeMargin && this._stepIndex < QUALITY_STEPS.length - 1) {
      // Over budget → drop a step immediately and reset the calm counter.
      this._stepIndex++
      this._calmFrames = 0
    } else if (avg < this.budgetMs * this.upgradeMargin && this._stepIndex > 0) {
      // Comfortably under budget → count calm frames, step up once sustained.
      this._calmFrames++
      if (this._calmFrames >= this.upgradeCooldown) {
        this._stepIndex--
        this._calmFrames = 0
      }
    } else {
      this._calmFrames = 0
    }

    return this.qualityLevel
  }

  reset(): void {
    this._samples.length = 0
    this._sum = 0
    this._stepIndex = 0
    this._calmFrames = 0
    this._lastTimestamp = null
  }
}
