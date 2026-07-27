import React, { createContext, useContext, useMemo, useState } from 'react';

// Session-level demo state mirroring the design kit's App state
// (ui_kits/claww/index.html). Not persisted; Supabase writes happen
// where they already exist (onboarding reveal).

export type MealType = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';

export interface MealEntry {
  type: MealType;
  time: string;
  loggedText: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

export const MEAL_MACROS: Record<MealType, { kcal: number; protein: number; carbs: number; fats: number }> = {
  Breakfast: { kcal: 455, protein: 32, carbs: 48, fats: 14 },
  Lunch: { kcal: 605, protein: 46, carbs: 58, fats: 18 },
  Snack: { kcal: 305, protein: 18, carbs: 38, fats: 9 },
  Dinner: { kcal: 420, protein: 38, carbs: 32, fats: 11 },
};

export const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

interface AppState {
  userName: string;
  setUserName: (name: string) => void;
  isNewUser: boolean;
  generatePlan: () => void;
  sleepLogged: boolean;
  logSleep: () => void;
  workoutsCompleted: number;
  completeWorkout: () => void;
  meals: MealEntry[];
  addMeal: (type: MealType, loggedText: string) => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState('');
  const [isNewUser, setIsNewUser] = useState(true);
  const [sleepLogged, setSleepLogged] = useState(false);
  const [workoutsCompleted, setWorkoutsCompleted] = useState(0);
  const [meals, setMeals] = useState<MealEntry[]>([]);

  const value = useMemo<AppState>(
    () => ({
      userName,
      setUserName,
      isNewUser,
      generatePlan: () => setIsNewUser(false),
      sleepLogged,
      logSleep: () => setSleepLogged(true),
      workoutsCompleted,
      completeWorkout: () => setWorkoutsCompleted((n) => n + 1),
      meals,
      addMeal: (type, loggedText) => {
        const macros = MEAL_MACROS[type];
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMeals((m) => [...m, { type, time, loggedText, ...macros }]);
      },
    }),
    [userName, isNewUser, sleepLogged, workoutsCompleted, meals]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
