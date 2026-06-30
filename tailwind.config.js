/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./resources/**/*.{js,jsx,ts,tsx,blade.php}'],
  theme: {
    extend: {
      colors: {
        /* shadcn semantic tokens */
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        /* Aviat brand & semantic direct tokens */
        brand: {
          DEFAULT: '#55AA39',
          ink:     '#3B6D11',
          hover:   '#345F0F',
          surface: '#EAF3DE',
        },
        ming: {
          DEFAULT: '#325F7D',
          surface: '#E6F1FB',
        },
        info: {
          DEFAULT: '#185FA5',
          surface: '#E6F1FB',
        },
        success: {
          DEFAULT: '#3B6D11',
          surface: '#EAF3DE',
        },
        warning: {
          DEFAULT: '#854F0B',
          surface: '#FAEEDA',
        },
        danger: {
          DEFAULT: '#A32D2D',
          surface: '#FCEBEB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm:   '6px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        pill: '999px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(16,24,40,.05)',
        sm: '0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)',
        md: '0 4px 8px -2px rgba(16,24,40,.10), 0 2px 4px -2px rgba(16,24,40,.06)',
        lg: '0 12px 16px -4px rgba(16,24,40,.08), 0 4px 6px -2px rgba(16,24,40,.03)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(.4,0,.2,1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '260ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
