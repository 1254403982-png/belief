/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 暖白主题色板
        'warm-bg': '#FAF7F2',
        'warm-card': '#FFFBF5',
        'warm-text': '#4A4036',
        'warm-text-secondary': '#9C9088',
        'warm-border': '#E0D8CC',
        'warm-line': '#D8CCBC',
        'warm-highlight': '#D4A843',
        'warm-brand': '#5C4A3A',
        // 节点颜色
        'node-core': '#C8A96E',
        'node-sub': '#8BA4BC',
        'node-pattern': '#B8A0C8',
        'node-thought': '#C4B8B0',
        'node-behavior': '#A0B89A',
        'node-reality': '#B8A898',
        'node-seed': '#E8E0D8',
        // 态度标记
        'attitude-break': '#E8C8A0',
        'attitude-strengthen': '#A0C8B0',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 1.5s ease-out',
        'fade-in-slow': 'fadeIn 3s ease-out',
        'float-up': 'floatUp 0.8s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
