import { create } from 'zustand';
import type { CallSession } from '@/types';

type CallState = {
  incomingCall: CallSession | null;
  setIncomingCall: (call: CallSession | null) => void;
  updateIncomingCall: (call: CallSession) => void;
  clearIncomingCall: (roomName?: string) => void;
};

export const useCallStore = create<CallState>((set) => ({
  incomingCall: null,
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  updateIncomingCall: (call) => set((state) => ({
    incomingCall: state.incomingCall?.room_name === call.room_name ? call : state.incomingCall,
  })),
  clearIncomingCall: (roomName) => set((state) => ({
    incomingCall: !roomName || state.incomingCall?.room_name === roomName ? null : state.incomingCall,
  })),
}));
