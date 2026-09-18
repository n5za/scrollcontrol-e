import { useState, useEffect } from "react";
import type { Platform } from "@/shared/types";
import type { AppStateData } from "../App";
import PlatformSelector from "../components/PlatformSelector";
import { formatSeconds } from "@/shared/utils";

type LimitsProps = {
  appState: AppStateData;
  selectedPlatform: Platform;
  updatePlatformRules: (platform: Platform, rules: Record<string, unknown>) => Promise<void>;
};

export default function Limits({
  appState,
  selectedPlatform,
  updatePlatformRules,
}: LimitsProps) {
  const [platform, setPlatform] = useState<Platform>(selectedPlatform);
  const { settings, todayStats } = appState;
  const rules = settings.platforms[platform];

  const [maxItems, setMaxItems] = useState(rules.maxItemsPerDay);
  const [maxTime, setMaxTime] = useState(Math.floor(rules.maxSecondsPerDay / 60));
  const [scheduleEnabled, setScheduleEnabled] = useState(rules.scheduleEnabled);

  useEffect(() => {
    setMaxItems(rules.maxItemsPerDay);
    setMaxTime(Math.floor(rules.maxSecondsPerDay / 60));
    setScheduleEnabled(rules.scheduleEnabled);
  }, [rules]);

  const handleItemsChange = async (value: number) => {
    const clamped = Math.max(0, Math.min(9999, value));
    setMaxItems(clamped);
    await updatePlatformRules(platform, { maxItemsPerDay: clamped });
  };

  const handleTimeChange = async (value: number) => {
    const clamped = Math.max(0, Math.min(9999, value));
    setMaxTime(clamped);
    await updatePlatformRules(platform, { maxSecondsPerDay: clamped * 60 });
  };

  const currentItems =
    platform === "youtube"
      ? todayStats.youtubeShorts
      : todayStats.instagramReels;
  const currentTime = todayStats.shortFormSeconds;

  return (
    <div className="animate-fade-in">
      <PlatformSelector selected={platform} onSelect={setPlatform} />

      <div className="px-4 mb-3">
        <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
          <div>
            <div className="text-xs font-semibold text-text-primary">Daily limits</div>
            <div className="text-[10px] text-text-muted">Set how many Shorts/Reels and how much time</div>
          </div>
          <button
            onClick={() =>
              updatePlatformRules(platform, { enabled: !rules.enabled })
            }
            className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
              rules.enabled ? "bg-accent" : "bg-bg-elevated"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                rules.enabled ? "left-5.5" : "left-0.5"
              }`}
              style={{ left: rules.enabled ? "22px" : "2px" }}
            />
          </button>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="bg-bg-surface border border-border-default rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-[11px] font-medium text-text-primary">
              Max {platform === "youtube" ? "Shorts" : "Reels"} per day
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleItemsChange(maxItems - 1)}
                className="w-7 h-7 rounded-md bg-bg-elevated border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all text-xs"
              >
                −
              </button>
              <input
                type="number"
                value={maxItems}
                onChange={(e) => handleItemsChange(parseInt(e.target.value) || 0)}
                className="w-14 h-7 text-center bg-bg-elevated border border-border-default rounded-md text-sm font-medium text-text-primary focus:outline-none focus:border-accent/50"
              />
              <button
                onClick={() => handleItemsChange(maxItems + 1)}
                className="w-7 h-7 rounded-md bg-bg-elevated border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all text-xs"
              >
                +
              </button>
            </div>
          </div>
          <div className="text-[10px] text-text-muted mt-1.5">
            You've used {currentItems} / {maxItems}
          </div>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="bg-bg-surface border border-border-default rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-[11px] font-medium text-text-primary">
              Max time per day
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTimeChange(maxTime - 1)}
                className="w-7 h-7 rounded-md bg-bg-elevated border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all text-xs"
              >
                −
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={maxTime}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value) || 0)}
                  className="w-14 h-7 text-center bg-bg-elevated border border-border-default rounded-md text-sm font-medium text-text-primary focus:outline-none focus:border-accent/50"
                />
                <span className="text-[10px] text-text-muted">min</span>
              </div>
              <button
                onClick={() => handleTimeChange(maxTime + 1)}
                className="w-7 h-7 rounded-md bg-bg-elevated border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all text-xs"
              >
                +
              </button>
            </div>
          </div>
          <div className="text-[10px] text-text-muted mt-1.5">
            You've used {formatSeconds(currentTime)} / {formatSeconds(maxTime * 60)}
          </div>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
          Other options
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
            <span className="text-xs text-text-secondary">Count only when video is playing</span>
            <button
              onClick={() =>
                updatePlatformRules(platform, {
                  countOnlyWhenPlaying: !rules.countOnlyWhenPlaying,
                })
              }
              className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                rules.countOnlyWhenPlaying ? "bg-accent" : "bg-bg-elevated"
              }`}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: rules.countOnlyWhenPlaying ? "22px" : "2px" }}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
            <span className="text-xs text-text-secondary">Pause counting when tab inactive</span>
            <button
              onClick={() =>
                updatePlatformRules(platform, {
                  pauseCountWhenInactive: !rules.pauseCountWhenInactive,
                })
              }
              className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                rules.pauseCountWhenInactive ? "bg-accent" : "bg-bg-elevated"
              }`}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: rules.pauseCountWhenInactive ? "22px" : "2px" }}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
            <span className="text-xs text-text-secondary">Show notifications</span>
            <button
              onClick={() =>
                updatePlatformRules(platform, {
                  scheduleEnabled: !scheduleEnabled,
                })
              }
              className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                settings.showNotifications ? "bg-accent" : "bg-bg-elevated"
              }`}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: settings.showNotifications ? "22px" : "2px" }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
