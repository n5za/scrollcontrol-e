export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0
    ? `${hours}h ${remainingMins}m`
    : `${hours}h`;
}

export function formatTime(timeStr: string): string {
  return timeStr;
}

export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(((minutes % 1440) + 1440) % 1440 / 60);
  const m = ((minutes % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function getDayOfWeek(): number {
  return new Date().getDay();
}

export function isTimeInRange(
  currentMinutes: number,
  startStr: string,
  endStr: string
): boolean {
  const start = timeStringToMinutes(startStr);
  const end = timeStringToMinutes(endStr);

  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  // Cross-midnight: e.g., 23:00 -> 01:00
  return currentMinutes >= start || currentMinutes < end;
}

export function checkScheduleWindows(
  windows: Array<{ days: number[]; start: string; end: string }>,
  currentDay: number,
  currentMinutes: number
): boolean {
  return windows.some((window) => {
    if (!window.days.includes(currentDay)) return false;
    return isTimeInRange(currentMinutes, window.start, window.end);
  });
}

export function getDaysArray(
  type: "everyday" | "weekdays" | "weekend" | "custom",
  customDays?: number[]
): number[] {
  switch (type) {
    case "everyday":
      return [0, 1, 2, 3, 4, 5, 6];
    case "weekdays":
      return [1, 2, 3, 4, 5];
    case "weekend":
      return [0, 6];
    case "custom":
      return customDays || [];
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}
