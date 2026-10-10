"use client";

import { useEffect, useRef, useState } from "react";

/** Designed SVG stand-in: two devices bridged by a trust connection. */
function TrustPairFallback() {
  return (
    <svg
      viewBox="0 0 600 480"
      fill="none"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Orbital ring */}
      <ellipse
        cx="300"
        cy="238"
        rx="276"
        ry="86"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1.5"
      />
      <ellipse
        cx="300"
        cy="238"
        rx="276"
        ry="86"
        stroke="rgba(56,189,248,0.22)"
        strokeWidth="1.5"
        transform="rotate(-10 300 238)"
        strokeDasharray="4 10"
      />

      {/* Left device */}
      <g transform="rotate(13 150 248)">
        <rect
          x="92"
          y="118"
          width="116"
          height="232"
          rx="30"
          fill="#14161a"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />
        <rect
          x="104"
          y="140"
          width="92"
          height="140"
          rx="12"
          fill="#0b1016"
          stroke="rgba(56,189,248,0.22)"
          strokeWidth="1"
        />
        <path
          d="M128 180l10 -12 12 16 16 -20 14 16"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        <circle cx="150" cy="300" r="5" fill="#38bdf8" />
      </g>

      {/* Right device */}
      <g transform="rotate(-13 450 248)">
        <rect
          x="392"
          y="118"
          width="116"
          height="232"
          rx="30"
          fill="#14161a"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />
        <rect
          x="404"
          y="140"
          width="92"
          height="140"
          rx="12"
          fill="#0b1016"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
        />
        <path
          d="M428 176h44M428 196h30M428 216h38"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="450" cy="300" r="5" fill="#38bdf8" />
      </g>

      {/* Clasp hooks */}
      <path
        d="M216 198c18 -14 40 -16 60 -9M384 198c-18 -14 -40 -16 -60 -9"
        stroke="rgba(125,211,252,0.75)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Trust beam */}
      <path
        d="M218 232c42 44 122 44 164 0"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeDasharray="7 9"
        strokeLinecap="round"
      />

      {/* Confirmation node */}
      <circle cx="300" cy="254" r="15" stroke="rgba(56,189,248,0.5)" strokeWidth="1.5" />
      <circle cx="300" cy="254" r="7" fill="#38bdf8" />
      <path
        d="M296 254l3 3 5 -5.5"
        stroke="#04121c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Lazy, resilient home for the interactive 3D Trust Pair scene. */
export function HeroSceneSlot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<{ dispose: () => void } | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "failed">("idle");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let started = false;
    let disposed = false;

    const start = async () => {
      if (started || disposed) return;
      started = true;

      // Probe WebGL before loading any 3D code.
      const probe = document.createElement("canvas");
      const gl =
        probe.getContext("webgl2") ||
        probe.getContext("webgl") ||
        probe.getContext("experimental-webgl");
      if (!gl) {
        setStatus("failed");
        return;
      }

      try {
        // three.js is pulled in only when the scene is about to become visible.
        const { createTrustPairScene } = await import("./hero-scene/three-scene");
        if (disposed) return;
        handleRef.current = createTrustPairScene(container, { reducedMotion });
        setStatus("ready");
      } catch {
        if (!disposed) setStatus("failed");
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void start();
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(container);

    return () => {
      disposed = true;
      observer.disconnect();
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full select-none" aria-hidden="true">
      <div className="scene-grid absolute inset-0" aria-hidden="true" />
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          status === "ready" ? "opacity-0" : "opacity-100"
        }`}
      >
        <TrustPairFallback />
      </div>
      {status === "failed" ? (
        <p className="absolute inset-x-0 bottom-2 text-center font-mono text-[0.65rem] tracking-wide text-neutral-400">
          Interactive scene unavailable — WebGL is not supported here.
        </p>
      ) : null}
    </div>
  );
}
