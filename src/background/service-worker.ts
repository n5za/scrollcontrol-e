import { storage } from "@/storage/storage";
import { evaluateRules } from "@/rules/engine";
import type {
  Platform,
  Session,
  TemporaryOverride,
  ManualBlock,
  PauseState,
} from "@/shared/types";
import { MESSAGE_TYPES, HISTORY_RETENTION_DAYS } from "@/shared/constants";

const seenContentCache = new Map<string, number>();
const CACHE_TTL = 300000;

function cleanupCache() {
  const now = Date.now();
  for (const [key, timestamp] of seenContentCache) {
    if (now - timestamp > CACHE_TTL) {
      seenContentCache.delete(key);
    }
  }
}

setInterval(cleanupCache, 60000);

chrome.alarms.create("daily-reset", { periodInMinutes: 1 });
chrome.alarms.create("cleanup-history", { periodInMinutes: 60 });
chrome.alarms.create("check-expirations", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "daily-reset") {
    await checkDailyReset();
  } else if (alarm.name === "cleanup-history") {
    await storage.cleanupHistory();
  } else if (alarm.name === "check-expirations") {
    await checkExpirations();
  }
});

async function checkDailyReset() {
  const data = await storage.get();
  const today = getTodayString();
  const lastDate = Object.keys(data.dailyStats).sort().pop();

  if (lastDate && lastDate < today) {
    data.dailyStats = {};
    await storage.save(data);
  }
}

async function checkExpirations() {
  const now = Date.now();

  const override = await storage.getOverride();
  if (override.active && now >= override.expiresAt) {
    await storage.setOverride({
      active: false,
      startedAt: 0,
      expiresAt: 0,
    });
  }

  const manualBlock = await storage.getManualBlock();
  if (manualBlock.active && now >= manualBlock.expiresAt) {
    await storage.setManualBlock({
      active: false,
      startedAt: 0,
      expiresAt: 0,
    });
  }

  const pause = await storage.getPause();
  if (pause.active && now >= pause.expiresAt) {
    await storage.setPause({
      active: false,
      startedAt: 0,
      expiresAt: 0,
    });
  }
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

chrome.runtime.onMessage.addListener(
  (message: { type: string; payload?: Record<string, unknown> }, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse).catch(console.error);
    return true;
  }
);

