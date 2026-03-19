import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api";

export interface User {
  id: number;
  email?: string;
  tg_id?: string;
  vk_id?: string;
  display_name: string;
  tg_username?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  sessionId: string | null;
  loading: boolean;
  setSession: (sessionId: string, user: User) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      sessionId: null,
      loading: false,

      setSession: (sessionId, user) => {
        localStorage.setItem("session_id", sessionId);
        set({ user, sessionId });
      },

      logout: async () => {
        try { await authApi.logout(); } catch (_e) { /* ignore */ }
        localStorage.removeItem("session_id");
        set({ user: null, sessionId: null });
      },

      fetchMe: async () => {
        const sid = get().sessionId || localStorage.getItem("session_id");
        if (!sid) return;
        set({ loading: true });
        try {
          const data = await authApi.me();
          set({ user: data.user, sessionId: sid });
        } catch {
          localStorage.removeItem("session_id");
          set({ user: null, sessionId: null });
        } finally {
          set({ loading: false });
        }
      },
    }),
    { name: "auth-storage", partialize: (s) => ({ sessionId: s.sessionId, user: s.user }) }
  )
);