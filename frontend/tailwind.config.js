/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#080C14",
          card: "#0F172A",
          surface: "#1E293B",
          border: "#334155",
          accent: "#10B981",
          nebius: "#8B5CF6",
          nvidia: "#76B900",
          danger: "#EF4444",
          warning: "#F59E0B",
          cyan: "#06B6D4"
        }
      },
      animation: {
        "pulse-fast": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate"
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(16, 185, 129, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(16, 185, 129, 0.6)" }
        }
      }
    },
  },
  plugins: [],
}
