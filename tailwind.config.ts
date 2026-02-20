import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        appBg: "#F2F2F7",
        card: "#FFFFFF",
        text: "#0B0B0F",
        subtext: "#6B7280",
        accent: "#0A84FF"
      },
      boxShadow: {
        card: "0 8px 24px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;

