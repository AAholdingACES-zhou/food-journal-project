import type { Config } from "tailwindcss";
import { designTokens } from "./lib/design-tokens";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 设计令牌颜色
        'bg-primary': designTokens.colors.bg.primary,
        'bg-secondary': designTokens.colors.bg.secondary,
        'bg-tertiary': designTokens.colors.bg.tertiary,
        'bg-card': designTokens.colors.bg.card,
        'bg-hover': designTokens.colors.bg.hover,
        'text-primary': designTokens.colors.text.primary,
        'text-secondary': designTokens.colors.text.secondary,
        'text-tertiary': designTokens.colors.text.tertiary,
        'border-default': designTokens.colors.border.default,
        'border-hover': designTokens.colors.border.hover,
        'border-focus': designTokens.colors.border.focus,
      },
      spacing: designTokens.spacing,
      borderRadius: designTokens.borderRadius,
      boxShadow: designTokens.shadows,
      transitionDuration: {
        fast: designTokens.transitions.fast,
        normal: designTokens.transitions.normal,
        slow: designTokens.transitions.slow,
      },
    },
  },
  plugins: [],
};
export default config;

