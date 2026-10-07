import type {
  LegalBlock,
  LegalBuilder,
  LegalContext,
  LegalLabels,
} from './types';

/**
 * English version of the legal texts — same substance, same articles as
 * `content-fr.ts` (French is the reference). Any change must be made in both
 * files. To be reviewed by EWES's legal adviser before going live.
 */
export const LEGAL_LABELS_EN: LegalLabels = {
  'mentions-legales': 'Legal notice',
  confidentialite: 'Privacy policy',
  cookies: 'Cookies and trackers',
  'conditions-utilisation': 'Terms of use',
};

const CODE = 'Digital Code (Ordinance-Law No. 23/010 of 13 March 2023)';

const mailto = (address: string) => `[${address}](mailto:${address})`;

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
        text: `The site and its data are hosted on secure servers. The host’s details are available on request at ${mailto(ctx.email)}.`,
      },
    ];
  }
  return [
    {
      type: 'facts',
      rows: [['Host', hostingName], ...fact('Address', hostingAddress)],
    },
  ];
}

export const buildLegalEn: LegalBuilder = (ctx) => {
  const { legal } = ctx;
  const contact = mailto(legal.privacyEmail);

  return {
    'mentions-legales': {
      eyebrow: 'Legal notice',
      title: 'Who publishes this site, and on what terms',
      intro:
        'Identification of the publisher, host and designer of the site, together with the intellectual property and liability rules that apply to it.',
      description:
        'Legal notice of the EWES S.A.R.L. website: publisher, host, intellectual property, liability and applicable law.',
      sections: [
        {
          title: 'Site publisher',
          blocks: [
            {
              type: 'facts',
              rows: [
                [
                  'Company name',
                  'EWES S.A.R.L. — Environment, Water and Engineering Services',
                ],
                ['Legal form', 'Limited liability company (S.A.R.L.)'],
                ...fact('Share capital', legal.capital),
                ['Registered office', ctx.address],
                [
                  'Telephone',
                  `[${ctx.phone}](tel:${ctx.phone.replace(/[^\d+]/g, '')})`,
                ],
                ['E-mail', mailto(ctx.email)],
                ...fact('Trade register (RCCM)', legal.rccm),
                ...fact('National identification (Id. Nat.)', legal.idNat),
                ...fact('Tax number (NIF)', legal.nif),
                ...fact('Legal representative', legal.representative),
                ...fact('Publication manager', legal.representative),
              ],
            },
            {
              type: 'p',
              text: `This information is published in accordance with Article 52 of the ${CODE}, which requires anyone carrying out an online activity to make it easily, directly and permanently accessible.`,
            },
          ],
        },
        {
          title: 'Design and development',
          blocks: [
            {
              type: 'facts',
              rows: [
                ['Provider', 'Planning Events S.A.R.L.'],
                [
                  'Address',
                  '7B, Nouvelles galeries présidentielles, Kinshasa-Gombe, Democratic Republic of the Congo',
                ],
              ],
            },
          ],
        },
        {
          title: 'Hosting',
          blocks: hostingBlocks(ctx),
        },
        {
          title: 'Intellectual property',
          blocks: [
            {
              type: 'p',
              text: 'The site is a protected work: its structure, texts, studies and reports, photographs, illustrations, graphics, logo, trademarks and code belong to EWES S.A.R.L. or to their authors, who have authorised their use. Software, applications and digital platforms are protected works of the mind (Art. 47 of the Digital Code, which refers to Ordinance-Law No. 86-033 of 5 April 1986 on copyright and neighbouring rights).',
            },
            {
              type: 'p',
              text: 'Any reproduction, representation, modification or use, in whole or in part, of the site or any of its elements, by any means, is prohibited without EWES’s prior written permission. The following are tolerated:',
            },
            {
              type: 'list',
              items: [
                'viewing and printing for personal use or internal professional use;',
                'brief quotation, by way of illustration, with a clear credit to the source (“EWES S.A.R.L.”) and a link to the original page;',
                'downloading the documents in the Documents section, for the use stated on each document and without altering their content.',
              ],
            },
            {
              type: 'p',
              text: 'The names and logos of the clients, partners and funders mentioned belong to their owners and are cited for reference only.',
            },
          ],
        },
        {
          title: 'Liability',
          blocks: [
            {
              type: 'p',
              text: 'EWES takes great care over the information it publishes but cannot guarantee that it is error-free or up to date in every circumstance. The content is informative: it is neither technical advice, nor a contractual offer, nor a commitment. Every assignment is the subject of a separate discussion and written agreement.',
            },
            {
              type: 'p',
              text: 'The site may be interrupted for maintenance or in a case of force majeure. EWES is not liable for damage resulting from the use of the site, its unavailability or content supplied by a third party, except in case of gross negligence or wilful misconduct.',
            },
          ],
        },
        {
          title: 'Hyperlinks',
          blocks: [
            {
              type: 'p',
              text: 'You may link to a page of the site provided the link does not suggest a partnership or an endorsement by EWES and the page opens in its own window. EWES may ask for the removal of a link that harms its image.',
            },
            {
              type: 'p',
              text: 'The site links to third-party services (social networks, Google Maps directions). EWES has no control over those sites and accepts no responsibility for their content or practices.',
            },
          ],
        },
        {
          title: 'Reporting content',
          blocks: [
            {
              type: 'p',
              text: `If you believe content on the site is unlawful, inaccurate or infringes your rights, write to ${mailto(ctx.email)} stating the page concerned and your reasons. EWES will review it promptly and remove or correct whatever needs to be.`,
            },
          ],
        },
        {
          title: 'Personal data and cookies',
          blocks: [
            {
              type: 'p',
              text: 'The processing of personal data is described in the [privacy policy](/confidentialite); the use of cookies, on the [Cookies and trackers](/cookies) page. Use of the site is governed by the [terms of use](/conditions-utilisation).',
            },
          ],
        },
        {
          title: 'Applicable law',
          blocks: [
            {
              type: 'p',
              text: 'The site and its terms of use are governed by the law of the Democratic Republic of the Congo, in particular the Digital Code. In the event of a dispute, an amicable solution is sought first; failing that, the competent Congolese courts have sole jurisdiction.',
            },
          ],
        },
      ],
    },

    confidentialite: {
      eyebrow: 'Privacy',
      title: 'Your personal data, plainly explained',
      intro:
        'EWES collects only what it needs to answer your requests and run its document space. This page says which data, why, for how long, and how to exercise your rights.',
      description:
        'Privacy policy of EWES S.A.R.L.: data collected, purposes, retention periods, recipients, security and individuals’ rights (Digital Code, DRC).',
      sections: [
        {
          title: 'The essentials',
          blocks: [
            {
              type: 'list',
              items: [
                '**No advertising tracking.** The public site installs no audience-measurement or advertising cookies and does not profile you.',
                '**A single public form**: the Contact form. What you write there is used to reply to you, nothing else.',
                '**Your data is neither sold nor passed on** for prospecting.',
                '**You stay in control**: access, correction, erasure, objection — see “Your rights”.',
              ],
            },
          ],
        },
        {
          title: 'Who is responsible for your data',
          blocks: [
            {
              type: 'p',
              text: `The data controller is **EWES S.A.R.L.**, ${ctx.address}. For any question about your data or to exercise your rights, write to ${contact}.`,
            },
            {
              type: 'p',
              text: `This policy applies Book III, Title III (“Personal data”) of the ${CODE}, in particular Articles 192 to 196 (conditions of processing), 209 to 216 (individuals’ rights), 219 to 221 (controller’s obligations) and 244 (data breaches).`,
            },
            ...(legal.apdReceipt
              ? ([
                  {
                    type: 'p',
                    text: `The processing has been declared in advance to the Data Protection Authority (Art. 186) — receipt: **${legal.apdReceipt}**.`,
                  },
                ] satisfies LegalBlock[])
              : []),
          ],
        },
        {
          title: 'The data we process',
          blocks: [
            {
              type: 'table',
              head: ['Situation', 'Data', 'Why', 'Retention'],
              rows: [
                [
                  'You write to us through the Contact form',
                  'Name, organisation, e-mail address, telephone (optional), subject of your request, message, language of the page',
                  'To answer your request. Basis: your consent, given by sending the form (Art. 192 and 193).',
                  '24 months after the last exchange, then deletion.',
                ],
                [
                  'You receive an acknowledgement or a reply',
                  'E-mail address, delivery status (sent, failed)',
                  'To confirm your message arrived and keep proof of it.',
                  'Same as the contact message.',
                ],
                [
                  'You have an account on the portal or the private document space (by invitation)',
                  'Name, e-mail address, role, photo (optional), password (stored in irreversibly encrypted form, never in clear), login sessions (browser, IP address)',
                  'To manage your access and secure the space (Art. 219 and 221).',
                  'For the life of the account; sessions expire after 7 days at most.',
                ],
                [
                  'You use the portal or the private document space',
                  'Log of sensitive actions: sign-in, failed sign-ins, viewing and editing documents, changes of access rights',
                  'To protect documents, prove who did what and detect abnormal use (Art. 219-14).',
                  '5 years. This log is tamper-proof by design.',
                ],
                [
                  'You visit the site',
                  'Technical data sent by your browser (IP address, date and page requested) in server logs',
                  'To keep the site secure and working properly.',
                  '12 months at most.',
                ],
              ],
            },
            {
              type: 'note',
              text: 'Please **do not** send sensitive data through the form (ethnic origin, political or religious opinions, trade-union membership, health, sex life…). The Digital Code in principle prohibits processing it (Art. 195) and we do not need it to answer a request.',
            },
          ],
        },
        {
          title: 'What we do not do',
          blocks: [
            {
              type: 'list',
              items: [
                'No audience measurement, targeted advertising or profiling; no automated decision concerns you.',
                'No social network, video or map embedded in our pages: links to those services are plain links and send nothing unless you click.',
                'No passing of your data to other organisations for prospecting without your consent (Art. 198).',
              ],
            },
          ],
        },
        {
          title: 'Who can access it',
          blocks: [
            {
              type: 'list',
              items: [
                '**Authorised EWES staff.** Contact messages are available only to those who must handle them; their access is limited to their duties (Art. 219-2).',
                '**Our technical providers**, who act on our behalf and are bound to confidentiality: the site host and the service that delivers e-mails.',
                '**Authorities**, only on a magistrate’s order or request in a judicial investigation (Art. 199).',
              ],
            },
          ],
        },
        {
          title: 'Where the data is stored',
          blocks: [
            {
              type: 'p',
              text: `The Digital Code requires personal data to be stored and hosted in the Democratic Republic of the Congo; a transfer to a host in another country is possible only if the Data Protection Authority recognises that country as offering an adequate level of protection and authorises it (Art. 201 and 202). EWES complies${legal.hostingName ? `; the site is hosted by ${legal.hostingName}${legal.hostingAddress ? ` (${legal.hostingAddress})` : ''}` : ''}.`,
            },
          ],
        },
        {
          title: 'How we protect it',
          blocks: [
            {
              type: 'list',
              items: [
                'Encrypted connection (HTTPS) across the whole site.',
                'Passwords stored in irreversibly encrypted form (Argon2id); temporary lockout after repeated failed sign-ins.',
                'Role-based access rights, always checked by the server; the private document space is strictly separated from the public site and never indexed by search engines.',
                'Tamper-proof audit log of sensitive actions, and protected backups (Art. 219-15).',
              ],
            },
            {
              type: 'p',
              text: 'If a data breach concerned you, EWES informs the Data Protection Authority and the people affected without delay, describing the nature of the incident, its likely consequences and the measures taken (Art. 244).',
            },
          ],
        },
        {
          title: 'Your rights',
          blocks: [
            {
              type: 'p',
              text: 'At any time, free of charge, you may:',
            },
            {
              type: 'list',
              items: [
                '**Know and access**: ask whether we hold data about you, which data, where it comes from, who receives it and how long it is kept — and receive a copy (Art. 209 and 210).',
                '**Have it corrected** or updated if it is inaccurate, incomplete or out of date (Art. 214).',
                '**Have it erased** within 30 days when it is no longer necessary, or if you withdraw your consent (Art. 215).',
                '**Object**, on legitimate grounds, to your data being processed (Art. 213).',
                '**Withdraw your consent**, as easily as you gave it, without affecting what was done before (Art. 196).',
                '**Retrieve your data** in a structured, readable format, where the processing is based on your consent or a contract (Art. 211).',
              ],
            },
            {
              type: 'p',
              text: `**How.** Write to ${contact}, or by post to EWES’s registered office, enclosing proof of identity. The law asks for a dated and signed request, by post or electronically (Art. 213 and 214). We reply within 30 days (60 days to supply a copy of the data, Art. 210).`,
            },
            {
              type: 'p',
              text: 'If you believe your rights are not being respected, you may lodge a complaint with the **Data Protection Authority** (Art. 209 and 263), without prejudice to any court action.',
            },
          ],
        },
        {
          title: 'Cookies',
          blocks: [
            {
              type: 'p',
              text: 'The public site uses only trackers strictly necessary for it to work. Details are on the [Cookies and trackers](/cookies) page.',
            },
          ],
        },
        {
          title: 'Changes to this policy',
          blocks: [
            {
              type: 'p',
              text: 'This policy is revised when our practices change (new service, new provider, new data collected). The date of the last update is shown at the top of the page; for any significant change, a clear notice is displayed on the site.',
            },
          ],
        },
      ],
    },

    cookies: {
      eyebrow: 'Cookies',
      title: 'What this site places on your device',
      intro:
        'Almost nothing. The public site places no audience-measurement or advertising cookies, which is why you do not see a banner to accept.',
      description:
        'Cookies and trackers used by the EWES S.A.R.L. website: strictly necessary cookies only, no advertising tracking or audience measurement.',
      sections: [
        {
          title: 'What a cookie is',
          blocks: [
            {
              type: 'p',
              text: 'A cookie is a small file a site places in your browser. It remembers a piece of information (your language, the fact that you are signed in…). The browser’s local storage plays the same role and follows the same rules; here we call both “trackers”.',
            },
          ],
        },
        {
          title: 'What we use',
          blocks: [
            {
              type: 'table',
              head: ['Name', 'Where', 'What it is for', 'Duration'],
              rows: [
                [
                  '`NEXT_LOCALE`',
                  'Public site',
                  'Remember the language (French or English) you chose. Set only if it differs from your browser’s language.',
                  'Session: erased when you close the browser.',
                ],
                [
                  '`ewes_access_token`, `ewes_refresh_token`',
                  'Portal and private document space, after sign-in',
                  'Keep you signed in. These cookies cannot be read by page scripts (httpOnly) and hold only a session token.',
                  '7 days at most; removed when you sign out.',
                ],
                [
                  'Local storage (theme, sidebar, display mode)',
                  'Portal only',
                  'Remember your display preferences. No personal data.',
                  'Until you clear them.',
                ],
              ],
            },
            {
              type: 'p',
              text: 'These trackers are **strictly necessary** for the service you request: they need no prior consent and cannot be switched off on the site without breaking it.',
            },
          ],
        },
        {
          title: 'What we do not use',
          blocks: [
            {
              type: 'list',
              items: [
                'No audience measurement or visit statistics.',
                'No advertising cookies, tracking pixels or profiling.',
                'No fonts loaded from a third-party service: the site serves them itself.',
                'No embedded social buttons, videos or maps: share and directions links are plain links to other sites, which apply their own rules once you are there.',
              ],
            },
            {
              type: 'note',
              text: 'The Digital Code has no provision specific to cookies. EWES therefore applies the principles it sets for all data: transparency, a precise purpose, and collection limited to what is useful (Art. 193 and 194).',
            },
          ],
        },
        {
          title: 'Managing them',
          blocks: [
            {
              type: 'p',
              text: 'You can view, block or delete cookies at any time in your browser settings (“privacy” or “cookies” section). Consequences: the public site will appear in your browser’s language, and you will have to sign in to the portal again at each visit.',
            },
          ],
        },
        {
          title: 'If this changes',
          blocks: [
            {
              type: 'p',
              text: 'If EWES ever adds an audience-measurement tool or any other non-essential tracker, a banner will ask for your agreement **before** anything is placed, and this page will be updated. Any question: [privacy policy](/confidentialite).',
            },
          ],
        },
      ],
    },

    'conditions-utilisation': {
      eyebrow: 'Terms of use',
      title: 'The ground rules for using this site',
      intro:
        'A few simple rules so the site stays useful, safe and respectful of everyone. By using it, you accept them.',
      description:
        'Terms of use of the EWES S.A.R.L. website: access, content, private document space, contact form, prohibited conduct and liability.',
      sections: [
        {
          title: 'Purpose',
          blocks: [
            {
              type: 'p',
              text: 'These terms govern the use of the EWES S.A.R.L. site: the public site (presentation, services, projects, news, documents, contact) and the private document space reserved for authorised people. They supplement the [legal notice](/mentions-legales) and the [privacy policy](/confidentialite).',
            },
          ],
        },
        {
          title: 'Access to the site',
          blocks: [
            {
              type: 'p',
              text: 'The public site is freely accessible and free of charge; connection costs are your own. EWES strives to keep it available but may interrupt it for maintenance, updates or security reasons, without notice or compensation.',
            },
          ],
        },
        {
          title: 'Content and public documents',
          blocks: [
            {
              type: 'p',
              text: 'Content is provided for information. The documents in the Documents section may be downloaded and used for personal or professional purposes, provided the source is credited and they are not altered. Any other reuse, notably commercial, requires EWES’s written agreement (see [intellectual property](/mentions-legales)).',
            },
          ],
        },
        {
          title: 'Private document space',
          blocks: [
            {
              type: 'p',
              text: 'Access is reserved for people to whom EWES has opened an account, each with their own rights. If you have one:',
            },
            {
              type: 'list',
              items: [
                'your account is **personal**: do not share your password or your session;',
                'view and share only the documents you are entitled to, and respect their confidentiality level;',
                'tell EWES without delay if you suspect unauthorised access to your account;',
                'your sensitive actions (sign-in, viewing, editing) are recorded in a tamper-proof log, as explained in the [privacy policy](/confidentialite).',
              ],
            },
            {
              type: 'p',
              text: 'EWES may suspend or delete an account for breach of these rules, prolonged inactivity or at its holder’s request.',
            },
          ],
        },
        {
          title: 'Contact form',
          blocks: [
            {
              type: 'p',
              text: 'The information you send must be accurate and concern you. The form is not intended for unsolicited commercial prospecting (“spam”, defined in Article 2 of the Digital Code and punished by its Article 363), nor for sending sensitive data or confidential documents: EWES will tell you how to send them securely if your request requires it.',
            },
          ],
        },
        {
          title: 'What is prohibited',
          blocks: [
            {
              type: 'list',
              items: [
                'attempting to access an area, an account or a document without authorisation, or bypassing a security measure;',
                'disrupting the site (mass submissions, intensive automated scraping, malicious code);',
                'impersonating a person or an organisation;',
                'sending unlawful or defamatory content, or content that infringes others’ rights.',
              ],
            },
            {
              type: 'p',
              text: 'Book IV of the Digital Code (security and criminal protection of information systems) punishes, among other things, fraudulent access to systems and interference with their data. EWES reserves the right to block the access concerned and to take any appropriate legal action.',
            },
          ],
        },
        {
          title: 'Liability',
          blocks: [
            {
              type: 'p',
              text: 'EWES’s limits of liability, and the handling of links to other sites, are set out in the [legal notice](/mentions-legales). You remain responsible for how you use the site and for the information you publish or send through it.',
            },
          ],
        },
        {
          title: 'Changes to the terms',
          blocks: [
            {
              type: 'p',
              text: 'EWES may change these terms to follow the evolution of the site or of regulations. The version in force is the one published on this page, on the date shown at the top.',
            },
          ],
        },
        {
          title: 'Applicable law',
          blocks: [
            {
              type: 'p',
              text: 'These terms are governed by the law of the Democratic Republic of the Congo. Disputes are settled amicably first, failing which before the competent Congolese courts.',
            },
          ],
        },
      ],
    },
  };
};
