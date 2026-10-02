import { NextResponse } from 'next/server';
import fr from '../../../../../messages/fr.json';
import en from '../../../../../messages/en.json';
import {
  SITE_PAGES,
  type PageTexts,
  type SitePageDefaults,
} from '@/lib/site-pages';

type Messages = Record<
  string,
  { eyebrow: string; title: string; description: string }
>;

const textsOf = (messages: Messages, namespace: string): PageTexts => ({
  eyebrow: messages[namespace].eyebrow,
  title: messages[namespace].title,
  intro: messages[namespace].description,
});

/**
 * Textes d'origine de l'en-tête de chaque page du site : ce que le visiteur
 * lit tant que la page n'est pas publiée depuis le portail. Le portail s'en
 * sert pour pré-remplir un formulaire vierge (on part de ce qui est en ligne,
 * pas d'une page blanche). Textes déjà publics : aucune authentification, et
 * la route n'est pas dans le bundle du portail (les fichiers de messages font
 * ~100 Ko).
 */
export function GET() {
  const defaults = Object.fromEntries(
    SITE_PAGES.map((page) => [
      page.slug,
      {
        fr: textsOf(fr as unknown as Messages, page.namespace),
        en: textsOf(en as unknown as Messages, page.namespace),
      },
    ]),
  ) as SitePageDefaults;
  return NextResponse.json(defaults);
}
