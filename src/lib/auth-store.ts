import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserPlan = 'TRIAL' | 'BETA' | 'START' | 'PRO' | 'CEO';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'CEO' | 'USER';
  plan: UserPlan;
  trialEndsAt?: string;
  avatar?: string;
}

// Loose profile shape — sourced from multiple providers (Instagram scraper, manual, cache)
// Kept as `any` to stay compatible with InstagramProfile and other shapes across the app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValidatedProfile = any;

export interface OnboardingData {
  handle: string;
  niche: string;
  goal: string;
  validated?: boolean;
  lastProfile?: ValidatedProfile;
}

export interface WorkflowLayout {
  nodes: Array<{ id: string; position: { x: number; y: number } }>;
}

export interface ProfileCacheEntry {
  profile: ValidatedProfile;
  fetchedAt: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  sessionReady: boolean;
  onboardingByUser: Record<string, OnboardingData>;
  tourSeenByUser: Record<string, boolean>;
  lastHandle: string | null;
  globalLayout: WorkflowLayout | null;
  validatedProfiles: Record<string, any>;
  isGlobalLocked: boolean;
  previewAsClient: boolean;
  handleHistoryByUser: Record<string, string[]>;
  profileCache: Record<string, ProfileCacheEntry>;
  setUser: (user: User | null) => void;
  updatePlan: (plan: UserPlan) => void;
  setHasHydrated: (state: boolean) => void;
  setSessionReady: (state: boolean) => void;
  setOnboardingData: (data: OnboardingData) => void;
  clearOnboarding: () => void;
  markTourSeen: () => void;
  getLayout: () => WorkflowLayout | null;
  setLayout: (layout: WorkflowLayout) => void;
  setHandleValidated: (handle: string, profile: any) => void;
  setIsGlobalLocked: (isLocked: boolean) => void;
  setPreviewAsClient: (state: boolean) => void;
  addHandleToHistory: (handle: string) => void;
  removeHandleFromHistory: (handle: string) => void;
  cacheProfile: (handle: string, profile: any) => void;
  // Legacy compatibility (kept for components that still call them)
  login: (user: User) => void;
  logout: () => void;
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      sessionReady: false,
      onboardingByUser: {},
      tourSeenByUser: {},
      lastHandle: null,
      globalLayout: null,
      validatedProfiles: {},
      isGlobalLocked: true,
      previewAsClient: false,
      handleHistoryByUser: {},
      profileCache: {},
      setUser: (user) => set({ user, isAuthenticated: !!user, sessionReady: true, previewAsClient: user ? get().previewAsClient : false }),
      login: (user) => set({ user, isAuthenticated: true, sessionReady: true }),
      logout: () => set({ user: null, isAuthenticated: false, sessionReady: true, previewAsClient: false }),
      updatePlan: (plan) => set((s) => s.user ? ({ user: { ...s.user, plan } }) : s),
      setHasHydrated: (state) => set({ hasHydrated: state }),
      setSessionReady: (state) => set({ sessionReady: state }),
      setOnboardingData: (data) => {
        const uid = get().user?.id ?? "anon";
        const normalizedHandle = data.handle.replace(/^@+/, "").trim().toLowerCase();
        set((s) => {
          const history = s.handleHistoryByUser[uid] ?? [];
          const nextHistory = normalizedHandle
            ? [normalizedHandle, ...history.filter((h) => h !== normalizedHandle)].slice(0, 5)
            : history;
          return {
            onboardingByUser: { ...s.onboardingByUser, [uid]: { ...data, handle: normalizedHandle } },
            lastHandle: normalizedHandle || s.lastHandle,
            handleHistoryByUser: { ...s.handleHistoryByUser, [uid]: nextHistory },
          };
        });
      },
      addHandleToHistory: (handle) => {
        const uid = get().user?.id ?? "anon";
        const h = handle.replace(/^@+/, "").trim().toLowerCase();
        if (!h) return;
        set((s) => {
          const history = s.handleHistoryByUser[uid] ?? [];
          return {
            handleHistoryByUser: {
              ...s.handleHistoryByUser,
              [uid]: [h, ...history.filter((x) => x !== h)].slice(0, 5),
            },
          };
        });
      },
      removeHandleFromHistory: (handle) => {
        const uid = get().user?.id ?? "anon";
        const h = handle.replace(/^@+/, "").trim().toLowerCase();
        set((s) => ({
          handleHistoryByUser: {
            ...s.handleHistoryByUser,
            [uid]: (s.handleHistoryByUser[uid] ?? []).filter((x) => x !== h),
          },
        }));
      },
      cacheProfile: (handle, profile) => {
        const h = handle.replace(/^@+/, "").trim().toLowerCase();
        if (!h) return;
        set((s) => ({
          profileCache: { ...s.profileCache, [h]: { profile, fetchedAt: Date.now() } },
        }));
      },
      clearOnboarding: () => {
        const uid = get().user?.id ?? "anon";
        set((s) => {
          const next = { ...s.onboardingByUser };
          delete next[uid];
          return { onboardingByUser: next };
        });
      },
      markTourSeen: () => {
        const uid = get().user?.id ?? "anon";
        set((s) => ({ tourSeenByUser: { ...s.tourSeenByUser, [uid]: true } }));
      },
      getLayout: () => get().globalLayout,
      setLayout: (layout) => set({ globalLayout: layout }),
      setHandleValidated: (handle, profile) =>
        set((s) => ({
          validatedProfiles: { ...s.validatedProfiles, [handle.toLowerCase()]: profile }
        })),
      setIsGlobalLocked: (isLocked) => set({ isGlobalLocked: isLocked }),
      setPreviewAsClient: (state) => set({ previewAsClient: state }),
    }),

    {
      name: 'shey-n8n-auth',
      version: 7,
      partialize: (state) => ({
        onboardingByUser: state.onboardingByUser,
        tourSeenByUser: state.tourSeenByUser,
        lastHandle: state.lastHandle,
        globalLayout: state.globalLayout,
        validatedProfiles: state.validatedProfiles,
        isGlobalLocked: state.isGlobalLocked,
        handleHistoryByUser: state.handleHistoryByUser,
        profileCache: state.profileCache,
      }),
      migrate: (persisted: any, version) => {
        if (version < 7 && persisted) {
          delete persisted.user;
          delete persisted.isAuthenticated;
          delete persisted.previewAsClient;
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
