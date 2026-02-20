import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0f172a",
          blue: "#1d4ed8",
          "blue-light": "#2563eb",
          green: "#15803d",
          yellow: "#eab308",
          red: "#b91c1c",
          orange: "#ea580c",
        },
        status: {
          pending: "#b45309",
          confirmed: "#1d4ed8",
          in_progress: "#4338ca",
          completed: "#15803d",
          cancelled: "#6b7280",
          no_show: "#b91c1c",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      spacing: {
        sidebar: "240px",
        "sidebar-collapsed": "64px",
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 200ms ease-out",
        "slide-out-right": "slide-out-right 200ms ease-in",
        "fade-in": "fade-in 150ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
