import eslint from '@eslint/js' // removing lint from fabric
import { defineConfig } from 'eslint/config'
import prettierConfig from 'eslint-config-prettier' // ESLint defers to Prettier on formatting
import jsdoc from 'eslint-plugin-jsdoc' // validate existing JSDoc comments
import simpleImportSort from 'eslint-plugin-simple-import-sort' // enforce import order
import globals from 'globals' // node globals: process, console, etc
import tseslint from 'typescript-eslint' // type-aware lint

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,

  jsdoc.configs['flat/logical-typescript-error'],

  prettierConfig,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
)
