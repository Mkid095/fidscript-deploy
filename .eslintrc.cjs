module.exports = {
  root: true,
  extends: ['@fidscript/eslint-config'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.base.json'],
  },
};
