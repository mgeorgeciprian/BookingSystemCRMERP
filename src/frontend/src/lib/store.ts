/**
 * Zustand store for auth and app state.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface Business {
  id: number;
  name: string;
  slug: string;
  vertical: string;
}

interface AppState {
  // Auth
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;

  // Active business
  activeBusiness: Business | null;
  setActiveBusiness: (biz: Business | null) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refreshToken, user) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("bcr_token", token);
        }
        set({ token, refreshToken, user });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("bcr_token");
        }
        set({ token: null, refreshToken: null, user: null, activeBusiness: null });
      },

      activeBusiness: null,
      setActiveBusiness: (biz) => set({ activeBusiness: biz }),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: "bcr-store",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        activeBusiness: state.activeBusiness,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
