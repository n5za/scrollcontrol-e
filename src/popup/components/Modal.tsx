import { useState, useEffect, useRef } from "react";
import { MESSAGE_TYPES } from "@/shared/constants";
import type { ModalState, AppStateData } from "../App";

type ModalProps = {
  modal: ModalState;
  setModal: (modal: ModalState) => void;
  sendMessage: (type: string, payload?: Record<string, unknown>) => Promise<void>;
  appState: AppStateData | null;
};

export default function Modal({ modal, setModal, sendMessage, appState }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [overrideMinutes, setOverrideMinutes] = useState(15);
  const [blockMinutes, setBlockMinutes] = useState(15);
  const [pauseMinutes, setPauseMinutes] = useState(15);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal({ open: false, type: "none" });
    };
    if (modal.open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [modal.open, setModal]);

  if (!modal.open) return null;

  const handleOverride = async () => {
    await sendMessage(MESSAGE_TYPES.CREATE_OVERRIDE, {
      durationMinutes: overrideMinutes,
    });
    setModal({ open: false, type: "none" });
  };

  const handleBlock = async () => {
    await sendMessage(MESSAGE_TYPES.CREATE_MANUAL_BLOCK, {
      durationMinutes: blockMinutes,
    });
    setModal({ open: false, type: "none" });
  };

  const handlePause = async () => {
    await sendMessage(MESSAGE_TYPES.PAUSE_EXTENSION, {
      durationMinutes: pauseMinutes,
    });
    setModal({ open: false, type: "none" });
  };

  const handleClearData = async () => {
    await sendMessage("CLEAR_ALL_DATA");
    setModal({ open: false, type: "none" });
  };

  const handleImportData = async () => {
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
        setModal({ open: false, type: "none" });
      }
    };
    input.click();
    setModal({ open: false, type: "none" });
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current)
          setModal({ open: false, type: "none" });
      }}
    >
      <div className="bg-bg-surface border border-border-default rounded-xl p-5 w-[320px] animate-slide-up">
        {modal.type === "override" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Allow for a limited time</div>
                <div className="text-[11px] text-text-muted">Choose how long you want to allow content.</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[5, 15, 30].map((min) => (
                <button
                  key={min}
                  onClick={() => setOverrideMinutes(min)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all border ${
                    overrideMinutes === min
                      ? "bg-accent border-accent text-white"
                      : "bg-bg-elevated border-border-default text-text-secondary hover:border-accent/50"
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
            <button
              onClick={() => setOverrideMinutes(60 * 24)}
              className={`w-full py-2 rounded-lg text-xs font-medium transition-all border mb-3 ${
                overrideMinutes === 60 * 24
                  ? "bg-accent border-accent text-white"
                  : "bg-bg-elevated border-border-default text-text-secondary hover:border-accent/50"
              }`}
            >
              Until tomorrow
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setModal({ open: false, type: "none" })}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-bg-elevated border border-border-default text-text-secondary hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-all"
              >
                Allow
              </button>
            </div>
          </>
        )}

        {modal.type === "block" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-danger/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Block now</div>
                <div className="text-[11px] text-text-muted">How long should content be blocked?</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[15, 30, 60, 60 * 24].map((min) => (
                <button
                  key={min}
                  onClick={() => setBlockMinutes(min)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all border ${
                    blockMinutes === min
                      ? "bg-danger border-danger text-white"
                      : "bg-bg-elevated border-border-default text-text-secondary hover:border-danger/50"
                  }`}
                >
                  {min >= 60 * 24 ? "Until tomorrow" : min >= 60 ? `${min / 60}h` : `${min} min`}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setModal({ open: false, type: "none" })}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-bg-elevated border border-border-default text-text-secondary hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBlock}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-danger text-white hover:bg-danger-muted transition-all"
              >
                Block
              </button>
            </div>
          </>
        )}

        {modal.type === "pause" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Pause ScrollControl</div>
                <div className="text-[11px] text-text-muted">Enforcement will be paused.</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[5, 15, 30, 60 * 24].map((min) => (
                <button
                  key={min}
                  onClick={() => setPauseMinutes(min)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all border ${
                    pauseMinutes === min
                      ? "bg-warning border-warning text-white"
                      : "bg-bg-elevated border-border-default text-text-secondary hover:border-warning/50"
                  }`}
                >
                  {min >= 60 * 24 ? "Until tomorrow" : `${min} min`}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setModal({ open: false, type: "none" })}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-bg-elevated border border-border-default text-text-secondary hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePause}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-warning text-white hover:bg-warning-muted transition-all"
              >
                Pause
              </button>
            </div>
          </>
        )}

        {modal.type === "clear-data" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-danger/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Clear all data</div>
                <div className="text-[11px] text-text-muted">This will delete all settings and history.</div>
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setModal({ open: false, type: "none" })}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-bg-elevated border border-border-default text-text-secondary hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-danger text-white hover:bg-danger-muted transition-all"
              >
                Clear data
              </button>
            </div>
          </>
        )}

        {modal.type === "import-error" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-danger/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Import failed</div>
                <div className="text-[11px] text-text-muted">The file format is invalid.</div>
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Please ensure the file is a valid ScrollControl backup JSON file.
            </p>
            <button
              onClick={() => setModal({ open: false, type: "none" })}
              className="w-full py-2 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-all"
            >
              Close
            </button>
          </>
        )}

        {modal.type === "preset-confirm" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Apply preset?</div>
                <div className="text-[11px] text-text-muted">This will replace your current schedule.</div>
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Your existing schedule windows will be replaced with the preset configuration.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setModal({ open: false, type: "none" })}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-bg-elevated border border-border-default text-text-secondary hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const preset = modal.data?.preset as string;
                  if (preset && appState) {
                    const platform = modal.data?.platform as "youtube" | "instagram";
                    let allowedWindows: Array<{ id: string; days: number[]; start: string; end: string }> = [];
                    if (preset === "study") {
                      allowedWindows = [
                        { id: Date.now().toString(), days: [1,2,3,4,5], start: "18:00", end: "22:00" },
                      ];
                    } else if (preset === "work") {
                      allowedWindows = [
                        { id: Date.now().toString(), days: [1,2,3,4,5], start: "17:00", end: "22:00" },
                      ];
                    } else if (preset === "evening") {
                      allowedWindows = [
                        { id: Date.now().toString(), days: [0,1,2,3,4,5,6], start: "18:00", end: "22:00" },
                      ];
                    }
                    chrome.runtime.sendMessage({
                      type: MESSAGE_TYPES.UPDATE_RULES,
                      payload: {
                        platform,
                        rules: { allowedWindows, scheduleEnabled: true },
                      },
                    });
                  }
                  setModal({ open: false, type: "none" });
                }}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-all"
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
