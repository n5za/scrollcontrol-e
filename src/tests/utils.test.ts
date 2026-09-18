import { describe, it, expect } from "vitest";
import {
  formatSeconds,
  timeStringToMinutes,
  minutesToTimeString,
  isTimeInRange,
  checkScheduleWindows,
  getDaysArray,
  generateId,
} from "../shared/utils";

describe("Utils", () => {
  describe("formatSeconds", () => {
    it("formats seconds", () => {
      expect(formatSeconds(0)).toBe("0s");
      expect(formatSeconds(30)).toBe("30s");
      expect(formatSeconds(60)).toBe("1m");
      expect(formatSeconds(90)).toBe("1m 30s");
      expect(formatSeconds(3600)).toBe("1h");
      expect(formatSeconds(3660)).toBe("1h 1m");
      expect(formatSeconds(5400)).toBe("1h 30m");
    });
  });

  describe("timeStringToMinutes", () => {
    it("converts time strings", () => {
      expect(timeStringToMinutes("00:00")).toBe(0);
      expect(timeStringToMinutes("01:00")).toBe(60);
      expect(timeStringToMinutes("12:30")).toBe(750);
      expect(timeStringToMinutes("23:59")).toBe(1439);
    });
  });

  describe("minutesToTimeString", () => {
    it("converts minutes to time strings", () => {
      expect(minutesToTimeString(0)).toBe("00:00");
      expect(minutesToTimeString(60)).toBe("01:00");
      expect(minutesToTimeString(750)).toBe("12:30");
      expect(minutesToTimeString(1439)).toBe("23:59");
    });
  });

  describe("isTimeInRange", () => {
    it("handles normal ranges", () => {
      expect(isTimeInRange(720, "12:00", "14:00")).toBe(true);
      expect(isTimeInRange(719, "12:00", "14:00")).toBe(false);
      expect(isTimeInRange(840, "12:00", "14:00")).toBe(false);
    });

    it("handles cross-midnight ranges", () => {
      expect(isTimeInRange(1380, "23:00", "01:00")).toBe(true);
      expect(isTimeInRange(30, "23:00", "01:00")).toBe(true);
      expect(isTimeInRange(60, "23:00", "01:00")).toBe(false);
    });
  });

  describe("checkScheduleWindows", () => {
    it("checks if current time is in any window", () => {
      const windows = [
        { days: [1, 2, 3, 4, 5], start: "18:00", end: "20:00" },
      ];
      // Monday at 19:00
      expect(checkScheduleWindows(windows, 1, 1140)).toBe(true);
      // Saturday at 19:00
      expect(checkScheduleWindows(windows, 6, 1140)).toBe(false);
      // Monday at 17:00
      expect(checkScheduleWindows(windows, 1, 1020)).toBe(false);
    });
  });

  describe("getDaysArray", () => {
    it("returns correct days", () => {
      expect(getDaysArray("everyday")).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(getDaysArray("weekdays")).toEqual([1, 2, 3, 4, 5]);
      expect(getDaysArray("weekend")).toEqual([0, 6]);
      expect(getDaysArray("custom", [1, 3, 5])).toEqual([1, 3, 5]);
    });
  });

  describe("generateId", () => {
    it("generates unique ids", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe("string");
      expect(id1.length).toBeGreaterThan(0);
    });
  });
});
