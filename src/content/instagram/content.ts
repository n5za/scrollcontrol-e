import type { Platform, DetectedContent } from "@/shared/types";
import { MESSAGE_TYPES } from "@/shared/constants";

const SCROLLCONTROL_OVERLAY_ID = "scrollcontrol-overlay-ig";
let currentSessionId: string | null = null;
let activeSeconds = 0;
let activeTimer: ReturnType<typeof setInterval> | null = null;
let lastContentId: string | null = null;

function isReelsUrl(url: string): boolean {
  return /instagram\.com\/reels?\/[\w-]+/.test(url) || /instagram\.com\/reel\/[\w-]+/.test(url);
}

function extractReelId(url: string): string | null {
  const match = url.match(/\/reels?\/([\w-]+)/);
  return match ? match[1] : null;
}

function isPlaying(): boolean {
  const video = document.querySelector("video") as HTMLVideoElement | null;
  if (!video) return false;
  return !video.paused && !video.ended && video.readyState > 2;
}

function detectContent(): DetectedContent | null {
  const url = window.location.href;
  if (!isReelsUrl(url)) return null;
  const id = extractReelId(url);
  if (!id) return null;
  return {
    platform: "instagram" as Platform,
    id,
    type: "reel",
    url,
    detectedAt: Date.now(),
  };
}

function startTracking(contentId: string) {
  if (lastContentId === contentId) return;
  stopTracking(false);
  lastContentId = contentId;

  chrome.runtime.sendMessage(
    {
      type: MESSAGE_TYPES.START_SESSION,
      payload: { platform: "instagram", contentId },
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
      #${SCROLLCONTROL_OVERLAY_ID} {
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
      .scrollcontrol-card-ig {
        background: #1a1f35;
        border: 1px solid #2a3150;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
      }
      .scrollcontrol-icon-ig {
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
      .scrollcontrol-title-ig {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .scrollcontrol-message-ig {
        font-size: 14px;
        color: #9ca3b0;
        margin-bottom: 20px;
        line-height: 1.5;
      }
      .scrollcontrol-buttons-ig {
        display: flex;
        gap: 12px;
      }
      .scrollcontrol-btn-ig {
        flex: 1;
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
      }
      .scrollcontrol-btn-close-ig {
        background: #222842;
        color: #f0f0f5;
      }
      .scrollcontrol-btn-primary-ig {
        background: #6c5ce7;
        color: white;
      }
    </style>
    <div class="scrollcontrol-card-ig">
      <div class="scrollcontrol-icon-ig">⛔</div>
      <div class="scrollcontrol-title-ig">${reason}</div>
      <div class="scrollcontrol-message-ig">${message}</div>
      ${nextTime ? `<div style="font-size:13px;color:#6b7280;margin-bottom:20px">Next available: ${nextTime}</div>` : ""}
      <div class="scrollcontrol-buttons-ig">
        <button class="scrollcontrol-btn-ig scrollcontrol-btn-close-ig" id="sc-close-ig">Close</button>
        <button class="scrollcontrol-btn-ig scrollcontrol-btn-primary-ig" id="sc-adjust-ig">View schedule</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector("#sc-close-ig")?.addEventListener("click", removeBlockOverlay);
  overlay.querySelector("#sc-adjust-ig")?.addEventListener("click", () => {
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
    if (lastContentId) {
      stopTracking();
    }
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.CHECK_PERMISSION,
    payload: { platform: "instagram" },
  });

  if (response && !response.allowed) {
    let reasonText = "Reels are blocked right now.";
    let messageText = "You've reached your limit.";
    if (response.reason === "daily_limit") {
      reasonText = "Reels limit reached.";
      messageText = "You've watched all your Reels for today.";
    } else if (response.reason === "time_limit") {
      reasonText = "Time limit reached.";
      messageText = "You've used all your allowed Reels time today.";
    } else if (response.reason === "schedule") {
      reasonText = "Reels are blocked right now.";
      messageText = `You can watch Reels during your allowed hours.${response.nextAllowedTime ? " Next: " + response.nextAllowedTime : ""}`;
    }
    showBlockOverlay(reasonText, messageText, response.nextAllowedTime);
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.BLOCK_CONTENT,
      payload: { platform: "instagram", reason: response.reason },
    });
    stopTracking(false);
    return;
  }

  removeBlockOverlay();
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
  if (window.location.href.match(/\/reels?\/[\w-]+/)) {
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
    showBlockOverlay(
      reason || "Blocked",
      msg || "Content is blocked.",
      nextTime
    );
  } else if (message.type === "REMOVE_BLOCK_OVERLAY") {
    removeBlockOverlay();
  }
});
