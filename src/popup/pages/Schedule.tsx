import { useState, useEffect } from "react";
import type { Platform, ScheduleWindow } from "@/shared/types";
import type { AppStateData, ModalState } from "../App";
import PlatformSelector from "../components/PlatformSelector";
import { generateId } from "@/shared/utils";

type ScheduleProps = {
  appState: AppStateData;
  selectedPlatform: Platform;
  updatePlatformRules: (platform: Platform, rules: Record<string, unknown>) => Promise<void>;
  setModal: (modal: ModalState) => void;
};

const PRESETS = [
  { id: "study", label: "Study Mode", desc: "Allow 18:00–22:00 on weekdays" },
  { id: "work", label: "Work Mode", desc: "Allow 17:00–22:00 on weekdays" },
  { id: "evening", label: "Evening Only", desc: "Allow 18:00–22:00 every day" },
  { id: "custom", label: "Custom", desc: "Set your own schedule" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Schedule({
  appState,
  selectedPlatform,
  updatePlatformRules,
  setModal,
}: ScheduleProps) {
  const [platform, setPlatform] = useState<Platform>(selectedPlatform);
  const { settings } = appState;
  const rules = settings.platforms[platform];

  const [allowedWindows, setAllowedWindows] = useState<ScheduleWindow[]>(
    rules.allowedWindows || []
  );

  useEffect(() => {
    setAllowedWindows(rules.allowedWindows || []);
  }, [rules.allowedWindows]);

  const handleAddWindow = () => {
    const newWindow: ScheduleWindow = {
      id: generateId(),
      days: [1, 2, 3, 4, 5],
      start: "18:00",
      end: "20:00",
    };
    const updated = [...allowedWindows, newWindow];
    setAllowedWindows(updated);
    updatePlatformRules(platform, { allowedWindows: updated, scheduleEnabled: true });
  };

  const handleRemoveWindow = (id: string) => {
    const updated = allowedWindows.filter((w) => w.id !== id);
    setAllowedWindows(updated);
    updatePlatformRules(platform, { allowedWindows: updated });
  };

  const handleWindowChange = (
    id: string,
    field: keyof ScheduleWindow,
    value: string | number[]
  ) => {
    const updated = allowedWindows.map((w) =>
      w.id === id ? { ...w, [field]: value } : w
    );
    setAllowedWindows(updated);
    updatePlatformRules(platform, { allowedWindows: updated });
  };

  const handleToggleSchedule = () => {
    const newValue = !rules.scheduleEnabled;
    updatePlatformRules(platform, {
      scheduleEnabled: newValue,
      allowedWindows: rules.allowedWindows.length > 0 ? rules.allowedWindows : [{
        id: generateId(),
        days: [1, 2, 3, 4, 5],
        start: "18:00",
        end: "20:00",
      }],
    });
  };

  const handlePreset = (presetId: string) => {
    if (presetId === "custom") {
      handleAddWindow();
      return;
    }
    setModal({
      open: true,
      type: "preset-confirm",
      data: { preset: presetId, platform },
    });
  };

  return (
    <div className="animate-fade-in">
      <PlatformSelector selected={platform} onSelect={setPlatform} />

      <div className="px-4 mb-3">
        <div className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
          <div>
            <div className="text-xs font-semibold text-text-primary">Allowed hours</div>
            <div className="text-[10px] text-text-muted">Choose when you can watch</div>
          </div>
          <button
            onClick={handleToggleSchedule}
            className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
              rules.scheduleEnabled ? "bg-accent" : "bg-bg-elevated"
            }`}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
              style={{ left: rules.scheduleEnabled ? "22px" : "2px" }}
            />
          </button>
        </div>
      </div>

      {rules.scheduleEnabled && (
        <div className="px-4 mb-3">
          <div className="space-y-2">
            {allowedWindows.map((window) => (
              <div
                key={window.id}
                className="bg-bg-surface border border-border-default rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="time"
                    value={window.start}
                    onChange={(e) =>
                      handleWindowChange(window.id, "start", e.target.value)
                    }
                    className="flex-1 h-8 px-2 bg-bg-elevated border border-border-default rounded-md text-xs text-text-primary focus:outline-none focus:border-accent/50"
                  />
                  <span className="text-text-muted text-xs">→</span>
                  <input
                    type="time"
                    value={window.end}
                    onChange={(e) =>
                      handleWindowChange(window.id, "end", e.target.value)
                    }
                    className="flex-1 h-8 px-2 bg-bg-elevated border border-border-default rounded-md text-xs text-text-primary focus:outline-none focus:border-accent/50"
                  />
                  <button
                    onClick={() => handleRemoveWindow(window.id)}
                    className="w-7 h-7 rounded-md bg-bg-elevated border border-border-default flex items-center justify-center text-text-muted hover:text-danger hover:border-danger/30 transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-1">
                  {DAYS.map((day, index) => {
                    const dayNum = index;
                    const isSelected = window.days.includes(dayNum);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const newDays = isSelected
                            ? window.days.filter((d) => d !== dayNum)
                            : [...window.days, dayNum];
                          handleWindowChange(window.id, "days", newDays);
                        }}
                        className={`flex-1 py-1 rounded text-[9px] font-medium transition-all ${
                          isSelected
                            ? "bg-accent/20 text-accent border border-accent/30"
                            : "bg-bg-elevated text-text-muted border border-border-default"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={handleAddWindow}
              className="w-full py-2.5 rounded-lg border border-dashed border-border-default text-xs font-medium text-text-muted hover:text-accent hover:border-accent/30 transition-all flex items-center justify-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add time window
            </button>
          </div>
        </div>
      )}

      <div className="px-4 mb-3">
        <div className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">
          Quick presets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePreset(preset.id)}
              className="p-3 bg-bg-surface border border-border-default rounded-lg text-left hover:border-accent/30 transition-all"
            >
              <div className="text-xs font-semibold text-text-primary mb-0.5">
                {preset.label}
              </div>
              <div className="text-[10px] text-text-muted">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
