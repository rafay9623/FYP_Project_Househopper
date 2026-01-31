/**
 * PostCSS Configuration
 * 
 * PostCSS configuration for processing CSS.
 * Currently configured to use Tailwind CSS.
 * 
 * @file postcss.config.js
 */

const config = {
  plugins: {
    // Tailwind CSS PostCSS plugin
    // Processes Tailwind directives (@tailwind, @apply, etc.)
    '@tailwindcss/postcss': {},
  },
}

export default config

