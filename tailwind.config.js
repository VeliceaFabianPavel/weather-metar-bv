/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Syne"', "sans-serif"],
        body: ['"IBM Plex Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      colors: {
        bg: {
          primary: "#05080f",
          secondary: "#0a0f1c",
          tertiary: "#0f1626",
          hover: "#182338",
        },
        line: {
          DEFAULT: "#1a2438",
          strong: "#2a3450",
        },
        accent: {
          solar: "#f7a30b",
          "solar-dim": "#b56b03",
          cyan: "#1ed4d4",
          "cyan-dim": "#0a8a8a",
          green: "#34d399",
          red: "#f43f5e",
        },
        text: {
          primary: "#e9eef7",
          secondary: "#98a3b8",
          dim: "#4d5b75",
        },
      },
      animation: {
        "fade-in": "fade-in 0.22s ease-out",
        "scan-sweep": "scan-sweep 6s linear infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scan-sweep": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};
