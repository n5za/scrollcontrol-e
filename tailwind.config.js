/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/popup/**/*.{html,tsx,ts}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0e1a",
          secondary: "#111827",
          surface: "#1a1f35",
          elevated: "#222842",
        },
        border: {
          default: "#2a3150",
          subtle: "#1e2440",
        },
        accent: {
          DEFAULT: "#6c5ce7",
          hover: "#7c6ef7",
          muted: "#5a4bd6",
        },
        success: {
          DEFAULT: "#22c55e",
          muted: "#16a34a",
        },
        warning: {
          DEFAULT: "#f59e0b",
          muted: "#d97706",
        },
        danger: {
          DEFAULT: "#ef4444",
          muted: "#dc2626",
        },
        text: {
          primary: "#f0f0f5",
          secondary: "#9ca3b0",
          muted: "#6b7280",
        },
        youtube: "#ff0000",
        instagram: "#E1306C",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};
