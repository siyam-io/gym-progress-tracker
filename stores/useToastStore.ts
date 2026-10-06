import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (message, type = "info", durationMs = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastItem = { id, message, type, durationMs };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast], // Keep at most 5 toasts
    }));

    if (durationMs > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, durationMs);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Convenience helper methods
export const toast = {
  success: (msg: string, durationMs?: number) => useToastStore.getState().addToast(msg, "success", durationMs),
  error: (msg: string, durationMs?: number) => useToastStore.getState().addToast(msg, "error", durationMs),
  info: (msg: string, durationMs?: number) => useToastStore.getState().addToast(msg, "info", durationMs),
  warning: (msg: string, durationMs?: number) => useToastStore.getState().addToast(msg, "warning", durationMs),
};
