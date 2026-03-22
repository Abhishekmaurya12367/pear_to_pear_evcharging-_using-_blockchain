/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0a0f1a", 900: "#0f172a", 800: "#1e293b" },
        accent: { DEFAULT: "#10b981", dim: "#059669", glow: "#34d399" },
        surface: { DEFAULT: "#111827", raised: "#1f2937", border: "#334155" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(0,0,0,0.4)",
        glow: "0 0 40px -10px rgba(16,185,129,0.35)",
      },
    },
  },
  plugins: [],
};
