import { create } from 'zustand';
import { normalizeApiError } from '@/lib/http';

type Feedback = { visible: boolean; type: 'success' | 'error' | 'info' | 'confirm'; title: string; message: string; confirmLabel?: string; onConfirm?: (() => void) | null };
type UIState = Feedback & { show: (feedback: Partial<Feedback> & Pick<Feedback, 'title' | 'message'>) => void; hide: () => void };

export const useUIStore = create<UIState>((set) => ({
  visible: false, type: 'info', title: '', message: '', onConfirm: null,
  show: (feedback) => set({ visible: true, type: 'info', onConfirm: null, ...feedback }),
  hide: () => set({ visible: false, onConfirm: null }),
}));
export const showSuccess = (title: string, message: string) => useUIStore.getState().show({ type: 'success', title, message });
export const showError = (title: string, message: string) => useUIStore.getState().show({ type: 'error', title, message });
export const showApiError = (error: unknown, title = 'Something went wrong') => showError(title, normalizeApiError(error).message);
export const showConfirm = (title: string, message: string, onConfirm: () => void) => useUIStore.getState().show({ type: 'confirm', title, message, confirmLabel: 'Continue', onConfirm });
