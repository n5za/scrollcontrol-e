import type { Platform, DetectedContent } from "@/shared/types";
import { MESSAGE_TYPES } from "@/shared/constants";

const SCROLLCONTROL_OVERLAY_ID = "scrollcontrol-overlay";
let currentSessionId: string | null = null;
let sessionStartTimestamp: number = 0;
let activeSeconds = 0;
let activeTimer: ReturnType<typeof setInterval> | null = null;
let lastContentId: string | null = null;
let blockedContentId: string | null = null;

function isShortsUrl(url: string): boolean {
  return /youtube\.com\/shorts\/[\w-]+/.test(url) || /youtu\.be\/[\w-]+/.test(url);
}

function extractShortId(url: string): string | null {
  const match = url.match(/\/shorts\/([\w-]+)/);
  return match ? match[1] : null;
}

function isPlaying(): boolean {
  const video = document.querySelector("video") as HTMLVideoElement | null;
  if (!video) return false;
  return !video.paused && !video.ended && video.readyState > 2;
}

function detectContent(): DetectedContent | null {
  const url = window.location.href;
  if (!isShortsUrl(url)) return null;
  const id = extractShortId(url);
  if (!id) return null;
  return {
    platform: "youtube" as Platform,
    id,
    type: "short",
    url,
    detectedAt: Date.now(),
  };
}

function startTracking(contentId: string) {
  if (lastContentId === contentId) return;
  stopTracking(false);
  lastContentId = contentId;
  sessionStartTimestamp = Date.now();
  activeSeconds = 0;

  chrome.runtime.sendMessage(
    {
      type: MESSAGE_TYPES.START_SESSION,
      payload: { platform: "youtube", contentId },
    },
    (response) => {
      if (response && !response.duplicate) {
        currentSessionId = response.sessionId;
      }
    }
  );

  if (isPlaying()) {
    startActiveTimer();
  }

  const video = document.querySelector("video");
  if (video) {
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
  }
}

function startActiveTimer() {
  if (activeTimer) return;
  activeTimer = setInterval(() => {
    if (document.visibilityState === "visible" && isPlaying()) {
      activeSeconds++;
    }
  }, 1000);
}

function stopActiveTimer() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

function onPlay() {
  startActiveTimer();
}

function onPause() {
  stopActiveTimer();
}

function onEnded() {
  stopActiveTimer();
}

function stopTracking(sendEnd = true) {
  stopActiveTimer();

  const video = document.querySelector("video");
  if (video) {
    video.removeEventListener("play", onPlay);
    video.removeEventListener("pause", onPause);
    video.removeEventListener("ended", onEnded);
  }

  if (sendEnd && currentSessionId && activeSeconds > 0) {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.END_SESSION,
      payload: { sessionId: currentSessionId, activeSeconds },
    });
  }

  currentSessionId = null;
  sessionStartTimestamp = 0;
  activeSeconds = 0;
  lastContentId = null;
}

