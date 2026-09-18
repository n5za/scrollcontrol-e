import { useState } from "react";
import type { Settings } from "@/shared/types";
import type { AppStateData, ModalState } from "../App";
import { MESSAGE_TYPES } from "@/shared/constants";

type SettingsProps = {
  appState: AppStateData;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  sendMessage: (type: string, payload?: Record<string, unknown>) => Promise<void>;
  setModal: (modal: ModalState) => void;
};

export default function SettingsPage({
  appState,
  updateSettings,
  sendMessage,
  setModal,
}: SettingsProps) {
  const { settings } = appState;
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      const data = await chrome.runtime.sendMessage({
        type: "EXPORT_DATA",
      });
      if (data?.json) {
        const blob = new Blob([data.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `scrollcontrol-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExportStatus("Exported successfully");
        setTimeout(() => setExportStatus(null), 2000);
      }
    } catch {
      setExportStatus("Export failed");
      setTimeout(() => setExportStatus(null), 2000);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const success = await chrome.runtime.sendMessage({
        type: "IMPORT_DATA",
        payload: { data: text },
      });
      if (!success?.success) {
        setModal({ open: true, type: "import-error" });
      } else {
        setExportStatus("Imported successfully");
        setTimeout(() => setExportStatus(null), 2000);
      }
    };
    input.click();
  };

  return (
    <div className="animate-fade-in">
      <div className="px-4 mb-3">
        <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
          General
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
            <span className="text-xs text-text-secondary">Enable ScrollControl</span>
            <button
              onClick={() => updateSettings({ enabled: !settings.enabled })}
              className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                settings.enabled ? "bg-accent" : "bg-bg-elevated"
              }`}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: settings.enabled ? "22px" : "2px" }}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
            <span className="text-xs text-text-secondary">Start on browser launch</span>
            <button
              onClick={() => updateSettings({ startOnLaunch: !settings.startOnLaunch })}
              className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                settings.startOnLaunch ? "bg-accent" : "bg-bg-elevated"
              }`}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: settings.startOnLaunch ? "22px" : "2px" }}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
            <span className="text-xs text-text-secondary">Notifications</span>
            <button
              onClick={() => updateSettings({ showNotifications: !settings.showNotifications })}
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

          <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
            <span className="text-xs text-text-secondary">Theme</span>
            <select
              value={settings.theme}
              onChange={(e) =>
                updateSettings({
                  theme: e.target.value as "dark" | "light" | "system",
                })
              }
              className="h-7 px-2 bg-bg-elevated border border-border-default rounded-md text-xs text-text-primary focus:outline-none focus:border-accent/50"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
            <span className="text-xs text-text-secondary">Language</span>
            <select
              value={settings.language}
              onChange={(e) =>
                updateSettings({
                  language: e.target.value as "en" | "fr" | "ar",
                })
              }
              className="h-7 px-2 bg-bg-elevated border border-border-default rounded-md text-xs text-text-primary focus:outline-none focus:border-accent/50"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
          Data
        </div>
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg hover:border-accent/30 transition-all"
          >
            <span className="text-xs text-text-secondary">Export data</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <button
            onClick={handleImport}
            className="w-full flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg hover:border-accent/30 transition-all"
          >
            <span className="text-xs text-text-secondary">Import data</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>

          <button
            onClick={() => setModal({ open: true, type: "clear-data" })}
            className="w-full flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg hover:border-danger/30 transition-all"
          >
            <span className="text-xs text-danger">Clear all data</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        {exportStatus && (
          <div className="mt-2 text-center text-[10px] text-accent animate-fade-in">
            {exportStatus}
          </div>
        )}
      </div>

      <div className="px-4 mb-4">
        <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
          About
        </div>
        <div className="p-3 bg-bg-surface border border-border-default rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-text-primary">
                ScrollControl <span className="text-text-muted font-normal">v1.0.0</span>
              </div>
              <div className="text-[10px] text-text-muted">Less scrolling. More life.</div>
            </div>
          </div>
          <div className="text-[10px] text-text-muted">Your life. Your scroll. Your control.</div>
        </div>
      </div>
    </div>
  );
}
