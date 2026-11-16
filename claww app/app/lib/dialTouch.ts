import { makeMutable } from 'react-native-reanimated';

// Set while a finger is on a set ruler (see SetDial). The player's sideways "next exercise" swipe reads it, so a fast
// flick that starts on a ruler can never also change exercise.
export const dialTouching = makeMutable(0);
