"use client";

import { useEffect, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  reach: number;
  born: number;
}

const CELL_SIZE = 62;
const CELL_SIZE_COMPACT = 88;
const INFLUENCE_RADIUS = 260;
const MAX_WARP = 22;
const DOT_SPACING = 30;
const COMPACT_BREAKPOINT = 768;
const RIPPLE_SPEED = 800;
const LERP_SPEED = 0.08;

type Rgb = { r: number; g: number; b: number };
type Rgba = Rgb & { a: number };

interface Palette {
  bg: string;
  line: Rgba;
  node: Rgba;
  dot: string;
  lineActive: Rgba;
  nodeActive: Rgba;
  glow: string;
  ripple: string;
}

const MONOCHROME: Palette = {
  bg: "#000000",
  line: { r: 255, g: 255, b: 255, a: 0.055 },
  node: { r: 255, g: 255, b: 255, a: 0.12 },
  dot: "rgba(255,255,255,0.035)",
  lineActive: { r: 255, g: 255, b: 255, a: 0.7 },
  nodeActive: { r: 255, g: 255, b: 255, a: 1.0 },
  glow: "255,255,255",
  ripple: "255,255,255",
};

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const GREEN: Rgb = { r: 34, g: 197, b: 94 };
const GREEN_BRIGHT: Rgb = { r: 74, g: 222, b: 128 };

/**
 * As cores vêm dos tokens de globals.css para a grade acompanhar o tema. Se o CSS
 * ainda não tiver as variáveis (cache velho do dev server, por exemplo), cada valor
 * cai no padrão do tema escuro em vez de virar uma cor inválida no canvas.
 */