async function handleMessage(
  message: { type: string; payload?: Record<string, unknown> },
  sender?: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case MESSAGE_TYPES.GET_STATE: {
      const data = await storage.get();
      const today = getTodayString();
      const stats = data.dailyStats[today] || {
        date: today,
        youtubeShorts: 0,
        instagramReels: 0,
        shortFormSeconds: 0,
        blockedAttempts: 0,
        sessions: 0,
        hourlyUsage: new Array(24).fill(0),
      };
      return {
        settings: data.settings,
        todayStats: stats,
        override: data.override,
        manualBlock: data.manualBlock,
        pause: data.pause,
        sessions: data.sessions,
      };
    }

    case MESSAGE_TYPES.UPDATE_RULES: {
      const rules = message.payload as { platform: Platform; rules: Record<string, unknown> };
      await storage.update(async (data) => {
        if (rules.platform && data.settings.platforms[rules.platform]) {
          data.settings.platforms[rules.platform] = {
            ...data.settings.platforms[rules.platform],
            ...rules.rules,
          };
        }
        return data;
      });
      return { success: true };
    }

    case MESSAGE_TYPES.UPDATE_SETTINGS: {
      const settingsPayload = message.payload as { settings: Record<string, unknown> };
      await storage.update(async (data) => {
        data.settings = { ...data.settings, ...settingsPayload.settings };
        return data;
      });
      return { success: true };
    }

    case MESSAGE_TYPES.START_SESSION: {
      const sessionPayload = message.payload as {
        platform: Platform;
        contentId: string;
      };
      const sessionKey = `${sessionPayload.platform}:${sessionPayload.contentId}`;
      if (seenContentCache.has(sessionKey)) {
        return { duplicate: true };
      }
      seenContentCache.set(sessionKey, Date.now());
      await storage.incrementShortCount(sessionPayload.platform);
      const session: Session = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        platform: sessionPayload.platform,
        contentId: sessionPayload.contentId,
        startedAt: Date.now(),
        activeSeconds: 0,
      };
      await storage.addSession(session);
      return { sessionId: session.id };
    }

    case MESSAGE_TYPES.END_SESSION: {
      const endPayload = message.payload as {
        sessionId: string;
        activeSeconds: number;
      };
      const sessions = await storage.getSessions();
      const session = sessions.find((s) => s.id === endPayload.sessionId);
      if (session) {
        session.endedAt = Date.now();
        session.activeSeconds = endPayload.activeSeconds;
        await storage.addSession({ ...session });
        await storage.addActiveSeconds(endPayload.activeSeconds);
      }
      return { success: true };
    }

    case MESSAGE_TYPES.CHECK_PERMISSION: {
      const checkPayload = message.payload as { platform: Platform };
      const data = await storage.get();
      const override = await storage.getOverride();
      const manualBlock = await storage.getManualBlock();
      const pause = await storage.getPause();
      const today = getTodayString();
      const stats = data.dailyStats[today] || {
        youtubeShorts: 0,
        instagramReels: 0,
        shortFormSeconds: 0,
      };
      const platformKey =
        checkPayload.platform === "youtube" ? "youtubeShorts" : "instagramReels";
      const currentItems = stats[platformKey] as number;
      return evaluateRules(
        data.settings,
        checkPayload.platform,
        currentItems,
        stats.shortFormSeconds as number,
        override,
        manualBlock,
        pause
      );
    }

    case MESSAGE_TYPES.CREATE_OVERRIDE: {
      const overridePayload = message.payload as {
        durationMinutes: number;
        platform?: Platform;
      };
      const now = Date.now();
      const override: TemporaryOverride = {
        active: true,
        startedAt: now,
        expiresAt: now + overridePayload.durationMinutes * 60 * 1000,
        platform: overridePayload.platform,
      };
      await storage.setOverride(override);
      return { success: true };
    }

    case MESSAGE_TYPES.REMOVE_OVERRIDE: {
      await storage.setOverride({
        active: false,
        startedAt: 0,
        expiresAt: 0,
      });
      return { success: true };
    }

    case MESSAGE_TYPES.CREATE_MANUAL_BLOCK: {
      const blockPayload = message.payload as {
        durationMinutes: number;
        platform?: Platform;
      };
      const now = Date.now();
      const block: ManualBlock = {
        active: true,
        startedAt: now,
        expiresAt: now + blockPayload.durationMinutes * 60 * 1000,
        platform: blockPayload.platform,
      };
      await storage.setManualBlock(block);
      return { success: true };
    }

    case MESSAGE_TYPES.REMOVE_MANUAL_BLOCK: {
      await storage.setManualBlock({
        active: false,
        startedAt: 0,
        expiresAt: 0,
      });
      return { success: true };
    }

    case MESSAGE_TYPES.PAUSE_EXTENSION: {
      const pausePayload = message.payload as { durationMinutes: number };
      const now = Date.now();
      const pauseState: PauseState = {
        active: true,
        startedAt: now,
        expiresAt: now + pausePayload.durationMinutes * 60 * 1000,
      };
      await storage.setPause(pauseState);
      return { success: true };
    }

    case MESSAGE_TYPES.CONTENT_DETECTED: {
      const detectPayload = message.payload as {
        platform: Platform;
        contentId: string;
      };
      const sessionKey = `${detectPayload.platform}:${detectPayload.contentId}`;
      if (!seenContentCache.has(sessionKey)) {
        seenContentCache.set(sessionKey, Date.now());
        await storage.incrementShortCount(detectPayload.platform);
      }
      return { success: true };
    }

    case MESSAGE_TYPES.BLOCK_CONTENT: {
      if (sender?.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "SHOW_BLOCK_OVERLAY",
          payload: message.payload,
        });
      }
      await storage.incrementBlocked();
      return { success: true };
    }

    case MESSAGE_TYPES.TRIGGER_RESET: {
      await checkDailyReset();
      return { success: true };
    }

    case "EXPORT_DATA": {
      const json = await storage.exportData();
      return { json };
    }

    case "IMPORT_DATA": {
      const importPayload = message.payload as { data: string };
      const success = await storage.importData(importPayload.data);
      return { success };
    }

    case "CLEAR_ALL_DATA": {
      await storage.clearAll();
      return { success: true };
    }

    default:
      return { error: "Unknown message type" };
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await storage.get();
  chrome.alarms.create("daily-reset", { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(async () => {
  await checkDailyReset();
  await checkExpirations();
});
