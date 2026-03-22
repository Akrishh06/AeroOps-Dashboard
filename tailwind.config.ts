import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "var(--void)",
        panel: "var(--panel)",
        line: "var(--line)",
        mist: "var(--mist)",
        ink: "var(--ink)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        warn: "var(--warn)",
        dim: "var(--dim)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
      },
      ringOffsetColor: {
        background: "var(--background)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        micro: "0.22em",
        tightish: "-0.02em",
      },
      boxShadow: {
        insetline: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
