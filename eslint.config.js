import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

const typedFiles = ['**/*.{ts,tsx,mts,cts}'];

export default defineConfig(
  { ignores: ['.astro/', 'dist/', '.wrangler/', 'coverage/'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: typedFiles,
  })),
  ...astro.configs['flat/recommended'],
  {
    files: typedFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
    },
  },
  {
    files: ['src/env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: ['*.config.{js,mjs}', 'scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
);