function showBlockOverlay(reason: string, message: string, nextTime?: string) {
  removeBlockOverlay();

  const overlay = document.createElement("div");
  overlay.id = SCROLLCONTROL_OVERLAY_ID;
  overlay.className = "scrollcontrol-overlay";
  overlay.innerHTML = `
    <style>
      .scrollcontrol-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(10, 14, 26, 0.95);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #f0f0f5;
      }
      .scrollcontrol-card {
        background: #1a1f35;
        border: 1px solid #2a3150;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
      }
      .scrollcontrol-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 24px;
      }
      .scrollcontrol-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .scrollcontrol-message {
        font-size: 14px;
        color: #9ca3b0;
        margin-bottom: 20px;
        line-height: 1.5;
      }
      .scrollcontrol-progress {
        height: 6px;
        background: #2a3150;
        border-radius: 3px;
        margin-bottom: 16px;
        overflow: hidden;
      }
      .scrollcontrol-progress-bar {
        height: 100%;
        background: #ef4444;
        border-radius: 3px;
        transition: width 0.3s;
      }
      .scrollcontrol-next {
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 20px;
      }
      .scrollcontrol-buttons {
        display: flex;
        gap: 12px;
      }
      .scrollcontrol-btn {
        flex: 1;
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .scrollcontrol-btn:hover {
        opacity: 0.9;
      }
      .scrollcontrol-btn-close {
        background: #222842;
        color: #f0f0f5;
      }
      .scrollcontrol-btn-primary {
        background: #6c5ce7;
        color: white;
      }
    </style>
    <div class="scrollcontrol-card">
      <div class="scrollcontrol-icon">⛔</div>
      <div class="scrollcontrol-title">${reason}</div>
      <div class="scrollcontrol-message">${message}</div>
      <div class="scrollcontrol-progress">
        <div class="scrollcontrol-progress-bar" style="width: 100%"></div>
      </div>
      ${nextTime ? `<div class="scrollcontrol-next">Next available: ${nextTime}</div>` : ""}
      <div class="scrollcontrol-buttons">
        <button class="scrollcontrol-btn scrollcontrol-btn-close" id="sc-close">Close</button>
        <button class="scrollcontrol-btn scrollcontrol-btn-primary" id="sc-adjust">Adjust limits</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector("#sc-close")?.addEventListener("click", removeBlockOverlay);
  overlay.querySelector("#sc-adjust")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
  });
}

function removeBlockOverlay() {
  const existing = document.getElementById(SCROLLCONTROL_OVERLAY_ID);
  if (existing) existing.remove();
}

async function checkAndEnforce() {
  const content = detectContent();
  if (!content) {
    blockedContentId = null;
    if (lastContentId) {
      stopTracking();
    }
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.CHECK_PERMISSION,
    payload: { platform: "youtube" },
  });

  if (response && !response.allowed) {
    if (blockedContentId === content.id) return;
    let reasonText = "You've reached your limit.";
    let messageText = "Short-form content is blocked right now.";
    if (response.reason === "daily_limit") {
      reasonText = "You've reached your daily limit.";
      messageText = "You've watched all your Shorts for today.";
    } else if (response.reason === "time_limit") {
      reasonText = "Time limit reached.";
      messageText = "You've used all your allowed time today.";
    } else if (response.reason === "schedule") {
      reasonText = "Shorts are blocked right now.";
      messageText = `You can watch Shorts during your allowed hours.${response.nextAllowedTime ? " Next: " + response.nextAllowedTime : ""}`;
    } else if (response.reason === "manual_block") {
      reasonText = "Shorts are blocked.";
      messageText = "Content is manually blocked.";
    }
    blockedContentId = content.id;
    showBlockOverlay(reasonText, messageText, response.nextAllowedTime);
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.BLOCK_CONTENT,
      payload: { platform: "youtube", reason: response.reason },
    });
    stopTracking(false);
    return;
  }

  removeBlockOverlay();
  blockedContentId = null;
  startTracking(content.id);
}

let navigationTimeout: ReturnType<typeof setTimeout> | null = null;

function onUrlChange() {
  if (navigationTimeout) clearTimeout(navigationTimeout);
  navigationTimeout = setTimeout(checkAndEnforce, 500);
}

const historyPushState = history.pushState;
const historyReplaceState = history.replaceState;

history.pushState = function (...args) {
  historyPushState.apply(this, args);
  onUrlChange();
};

history.replaceState = function (...args) {
  historyReplaceState.apply(this, args);
  onUrlChange();
};

window.addEventListener("popstate", onUrlChange);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && currentSessionId) {
    stopActiveTimer();
  } else if (document.visibilityState === "visible" && currentSessionId) {
    if (isPlaying()) {
      startActiveTimer();
    }
  }
});

const observer = new MutationObserver(() => {
  if (window.location.href.includes("/shorts/")) {
    if (!lastContentId) {
      checkAndEnforce();
    }
  } else if (lastContentId) {
    stopTracking();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

checkAndEnforce();

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_BLOCK_OVERLAY") {
    const { reason, message: msg, nextTime } = message.payload || {};
    if (!document.getElementById(SCROLLCONTROL_OVERLAY_ID)) {
      showBlockOverlay(
        reason || "Blocked",
        msg || "Content is blocked.",
        nextTime
      );
    }
  } else if (message.type === "REMOVE_BLOCK_OVERLAY") {
    removeBlockOverlay();
  }
});
