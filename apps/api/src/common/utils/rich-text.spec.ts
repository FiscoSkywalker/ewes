import { isRichHtml, normalizeRichText, plainTextToHtml } from './rich-text.js';

describe('normalizeRichText', () => {
  it('conserve la mise en forme prévue', () => {
    const html =
      '<h2>Titre</h2><p>Du <strong>gras</strong> et de l’<em>italique</em>.</p>' +
      '<ul><li>un</li></ul><ol><li>deux</li></ol><blockquote><p>cité</p></blockquote>';
    expect(normalizeRichText(html)).toBe(html);
  });

  it('retire scripts, gestionnaires d’événements, styles et classes', () => {
    const out = normalizeRichText(
      '<p class="x" style="color:red" onclick="alert(1)">Bonjour<script>alert(1)</script></p>' +
        '<iframe src="https://evil.example"></iframe>',
    );
    expect(out).toBe('<p>Bonjour</p>');
  });

  it('refuse les liens dangereux et impose rel/target aux liens externes', () => {
    const out = normalizeRichText(
      '<p><a href="javascript:alert(1)">piège</a> ' +
        '<a href="https://example.org" target="_self" rel="opener">externe</a> ' +
        '<a href="/contact">interne</a> <a href="mailto:a@b.cd">écrire</a></p>',
    );
    expect(out).not.toContain('javascript');
    expect(out).toContain(
      '<a href="https://example.org" rel="noopener noreferrer" target="_blank">externe</a>',
    );
    expect(out).toContain('<a href="/contact">interne</a>');
    expect(out).toContain('<a href="mailto:a@b.cd">écrire</a>');
  });

  it('n’accepte que les images de la médiathèque', () => {
    const out = normalizeRichText(
      '<p>a</p><img src="/uploads/photo-1.webp" alt="Une photo" onerror="x()">' +
        '<img src="https://evil.example/pixel.png"><img src="//evil.example/x.png">' +
        '<img src="data:image/png;base64,AAAA"><img src="/uploads/../secret">',
    );
    expect(out).toBe(
      '<p>a</p><img src="/uploads/photo-1.webp" alt="Une photo" />',
    );
  });

  it('ramène les titres et balises de collage aux niveaux admis', () => {
    expect(
      normalizeRichText('<h1>A</h1><p><b>b</b><i>i</i></p><h4>C</h4>'),
    ).toBe('<h2>A</h2><p><strong>b</strong><em>i</em></p><h3>C</h3>');
  });

  it('convertit l’ancien texte brut en paragraphes, sans l’interpréter comme du HTML', () => {
    expect(
      normalizeRichText('Premier & <b>un</b>.\n\nSecond\nsur deux lignes.'),
    ).toBe(
      '<p>Premier &amp; &lt;b&gt;un&lt;/b&gt;.</p><p>Second<br />sur deux lignes.</p>',
    );
  });

  it('ramène un contenu vide à une chaîne vide', () => {
    expect(normalizeRichText('<p></p>')).toBe('');
    expect(normalizeRichText('<p>&nbsp; </p><p><br></p>')).toBe('');
    expect(normalizeRichText('  \n\n ')).toBe('');
  });

  it('retire les paragraphes vides, y compris en fin de texte', () => {
    expect(
      normalizeRichText('<p>a</p><p></p><p><br></p><p>b</p><p> </p>'),
    ).toBe('<p>a</p><p>b</p>');
  });

  it('garde une page qui ne contient qu’une image', () => {
    expect(normalizeRichText('<img src="/uploads/a.png" alt="">')).toContain(
      '<img',
    );
  });
});

describe('isRichHtml / plainTextToHtml', () => {
  it('distingue le HTML de l’ancien texte', () => {
    expect(isRichHtml('<p>x</p>')).toBe(true);
    expect(isRichHtml('  <h2>x</h2>')).toBe(true);
    expect(isRichHtml('Un texte <p>avec</p> une balise')).toBe(false);
  });

  it('échappe le texte', () => {
    expect(plainTextToHtml('a < b')).toBe('<p>a &lt; b</p>');
  });
});
