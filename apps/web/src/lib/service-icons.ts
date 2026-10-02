import {
  Activity,
  BookOpen,
  Building2,
  ClipboardCheck,
  Cpu,
  Droplets,
  Factory,
  FileCheck,
  FileSearch,
  Filter,
  FlaskConical,
  Gauge,
  GraduationCap,
  HardHat,
  Leaf,
  Lightbulb,
  MapPin,
  Microscope,
  Mountain,
  Recycle,
  Ruler,
  ShieldCheck,
  Sprout,
  Trash2,
  Truck,
  Users,
  Waves,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Pictogrammes proposés pour une prestation, partagés par le site public et
 * le portail : la base ne stocke que la clé (`droplets`), le site et le
 * sélecteur du portail en tirent le même dessin. Une clé inconnue du site
 * (liste réduite plus tard, valeur saisie à la main) retombe sur un
 * pictogramme par défaut plutôt que de casser l'affichage.
 */
export const SERVICE_ICONS: Record<
  string,
  { label: string; Icon: LucideIcon }
> = {
  'file-check': { label: 'Rapport, étude', Icon: FileCheck },
  'file-search': { label: 'Étude de faisabilité', Icon: FileSearch },
  'clipboard-check': { label: 'Audit, contrôle', Icon: ClipboardCheck },
  'shield-check': { label: 'Conformité', Icon: ShieldCheck },
  droplets: { label: 'Eau, effluents', Icon: Droplets },
  waves: { label: 'Captage, cours d’eau', Icon: Waves },
  filter: { label: 'Traitement', Icon: Filter },
  recycle: { label: 'Gestion durable', Icon: Recycle },
  'trash-2': { label: 'Déchets', Icon: Trash2 },
  wind: { label: 'Air', Icon: Wind },
  leaf: { label: 'Environnement', Icon: Leaf },
  sprout: { label: 'Végétation, agriculture', Icon: Sprout },
  mountain: { label: 'Sol, mines', Icon: Mountain },
  activity: { label: 'Surveillance', Icon: Activity },
  microscope: { label: 'Analyse au laboratoire', Icon: Microscope },
  'flask-conical': { label: 'Qualité de l’eau', Icon: FlaskConical },
  gauge: { label: 'Instruments de mesure', Icon: Gauge },
  'building-2': { label: 'Bâtiment', Icon: Building2 },
  'hard-hat': { label: 'Chantier', Icon: HardHat },
  ruler: { label: 'Études techniques', Icon: Ruler },
  wrench: { label: 'Maintenance', Icon: Wrench },
  truck: { label: 'Logistique', Icon: Truck },
  cpu: { label: 'Informatique', Icon: Cpu },
  zap: { label: 'Électricité', Icon: Zap },
  lightbulb: { label: 'Conseil, innovation', Icon: Lightbulb },
  factory: { label: 'Industrie', Icon: Factory },
  'map-pin': { label: 'Terrain, localisation', Icon: MapPin },
  'graduation-cap': { label: 'Formation', Icon: GraduationCap },
  users: { label: 'Accompagnement', Icon: Users },
  'book-open': { label: 'Documentation', Icon: BookOpen },
};

export const SERVICE_ICON_KEYS = Object.keys(SERVICE_ICONS);

/** Pictogramme d'une clé, ou `null` si la clé est absente ou inconnue du site. */
export function serviceIcon(key: string | null | undefined): LucideIcon | null {
  return (key && SERVICE_ICONS[key]?.Icon) || null;
}
