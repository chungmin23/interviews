import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { accent: "#1f5fbf", accentDark: "#16478f" } } },
  plugins: [],
};
export default config;
