import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '360px',   // portrait phones nhỏ
      },
    },
  },
  plugins: [],
}

export default config
