import type {
  LegalBlock,
  LegalBuilder,
  LegalContext,
  LegalLabels,
} from './types';

/**
 * Textes légaux en français. Référence : ordonnance-loi n° 23/010 du 13 mars
 * 2023 portant Code du numérique (RDC) — articles cités après relecture du
 * texte publié sur droitnumerique.cd. Ces textes décrivent ce que fait
 * réellement le site ; toute fonction ajoutée (mesure d'audience, nouveau
 * prestataire, nouvelle donnée collectée) impose de les réviser et de mettre à
 * jour `LEGAL_UPDATED_ISO`. Texte à faire relire par un conseil juridique
 * d'EWES avant la mise en ligne.
 */
export const LEGAL_LABELS_FR: LegalLabels = {
  'mentions-legales': 'Mentions légales',
  confidentialite: 'Politique de confidentialité',
  cookies: 'Cookies et traceurs',
  'conditions-utilisation': 'Conditions d’utilisation',
};

const CODE = 'Code du numérique (ordonnance-loi n° 23/010 du 13 mars 2023)';

const mailto = (address: string) => `[${address}](mailto:${address})`;

/** Ligne de la fiche d'identité, absente quand la mention n'est pas renseignée. */
function fact(
  label: string,
  value: string | null,
): [label: string, value: string][] {
  return value ? [[label, value]] : [];
}

function hostingBlocks(ctx: LegalContext): LegalBlock[] {
  const { hostingName, hostingAddress } = ctx.legal;
  if (!hostingName) {
    return [
      {
        type: 'p',
        text: `Le site et ses données sont hébergés sur des serveurs sécurisés. Les coordonnées de l’hébergeur sont communiquées sur simple demande à ${mailto(ctx.email)}.`,
      },
    ];
  }
  return [
    {
      type: 'facts',
      rows: [['Hébergeur', hostingName], ...fact('Adresse', hostingAddress)],
    },
  ];
}

