import Image from 'next/image';
import type { Project, ProjectCategory } from '@/data/projects';

/** Teinte de la couverture générée, par type de mission (fonds nuit). */
const COVER_TONE: Record<ProjectCategory, { accent: string; glow: string }> = {
  EIES: {
    accent: 'var(--color-malachite-bright)',
    glow: 'var(--color-malachite)',
  },
  AUDIT: { accent: 'var(--color-copper-bright)', glow: 'var(--color-copper)' },
  MONITORING: {
    accent: 'var(--color-water-bright)',
    glow: 'var(--color-primary)',
  },
  AGREMENT: {
    accent: 'var(--color-water-bright)',
    glow: 'var(--color-primary-deep)',
  },
  FORMATION: {
    accent: 'var(--color-malachite-bright)',
    glow: 'var(--color-primary)',
  },
  ETUDE: {
    accent: 'var(--color-copper-bright)',
    glow: 'var(--color-malachite)',
  },
};

/** Générateur pseudo-aléatoire déterministe (même rendu serveur et client). */
function seeded(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++)
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Courbes de niveau d'un relief imaginaire, propres à chaque réalisation :
 * clin d'œil aux cartes de terrain, sans prétendre représenter le site réel.
 */
function contours(id: string) {
  const rand = seeded(id);
  const cx = 90 + rand() * 220;
  const cy = 60 + rand() * 130;
  const waves = [2 + Math.floor(rand() * 3), 3 + Math.floor(rand() * 4)];
  const phases = [rand() * Math.PI * 2, rand() * Math.PI * 2];
  const amps = [0.1 + rand() * 0.12, 0.05 + rand() * 0.08];

  const paths = Array.from({ length: 9 }, (_, level) => {
    const radius = 18 + level * 26;
    const points = Array.from({ length: 64 }, (_, step) => {
      const angle = (step / 64) * Math.PI * 2;
      const r =
        radius *
        (1 +
          amps[0] * Math.sin(waves[0] * angle + phases[0] + level * 0.35) +
          amps[1] * Math.sin(waves[1] * angle + phases[1]));
      return `${(cx + r * Math.cos(angle) * 1.25).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
    });
    return `M${points.join('L')}Z`;
  });

  return { cx, cy, paths };
}

interface ProjectCoverProps {
  project: Project;
  /** Libellé court du type de mission, affiché sur la couverture générée. */
  tag?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Visuel d'une réalisation : sa photo quand l'API en fournit une, sinon une
 * couverture générée (nuit + courbes de niveau teintées selon le type).
 */
export function ProjectCover({
  project,
  tag,
  sizes,
  priority,
  className = '',
}: ProjectCoverProps) {
  const period = project.yearEnd
    ? `${project.year}–${project.yearEnd}`
    : `${project.year}`;

  if (project.image) {
    return (
      <div className={`relative overflow-hidden bg-night ${className}`}>
        <Image
          src={project.image}
          alt={project.imageAlt ?? ''}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-linear-to-t from-night/70 via-night/10 to-transparent"
          aria-hidden="true"
        />
        {tag && (
          <span className="absolute left-4 top-4 rounded-full bg-night/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-on-night backdrop-blur-sm">
            {tag}
          </span>
        )}
      </div>
    );
  }

  const tone = COVER_TONE[project.category];
  const { cx, cy, paths } = contours(project.id);

  return (
    <div
      className={`relative overflow-hidden bg-night ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(120% 90% at ${(cx / 4).toFixed(0)}% ${(cy / 2.5).toFixed(0)}%, ${tone.glow}, transparent 70%)`,
        }}
      />
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] ease-out group-hover:scale-110"
      >
        <g fill="none" stroke={tone.accent} strokeWidth="0.8">
          {paths.map((d, index) => (
            <path key={index} d={d} opacity={0.55 - index * 0.05} />
          ))}
        </g>
        <circle cx={cx} cy={cy} r="3" fill={tone.accent} />
        <circle
          cx={cx}
          cy={cy}
          r="9"
          fill="none"
          stroke={tone.accent}
          strokeWidth="0.8"
          opacity="0.6"
        />
      </svg>
      <div className="absolute inset-0 bg-linear-to-t from-night via-night/20 to-transparent" />
      {tag && (
        <span
          className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: tone.accent }}
        >
          {tag}
        </span>
      )}
      <span className="absolute bottom-2 right-4 font-heading text-5xl font-bold leading-none tracking-tight text-transparent [-webkit-text-stroke:1px_rgba(232,241,239,0.35)]">
        {period}
      </span>
    </div>
  );
}
