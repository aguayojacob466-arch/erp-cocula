import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Cargar datos al montar (fetch -> setState tras await) es valido; la regla lo marca por error.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Funciones de servidor de Vercel (Node)
    files: ['api/**/*.js'],
    languageOptions: { globals: globals.node },
  },
])
