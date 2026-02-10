/** @type {import("prettier").Config} */
export default {
  semi /*colons*/: false,
  singleQuote: true,
  trailingComma: 'all', // cleaner diffs
  useTabs: false,
  tabWidth: 2,
  printWidth: 100,
  overrides: [
    {
      files: ['tsconfig.json'],
      options: { parser: 'jsonc' },
    },
  ],
}