export const buildLegalFr: LegalBuilder = (ctx) => {
  const { legal } = ctx;
  const contact = mailto(legal.privacyEmail);

  return {
    'mentions-legales': {
      eyebrow: 'Mentions légales',
      title: 'Qui édite ce site, et à quelles conditions',
      intro:
        'Les informations d’identification de l’éditeur, de l’hébergeur et du concepteur du site, ainsi que les règles de propriété intellectuelle et de responsabilité qui s’y appliquent.',
      description:
        'Mentions légales du site d’EWES S.A.R.L. : éditeur, hébergeur, propriété intellectuelle, responsabilité et droit applicable.',
      sections: [
        {
          title: 'Éditeur du site',
          blocks: [
            {
              type: 'facts',
              rows: [
                [
                  'Dénomination',
                  'EWES S.A.R.L. — Environment, Water and Engineering Services',
                ],
                ['Forme juridique', 'Société à responsabilité limitée'],
                ...fact('Capital social', legal.capital),
                ['Siège social', ctx.address],
                [
                  'Téléphone',
                  `[${ctx.phone}](tel:${ctx.phone.replace(/[^\d+]/g, '')})`,
                ],
                ['E-mail', mailto(ctx.email)],
                ...fact('Registre du commerce (RCCM)', legal.rccm),
                ...fact('Identification nationale', legal.idNat),
                ...fact('Numéro d’impôt (NIF)', legal.nif),
                ...fact('Représentant légal', legal.representative),
                ...fact('Responsable de la publication', legal.representative),
              ],
            },
            {
              type: 'p',
              text: `Ces informations sont publiées conformément à l’article 52 du ${CODE}, qui impose à toute personne exerçant une activité en ligne de les rendre accessibles de façon facile, directe et permanente.`,
            },
          ],
        },
        {
          title: 'Conception et réalisation',
          blocks: [
            {
              type: 'facts',
              rows: [
                ['Prestataire', 'Planning Events S.A.R.L.'],
                [
                  'Adresse',
                  '7B, Nouvelles galeries présidentielles, Kinshasa-Gombe, République démocratique du Congo',
                ],
              ],
            },
          ],
        },
        {
          title: 'Hébergement',
          blocks: hostingBlocks(ctx),
        },
        {
          title: 'Propriété intellectuelle',
          blocks: [
            {
              type: 'p',
              text: 'Le site est une œuvre protégée : sa structure, ses textes, ses études et rapports, ses photographies, ses illustrations, ses graphismes, son logo, ses marques et son code sont la propriété d’EWES S.A.R.L. ou de leurs auteurs, qui ont autorisé leur usage. Les logiciels, applications et plateformes numériques sont des œuvres de l’esprit protégées (art. 47 du Code du numérique, qui renvoie à l’ordonnance-loi n° 86-033 du 5 avril 1986 sur le droit d’auteur et les droits voisins).',
            },
            {
              type: 'p',
              text: 'Toute reproduction, représentation, modification ou exploitation, totale ou partielle, du site ou de l’un de ses éléments, par quelque procédé que ce soit, est interdite sans l’autorisation écrite préalable d’EWES. Sont tolérées :',
            },
            {
              type: 'list',
              items: [
                'la consultation et l’impression pour un usage personnel ou professionnel interne ;',
                'la citation brève, à titre d’illustration, avec mention claire de la source (« EWES S.A.R.L. ») et un lien vers la page d’origine ;',
                'le téléchargement des documents de la rubrique Documents, pour l’usage indiqué sur chaque document, sans altération de leur contenu.',
              ],
            },
            {
              type: 'p',
              text: 'Les noms et logos des clients, partenaires et bailleurs cités appartiennent à leurs titulaires et ne sont cités qu’à titre de référence.',
            },
          ],
        },
        {
          title: 'Responsabilité',
          blocks: [
            {
              type: 'p',
              text: 'EWES apporte le plus grand soin aux informations publiées, mais ne peut garantir qu’elles soient exemptes d’erreur ou à jour en toutes circonstances. Les contenus ont une portée informative : ils ne constituent ni un avis technique, ni une offre contractuelle, ni un engagement. Toute mission fait l’objet d’un échange et d’un accord écrit distincts.',
            },
            {
              type: 'p',
              text: 'Le site peut être interrompu pour maintenance ou en cas de force majeure. EWES ne répond pas des dommages résultant de l’usage du site, de son indisponibilité ou d’un contenu transmis par un tiers, sauf faute lourde ou dol de sa part.',
            },
          ],
        },
        {
          title: 'Liens hypertextes',
          blocks: [
            {
              type: 'p',
              text: 'Vous pouvez créer un lien vers une page du site à condition qu’il ne laisse pas croire à un partenariat ou à une approbation d’EWES, et que la page s’ouvre dans sa propre fenêtre. EWES peut demander le retrait d’un lien qui porterait atteinte à son image.',
            },
            {
              type: 'p',
              text: 'Le site renvoie vers des services tiers (réseaux sociaux, plan d’accès Google Maps). EWES n’exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu et à leurs pratiques.',
            },
          ],
        },
        {
          title: 'Signaler un contenu',
          blocks: [
            {
              type: 'p',
              text: `Si vous estimez qu’un contenu du site est illicite, inexact ou porte atteinte à vos droits, écrivez à ${mailto(ctx.email)} en précisant la page concernée et les raisons de votre signalement. EWES l’examine rapidement et retire ou corrige ce qui doit l’être.`,
            },
          ],
        },
        {
          title: 'Données personnelles et cookies',
          blocks: [
            {
              type: 'p',
              text: 'Le traitement des données personnelles est décrit dans la [politique de confidentialité](/confidentialite) ; l’usage des cookies, dans la page [Cookies et traceurs](/cookies). L’utilisation du site est encadrée par les [conditions d’utilisation](/conditions-utilisation).',
            },
          ],
        },
        {
          title: 'Droit applicable',
          blocks: [
            {
              type: 'p',
              text: 'Le site et ses conditions d’utilisation sont soumis au droit de la République démocratique du Congo, notamment au Code du numérique. En cas de différend, une solution amiable est recherchée en priorité ; à défaut, les juridictions congolaises compétentes sont seules compétentes.',
            },
          ],
        },
      ],
    },

    confidentialite: {
      eyebrow: 'Confidentialité',
      title: 'Vos données personnelles, expliquées simplement',
      intro:
        'EWES ne collecte que ce dont elle a besoin pour répondre à vos demandes et faire fonctionner son espace documentaire. Cette page dit lesquelles, pourquoi, pour combien de temps, et comment exercer vos droits.',
      description:
        'Politique de confidentialité d’EWES S.A.R.L. : données collectées, finalités, durées de conservation, destinataires, sécurité et droits des personnes (Code du numérique, RDC).',
      sections: [
        {
          title: 'L’essentiel',
          blocks: [
            {
              type: 'list',
              items: [
                '**Pas de suivi publicitaire.** Le site public n’installe ni cookie de mesure d’audience, ni cookie publicitaire, et ne vous profile pas.',
                '**Un seul formulaire public** : le formulaire de Contact. Ce que vous y écrivez sert à vous répondre, rien d’autre.',
                '**Vos données ne sont ni vendues, ni cédées** à des fins de prospection.',
                '**Vous gardez la main** : accès, correction, effacement, opposition — voir « Vos droits ».',
              ],
            },
          ],
        },
        {
          title: 'Qui est responsable de vos données',
          blocks: [
            {
              type: 'p',
              text: `Le responsable du traitement est **EWES S.A.R.L.**, ${ctx.address}. Pour toute question sur vos données ou pour exercer vos droits, écrivez à ${contact}.`,
            },
            {
              type: 'p',
              text: `Cette politique applique le Livre III, Titre III (« Des données personnelles ») du ${CODE}, notamment ses articles 192 à 196 (conditions de traitement), 209 à 216 (droits des personnes), 219 à 221 (obligations du responsable) et 244 (violation de données).`,
            },
            ...(legal.apdReceipt
              ? ([
                  {
                    type: 'p',
                    text: `Le traitement a fait l’objet d’une déclaration préalable auprès de l’Autorité de protection des données (art. 186) — récépissé : **${legal.apdReceipt}**.`,
                  },
                ] satisfies LegalBlock[])
              : []),
          ],
        },
        {
          title: 'Les données que nous traitons',
          blocks: [
            {
              type: 'table',
              head: [
                'Situation',
                'Données',
                'Pourquoi',
                'Durée de conservation',
              ],
              rows: [
                [
                  'Vous nous écrivez par le formulaire de Contact',
                  'Nom, organisation, adresse e-mail, téléphone (facultatif), besoin concerné, message, langue de la page',
                  'Répondre à votre demande. Fondement : votre consentement, donné en envoyant le formulaire (art. 192 et 193).',
                  '24 mois après le dernier échange, puis suppression.',
                ],
                [
                  'Vous recevez un accusé de réception ou une réponse',
                  'Adresse e-mail, état de l’envoi (envoyé, échec)',
                  'Vous confirmer la bonne réception de votre message et en garder la preuve.',
                  'Même durée que le message de contact.',
                ],
                [
                  'Vous avez un compte sur le portail ou l’espace documentaire privé',
                  'Nom, adresse e-mail, rôle, photo (facultative), mot de passe (conservé de façon sécurisée), données de connexion (navigateur, adresse IP)',
                  'Gérer votre accès et sécuriser l’espace (art. 219 et 221).',
                  'Pendant la durée du compte ; les données de connexion sont conservées pour une durée limitée.',
                ],
                [
                  'Vous utilisez le portail ou l’espace documentaire privé',
                  'Journal d’activité de l’espace : connexions et opérations effectuées sur les documents',
                  'Protéger les documents et garder la trace des opérations effectuées (art. 219).',
                  '5 ans.',
                ],
                [
                  'Vous visitez le site',
                  'Données techniques transmises par votre navigateur (adresse IP, date et page demandée) dans les journaux du serveur',
                  'Assurer la sécurité et le bon fonctionnement du site.',
                  '12 mois au plus.',
                ],
              ],
            },
            {
              type: 'note',
              text: 'Merci de **ne pas** nous envoyer, par le formulaire, de données sensibles (origine ethnique, opinions politiques ou religieuses, appartenance syndicale, santé, vie sexuelle…). Le Code du numérique en interdit en principe le traitement (art. 195) et nous n’en avons pas besoin pour répondre à une demande.',
            },
          ],
        },
        {
          title: 'Ce que nous ne faisons pas',
          blocks: [
            {
              type: 'list',
              items: [
                'Pas de mesure d’audience, de publicité ciblée ni de profilage ; aucune décision automatisée ne vous concerne.',
                'Pas de réseau social, de vidéo ou de carte intégré à nos pages : les liens vers ces services sont de simples liens, qui ne transmettent rien tant que vous ne cliquez pas.',
                'Pas de transmission de vos données à d’autres organismes pour de la prospection sans votre consentement (art. 198).',
              ],
            },
          ],
        },
        {
          title: 'Qui y a accès',
          blocks: [
            {
              type: 'list',
              items: [
                '**L’équipe EWES habilitée.** Les messages de contact ne sont accessibles qu’aux personnes qui doivent les traiter ; leurs accès sont limités à leurs fonctions (art. 219-2).',
                '**Nos prestataires techniques**, qui agissent pour notre compte et sont tenus à la confidentialité : l’hébergeur du site et le service qui achemine les e-mails.',
                '**Les autorités**, uniquement sur réquisition ou requête d’un magistrat dans le cadre d’une enquête judiciaire (art. 199).',
              ],
            },
          ],
        },
        {
          title: 'Où sont stockées les données',
          blocks: [
            {
              type: 'p',
              text: `Le Code du numérique veut que les données personnelles soient stockées et hébergées en République démocratique du Congo ; un transfert vers un hébergeur situé dans un autre pays n’est possible que si l’Autorité de protection des données reconnaît à ce pays un niveau de protection adéquat et l’autorise (art. 201 et 202). EWES s’y conforme${legal.hostingName ? ` ; le site est hébergé par ${legal.hostingName}${legal.hostingAddress ? ` (${legal.hostingAddress})` : ''}` : ''}.`,
            },
          ],
        },
        {
          title: 'Comment nous les protégeons',
          blocks: [
            {
              type: 'list',
              items: [
                'Échanges chiffrés entre votre navigateur et le site.',
                'Accès aux données limité aux seules personnes habilitées.',
                'Autres mesures techniques et organisationnelles appropriées à la sensibilité des données (art. 219 et 221).',
              ],
            },
            {
              type: 'p',
              text: 'En cas de violation de données qui vous concernerait, EWES en informe sans délai l’Autorité de protection des données et les personnes touchées, en décrivant la nature de l’incident, ses conséquences probables et les mesures prises (art. 244).',
            },
          ],
        },
        {
          title: 'Vos droits',
          blocks: [
            {
              type: 'p',
              text: 'Vous pouvez à tout moment, gratuitement :',
            },
            {
              type: 'list',
              items: [
                '**Savoir et accéder** : demander si nous détenons des données vous concernant, lesquelles, d’où elles viennent, à qui elles sont communiquées et combien de temps elles sont gardées — et en recevoir une copie (art. 209 et 210).',
                '**Faire corriger** ou faire mettre à jour des données inexactes, incomplètes ou périmées (art. 214).',
                '**Faire effacer** vos données dans un délai de 30 jours lorsqu’elles ne sont plus nécessaires, ou si vous retirez votre consentement (art. 215).',
                '**Vous opposer**, pour des motifs légitimes, à ce que vos données soient traitées (art. 213).',
                '**Retirer votre consentement**, aussi simplement que vous l’avez donné, sans effet sur ce qui a été fait avant (art. 196).',
                '**Récupérer vos données** dans un format structuré et lisible, quand le traitement repose sur votre consentement ou un contrat (art. 211).',
              ],
            },
            {
              type: 'p',
              text: `**Comment faire.** Écrivez à ${contact}, ou par courrier au siège d’EWES, en joignant un justificatif d’identité. La loi demande une demande datée et signée, par voie postale ou électronique (art. 213 et 214). Nous vous répondons dans les 30 jours (60 jours pour la remise d’une copie des données, art. 210).`,
            },
            {
              type: 'p',
              text: 'Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de l’**Autorité de protection des données** (art. 209 et 263), sans préjudice d’un recours devant les tribunaux.',
            },
          ],
        },
        {
          title: 'Cookies',
          blocks: [
            {
              type: 'p',
              text: 'Le site public n’utilise que des témoins strictement nécessaires à son fonctionnement. Le détail est dans la page [Cookies et traceurs](/cookies).',
            },
          ],
        },
        {
          title: 'Modifications de cette politique',
          blocks: [
            {
              type: 'p',
              text: 'Cette politique est révisée lorsque nos pratiques changent (nouveau service, nouveau prestataire, nouvelle donnée collectée). La date de dernière mise à jour figure en haut de la page ; en cas de changement important, une information claire est affichée sur le site.',
            },
          ],
        },
      ],
    },

    cookies: {
      eyebrow: 'Cookies',
      title: 'Ce que ce site dépose sur votre appareil',
      intro:
        'Presque rien. Le site public ne dépose aucun cookie de mesure d’audience ni de publicité, c’est pourquoi vous ne voyez pas de bandeau à accepter.',
      description:
        'Cookies et traceurs utilisés par le site d’EWES S.A.R.L. : uniquement des témoins strictement nécessaires, aucun suivi publicitaire ni mesure d’audience.',
      sections: [
        {
          title: 'Ce qu’est un cookie',
          blocks: [
            {
              type: 'p',
              text: 'Un cookie est un petit fichier déposé par un site dans votre navigateur. Il sert à mémoriser une information (votre langue, le fait que vous êtes connecté…). Le stockage local du navigateur joue le même rôle et suit les mêmes règles ; nous l’appelons ici « traceur » pour les deux.',
            },
          ],
        },
        {
          title: 'Ce que nous utilisons',
          blocks: [
            {
              type: 'table',
              head: ['Nom', 'Où', 'À quoi il sert', 'Durée'],
              rows: [
                [
                  'Préférence de langue',
                  'Site public',
                  'Se souvenir de la langue (français ou anglais) que vous avez choisie. Déposé seulement si elle diffère de celle de votre navigateur.',
                  'Session : effacé à la fermeture du navigateur.',
                ],
                [
                  'Session de connexion',
                  'Portail et espace documentaire privé, après connexion',
                  'Vous maintenir connecté pendant votre visite.',
                  'Durée limitée ; supprimés à la déconnexion.',
                ],
                [
                  'Stockage local (thème, barre latérale, mode d’affichage)',
                  'Portail uniquement',
                  'Retenir vos préférences d’affichage. Aucune donnée personnelle.',
                  'Jusqu’à ce que vous les effaciez.',
                ],
              ],
            },
            {
              type: 'p',
              text: 'Ces traceurs sont **strictement nécessaires** au service que vous demandez : ils n’exigent pas de consentement préalable et ne peuvent pas être désactivés sur le site sans le casser.',
            },
          ],
        },
        {
          title: 'Ce que nous n’utilisons pas',
          blocks: [
            {
              type: 'list',
              items: [
                'Aucune mesure d’audience ni statistique de fréquentation.',
                'Aucun cookie publicitaire, aucun pixel de suivi, aucun profilage.',
                'Aucune police de caractères chargée depuis un service tiers : elles sont servies par le site lui-même.',
                'Aucun bouton de réseau social, vidéo ou carte intégrés : les liens de partage et d’itinéraire sont de simples liens vers d’autres sites ; ceux-ci appliquent leurs propres règles une fois que vous y êtes.',
              ],
            },
            {
              type: 'note',
              text: 'Le Code du numérique ne contient pas de disposition propre aux cookies. EWES applique donc les principes qu’il pose pour toute donnée : transparence, finalité précise et collecte limitée à l’utile (art. 193 et 194).',
            },
          ],
        },
        {
          title: 'Les gérer',
          blocks: [
            {
              type: 'p',
              text: 'Vous pouvez à tout moment voir, bloquer ou supprimer les cookies dans les réglages de votre navigateur (rubrique « confidentialité » ou « cookies »). Conséquences : le site public s’affichera dans la langue de votre navigateur, et vous devrez vous reconnecter au portail à chaque visite.',
            },
          ],
        },
        {
          title: 'Si cela change',
          blocks: [
            {
              type: 'p',
              text: 'Si EWES devait un jour ajouter un outil de mesure d’audience ou tout autre traceur non nécessaire, un bandeau demanderait votre accord **avant** tout dépôt, et cette page serait mise à jour. Pour toute question : [politique de confidentialité](/confidentialite).',
            },
          ],
        },
      ],
    },

    'conditions-utilisation': {
      eyebrow: 'Conditions d’utilisation',
      title: 'Les règles du jeu pour utiliser ce site',
      intro:
        'Quelques règles simples pour que le site reste utile, sûr et respectueux de chacun. En l’utilisant, vous les acceptez.',
      description:
        'Conditions d’utilisation du site d’EWES S.A.R.L. : accès, contenus, espace documentaire privé, formulaire de contact, comportements interdits et responsabilité.',
      sections: [
        {
          title: 'Objet',
          blocks: [
            {
              type: 'p',
              text: 'Ces conditions encadrent l’usage du site d’EWES S.A.R.L. : le site public (présentation, services, réalisations, actualités, documents, contact) et l’espace documentaire privé réservé aux personnes habilitées. Elles complètent les [mentions légales](/mentions-legales) et la [politique de confidentialité](/confidentialite).',
            },
          ],
        },
        {
          title: 'Accès au site',
          blocks: [
            {
              type: 'p',
              text: 'Le site public est librement accessible et gratuit ; les frais de connexion restent à votre charge. EWES s’efforce de le maintenir disponible mais peut l’interrompre pour maintenance, mise à jour ou raison de sécurité, sans préavis ni indemnité.',
            },
          ],
        },
        {
          title: 'Contenus et documents publics',
          blocks: [
            {
              type: 'p',
              text: 'Les contenus sont fournis à titre informatif. Les documents de la rubrique Documents peuvent être téléchargés et utilisés pour un usage personnel ou professionnel, à condition d’en citer la source et de ne pas les modifier. Toute autre réutilisation, notamment commerciale, demande l’accord écrit d’EWES (voir [propriété intellectuelle](/mentions-legales)).',
            },
          ],
        },
        {
          title: 'Espace documentaire privé',
          blocks: [
            {
              type: 'p',
              text: 'L’accès est réservé aux personnes à qui EWES a ouvert un compte, avec des droits propres à chacune. Si vous en avez un :',
            },
            {
              type: 'list',
              items: [
                'votre compte est **personnel** : ne partagez ni votre mot de passe ni votre session ;',
                'vous ne consultez et ne diffusez que les documents auxquels vous avez droit, et respectez leur niveau de confidentialité ;',
                'vous prévenez EWES sans délai si vous soupçonnez un accès non autorisé à votre compte ;',
                'vos connexions et vos opérations sur les documents peuvent être enregistrées à des fins de sécurité, comme l’explique la [politique de confidentialité](/confidentialite).',
              ],
            },
            {
              type: 'p',
              text: 'EWES peut suspendre ou supprimer un compte en cas de manquement à ces règles, d’inactivité prolongée ou de demande de son titulaire.',
            },
          ],
        },
        {
          title: 'Formulaire de contact',
          blocks: [
            {
              type: 'p',
              text: 'Les informations que vous transmettez doivent être exactes et vous concerner. Le formulaire n’est pas destiné à la prospection commerciale non sollicitée (« pourriel » ou spam, défini à l’article 2 du Code du numérique et puni par son article 363), ni à l’envoi de données sensibles ou de documents confidentiels : EWES vous indiquera comment les lui transmettre de façon sûre si votre demande l’exige.',
            },
          ],
        },
        {
          title: 'Ce qui est interdit',
          blocks: [
            {
              type: 'list',
              items: [
                'tenter d’accéder sans droit à une zone, un compte ou un document, ou contourner une mesure de sécurité ;',
                'perturber le fonctionnement du site (envois massifs, extraction automatisée intensive, code malveillant) ;',
                'usurper l’identité d’une personne ou d’une organisation ;',
                'transmettre un contenu illicite, diffamatoire ou portant atteinte aux droits d’autrui.',
              ],
            },
            {
              type: 'p',
              text: 'Le Livre IV du Code du numérique (sécurité et protection pénale des systèmes informatiques) réprime notamment l’accès frauduleux aux systèmes et l’atteinte à leurs données. EWES se réserve le droit de bloquer les accès concernés et d’engager toute poursuite utile.',
            },
          ],
        },
        {
          title: 'Responsabilité',
          blocks: [
            {
              type: 'p',
              text: 'Les limites de responsabilité d’EWES, ainsi que le traitement des liens vers d’autres sites, figurent dans les [mentions légales](/mentions-legales). Vous restez responsable de l’usage que vous faites du site et des informations que vous y publiez ou transmettez.',
            },
          ],
        },
        {
          title: 'Évolution des conditions',
          blocks: [
            {
              type: 'p',
              text: 'EWES peut modifier ces conditions pour suivre l’évolution du site ou de la réglementation. La version en vigueur est celle publiée sur cette page, à la date indiquée en haut.',
            },
          ],
        },
        {
          title: 'Droit applicable',
          blocks: [
            {
              type: 'p',
              text: 'Ces conditions sont régies par le droit de la République démocratique du Congo. Les différends sont réglés à l’amiable en priorité, à défaut devant les juridictions congolaises compétentes.',
            },
          ],
        },
      ],
    },
  };
};
