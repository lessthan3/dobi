import nPlugin from 'eslint-plugin-n';

export default [
  {
    files: ["**/*.{js,mjs,jsx,ts,mts,tsx}"],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { globalReturn: false },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      n: nPlugin,
    },
    rules: {
      'n/no-deprecated-api': 'error',
      'n/no-extraneous-import': 'error',
      'n/no-extraneous-require': 'error',
      'n/no-exports-assign': 'error',
      'n/no-missing-import': 'error',
      'n/no-missing-require': 'error',
      'n/no-process-exit': 'error',
      'n/no-unpublished-bin': 'error',
      'n/no-unpublished-import': 'error',
      'n/no-unpublished-require': 'error',
      'n/no-unsupported-features/es-builtins': 'error',
      'n/no-unsupported-features/node-builtins': 'error',
      'n/process-exit-as-throw': 'error',
      'n/shebang': 'error',
      'n/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
      'n/callback-return': ['error', ['cb', 'callback', 'next']],
      'n/handle-callback-err': ['error', 'err'],
    },
  },
];
