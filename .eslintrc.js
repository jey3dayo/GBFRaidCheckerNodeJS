module.exports = {
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  extends: ['plugin:prettier/recommended', 'prettier'],
  parser: 'babel-eslint',
  rules: {
    'class-methods-use-this': 0,
    'global-require': 0,
    'jsx-a11y/click-events-have-key-events': 0,
    'jsx-a11y/no-static-element-interactions': 0,
    'no-await-in-loop': 0,
    'no-console': 0,
    'no-param-reassign': 0,
    'no-plusplus': 0,
    'no-restricted-syntax': 0,
    'import/no-dynamic-require': 0,
    'import/prefer-default-export': 0,
    'prettier/prettier': [
      'error',
      {
        printWidth: 120,
        singleQuote: true,
        trailingComma: 'all',
        arrowParens: 'avoid',
      },
    ],
  },
  parserOptions: {
    ecmaFeatures: {
      legacyDecorators: true,
    },
  },
};
