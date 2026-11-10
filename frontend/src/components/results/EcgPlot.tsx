"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FilterTabs, type FilterOption } from "@/components/ui/FilterTabs";
import { classInfo } from "@/lib/analysis/classes";
import {
  clampWindow,
  decimateMinMax,
  peakIndexNear,
  valueRange,
} from "@/lib/analysis/plot";
import { formatClock } from "@/lib/analysis/summary";
import type { Beat, BeatClass } from "@/lib/analysis/types";
import { BEAT_CLASSES } from "@/lib/analysis/types";
import { subscribeTheme } from "@/lib/theme";

type Props = {
  samples: number[];
  fs: number;
  beats: Beat[];
};

type Colors = {
  signal: string;
  grid: string;
  text: string;
  surface: string;
  classes: Record<BeatClass, string>;
};

const LABEL_BAND = 28;
const AXIS_BAND = 20;
const GRID_STEPS = [0.2, 0.5, 1, 2, 5, 10, 30, 60];

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
    surface: read("--color-bg-surface", "#fff"),
    classes,
  };
}

function gridStep(windowSeconds: number): number {
  return GRID_STEPS.find((step) => windowSeconds / step <= 20) ?? 60;
}

function windowOptions(duration: number): FilterOption<string>[] {
  const options: FilterOption<string>[] = [5, 10, 30]
    .filter((seconds) => seconds < duration)
    .map((seconds) => ({ id: String(seconds), label: `${seconds} s` }));
  options.push({ id: "all", label: "Full recording" });
  return options;
}

/** The recording as a canvas trace with a coloured, lettered marker on every beat. */
export function EcgPlot({ samples, fs, beats }: Props) {
  const duration = samples.length / fs;
  const options = useMemo(() => windowOptions(duration), [duration]);
  const [windowId, setWindowId] = useState(duration > 10 ? "10" : "all");
  const [start, setStart] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const length = windowId === "all" ? duration : Number(windowId);
  const view = clampWindow(start, length, duration);
  const scrollable = view.end - view.start < duration - 0.01;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let colors = readColors(canvas);
    let width = 0;
    let height = 0;
    let ratio = 1;

    function draw() {
      if (!context || width === 0) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const plotTop = LABEL_BAND;
      const plotHeight = height - LABEL_BAND - AXIS_BAND;
      const span = view.end - view.start;
      const startIndex = view.start * fs;
      const endIndex = view.end * fs;
      const xOfTime = (time: number) => ((time - view.start) / span) * width;

      // Grid and time axis.
      const step = gridStep(span);
      context.lineWidth = 1;
      context.strokeStyle = colors.grid;
      context.fillStyle = colors.text;
      context.font = "12px ui-monospace, Menlo, Consolas, monospace";
      context.textBaseline = "alphabetic";
      context.globalAlpha = 0.5;
      context.beginPath();
      for (let t = Math.ceil(view.start / step) * step; t <= view.end; t += step) {
        const x = Math.round(xOfTime(t)) + 0.5;
        context.moveTo(x, plotTop);
        context.lineTo(x, plotTop + plotHeight);
      }
      for (let row = 0; row <= 4; row += 1) {
        const y = Math.round(plotTop + (row / 4) * plotHeight) + 0.5;
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.stroke();
      context.globalAlpha = 1;
      const labelEvery = Math.max(1, Math.ceil(60 / (width / (span / step))));
      let tick = 0;
      for (let t = Math.ceil(view.start / step) * step; t <= view.end; t += step) {
        if (tick % labelEvery === 0) {
          const label = `${Number(t.toFixed(2))} s`;
          const x = Math.min(width - context.measureText(label).width, Math.max(0, xOfTime(t) - 10));
          context.fillText(label, x, height - 5);
        }
        tick += 1;
      }

      // Trace.
      const range = valueRange(samples, startIndex, endIndex);
      const yOf = (value: number) =>
        plotTop + (1 - (value - range.min) / (range.max - range.min)) * plotHeight;
      context.lineWidth = 1.75;
      context.lineJoin = "round";
      context.strokeStyle = colors.signal;
      context.beginPath();
      const count = endIndex - startIndex;
      if (count <= width * 1.5) {
        const first = Math.max(0, Math.floor(startIndex));
        const last = Math.min(samples.length - 1, Math.ceil(endIndex));
        for (let i = first; i <= last; i += 1) {
          const x = ((i - startIndex) / count) * width;
          if (i === first) context.moveTo(x, yOf(samples[i]));
          else context.lineTo(x, yOf(samples[i]));
        }
      } else {
        const columns = decimateMinMax(samples, startIndex, endIndex, Math.floor(width));
        columns.forEach((column, x) => {
          const top = yOf(column.max);
          const bottom = yOf(column.min);
          if (x === 0) context.moveTo(x, top);
          else context.lineTo(x, top);
          context.lineTo(x, bottom);
        });
      }
      context.stroke();

      // Beat markers: a coloured dot on the peak and the class letter above it.
      const radius = Math.max(2, Math.round(0.05 * fs));
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "600 12px ui-monospace, Menlo, Consolas, monospace";
      let lastLabelX = -Infinity;
      for (const beat of beats) {
        if (beat.timeS < view.start || beat.timeS > view.end) continue;
        const peak = peakIndexNear(samples, beat.timeS * fs, radius);
        const x = xOfTime(peak / fs);
        const y = yOf(samples[peak]);
        const color = colors.classes[beat.cls];

        context.strokeStyle = color;
        context.globalAlpha = 0.45;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, LABEL_BAND - 6);
        context.lineTo(x, y - 6);
        context.stroke();
        context.globalAlpha = 1;

        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, 4, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = colors.surface;
        context.lineWidth = 1.5;
        context.stroke();

        if (x - lastLabelX >= 14) {
          context.fillStyle = colors.surface;
          context.globalAlpha = 0.85;
          context.beginPath();
          context.arc(x, LABEL_BAND - 14, 9, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = 1;
          context.strokeStyle = color;
          context.lineWidth = 1.5;
          context.stroke();
          context.fillStyle = color;
          context.fillText(beat.cls, x, LABEL_BAND - 13.5);
          lastLabelX = x;
        }
      }
      context.textAlign = "start";
    }

    function resize() {
      if (!canvas) return;
      ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      draw();
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const unsubscribeTheme = subscribeTheme(() => {
      colors = readColors(canvas);
      draw();
    });
    return () => {
      observer.disconnect();
      unsubscribeTheme();
    };
  }, [samples, fs, beats, view.start, view.end]);

  const visibleBeats = beats.filter(
    (beat) => beat.timeS >= view.start && beat.timeS <= view.end,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs
          label="Time window"
          options={options}
          value={windowId}
          onChange={(id) => {
            setWindowId(id);
            setStart(0);
          }}
        />
        <span className="ml-auto font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
          {formatClock(view.start)} to {formatClock(view.end)} · {visibleBeats} beats
        </span>
      </div>
      <div className="glass-strong overflow-hidden rounded-[var(--radius-md)]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`ECG trace from ${formatClock(view.start)} to ${formatClock(view.end)} with ${visibleBeats} labelled beats. The beats table lists every beat.`}
          className="block h-[300px] w-full"
        />
      </div>
      {scrollable ? (
        <label className="flex items-center gap-3 text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-text-secondary)]">
          <span>Scroll</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, duration - (view.end - view.start))}
            step={0.1}
            value={view.start}
            onChange={(event) => setStart(Number(event.target.value))}
            className="min-w-0 flex-1 accent-[var(--color-brand-fill)]"
          />
        </label>
      ) : null}
    </div>
  );
}
