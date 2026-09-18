export const EXTENSION_NAME = "ScrollControl";
export const STORAGE_KEY = "scrollcontrol";
export const SCHEMA_VERSION = 1;
export const HISTORY_RETENTION_DAYS = 30;
export const DEFAULT_MAX_SHORTS = 30;
export const DEFAULT_MAX_REELS = 15;
export const DEFAULT_MAX_TIME_SECONDS = 20 * 60;
export const OVERRIDE_DURATIONS = [5, 15, 30, 60 * 24];
export const PAUSE_DURATIONS = [5, 15, 30, 60 * 24];

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const PLATFORM_NAMES: Record<string, string> = {
  youtube: "YouTube Shorts",
  instagram: "Instagram Reels",
};

export const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#ff0000",
  instagram: "#E1306C",
};

export const MESSAGE_TYPES = {
  GET_STATE: "GET_STATE",
  UPDATE_RULES: "UPDATE_RULES",
  GET_USAGE: "GET_USAGE",
  START_SESSION: "START_SESSION",
  END_SESSION: "END_SESSION",
  CONTENT_DETECTED: "CONTENT_DETECTED",
  BLOCK_CONTENT: "BLOCK_CONTENT",
  CHECK_PERMISSION: "CHECK_PERMISSION",
  PAUSE_EXTENSION: "PAUSE_EXTENSION",
  CREATE_OVERRIDE: "CREATE_OVERRIDE",
  CREATE_MANUAL_BLOCK: "CREATE_MANUAL_BLOCK",
  REMOVE_MANUAL_BLOCK: "REMOVE_MANUAL_BLOCK",
  REMOVE_OVERRIDE: "REMOVE_OVERRIDE",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  TRIGGER_RESET: "TRIGGER_RESET",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SCHEMA_VERSION,
  enabled: true,
  startOnLaunch: true,
  showNotifications: true,
  theme: "dark",
  language: "en",
  platforms: {
    youtube: {
      enabled: true,
      maxItemsPerDay: DEFAULT_MAX_SHORTS,
      maxSecondsPerDay: DEFAULT_MAX_TIME_SECONDS,
      countOnlyWhenPlaying: true,
      pauseCountWhenInactive: true,
      scheduleEnabled: false,
      allowedWindows: [],
      blockedWindows: [],
    },
    instagram: {
      enabled: true,
      maxItemsPerDay: DEFAULT_MAX_REELS,
      maxSecondsPerDay: 15 * 60,
      countOnlyWhenPlaying: true,
      pauseCountWhenInactive: true,
      scheduleEnabled: false,
      allowedWindows: [],
      blockedWindows: [],
    },
  },
};

import type { Settings } from "./types";
