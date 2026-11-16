import { loadFont as loadAnton } from '@remotion/google-fonts/Anton';
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

/** Tall condensed display: the number slams and the big headlines. */
export const DISPLAY = loadAnton('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily;

/** Editorial italic serif: the soft second line under a slam ("every session."). */
export const SERIF = loadSerif('italic', { weights: ['400'], subsets: ['latin'] }).fontFamily;

/** Inter: the app's own font. Used for every app screen and for small type. */
export const UI = loadInter('normal', { weights: ['400', '500', '600', '700', '800', '900'], subsets: ['latin'] }).fontFamily;
