/** Tokens como variables CSS (modo claro/oscuro): harbor (navegación), mist (fondo), surface (paneles), tide (acción), signal (aviso), flare (error) */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        harbor: { DEFAULT: v('harbor'), 600: v('harbor-600'), 300: v('harbor-300') },
        mist: v('mist'), surface: v('surface'), ink: { DEFAULT: v('ink'), soft: v('ink-soft') },
        tide: { DEFAULT: v('tide'), dark: v('tide-dark'), tint: v('tide-tint') },
        signal: { DEFAULT: v('signal'), tint: v('signal-tint') }, flare: { DEFAULT: v('flare'), tint: v('flare-tint') },
        line: v('line'),
      },
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },
      fontSize: { xs: ['0.75rem', '1.1rem'], sm: ['0.875rem', '1.35rem'], base: ['0.9375rem', '1.5rem'], lg: ['1.125rem', '1.6rem'], xl: ['1.375rem', '1.8rem'], '2xl': ['1.75rem', '2.1rem'] },
      spacing: { 'safe-b': 'env(safe-area-inset-bottom)', 'safe-t': 'env(safe-area-inset-top)' },
      keyframes: { sheet: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } }, fade: { from: { opacity: 0 }, to: { opacity: 1 } } },
      animation: { sheet: 'sheet .28s cubic-bezier(.2,.8,.2,1)', fade: 'fade .2s ease-out' },
    },
  },
};
