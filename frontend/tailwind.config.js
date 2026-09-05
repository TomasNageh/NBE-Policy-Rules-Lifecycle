/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NBE Official Brand Colors — matching nbe.com.eg
        nbe: {
          // Primary: NBE Deep Green (logo, nav links, primary CTAs)
          green: {
            50:  '#E8F5EE',
            100: '#C5E4D2',
            200: '#9FCFB3',
            300: '#75B990',
            400: '#4FA870',
            500: '#00693E', // NBE Primary Green
            600: '#005C36',
            700: '#004F2D',
            800: '#003E23',
            900: '#002D19',
            950: '#001C10',
            DEFAULT: '#00693E',
          },
          // Accent: NBE Orange/Gold (icon backgrounds, highlights, hover states)
          orange: {
            50:  '#FEF5E7',
            100: '#FDE4BF',
            200: '#FBD194',
            300: '#F9BD66',
            400: '#F8A83E',
            500: '#F7941D', // NBE Primary Orange
            600: '#E07F0A',
            700: '#B96808',
            800: '#935206',
            900: '#6D3C04',
            950: '#492803',
            DEFAULT: '#F7941D',
          },
          // Dark Green for deeper surfaces
          darkGreen: {
            DEFAULT: '#004F2D',
            hover:   '#003E23',
          },
          // Neutral system
          neutral: {
            canvas:       '#F8F8F8',
            surface:      '#FFFFFF',
            subtle:       '#F5F5F5',
            border:       '#E8E8E8',
            borderDark:   '#D0D0D0',
            textPrimary:  '#1A1A1A',
            textSecondary:'#555555',
            textMuted:    '#888888',
          },
        },
        // Keep sidebar tokens mapped to new green palette
        sidebar: {
          bg:       '#00693E',
          hover:    '#005C36',
          active:   '#F7941D',
          text:     '#E8F5EE',
          textMuted:'#9FCFB3',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'enterprise':    '0 1px 3px 0 rgba(0, 105, 62, 0.08), 0 1px 2px -1px rgba(0, 105, 62, 0.08)',
        'enterprise-md': '0 4px 6px -1px rgba(0, 105, 62, 0.08), 0 2px 4px -2px rgba(0, 105, 62, 0.06)',
        'enterprise-lg': '0 10px 15px -3px rgba(0, 105, 62, 0.08), 0 4px 6px -4px rgba(0, 105, 62, 0.04)',
        'nbe-card':      '0 2px 12px 0 rgba(0, 105, 62, 0.07), 0 1px 3px 0 rgba(0,0,0,0.06)',
        'nbe-header':    '0 2px 8px 0 rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'subtle': '3px',
      },
    },
  },
  plugins: [],
}
