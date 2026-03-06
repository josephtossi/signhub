import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF2FF",
          500: "#4F46E5",
          700: "#3730A3",
          900: "#1E1B4B"
        }
      }
    }
  },
  plugins: []
};

export default config;

