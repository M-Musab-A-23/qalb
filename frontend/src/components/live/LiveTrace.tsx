"use client";

import { useEffect, useRef } from "react";
import { classInfo } from "@/lib/analysis/classes";
import { BEAT_CLASSES, type BeatClass } from "@/lib/analysis/types";
import type { RollingTrace } from "@/lib/live/buffer";
import {
  easeRange,
  isMismatch,
  markerLabel,
  timeToX,
  viewEdge,
} from "@/lib/live/trace-view";
import { subscribeTheme } from "@/lib/theme";

type Colors = {
  signal: string;
  grid: string;
  text: string;
  classes: Record<BeatClass, string>;
};

const LABEL_BAND = 26;
const GRID_SECONDS = 0.5;

function readColors(element: HTMLElement): Colors {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  const classes = {} as Record<BeatClass, string>;
  for (const cls of BEAT_CLASSES) classes[cls] = read(classInfo[cls].cssVar, "#888");
  return {
    signal: read("--color-signal-line", "#22d3ee"),
    grid: read("--color-glass-stroke", "#ffffff33"),
    text: read("--color-text-secondary", "#888"),
    classes,
  };
}

/**
 * Scrolling ECG trace on a canvas. It only reads the rolling buffer from an
 * animation frame, so incoming sample blocks never trigger a React render.
 * Every detected beat gets a marker that is both coloured and lettered.
 */
export function LiveTrace({
  trace,
  speed,
  windowSeconds = 8,
  className,
}: {
  trace: RollingTrace;
  speed: number;
  windowSeconds?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let colors = readColors(canvas);
    const unsubscribeTheme = subscribeTheme(() => {
      colors = readColors(canvas);
    });

    let width = 0;
    let height = 0;
    let ratio = 1;
    function resize() {
      if (!canvas) return;
      ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let range: { lo: number; hi: number } | null = null;

    function draw() {
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const edge = viewEdge(trace.end, trace.updatedAt, Date.now(), speedRef.current);
      const startT = edge - windowSeconds;
      const top = LABEL_BAND;
      const bottom = height - 8;

      // Grid lines stay attached to stream time, so they scroll with the trace.
      context.lineWidth = 1;
      context.strokeStyle = colors.grid;
      context.globalAlpha = 0.5;
      context.beginPath();
      const firstLine = Math.ceil(startT / GRID_SECONDS) * GRID_SECONDS;
      for (let t = firstLine; t <= edge; t += GRID_SECONDS) {
        const x = Math.round(timeToX(t, edge, windowSeconds, width)) + 0.5;
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let r = 1; r < 4; r += 1) {
        const y = Math.round(top + ((bottom - top) * r) / 4) + 0.5;
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.stroke();
      context.globalAlpha = 1;

      const count = trace.length;
      if (count < 2) return;

      // Visible slice of the buffer.
      const fs = trace.fs;
      const first = Math.max(0, Math.floor((startT - trace.start) * fs));
      const last = Math.min(count - 1, Math.ceil((edge - trace.start) * fs));
      if (last <= first) return;

      let lo = Infinity;
      let hi = -Infinity;
      for (let i = first; i <= last; i += 1) {
        const v = trace.at(i);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const pad = (hi - lo || 1) * 0.12;
      range = easeRange(range, { lo: lo - pad, hi: hi + pad });
      const span = range.hi - range.lo || 1;
      const yOf = (v: number) => bottom - ((v - range!.lo) / span) * (bottom - top);

      context.lineWidth = 2;
      context.lineJoin = "round";
      context.strokeStyle = colors.signal;
      context.shadowColor = colors.signal;
      context.shadowBlur = 8;
      context.beginPath();
      for (let i = first; i <= last; i += 1) {
        const x = timeToX(trace.timeAt(i), edge, windowSeconds, width);
        const y = yOf(trace.at(i));
        if (i === first) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.shadowBlur = 0;

      // Beat markers: a coloured dot on the R peak and the class letter above it.
      context.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (const beat of trace.beats) {
        if (beat.t < startT || beat.t > edge) continue;
        const x = timeToX(beat.t, edge, windowSeconds, width);
        // R peak: the highest sample within a tenth of a second of the beat time.
        const centre = Math.round((beat.t - trace.start) * fs);
        const reach = Math.round(0.1 * fs);
        let peak = -Infinity;
        for (let i = Math.max(0, centre - reach); i <= Math.min(count - 1, centre + reach); i += 1) {
          peak = Math.max(peak, trace.at(i));
        }
        if (!Number.isFinite(peak)) continue;
        const color = colors.classes[beat.cls];
        const y = yOf(peak);
        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, 4, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = color;
        context.lineWidth = 1;
        context.globalAlpha = 0.45;
        context.beginPath();
        context.moveTo(x, y - 6);
        context.lineTo(x, LABEL_BAND - 4);
        context.stroke();
        context.globalAlpha = 1;
        context.fillStyle = color;
        context.fillText(
          markerLabel(beat.cls, beat.groundTruth),
          Math.min(Math.max(x, 20), width - 20),
          LABEL_BAND / 2,
        );
        if (isMismatch(beat.cls, beat.groundTruth)) {
          context.strokeStyle = color;
          context.lineWidth = 1.5;
          context.beginPath();
          context.arc(x, y, 7, 0, Math.PI * 2);
          context.stroke();
        }
      }
    }

    let frame = 0;
    function tick() {
      draw();
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribeTheme();
    };
  }, [trace, windowSeconds]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Live ECG trace with a lettered marker on every detected beat"
      className={className}
    />
  );
}
