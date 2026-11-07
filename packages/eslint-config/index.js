module.exports = {
  extends: ['next', 'prettier', 'plugin:import/errors'],
  rules: {
    'import/order': ['error', { groups: [['builtin'], ['external']], 'newlines-between': 'always' }],
    'import/no-unresolved': 'off',
  },
};
