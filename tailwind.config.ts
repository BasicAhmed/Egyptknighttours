import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      ink: "#141010",
      gold: { 400: "#F5C777", 500: "#F0B050", 600: "#DDA03F", 700: "#C09040", 800: "#7A5410" },
      sand: { 50: "#FFFFFF", 100: "#FAF7F0", 200: "#F3E6C8" },
      nile: "#1F6F78",
    },
    borderRadius: { xl: "12px" },
    boxShadow: { card: "0 6px 20px rgba(20,16,16,.08)" },
    fontFamily: { display: ["var(--font-display)", "system-ui", "sans-serif"], sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
  } },
  plugins: [],
} satisfies Config;
