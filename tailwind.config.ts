import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cakra: {
          sidebar: "#5E0E14",
          sidebarGroup: "#821820",
          sidebarItem: "#4A0A0F",
          sidebarHover: "#9E1F28",
          header: "#991B1B",
          card: "#88131A",
          cardPill: "#A8242C",
          cardCircle: "#4C0A0E",
          bg: "#D6DADE",
        },
        // Map blue-* and emerald-* accents across internal pages to Red & White theme
        blue: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#88131A",
          950: "#5E0E14",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#991B1B",
          foreground: "#FFFFFF",
        },
      },
      boxShadow: {
        "cakra-card": "0 2px 6px rgba(0, 0, 0, 0.08)",
        "cakra-kpi": "0 4px 10px rgba(94, 14, 20, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
