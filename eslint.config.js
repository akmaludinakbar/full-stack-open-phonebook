import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['node_modules/**', 'frontend/**', 'dist/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: { semi: ['error', 'never'] },
  },
]
