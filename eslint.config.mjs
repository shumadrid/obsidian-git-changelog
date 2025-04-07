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
      'no-unused-labels': 'off',
      'no-labels': 'off',
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
      'perfectionist/sort-enums': 'off',
      'perfectionist/sort-interfaces': 'off',
      'perfectionist/sort-switch-case': 'off',
      'perfectionist/sort-object-types': 'off',
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-variable-declarations': 'off',
      'modules-newlines/import-declaration-newline': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-empty-file': 'warn',
      'unicorn/prevent-abbreviations': 'warn',
      'unicorn/prefer-global-this': 'off',
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2],
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true
        }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true
        }
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'simple-git',
              message: 'Please copy paste the needed enum instead.',
              allowTypeImports: true
            }
          ]
        }
      ]
    }
  },
  {
    ignores: ['node_modules/', 'dist/', 'eslint.config.mjs']
  }
);