function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const rgb = (name: string, fallback: Rgb): Rgb => {
    const parts = css.getPropertyValue(name).trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return fallback;
    const [r, g, b] = parts;
    return { r, g, b };
  };
  const alpha = (name: string, fallback: number) => {
    const value = Number.parseFloat(css.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  const base = rgb("--grid-rgb", WHITE);
  const active = rgb("--grid-active-rgb", GREEN);
  const nodeActive = rgb("--grid-node-active-rgb", GREEN_BRIGHT);
  return {
    bg: css.getPropertyValue("--background").trim() || "#0b0d0c",
    line: { ...base, a: alpha("--grid-line-alpha", 0.055) },
    node: { ...base, a: alpha("--grid-node-alpha", 0.12) },
    dot: `rgba(${base.r},${base.g},${base.b},${alpha("--grid-dot-alpha", 0.035)})`,
    lineActive: { ...active, a: 0.45 },
    nodeActive: { ...nodeActive, a: 0.9 },
    glow: `${active.r},${active.g},${active.b}`,
    ripple: `${nodeActive.r},${nodeActive.g},${nodeActive.b}`,
  };
}

const NODE_BASE_RADIUS = 1.5;
const NODE_ACTIVE_RADIUS = 2.9;

function rippleReach(x: number, y: number, w: number, h: number) {
  return Math.max(
    Math.hypot(x, y),
    Math.hypot(w - x, y),
    Math.hypot(x, h - y),
    Math.hypot(w - x, h - y),
  );
}

/** Até onde a onda de um clique vai, e quanto tempo leva — para sincronizar animações de fora. */
export function rippleSweep(x: number, y: number) {
  const reach = rippleReach(x, y, window.innerWidth, window.innerHeight);
  return { reach, duration: (reach * 1000) / RIPPLE_SPEED };
}

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(
  base: Rgba,
  active: Rgba,
  t: number,
): string {
  const r = Math.round(lerpN(base.r, active.r, t));
  const g = Math.round(lerpN(base.g, active.g, t));
  const b = Math.round(lerpN(base.b, active.b, t));
  const a = lerpN(base.a, active.a, t);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

export default function KineticGrid({
  children,
  className,
  globalColor = "default",
}: {
  children?: ReactNode;
  className?: string;
  globalColor?: "default" | "monochrome";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetMouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const paletteRef = useRef<Palette>(MONOCHROME);

  const getWarpedPoint = useCallback(
    (
      gx: number,
      gy: number,
      col: number,
      row: number,
      mouse: Point,
      ripples: Ripple[],
      cols: number,
      rows: number,
    ): { pt: Point; proximity: number } => {
      const edgeMargin = 1.5;
      const colPin = Math.min(
        col / edgeMargin,
        (cols - 1 - col) / edgeMargin,
        1,
      );
      const rowPin = Math.min(
        row / edgeMargin,
        (rows - 1 - row) / edgeMargin,
        1,
      );
      const pinFactor = colPin * colPin * rowPin * rowPin;

      const dx = gx - mouse.x;
      const dy = gy - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const cursorProximity =
        Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

      let rx = 0,
        ry = 0,
        waveProximity = 0;
      for (const r of ripples) {
        const rdx = gx - r.x;
        const rdy = gy - r.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const waveWidth = 55;
        const diff = rdist - r.radius;
        if (Math.abs(diff) < waveWidth) {
          const falloff = (1 - Math.abs(diff) / waveWidth) * r.opacity * pinFactor;
          const strength = falloff * 18;
          const angle = Math.atan2(rdy, rdx);
          const sign = diff < 0 ? -1 : 1;
          rx += Math.cos(angle) * strength * sign * -1;
          ry += Math.sin(angle) * strength * sign * -1;
          waveProximity = Math.max(waveProximity, falloff);
        }
      }

      const proximity = Math.max(cursorProximity, waveProximity);

      if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
        const t = dist / INFLUENCE_RADIUS;
        const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
        const warpAmt = eased * MAX_WARP * pinFactor;
        const angle = Math.atan2(dy, dx);
        return {
          pt: {
            x: gx - Math.cos(angle) * warpAmt + rx,
            y: gy - Math.sin(angle) * warpAmt + ry,
          },
          proximity,
        };
      }

      return { pt: { x: gx + rx, y: gy + ry }, proximity };
    },
    [],
  );

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w: W, h: H } = sizeRef.current;
      const mouse = mouseRef.current;
      const ripples = ripplesRef.current;
      const compact = W < COMPACT_BREAKPOINT;

      const theme = paletteRef.current;

      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);

      if (!compact) {
        ctx.fillStyle = theme.dot;
        for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
          for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
            ctx.beginPath();
            ctx.arc(x, y, 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        r.radius = Math.max(0, age * RIPPLE_SPEED);
        r.opacity = Math.max(0, 1 - (r.radius / r.reach) ** 2);
        if (r.opacity <= 0) ripples.splice(i, 1);
      }

      const cell = compact ? CELL_SIZE_COMPACT : CELL_SIZE;
      const cols = Math.max(2, Math.ceil(W / cell)) + 1;
      const rows = Math.max(2, Math.ceil(H / cell)) + 1;
      const cellW = W / (cols - 1);
      const cellH = H / (rows - 1);

      const pts: Point[][] = [];
      const prox: number[][] = [];

      for (let row = 0; row < rows; row++) {
        pts[row] = [];
        prox[row] = [];
        for (let col = 0; col < cols; col++) {
          const { pt, proximity } = getWarpedPoint(
            col * cellW,
            row * cellH,
            col,
            row,
            mouse,
            ripples,
            cols,
            rows,
          );
          pts[row][col] = pt;
          prox[row][col] = proximity;
        }
      }

      const drawSeg = (p1: Point, p2: Point, pr1: number, pr2: number) => {
        const avg = (pr1 + pr2) / 2;
        const t = avg * avg * (3 - 2 * avg);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = lerpColor(theme.line, theme.lineActive, t);
        ctx.lineWidth = lerpN(0.8, 1.35, t);
        ctx.stroke();
      };

      ctx.lineCap = "butt";

      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols - 1; col++)
          drawSeg(
            pts[row][col],
            pts[row][col + 1],
            prox[row][col],
            prox[row][col + 1],
          );

      for (let col = 0; col < cols; col++)
        for (let row = 0; row < rows - 1; row++)
          drawSeg(
            pts[row][col],
            pts[row + 1][col],
            prox[row][col],
            prox[row + 1][col],
          );

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const p = pts[row][col];
          const pr = prox[row][col];
          const t = pr * pr * (3 - 2 * pr);
          const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

          if (t > 0.3) {
            const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7);
            const grd = ctx.createRadialGradient(
              p.x,
              p.y,
              r * 0.5,
              p.x,
              p.y,
              glowR,
            );
            grd.addColorStop(0, `rgba(${theme.glow},${(t * 0.3).toFixed(3)})`);
            grd.addColorStop(1, `rgba(${theme.glow},0)`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = lerpColor(theme.node, theme.nodeActive, t);
          ctx.fill();
        }
      }

      for (const r of ripples) {
        const safeRadius = Math.max(0, r.radius);
        ctx.beginPath();
        ctx.arc(r.x, r.y, safeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${theme.ripple},${(r.opacity * 0.22).toFixed(3)})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    },
    [getWarpedPoint],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const refreshPalette = () => {
      paletteRef.current = globalColor === "monochrome" ? MONOCHROME : readPalette();
      if (reduceMotion) draw(performance.now());
    };
    refreshPalette();
    const themeObserver = new MutationObserver(refreshPalette);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      if (reduceMotion) draw(performance.now());
    };

    setSize();
    window.addEventListener("resize", setSize);

    if (reduceMotion) {
      return () => {
        window.removeEventListener("resize", setSize);
        themeObserver.disconnect();
      };
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      targetMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerLeave = () => {
      targetMouseRef.current = { x: -9999, y: -9999 };
    };

    const onClick = (e: MouseEvent) => {
      const { w, h } = sizeRef.current;
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        opacity: 1,
        reach: rippleReach(e.clientX, e.clientY, w, h),
        born: performance.now(),
      });
    };

    const animate = (now: number) => {
      const m = mouseRef.current;
      const t = targetMouseRef.current;

      m.x = lerpN(m.x, t.x, LERP_SPEED);
      m.y = lerpN(m.y, t.y, LERP_SPEED);

      draw(now);
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("click", onClick);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      themeObserver.disconnect();
      window.removeEventListener("resize", setSize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("click", onClick);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [draw, globalColor]);

  return (
    <div
      className={cn(
        "relative w-full min-h-screen overflow-hidden",
        globalColor === "monochrome" ? "bg-[#000000]" : "bg-background",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      />

      {globalColor === "default" && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(circle at center, color-mix(in oklab, var(--halo, rgba(34,197,94,0.1)) 70%, transparent), transparent 45%)",
          }}
        />
      )}

      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
