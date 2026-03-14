import nextPlugin from '@next/eslint-plugin-next';

export default [
  {
    ignores: ['node_modules', '.next', 'out', 'build', 'dist'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
