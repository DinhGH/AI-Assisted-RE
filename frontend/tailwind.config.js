/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 40px rgba(56, 189, 248, 0.18)",
      },
      backgroundImage: {
        "radial-grid":
          "radial-gradient(circle at top left, rgba(56,189,248,0.15), transparent 36%), radial-gradient(circle at bottom right, rgba(167,139,250,0.12), transparent 32%)",
      },
    },
  },
  plugins: [],
};
