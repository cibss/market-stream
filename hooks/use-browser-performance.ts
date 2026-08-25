"use client";

import { useEffect, useRef, useState } from "react";

export type BrowserPerformanceMetrics = {
  fps: number;

  longTasksPerSecond: number;

  lastLongTaskMs: number;
};

const INITIAL_METRICS: BrowserPerformanceMetrics = {
  fps: 0,

  longTasksPerSecond: 0,

  lastLongTaskMs: 0,
};

export function useBrowserPerformance() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);

  const frameCountRef = useRef(0);

  const longTaskCountRef = useRef(0);

  const lastLongTaskRef = useRef(0);

  useEffect(() => {
    let animationFrameId: number;

    let lastMeasurement = performance.now();

    const measureFrame = (now: number) => {
      frameCountRef.current += 1;

      const elapsed = now - lastMeasurement;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);

        setMetrics({
          fps,

          longTasksPerSecond: longTaskCountRef.current,

          lastLongTaskMs: lastLongTaskRef.current,
        });

        frameCountRef.current = 0;

        longTaskCountRef.current = 0;

        lastMeasurement = now;
      }

      animationFrameId = requestAnimationFrame(measureFrame);
    };

    animationFrameId = requestAnimationFrame(measureFrame);

    let observer: PerformanceObserver | null = null;

    if ("PerformanceObserver" in window) {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTaskCountRef.current += 1;

            lastLongTaskRef.current = entry.duration;
          }
        });

        observer.observe({
          type: "longtask",
          buffered: true,
        });
      } catch {
        /*
         * Browser may not support
         * Long Tasks API.
         */
      }
    }

    return () => {
      cancelAnimationFrame(animationFrameId);

      observer?.disconnect();
    };
  }, []);

  return metrics;
}
