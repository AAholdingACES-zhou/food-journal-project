/**
 * 设计令牌系统
 * 基于 ELEYANG 风格的现代化设计系统
 */

export const designTokens = {
  colors: {
    bg: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      card: '#ffffff',
      hover: 'rgba(0, 0, 0, 0.05)',
    },
    text: {
      primary: '#111827',
      secondary: 'rgba(17, 24, 39, 0.7)',
      tertiary: 'rgba(17, 24, 39, 0.5)',
      disabled: 'rgba(17, 24, 39, 0.3)',
    },
    border: {
      default: 'rgba(0, 0, 0, 0.1)',
      hover: 'rgba(0, 0, 0, 0.2)',
      focus: 'rgba(0, 0, 0, 0.4)',
    },
    accent: {
      primary: '#111827',
      secondary: '#1f2937',
    },
    status: {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
  },
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '1rem',      // 16px
    md: '1.5rem',    // 24px
    lg: '2rem',      // 32px
    xl: '3rem',      // 48px
    '2xl': '4rem',   // 64px
  },
  borderRadius: {
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },
} as const;
