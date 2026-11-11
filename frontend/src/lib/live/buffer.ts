import type { BeatClass } from "@/lib/analysis/types";

export type TraceBeat = {
  t: number;
  cls: BeatClass;
  groundTruth?: BeatClass | null;
};

/**
 * Fixed-size store for the scrolling trace: one ring of samples and one small
 * list of beat markers, both limited to the latest `seconds`. Memory never
 * grows however long the page stays open.
 */
export class RollingTrace {
  private values: Float32Array;
  private rate: number;
  private head = 0;
  private count = 0;
  /** Stream time of the newest sample. */
  private endT = 0;
  private beatList: TraceBeat[] = [];
  /** Wall-clock time (ms) of the latest block, so the view can scroll between blocks. */
  updatedAt = 0;

  constructor(
    readonly seconds: number,
    fs: number,
    private readonly maxBeats = 256,
  ) {
    this.rate = fs;
    this.values = new Float32Array(Math.ceil(seconds * fs));
  }

  /** Sampling rate of the stored samples, in Hz. */
  get fs(): number {
    return this.rate;
  }

  /** Switches to another sampling rate (this empties the trace). */
  setRate(fs: number): void {
    if (fs === this.rate) return;
    this.rate = fs;
    this.values = new Float32Array(Math.ceil(this.seconds * fs));
    this.reset();
  }

  get capacity(): number {
    return this.values.length;
  }

  get length(): number {
    return this.count;
  }

  /** Stream time of the newest sample, or 0 when empty. */
  get end(): number {
    return this.endT;
  }

  /** Stream time of the oldest sample still held. */
  get start(): number {
    return this.endT - (this.count > 0 ? (this.count - 1) / this.fs : 0);
  }

  get beats(): readonly TraceBeat[] {
    return this.beatList;
  }

  /** Appends samples whose first value is at stream time `t`. */
  pushSamples(t: number, values: ArrayLike<number>, now = Date.now()): void {
    if (values.length === 0) return;
    // A gap of more than a sample (a reconnect) restarts the trace instead of
    // drawing a false line across it.
    if (this.count > 0 && Math.abs(t - (this.endT + 1 / this.fs)) > 2 / this.fs) {
      this.reset();
    }
    for (let i = 0; i < values.length; i += 1) {
      this.values[this.head] = values[i];
      this.head = (this.head + 1) % this.values.length;
    }
    this.count = Math.min(this.values.length, this.count + values.length);
    this.endT = t + (values.length - 1) / this.fs;
    this.updatedAt = now;
    this.trimBeats();
  }

  pushBeat(beat: TraceBeat): void {
    this.beatList.push(beat);
    if (this.beatList.length > this.maxBeats) {
      this.beatList.splice(0, this.beatList.length - this.maxBeats);
    }
    this.trimBeats();
  }

  /** Sample `index` counted from the oldest one held. */
  at(index: number): number {
    const oldest =
      (this.head - this.count + this.values.length * 2) % this.values.length;
    return this.values[(oldest + index) % this.values.length];
  }

  /** Stream time of the sample at `index` counted from the oldest one held. */
  timeAt(index: number): number {
    return this.start + index / this.fs;
  }

  reset(): void {
    this.head = 0;
    this.count = 0;
    this.endT = 0;
    this.updatedAt = 0;
    this.beatList = [];
  }

  private trimBeats(): void {
    const cutoff = this.start - 1;
    let drop = 0;
    while (drop < this.beatList.length && this.beatList[drop].t < cutoff) {
      drop += 1;
    }
    if (drop > 0) this.beatList.splice(0, drop);
  }
}
