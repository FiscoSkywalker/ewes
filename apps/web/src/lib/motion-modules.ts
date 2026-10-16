import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
// Sur mobile, la barre d'adresse qui se replie déclenche des `resize` qui
// recalculaient toutes les positions en plein défilement (sauts visibles).
ScrollTrigger.config({ ignoreMobileResize: true });

/** Bibliothèques d'animation, chargées à la demande par `lib/motion`. */
export { gsap, ScrollTrigger, Lenis };
