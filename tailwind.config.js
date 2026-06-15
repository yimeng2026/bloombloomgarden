module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f5f7f3",
          100: "#e8ebe4",
          200: "#d1d8c9",
          300: "#b5c2a8",
          400: "#96a985",
          500: "#7b8f6a",
          600: "#5f6f50",
          700: "#4a5740",
          800: "#3d4736",
          900: "#333d2e",
        },
      },
    },
  },
  plugins: [],
};
