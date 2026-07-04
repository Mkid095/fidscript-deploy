// Root ESLint config — all rules are disabled; each package sets its own.
// This prevents ESLint from walking up and loading a broken config.
export default [
  {
    rules: {},
  },
];
