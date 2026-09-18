import type { Settings, Platform, EvaluatorResult } from "@/shared/types";
import {
  checkScheduleWindows,
  getCurrentMinutes,
  getDayOfWeek,
} from "@/shared/utils";

export function evaluateRules(
  settings: Settings,
  platform: Platform,
  currentItems: number,
  currentSeconds: number,
  override: { active: boolean; expiresAt: number; platform?: Platform },
  manualBlock: { active: boolean; expiresAt: number; platform?: Platform },
  pause: { active: boolean; expiresAt: number }
): EvaluatorResult {
  // 1. Extension globally disabled
  if (!settings.enabled) {
    return { allowed: true, reason: "none" };
  }

  // 2. Platform disabled
  const platformRules = settings.platforms[platform];
  if (!platformRules.enabled) {
    return { allowed: true, reason: "none" };
  }

  // 3. User paused
  if (pause.active && Date.now() < pause.expiresAt) {
    return { allowed: true, reason: "paused" };
  }

  // 4. Temporary override active
  if (override.active && Date.now() < override.expiresAt) {
    const applicable =
      !override.platform || override.platform === platform;
    if (applicable) {
      return { allowed: true, reason: "none" };
    }
  }

  // 5. Manual block active
  if (manualBlock.active && Date.now() < manualBlock.expiresAt) {
    const applicable =
      !manualBlock.platform || manualBlock.platform === platform;
    if (applicable) {
      const remainingMs = manualBlock.expiresAt - Date.now();
      const nextTime = new Date(manualBlock.expiresAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        allowed: false,
        reason: "manual_block",
        nextAllowedTime: nextTime,
      };
    }
  }

  // 6. Schedule check
  if (platformRules.scheduleEnabled) {
    const currentDay = getDayOfWeek();
    const currentMinutes = getCurrentMinutes();

    if (platformRules.allowedWindows.length > 0) {
      const inAllowedWindow = checkScheduleWindows(
        platformRules.allowedWindows,
        currentDay,
        currentMinutes
      );
      if (!inAllowedWindow) {
        const nextWindow = findNextAllowedWindow(
          platformRules.allowedWindows,
          currentDay,
          currentMinutes
        );
        return {
          allowed: false,
          reason: "schedule",
          nextAllowedTime: nextWindow,
        };
      }
    }

    if (platformRules.blockedWindows.length > 0) {
      const inBlockedWindow = checkScheduleWindows(
        platformRules.blockedWindows,
        currentDay,
        currentMinutes
      );
      if (inBlockedWindow) {
        const nextAllowed = findNextAllowedAfterBlocked(
          platformRules.blockedWindows,
          currentDay,
          currentMinutes
        );
        return {
          allowed: false,
          reason: "schedule",
          nextAllowedTime: nextAllowed,
        };
      }
    }
  }

  // 7. Daily item limit
  if (platformRules.maxItemsPerDay === 0) {
    return {
      allowed: false,
      reason: "daily_limit",
      remainingItems: 0,
    };
  }
  if (
    platformRules.maxItemsPerDay > 0 &&
    currentItems >= platformRules.maxItemsPerDay
  ) {
    return {
      allowed: false,
      reason: "daily_limit",
      remainingItems: 0,
    };
  }

  // 8. Daily time limit
  if (platformRules.maxSecondsPerDay === 0) {
    return {
      allowed: false,
      reason: "time_limit",
      remainingSeconds: 0,
    };
  }
  if (
    platformRules.maxSecondsPerDay > 0 &&
    currentSeconds >= platformRules.maxSecondsPerDay
  ) {
    return {
      allowed: false,
      reason: "time_limit",
      remainingSeconds: 0,
    };
  }

  return {
    allowed: true,
    reason: "none",
    remainingItems: platformRules.maxItemsPerDay - currentItems,
    remainingSeconds: platformRules.maxSecondsPerDay - currentSeconds,
  };
}

function findNextAllowedWindow(
  windows: Array<{ days: number[]; start: string }>,
  currentDay: number,
  currentMinutes: number
): string {
  const sorted = [...windows]
    .filter((w) => w.days.includes(currentDay))
    .sort((a, b) => {
      const [ah, am] = a.start.split(":").map(Number);
      const [bh, bm] = b.start.split(":").map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });

  for (const window of sorted) {
    const [h, m] = window.start.split(":").map(Number);
    const windowMinutes = h * 60 + m;
    if (windowMinutes > currentMinutes) {
      return window.start;
    }
  }

  if (sorted.length > 0) {
    return sorted[0].start + " (tomorrow)";
  }
  return "unknown";
}

function findNextAllowedAfterBlocked(
  _windows: Array<{ days: number[]; start: string; end: string }>,
  _currentDay: number,
  _currentMinutes: number
): string {
  return "after blocked period ends";
}
