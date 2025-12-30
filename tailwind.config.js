/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        'chocolate-50': '#fefaec',
        'chocolate-100': '#fbf1ca',
        'chocolate-200': '#f8e28f',
        'chocolate-300': '#f4ce55',
        'chocolate-400': '#f1ba2e',
        'chocolate-500': '#ea9a16',
        'chocolate-600': '#cf7510',
        'chocolate-700': '#ac5311',
        'chocolate-800': '#8c4114',
        'chocolate-900': '#733514',
        'chocolate-950': '#421b06',
        'verde-50': '#edfcf4',
        'verde-100': '#d3f8e2',
        'verde-200': '#aaf0c9',
        'verde-300': '#73e2ac',
        'verde-400': '#3acd89',
        'verde-500': '#1acd81',
        'verde-600': '#0b905b',
        'verde-700': '#09734b',
        'verde-800': '#095c3c',
        'verde-900': '#094b34',
        'verde-950': '#042a1d',
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      fontFamily: {
        Manrope: ["Inter", "sans-serif"],
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}
