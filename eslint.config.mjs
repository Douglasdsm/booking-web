import eslint from '@eslint/js';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

const accessibilityAsWarnings = angular.configs.templateAccessibility.map((config) => ({
  ...config,
  rules: Object.fromEntries(Object.keys(config.rules ?? {}).map((rule) => [rule, 'warn'])),
}));

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'out-tsc/**', 'graphify-out/**'],
  },
  {
    files: ['src/**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // Existing occurrences are tracked as LEGACY-DEBT. New syntax/parsing errors still fail lint.
      'no-duplicate-imports': 'warn',
      '@angular-eslint/no-output-native': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...accessibilityAsWarnings],
  },
);
