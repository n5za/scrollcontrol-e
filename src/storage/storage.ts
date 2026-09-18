import type {
  Settings,
  DailyStats,
  Session,
  TemporaryOverride,
  ManualBlock,
  PauseState,
} from "@/shared/types";
import { SCHEMA_VERSION } from "@/shared/constants";

export type StorageSchema = {
  schemaVersion: number;
  settings: Settings;
  dailyStats: Record<string, DailyStats>;
  sessions: Session[];
  override: TemporaryOverride;
  manualBlock: ManualBlock;
  pause: PauseState;
};

function getDefaultStorage(): StorageSchema {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      schemaVersion: SCHEMA_VERSION,
      enabled: true,
      startOnLaunch: true,
      showNotifications: true,
      theme: "dark",
      language: "en",
      platforms: {
        youtube: {
          enabled: true,
          maxItemsPerDay: 30,
          maxSecondsPerDay: 20 * 60,
          countOnlyWhenPlaying: true,
          pauseCountWhenInactive: true,
          scheduleEnabled: false,
          allowedWindows: [],
          blockedWindows: [],
        },
        instagram: {
          enabled: true,
          maxItemsPerDay: 15,
          maxSecondsPerDay: 15 * 60,
          countOnlyWhenPlaying: true,
          pauseCountWhenInactive: true,
          scheduleEnabled: false,
          allowedWindows: [],
          blockedWindows: [],
        },
      },
    },
    dailyStats: {},
    sessions: [],
    override: { active: false, startedAt: 0, expiresAt: 0 },
    manualBlock: { active: false, startedAt: 0, expiresAt: 0 },
    pause: { active: false, startedAt: 0, expiresAt: 0 },
  };
}

function isStorage(obj: unknown): obj is StorageSchema {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "schemaVersion" in obj &&
    "settings" in obj &&
    "dailyStats" in obj
  );
}

function migrateStorage(old: Record<string, unknown>): StorageSchema {
  const current = getDefaultStorage();
  if (old && typeof old === "object") {
    if (old.settings && typeof old.settings === "object") {
      const oldSettings = old.settings as Record<string, unknown>;
      current.settings = {
        ...current.settings,
        ...(oldSettings as Partial<Settings>),
      };
      if (oldSettings.platforms && typeof oldSettings.platforms === "object") {
        const platforms = oldSettings.platforms as Record<string, unknown>;
        current.settings.platforms = {
          youtube: {
            ...current.settings.platforms.youtube,
            ...(platforms.youtube as Record<string, unknown>),
          },
          instagram: {
            ...current.settings.platforms.instagram,
            ...(platforms.instagram as Record<string, unknown>),
          },
        };
      }
    }
    if (old.dailyStats && typeof old.dailyStats === "object") {
      current.dailyStats = old.dailyStats as Record<string, DailyStats>;
    }
    if (Array.isArray(old.sessions)) {
      current.sessions = old.sessions as Session[];
    }
    if (old.override && typeof old.override === "object") {
      current.override = old.override as TemporaryOverride;
    }
    if (old.manualBlock && typeof old.manualBlock === "object") {
      current.manualBlock = old.manualBlock as ManualBlock;
    }
    if (old.pause && typeof old.pause === "object") {
      current.pause = old.pause as PauseState;
    }
  }
  return current;
}

export class Storage {
  private static instance: Storage | null = null;
  private cache: StorageSchema | null = null;

  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  async get(): Promise<StorageSchema> {
    if (this.cache) return this.cache;

    return new Promise((resolve) => {
      chrome.storage.local.get("scrollcontrol", (result) => {
        const raw = result.scrollcontrol;
        if (!raw || !isStorage(raw)) {
          const fresh = getDefaultStorage();
          this.cache = fresh;
          resolve(fresh);
          return;
        }
        if (raw.schemaVersion !== SCHEMA_VERSION) {
          const migrated = migrateStorage(raw as unknown as Record<string, unknown>);
          this.cache = migrated;
          this.save(migrated);
          resolve(migrated);
          return;
        }
        this.cache = raw as StorageSchema;
        resolve(raw as StorageSchema);
      });
    });
  }

  async save(data: StorageSchema): Promise<void> {
    this.cache = data;
    return new Promise((resolve) => {
      chrome.storage.local.set({ scrollcontrol: data }, resolve);
    });
  }

  async update(
    updater: (current: StorageSchema) => StorageSchema | Promise<StorageSchema>
  ): Promise<StorageSchema> {
    const current = await this.get();
    const updated = await updater(current);
    await this.save(updated);
    return updated;
  }

