import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/pages/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light lavender-white app background + white cards.
        paper: "#F5F5FB",
        ink: "#1B1A2E",
        muted: "#8C8AA0",
        line: "#ECEBF5",
        // Dark sidebar, distinct from the light body.
        sidebar: {
          DEFAULT: "#151426",
          hover: "#201F38",
        },
        // Primary purple/indigo accent.
        primary: {
          DEFAULT: "#6C5CE7",
          dark: "#5A4BD4",
          light: "#EFEBFF",
        },
        // Pastel tag palette (content-type tags, kanban chips).
        tag: {
          purple: { bg: "#EFEBFF", text: "#6C5CE7" },
          pink: { bg: "#FDE9F3", text: "#E0529C" },
          yellow: { bg: "#FFF4DE", text: "#B9790A" },
          green: { bg: "#E7FAEF", text: "#1FAA59" },
          blue: { bg: "#E8F1FF", text: "#3D7BFD" },
        },
        // Status colors.
        status: {
          done: "#1FAA59",
          progress: "#F5A623",
          stuck: "#E0527A",
          todo: "#8C8AA0",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "18px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,26,46,0.04), 0 8px 24px -12px rgba(27,26,46,0.08)",
        cardHover: "0 4px 10px rgba(27,26,46,0.06), 0 16px 32px -12px rgba(27,26,46,0.12)",
      },
      keyframes: {
        fadeSlideIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-slide-in": "fadeSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn 0.25s ease-out both",
        "pop-in": "popIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
