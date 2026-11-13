import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFS, parsePrefs, type QuestionPrefs } from './scanQuestions';

// Which scan questions to ask. Kept on the phone: it is a habit of this person on this phone, not account data.
const KEY = 'claww.scanQuestions.v1';

export function useScanQuestionPrefs(): [QuestionPrefs, (p: QuestionPrefs) => void] {
  const [prefs, setPrefs] = useState<QuestionPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setPrefs(parsePrefs(raw)))
      .catch(() => {});
  }, []);
  const save = useCallback((p: QuestionPrefs) => {
    setPrefs(p);
    AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
  }, []);
  return [prefs, save];
}