  async getSettings(): Promise<Settings> {
    const data = await this.get();
    return data.settings;
  }

  async updateSettings(
    updater: (settings: Settings) => Settings
  ): Promise<Settings> {
    return this.update(async (data) => {
      data.settings = updater(data.settings);
      return data;
    }).then((d) => d.settings);
  }

  async getTodayStats(dateStr?: string): Promise<DailyStats> {
    const data = await this.get();
    const date = dateStr || getTodayString();
    if (!data.dailyStats[date]) {
      data.dailyStats[date] = createEmptyStats(date);
      await this.save(data);
    }
    return data.dailyStats[date];
  }

  async incrementShortCount(platform: "youtube" | "instagram"): Promise<void> {
    await this.update(async (data) => {
      const today = getTodayString();
      if (!data.dailyStats[today]) {
        data.dailyStats[today] = createEmptyStats(today);
      }
      const stats = data.dailyStats[today];
      if (platform === "youtube") stats.youtubeShorts++;
      else stats.instagramReels++;
      stats.sessions++;
      const hour = new Date().getHours();
      stats.hourlyUsage[hour]++;
      return data;
    });
  }

  async addActiveSeconds(seconds: number): Promise<void> {
    await this.update(async (data) => {
      const today = getTodayString();
      if (!data.dailyStats[today]) {
        data.dailyStats[today] = createEmptyStats(today);
      }
      data.dailyStats[today].shortFormSeconds += seconds;
      return data;
    });
  }

  async incrementBlocked(): Promise<void> {
    await this.update(async (data) => {
      const today = getTodayString();
      if (!data.dailyStats[today]) {
        data.dailyStats[today] = createEmptyStats(today);
      }
      data.dailyStats[today].blockedAttempts++;
      return data;
    });
  }

  async getOverride(): Promise<TemporaryOverride> {
    const data = await this.get();
    if (data.override.active && Date.now() >= data.override.expiresAt) {
      data.override = { active: false, startedAt: 0, expiresAt: 0 };
      await this.save(data);
    }
    return data.override;
  }

  async setOverride(override: TemporaryOverride): Promise<void> {
    await this.update(async (data) => {
      data.override = override;
      return data;
    });
  }

  async getManualBlock(): Promise<ManualBlock> {
    const data = await this.get();
    if (data.manualBlock.active && Date.now() >= data.manualBlock.expiresAt) {
      data.manualBlock = { active: false, startedAt: 0, expiresAt: 0 };
      await this.save(data);
    }
    return data.manualBlock;
  }

  async setManualBlock(block: ManualBlock): Promise<void> {
    await this.update(async (data) => {
      data.manualBlock = block;
      return data;
    });
  }

  async getPause(): Promise<PauseState> {
    const data = await this.get();
    if (data.pause.active && Date.now() >= data.pause.expiresAt) {
      data.pause = { active: false, startedAt: 0, expiresAt: 0 };
      await this.save(data);
    }
    return data.pause;
  }

  async setPause(pause: PauseState): Promise<void> {
    await this.update(async (data) => {
      data.pause = pause;
      return data;
    });
  }

  async getSessions(): Promise<Session[]> {
    const data = await this.get();
    return data.sessions.filter(
      (s) => Date.now() - s.startedAt < 7 * 24 * 60 * 60 * 1000
    );
  }

  async addSession(session: Session): Promise<void> {
    await this.update(async (data) => {
      data.sessions.push(session);
      if (data.sessions.length > 1000) {
        data.sessions = data.sessions.slice(-500);
      }
      return data;
    });
  }

  async cleanupHistory(): Promise<void> {
    await this.update(async (data) => {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(cutoff).toISOString().split("T")[0];
      for (const date of Object.keys(data.dailyStats)) {
        if (date < cutoffDate) {
          delete data.dailyStats[date];
        }
      }
      return data;
    });
  }

  async exportData(): Promise<string> {
    const data = await this.get();
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonStr: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!isStorage(parsed)) return false;
      this.cache = parsed;
      await this.save(parsed);
      return true;
    } catch {
      return false;
    }
  }

  async clearAll(): Promise<void> {
    const fresh = getDefaultStorage();
    this.cache = fresh;
    await this.save(fresh);
  }

  clearCache(): void {
    this.cache = null;
  }
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyStats(date: string): DailyStats {
  return {
    date,
    youtubeShorts: 0,
    instagramReels: 0,
    shortFormSeconds: 0,
    blockedAttempts: 0,
    sessions: 0,
    hourlyUsage: new Array(24).fill(0),
  };
}

export const storage = Storage.getInstance();
