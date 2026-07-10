import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type Preferences = { realtimeNotifications: boolean; messagePreviews: boolean; reduceMotion: boolean; update: (key: keyof Omit<Preferences, 'update'>, value: boolean) => void };
export const usePreferencesStore = create<Preferences>()(persist((set) => ({
  realtimeNotifications: true,
  messagePreviews: true,
  reduceMotion: false,
  update: (key, value) => set({ [key]: value } as Partial<Preferences>),
}), { name: 'flow.preferences', storage: createJSONStorage(() => AsyncStorage) }));
