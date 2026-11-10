"use client";

import { useEffect, useRef } from "react";
import { createEcgSource, ECG_SAMPLE_RATE } from "@/lib/data";
import { subscribeTheme } from "@/lib/theme";

export const ECG_WINDOW_SECONDS = 4;
const WINDOW_SECONDS = ECG_WINDOW_SECONDS;
const SAMPLES = ECG_SAMPLE_RATE * WINDOW_SECONDS;

type Colors = { signal: string; grid: string };

function readColors(element: HTMLElement): Colors {
  const style = getComputedStyle(element);
  return {
    signal: style.getPropertyValue("--color-signal-line").trim() || "#22d3ee",
    grid: style.getPropertyValue("--color-glass-stroke").trim() || "#ffffff33",
  };
}

/**
 * Live ECG trace drawn on a canvas. Samples come from the data layer, so the
 * simulated source can be replaced by a real stream without touching this.
 */
export function EcgCanvas({
  paused,
  className,
}: {
  paused: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const source = createEcgSource(72);
    const buffer = new Float32Array(SAMPLES);
    let head = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
      buffer[head] = source.next();
      head = (head + 1) % SAMPLES;
    }

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

    function draw() {
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      // Grid: a vertical line every half second, five horizontal bands.
      context.lineWidth = 1;
      context.strokeStyle = colors.grid;
      context.globalAlpha = 0.5;
      context.beginPath();
      for (let s = 1; s < WINDOW_SECONDS * 2; s += 1) {
        const x = Math.round((s / (WINDOW_SECONDS * 2)) * width) + 0.5;
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let r = 1; r < 5; r += 1) {
        const y = Math.round((r / 5) * height) + 0.5;
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.stroke();
      context.globalAlpha = 1;

      // Trace: one point per pixel column, oldest on the left.
      context.lineWidth = 2;
      context.lineJoin = "round";
      context.strokeStyle = colors.signal;
      context.shadowColor = colors.signal;
      context.shadowBlur = 8;
      context.beginPath();
      const columns = Math.max(1, Math.floor(width));
      for (let x = 0; x < columns; x += 1) {
        const index = (head + Math.floor((x / columns) * SAMPLES)) % SAMPLES;
        const y = height * (0.64 - 0.42 * buffer[index]);
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.shadowBlur = 0;
    }

    let frame = 0;
    let last = performance.now();
    let carry = 0;
    function tick(now: number) {
      const elapsed = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!pausedRef.current) {
        carry += elapsed * ECG_SAMPLE_RATE;
        const count = Math.floor(carry);
        carry -= count;
        for (let i = 0; i < count; i += 1) {
          buffer[head] = source.next();
          head = (head + 1) % SAMPLES;
        }
      }
      draw();
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribeTheme();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Live ECG trace, lead II"
      className={className}
    />
  );
}
