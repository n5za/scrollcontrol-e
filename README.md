# ScrollControl

**Your life. Your scroll. Your control.**

A Chrome extension that helps you take control of your short-form content consumption on YouTube Shorts and Instagram Reels.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue) ![Manifest V3](https://img.shields.io/badge/Manifest-V3-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![React](https://img.shields.io/badge/React-18-61dafb)

## Features

### Daily Limits
- Set maximum Shorts/Reels per day per platform
- Set maximum time spent per day per platform
- Automatic blocking when limits are reached

### Time Scheduling
- Define allowed hours for short-form content
- Quick presets: Study Mode, Work Mode, Evening Only
- Custom schedules with day-specific windows

### Quick Actions
- **Pause** — Temporarily pause tracking
- **Block now** — Immediately block content for 15min, 30min, 1h, or until tomorrow
- **Allow** — Override limits temporarily

### Usage Tracking
- Real-time usage stats per platform
- Daily, weekly, and monthly breakdowns
- Hourly usage chart
- Session history with active time tracking

### Privacy First
- **100% local** — No data ever leaves your browser
- **No analytics** — Zero tracking, zero telemetry
- **No accounts** — No sign-up required
- **Open source** — Fully auditable codebase

## Installation

### From Chrome Web Store
*Coming soon*

### Developer Mode (Load Unpacked)
1. Download or clone this repository
2. Run `npm install` and `npm run build`
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode**
5. Click **Load unpacked**
6. Select the `dist` folder from this project

## Development

```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## Tech Stack

- **Build**: Vite + esbuild
- **UI**: React 18 + Tailwind CSS
- **Language**: TypeScript 5.6
- **Manifest**: V3
- **Testing**: Vitest (24 tests)
- **Linting**: ESLint
- **Formatting**: Prettier

## Architecture

```
scrollcontrol/
├── src/
│   ├── background/       # Service worker (alarms, storage, messaging)
│   ├── content/
│   │   ├── youtube/      # YouTube Shorts detection & blocking
│   │   └── instagram/    # Instagram Reels detection & blocking
│   ├── popup/            # React popup UI
│   │   ├── components/   # Header, BottomNav, PlatformSelector, Modal
│   │   └── pages/        # Home, Limits, Schedule, Stats, Settings
│   ├── rules/            # Deterministic rules engine
│   ├── shared/           # Types, constants, utilities
│   └── storage/          # Versioned chrome.storage.local
├── public/               # Static assets
└── dist/                 # Production build output
```

## Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Persist settings and usage data |
| `tabs` | Detect active tab for content scripts |
| `scripting` | Inject content scripts |
| `alarms` | Daily reset and expiration checks |
| `youtube.com/*` | Detect YouTube Shorts |
| `instagram.com/*` | Detect Instagram Reels |

## License

MIT
