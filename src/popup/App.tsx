import { useState, useEffect, useCallback } from "react";
import { MESSAGE_TYPES } from "@/shared/constants";
import type {
  Settings,
  Platform,
  BlockReason,
  ScheduleWindow,
} from "@/shared/types";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Limits from "./pages/Limits";
import Schedule from "./pages/Schedule";
import Stats from "./pages/Stats";
import SettingsPage from "./pages/Settings";
import Modal from "./components/Modal";

export type Tab = "home" | "limits" | "schedule" | "stats" | "settings";

export type AppStateData = {
  settings: Settings;
  todayStats: {
    date: string;
    youtubeShorts: number;
    instagramReels: number;
    shortFormSeconds: number;
    blockedAttempts: number;
    sessions: number;
    hourlyUsage: number[];
  };
  override: {
    active: boolean;
    startedAt: number;
    expiresAt: number;
    platform?: Platform;
  };
  manualBlock: {
    active: boolean;
    startedAt: number;
    expiresAt: number;
    platform?: Platform;
  };
  pause: {
    active: boolean;
    startedAt: number;
    expiresAt: number;
  };
  sessions: Array<{
    id: string;
    platform: Platform;
    contentId: string;
    startedAt: number;
    endedAt?: number;
    activeSeconds: number;
  }>;
};

export type ModalState = {
  open: boolean;
  type:
    | "none"
    | "override"
    | "block"
    | "pause"
    | "preset-confirm"
    | "import-error"
    | "clear-data";
  data?: Record<string, unknown>;
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedPlatform, setSelectedPlatform] =
    useState<Platform>("youtube");
  const [appState, setAppState] = useState<AppStateData | null>(null);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    type: "none",
  });

  const fetchState = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_STATE,
      });
      if (response) {
        setAppState(response as AppStateData);
      }
    } catch {
      setAppState({
        settings: {
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
        },
        todayStats: {
          date: new Date().toISOString().split("T")[0],
          youtubeShorts: 0,
          instagramReels: 0,
          shortFormSeconds: 0,
          blockedAttempts: 0,
          sessions: 0,
          hourlyUsage: new Array(24).fill(0),
        },
        override: { active: false, startedAt: 0, expiresAt: 0 },
        manualBlock: { active: false, startedAt: 0, expiresAt: 0 },
        pause: { active: false, startedAt: 0, expiresAt: 0 },
        sessions: [],
      });
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const sendMessage = async (type: string, payload?: Record<string, unknown>) => {
    try {
      await chrome.runtime.sendMessage({ type, payload });
      await fetchState();
    } catch (err) {
      console.error("[ScrollControl] Message failed:", err);
    }
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    await sendMessage(MESSAGE_TYPES.UPDATE_SETTINGS, {
      settings: updates,
    });
  };

  const updatePlatformRules = async (
    platform: Platform,
    rules: Record<string, unknown>
  ) => {
    await sendMessage(MESSAGE_TYPES.UPDATE_RULES, {
      platform,
      rules,
    });
  };

  const getStatus = (): {
    state: string;
    message: string;
    reason: BlockReason;
  } => {
    if (!appState) return { state: "loading", message: "Loading...", reason: "none" };
    const { settings, override, manualBlock, pause, todayStats } = appState;
    const platformRules = settings.platforms[selectedPlatform];
    const items =
      selectedPlatform === "youtube"
        ? todayStats.youtubeShorts
        : todayStats.instagramReels;
    const maxItems = platformRules.maxItemsPerDay;
    const maxTime = platformRules.maxSecondsPerDay;

    if (!settings.enabled) return { state: "disabled", message: "ScrollControl is disabled.", reason: "none" };
    if (!platformRules.enabled)
      return {
        state: "disabled",
        message: `${selectedPlatform === "youtube" ? "YouTube Shorts" : "Instagram Reels"} is disabled.`,
        reason: "none",
      };

    const now = Date.now();
    if (pause.active && now < pause.expiresAt) {
      const remaining = Math.ceil((pause.expiresAt - now) / 60000);
      return {
        state: "paused",
        message: `ScrollControl is paused for ${remaining} min.`,
        reason: "paused",
      };
    }

    if (override.active && now < override.expiresAt) {
      const remaining = Math.ceil((override.expiresAt - now) / 60000);
      return {
        state: "override",
        message: `Temporary access active for ${remaining} min.`,
        reason: "none",
      };
    }

    if (manualBlock.active && now < manualBlock.expiresAt) {
      const remaining = Math.ceil((manualBlock.expiresAt - now) / 60000);
      return {
        state: "blocked",
        message: `Content blocked for ${remaining} min.`,
        reason: "manual_block",
      };
    }

    if (maxItems > 0 && items >= maxItems) {
      return {
        state: "limit_reached",
        message: `You've reached your daily ${selectedPlatform === "youtube" ? "Shorts" : "Reels"} limit.`,
        reason: "daily_limit",
      };
    }

    if (maxTime > 0 && todayStats.shortFormSeconds >= maxTime) {
      return {
        state: "limit_reached",
        message: "You've reached your daily time limit.",
        reason: "time_limit",
      };
    }

    if (platformRules.scheduleEnabled && platformRules.allowedWindows.length > 0) {
      const now2 = new Date();
      const day = now2.getDay();
      const minutes = now2.getHours() * 60 + now2.getMinutes();
      const inWindow = platformRules.allowedWindows.some(
        (w: ScheduleWindow) => {
          if (!w.days.includes(day)) return false;
          const [sh, sm] = w.start.split(":").map(Number);
          const [eh, em] = w.end.split(":").map(Number);
          const start = sh * 60 + sm;
          const end = eh * 60 + em;
          if (start < end) return minutes >= start && minutes < end;
          return minutes >= start || minutes < end;
        }
      );
      if (!inWindow) {
        return {
          state: "schedule_blocked",
          message: "Short-form content is blocked by schedule.",
          reason: "schedule",
        };
      }
    }

    return {
      state: "allowed",
      message: "You can watch short-form content.",
      reason: "none",
    };
  };

  const renderPage = () => {
    if (!appState) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-text-secondary text-sm">Loading...</div>
        </div>
      );
    }

    switch (activeTab) {
      case "home":
        return (
          <Home
            appState={appState}
            selectedPlatform={selectedPlatform}
            status={getStatus()}
            sendMessage={sendMessage}
            setModal={setModal}
          />
        );
      case "limits":
        return (
          <Limits
            appState={appState}
            selectedPlatform={selectedPlatform}
            updatePlatformRules={updatePlatformRules}
          />
        );
      case "schedule":
        return (
          <Schedule
            appState={appState}
            selectedPlatform={selectedPlatform}
            updatePlatformRules={updatePlatformRules}
            setModal={setModal}
          />
        );
      case "stats":
        return <Stats appState={appState} selectedPlatform={selectedPlatform} />;
      case "settings":
        return (
          <SettingsPage
            appState={appState}
            updateSettings={updateSettings}
            sendMessage={sendMessage}
            setModal={setModal}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <Header />
      <div className="flex-1 overflow-y-auto pb-16">
        {renderPage()}
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      {modal.open && (
        <Modal
          modal={modal}
          setModal={setModal}
          sendMessage={sendMessage}
          appState={appState}
        />
      )}
    </div>
  );
}

export default App;
