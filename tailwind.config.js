/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        corporate: { blue: "#1E3A8A", blueLight: "#2563EB", gray: "#F1F5F9" },
        status: {
          green: "#16A34A", greenBg: "#DCFCE7",
          orange: "#EA580C", orangeBg: "#FFEDD5",
          red: "#DC2626", redBg: "#FEE2E2",
          maroon: "#7F1D1D", maroonBg: "#FEE2E2",
        },
      },
    },
  },
  plugins: [],
};
