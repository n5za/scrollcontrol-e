import { useState, useEffect } from "react";
import type { Platform, BlockReason } from "@/shared/types";
import type { AppStateData, ModalState } from "../App";
import PlatformSelector from "../components/PlatformSelector";
import { formatSeconds } from "@/shared/utils";

type HomeProps = {
  appState: AppStateData;
  selectedPlatform: Platform;
  status: { state: string; message: string; reason: BlockReason };
  sendMessage: (type: string, payload?: Record<string, unknown>) => Promise<void>;
  setModal: (modal: ModalState) => void;
};

export default function Home({
  appState,
  selectedPlatform,
  status,
  sendMessage,
  setModal,
}: HomeProps) {
  const [platform, setPlatform] = useState<Platform>(selectedPlatform);
  const { todayStats, settings, override, manualBlock, pause } = appState;
  const platformRules = settings.platforms[platform];

  const items =
    platform === "youtube"
      ? todayStats.youtubeShorts
      : todayStats.instagramReels;
  const maxItems = platformRules.maxItemsPerDay;
  const timeSpent = todayStats.shortFormSeconds;
  const maxTime = platformRules.maxSecondsPerDay;
  const remaining = maxItems > 0 ? Math.max(0, maxItems - items) : 0;
  const timeRemaining = maxTime > 0 ? Math.max(0, maxTime - timeSpent) : 0;

  const now = Date.now();
  const isPaused = pause.active && now < pause.expiresAt;
  const isOverride = override.active && now < override.expiresAt;
  const isManualBlock = manualBlock.active && now < manualBlock.expiresAt;

  const getPauseRemaining = () => {
    if (!isPaused) return "";
    const mins = Math.ceil((pause.expiresAt - now) / 60000);
    return `${mins} min`;
  };

  const getOverrideRemaining = () => {
    if (!isOverride) return "";
    const mins = Math.ceil((override.expiresAt - now) / 60000);
    return `${mins} min`;
  };

  const getBlockRemaining = () => {
    if (!isManualBlock) return "";
    const mins = Math.ceil((manualBlock.expiresAt - now) / 60000);
    return `${mins} min`;
  };

  const itemProgress = maxItems > 0 ? Math.min((items / maxItems) * 100, 100) : 0;
  const timeProgress = maxTime > 0 ? Math.min((timeSpent / maxTime) * 100, 100) : 0;

  const getStatusColor = () => {
    switch (status.state) {
      case "allowed":
        return "bg-success/10 border-success/30 text-success";
      case "blocked":
      case "limit_reached":
        return "bg-danger/10 border-danger/30 text-danger";
      case "schedule_blocked":
        return "bg-warning/10 border-warning/30 text-warning";
      case "paused":
        return "bg-warning/10 border-warning/30 text-warning";
      case "override":
        return "bg-accent/10 border-accent/30 text-accent";
      default:
        return "bg-bg-surface border-border-default text-text-secondary";
    }
  };

  const getStatusIcon = () => {
    switch (status.state) {
      case "allowed":
        return "✓";
      case "blocked":
      case "limit_reached":
        return "⛔";
      case "schedule_blocked":
        return "🕐";
      case "paused":
        return "⏸";
      case "override":
        return "🔓";
      default:
        return "•";
    }
  };

  return (
    <div className="animate-fade-in">
      <PlatformSelector selected={platform} onSelect={setPlatform} />

      <div className="px-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-secondary">Today</span>
          <span className="text-[10px] text-text-muted">
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-2 mb-3">
        <div className="bg-bg-surface border border-border-default rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-youtube" />
            <span className="text-[10px] text-text-muted font-medium">
              {platform === "youtube" ? "Shorts" : "Reels"}
            </span>
          </div>
          <div className="text-xl font-bold text-text-primary leading-none mb-1">
            {items}{" "}
            <span className="text-sm font-normal text-text-muted">
              / {maxItems}
            </span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${itemProgress}%`,
                backgroundColor:
                  itemProgress >= 100
                    ? "#ef4444"
                    : itemProgress >= 80
                    ? "#f59e0b"
                    : "#22c55e",
              }}
            />
          </div>
          <div className="text-[10px] text-text-muted mt-1">
            {remaining} remaining
          </div>
        </div>

        <div className="bg-bg-surface border border-border-default rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-instagram" />
            <span className="text-[10px] text-text-muted font-medium">
              {platform === "youtube" ? "Reels" : "Shorts"}
            </span>
          </div>
          <div className="text-xl font-bold text-text-primary leading-none mb-1">
            {platform === "youtube"
              ? todayStats.instagramReels
              : todayStats.youtubeShorts}{" "}
            <span className="text-sm font-normal text-text-muted">
              / {platform === "youtube" ? 15 : 30}
            </span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${platform === "youtube"
                  ? Math.min((todayStats.instagramReels / 15) * 100, 100)
                  : Math.min((todayStats.youtubeShorts / 30) * 100, 100)}%`,
                backgroundColor: "#6c5ce7",
              }}
            />
          </div>
          <div className="text-[10px] text-text-muted mt-1">
            {platform === "youtube"
              ? Math.max(0, 15 - todayStats.instagramReels)
              : Math.max(0, 30 - todayStats.youtubeShorts)}{" "}
            remaining
          </div>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="bg-bg-surface border border-border-default rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-[10px] text-text-muted font-medium">
                Time spent (short-form)
              </span>
            </div>
            <span className="text-[10px] text-text-muted">
              {formatSeconds(timeRemaining)} left
            </span>
          </div>
          <div className="text-lg font-bold text-text-primary leading-none mb-1">
            {formatSeconds(timeSpent)}{" "}
            <span className="text-sm font-normal text-text-muted">
              / {formatSeconds(maxTime)}
            </span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${timeProgress}%`,
                backgroundColor:
                  timeProgress >= 100
                    ? "#ef4444"
                    : timeProgress >= 80
                    ? "#f59e0b"
                    : "#6c5ce7",
              }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div
          className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{getStatusIcon()}</span>
            <div>
              <div className="text-xs font-semibold capitalize">
                {status.state === "limit_reached"
                  ? "Limit reached"
                  : status.state === "schedule_blocked"
                  ? "Scheduled block"
                  : status.state}
              </div>
              <div className="text-[10px] opacity-80">{status.message}</div>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
          Quick actions
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setModal({ open: true, type: "pause" })}
            className="flex flex-col items-center gap-1.5 p-3 bg-bg-surface border border-border-default rounded-lg hover:border-warning/30 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            <span className="text-[10px] text-text-secondary font-medium">Pause</span>
            <span className="text-[9px] text-text-muted">for 15 min</span>
          </button>

          <button
            onClick={() => setModal({ open: true, type: "block" })}
            className="flex flex-col items-center gap-1.5 p-3 bg-bg-surface border border-border-default rounded-lg hover:border-danger/30 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <span className="text-[10px] text-text-secondary font-medium">Block now</span>
            <span className="text-[9px] text-text-muted">immediately</span>
          </button>

          <button
            onClick={() => setModal({ open: true, type: "override" })}
            className="flex flex-col items-center gap-1.5 p-3 bg-bg-surface border border-border-default rounded-lg hover:border-accent/30 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[10px] text-text-secondary font-medium">Allow</span>
            <span className="text-[9px] text-text-muted">for 30 min</span>
          </button>
        </div>
      </div>

      {(isPaused || isOverride || isManualBlock) && (
        <div className="px-4 mb-4">
          <div className="bg-bg-surface border border-border-default rounded-lg p-3">
            {isPaused && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse-subtle" />
                <span className="text-xs text-text-secondary">
                  Paused — {getPauseRemaining()} remaining
                </span>
              </div>
            )}
            {isOverride && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse-subtle" />
                <span className="text-xs text-text-secondary">
                  Temporary access — {getOverrideRemaining()} remaining
                </span>
              </div>
            )}
            {isManualBlock && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-danger animate-pulse-subtle" />
                <span className="text-xs text-text-secondary">
                  Blocked — {getBlockRemaining()} remaining
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
