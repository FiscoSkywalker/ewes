'use client';

import { useEffect, useRef } from 'react';

interface TopoContoursProps {
  /** Le relief se soulève sous le pointeur (souris uniquement). */
  interactive?: boolean;
  className?: string;
}

/** Cas de marching squares → paires d'arêtes (0 haut, 1 droite, 2 bas, 3 gauche). */
const SEGMENTS: Record<number, [number, number][]> = {
  1: [[3, 2]],
  2: [[2, 1]],
  3: [[3, 1]],
  4: [[0, 1]],
  5: [
    [3, 0],
    [2, 1],
  ],
  6: [[0, 2]],
  7: [[3, 0]],
  8: [[3, 0]],
  9: [[0, 2]],
  10: [
    [0, 1],
    [3, 2],
  ],
  11: [[0, 1]],
  12: [[3, 1]],
  13: [[2, 1]],
  14: [[3, 2]],
};

const CELL = 16;
const LEVELS = 16;
/** ~25 images/s suffisent pour un relief qui dérive lentement. */
const FRAME_MS = 40;

/**
 * Courbes de niveau générées (carte topographique vivante) pour les sections
 * nuit — clin d'œil au travail de terrain et de cartographie d'EWES. Canvas 2D
 * léger : ne dessine que lorsqu'il est à l'écran, une seule image fixe si
 * l'utilisateur préfère réduire les animations. Purement décoratif.
 */
export function TopoContours({
  interactive = false,
  className = '',
}: TopoContoursProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const followPointer =
      interactive && window.matchMedia('(pointer: fine)').matches;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let field = new Float32Array(0);
    let time = Math.random() * 100;
    const seed = Math.random() * 10;
    let visible = false;
    let frame = 0;
    let last = 0;
    const hill = { x: -1, y: -1, tx: -1, ty: -1, a: 0, ta: 0 };

    const heightAt = (x: number, y: number) => {
      const u = x / 420 + seed;
      const v = y / 420;
      let z =
        Math.sin(u * 1.3 + time * 0.3) * Math.cos(v * 1.1 - time * 0.2) * 0.5 +
        Math.sin((u * 0.7 + v * 0.9) * 1.7 + time * 0.25) * 0.35 +
        Math.cos((-u * 0.8 + v * 0.5) * 2.9 - time * 0.15) * 0.18 +
        Math.sin(u * 4.1 + v * 3.3) * 0.05;
      if (hill.a > 0.001) {
        const dx = x - hill.x;
        const dy = y - hill.y;
        z += hill.a * 0.55 * Math.exp(-(dx * dx + dy * dy) / (2 * 150 * 150));
      }
      return z;
    };

    // État de la cellule courante, partagé avec `edgePoint` : aucune
    // allocation dans la boucle (l'ancienne fermeture + tableaux créés par
    // cellule, ~70 000 par image, provoquaient des pauses du ramasse-miettes
    // ressenties comme des à-coups pendant le défilement).
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    let x0 = 0;
    let y0 = 0;
    let level = 0;
    let px = 0;
    let py = 0;
    const edgePoint = (edge: number) => {
      switch (edge) {
        case 0:
          px = x0 + CELL * ((level - a) / (b - a));
          py = y0;
          break;
        case 1:
          px = x0 + CELL;
          py = y0 + CELL * ((level - b) / (c - b));
          break;
        case 2:
          px = x0 + CELL * ((level - d) / (c - d));
          py = y0 + CELL;
          break;
        default:
          px = x0;
          py = y0 + CELL * ((level - a) / (d - a));
      }
    };

    const draw = () => {
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++)
          field[j * cols + i] = heightAt(i * CELL, j * CELL);
      context.clearRect(0, 0, width, height);

      for (let k = 0; k < LEVELS; k++) {
        level = -1.05 + (k * 2.1) / LEVELS;
        // Courbes maîtresses (une sur quatre), comme sur une carte IGN.
        const major = k % 4 === 0;
        context.beginPath();
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            a = field[j * cols + i];
            b = field[j * cols + i + 1];
            c = field[(j + 1) * cols + i + 1];
            d = field[(j + 1) * cols + i];
            const index =
              (a > level ? 8 : 0) |
              (b > level ? 4 : 0) |
              (c > level ? 2 : 0) |
              (d > level ? 1 : 0);
            const segments = SEGMENTS[index];
            if (!segments) continue;
            x0 = i * CELL;
            y0 = j * CELL;
            for (let s = 0; s < segments.length; s++) {
              edgePoint(segments[s][0]);
              context.moveTo(px, py);
              edgePoint(segments[s][1]);
              context.lineTo(px, py);
            }
          }
        }
        context.lineWidth = major ? 1.1 : 0.7;
        context.strokeStyle = major
          ? 'rgba(90, 209, 161, 0.22)'
          : 'rgba(232, 241, 239, 0.06)';
        context.stroke();
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL) + 1;
      rows = Math.ceil(height / CELL) + 1;
      field = new Float32Array(cols * rows);
      draw();
    };

    const loop = (now: number) => {
      if (!visible) return;
      frame = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      time += 0.012;
      hill.x += (hill.tx - hill.x) * 0.12;
      hill.y += (hill.ty - hill.y) * 0.12;
      hill.a += (hill.ta - hill.a) * 0.08;
      draw();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    if (reduced) {
      return () => resizeObserver.disconnect();
    }

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(loop);
    });
    visibilityObserver.observe(canvas);

    const host = canvas.parentElement;
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      hill.tx = event.clientX - rect.left;
      hill.ty = event.clientY - rect.top;
      hill.ta = 1;
      if (hill.x < 0) {
        hill.x = hill.tx;
        hill.y = hill.ty;
      }
    };
    const onPointerLeave = () => {
      hill.ta = 0;
    };
    if (followPointer && host) {
      host.addEventListener('pointermove', onPointerMove);
      host.addEventListener('pointerleave', onPointerLeave);
    }

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      host?.removeEventListener('pointermove', onPointerMove);
      host?.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
