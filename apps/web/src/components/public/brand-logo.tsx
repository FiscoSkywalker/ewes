import Image from 'next/image';

interface BrandLogoProps {
  /** Classes de taille (hauteur) ; la largeur suit le ratio du logo. */
  className?: string;
  priority?: boolean;
}

/**
 * Logo officiel EWES (fichier source : `raw/logo.png`, version web allégée
 * dans `public/assets/brand/`). Le fichier fait 640×256 (ratio 2,5:1) ; les
 * lettres sont noires sur fond transparent, prévues pour les fonds clairs du
 * site.
 */
export function BrandLogo({
  className = 'h-11',
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/assets/brand/ewes-logo.png"
      alt="EWES — Environment, Water and Engineering Services"
      width={640}
      height={256}
      sizes="160px"
      priority={priority}
      className={`w-auto ${className}`}
    />
  );
}
