import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppState } from './appState';
import { decideMark, getMarks } from './penData';
import type { PenMark } from './engine';

/** NG PHASE 11: the user's recent pen marks, reloaded whenever the screen is focused, with one-tap Keep and Undo. */
export function usePenMarks(days = 35) {
  const { userId } = useAppState();
  const [marks, setMarks] = useState<PenMark[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) return;
    setMarks(await getMarks(userId, days));
    setLoaded(true);
  }, [userId, days]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const decide = useCallback(
    async (mark: PenMark, status: 'kept' | 'undone') => {
      if (!userId) return;
      const next = await decideMark(userId, mark, status);
      setMarks((all) => all.map((m) => (m.id === next.id ? next : m)));
    },
    [userId]
  );

  return { marks, loaded, decide, reload };
}
