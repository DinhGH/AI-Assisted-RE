/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 20px rgba(59, 130, 246, 0.1)",
        card: "0 1px 3px rgba(0, 0, 0, 0.08)",
      },
      backgroundImage: {
        "radial-grid":
          "radial-gradient(circle at top left, rgba(59, 130, 246, 0.05), transparent 36%), radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.04), transparent 40%)",
      },
    },
  },
  plugins: [],
};
