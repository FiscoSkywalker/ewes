/**
 * Corps d'un article : HTML nettoyé par l'API (actualités rédigées dans le
 * portail) ou paragraphes (articles d'avant l'éditeur, textes de repli de
 * `messages/`). Le HTML n'est jamais construit ici : il vient de l'API, qui
 * le nettoie à chaque enregistrement (`normalizeRichText`) — rien d'autre
 * que le contenu d'un article ne doit passer par ce composant.
 */
export function ArticleBody({
  html,
  paragraphs,
  className,
}: {
  html?: string;
  paragraphs?: string[];
  className?: string;
}) {
  const classes = [
    'article-prose article-prose--dropcap text-base text-sand/85 [--prose-link:var(--color-malachite)] [--prose-muted:color-mix(in_srgb,var(--color-sand)_75%,transparent)]',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  if (html) {
    return (
      <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />
    );
  }
  return (
    <div className={classes}>
      {paragraphs?.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}
