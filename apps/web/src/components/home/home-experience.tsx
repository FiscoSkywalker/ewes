import { useTranslations } from 'next-intl';
import { ContactBlock } from '@/components/public/contact-block';
import { Hero } from './sections/hero';
import { AboutSection } from './sections/about-section';
import { ClientsMarquee } from './sections/clients-marquee';
import { PolesSection } from './sections/poles-section';
import { MethodSection } from './sections/method-section';
import { FeaturedProjects } from './sections/featured-projects';
import { TrainingSection } from './sections/training-section';
import { NewsSection } from './sections/news-section';
import { DocumentsSection } from './sections/documents-section';
import { FOUNDING_YEAR } from '@/data/metrics';
import type {
  PoleContent,
  ServicePole,
} from '@/components/public/service-chapter';
import type { ShowcaseDocument } from '@/components/public/documents-showcase';
import type { Project } from '@/data/projects';
import type { HomeNews } from '@/lib/news';

/**
 * Page d'Accueil (blueprint/15/16), rendue côté serveur comme le reste du
 * site public : seuls le hero (pause des animations, « Faire défiler »), le
 * bandeau de logos, les actualités (rotation) et le bloc contact (formulaire)
 * sont des composants client. Aucune scène WebGL : la page reste légère.
 *
 * Parcours : hero (qui est EWES en cinq secondes) → ils nous font confiance
 * → 01 qui est EWES → 02 les trois pôles → 03 méthode → 04 réalisations
 * phares → 05 formation → 06 actualités → 07 documents → 08 contact. Le
 * détail (prestations, publics, frise des missions, objectifs de recherche,
 * thèmes de formation) vit sur les pages dédiées.
 */
export function HomeExperience({
  lead,
  news,
  poles,
  projects,
  documents,
}: {
  /** Paragraphe d'accroche du hero (page « accueil » du portail, sinon texte d'origine). */
  lead: string;
  news: HomeNews;
  /** Références publiées (API, repli sur les messages). */
  projects: Project[];
  /** Documents publics publiés (API). */
  documents: ShowcaseDocument[];
  /** Pôles de services pilotés par l'API (repli sur les messages si absents). */
  poles?: Partial<Record<ServicePole, PoleContent>>;
}) {
  const tWorld = useTranslations('World');

  // Mêmes sources que la page À propos : registre des réalisations et
  // liste des opérateurs miniers accompagnés.
  const stats = {
    year: FOUNDING_YEAR,
    missions: projects.length,
    operators: (tWorld.raw('clients') as string[]).length,
    poles: 3,
  };

  return (
    <div className="relative bg-background text-sand selection:bg-primary selection:text-white">
      <Hero lead={lead} proof={stats} exploreTargetId="qui-est-ewes" />

      <ClientsMarquee />

      <AboutSection stats={stats} />

      <PolesSection poles={poles} />
      <MethodSection />
      <FeaturedProjects projects={projects} />
      <TrainingSection projects={projects} />
      <NewsSection news={news} />
      <DocumentsSection documents={documents} />
      <ContactBlock />
    </div>
  );
}
