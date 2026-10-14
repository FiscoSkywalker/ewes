/**
 * Clients et partenaires du bandeau de l'Accueil : logos repris de l'ancien
 * site d'EWES (ewes.cd), fournis par le client. Noms propres : identiques en
 * FR et en EN ; ils servent de texte alternatif.
 */
export interface Partner {
  name: string;
  /** Logo carré (150 × 150 px), fond blanc. */
  logo: string;
}

const logo = (file: string) => `/assets/partners/${file}`;

export const EWES_PARTNERS: readonly Partner[] = [
  { name: 'KCC', logo: logo('kcc.jpg') },
  { name: 'MMG', logo: logo('mmg.png') },
  { name: 'STL', logo: logo('stl.jpg') },
  { name: 'Anvil Mining', logo: logo('anvil-mining.jpg') },
  { name: 'Kamoa Copper', logo: logo('kamoa-copper.jpg') },
  { name: 'Tenke Fungurume Mining', logo: logo('tenke-fungurume-mining.png') },
  { name: 'Gécamines', logo: logo('gecamines.jpg') },
  { name: 'Chemaf', logo: logo('chemaf.png') },
  { name: 'MUMI', logo: logo('mumi.jpg') },
  { name: 'Metorex', logo: logo('metorex.jpg') },
  {
    name: 'Université de Lubumbashi',
    logo: logo('universite-de-lubumbashi.jpg'),
  },
  { name: 'Université de Kinshasa', logo: logo('universite-de-kinshasa.jpg') },
  { name: 'Université de Kolwezi', logo: logo('universite-de-kolwezi.jpg') },
  { name: 'Université de Liège', logo: logo('universite-de-liege.jpg') },
  { name: 'Aquapôle (Université de Liège)', logo: logo('aquapole-uliege.png') },
  { name: 'Nancy-Université INPL', logo: logo('nancy-universite-inpl.png') },
  { name: 'World Vision', logo: logo('world-vision.jpg') },
  { name: 'SARW', logo: logo('sarw.jpg') },
  { name: 'Hydro-R&D International', logo: logo('hydro-rd-international.png') },
  { name: 'EIV', logo: logo('eiv.jpg') },
  { name: 'JEF Consult', logo: logo('jef-consult.jpg') },
  { name: 'ADEV', logo: logo('adev.jpg') },
  { name: 'Grand Journal', logo: logo('grand-journal.jpg') },
];
