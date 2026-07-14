/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Ledger / statement palette
        paper: '#F7F6F2', // warm off-white document background
        ledgerbar: '#F1F0EA', // subtle alternating row / muted fill
        ink: {
          DEFAULT: '#23261D', // near-black bookkeeping ink
          soft: '#6A6F60', // muted labels
        },
        rule: {
          DEFAULT: '#E0DFD6', // printed hairline
          bold: '#B4B2A6', // section rule
        },
        debit: '#9C2A24', // over budget / negative — "in the red"
        credit: '#3B5540', // positive balance / success
        caution: '#A66A00', // nearing a limit / short of goal — earthy ledger ochre
      },
    },
  },
  plugins: [],
};
