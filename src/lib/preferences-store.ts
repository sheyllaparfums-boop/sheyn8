import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";
export type Density = "comfortable" | "compact";
export type Language = "pt-BR" | "en-US" | "es-ES";
export type Currency = "BRL" | "USD" | "EUR";

export interface NotificationChannels {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface NotificationTopics {
  reports: NotificationChannels;
  alerts: NotificationChannels;
  schedule: NotificationChannels;
  product: NotificationChannels;
}

export interface QuietHours {
  enabled: boolean;
  from: string; // "22:00"
  to: string; // "07:00"
}

export interface BackupSchedule {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  hour: number; // 0-23
}

export interface Preferences {
  theme: Theme;
  density: Density;
  accent: string; // hex
  reduceMotion: boolean;
  language: Language;
  currency: Currency;
  timezone: string;
  notifications: NotificationTopics;
  quietHours: QuietHours;
  digest: "off" | "daily" | "weekly";
  backupSchedule: BackupSchedule;
  lastBackupAt: string | null;
}

interface PreferencesStore extends Preferences {
  update: (patch: Partial<Preferences>) => void;
  setTopic: (topic: keyof NotificationTopics, patch: Partial<NotificationChannels>) => void;
  reset: () => void;
}

const ALL_ON: NotificationChannels = { email: true, push: true, inApp: true };

const DEFAULTS: Preferences = {
  theme: "dark",
  density: "comfortable",
  accent: "#8b5cf6",
  reduceMotion: false,
  language: "pt-BR",
  currency: "BRL",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
  notifications: {
    reports: { ...ALL_ON },
    alerts: { ...ALL_ON },
    schedule: { ...ALL_ON },
    product: { email: true, push: false, inApp: true },
  },
  quietHours: { enabled: false, from: "22:00", to: "07:00" },
  digest: "weekly",
  backupSchedule: { enabled: false, frequency: "weekly", hour: 3 },
  lastBackupAt: null,
};

export const usePreferences = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      update: (patch) => set(patch),
      setTopic: (topic, patch) =>
        set({
          notifications: {
            ...get().notifications,
            [topic]: { ...get().notifications[topic], ...patch },
          },
        }),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: "shey.preferences", version: 1 },
  ),
);
