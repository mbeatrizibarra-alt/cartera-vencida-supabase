/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta Actuaria (Brandbook 2026 §27). Los nombres antiguos se
        // conservan para que las pantallas existentes sigan compilando.
        corporate: { blue: "#151F47", blueLight: "#3061AA", gray: "#E8ECF4" },
        actuaria: {
          navy: "#151F47", navyDeep: "#0E1530", navySoft: "#1E2D5F",
          blue: "#3061AA", orange: "#DF5E2D",
          celeste: "#C7CFE0", sky: "#8FB0DD", salmon: "#FFBBA1",
          surface: "#E8ECF4",
        },
        status: {
          green: "#1F9D57", greenBg: "#E7F6EE",
          orange: "#E8862C", orangeBg: "#FCF0E2",
          red: "#C73A3A", redBg: "#FBEAEA",
          maroon: "#8E1F1F", maroonBg: "#F6E4E4",
        },
      },
      fontFamily: {
        display: ['"Jost"', '"Nunito"', "sans-serif"],
        heading: ['"Nunito"', "system-ui", "sans-serif"],
        sans: ['"Prompt"', "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "16px", "2xl": "20px" },
      boxShadow: {
        neu: "6px 6px 16px rgba(163,177,198,.6), -6px -6px 16px rgba(255,255,255,.9)",
        "neu-sm": "3px 3px 8px rgba(163,177,198,.6), -3px -3px 8px rgba(255,255,255,.9)",
        "neu-inset": "inset 3px 3px 8px rgba(163,177,198,.6), inset -3px -3px 8px rgba(255,255,255,.9)",
      },
    },
  },
  plugins: [],
};
