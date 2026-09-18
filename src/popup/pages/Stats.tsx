import { useState, useEffect } from "react";
import type { Platform } from "@/shared/types";
import type { AppStateData } from "../App";
import PlatformSelector from "../components/PlatformSelector";
import { formatSeconds } from "@/shared/utils";

type StatsProps = {
  appState: AppStateData;
  selectedPlatform: Platform;
};

type TimeRange = "today" | "week" | "month";

export default function Stats({ appState, selectedPlatform }: StatsProps) {
  const [platform, setPlatform] = useState<Platform>(selectedPlatform);
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const { todayStats, settings, sessions } = appState;

  const platformRules = settings.platforms[platform];

  const getMetrics = () => {
    if (timeRange === "today") {
      const items =
        platform === "youtube"
          ? todayStats.youtubeShorts
          : todayStats.instagramReels;
      return {
        items,
        time: todayStats.shortFormSeconds,
        blocked: todayStats.blockedAttempts,
        sessions: todayStats.sessions,
      };
    }

    // For week/month, aggregate from sessions
    const now = Date.now();
    const cutoff =
      timeRange === "week"
        ? now - 7 * 24 * 60 * 60 * 1000
        : now - 30 * 24 * 60 * 60 * 1000;
    const filteredSessions = sessions.filter(
      (s) => s.platform === platform && s.startedAt >= cutoff
    );

    const totalItems = filteredSessions.length;
    const totalTime = filteredSessions.reduce(
      (acc, s) => acc + s.activeSeconds,
      0
    );

    return {
      items: totalItems,
      time: totalTime,
      blocked: 0,
      sessions: filteredSessions.length,
    };
  };

  const metrics = getMetrics();

  const getAvgSession = () => {
    if (metrics.sessions === 0) return "0s";
    const avg = Math.round(metrics.time / metrics.sessions);
    return formatSeconds(avg);
  };

  const getLongestSession = () => {
    if (sessions.length === 0) return "0s";
    const platformSessions = sessions.filter((s) => s.platform === platform);
    if (platformSessions.length === 0) return "0s";
    const longest = Math.max(
      ...platformSessions.map((s) => s.activeSeconds)
    );
    return formatSeconds(longest);
  };

  // Generate daily data for chart
  const getDailyData = () => {
    const days = timeRange === "today" ? 1 : timeRange === "week" ? 7 : 30;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const daySessions = sessions.filter(
        (s) =>
          s.platform === platform &&
          new Date(s.startedAt).toISOString().split("T")[0] === dateStr
      );
      data.push({
        label:
          days === 1
            ? "Today"
            : date.toLocaleDateString("en-US", { weekday: "short" }),
        count: daySessions.length,
        time: daySessions.reduce((a, s) => a + s.activeSeconds, 0),
      });
    }
    return data;
  };

  // Generate hourly heatmap data
  const getHourlyData = () => {
    const hourly = new Array(24).fill(0);
    const platformSessions = sessions.filter((s) => s.platform === platform);
    for (const session of platformSessions) {
      const hour = new Date(session.startedAt).getHours();
      hourly[hour]++;
    }
    const max = Math.max(...hourly, 1);
    return hourly.map((count, hour) => ({
      hour,
      count,
      intensity: count / max,
    }));
  };

  const dailyData = getDailyData();
  const hourlyData = getHourlyData();
  const maxDailyCount = Math.max(...dailyData.map((d) => d.count), 1);

  return (
    <div className="animate-fade-in">
      <PlatformSelector selected={platform} onSelect={setPlatform} />

      <div className="px-4 mb-3">
        <div className="flex gap-1 bg-bg-surface border border-border-default rounded-lg p-1">
          {(["today", "week", "month"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                timeRange === range
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {range === "today"
                ? "Today"
                : range === "week"
                ? "This Week"
                : "This Month"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
          Overview
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <div className="bg-bg-surface border border-border-default rounded-lg p-2 text-center">
            <div className="w-5 h-5 rounded bg-youtube/20 flex items-center justify-center mx-auto mb-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#ff0000">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <div className="text-sm font-bold text-text-primary">{metrics.items}</div>
            <div className="text-[9px] text-text-muted">Shorts</div>
          </div>

          <div className="bg-bg-surface border border-border-default rounded-lg p-2 text-center">
            <div className="w-5 h-5 rounded bg-instagram/20 flex items-center justify-center mx-auto mb-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#E1306C">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <div className="text-sm font-bold text-text-primary">
              {platform === "youtube" ? todayStats.instagramReels : todayStats.youtubeShorts}
            </div>
            <div className="text-[9px] text-text-muted">Reels</div>
          </div>

          <div className="bg-bg-surface border border-border-default rounded-lg p-2 text-center">
            <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center mx-auto mb-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="text-sm font-bold text-text-primary">
              {formatSeconds(metrics.time)}
            </div>
            <div className="text-[9px] text-text-muted">Time</div>
          </div>

          <div className="bg-bg-surface border border-border-default rounded-lg p-2 text-center">
            <div className="w-5 h-5 rounded bg-danger/20 flex items-center justify-center mx-auto mb-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <div className="text-sm font-bold text-text-primary">{metrics.blocked}</div>
            <div className="text-[9px] text-text-muted">Blocked</div>
          </div>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="bg-bg-surface border border-border-default rounded-lg p-3">
          <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
            Usage chart
          </div>
          <div className="flex items-end gap-1 h-24">
            {dailyData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm transition-all duration-300"
                  style={{
                    height: `${Math.max((day.count / maxDailyCount) * 80, 2)}px`,
                    backgroundColor:
                      day.count > 0 ? "#6c5ce7" : "#222842",
                  }}
                />
                <span className="text-[8px] text-text-muted">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="bg-bg-surface border border-border-default rounded-lg p-3">
          <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
            Top usage time
          </div>
          <div className="grid grid-cols-24 gap-px">
            {hourlyData.map((h) => (
              <div
                key={h.hour}
                className="h-6 rounded-sm transition-all duration-300"
                style={{
                  backgroundColor:
                    h.intensity > 0
                      ? `rgba(108, 92, 231, ${Math.max(h.intensity * 0.8, 0.1)})`
                      : "#1a1f35",
                }}
                title={`${h.hour}:00 - ${h.count} sessions`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-text-muted">0h</span>
            <span className="text-[8px] text-text-muted">6h</span>
            <span className="text-[8px] text-text-muted">12h</span>
            <span className="text-[8px] text-text-muted">18h</span>
            <span className="text-[8px] text-text-muted">24h</span>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
          Additional metrics
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-bg-surface border border-border-default rounded-lg p-3">
            <div className="text-[10px] text-text-muted mb-1">Average session</div>
            <div className="text-sm font-bold text-text-primary">{getAvgSession()}</div>
          </div>
          <div className="bg-bg-surface border border-border-default rounded-lg p-3">
            <div className="text-[10px] text-text-muted mb-1">Longest session</div>
            <div className="text-sm font-bold text-text-primary">{getLongestSession()}</div>
          </div>
          <div className="bg-bg-surface border border-border-default rounded-lg p-3">
            <div className="text-[10px] text-text-muted mb-1">Total watched</div>
            <div className="text-sm font-bold text-text-primary">{metrics.items}</div>
          </div>
          <div className="bg-bg-surface border border-border-default rounded-lg p-3">
            <div className="text-[10px] text-text-muted mb-1">Blocked attempts</div>
            <div className="text-sm font-bold text-text-primary">{metrics.blocked}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
