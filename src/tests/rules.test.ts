import { describe, it, expect } from "vitest";
import { evaluateRules } from "../rules/engine";
import type { Settings } from "../shared/types";

const defaultSettings: Settings = {
  schemaVersion: 1,
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
};

const emptyOverride = { active: false, startedAt: 0, expiresAt: 0 };
const emptyBlock = { active: false, startedAt: 0, expiresAt: 0 };
const emptyPause = { active: false, startedAt: 0, expiresAt: 0 };

describe("Rules Engine", () => {
  describe("Daily item limits", () => {
    it("allows when under limit", () => {
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        10,
        0,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(true);
      expect(result.remainingItems).toBe(20);
    });

    it("allows at exactly limit minus one", () => {
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        29,
        0,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(true);
      expect(result.remainingItems).toBe(1);
    });

    it("blocks at exactly limit", () => {
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        30,
        0,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("daily_limit");
    });

    it("blocks over limit", () => {
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        31,
        0,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("daily_limit");
    });
  });

  describe("Time limits", () => {
    it("allows when under time limit", () => {
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        0,
        19 * 60,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(true);
      expect(result.remainingSeconds).toBe(60);
    });

    it("blocks at exactly time limit", () => {
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        0,
        20 * 60,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("time_limit");
    });

    it("blocks over time limit", () => {
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        0,
        20 * 60 + 1,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("time_limit");
    });
  });

  describe("Pause", () => {
    it("allows when paused", () => {
      const now = Date.now();
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        30,
        20 * 60,
        emptyOverride,
        emptyBlock,
        { active: true, expiresAt: now + 600000 }
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("paused");
    });

    it("respects expired pause", () => {
      const now = Date.now();
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        30,
        20 * 60,
        emptyOverride,
        emptyBlock,
        { active: true, expiresAt: now - 1 }
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe("Temporary override", () => {
    it("allows when override active", () => {
      const now = Date.now();
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        30,
        20 * 60,
        { active: true, expiresAt: now + 600000 },
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(true);
    });

    it("respects expired override", () => {
      const now = Date.now();
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        30,
        20 * 60,
        { active: true, expiresAt: now - 1 },
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe("Manual block", () => {
    it("blocks when manual block active", () => {
      const now = Date.now();
      const result = evaluateRules(
        defaultSettings,
        "youtube",
        10,
        0,
        emptyOverride,
        { active: true, expiresAt: now + 600000 },
        emptyPause
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("manual_block");
    });
  });

  describe("Disabled states", () => {
    it("allows when extension disabled", () => {
      const settings = { ...defaultSettings, enabled: false };
      const result = evaluateRules(
        settings,
        "youtube",
        30,
        20 * 60,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(true);
    });

    it("allows when platform disabled", () => {
      const settings = {
        ...defaultSettings,
        platforms: {
          ...defaultSettings.platforms,
          youtube: { ...defaultSettings.platforms.youtube, enabled: false },
        },
      };
      const result = evaluateRules(
        settings,
        "youtube",
        30,
        20 * 60,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("Instagram limits", () => {
    it("blocks at Instagram Reels limit", () => {
      const result = evaluateRules(
        defaultSettings,
        "instagram",
        15,
        0,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("daily_limit");
    });
  });

  describe("Zero limits", () => {
    it("blocks immediately when max items is 0", () => {
      const settings: Settings = {
        ...defaultSettings,
        platforms: {
          ...defaultSettings.platforms,
          youtube: { ...defaultSettings.platforms.youtube, maxItemsPerDay: 0 },
        },
      };
      const result = evaluateRules(
        settings,
        "youtube",
        0,
        0,
        emptyOverride,
        emptyBlock,
        emptyPause
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("daily_limit");
    });
  });
});
