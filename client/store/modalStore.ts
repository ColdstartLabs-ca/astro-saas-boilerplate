/**
 * Modal Store
 * Zustand store for managing modal state (auth modals, etc.)
 */
import { create } from 'zustand';

export type AuthModalView =
  | 'login'
  | 'register'
  | 'changePassword'
  | 'forgotPassword'
  | 'setNewPassword';

interface IModalState {
  // Auth modal state
  authModalView: AuthModalView;
  openModals: Set<string>;

  // Actions
  openAuthModal: (view: AuthModalView) => void;
  setAuthModalView: (view: AuthModalView) => void;
  openAuthRequiredModal: () => void;
  isModalOpen: (modalId: string) => boolean;
  close: () => void;
}

export const useModalStore = create<IModalState>((set, get) => ({
  // Initial state
  authModalView: 'login',
  openModals: new Set<string>(),

  // Actions
  openAuthModal: (view: AuthModalView) => {
    set({
      authModalView: view,
      openModals: new Set(['authenticationModal']),
    });
  },

  setAuthModalView: (view: AuthModalView) => {
    set({ authModalView: view });
  },

  openAuthRequiredModal: () => {
    set({
      openModals: new Set(['authRequiredModal']),
    });
  },

  isModalOpen: (modalId: string) => {
    return get().openModals.has(modalId);
  },

  close: () => {
    set({
      openModals: new Set(),
    });
  },
}));
