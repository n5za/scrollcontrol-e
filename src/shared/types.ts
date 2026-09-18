export type Platform = "youtube" | "instagram";

export type BlockReason =
  | "none"
  | "daily_limit"
  | "time_limit"
  | "schedule"
  | "manual_block"
  | "paused";

export type ScheduleWindow = {
  id: string;
  days: number[];
  start: string;
  end: string;
};

export type PlatformRules = {
  enabled: boolean;
  maxItemsPerDay: number;
  maxSecondsPerDay: number;
  countOnlyWhenPlaying: boolean;
  pauseCountWhenInactive: boolean;
  scheduleEnabled: boolean;
  allowedWindows: ScheduleWindow[];
  blockedWindows: ScheduleWindow[];
};

export type Settings = {
  schemaVersion: number;
  enabled: boolean;
  startOnLaunch: boolean;
  showNotifications: boolean;
  theme: "dark" | "light" | "system";
  language: "en" | "fr" | "ar";
  platforms: {
    youtube: PlatformRules;
    instagram: PlatformRules;
  };
};

export type DetectedContent = {
  platform: Platform;
  id: string;
  type: "short" | "reel";
  url?: string;
  detectedAt: number;
};

export type Session = {
  id: string;
  platform: Platform;
  contentId: string;
  startedAt: number;
  endedAt?: number;
  activeSeconds: number;
};

export type DailyStats = {
  date: string;
  youtubeShorts: number;
  instagramReels: number;
  shortFormSeconds: number;
  blockedAttempts: number;
  sessions: number;
  hourlyUsage: number[];
};

export type TemporaryOverride = {
  active: boolean;
  startedAt: number;
  expiresAt: number;
  platform?: Platform;
};

export type ManualBlock = {
  active: boolean;
  startedAt: number;
  expiresAt: number;
  platform?: Platform;
};

export type PauseState = {
  active: boolean;
  startedAt: number;
  expiresAt: number;
};

export type AppState = {
  settings: Settings;
  todayStats: DailyStats;
  sessions: Session[];
  override: TemporaryOverride;
  manualBlock: ManualBlock;
  pause: PauseState;
};

export type EvaluatorResult = {
  allowed: boolean;
  reason: BlockReason;
  nextAllowedTime?: string;
  remainingItems?: number;
  remainingSeconds?: number;
};

export type MessagePayload = {
  type: string;
  payload?: Record<string, unknown>;
};
