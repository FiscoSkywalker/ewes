/**
 * Courbes de niveau décoratives (lecture cartographique de l'univers EWES :
 * terrain, bassins versants, ouvrages). Générées une fois, déterministes.
 */
function contour(
  cx: number,
  cy: number,
  radius: number,
  wobble: number,
  phase: number,
): string {
  const points: string[] = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r =
      radius +
      wobble * Math.sin(3 * t + phase) +
      wobble * 0.55 * Math.sin(5 * t - phase * 1.7) +
      wobble * 0.3 * Math.cos(2 * t + phase * 0.6);
    const x = cx + r * 1.45 * Math.cos(t);
    const y = cy + r * Math.sin(t);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${points.join('')}Z`;
}

const RINGS = [
  ...Array.from({ length: 9 }, (_, i) =>
    contour(470, 70, 18 + i * 17, 5 + i * 1.6, 0.4 + i * 0.22),
  ),
  ...Array.from({ length: 6 }, (_, i) =>
    contour(90, 230, 14 + i * 16, 4 + i * 1.4, 2.1 + i * 0.3),
  ),
];

export function TopoLines({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 260"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      fill="none"
      stroke="currentColor"
    >
      {RINGS.map((d, i) => (
        <path key={i} d={d} strokeWidth={i % 4 === 0 ? 1.1 : 0.6} />
      ))}
    </svg>
  );
}
