import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['**/.wrangler/'] },
  js.configs.recommended,
  // Código de la app: corre en el navegador
  {
    files: ['js/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  // Service worker: script clásico (sin import) con sus propias variables globales
  {
    files: ['sw.js'],
    languageOptions: { sourceType: 'script', globals: globals.serviceworker },
  },
  // Worker de Cloudflare
  {
    files: ['server/src/**/*.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  // Pruebas y configuración: corren en Node
  {
    files: ['tests/**/*.js', 'server/tests/**/*.js', 'server/eval/**/*.{js,mjs}', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
];
