import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import svelte from 'eslint-plugin-svelte';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import { configs as devUtilsConfigs } from 'obsidian-dev-utils/ScriptUtils/ESLint/eslint.config';
import svelteParser from 'svelte-eslint-parser';
import typescriptEslint from 'typescript-eslint';
// import eslint = require('@eslint/js');
// import eslintConfigPrettier = require('eslint-config-prettier/flat');

export default typescriptEslint.config(
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommendedTypeChecked,
  ...svelte.configs['flat/recommended'],
  ...svelte.configs['flat/prettier'],
  eslintPluginUnicorn.configs.recommended,
  devUtilsConfigs,
  eslintConfigPrettier,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        // project: './tsconfig.json',
        projectService: true
      }
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: typescriptEslint.parser,
        extraFileExtensions: ['.svelte'],
        projectService: true
      }
    },
    rules: {
      'svelte/require-each-key': 'off'
    }
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE']
        }
      ],
      'max-depth': ['error', 3],
      eqeqeq: 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      'unicorn/filename-case': [
        'warn',
        { cases: { camelCase: true, pascalCase: true } }
      ],

      // overrides
      'default-case': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true }
      ],
      'perfectionist/sort-classes': [
        'error',
        {
          type: 'unsorted'
        }
      ],
      'perfectionist/sort-modules': 'off',
      'modules-newlines/import-declaration-newline': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-empty-file': 'warn',
      'unicorn/prevent-abbreviations': 'warn',
      'unicorn/prefer-global-this': 'off'
    }
  },
  {
    ignores: ['node_modules/', 'dist/']
  }
);
