/**
 * Motifs décoratifs de la carte de connexion, tous en arrière-plan et
 * masqués aux technologies d'assistance. Thème « eau & terrain » :
 * ondes concentriques (coin supérieur droit), trame de points (coin
 * supérieur gauche), courbes de niveau (bas de carte) et liseré dégradé.
 * SVG/CSS statiques : aucun coût de rendu au défilement ni JavaScript.
 */
const WAVE_OFFSETS = [0, 16, 32, 48, 64];

export function CardDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      {/* Liseré supérieur aux couleurs de la charte */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-deep via-primary to-water" />

      {/* Halo doux derrière le bas de carte */}
      <div className="absolute -bottom-24 left-1/2 h-64 w-[130%] -translate-x-1/2 rounded-full bg-water/25 blur-3xl" />

      {/* Trame de points, estompée en diagonale */}
      <div className="absolute left-0 top-0 h-36 w-36 bg-[radial-gradient(circle,rgba(57,113,135,.32)_1.2px,transparent_1.6px)] bg-[length:14px_14px] [mask-image:linear-gradient(135deg,black,transparent_72%)]" />

      {/* Ondes concentriques, comme une goutte sur l'eau */}
      <svg
        viewBox="0 0 240 240"
        className="absolute -right-px -top-px h-56 w-56 text-primary"
        fill="none"
        stroke="currentColor"
      >
        {[36, 72, 108, 144, 180, 216].map((radius, index) => (
          <circle
            key={radius}
            cx="240"
            cy="0"
            r={radius}
            strokeWidth="1"
            opacity={0.34 - index * 0.05}
          />
        ))}
      </svg>

      {/* Courbes de niveau en bas de carte */}
      <svg
        viewBox="0 0 400 150"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-36 w-full text-primary"
        fill="none"
        stroke="currentColor"
      >
        {WAVE_OFFSETS.map((offset, index) => (
          <path
            key={offset}
            d={`M0 ${52 + offset} C 70 ${22 + offset}, 130 ${92 + offset}, 205 ${58 + offset} S 340 ${24 + offset}, 400 ${54 + offset}`}
            strokeWidth="1.1"
            opacity={0.34 - index * 0.055}
          />
        ))}
      </svg>
    </div>
  );
}
